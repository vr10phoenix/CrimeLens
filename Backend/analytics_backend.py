import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from neo4j import GraphDatabase
import joblib 
import pandas as pd
from prophet import Prophet

load_dotenv()

forecast_model = joblib.load('Models/forecast_model.pkl')
risk_model = joblib.load('Models/risk_model.pkl')
risk_scaler = joblib.load('Models/risk_scale.pkl')
risk_scores_df = pd.read_csv('Models/risk_scores.csv')

DB_URL = f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@{os.getenv('POSTGRES_HOST')}/{os.getenv('POSTGRES_DB')}"
engine = create_engine(DB_URL)
NEO4J_URL = "bolt://localhost:7687"
NEO4J_AUTH = ("neo4j" , "testpass")
neo4j_driver = GraphDatabase.driver(NEO4J_URL , auth=NEO4J_AUTH)

app = FastAPI(title="KSP Crime Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def run_query(query, params=None):
    with engine.connect() as conn:
        result = conn.execute(text(query), params or {})
        return [dict(row._mapping) for row in result]


# Overall Stats
@app.get("/api/analytics/stats/enhanced")
def enhanced_stats():
    query = """
    SELECT
        (SELECT COUNT(*) FROM casemaster) AS total_firs,
        (SELECT COUNT(*) FROM accused) AS total_accused,
        (SELECT COUNT(*) FROM victim) AS total_victims,
        (SELECT COUNT(*) FROM ext_gang) AS total_gangs,
        (SELECT COUNT(*) FROM ext_financialaccount) AS total_accounts,
        (SELECT COUNT(*) FROM ext_transaction) AS total_transactions,
        (SELECT COUNT(*) FROM ext_phonecall) AS total_calls,
        (SELECT COUNT(*) FROM casemaster WHERE casestatusid IN (2,3,5)) AS cases_closed,
        ROUND(
            (SELECT COUNT(*) FROM casemaster WHERE casestatusid IN (2,3,5)) * 100.0 /
            NULLIF((SELECT COUNT(*) FROM casemaster), 0), 2
        ) AS closure_rate_pct,
        (SELECT ROUND(AVG(days_to_arrest)) FROM (
            SELECT MIN(arrestsurrenderrdate) - cm.crimeregistereddate AS days_to_arrest
            FROM casemaster cm
            JOIN arrestsurrender ar ON cm.casemasterid = ar.casemasterid
            GROUP BY cm.casemasterid
        ) sub) AS avg_days_to_first_arrest
    """
    stats = run_query(query)[0]
    return stats

#Hourly Heatmap
@app.get("/api/analytics/hourly_heatmap")
def hourly_heatmap():
    query = """
     SELECT EXTRACT (HOUR FROM crimeregistereddate)::int AS hour:
          COUNT(*) AS cases
     FROM casemaster
     GROUP BY hour
     ORDER BY hour
    """
    return run_query(query)

# Day - of week Trend
@app.get("/api/analytics/day_of_week")
def day_of_week():
    query = """
    SELECT TO_CHAR(crimeregistereddate, 'DAY') AS day_name,
      COUNT(*) AS cases,
      EXTRACTION(DOW FROM crimeregistereddate)::int AS dow_num
      FROM casemaster
      GROUP BY day_name , dow_num
      ORDER BY dow_num

    """
    return run_query(query)

# Month trend
@app.get("/api/analytics/monthly_trend_extended")
def monthly_trend_extended(years: int = 5):
    query = """
     SELECT TO_CHAR(crimeregistereddate,'YYYY-MM') AS month,
         COUNT(*) AS cases
     FROM casemaster
     WHERE crimeregistereddate >= CURRENT_DATE - MAKE_INTERVAL(YEARS := :years)
     GROUP BY month
     ORDER BY month
    """

    return run_query(query,{"years" : years})

@app.get("/api/analytics/district_crime_matrix")
def district_crime_matrix(top_n: int = 5):
    # Use a window function to rank crime types within each district
    query = """
    WITH crime_counts AS (
        SELECT d.districtname,
               ch.crimeheadname,
               COUNT(*) AS cnt,
               ROW_NUMBER() OVER (PARTITION BY d.districtid ORDER BY COUNT(*) DESC) AS rn
        FROM casemaster cm
        JOIN policestation ps ON cm.policestationid = ps.policestationid
        JOIN district d ON ps.districtid = d.districtid
        JOIN crimehead ch ON cm.crimemajorheadid = ch.crimeheadid
        GROUP BY d.districtid, d.districtname, ch.crimeheadname
    )
    SELECT districtname,
           json_agg(
               json_build_object('crime', crimeheadname, 'count', cnt)
               ORDER BY rn
           ) AS top_crimes
    FROM crime_counts
    WHERE rn <= :top_n
    GROUP BY districtname
    ORDER BY districtname
    """
    return run_query(query, {"top_n": top_n})


# crime_severity_index
@app.get("/api/analytics/crime_severity_index")
def crime_severity_index():
    try:
        test_query = "SELECT * FROM gravityoffence LIMIT 1"
        run_query(test_query)
        use_table = "gravityoffence"
    except:
        try:
            test_query = 'SELECT * FROM "GravityOffence" LIMIT 1'
            run_query(test_query)
            use_table = '"GravityOffence"'
        except:
            query = """
            SELECT d.districtname,
                   COUNT(*) AS total_cases,
                   SUM(CASE WHEN ch.crimeheadname IN ('Murder','Rape','Attempt to Murder','Dowry Death') THEN 1 ELSE 0 END) AS heinous_count,
                   ROUND(100.0 * SUM(CASE WHEN ch.crimeheadname IN ('Murder','Rape','Attempt to Murder','Dowry Death') THEN 1 ELSE 0 END) / COUNT(*), 2) AS heinous_pct
            FROM casemaster cm
            JOIN crimehead ch ON cm.crimemajorheadid = ch.crimeheadid
            JOIN policestation ps ON cm.policestationid = ps.policestationid
            JOIN district d ON ps.districtid = d.districtid
            GROUP BY d.districtname
            ORDER BY heinous_pct DESC
            """
            return run_query(query)

    query = f"""
    SELECT d.districtname,
           COUNT(*) AS total_cases,
           SUM(CASE WHEN g.offencetype = 'Heinous' THEN 1 ELSE 0 END) AS heinous_count,
           ROUND(100.0 * SUM(CASE WHEN g.offencetype = 'Heinous' THEN 1 ELSE 0 END) / COUNT(*), 2) AS heinous_pct
    FROM casemaster cm
    JOIN {use_table} g ON cm.gravityoffenceid = g.gravityoffenceid
    JOIN policestation ps ON cm.policestationid = ps.policestationid
    JOIN district d ON ps.districtid = d.districtid
    GROUP BY d.districtname
    ORDER BY heinous_pct DESC
    """
    return run_query(query)

@app.get("/api/analytics/gang_network_centrality")
def gang_network_centrality(limit:int = 20):
  with neo4j_driver.session() as session: 
    result = session.run(
       """
       MATCH (p:Person)-[r]-()
       WITH p, count(r) AS degree
       RETURN p.name AS name, p.personId AS personid, degree
       ORDER BY degree DESC
       LIMIT $limit
       """,
       limit = limit
    )
    nodes = [record.data() for record in result]
  return nodes

@app.get("/api/analytics/money_laundering_rings")
def money_laundering_rings():
    with neo4j_driver.session() as session:
        try:
            result = session.run("""
                MATCH (a:Account)-[r:TRANSFERRED_TO]->(b:Account)
                WITH a, count(r) AS out_txns, sum(r.amount) AS total_sent
                WHERE a.balance > 50000
                RETURN a.accountNumber AS account_number,
                       a.bank AS bank,
                       a.balance AS balance,
                       out_txns,
                       total_sent
                ORDER BY total_sent DESC
                LIMIT 30
            """)
            data = [record.data() for record in result]
            if data:
                return data
            else:
                return {"message": "No high-value transaction patterns found."}
        except Exception as e:
            return {"error": f"Neo4j query failed: {str(e)}"}

# Police station performace : No. of cases Registered
@app.get("/api/analytics/police_station_performance")
def police_station_performance():
    query = """
    SELECT ps.stationname,
           COUNT(DISTINCT cm.casemasterid) AS cases_registered,
           COALESCE(SUM(arrest_stats.arrest_count), 0) AS total_arrests,
           ROUND(AVG(arrest_stats.arrest_days), 1) AS avg_days_to_arrest
    FROM policestation ps
    LEFT JOIN casemaster cm ON ps.policestationid = cm.policestationid
    LEFT JOIN LATERAL (
        SELECT ars.casemasterid,
               MIN(ars.arrestsurrenderrdate) - cm.crimeregistereddate AS arrest_days,
               COUNT(*) AS arrest_count
        FROM arrestsurrender ars
        WHERE ars.casemasterid = cm.casemasterid AND ars.isaccused = TRUE
        GROUP BY ars.casemasterid, cm.crimeregistereddate
    ) arrest_stats ON TRUE
    GROUP BY ps.stationname
    ORDER BY cases_registered DESC
    """
    return run_query(query)

# COurt Pendency
@app.get("/api/analytics/court_pendency")
def court_pendency():
    query = """
            SELECT c.courtname,
                COUNT(cm.casemasterid) AS total_cases,
                SUM(CASE WHEN cs.statusname = 'Under Investigation' THEN 1 ELSE 0 END) AS under_investigation,
                SUM(CASE WHEN cs.statusname = 'Charge Sheeted' THEN 1 ELSE 0 END) AS charge_sheeted,
                SUM(CASE WHEN cs.statusname = 'Committed to court' THEN 1 ELSE 0 END) AS commited_to_court,
                SUM(CASE WHEN cs.statusname IN ('Final Report False' , 'Untraced') THEN 1 ELSE 0 END) AS closed_untraced
                FROM court c
                JOIN casemaster cm ON c.courtid = cm.courtid
                JOIN casestatus cs ON cm.casestatusid = cs.casestatusid
                GROUP BY c.courtname
                ORDER BY total_cases DESC
            """
    return run_query(query)

# Arrest - Surrender Ratio 
@app.get("/api/analytics/arrest_surrender_ratio")
def arrest_surrender_ratio():
    # Check which column name actually exists
    col_check = run_query("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'arrestsurrender' AND column_name LIKE '%type%'
    """)
    if not col_check:
        return {"error": "No arrest type column found"}
    col_name = col_check[0]['column_name']  # e.g., 'arrestsurrenderrtypeid' or 'arrestsurrenderrtypeid'
    
    query = f"""
    SELECT TO_CHAR(arrestsurrenderrdate, 'YYYY-MM') AS month,
           SUM(CASE WHEN {col_name} = 1 THEN 1 ELSE 0 END) AS arrests,
           SUM(CASE WHEN {col_name} = 2 THEN 1 ELSE 0 END) AS surrenders
    FROM arrestsurrender
    WHERE arrestsurrenderrdate IS NOT NULL
    GROUP BY month
    ORDER BY month
    """
    return run_query(query)

# Predictive Development 
@app.get("/api/analytics/predictive_deployment")
def predictive_deployment():
    try:
        test = run_query("SELECT offencetype FROM gravityoffence LIMIT 1")
        use_gravity = True
    except:
        use_gravity = False

    if use_gravity:
        query = """
        WITH recent AS (
            SELECT d.districtname,
                   COUNT(cm.casemasterid) AS cases,
                   SUM(CASE WHEN g.offencetype = 'Heinous' THEN 1 ELSE 0 END) * 2 +
                   SUM(CASE WHEN g.offencetype = 'Non-Heinous' THEN 1 ELSE 0 END) AS severity_weight
            FROM casemaster cm
            JOIN gravityoffence g ON cm.gravityoffenceid = g.gravityoffenceid
            JOIN policestation ps ON cm.policestationid = ps.policestationid
            JOIN district d ON ps.districtid = d.districtid
            WHERE cm.crimeregistereddate >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY d.districtname
        )
        SELECT districtname, cases, severity_weight, ROUND(severity_weight * 1.1) AS suggested_patrol_hours
        FROM recent ORDER BY suggested_patrol_hours DESC
        """
    else:
        query = """
        WITH recent AS (
            SELECT d.districtname,
                   COUNT(cm.casemasterid) AS cases,
                   SUM(CASE WHEN ch.crimeheadname IN ('Murder','Rape','Attempt to Murder','Dowry Death') THEN 2 ELSE 1 END) AS severity_weight
            FROM casemaster cm
            JOIN crimehead ch ON cm.crimemajorheadid = ch.crimeheadid
            JOIN policestation ps ON cm.policestationid = ps.policestationid
            JOIN district d ON ps.districtid = d.districtid
            WHERE cm.crimeregistereddate >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY d.districtname
        )
        SELECT districtname, cases, severity_weight, ROUND(severity_weight * 1.1) AS suggested_patrol_hours
        FROM recent ORDER BY suggested_patrol_hours DESC
        """
    return run_query(query)


#Cross district Crime analysis
@app.get("/api/analytics/cross_district_crime")
def cross_district_crime(limit: int = 20):
    query = """
    SELECT a.accusedname,
           d_home.districtname AS home_district,
           d_crime.districtname AS crime_district,
           COUNT(DISTINCT cm.casemasterid) AS cases_in_other_districts
    FROM accused a
    JOIN ext_person ep ON a.accusedname = ep.name AND a.ageyear = ep.age
    JOIN district d_home ON ep.districtid = d_home.districtid
    JOIN casemaster cm ON a.casemasterid = cm.casemasterid
    JOIN policestation ps ON cm.policestationid = ps.policestationid
    JOIN district d_crime ON ps.districtid = d_crime.districtid
    WHERE d_home.districtid <> d_crime.districtid
    GROUP BY a.accusedname, d_home.districtname, d_crime.districtname
    ORDER BY cases_in_other_districts DESC
    LIMIT :limit
    """
    return run_query(query, {"limit": limit})

#case resolution : how many cases on which stage : 
@app.get("/api/analytics/case_resolution_funnel")
def case_resolution_funnel():
    query = """
            SELECT
                COUNT(*) AS registered,
                SUM(CASE WHEN casestatusid = 1 THEN 1 ELSE 0 END) AS under_investigation,
                SUM(CASE WHEN casestatusid = 2 THEN 1 ELSE 0 END) AS commmited_to_court,
                SUM(CASE WHEN casestatusid = 3 THEN 1 ELSE 0 END) AS closed untracked
            FROM casemaster
            """
    return run_query(query)[0]

#Weapon usage : 
@app.get("/api/analytics/weapon_usage")
def weapon_usage():
    weapons = ['knife', 'pistol', 'machete', 'rod', 'gun', 'sword', 'axe', 'country-made', 'lathi', 'acid']
    conditions = []
    for i, w in enumerate(weapons):
        conditions.append(f"SUM(CASE WHEN brieffacts ILIKE :w{i} THEN 1 ELSE 0 END) AS \"{w}\"")
    query = f"SELECT {', '.join(conditions)} FROM casemaster"
    params = {f"w{i}": f"%{w}%" for i, w in enumerate(weapons)}
    result = run_query(query, params)[0]
    weapon_list = [{"weapon": w, "count": result.get(w, 0)} for w in weapons]
    return weapon_list

#case similarities
@app.get("/api/analytics/case_similarity/{casemasterid}")
def case_similarity(casemasterid: int, limit: int = 5):
    target = run_query("SELECT brieffacts FROM casemaster WHERE casemasterid = :id", {"id": casemasterid})
    if not target:
        raise HTTPException(status_code=404, detail="Case not found")
    
    words = [w.lower() for w in target[0]['brieffacts'].split() if len(w) > 3]
    if not words:
        return []
    
    like_clauses = " OR ".join([f"brieffacts ILIKE '%{w}%'" for w in words[:10]])
    query = f"""
        SELECT casemasterid, crimeno, brieffacts,
               (LENGTH(brieffacts) - LENGTH(REPLACE(LOWER(brieffacts), LOWER(:word1), ''))) / LENGTH(:word1) AS score
        FROM casemaster
        WHERE casemasterid != :id AND ({like_clauses})
        ORDER BY score DESC
        LIMIT :limit
    """
    result = run_query(query, {"id": casemasterid, "word1": words[0], "limit": limit})
    return result

@app.get("/api/analytics/fir_fulltext_search")
def fir_fulltext_search(q: str = "", limit: int = 20):
    if not q:
        return []
    query = """
        SELECT casemasterid, crimeno, caseno, brieffacts, crimeregistereddate
        FROM casemaster
        WHERE brieffacts ILIKE :search
        ORDER BY crimeregistereddate DESC
        LIMIT :limit
    """
    return run_query(query, {"search": f"%{q}%", "limit": limit})

#repeat_offenders
@app.get("/api/analytics/repeat_offenders")
def repeat_offenders(top_n: int = 10):
    query = """
    SELECT a.accusedname,
           COUNT(DISTINCT a.casemasterid) AS case_count,
           a.ageyear,
           CASE a.genderid
               WHEN 1 THEN 'Male'
               WHEN 2 THEN 'Female'
               ELSE 'Other'
           END AS gender,
           STRING_AGG(DISTINCT cm.crimeno, ', ' ORDER BY cm.crimeno) AS crime_numbers
    FROM accused a
    JOIN casemaster cm ON a.casemasterid = cm.casemasterid
    GROUP BY a.accusedname, a.ageyear, a.genderid
    ORDER BY case_count DESC
    LIMIT :top_n
    """
    return run_query(query, {"top_n": top_n})

# offender_demographics
@app.get("/api/analytics/offender_demographics")
def offender_demographics():
    query = """
    SELECT
        CASE
            WHEN ageyear < 18 THEN 'Under 18'
            WHEN ageyear BETWEEN 18 AND 25 THEN '18-25'
            WHEN ageyear BETWEEN 26 AND 35 THEN '26-35'
            WHEN ageyear BETWEEN 36 AND 50 THEN '36-50'
            ELSE 'Over 50'
        END AS age_group,
        CASE genderid
            WHEN 1 THEN 'Male'
            WHEN 2 THEN 'Female'
            ELSE 'Other'
        END AS gender,
        COUNT(*) AS count
    FROM accused
    GROUP BY age_group, gender
    ORDER BY age_group, gender
    """
    return run_query(query)

# victim_demographics
@app.get("/api/analytics/victim_demographics")
def victim_demographics():
    query = """
    SELECT
        CASE
            WHEN ageyear < 18 THEN 'Under 18'
            WHEN ageyear BETWEEN 18 AND 25 THEN '18-25'
            WHEN ageyear BETWEEN 26 AND 35 THEN '26-35'
            WHEN ageyear BETWEEN 36 AND 50 THEN '36-50'
            ELSE 'Over 50'
        END AS age_group,
        CASE genderid
            WHEN 1 THEN 'Male'
            WHEN 2 THEN 'Female'
            ELSE 'Other'
        END AS gender,
        COUNT(*) AS count
    FROM victim
    GROUP BY age_group, gender
    ORDER BY age_group, gender
    """
    return run_query(query)


# District‑wise Crime Count
@app.get("/api/analytics/district_crimes")
def district_crimes():
    #join casemaster to district via policestation.
    return run_query("""
        SELECT d.districtname, COUNT(cm.casemasterid) as case_count
        FROM casemaster cm
        JOIN policestation ps ON cm.policestationid = ps.policestationid
        JOIN district d ON ps.districtid = d.districtid
        GROUP BY d.districtname
        ORDER BY case_count DESC
    """)

# Monthly Crime Trend (last 2 years)
@app.get("/api/analytics/monthly_trend")
def monthly_trend():
    return run_query("""
        SELECT TO_CHAR(crimeregistereddate, 'YYYY-MM') as month, COUNT(*) as cases
        FROM casemaster
        WHERE crimeregistereddate >= CURRENT_DATE - INTERVAL '2 years'
        GROUP BY month
        ORDER BY month
    """)


# Top Crime Types : by major head
@app.get("/api/analytics/crime_types")
def crime_types():
    return run_query("""
        SELECT ch.crimeheadname, COUNT(*) as count
        FROM casemaster cm
        JOIN crimehead ch ON cm.crimemajorheadid = ch.crimeheadid
        GROUP BY ch.crimeheadname
        ORDER BY count DESC
    """)

#  Gang Activity (number of members, cases linked)
@app.get("/api/analytics/gang_activity")
def gang_activity():
    # No. of gangs and accused and no. of cases
    return run_query("""
        SELECT g.gangname, COUNT(DISTINCT gm.personpoolid) as member_count,
               COUNT(DISTINCT a.casemasterid) as involved_cases
        FROM ext_gang g
        LEFT JOIN ext_gangmembership gm ON g.gangid = gm.gangid
        LEFT JOIN accused a ON a.accusedname = gm.personname  -- rough join; better to use personpoolid if available
        GROUP BY g.gangname
        ORDER BY member_count DESC
    """)

#Financial Crime Overview
@app.get("/api/analytics/financial_crimes")
def financial_crimes():
    return run_query("""
        SELECT COUNT(*) as total_transactions, SUM(amount) as total_amount,
               AVG(amount) as avg_amount
        FROM ext_transaction
    """)

# Running command : from the same directory : 
# uvicorn analytics_backend:app --reload --port 8001


@app.get("/api/analytics/neo4j-network")
def get_neo4j_network(limit: int = 100):
    """Return network data directly from Neo4j.
       Nodes: Person, Gang, Account, Case (filtered by limit).
       Edges: MEMBER_OF, ACCUSED_IN, TRANSFERRED_TO, CALLED, OWNS.
    """
    with neo4j_driver.session() as session:
        nodes = []
        person_result = session.run(
            "MATCH (p:Person) RETURN p{.*, nodeType:'Person'} LIMIT $limit", limit=limit
        )
        for record in person_result:
            nodes.append(record["p"])
        # Gangs
        gang_result = session.run("MATCH (g:Gang) RETURN g{.*, nodeType:'Gang'} LIMIT 50")
        for record in gang_result:
            nodes.append(record["g"])
        # Accounts : limit
        acc_result = session.run("MATCH (a:Account) RETURN a{.*, nodeType:'Account'} LIMIT 50")
        for record in acc_result:
            nodes.append(record["a"])
        # Cases : limit
        case_result = session.run("MATCH (c:Case) RETURN c{.*, nodeType:'Case'} LIMIT 50")
        for record in case_result:
            nodes.append(record["c"])

        # Remove duplicates by ID
        unique_nodes = {}
        for node in nodes:
            uid = node.get("personId") or node.get("gangId") or node.get("accountId") or node.get("caseId")
            if uid not in unique_nodes:
                unique_nodes[uid] = node
        nodes_list = list(unique_nodes.values())

        # Edges : relationships
        edges = []
        rel_types = ["MEMBER_OF", "ACCUSED_IN", "TRANSFERRED_TO", "CALLED", "OWNS"]
        for rel in rel_types:
            q = f"MATCH (a)-[r:{rel}]->(b) RETURN a, b, r LIMIT 200"
            rel_result = session.run(q)
            for record in rel_result:
                a = record["a"]
                b = record["b"]
                r = record["r"]
                source_id = a.get("personId") or a.get("accountId") or a.get("gangId") or a.get("caseId")
                target_id = b.get("personId") or b.get("accountId") or b.get("gangId") or b.get("caseId")
                if source_id and target_id:
                    edges.append({
                        "source": source_id,
                        "target": target_id,
                        "type": rel,
                        "properties": dict(r) if r else {}
                    })

        # Limit edges for performance
        edges = edges[:300]

        return {"nodes": nodes_list, "edges": edges}
    
# ML Models endpoints 
@app.get("/api/ml/risk-scores")
def get_risk_scores(limit: int = 5):
    """ return top 5 high risk individuals"""
    top = risk_scores_df.sort_values('risk_score' , ascending=False).head(limit)
    return top.to_dict(orient='records')

@app.get('/api/ml/district-risk-heatmap')
def district_risk_heatmap():
    """ Simple district level risk index by no. of high risk accused / per district""" 
    high_risk = risk_scores_df[risk_scores_df.risk_score > 75]
    query = """
        SELECT d.districtname, COUNT(DISTINCT a.accusedmasterid) as high_risk_count
        FROM accused a
        JOIN casemaster cm ON a.casemasterid = cm.casemasterid
        JOIN policestation ps ON cm.policestationid = ps.policestationid
        JOIN district d ON ps.districtid = d.districtid
        WHERE a.accusedmasterid IN ({})
        GROUP BY d.districtname
""".format(','.join(map(str , high_risk['accusedmasterid'].tolist())) if len (high_risk) > 0 else 'NULL')
    
    return run_query(""" 
        SELECT d.districtname, COUNT(cm.casemasterid) as case_count
        FROM casemaster cm
        JOIN policestation ps ON cm.policestationid = ps.policestationid
        JOIN district d ON ps.districtid = d.districtid
        GROUP BY d.districtname
        ORDER BY case_count DESC
       """)
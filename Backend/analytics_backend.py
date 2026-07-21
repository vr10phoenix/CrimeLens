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
@app.get("/api/analytics/stats")
def get_overall_stats():
    stats = run_query("""
        SELECT
            (SELECT COUNT(*) FROM casemaster) as total_firs,
            (SELECT COUNT(*) FROM accused) as total_accused,
            (SELECT COUNT(*) FROM ext_gang) as total_gangs,
            (SELECT COUNT(*) FROM ext_financialaccount) as total_accounts
    """)
    return stats[0]

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
        # Persons with gang memberships (limit)
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
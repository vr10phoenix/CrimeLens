import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DB_URL = f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@{os.getenv('POSTGRES_HOST')}/{os.getenv('POSTGRES_DB')}"
engine = create_engine(DB_URL)

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


#Network Data for Frontend Graph : via Postgres
# Neo4j integration : in pending

@app.get("/api/analytics/network")
def get_network():
    nodes = run_query("SELECT DISTINCT personpoolid as id, personname as name FROM ext_gangmembership")
    edges = run_query("""
        SELECT gm1.personpoolid as source, gm2.personpoolid as target
        FROM ext_gangmembership gm1
        JOIN ext_gangmembership gm2 ON gm1.gangid = gm2.gangid AND gm1.personpoolid < gm2.personpoolid
        LIMIT 200
    """)
    return {"nodes": nodes, "edges": edges}

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
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@{os.getenv('POSTGRES_HOST')}/{os.getenv('POSTGRES_DB')}"
engine = create_engine(DB_URL)

app = FastAPI(title="KSP CrimeLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://localhost:3000"],  # React dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

# helper
def run_query(query, params=None):
    with engine.connect() as conn:
        result = conn.execute(text(query), params or {})
        return [dict(row._mapping) for row in result]

#endpoints
@app.get("/api/firs")
def get_firs(
    limit: int = 100,
    offset: int = 0,
    search: str = Query(None, description="Search in crime_no, case_no, brieffacts")
):
    base = """
        SELECT casemasterid, crimeno, caseno, crimeregistereddate, brieffacts,
               casestatus.statusname
        FROM casemaster
        JOIN casestatus ON casemaster.casestatusid = casestatus.casestatusid
    """
    params = {}
    if search:
        base += " WHERE crimeno ILIKE :search OR caseno ILIKE :search OR brieffacts ILIKE :search"
        params["search"] = f"%{search}%"
    base += " ORDER BY crimeregistereddate DESC LIMIT :limit OFFSET :offset"
    params["limit"] = limit
    params["offset"] = offset

    rows = run_query(base, params)
    return {"data": rows, "limit": limit, "offset": offset}

@app.get("/api/firs/{casemasterid}")
def get_fir_detail(casemasterid: int):
    # Main case
    case = run_query("""
        SELECT * FROM casemaster WHERE casemasterid = :id
    """, {"id": casemasterid})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Complainants
    complainants = run_query("""
        SELECT * FROM complainant WHERE casemasterid = :id
    """, {"id": casemasterid})

    # Victims
    victims = run_query("""
        SELECT * FROM victim WHERE casemasterid = :id
    """, {"id": casemasterid})

    # Accused
    accused = run_query("""
        SELECT * FROM accused WHERE casemasterid = :id
    """, {"id": casemasterid})

    # Arrests
    arrests = run_query("""
        SELECT * FROM arrestsurrender WHERE casemasterid = :id
    """, {"id": casemasterid})

    # Sections applied
    sections = run_query("""
        SELECT act.actcode, section.sectioncode
        FROM caseactsection
        JOIN act ON caseactsection.actid = act.actcode
        JOIN section ON caseactsection.sectionid = section.sectionid
        WHERE casemasterid = :id
    """, {"id": casemasterid})

    return {
        "case": case[0],
        "complainants": complainants,
        "victims": victims,
        "accused": accused,
        "arrests": arrests,
        "sections": sections
    }

@app.get("/api/gangs")
def get_gangs():
    return run_query("SELECT * FROM ext_gang")

@app.get("/api/persons")
def get_persons(search: str = None, limit: int = 50, offset: int = 0):
    query = "SELECT * FROM ext_person"
    params = {}
    if search:
        query += " WHERE name ILIKE :search OR phone ILIKE :search"
        params["search"] = f"%{search}%"
    query += " LIMIT :limit OFFSET :offset"
    params["limit"] = limit
    params["offset"] = offset
    return run_query(query, params)

@app.get("/api/accounts")
def get_accounts(person_id: int = None, limit: int = 50):
    query = "SELECT * FROM ext_financialaccount"
    params = {}
    if person_id:
        query += " WHERE personpoolid = :pid"
        params["pid"] = person_id
    query += " LIMIT :limit"
    params["limit"] = limit
    return run_query(query, params)

@app.post("/api/chat")
def chat_endpoint(request: dict):
    query = request.get("query", "")
    if "fir" in query.lower():
        # Return a summary of the latest FIR
        fir = run_query("SELECT crimeno, brieffacts FROM casemaster ORDER BY crimeregistereddate DESC LIMIT 1")
        reply = f"Latest FIR: {fir[0]['crimeno']} - {fir[0]['brieffacts']}"
    elif "gang" in query.lower():
        gangs = run_query("SELECT gangname FROM ext_gang LIMIT 3")
        reply = "Some gangs: " + ", ".join(g['gangname'] for g in gangs)
    else:
        reply = "I can help with FIR details, gang info, or case statuses. Please ask a specific question."
    return {"reply": reply}
import os
os.environ["HF_HUB_OFFLINE"] = "1"
import asyncio
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import ollama
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

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


# Load ChromaDB
embedding_model = HuggingFaceEmbeddings(
    model_name="BAAI/bge-m3",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings":True},
    cache_folder=None 
    )
vectorstore = Chroma(
    persist_directory = "./chroma_db",
    embedding_function=embedding_model
)
print("ChromaDB loaded sucessfully !")


# helper
def run_query(query, params=None):
    with engine.connect() as conn:
        result = conn.execute(text(query), params or {})
        return [dict(row._mapping) for row in result]
    
def get_schema_context():
    """schema description"""
    return """
   Tables: casemaster (crimeno, caseno, crimeregistereddate, brieffacts, casestatusid),
    complainant (complainantname, ageyear),
    victim (victimname, ageyear),
    accused (accusedname, ageyear, personid),
    ext_gang (gangname, territorydistrictid),
    ext_financialaccount (accountnumber, bankname, balance, personpoolid),
    ext_transaction (fromaccountid, toaccountid, amount, transactiondate, remarks),
    ext_phonecall (callerpersonpoolid, receiverpersonpoolid, calldatetime, durationsec).
    You can JOIN tables using casemasterid, personpoolid, etc.
    """

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

# Return summary of latest FIR
@app.post("/api/chat")
async def chat_endpoint(request: dict):
    user_query = request.get("query" , "")
    # language detection
    lang_hint = "kn" if any(ord(c) > 127 for c in user_query) else "en"

    async def fetch_sql_context():
        sql_prompt = f""" You are a SQL Expert. Given the following PostgreSQL schema:
        {get_schema_context()}
        Write an SQL query that answers the user's question. Only return the SQL , no explanation.
        User question = {user_query}
        SQL:"""

        try:
            response = ollama.chat(
                model="aya-23-8b",
                messages=[{"role": "user" , "content": sql_prompt}]
            )
            sql_query = response["message"]["content"].strip()
            print(f"Generated SQL : {sql_query}")
            if sql_query.startswith("```sql"):
                sql_query = sql_query[6:]
            if sql_query.endswith("```"):
                sql_query = sql_query[:-3]

            result = run_query(sql_query)
            if result:
                header = " | ".join(result[0].keys())
                rows = "\n".join([" | ".join(str(v) for v in r.values()) for r in result])

                return f"[Database Results]\n{header}\n{'-'*len(header)}\n{rows}"
            
            else:
                return f"[Database Results] No matching records"
            
        except Exception as e:
            return f"[Database Error] could not retrieve the data ! : {str(e)}"
        
    async def fetch_vector_context():
        try:
            docs = vectorstore.similarity_search(user_query , k=3)
            chunks = [f"... From {d.metadata.get('source','unknown')} ---\n{d.page_content}" for d in docs]

            return "[Relevant FIR Document Excerpts]\n" + "\n\n".join(chunks)
        
        except Exception as e:
            return f"[Document Error] {str(e)}"
        
    sql_context , vector_context = await asyncio.gather(
        fetch_sql_context(),
        fetch_vector_context()
    )

    system_msg = f""" You are an Expert AI Assitant for Karanataka Police.
    You have access to both structured crime database results and excerpts from real FIR documents.
Use the provided contexts to answer the user's question accurately.
If the answer is not contained in the contexts, say so politely.
Answer in the same language as the user's query (detected language: {'Kannada' if lang_hint=='kn' else 'English'}).
Always cite specific case numbers or document sources when possible.
    """

    final_prompt = f"""
    {system_msg}
    {sql_context}
    {vector_context}
    User question : {user_query}
    Answer :
     """
    
    try : 
        response = ollama.chat(
            model="gemma:2b",
            messages = [{"role":"user" , "content":final_prompt}]
        )
        reply = response["message"]["content"]
    except Exception as e:
        return f"Error in generating answer : {str(e)}"
    
    return {"reply" : reply}

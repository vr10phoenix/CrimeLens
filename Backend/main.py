import os
os.environ["HF_HUB_OFFLINE"] = "1"   # Force offline, no downloads
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
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# loading embeddings and ChromaDB
embedding_model = HuggingFaceEmbeddings(
    model_name="BAAI/bge-m3",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
    cache_folder=None     
)
vectorstore = Chroma(
    persist_directory="./chroma_db",
    embedding_function=embedding_model
)
print("ChromaDB loaded successfully!")

def run_query(query, params=None):
    with engine.connect() as conn:
        result = conn.execute(text(query), params or {})
        return [dict(row._mapping) for row in result]

def get_schema_context():
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

#Endpoints
@app.get("/api/firs")
def get_firs(limit=100, offset=0, search=None):
    pass 

@app.get("/api/firs/{casemasterid}")
def get_fir_detail(casemasterid: int):
    pass

# RAG endpoint
@app.post("/api/chat")
async def chat_endpoint(request: dict):
    user_query = request.get("query", "")
    lang_hint = "kn" if any(ord(c) > 127 for c in user_query) else "en"

    # ------------------------------------------------------------
    # 1. Structured SQL retrieval (with few‑shot examples)
    # ------------------------------------------------------------
    async def fetch_sql_context():
        # Few‑shot examples – these teach the model the format
        examples = """
Example 1:
User question: "List all gangs"
SQL: SELECT gangname, territorydistrictid FROM ext_gang;

Example 2:
User question: "Show me recent FIRs"
SQL: SELECT crimeno, brieffacts, crimeregistereddate FROM casemaster ORDER BY crimeregistereddate DESC LIMIT 5;

Example 3:
User question: "Find cases of murder in Bengaluru"
SQL: SELECT cm.crimeno, cm.brieffacts, d.districtname
FROM casemaster cm
JOIN district d ON cm.casemasterid = d.districtid
WHERE cm.crimemajorheadid IN (SELECT crimeheadid FROM crimehead WHERE crimeheadname = 'Murder')
AND d.districtname ILIKE '%Bengaluru%';

Example 4:
User question: "Get accounts linked to person named Ramesh"
SQL: SELECT fa.accountnumber, fa.bankname, fa.balance
FROM ext_financialaccount fa
JOIN ext_person ep ON fa.personpoolid = ep.personpoolid
WHERE ep.name ILIKE '%Ramesh%';
"""

        sql_prompt = f"""You are an SQL expert for Karnataka Police. Write ONLY the PostgreSQL query that answers the user's question.
Do NOT include any explanation, markdown, or extra text. Return ONLY the raw SQL query.

Database schema:
{get_schema_context()}

Here are some examples:
{examples}

User question: {user_query}
SQL query:"""

        try:
            response = ollama.chat(
                model="gemma:2b",
                messages=[{"role": "user", "content": sql_prompt}],
                options={"temperature": 0, "stop": ["\n\n", ";"]}
            )
            sql_query = response["message"]["content"].strip()
            # Clean up markdown fences
            if sql_query.startswith("```sql"):
                sql_query = sql_query[6:]
            if sql_query.endswith("```"):
                sql_query = sql_query[:-3]
            print(f"Generated SQL: {sql_query}")

            if sql_query.lower().startswith("select"):
                result = run_query(sql_query)
                if result:
                    header = " | ".join(result[0].keys())
                    rows = "\n".join([" | ".join(str(v) for v in r.values()) for r in result])
                    return f"[Database Results]\n{header}\n{'-'*len(header)}\n{rows}"
                else:
                    return "[Database Results] No matching records found."
            else:
                raise ValueError("Not a SELECT query")
        except Exception as e:
            print(f"SQL generation/execution error: {e}")
            # ---------- Smart keyword fallback ----------
            return keyword_based_sql(user_query)

    def keyword_based_sql(query: str):
        """Fallback that retrieves relevant data based on keywords."""
        q = query.lower()
        try:
            if "gang" in q:
                rows = run_query("SELECT gangname, territorydistrictid FROM ext_gang")
                if rows:
                    return "[Database Results – Gangs]\n" + "\n".join(
                        f"{r['gangname']} (District ID {r['territorydistrictid']})" for r in rows
                    )
            elif "account" in q or "transaction" in q:
                rows = run_query("SELECT accountnumber, bankname, balance FROM ext_financialaccount LIMIT 10")
                if rows:
                    return "[Database Results – Financial Accounts]\n" + "\n".join(
                        f"{r['accountnumber']} @ {r['bankname']} – ₹{r['balance']}" for r in rows
                    )
            elif "person" in q or "people" in q:
                rows = run_query("SELECT name, age, phone FROM ext_person LIMIT 10")
                if rows:
                    return "[Database Results – Persons]\n" + "\n".join(
                        f"{r['name']}, Age {r['age']}, Phone {r['phone']}" for r in rows
                    )
            elif "fir" in q or "case" in q or "crime" in q:
                rows = run_query("SELECT crimeno, brieffacts FROM casemaster ORDER BY crimeregistereddate DESC LIMIT 5")
                if rows:
                    return "[Database Results – Recent FIRs]\n" + "\n".join(
                        f"{r['crimeno']}: {r['brieffacts'][:150]}" for r in rows
                    )
            # Generic fallback: total counts
            counts = run_query("""
                SELECT 'Total FIRs' as label, COUNT(*) as value FROM casemaster
                UNION ALL
                SELECT 'Active Gangs', COUNT(*) FROM ext_gang
            """)
            if counts:
                return "[Database Summary]\n" + "\n".join(f"{c['label']}: {c['value']}" for c in counts)
        except Exception as e2:
            print(f"Keyword fallback error: {e2}")
        return "[Database Error] Could not retrieve data."

    # ------------------------------------------------------------
    # 2. Vector retrieval (with better debug and handling)
    # ------------------------------------------------------------
    async def fetch_vector_context():
        try:
            docs = vectorstore.similarity_search(user_query, k=3)
            if not docs:
                return "[Document Excerpts] No matching FIR documents found."
            chunks = []
            for d in docs:
                src = d.metadata.get('source', 'unknown')
                # Truncate very long chunks
                content = d.page_content[:600]
                chunks.append(f"--- From {src} ---\n{content}")
            print(f"Vector search returned {len(docs)} chunks.")  # Debug
            return "[Relevant FIR Document Excerpts]\n" + "\n\n".join(chunks)
        except Exception as e:
            print(f"Vector retrieval error: {e}")
            return f"[Document Error] {str(e)}"

    # ------------------------------------------------------------
    # Execute both retrievals in parallel
    # ------------------------------------------------------------
    sql_context, vector_context = await asyncio.gather(
        fetch_sql_context(),
        fetch_vector_context()
    )

    # ------------------------------------------------------------
    # 3. Build the final prompt & call LLM
    # ------------------------------------------------------------
    system_msg = f"""You are an expert AI assistant for Karnataka Police. You have access to two types of information:
1. Structured crime database results (SQL query results).
2. Excerpts from real FIR documents.
Use ONLY the provided contexts to answer the user's question. If the answer cannot be found, say so politely.
Always cite specific case numbers, document sources, or database entries when providing information.
Answer in the same language as the user (detected: {'Kannada' if lang_hint=='kn' else 'English'})."""

    final_prompt = f"""{system_msg}

===== DATABASE RESULTS =====
{sql_context}

===== FIR DOCUMENT EXCERPTS =====
{vector_context}

User question: {user_query}

Answer (use only the above contexts, be concise and cite sources):"""

    try:
        response = ollama.chat(
            model="gemma:2b",
            messages=[{"role": "user", "content": final_prompt}],
            options={"temperature": 0.2}
        )
        reply = response["message"]["content"]
        print(f"Final answer generated ({len(reply)} chars)")
    except Exception as e:
        reply = f"Error generating answer: {str(e)}"

    return {"reply": reply}


@app.get("/api/test_vector")
def test_vector(q: str = "test"):
    docs = vectorstore.similarity_search(q, k=3)
    results = []
    for d in docs:
        results.append({
            "source": d.metadata.get("source", "?"),
            "content": d.page_content[:300]
        })
    return {"query": q, "results": results}
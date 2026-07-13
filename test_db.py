print("Script started...")

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

# Debug prints – check if the values are loaded
print("POSTGRES_HOST:", os.getenv('POSTGRES_HOST'))
print("POSTGRES_DB:", os.getenv('POSTGRES_DB'))
print("POSTGRES_USER:", os.getenv('POSTGRES_USER'))
print("POSTGRES_PASSWORD:", os.getenv('POSTGRES_PASSWORD'))

db_url = f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@{os.getenv('POSTGRES_HOST')}/{os.getenv('POSTGRES_DB')}"
print("DB URL:", db_url)

engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("Connected! Result:", result.fetchone())
except Exception as e:
    print("Connection failed:", e)
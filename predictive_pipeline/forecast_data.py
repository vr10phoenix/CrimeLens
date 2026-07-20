import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

load_dotenv()

engine = create_engine(f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@{os.getenv('POSTGRES_HOST')}/{os.getenv('POSTGRES_DB')}")

query = """
SELECT TO_CHAR(crimeregistereddate, 'YYYY-MM-01')::DATE as ds, COUNT(*) as y
FROM casemaster
WHERE crimeregistereddate >= '2019-01-01'
GROUP BY ds
ORDER BY ds
"""

df = pd.read_sql(query , engine)
df.to_csv('monthly_crimes.csv' , index = False)

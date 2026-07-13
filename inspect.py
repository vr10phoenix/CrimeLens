from sqlalchemy import create_engine
import pandas as pd

engine = create_engine('postgresql://postgres:secret123@localhost/crime_db')
df = pd.read_sql("SELECT * FROM casemaster LIMIT 10", engine)
print(df[['casemasterid', 'crimeno', 'brieffacts']].to_string())
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

load_dotenv()
engine = create_engine(f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@{os.getenv('POSTGRES_HOST')}/{os.getenv('POSTGRES_DB')}")

query = """
SELECT 
    a.accusedmasterid,
    a.accusedname,
    COUNT(DISTINCT a.casemasterid) as case_count,
    MAX(CASE WHEN g.gangid IS NOT NULL THEN 1 ELSE 0 END) as gang_member,
    COUNT(DISTINCT fa.accountid) as account_count,
    COALESCE(SUM(t.amount), 0) as total_transaction_volume,
    COUNT(DISTINCT pc.callid) as call_count,
    AVG(CASE WHEN ch.crimeheadname IN ('Murder','Rape','Attempt to Murder') THEN 1 ELSE 0 END) as violent_ratio
FROM accused a
LEFT JOIN ext_gangmembership gm ON a.accusedname = gm.personname
LEFT JOIN ext_gang g ON gm.gangid = g.gangid
LEFT JOIN ext_person ep ON a.accusedname = ep.name AND a.ageyear = ep.age
LEFT JOIN ext_financialaccount fa ON ep.personpoolid = fa.personpoolid
LEFT JOIN ext_transaction t ON fa.accountid IN (t.fromaccountid, t.toaccountid)
LEFT JOIN ext_phonecall pc ON ep.personpoolid IN (pc.callerpersonpoolid, pc.receiverpersonpoolid)
LEFT JOIN casemaster cm ON a.casemasterid = cm.casemasterid
LEFT JOIN crimehead ch ON cm.crimemajorheadid = ch.crimeheadid
GROUP BY a.accusedmasterid, a.accusedname
"""
df = pd.read_sql(query, engine)
df.to_csv('risk.csv', index=False)
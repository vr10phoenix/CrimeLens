import os
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect
from neo4j import GraphDatabase
from datetime import datetime

load_dotenv()

# PostgreSQL
DB_URL = f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@{os.getenv('POSTGRES_HOST')}/{os.getenv('POSTGRES_DB')}"
engine = create_engine(DB_URL)

# Neo4j
NEO4J_URI = "bolt://localhost:7687"
NEO4J_AUTH = ("neo4j", "testpass")
driver = GraphDatabase.driver(NEO4J_URI, auth=NEO4J_AUTH)

def clear_graph(tx):
    tx.run("MATCH (n) DETACH DELETE n")

def create_constraints(tx):
    tx.run("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Person) REQUIRE p.personId IS UNIQUE")
    tx.run("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Case) REQUIRE c.caseId IS UNIQUE")
    tx.run("CREATE CONSTRAINT IF NOT EXISTS FOR (g:Gang) REQUIRE g.gangId IS UNIQUE")
    tx.run("CREATE CONSTRAINT IF NOT EXISTS FOR (a:Account) REQUIRE a.accountId IS UNIQUE")
    # tx.run("CREATE CONSTRAINT IF NOT EXISTS FOR (l:Location) REQUIRE l.locationId IS UNIQUE")
    # tx.run("CREATE CONSTRAINT IF NOT EXISTS FOR (ps:PoliceStation) REQUIRE ps.stationId IS UNIQUE")

def build_graph():
    with driver.session() as session:
        # Clear and set up constraints
        print("Clearing existing graph...")
        session.execute_write(clear_graph)
        print("Creating constraints...")
        session.execute_write(create_constraints)

        # Load data from Postgres
        print("Loading data from PostgreSQL...")
        persons = pd.read_sql("SELECT * FROM ext_person", engine)
        cases = pd.read_sql("SELECT * FROM casemaster", engine)
        accused = pd.read_sql("SELECT * FROM accused", engine)
        victims = pd.read_sql("SELECT * FROM victim", engine)
        gangs = pd.read_sql("SELECT * FROM ext_gang", engine)
        memberships = pd.read_sql("SELECT * FROM ext_gangmembership", engine)
        accounts = pd.read_sql("SELECT * FROM ext_financialaccount", engine)
        transactions = pd.read_sql("SELECT * FROM ext_transaction", engine)
        calls = pd.read_sql("SELECT * FROM ext_phonecall", engine)

        # locations and police_stations (dropped for now )
        # police_stations = pd.read_sql("SELECT * FROM policestation", engine)

        # Create Person nodes
        print("Creating Person nodes...")
        for _, row in persons.iterrows():
            session.run(
                "CREATE (p:Person {personId: $pid, name: $name, age: $age, gender: $gender, phone: $phone})",
                pid=int(row['personpoolid']), name=row['name'], age=int(row['age']),
                gender="Male" if row['genderid']==1 else "Female" if row['genderid']==2 else "Other",
                phone=row['phone']
            )
        print(f"Created {len(persons)} Person nodes.")

        # Create Case nodes
        print("Creating Case nodes...")
        for _, row in cases.iterrows():
            session.run(
                "CREATE (c:Case {caseId: $cid, crimeNo: $crimeno, caseNo: $caseno, regDate: date($regdate), facts: $facts, status: $status})",
                cid=int(row['casemasterid']), crimeno=row['crimeno'], caseno=row['caseno'],
                regdate=str(row['crimeregistereddate']), facts=row['brieffacts'][:200],
                status=str(row['casestatusid'])
            )
        print(f"Created {len(cases)} Case nodes.")

        # Create Gang nodes
        print("Creating Gang nodes...")
        for _, row in gangs.iterrows():
            session.run(
                "CREATE (g:Gang {gangId: $gid, name: $name, territoryDistrictId: $did})",
                gid=int(row['gangid']), name=row['gangname'], did=int(row['territorydistrictid'])
            )
        print(f"Created {len(gangs)} Gang nodes.")

        # Create Account nodes
        print("Creating Account nodes...")
        for _, row in accounts.iterrows():
            session.run(
                "CREATE (a:Account {accountId: $aid, accountNumber: $anum, bank: $bank, balance: $bal})",
                aid=int(row['accountid']), anum=row['accountnumber'], bank=row['bankname'], bal=float(row['balance'])
            )
        print(f"Created {len(accounts)} Account nodes.")

        # Relationships: ACCUSED_IN (Person -> Case)
        print("Creating ACCUSED_IN relationships...")
        for _, row in accused.iterrows():
            gender = "Male" if row['genderid']==1 else "Female" if row['genderid']==2 else "Other"
            session.run(
                """
                MATCH (p:Person {name: $name, age: $age, gender: $gender})
                MATCH (c:Case {caseId: $caseId})
                MERGE (p)-[:ACCUSED_IN {label: $label}]->(c)
                """,
                name=row['accusedname'], age=int(row['ageyear']),
                gender=gender, caseId=int(row['casemasterid']), label=row['personid']
            )
        print("Done.")

        # Relationships: VICTIM_IN (Person -> Case)
        print("Creating VICTIM_IN relationships...")
        for _, row in victims.iterrows():
            gender = "Male" if row['genderid']==1 else "Female" if row['genderid']==2 else "Other"
            session.run(
                """
                MATCH (p:Person {name: $name, age: $age, gender: $gender})
                MATCH (c:Case {caseId: $caseId})
                MERGE (p)-[:VICTIM_IN]->(c)
                """,
                name=row['victimname'], age=int(row['ageyear']),
                gender=gender, caseId=int(row['casemasterid'])
            )
        print("Done.")

        # Relationships: MEMBER_OF (Person -> Gang)
        print("Creating MEMBER_OF relationships...")
        for _, row in memberships.iterrows():
            session.run(
                """
                MATCH (p:Person {personId: $pid})
                MATCH (g:Gang {gangId: $gid})
                MERGE (p)-[:MEMBER_OF {role: $role}]->(g)
                """,
                pid=int(row['personpoolid']), gid=int(row['gangid']), role=row['role']
            )
        print("Done.")

        # Relationships: OWNS (Person -> Account)
        print("Creating OWNS relationships...")
        for _, row in accounts.iterrows():
            session.run(
                """
                MATCH (p:Person {personId: $pid})
                MATCH (a:Account {accountId: $aid})
                MERGE (p)-[:OWNS]->(a)
                """,
                pid=int(row['personpoolid']), aid=int(row['accountid'])
            )
        print("Done.")

        # Relationships: TRANSFERRED_TO (Account -> Account)
        print("Creating TRANSFERRED_TO relationships...")
        for _, row in transactions.iterrows():
            dt = pd.to_datetime(row['transactiondate'])
            session.run(
                """
                MATCH (from:Account {accountId: $fromAid})
                MATCH (to:Account {accountId: $toAid})
                MERGE (from)-[:TRANSFERRED_TO {amount: $amt, date: datetime($date)}]->(to)
                """,
                fromAid=int(row['fromaccountid']), toAid=int(row['toaccountid']),
                amt=float(row['amount']),
                date=dt.strftime('%Y-%m-%dT%H:%M:%S')
            )
        print("Done.")

        # Relationships: CALLED (Person -> Person)
        print("Creating CALLED relationships...")
        for _, row in calls.iterrows():
            dt = pd.to_datetime(row['calldatetime'])
            session.run(
                """
                MATCH (caller:Person {personId: $callerId})
                MATCH (receiver:Person {personId: $receiverId})
                MERGE (caller)-[:CALLED {duration: $dur, datetime: datetime($date)}]->(receiver)
                """,
                callerId=int(row['callerpersonpoolid']), receiverId=int(row['receiverpersonpoolid']),
                dur=int(row['durationsec']),
                date=dt.strftime('%Y-%m-%dT%H:%M:%S')
            )
        print("Done.")

    print("Graph construction complete.")

if __name__ == "__main__":
    build_graph()
    driver.close()
"""
Synthetic Crime Dataset Generator for Karnataka - Final Robust Version
"""

import os
import random
import math
from datetime import datetime, timedelta, date
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, MetaData
from faker import Faker
import pandas as pd
import numpy as np

# --- Configuration ---
load_dotenv()
DB_URL = f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@{os.getenv('POSTGRES_HOST')}/{os.getenv('POSTGRES_DB')}"
engine = create_engine(DB_URL)
metadata = MetaData()

fake = Faker('en_IN')
random.seed(42)
np.random.seed(42)
fake.seed_instance(42)

# --- Karnataka Specific Data ---
KARNATAKA_DISTRICTS = [
    "Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Mangaluru", "Belagavi", "Hubballi", "Dharwad",
    "Kalaburagi", "Davanagere", "Ballari", "Tumakuru", "Shivamogga", "Raichur", "Bidar",
    "Vijayapura", "Chitradurga", "Hassan", "Udupi", "Kodagu", "Kolar", "Mandya", "Chikkamagaluru",
    "Uttara Kannada", "Dakshina Kannada", "Chamarajanagar", "Ramanagara", "Bagalkot", "Gadag",
    "Haveri", "Koppal", "Yadgir"
]
DISTRICT_COORDS = {
    "Bengaluru Urban": (12.9716, 77.5946), "Bengaluru Rural": (13.2263, 77.5766),
    "Mysuru": (12.2958, 76.6394), "Mangaluru": (12.9141, 74.8560), "Belagavi": (15.8497, 74.4977),
    "Hubballi": (15.3647, 75.1240), "Dharwad": (15.4589, 75.0078), "Kalaburagi": (17.3297, 76.8343),
    "Davanagere": (14.4644, 75.9218), "Ballari": (15.1394, 76.9214), "Tumakuru": (13.3379, 77.1173),
    "Shivamogga": (13.9299, 75.5681), "Raichur": (16.2076, 77.3463), "Bidar": (17.9130, 77.5191),
    "Vijayapura": (16.8302, 75.7100), "Chitradurga": (14.2306, 76.3985), "Hassan": (13.0067, 76.0995),
    "Udupi": (13.3409, 74.7421), "Kodagu": (12.4222, 75.7395), "Kolar": (13.1367, 78.1290),
    "Mandya": (12.5246, 76.8940), "Chikkamagaluru": (13.3153, 75.7754), "Uttara Kannada": (14.7951, 74.7656),
    "Dakshina Kannada": (12.9141, 74.8560), "Chamarajanagar": (11.9237, 76.9466),
    "Ramanagara": (12.7200, 77.2800), "Bagalkot": (16.1785, 75.6978), "Gadag": (15.4317, 75.6365),
    "Haveri": (14.7953, 75.3958), "Koppal": (15.3462, 76.1380), "Yadgir": (16.7653, 77.1375)
}
POLICE_STATIONS = {
    "Bengaluru Urban": ["Vidhana Soudha PS", "Koramangala PS", "Whitefield PS", "Yelahanka PS", "Jayanagar PS"],
    "Mysuru": ["Devaraja PS", "Nazarbad PS", "Kuvempunagar PS"],
    "Mangaluru": ["Bunder PS", "Panambur PS", "Surathkal PS"],
    "Hubballi": ["Hubballi Town PS", "Gokul Road PS"],
    "Belagavi": ["Belagavi City PS", "Angol PS"],
    "Kalaburagi": ["Brahm Shah PS", "Station Bazar PS"],
    "Davanagere": ["Davanagere City PS", "Jayanagar PS"],
    "Ballari": ["Ballari City PS", "Tilak Nagar PS"],
    "Tumakuru": ["Tumakuru City PS", "Sira Gate PS"],
    "Shivamogga": ["Shivamogga Town PS", "Bhadravathi PS"],
}
for d in KARNATAKA_DISTRICTS:
    if d not in POLICE_STATIONS:
        POLICE_STATIONS[d] = [f"{d} Central PS", f"{d} Rural PS"]

# Acts & Sections
IPC_ACT = {"actcode": "IPC", "actdescription": "Indian Penal Code", "shortname": "IPC", "active": True}
CRPC_ACT = {"actcode": "CrPC", "actdescription": "Code of Criminal Procedure", "shortname": "CrPC", "active": True}
ARMS_ACT = {"actcode": "Arms Act", "actdescription": "Arms Act, 1959", "shortname": "Arms Act", "active": True}
NDPS_ACT = {"actcode": "NDPS", "actdescription": "Narcotic Drugs and Psychotropic Substances Act", "shortname": "NDPS", "active": True}
IT_ACT = {"actcode": "IT Act", "actdescription": "Information Technology Act, 2000", "shortname": "IT Act", "active": True}
EXCISE_ACT = {"actcode": "Karnataka Excise Act", "actdescription": "Karnataka Excise Act, 1965", "shortname": "KEA", "active": True}

IPC_SECTIONS = {"IPC": ["302", "307", "376", "354", "420", "406", "498A", "323", "324", "326", "147", "148", "149", "379", "380", "384", "506", "120B"]}
CRPC_SECTIONS = {"CrPC": ["41", "46", "48", "54", "144"]}
ARMS_SECTIONS = {"Arms Act": ["3", "25", "27"]}
NDPS_SECTIONS = {"NDPS": ["8", "20", "21", "22", "27", "29"]}
IT_SECTIONS = {"IT Act": ["43", "66", "67", "67A"]}
EXCISE_SECTIONS = {"Karnataka Excise Act": ["32", "34", "36"]}

CRIME_MAJOR_HEADS = {
    "Murder": "IPC 302",
    "Attempt to Murder": "IPC 307",
    "Rape": "IPC 376",
    "Assault on Women": "IPC 354",
    "Cheating": "IPC 420",
    "Dowry Death": "IPC 304B",
    "Theft": "IPC 379",
    "Robbery": "IPC 392",
    "Burglary": "IPC 457",
    "Rioting": "IPC 147",
    "Criminal Intimidation": "IPC 506",
    "Cyber Crime": "IT Act",
    "NDPS Case": "NDPS",
    "Arms Act Case": "Arms Act",
    "Excise Offence": "Karnataka Excise Act"
}
CRIME_MINOR_HEADS = {
    "Murder": [{"minor": "Murder by sharp weapon", "head": "Murder"}, {"minor": "Murder by poison", "head": "Murder"}],
    "Attempt to Murder": [{"minor": "Attempt to murder by firearm", "head": "Attempt to Murder"}, {"minor": "Attempt to murder by stabbing", "head": "Attempt to Murder"}],
    "Rape": [{"minor": "Rape of minor", "head": "Rape"}, {"minor": "Gang rape", "head": "Rape"}],
}
for head in CRIME_MAJOR_HEADS:
    if head not in CRIME_MINOR_HEADS:
        CRIME_MINOR_HEADS[head] = [{"minor": head + " (General)", "head": head}]

CASE_CATEGORIES = [{"id": 1, "name": "FIR"}, {"id": 2, "name": "UDR"}, {"id": 3, "name": "Zero FIR"}]
CASE_STATUSES = [
    {"id": 1, "name": "Under Investigation"},
    {"id": 2, "name": "Charge Sheeted"},
    {"id": 3, "name": "Final Report False"},
    {"id": 4, "name": "Untraced"},
    {"id": 5, "name": "Committed to Court"}
]
GRAVITY = [{"id": 1, "name": "Heinous"}, {"id": 2, "name": "Non-Heinous"}]

def generate_crime_no(case_category, district, station, year, serial):
    dcode = district.replace(" ", "").upper()[:4]
    scode = station.replace(" ", "").upper()[:4]
    return f"Crime/{case_category}/{dcode}/{scode}/{year}/{serial:05d}"

def generate_case_no(year, serial):
    return f"{year}/{serial:06d}"

# --- Create Tables (all lowercase, unquoted) ---
def create_tables():
    statements = [
        """
        CREATE TABLE IF NOT EXISTS state (
            stateid SERIAL PRIMARY KEY,
            statename VARCHAR(100) NOT NULL,
            nationalityid INT DEFAULT 1,
            active BOOLEAN DEFAULT TRUE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS district (
            districtid SERIAL PRIMARY KEY,
            districtname VARCHAR(100) NOT NULL,
            stateid INT REFERENCES state(stateid),
            active BOOLEAN DEFAULT TRUE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS policestation (
            policestationid SERIAL PRIMARY KEY,
            stationname VARCHAR(200) NOT NULL,
            districtid INT REFERENCES district(districtid),
            active BOOLEAN DEFAULT TRUE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS court (
            courtid SERIAL PRIMARY KEY,
            courtname VARCHAR(200) NOT NULL,
            districtid INT REFERENCES district(districtid),
            stateid INT REFERENCES state(stateid),
            active BOOLEAN DEFAULT TRUE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS act (
            actcode VARCHAR(50) PRIMARY KEY,
            actdescription VARCHAR(500),
            shortname VARCHAR(100),
            active BOOLEAN DEFAULT TRUE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS section (
            sectionid SERIAL PRIMARY KEY,
            actcode VARCHAR(50) REFERENCES act(actcode),
            sectioncode VARCHAR(50) NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS crimehead (
            crimeheadid SERIAL PRIMARY KEY,
            crimeheadname VARCHAR(200) NOT NULL,
            actcode VARCHAR(50) REFERENCES act(actcode),
            sectioncode VARCHAR(50),
            level VARCHAR(20) CHECK (level IN ('Major', 'Minor')),
            parentheadid INT REFERENCES crimehead(crimeheadid) NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS policeperson (
            policepersonid SERIAL PRIMARY KEY,
            name VARCHAR(100),
            rank VARCHAR(50),
            policestationid INT REFERENCES policestation(policestationid)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS casecategory (
            casecategoryid SERIAL PRIMARY KEY,
            categoryname VARCHAR(50)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS gravityoffence (
            gravityoffenceid SERIAL PRIMARY KEY,
            offencetype VARCHAR(20)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS casestatus (
            casestatusid SERIAL PRIMARY KEY,
            statusname VARCHAR(50)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS casemaster (
            casemasterid SERIAL PRIMARY KEY,
            crimeno VARCHAR(100) NOT NULL,
            caseno VARCHAR(50) NOT NULL,
            crimeregistereddate DATE NOT NULL,
            policepersonid INT REFERENCES policeperson(policepersonid),
            policestationid INT REFERENCES policestation(policestationid),
            casecategoryid INT REFERENCES casecategory(casecategoryid),
            gravityoffenceid INT REFERENCES gravityoffence(gravityoffenceid),
            crimemajorheadid INT REFERENCES crimehead(crimeheadid),
            crimeminorheadid INT REFERENCES crimehead(crimeheadid),
            casestatusid INT REFERENCES casestatus(casestatusid),
            courtid INT REFERENCES court(courtid),
            incidentfromdate TIMESTAMP,
            incidenttodate TIMESTAMP,
            inforeceivedpsdate TIMESTAMP,
            latitude DECIMAL(9,6),
            longitude DECIMAL(9,6),
            brieffacts VARCHAR(2000)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS complainant (
            complainantid SERIAL PRIMARY KEY,
            casemasterid INT REFERENCES casemaster(casemasterid),
            complainantname VARCHAR(100),
            ageyear INT,
            occupationid INT,
            religionid INT,
            casteid INT,
            genderid INT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS victim (
            victimmasterid SERIAL PRIMARY KEY,
            casemasterid INT REFERENCES casemaster(casemasterid),
            victimname VARCHAR(100),
            ageyear INT,
            genderid INT,
            victimpolice BOOLEAN DEFAULT FALSE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS accused (
            accusedmasterid SERIAL PRIMARY KEY,
            casemasterid INT REFERENCES casemaster(casemasterid),
            accusedname VARCHAR(100),
            ageyear INT,
            genderid INT,
            personid VARCHAR(10)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS arrestsurrender (
            arrestsurrenderid SERIAL PRIMARY KEY,
            casemasterid INT REFERENCES casemaster(casemasterid),
            arrestsurrenderrtypeid INT,
            arrestsurrenderrdate DATE,
            arrestsurrenderrstateid INT REFERENCES state(stateid),
            arrestsurrenderrdistrictid INT REFERENCES district(districtid),
            policestationid INT REFERENCES policestation(policestationid),
            ioid INT REFERENCES policeperson(policepersonid),
            courtid INT REFERENCES court(courtid),
            accusedmasterid INT REFERENCES accused(accusedmasterid),
            isaccused BOOLEAN DEFAULT TRUE,
            iscomplainantaccused BOOLEAN DEFAULT FALSE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS caseactsection (
            casemasterid INT REFERENCES casemaster(casemasterid),
            actid VARCHAR(50) REFERENCES act(actcode),
            sectionid INT REFERENCES section(sectionid),
            actorderid INT,
            sectionorderid INT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS ext_gang (
            gangid SERIAL PRIMARY KEY,
            gangname VARCHAR(100),
            territorydistrictid INT REFERENCES district(districtid),
            active BOOLEAN DEFAULT TRUE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS ext_gangmembership (
            membershipid SERIAL PRIMARY KEY,
            personname VARCHAR(100),
            personpoolid INT,
            gangid INT REFERENCES ext_gang(gangid),
            role VARCHAR(30)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS ext_person (
            personpoolid SERIAL PRIMARY KEY,
            name VARCHAR(100),
            age INT,
            genderid INT,
            districtid INT REFERENCES district(districtid),
            phone VARCHAR(15)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS ext_personrelationship (
            relationshipid SERIAL PRIMARY KEY,
            person1poolid INT REFERENCES ext_person(personpoolid),
            person2poolid INT REFERENCES ext_person(personpoolid),
            relationshiptype VARCHAR(20)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS ext_financialaccount (
            accountid SERIAL PRIMARY KEY,
            personpoolid INT REFERENCES ext_person(personpoolid),
            bankname VARCHAR(100),
            accountnumber VARCHAR(20),
            accounttype VARCHAR(20),
            balance DECIMAL(12,2)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS ext_transaction (
            transactionid SERIAL PRIMARY KEY,
            fromaccountid INT REFERENCES ext_financialaccount(accountid),
            toaccountid INT REFERENCES ext_financialaccount(accountid),
            amount DECIMAL(10,2),
            transactiondate TIMESTAMP,
            remarks VARCHAR(200)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS ext_phonecall (
            callid SERIAL PRIMARY KEY,
            callerpersonpoolid INT REFERENCES ext_person(personpoolid),
            receiverpersonpoolid INT REFERENCES ext_person(personpoolid),
            calldatetime TIMESTAMP,
            durationsec INT,
            towerdistrictid INT REFERENCES district(districtid)
        )
        """
    ]
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
    print("Tables created/verified.")

# --- Clear existing data to avoid duplicate key errors ---
def clear_data():
    tables = [
        "ext_phonecall", "ext_transaction", "ext_financialaccount", "ext_personrelationship",
        "ext_gangmembership", "ext_gang", "ext_person",
        "caseactsection", "arrestsurrender", "accused", "victim", "complainant",
        "casemaster", "casecategory", "gravityoffence", "casestatus",
        "crimehead", "section", "act", "policeperson",
        "policestation", "court", "district", "state"
    ]
    with engine.begin() as conn:
        for table in tables:
            conn.execute(text(f"DELETE FROM {table}"))
    print("Old data cleared.")

# --- Populate Lookup Data ---
def populate_lookups():
    # State
    states = [{"stateid": 1, "statename": "Karnataka", "nationalityid": 1, "active": True}]
    pd.DataFrame(states).to_sql("state", engine, if_exists="append", index=False, method="multi")
    # Districts
    districts = []
    for i, d in enumerate(KARNATAKA_DISTRICTS, 1):
        districts.append({"districtid": i, "districtname": d, "stateid": 1, "active": True})
    pd.DataFrame(districts).to_sql("district", engine, if_exists="append", index=False, method="multi")
    # PoliceStations
    stations = []
    sid = 1
    for d in KARNATAKA_DISTRICTS:
        district_id = KARNATAKA_DISTRICTS.index(d) + 1
        for s in POLICE_STATIONS[d]:
            stations.append({"policestationid": sid, "stationname": s, "districtid": district_id, "active": True})
            sid += 1
    pd.DataFrame(stations).to_sql("policestation", engine, if_exists="append", index=False, method="multi")
    # Courts
    courts = []
    cid = 1
    for d in KARNATAKA_DISTRICTS:
        district_id = KARNATAKA_DISTRICTS.index(d) + 1
        for court_name in [f"{d} Sessions Court", f"{d} JMFC Court"]:
            courts.append({"courtid": cid, "courtname": court_name, "districtid": district_id, "stateid": 1, "active": True})
            cid += 1
    pd.DataFrame(courts).to_sql("court", engine, if_exists="append", index=False, method="multi")
    # Acts
    acts_lower = [IPC_ACT, CRPC_ACT, ARMS_ACT, NDPS_ACT, IT_ACT, EXCISE_ACT]
    pd.DataFrame(acts_lower).to_sql("act", engine, if_exists="append", index=False, method="multi")
    # Sections
    sections = []
    for act_code, sec_list in {**IPC_SECTIONS, **CRPC_SECTIONS, **ARMS_SECTIONS, **NDPS_SECTIONS, **IT_SECTIONS, **EXCISE_SECTIONS}.items():
        for sec in sec_list:
            sections.append({"actcode": act_code, "sectioncode": sec})
    df_sec = pd.DataFrame(sections)
    df_sec.to_sql("section", engine, if_exists="append", index=False, method="multi")
    df_sec_db = pd.read_sql("SELECT * FROM section", engine)
    section_map = {(row.actcode, row.sectioncode): row.sectionid for _, row in df_sec_db.iterrows()}
    # CrimeHeads
    crime_heads = []
    major_ids = {}
    next_id = 1
    for major, act_section in CRIME_MAJOR_HEADS.items():
        # Smart split
        parts = act_section.split()
        if len(parts) > 1 and (parts[-1].isdigit() or (parts[-1][:-1].isdigit() and parts[-1][-1].isalpha())):
            sec_code = parts[-1]
            act_code = " ".join(parts[:-1])
        else:
            act_code = act_section
            sec_code = None
        major_ids[major] = next_id
        crime_heads.append({
            "crimeheadid": next_id,
            "crimeheadname": major,
            "actcode": act_code,
            "sectioncode": sec_code,
            "level": "Major",
            "parentheadid": None
        })
        next_id += 1
    for major, minors in CRIME_MINOR_HEADS.items():
        parent_id = major_ids[major]
        for minor_info in minors:
            crime_heads.append({
                "crimeheadid": next_id,
                "crimeheadname": minor_info["minor"],
                "actcode": None,
                "sectioncode": None,
                "level": "Minor",
                "parentheadid": parent_id
            })
            next_id += 1
    pd.DataFrame(crime_heads).to_sql("crimehead", engine, if_exists="append", index=False, method="multi")
    # CaseCategory
    cat_df = pd.DataFrame(CASE_CATEGORIES)
    cat_df.columns = ["casecategoryid", "categoryname"]
    cat_df.to_sql("casecategory", engine, if_exists="append", index=False, method="multi")
    # GravityOffence
    grav_df = pd.DataFrame(GRAVITY)
    grav_df.columns = ["gravityoffenceid", "offencetype"]
    grav_df.to_sql("gravityoffence", engine, if_exists="append", index=False, method="multi")
    # CaseStatus
    status_df = pd.DataFrame(CASE_STATUSES)
    status_df.columns = ["casestatusid", "statusname"]
    status_df.to_sql("casestatus", engine, if_exists="append", index=False, method="multi")
    print("Lookup data populated.")
    return section_map, major_ids

# --- Generate Person Pool ---
def generate_person_pool(num_persons=15000):
    persons = []
    for i in range(num_persons):
        district = random.choice(KARNATAKA_DISTRICTS)
        district_id = KARNATAKA_DISTRICTS.index(district) + 1
        gender = random.choice(["Male", "Female", "Other"])
        age = random.randint(18, 70)
        name = fake.name_male() if gender == "Male" else fake.name_female()
        phone = f"+91{fake.msisdn()[3:]}"
        persons.append({
            "personpoolid": i+1,
            "name": name,
            "age": age,
            "genderid": 1 if gender == "Male" else 2 if gender == "Female" else 3,
            "districtid": district_id,
            "phone": phone
        })
    df = pd.DataFrame(persons)
    df.to_sql("ext_person", engine, if_exists="append", index=False, method="multi")
    return persons

# --- Generate Cases ---
def generate_cases(person_pool, section_map, major_ids):
    num_cases = 10000
    cases = []
    complainants = []
    victims = []
    accused_list = []
    arrests = []
    case_act_sections = []

    police_persons = pd.read_sql("SELECT * FROM policeperson", engine)
    police_stations = pd.read_sql("SELECT * FROM policestation", engine)
    courts = pd.read_sql("SELECT * FROM court", engine)
    case_categories = pd.read_sql("SELECT * FROM casecategory", engine)
    gravities = pd.read_sql("SELECT * FROM gravityoffence", engine)
    statuses = pd.read_sql("SELECT * FROM casestatus", engine)
    crime_heads = pd.read_sql("SELECT * FROM crimehead", engine)

    pool = person_pool

    brief_templates = [
        "Complainant {complainant} reported that on {date} at {location}, accused {accused} {action} using {weapon}. The incident occurred at approximately {time}.",
        "On {date}, the victim {victim} was found {state} near {area}. Investigation revealed involvement of {accused}. Case registered under relevant sections.",
        "FIR lodged by {complainant} against unknown persons for {crime}. Later, accused {accused} identified. Incident took place at {location}."
    ]

    for i in range(1, num_cases+1):
        district = random.choice(KARNATAKA_DISTRICTS)
        district_id = KARNATAKA_DISTRICTS.index(district) + 1
        stations_in_district = police_stations[police_stations.districtid == district_id]
        station = stations_in_district.sample(1).iloc[0]
        ps_id = station.policestationid

        officer = police_persons.sample(1).iloc[0]
        officer_id = officer.policepersonid

        cat = random.choices(case_categories.casecategoryid.tolist(), weights=[0.9, 0.07, 0.03])[0]
        cat_name = case_categories[case_categories.casecategoryid == cat].categoryname.values[0]

        year = random.randint(2019, 2024)
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        reg_date = fake.date_between(start_date=start_date, end_date=end_date)
        incident_from = reg_date - timedelta(days=random.randint(0,7), hours=random.randint(0,23), minutes=random.randint(0,59))
        incident_to = incident_from + timedelta(hours=random.randint(1,24))
        info_recv = reg_date - timedelta(hours=random.randint(0,12))

        serial = i
        crime_no = generate_crime_no(cat_name, district, station.stationname, year, serial)
        case_no = generate_case_no(year, serial)

        base_lat, base_lon = DISTRICT_COORDS[district]
        lat = base_lat + random.uniform(-0.2, 0.2)
        lon = base_lon + random.uniform(-0.2, 0.2)

        major_head = random.choice(list(CRIME_MAJOR_HEADS.keys()))
        major_id = major_ids[major_head]
        minors = crime_heads[(crime_heads.parentheadid == major_id) & (crime_heads.level == "Minor")]
        minor_id = minors.sample(1).iloc[0].crimeheadid if len(minors) > 0 else None

        grav_id = 1 if major_head in ["Murder", "Rape", "Attempt to Murder", "Dowry Death"] else 2
        status_id = random.choices(statuses.casestatusid.tolist(), weights=[0.6, 0.2, 0.1, 0.05, 0.05])[0]

        court_id = courts[courts.districtid == district_id].sample(1).iloc[0].courtid

        complainant = random.choice(pool)
        victim = random.choice(pool)
        num_accused = random.randint(1, 5)
        accused_persons = random.sample(pool, num_accused)
        template = random.choice(brief_templates)
        fact = template.format(
            complainant=complainant['name'],
            date=incident_from.strftime("%d-%m-%Y"),
            location=f"near {district}",
            accused=", ".join([a['name'] for a in accused_persons]),
            action=random.choice(["assaulted", "threatened", "stabbed", "shot"]),
            weapon=random.choice(["knife", "country-made pistol", "rod", "machete"]),
            time=incident_from.strftime("%H:%M"),
            victim=victim['name'],
            state=random.choice(["unconscious", "dead", "injured"]),
            area=district,
            crime=major_head
        )

        cases.append({
            "casemasterid": i,
            "crimeno": crime_no,
            "caseno": case_no,
            "crimeregistereddate": reg_date,
            "policepersonid": officer_id,
            "policestationid": ps_id,
            "casecategoryid": cat,
            "gravityoffenceid": grav_id,
            "crimemajorheadid": major_id,
            "crimeminorheadid": minor_id,
            "casestatusid": status_id,
            "courtid": court_id,
            "incidentfromdate": incident_from,
            "incidenttodate": incident_to,
            "inforeceivedpsdate": info_recv,
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "brieffacts": fact[:2000]
        })

        num_complainants = random.randint(1,2)
        for _ in range(num_complainants):
            comp = random.choice(pool)
            complainants.append({
                "complainantid": len(complainants)+1,
                "casemasterid": i,
                "complainantname": comp['name'],
                "ageyear": comp['age'],
                "occupationid": None,
                "religionid": None,
                "casteid": None,
                "genderid": comp['genderid']
            })

        num_victims = random.randint(1,3)
        for _ in range(num_victims):
            vic = random.choice(pool)
            victims.append({
                "victimmasterid": len(victims)+1,
                "casemasterid": i,
                "victimname": vic['name'],
                "ageyear": vic['age'],
                "genderid": vic['genderid'],
                "victimpolice": random.choice([True, False]) if random.random() < 0.1 else False
            })

        for idx, acc in enumerate(accused_persons):
            accused_list.append({
                "accusedmasterid": len(accused_list)+1,
                "casemasterid": i,
                "accusedname": acc['name'],
                "ageyear": acc['age'],
                "genderid": acc['genderid'],
                "personid": f"A{idx+1}"
            })

        if status_id in [1, 2, 5]:
            for acc in accused_persons:
                if random.random() < 0.6:
                    arrest_date = reg_date + timedelta(days=random.randint(1, 60))
                    arrests.append({
                        "arrestsurrenderid": len(arrests)+1,
                        "casemasterid": i,
                        "arrestsurrenderrtypeid": random.choice([1,2]),
                        "arrestsurrenderrdate": arrest_date,
                        "arrestsurrenderrstateid": 1,
                        "arrestsurrenderrdistrictid": district_id,
                        "policestationid": ps_id,
                        "ioid": officer_id,
                        "courtid": court_id,
                        "accusedmasterid": len(accused_list),
                        "isaccused": True,
                        "iscomplainantaccused": False
                    })

        # Sections
        act_section_str = CRIME_MAJOR_HEADS[major_head]
        parts = act_section_str.split()
        if len(parts) > 1 and (parts[-1].isdigit() or (parts[-1][:-1].isdigit() and parts[-1][-1].isalpha())):
            act_code = " ".join(parts[:-1])
        else:
            act_code = act_section_str
        possible_secs = [k for k in section_map.keys() if k[0] == act_code]
        if possible_secs:
            chosen = random.sample(possible_secs, min(3, len(possible_secs)))
            for order, (act, sec) in enumerate(chosen):
                case_act_sections.append({
                    "casemasterid": i,
                    "actid": act,
                    "sectionid": section_map[(act, sec)],
                    "actorderid": order+1,
                    "sectionorderid": order+1
                })

    # Bulk insert
    pd.DataFrame(cases).to_sql("casemaster", engine, if_exists="append", index=False, method="multi")
    pd.DataFrame(complainants).to_sql("complainant", engine, if_exists="append", index=False, method="multi")
    pd.DataFrame(victims).to_sql("victim", engine, if_exists="append", index=False, method="multi")
    pd.DataFrame(accused_list).to_sql("accused", engine, if_exists="append", index=False, method="multi")
    pd.DataFrame(arrests).to_sql("arrestsurrender", engine, if_exists="append", index=False, method="multi")
    pd.DataFrame(case_act_sections).to_sql("caseactsection", engine, if_exists="append", index=False, method="multi")
    print(f"Generated {num_cases} cases with related data.")

# --- Generate Hidden Networks ---
def generate_networks(person_pool):
    gangs = [
        {"GangName": "Doddagubbi Rowdies", "Territory": "Bengaluru Rural"},
        {"GangName": "Mangalore Underworld", "Territory": "Dakshina Kannada"},
        {"GangName": "Ballari Red Sandalwood Mafia", "Territory": "Ballari"},
        {"GangName": "Hubli Gang", "Territory": "Hubballi"},
        {"GangName": "Mysore Sandalwood Smugglers", "Territory": "Mysuru"},
        {"GangName": "Coastal Smuggling Ring", "Territory": "Udupi"},
        {"GangName": "Kalaburagi Stone Quarry Mafia", "Territory": "Kalaburagi"},
        {"GangName": "Bengaluru Cyber Crime Syndicate", "Territory": "Bengaluru Urban"},
        {"GangName": "Naxal Affiliates", "Territory": "Chikkamagaluru"},
        {"GangName": "Kolar Gold Fields Gang", "Territory": "Kolar"},
        {"GangName": "Shivamogga Timber Mafia", "Territory": "Shivamogga"},
        {"GangName": "Belagavi Drug Cartel", "Territory": "Belagavi"},
    ]
    gang_records = []
    for idx, g in enumerate(gangs):
        district = g["Territory"]
        district_id = KARNATAKA_DISTRICTS.index(district) + 1
        gang_records.append({
            "gangid": idx+1,
            "gangname": g["GangName"],
            "territorydistrictid": district_id,
            "active": True
        })
    pd.DataFrame(gang_records).to_sql("ext_gang", engine, if_exists="append", index=False, method="multi")
    print(f"{len(gang_records)} gangs created.")

    memberships = []
    for gang in gang_records:
        gang_id = gang["gangid"]
        dist_id = gang["territorydistrictid"]
        pool_dist = [p for p in person_pool if p["districtid"] == dist_id]
        if len(pool_dist) < 5:
            pool_dist = person_pool
        num_members = random.randint(5, 20)
        members = random.sample(pool_dist, min(num_members, len(pool_dist)))
        for i, mem in enumerate(members):
            role = random.choice(["Leader", "Enforcer", "Associate"]) if i > 0 else "Leader"
            memberships.append({
                "membershipid": len(memberships)+1,
                "personname": mem["name"],
                "personpoolid": mem["personpoolid"],
                "gangid": gang_id,
                "role": role
            })
    pd.DataFrame(memberships).to_sql("ext_gangmembership", engine, if_exists="append", index=False, method="multi")
    print(f"{len(memberships)} gang memberships assigned.")

    relationships = []
    for _ in range(3000):
        p1, p2 = random.sample(person_pool, 2)
        rel_type = random.choice(["Brother", "Father", "Cousin", "Friend", "Associate"])
        relationships.append({
            "relationshipid": len(relationships)+1,
            "person1poolid": p1["personpoolid"],
            "person2poolid": p2["personpoolid"],
            "relationshiptype": rel_type
        })
    pd.DataFrame(relationships).to_sql("ext_personrelationship", engine, if_exists="append", index=False, method="multi")
    print(f"{len(relationships)} person relationships created.")

    accounts = []
    for p in random.sample(person_pool, 3000):
        num_accounts = random.randint(1, 3)
        for _ in range(num_accounts):
            accounts.append({
                "accountid": len(accounts)+1,
                "personpoolid": p["personpoolid"],
                "bankname": fake.company() + " Bank",
                "accountnumber": fake.bban(),
                "accounttype": random.choice(["Savings", "Current"]),
                "balance": round(random.uniform(500, 5000000), 2)
            })
    pd.DataFrame(accounts).to_sql("ext_financialaccount", engine, if_exists="append", index=False, method="multi")
    print(f"{len(accounts)} accounts created.")

    transactions = []
    for _ in range(5000):
        if len(accounts) < 2: break
        from_acc, to_acc = random.sample(accounts, 2)
        amt = round(random.uniform(1000, 2000000), 2)
        date = fake.date_time_between(start_date="-2y", end_date="now")
        transactions.append({
            "transactionid": len(transactions)+1,
            "fromaccountid": from_acc["accountid"],
            "toaccountid": to_acc["accountid"],
            "amount": amt,
            "transactiondate": date,
            "remarks": fake.sentence(nb_words=6)
        })
    pd.DataFrame(transactions).to_sql("ext_transaction", engine, if_exists="append", index=False, method="multi")
    print(f"{len(transactions)} transactions generated.")

    calls = []
    for _ in range(8000):
        caller, receiver = random.sample(person_pool, 2)
        call_date = fake.date_time_between(start_date="-1y", end_date="now")
        duration = random.randint(10, 600)
        tower_district = random.choice(KARNATAKA_DISTRICTS)
        tower_district_id = KARNATAKA_DISTRICTS.index(tower_district) + 1
        calls.append({
            "callid": len(calls)+1,
            "callerpersonpoolid": caller["personpoolid"],
            "receiverpersonpoolid": receiver["personpoolid"],
            "calldatetime": call_date,
            "durationsec": duration,
            "towerdistrictid": tower_district_id
        })
    pd.DataFrame(calls).to_sql("ext_phonecall", engine, if_exists="append", index=False, method="multi")
    print(f"{len(calls)} phone calls generated.")

# --- Main Execution ---
if __name__ == "__main__":
    print("Creating tables...")
    create_tables()
    print("Clearing old data...")
    clear_data()
    print("Populating lookups...")
    section_map, major_ids = populate_lookups()

    print("Generating police officers...")
    police_officers = []
    for i in range(1, 501):
        district = random.choice(KARNATAKA_DISTRICTS)
        police_officers.append({
            "policepersonid": i,
            "name": fake.name(),
            "rank": random.choice(["Constable", "Head Constable", "ASI", "SI", "Inspector"]),
            "policestationid": None
        })
    stations_df = pd.read_sql("SELECT * FROM policestation", engine)
    for officer in police_officers:
        target_district = KARNATAKA_DISTRICTS[officer["policepersonid"] % len(KARNATAKA_DISTRICTS)]
        possible_stations = stations_df[stations_df.stationname.str.contains(target_district[:4])]
        if len(possible_stations) == 0:
            possible_stations = stations_df
        station = possible_stations.sample(1).iloc[0]
        officer["policestationid"] = station.policestationid
    pd.DataFrame(police_officers).to_sql("policeperson", engine, if_exists="append", index=False, method="multi")
    print("500 police officers inserted.")

    print("Generating person pool (15,000)...")
    person_pool = generate_person_pool(15000)

    print("Generating FIRs and core data...")
    generate_cases(person_pool, section_map, major_ids)

    print("Generating hidden networks...")
    generate_networks(person_pool)

    print("🎉 All data generated successfully! Your dataset is ready for analytics.")
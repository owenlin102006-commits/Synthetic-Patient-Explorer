import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "synthetic_patients.db"


def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn



def init_db():
    with get_connection() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS patients (
            id TEXT PRIMARY KEY,
            birthdate TEXT,
            deathdate TEXT,
            ssn TEXT,
            first_name TEXT,
            last_name TEXT,
            gender TEXT,
            race TEXT,
            ethnicity TEXT,
            city TEXT,
            state TEXT
        );

        CREATE TABLE IF NOT EXISTS encounters (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            start TEXT,
            stop TEXT,
            organization TEXT,
            provider TEXT,
            encounter_class TEXT,
            code TEXT,
            description TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(id)
        );

        CREATE TABLE IF NOT EXISTS conditions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            encounter_id TEXT,
            start TEXT,
            stop TEXT,
            system TEXT,
            code TEXT,
            description TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(id),
            FOREIGN KEY (encounter_id) REFERENCES encounters(id)
        );

        CREATE INDEX IF NOT EXISTS idx_encounters_patient
            ON encounters(patient_id);

        CREATE INDEX IF NOT EXISTS idx_encounters_start
            ON encounters(start);

        CREATE INDEX IF NOT EXISTS idx_conditions_patient
            ON conditions(patient_id);

        CREATE INDEX IF NOT EXISTS idx_conditions_encounter
            ON conditions(encounter_id);
        
        -- B3：檢驗與觀察紀錄
        CREATE TABLE IF NOT EXISTS observations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            encounter_id TEXT,
            date TEXT,
            category TEXT,
            code TEXT,
            description TEXT,
            value TEXT,
            units TEXT,
            type TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(id),
            FOREIGN KEY (encounter_id) REFERENCES encounters(id)
        );

        -- B3：用藥紀錄
        CREATE TABLE IF NOT EXISTS medications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            encounter_id TEXT,
            start TEXT,
            stop TEXT,
            payer TEXT,
            code TEXT,
            description TEXT,
            base_cost TEXT,
            payer_coverage TEXT,
            dispenses TEXT,
            total_cost TEXT,
            reason_code TEXT,
            reason_description TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(id),
            FOREIGN KEY (encounter_id) REFERENCES encounters(id)
        );

        -- 加快病人詳細資料查詢
        CREATE INDEX IF NOT EXISTS idx_observations_patient
        ON observations(patient_id);

        CREATE INDEX IF NOT EXISTS idx_medications_patient
        ON medications(patient_id);

        """)

    print(f"SQLite 資料庫建立成功：{DB_PATH}")



if __name__ == "__main__":
    init_db()
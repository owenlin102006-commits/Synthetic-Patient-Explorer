
import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "synthetic_patients.db"
FHIR_DIR = BASE_DIR / "data" / "fhir"


def load_fhir_patients():
    patient_ids = set()
    json_count = 0

    for file_path in FHIR_DIR.glob("*.json"):
        json_count += 1

        with file_path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        if data.get("resourceType") == "Bundle":
            resources = [
                entry.get("resource", {})
                for entry in data.get("entry", [])
            ]
        else:
            resources = [data]

        for resource in resources:
            if resource.get("resourceType") == "Patient":
                patient_id = resource.get("id")

                if patient_id:
                    patient_ids.add(patient_id)

    return json_count, patient_ids


def load_sqlite_patients():
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            "SELECT id FROM patients"
        ).fetchall()

    return {row[0] for row in rows}


def main():
    if not FHIR_DIR.is_dir():
        raise FileNotFoundError(
            f"找不到 FHIR 資料夾：{FHIR_DIR}"
        )

    if not DB_PATH.is_file():
        raise FileNotFoundError(
            f"找不到 SQLite 資料庫：{DB_PATH}"
        )

    json_count, fhir_ids = load_fhir_patients()
    sql_ids = load_sqlite_patients()

    print("=== FHIR / SQLite Comparison ===")
    print(f"FHIR JSON files: {json_count}")
    print(f"FHIR Patient resources: {len(fhir_ids)}")
    print(f"SQLite patients: {len(sql_ids)}")
    print(f"Matching patient IDs: {len(fhir_ids & sql_ids)}")
    print(f"FHIR only: {len(fhir_ids - sql_ids)}")
    print(f"SQLite only: {len(sql_ids - fhir_ids)}")
    print(f"Exact match: {fhir_ids == sql_ids}")


if __name__ == "__main__":
    main()

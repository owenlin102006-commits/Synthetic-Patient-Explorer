
import csv
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "raw"
DB_PATH = BASE_DIR / "data" / "synthetic_patients.db"

TABLE_COLUMNS = {
    "patients": {
        "Id": "id",
        "BIRTHDATE": "birthdate",
        "DEATHDATE": "deathdate",
        "SSN": "ssn",
        "FIRST": "first_name",
        "LAST": "last_name",
        "GENDER": "gender",
        "RACE": "race",
        "ETHNICITY": "ethnicity",
        "CITY": "city",
        "STATE": "state",
    },
    "encounters": {
        "Id": "id",
        "PATIENT": "patient_id",
        "START": "start",
        "STOP": "stop",
        "ORGANIZATION": "organization",
        "PROVIDER": "provider",
        "ENCOUNTERCLASS": "encounter_class",
        "CODE": "code",
        "DESCRIPTION": "description",
    },
    "conditions": {
        "PATIENT": "patient_id",
        "ENCOUNTER": "encounter_id",
        "START": "start",
        "STOP": "stop",
        "SYSTEM": "system",
        "CODE": "code",
        "DESCRIPTION": "description",
    },
    "observations": {
        "PATIENT": "patient_id",
        "ENCOUNTER": "encounter_id",
        "DATE": "date",
        "CATEGORY": "category",
        "CODE": "code",
        "DESCRIPTION": "description",
        "VALUE": "value",
        "UNITS": "units",
        "TYPE": "type",
    },
    "medications": {
        "PATIENT": "patient_id",
        "ENCOUNTER": "encounter_id",
        "START": "start",
        "STOP": "stop",
        "PAYER": "payer",
        "CODE": "code",
        "DESCRIPTION": "description",
        "BASE_COST": "base_cost",
        "PAYER_COVERAGE": "payer_coverage",
        "DISPENSES": "dispenses",
        "TOTALCOST": "total_cost",
        "REASONCODE": "reason_code",
        "REASONDESCRIPTION": "reason_description",
    },
}

IMPORT_ORDER = (
    "patients",
    "encounters",
    "conditions",
    "observations",
    "medications",
)


def import_table(conn, table):
    file_path = DATA_DIR / f"{table}.csv"
    mapping = TABLE_COLUMNS[table]

    with file_path.open(
        "r", encoding="utf-8-sig", newline=""
    ) as file:
        reader = csv.DictReader(file)

        missing = set(mapping) - set(reader.fieldnames or [])
        if missing:
            raise ValueError(
                f"{table} 缺少必要欄位：{sorted(missing)}"
            )

        columns = list(mapping.values())
        names = ", ".join(columns)
        placeholders = ", ".join("?" for _ in columns)

        sql = (
            f"INSERT INTO {table} ({names}) "
            f"VALUES ({placeholders})"
        )

        rows = (
            tuple(row[source] or None for source in mapping)
            for row in reader
        )

        conn.executemany(sql, rows)

    count = conn.execute(
        f"SELECT COUNT(*) FROM {table}"
    ).fetchone()[0]

    print(f"{table}: {count} 筆")
    return count


def main():
    if not DB_PATH.is_file():
        raise FileNotFoundError(
            "找不到 SQLite 資料庫，請先執行 backend/database.py"
        )

    # 匯入前先確認五份 CSV 都存在
    for table in IMPORT_ORDER:
        file_path = DATA_DIR / f"{table}.csv"
        if not file_path.is_file():
            raise FileNotFoundError(
                f"找不到 CSV 檔案：{file_path}"
            )

    conn = sqlite3.connect(DB_PATH)

    try:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("BEGIN")

        # 先刪除子表，再刪除父表
        # 所有刪除及匯入都在同一筆交易內
        for table in reversed(IMPORT_ORDER):
            conn.execute(f"DELETE FROM {table}")

        # 先匯入病人與就診，再匯入相關紀錄
        for table in IMPORT_ORDER:
            import_table(conn, table)

        errors = conn.execute(
            "PRAGMA foreign_key_check"
        ).fetchall()

        if errors:
            raise ValueError(
                f"外鍵檢查失敗：{len(errors)} 筆"
            )

        conn.commit()
        print("匯入完成，外鍵檢查通過！")

    except Exception:
        conn.rollback()
        print("匯入失敗，已回滾本次交易。")
        raise

    finally:
        conn.close()


if __name__ == "__main__":
    main()

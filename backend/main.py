
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import get_connection
from datetime import date
from typing import Literal
from fastapi import Query

app = FastAPI(
    title="Synthetic Patient Explorer",
    description="Synthea 合成病人資料庫查詢 API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Synthetic Patient Explorer API",
        "status": "running"
    }


@app.get("/api/cities")
def get_cities():
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT DISTINCT city
            FROM patients
            WHERE city IS NOT NULL AND TRIM(city) <> ''
            ORDER BY city
        """).fetchall()
        return [city for (city,) in rows]
    finally:
        conn.close()


@app.get("/api/patients")
def get_patients(
    gender: Literal["M", "F"] | None = None,
    min_age: int | None = Query(default=None, ge=0, le=130),
    max_age: int | None = Query(default=None, ge=0, le=130),
    city: str | None = None,
):
    if (
        min_age is not None
        and max_age is not None
        and min_age > max_age
    ):
        from fastapi import HTTPException
        raise HTTPException(
            status_code=422,
            detail="最小年齡不能大於最大年齡"
        )

    conn = get_connection()
    conn.row_factory = __import__("sqlite3").Row

    try:
        rows = conn.execute("""
            SELECT
                id,
                first_name,
                last_name,
                gender,
                birthdate,
                city,
                state
            FROM patients
            WHERE (? IS NULL OR city = ?)
            ORDER BY last_name, first_name
        """, (city or None, city)).fetchall()

        today = date.today()
        patients = []

        for row in rows:
            patient = dict(row)

            try:
                birthday = date.fromisoformat(
                    patient["birthdate"]
                )
                age = today.year - birthday.year - (
                    (today.month, today.day)
                    < (birthday.month, birthday.day)
                )
            except (ValueError, TypeError):
                age = None

            patient["age"] = age

            if gender is not None and patient["gender"] != gender:
                continue

            if min_age is not None:
                if age is None or age < min_age:
                    continue

            if max_age is not None:
                if age is None or age > max_age:
                    continue

            patients.append(patient)

        return {
            "total": len(patients),
            "patients": patients
        }

    finally:
        conn.close()


@app.get("/api/patients/{patient_id}")
def get_patient_detail(patient_id: str):
    import sqlite3
    from fastapi import HTTPException

    conn = get_connection()
    conn.row_factory = sqlite3.Row

    try:
        # 查詢病人基本資料
        patient = conn.execute("""
            SELECT
                id,
                first_name,
                last_name,
                gender,
                birthdate,
                deathdate,
                race,
                ethnicity,
                city,
                state
            FROM patients
            WHERE id = ?
        """, (patient_id,)).fetchone()

        if patient is None:
            raise HTTPException(
                status_code=404,
                detail="找不到此病人"
            )

        # 查詢就診紀錄
        encounters = conn.execute("""
            SELECT
                id,
                start,
                stop,
                encounter_class,
                code,
                description
            FROM encounters
            WHERE patient_id = ?
            ORDER BY start DESC
        """, (patient_id,)).fetchall()

        # 查詢診斷紀錄
        conditions = conn.execute("""
            SELECT
                id,
                encounter_id,
                start,
                stop,
                system,
                code,
                description
            FROM conditions
            WHERE patient_id = ?
            ORDER BY start DESC
        """, (patient_id,)).fetchall()

        # B3：查詢檢驗與觀察紀錄
        observations = conn.execute("""
            SELECT
                id,
                encounter_id,
                date,
                category,
                code,
                description,
                value,
                units,
                type
            FROM observations
            WHERE patient_id = ?
            ORDER BY date DESC
        """, (patient_id,)).fetchall()

        # B3：查詢用藥紀錄
        medications = conn.execute("""
            SELECT
                id,
                encounter_id,
                start,
                stop,
                code,
                description,
                dispenses
            FROM medications
            WHERE patient_id = ?
            ORDER BY start DESC
        """, (patient_id,)).fetchall()

        # 將診斷依照就診 ID 分組
        conditions_by_encounter = {}

        for condition in conditions:
            condition_data = dict(condition)
            encounter_id = condition_data["encounter_id"]

            if encounter_id not in conditions_by_encounter:
                conditions_by_encounter[encounter_id] = []

            conditions_by_encounter[encounter_id].append(
                condition_data
            )

        # 每次就診附上相關診斷
        encounter_list = []

        for encounter in encounters:
            encounter_data = dict(encounter)

            encounter_data["conditions"] = (
                conditions_by_encounter.get(
                    encounter_data["id"], []
                )
            )

            encounter_list.append(encounter_data)

       
        return {
            "patient": dict(patient),
            "encounters": encounter_list,
            "conditions": [dict(c) for c in conditions],
            "observations": [dict(o) for o in observations],
            "medications": [dict(m) for m in medications],
            "encounter_count": len(encounter_list),
            "condition_count": len(conditions),
            "observation_count": len(observations),
            "medication_count": len(medications)
        }


    finally:
        conn.close()


const API_BASE = "http://127.0.0.1:8000/api/patients";

const translations = {
    zh: {
        detailTitle: "病人詳細資料",
        back: "← 返回病人清單",
        basicInfo: "基本資料",
        sectionNav: "目錄",
        encounterHistory: "就診時間軸",
        name: "姓名",
        gender: "性別",
        male: "男性",
        female: "女性",
        birthdate: "出生日期",
        deathdate: "死亡日期",
        city: "城市",
        state: "州／地區",
        race: "種族",
        ethnicity: "族裔",
        encounterType: "就診類型",
        encounterSort: "日期排序",
        newestFirst: "由新到舊",
        oldestFirst: "由舊到新",
        allEncounterTypes: "全部類型",
        filteredEncounterCount: "顯示 {shown} 筆，共 {count} 筆就診紀錄",
        noMatchingEncounters: "沒有符合此類型的就診紀錄",
        diagnosis: "相關診斷",
        noDiagnosis: "本次就診無關聯診斷紀錄",
        encounterCount: "共 {count} 筆就診紀錄",
        noEncounters: "沒有就診紀錄",
        loading: "正在載入資料...",
        error: "資料載入失敗，請確認後端服務已啟動",
        notFound: "找不到指定的病人",
        missingId: "網址缺少病人 ID",
        observationsTitle: "檢驗與觀察紀錄",
        medicationsTitle: "用藥紀錄",
        date: "日期",
        observationName: "項目",
        description: "描述",
        value: "數值",
        unit: "單位",
        startDate: "開始日期",
        endDate: "結束日期",
        medicationName: "藥品名稱",
        dispenses: "領藥次數",
        observationCount: "共 {count} 筆紀錄，顯示最新 {shown} 筆",
        medicationCount: "共 {count} 筆紀錄，顯示最新 {shown} 筆",
        noObservations: "沒有檢驗或觀察紀錄",
        noMedications: "沒有用藥紀錄",
        unknown: "未提供"
    },
    en: {
        detailTitle: "Patient Details",
        back: "← Back to Patient List",
        basicInfo: "Basic Information",
        sectionNav: "Contents",
        encounterHistory: "Encounter Timeline",
        name: "Name",
        gender: "Gender",
        male: "Male",
        female: "Female",
        birthdate: "Date of Birth",
        deathdate: "Date of Death",
        city: "City",
        state: "State / Region",
        race: "Race",
        ethnicity: "Ethnicity",
        encounterType: "Encounter Type",
        encounterSort: "Date Order",
        newestFirst: "Newest First",
        oldestFirst: "Oldest First",
        allEncounterTypes: "All Types",
        filteredEncounterCount: "Showing {shown} of {count} encounter records",
        noMatchingEncounters: "No encounters match this type",
        diagnosis: "Related Diagnoses",
        noDiagnosis: "No diagnoses linked to this encounter",
        encounterCount: "{count} encounter records",
        noEncounters: "No encounter records",
        loading: "Loading data...",
        error: "Failed to load data. Check the backend service.",
        notFound: "Patient not found",
        missingId: "Missing patient ID in URL",
        observationsTitle: "Laboratory & Observation Records",
        medicationsTitle: "Medication Records",
        date: "Date",
        observationName: "Observation",
        description: "Description",
        value: "Value",
        unit: "Unit",
        startDate: "Start Date",
        endDate: "End Date",
        medicationName: "Medication",
        dispenses: "Dispenses",
        observationCount: "{count} records, showing latest {shown}",
        medicationCount: "{count} records, showing latest {shown}",
        noObservations: "No observation records",
        noMedications: "No medication records",
        unknown: "Not available"
    }
};

let currentLanguage =
    localStorage.getItem("language") === "en" ? "en" : "zh";

let patientData = null;
let errorKey = "";

const encounterSort = document.getElementById("encounterSort");
const encounterType = document.getElementById("encounterType");
const encounterTypeLabels = {
    ambulatory: ["門診照護", "Ambulatory"],
    wellness: ["健康檢查", "Wellness"],
    outpatient: ["門診就診", "Outpatient"],
    emergency: ["急診", "Emergency"],
    urgentcare: ["緊急照護", "Urgent Care"],
    inpatient: ["住院", "Inpatient"],
    hospice: ["安寧照護", "Hospice"],
    virtual: ["遠距看診", "Virtual"],
    snf: ["專業護理機構", "Skilled Nursing Facility"],
    home: ["居家照護", "Home"]
};

function t(key) {
    return translations[currentLanguage][key] || key;
}

function formatDate(value) {
    if (!value) return t("unknown");
    return String(value).replace("T", " ").slice(0, 19);
}

function addInfo(container, label, value) {
    const item = document.createElement("div");
    item.className = "info-item";

    const heading = document.createElement("strong");
    heading.textContent = label;

    const content = document.createElement("span");
    content.textContent = value || t("unknown");

    item.append(heading, content);
    container.appendChild(item);
}

function renderPatientInfo() {
    const container = document.getElementById("patientInfo");
    container.replaceChildren();

    if (errorKey) {
        container.textContent = t(errorKey);
        return;
    }

    if (!patientData) {
        container.textContent = t("loading");
        return;
    }

    const patient = patientData.patient;
    const grid = document.createElement("div");
    grid.className = "patient-info-grid";

    const name =
        `${patient.first_name || ""} ${patient.last_name || ""}`.trim();

    const gender =
        patient.gender === "M" ? t("male") :
        patient.gender === "F" ? t("female") :
        t("unknown");

    addInfo(grid, t("name"), name);
    addInfo(grid, t("gender"), gender);
    addInfo(grid, t("birthdate"), formatDate(patient.birthdate));
    addInfo(grid, t("deathdate"),
        patient.deathdate ? formatDate(patient.deathdate) : t("unknown"));
    addInfo(grid, t("city"), patient.city);
    addInfo(grid, t("state"), patient.state);
    addInfo(grid, t("race"), patient.race);
    addInfo(grid, t("ethnicity"), patient.ethnicity);

    container.appendChild(grid);
}

function encounterTypeLabel(type) {
    if (!type) return t("unknown");
    if (!Object.hasOwn(encounterTypeLabels, type)) return type;
    return encounterTypeLabels[type][currentLanguage === "en" ? 1 : 0];
}

function updateEncounterControls() {
    const encounters = patientData?.encounters || [];
    const selectedType = encounterType.value;
    const types = new Set(encounters.map(encounter => encounter.encounter_class).filter(Boolean));
    const options = [...types].map(value => new Option(encounterTypeLabel(value), value));
    options.sort((a, b) => a.text.localeCompare(b.text, document.documentElement.lang));

    encounterType.replaceChildren(new Option(t("allEncounterTypes"), ""), ...options);
    encounterType.value = types.has(selectedType) ? selectedType : "";
    encounterType.disabled = types.size === 0;
    encounterSort.disabled = encounters.length === 0;
}

function renderEncounters() {
    const timeline = document.getElementById("encounterTimeline");
    const count = document.getElementById("encounterCount");

    timeline.replaceChildren();

    if (errorKey || !patientData) {
        count.textContent = "";
        return;
    }

    const allEncounters = patientData.encounters || [];
    const selectedType = encounterType.value;
    const encounters = allEncounters.filter(encounter =>
        !selectedType || encounter.encounter_class === selectedType
    );
    const direction = encounterSort.value === "oldest" ? 1 : -1;
    encounters.sort((a, b) => {
        const aTime = Date.parse(a.start);
        const bTime = Date.parse(b.start);

        if (Number.isNaN(aTime)) return Number.isNaN(bTime) ? 0 : 1;
        if (Number.isNaN(bTime)) return -1;
        return direction * (aTime - bTime);
    });

    count.textContent = t(selectedType ? "filteredEncounterCount" : "encounterCount")
        .replace("{count}", allEncounters.length)
        .replace("{shown}", encounters.length);

    if (encounters.length === 0) {
        timeline.textContent = t(selectedType ? "noMatchingEncounters" : "noEncounters");
        return;
    }

    encounters.forEach(encounter => {
        const card = document.createElement("article");
        card.className = "encounter-card";

        const date = document.createElement("h3");
        date.textContent = formatDate(encounter.start);

        const type = document.createElement("p");
        type.textContent =
            `${t("encounterType")}：${encounterTypeLabel(encounter.encounter_class)}`;

        const description = document.createElement("p");
        description.textContent =
            encounter.description || t("unknown");

        const diagnosisTitle = document.createElement("strong");
        diagnosisTitle.textContent = t("diagnosis");

        const diagnosisList = document.createElement("ul");
        const conditions = encounter.conditions || [];

        if (conditions.length === 0) {
            const item = document.createElement("li");
            item.textContent = t("noDiagnosis");
            diagnosisList.appendChild(item);
        } else {
            conditions.forEach(condition => {
                const item = document.createElement("li");
                item.textContent =
                    `${condition.description || t("unknown")} (${condition.code || "—"})`;
                diagnosisList.appendChild(item);
            });
        }

        card.append(date, type, description, diagnosisTitle, diagnosisList);
        timeline.appendChild(card);
    });
}

const RECORD_LIMIT = 20;

// 建立表格儲存格
function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent =
        value === null || value === undefined || value === ""
            ? "—"
            : String(value);
    return cell;
}

// 顯示檢驗與觀察紀錄
function renderObservations() {
    const tbody = document.getElementById("observationTableBody");
    const countElement = document.getElementById("observationCount");

    tbody.replaceChildren();

    if (errorKey) {
        countElement.textContent = t(errorKey);
        return;
    }

    if (!patientData) {
        countElement.textContent = t("loading");
        return;
    }

    const observations = patientData.observations || [];
    const shown = observations.slice(0, RECORD_LIMIT);

    countElement.textContent = t("observationCount")
        .replace("{count}", observations.length)
        .replace("{shown}", shown.length);

    if (observations.length === 0) {
        const row = document.createElement("tr");
        const cell = createCell(t("noObservations"));
        cell.colSpan = 4;
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    shown.forEach(observation => {
        const row = document.createElement("tr");

        row.append(
            createCell(formatDate(observation.date)),
            createCell(observation.description),
            createCell(observation.value),
            createCell(observation.units)
        );

        tbody.appendChild(row);
    });
}

// 顯示用藥紀錄
function renderMedications() {
    const tbody = document.getElementById("medicationTableBody");
    const countElement = document.getElementById("medicationCount");

    tbody.replaceChildren();

    if (errorKey) {
        countElement.textContent = t(errorKey);
        return;
    }

    if (!patientData) {
        countElement.textContent = t("loading");
        return;
    }

    const medications = patientData.medications || [];
    const shown = medications.slice(0, RECORD_LIMIT);

    countElement.textContent = t("medicationCount")
        .replace("{count}", medications.length)
        .replace("{shown}", shown.length);

    if (medications.length === 0) {
        const row = document.createElement("tr");
        const cell = createCell(t("noMedications"));
        cell.colSpan = 4;
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    shown.forEach(medication => {
        const row = document.createElement("tr");

        row.append(
            createCell(formatDate(medication.start)),
            createCell(
                medication.stop
                    ? formatDate(medication.stop)
                    : "—"
            ),
            createCell(medication.description),
            createCell(medication.dispenses)
        );

        tbody.appendChild(row);
    });
}

function updateLanguage() {
    document.documentElement.lang =
        currentLanguage === "zh" ? "zh-Hant" : "en";

    document.querySelectorAll("[data-i18n]").forEach(element => {
        const key = element.dataset.i18n;
        // 舊版詳細頁使用的表頭鍵名。
        const translationKey = key === "units" ? "unit" :
            key === "stopDate" ? "endDate" : key;
        const labels = translations[currentLanguage];
        if (Object.hasOwn(labels, translationKey)) {
            element.textContent = labels[translationKey];
        }
    });

    document.getElementById("languageBtn").textContent =
        currentLanguage === "zh" ? "English" : "中文";

    renderPatientInfo();
    updateEncounterControls();
    renderEncounters();
    renderObservations();
    renderMedications();
}

async function loadPatient() {
    const params = new URLSearchParams(window.location.search);
    const patientId = params.get("id");

    if (!patientId) {
        errorKey = "missingId";
        updateLanguage();
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/${encodeURIComponent(patientId)}`
        );

        if (response.status === 404) {
            errorKey = "notFound";
            updateLanguage();
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        patientData = await response.json();
        errorKey = "";

    } catch (error) {
        console.error("Patient API Error:", error);
        errorKey = "error";
    }

    updateLanguage();
}

document.getElementById("languageBtn").addEventListener(
    "click",
    () => {
        currentLanguage =
            currentLanguage === "zh" ? "en" : "zh";

        localStorage.setItem("language", currentLanguage);
        updateLanguage();
    }
);

encounterSort.addEventListener("change", renderEncounters);
encounterType.addEventListener("change", renderEncounters);

const detailNav = document.getElementById("detailNav");
const detailNavSummary = detailNav.querySelector("summary");

detailNav.addEventListener("pointerenter", event => {
    if (event.pointerType === "mouse") detailNav.open = true;
});
detailNav.addEventListener("pointerleave", event => {
    if (event.pointerType === "mouse" && !detailNav.contains(document.activeElement)) {
        detailNav.open = false;
    }
});
detailNav.addEventListener("keydown", event => {
    if (event.key === "Escape" && detailNav.open) {
        event.preventDefault();
        detailNav.open = false;
        detailNavSummary.focus({ preventScroll: true });
    }
});
detailNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
        detailNav.open = false;
    });
});

updateLanguage();
loadPatient();

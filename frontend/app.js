
const API_URL = "http://127.0.0.1:8000/api/patients";

// 中英文翻譯字典
const translations = {
    zh: {
        title: "合成病人資料查詢系統",
        subtitle: "Synthetic Patient Explorer",
        filters: "病人篩選",
        gender: "性別",
        all: "全部",
        male: "男性",
        female: "女性",
        minAge: "最小年齡",
        maxAge: "最大年齡",
        search: "查詢病人",
        patientList: "病人清單",
        name: "姓名",
        age: "年齡",
        city: "城市",
        action: "操作",
        details: "查看詳細資料",
        result: "查詢結果：{count} 位病人",
        loading: "正在載入病人資料...",
        empty: "找不到符合條件的病人",
        error: "無法取得資料，請確認 FastAPI 已啟動",
        invalidAge: "最小年齡不能大於最大年齡",
        statistics: "病人統計分析",
        genderChart: "病人性別分布"
    },
    en: {
        title: "Synthetic Patient Explorer",
        subtitle: "Synthetic Patient Database",
        filters: "Patient Filters",
        gender: "Gender",
        all: "All",
        male: "Male",
        female: "Female",
        minAge: "Minimum Age",
        maxAge: "Maximum Age",
        search: "Search Patients",
        patientList: "Patient List",
        name: "Name",
        age: "Age",
        city: "City",
        action: "Action",
        details: "View Details",
        result: "Results: {count} patients",
        loading: "Loading patient records...",
        empty: "No matching patients found",
        error: "Unable to load data. Check that FastAPI is running.",
        invalidAge: "Minimum age cannot exceed maximum age",
        statistics: "Patient Statistics",
        genderChart: "Gender Distribution"
    }
};

// 記住使用者選擇的語言
let currentLanguage = localStorage.getItem("language") === "en"
    ? "en"
    : "zh";

let currentPatients = [];
let currentError = "";
let isLoading = false;

function translate(key) {
    return translations[currentLanguage][key] || key;
}

// 切換中英文
function updateLanguage() {
    document.documentElement.lang =
        currentLanguage === "zh" ? "zh-Hant" : "en";

    document.querySelectorAll("[data-i18n]").forEach(element => {
        const key = element.dataset.i18n;
        element.textContent = translate(key);
    });

    document.getElementById("languageBtn").textContent =
        currentLanguage === "zh" ? "English" : "中文";

    renderPatients();
}

function renderGenderChart() {
    const maleCount = currentPatients.filter(
        patient => patient.gender === "M"
    ).length;

    const femaleCount = currentPatients.filter(
        patient => patient.gender === "F"
    ).length;

    const total = currentPatients.length;

    const malePercent = total > 0
        ? (maleCount / total) * 100
        : 0;

    const femalePercent = total > 0
        ? (femaleCount / total) * 100
        : 0;

    document.getElementById("maleLabel").textContent =
        translate("male");

    document.getElementById("femaleLabel").textContent =
        translate("female");

    document.getElementById("maleCount").textContent =
        `${maleCount} (${malePercent.toFixed(1)}%)`;

    document.getElementById("femaleCount").textContent =
        `${femaleCount} (${femalePercent.toFixed(1)}%)`;

    document.getElementById("maleBar").style.width =
        `${malePercent}%`;

    document.getElementById("femaleBar").style.width =
        `${femalePercent}%`;
}

// 將病人資料顯示在表格中
function renderPatients() {
    renderGenderChart();
    const tbody = document.getElementById("patientTableBody");
    const resultCount = document.getElementById("resultCount");

    tbody.replaceChildren();

    if (isLoading) {
        resultCount.textContent = translate("loading");
        return;
    }

    if (currentError) {
        resultCount.textContent = translate("error");
        return;
    }

    resultCount.textContent = translate("result").replace(
        "{count}",
        currentPatients.length
    );

    if (currentPatients.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = translate("empty");

        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    currentPatients.forEach(patient => {
        const row = document.createElement("tr");

        const name = document.createElement("td");
        name.textContent =
            `${patient.first_name || ""} ${patient.last_name || ""}`.trim();

        const gender = document.createElement("td");
        gender.textContent =
            patient.gender === "M" ? translate("male") :
            patient.gender === "F" ? translate("female") : "—";

        const age = document.createElement("td");
        age.textContent = patient.age ?? "—";

        const city = document.createElement("td");
        city.textContent = patient.city || "—";

        const action = document.createElement("td");
        const link = document.createElement("a");

        link.href =
            `patient.html?id=${encodeURIComponent(patient.id)}`;
        link.textContent = translate("details");

        action.appendChild(link);

        row.append(name, gender, age, city, action);
        tbody.appendChild(row);
    });
}

// 從 FastAPI 查詢病人
async function fetchPatients() {
    const gender = document.getElementById("gender").value;
    const minAge = document.getElementById("minAge").value;
    const maxAge = document.getElementById("maxAge").value;

    if (
        minAge !== "" &&
        maxAge !== "" &&
        Number(minAge) > Number(maxAge)
    ) {
        alert(translate("invalidAge"));
        return;
    }

    const params = new URLSearchParams();

    if (gender) params.set("gender", gender);
    if (minAge !== "") params.set("min_age", minAge);
    if (maxAge !== "") params.set("max_age", maxAge);

    isLoading = true;
    currentError = "";
    renderPatients();

    try {
        const response = await fetch(
            `${API_URL}?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        currentPatients = data.patients;
    } catch (error) {
        console.error("API Error:", error);
        currentPatients = [];
        currentError = error.message;
    } finally {
        isLoading = false;
        renderPatients();
    }
}

// 查詢按鈕
document.getElementById("filterForm").addEventListener(
    "submit",
    event => {
        event.preventDefault();
        fetchPatients();
    }
);

// 語言切換按鈕
document.getElementById("languageBtn").addEventListener(
    "click",
    () => {
        currentLanguage =
            currentLanguage === "zh" ? "en" : "zh";

        localStorage.setItem("language", currentLanguage);
        updateLanguage();
    }
);

// 初次載入網頁
updateLanguage();
fetchPatients();

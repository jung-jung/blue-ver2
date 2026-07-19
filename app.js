const PASSWORD = "0909";
const STORAGE_KEY = "blue-ver2-state";

const metricDefs = [
  { key: "weight", label: "체중", unit: "kg", color: "#60a5fa" },
  { key: "muscle", label: "골격근", unit: "kg", color: "#a78bfa" },
  { key: "fat", label: "체지방", unit: "%", color: "#fbbf24" },
  { key: "water", label: "체수분", unit: "L", color: "#67e8f9" },
  { key: "bmr", label: "기초대사량", unit: "kcal", color: "#6ee7b7" }
];

const habitColors = ["#60a5fa", "#f0a0a0", "#6ee7b7", "#fbbf24", "#a78bfa"];
const today = new Date();
const todayKey = toDateKey(today);
const todayLabel = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long"
}).format(today);

const app = document.querySelector("#app");
let view = "pin";
let activeTab = "today";
let pin = "";
let pinError = "";
let selectedMetric = "weight";
let selectedChartPoint = null;
let monthCursor = new Date(today.getFullYear(), today.getMonth(), 1);
let habitPeriodMode = "month";
let editingHabitId = null;
let state = loadState();

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return normalizeState(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  return normalizeState({});
}

function normalizeState(source) {
  const defaultHabits = [
    { id: "water", name: "물 2L 마시기", color: habitColors[0] },
    { id: "protein", name: "단백질 챙기기", color: habitColors[1] },
    { id: "walk", name: "20분 걷기", color: habitColors[2] },
    { id: "night", name: "야식 안 먹기", color: habitColors[3] }
  ];
  const base = {
    unlocked: false,
    metrics: seedMetrics(),
    habits: defaultHabits,
    habitLogs: seedHabitLogs(defaultHabits)
  };
  const next = { ...base, ...source };
  next.metrics = Array.isArray(next.metrics) && next.metrics.length ? next.metrics : base.metrics;
  next.metrics = backfillMetricHistory(next.metrics);
  next.habits = Array.isArray(next.habits) && next.habits.length ? next.habits : base.habits;
  next.habitLogs = next.habitLogs && typeof next.habitLogs === "object" ? next.habitLogs : {};
  for (const habit of next.habits) {
    if (!next.habitLogs[habit.id]) next.habitLogs[habit.id] = {};
  }
  return next;
}

function backfillMetricHistory(metrics) {
  const existingDates = new Set(metrics.map((entry) => entry.date));
  const history = [
    [59.8, 23.6, 19.7, 32.6, 1290],
    [59.5, 23.7, 19.4, 32.7, 1294],
    [59.2, 23.8, 19.2, 32.8, 1301],
    [59.0, 23.9, 19.0, 32.9, 1307]
  ].map((v, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (metrics.length + historyOffset(index)));
    return {
      date: toDateKey(date),
      weight: v[0],
      muscle: v[1],
      fat: v[2],
      water: v[3],
      bmr: v[4]
    };
  }).filter((entry) => !existingDates.has(entry.date));
  return history.concat(metrics).sort((a, b) => a.date.localeCompare(b.date));
}

function historyOffset(index) {
  return 4 - index;
}

function seedMetrics() {
  const values = [
    [58.9, 24.0, 18.9, 33.0, 1310],
    [58.7, 24.0, 18.8, 33.1, 1314],
    [58.6, 24.1, 18.8, 33.0, 1315],
    [58.4, 24.1, 18.6, 33.2, 1320]
  ];
  return values.map((v, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (values.length - 1 - index));
    return {
      date: toDateKey(date),
      weight: v[0],
      muscle: v[1],
      fat: v[2],
      water: v[3],
      bmr: v[4]
    };
  });
}

function seedHabitLogs(habits) {
  const logs = {};
  const patterns = {
    water: [1, 1, 0, 0, 1, 1, 0],
    protein: [1, 0, 1, 1, 0, 0, 0],
    walk: [1, 0, 0, 0, 1, 1, 0],
    night: [0, 1, 1, 0, 1, 0, 1]
  };
  for (const habit of habits) {
    logs[habit.id] = {};
    for (let i = 0; i < 35; i += 1) {
      const date = new Date(today.getFullYear(), today.getMonth(), 1 + i);
      if (date.getMonth() !== today.getMonth()) continue;
      logs[habit.id][toDateKey(date)] = Boolean(patterns[habit.id]?.[i % 7]);
    }
  }
  logs.water[todayKey] = true;
  logs.protein[todayKey] = true;
  logs.walk[todayKey] = false;
  logs.night[todayKey] = false;
  return logs;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function lastMetric() {
  return [...state.metrics].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
}

function metricForDate(dateKey) {
  return state.metrics.find((entry) => entry.date === dateKey);
}

function todayDoneCount() {
  return state.habits.filter((habit) => state.habitLogs[habit.id]?.[todayKey]).length;
}

function setView(next) {
  view = next;
  render();
}

function setTab(next) {
  activeTab = next;
  view = "app";
  render();
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function monthLabel(date) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(date);
}

function yearLabel(date) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric" }).format(date);
}

function monthDateKey(day) {
  return toDateKey(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day));
}

function yearDate(day) {
  return new Date(monthCursor.getFullYear(), 0, day);
}

function completionForHabit(habit, date = monthCursor) {
  const total = daysInMonth(date);
  let done = 0;
  for (let day = 1; day <= total; day += 1) {
    const key = toDateKey(new Date(date.getFullYear(), date.getMonth(), day));
    if (state.habitLogs[habit.id]?.[key]) done += 1;
  }
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

function completionForHabitYear(habit, date = monthCursor) {
  const year = date.getFullYear();
  const total = daysInYear(year);
  let done = 0;
  for (let day = 1; day <= total; day += 1) {
    const key = toDateKey(yearDate(day));
    if (state.habitLogs[habit.id]?.[key]) done += 1;
  }
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

function daysInYear(year) {
  return Math.round((new Date(year + 1, 0, 1) - new Date(year, 0, 1)) / 86400000);
}

function render(options = {}) {
  const previousContent = app.querySelector(".content");
  const previousChart = app.querySelector("[data-chart-scroller]");
  const previousScrollTop = options.preserveScroll && previousContent ? previousContent.scrollTop : null;
  const previousChartScrollLeft = options.preserveChartScroll && previousChart ? previousChart.scrollLeft : null;
  app.innerHTML = `
    <div class="stage">
      <section class="phone ${view === "app" ? "with-nav" : ""}">
        ${statusBar()}
        ${view === "pin" ? pinScreen() : ""}
        ${view === "pinError" ? pinErrorScreen() : ""}
        ${view !== "pin" && view !== "pinError" ? appScreen() : ""}
        ${editingHabitId ? habitModal() : ""}
      </section>
    </div>
  `;
  bindEvents();
  if (previousScrollTop !== null) {
    const nextContent = app.querySelector(".content");
    if (nextContent) nextContent.scrollTop = previousScrollTop;
  }
  if (previousChartScrollLeft !== null) {
    const nextChart = app.querySelector("[data-chart-scroller]");
    if (nextChart) nextChart.scrollLeft = previousChartScrollLeft;
  }
  if (activeTab === "stats" && view === "app") {
    app.querySelectorAll(".chart-scroller").forEach((scroller) => {
      if (previousChartScrollLeft === null) scroller.scrollLeft = scroller.scrollWidth;
    });
  }
}

function statusBar() {
  return `
    <div class="status-bar">
      <span>9:41</span>
      <span class="status-icons" aria-hidden="true">
        <span class="signal"><span></span><span></span><span></span><span></span></span>
        <span class="wifi">⌁</span>
        <span class="battery"></span>
      </span>
    </div>
  `;
}

function pinScreen() {
  const keys = [
    ["1", ""], ["2", "ABC"], ["3", "DEF"],
    ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
    ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
    ["", ""], ["0", ""], ["back", ""]
  ];
  return `
    <div class="screen">
      <div class="pin-content">
        <div class="pin-title">
          <div class="logo-box">B</div>
          <div>
            <h1>Blue에 들어가기</h1>
            <p>비밀번호로 몸 상태와 습관 기록을 보호하세요.</p>
          </div>
        </div>
        <div class="pin-dots" aria-label="비밀번호 ${pin.length}자리 입력됨">
          ${[0, 1, 2, 3].map((i) => `<span class="pin-dot ${i < pin.length ? "filled" : ""}"></span>`).join("")}
        </div>
        <p class="pin-error pin-error-top" role="status">${pinError}</p>
        <div class="numpad">
          ${keys.map(([num, sub]) => {
            if (!num) return `<button class="key blank" tabindex="-1"></button>`;
            const label = num === "back" ? "⌫" : num;
            return `<button class="key" data-pin-key="${num}" aria-label="${label}">${label}${sub ? `<small>${sub}</small>` : ""}</button>`;
          }).join("")}
        </div>
      </div>
    </div>
  `;
}

function pinErrorScreen() {
  return `
    <div class="screen pin-error-screen">
      ${pinScreen().replace('<div class="screen">', '<div class="pin-error-base">').replace(/<\/div>\s*$/, '</div>')}
      <div class="error-scrim" aria-hidden="true"></div>
      <section class="error-card" role="alert" aria-labelledby="pin-error-title">
        <div class="error-icon">!</div>
        <div class="error-copy">
          <h2 id="pin-error-title">잘못된 비밀번호입니다</h2>
          <p>다시 입력해주세요.</p>
        </div>
        <button class="error-confirm" data-action="pin-error-confirm">확인</button>
      </section>
    </div>
  `;
}

function appScreen() {
  if (view === "bodyInput") {
    return `
      <div class="screen">
        <div class="content">
          ${bodyInputScreen()}
        </div>
      </div>
    `;
  }

  return `
    <div class="screen with-nav">
      <div class="content">
        ${activeTab === "today" ? todayScreen() : ""}
        ${activeTab === "habits" ? habitsScreen() : ""}
        ${activeTab === "stats" ? statsScreen() : ""}
      </div>
      ${activeTab ? bottomNav() : ""}
    </div>
  `;
}

function todayScreen() {
  const metric = lastMetric();
  return `
    <header class="header">
      <h1>오늘</h1>
      <p class="date">${todayLabel}</p>
    </header>
    <section class="card">
      <div class="card-head">
        <h2>마지막 기록 분석</h2>
        <span class="badge neutral">마지막 기록: ${formatShortDate(metric.date)}</span>
      </div>
      ${metricGrid(metric)}
      <p class="trend"><span class="trend-icon">↘</span><span>어제보다 체중 ${weightDiffText()}</span></p>
    </section>
    <button class="primary-button" data-action="body-input">오늘 몸 상태 기록하기 →</button>
    <section class="card">
      <div class="card-head">
        <h2>오늘 시행할 습관</h2>
        <span class="badge">${todayDoneCount()}/${state.habits.length} 완료</span>
      </div>
      <div class="habit-list">
        ${state.habits.map((habit) => todayHabitRow(habit)).join("")}
      </div>
    </section>
  `;
}

function metricGrid(metric) {
  return `
    <div class="metric-grid">
      ${metricDefs.map((def, index) => `
        <article class="metric-chip ${index > 2 ? "wide" : ""}" style="--metric-color: ${def.color}">
          <p class="metric-label"><span class="accent"></span>${def.label}</p>
          <p class="metric-value"><strong>${metric?.[def.key] ?? "-"}</strong><span>${def.unit}</span></p>
        </article>
      `).join("")}
    </div>
  `;
}

function weightDiffText() {
  if (state.metrics.length < 2) return "기록이 더 필요합니다";
  const sorted = [...state.metrics].sort((a, b) => a.date.localeCompare(b.date));
  const diff = Number(sorted.at(-1).weight) - Number(sorted.at(-2).weight);
  if (Number.isNaN(diff) || diff === 0) return "변화가 없습니다";
  return `${Math.abs(diff).toFixed(1)}kg ${diff < 0 ? "감소했습니다" : "증가했습니다"}`;
}

function todayHabitRow(habit) {
  const done = Boolean(state.habitLogs[habit.id]?.[todayKey]);
  return `
    <button class="today-habit ${done ? "done" : ""}" data-toggle-today="${habit.id}">
      <span>${habit.name}</span>
      <span class="check">${done ? "✓" : ""}</span>
    </button>
  `;
}

function bodyInputScreen() {
  const previous = lastMetric();
  const current = metricForDate(todayKey) || previous;
  return `
    <header class="header">
      <button class="back-button" data-action="back-today">‹ <span>오늘의 몸 상태 기록</span></button>
      <p class="date">${todayLabel}</p>
    </header>
    <form class="form" data-body-form>
      ${metricDefs.map((def) => `
        <div class="input-row">
          <label for="${def.key}">${def.label}<span>이전 ${previous?.[def.key] ?? "-"}</span></label>
          <div class="field-wrap">
            <input id="${def.key}" name="${def.key}" inputmode="decimal" autocomplete="off" value="${current?.[def.key] ?? ""}" />
            <span class="unit">${def.unit}</span>
          </div>
        </div>
      `).join("")}
      <button class="primary-button" type="submit">기록 저장하기</button>
      <p class="help-text">저장 후 오늘 화면과 통계에서 변화를 확인할 수 있습니다.</p>
    </form>
  `;
}

function habitsScreen() {
  return `
    <header class="header">
      <div class="header-row">
        <h1>습관</h1>
        <button class="badge" data-action="add-habit">+ 습관 추가</button>
      </div>
    </header>
    <div class="month-selector">
      <button class="ghost-button" data-period-step="-1" aria-label="이전 기간">‹</button>
      <button class="period-label" data-action="toggle-period-mode">
        ${habitPeriodMode === "year" ? yearLabel(monthCursor) : monthLabel(monthCursor)}
      </button>
      <button class="ghost-button" data-period-step="1" aria-label="다음 기간">›</button>
    </div>
    ${state.habits.map((habit) => habitCard(habit)).join("")}
  `;
}

function habitCard(habit) {
  const isYear = habitPeriodMode === "year";
  const completion = isYear ? completionForHabitYear(habit) : completionForHabit(habit);
  return `
    <section class="card habit-card ${isYear ? "year-card" : ""}" style="--habit-color: ${habit.color}">
      <div class="habit-card-header">
        <div class="habit-title-actions">
          <h2 class="habit-name">${habit.name}</h2>
          <button class="edit-habit" data-edit-habit="${habit.id}">수정</button>
        </div>
        <span class="badge" style="color: ${habit.color}; background: color-mix(in srgb, ${habit.color} 16%, transparent)">${completion.done}/${completion.total}</span>
      </div>
      <div class="calendar-grid" aria-label="${habit.name} 월간 기록">
        ${Array.from({ length: daysInMonth(monthCursor) }, (_, i) => dotButton(habit, i + 1)).join("")}
      </div>
      ${isYear ? annualHabitGrid(habit) : ""}
    </section>
  `;
}

function dotButton(habit, day) {
  const key = monthDateKey(day);
  const done = Boolean(state.habitLogs[habit.id]?.[key]);
  const tone = done ? dotTone(day, habit.id) : 1;
  return `
    <button
      class="dot ${done ? "done" : ""} ${key === todayKey ? "today" : ""}"
      style="--dot-fill: ${hexToRgba(habit.color, tone)}"
      data-toggle-dot="${habit.id}"
      data-date="${key}"
      title="${day}일 ${done ? "완료" : "미완료"}"
      aria-label="${habit.name} ${day}일 ${done ? "완료 취소" : "완료 체크"}"
    ></button>
  `;
}

function annualHabitGrid(habit) {
  const total = daysInYear(monthCursor.getFullYear());
  return `
    <div class="year-heatmap" aria-label="${habit.name} 연간 기록">
      <div class="year-dot-grid">
        ${Array.from({ length: total }, (_, i) => annualDotButton(habit, i + 1)).join("")}
      </div>
      <div class="year-month-labels">
        <span>1월</span><span>3월</span><span>5월</span><span>7월</span><span>9월</span><span>11월</span>
      </div>
    </div>
  `;
}

function annualDotButton(habit, dayOfYear) {
  const date = yearDate(dayOfYear);
  const key = toDateKey(date);
  const done = Boolean(state.habitLogs[habit.id]?.[key]);
  const tone = done ? dotTone(dayOfYear, habit.id) : 1;
  return `
    <button
      class="year-dot ${done ? "done" : ""} ${key === todayKey ? "today" : ""}"
      style="--dot-fill: ${hexToRgba(habit.color, tone)}"
      data-toggle-dot="${habit.id}"
      data-date="${key}"
      title="${formatShortDate(key)}"
      aria-label="${habit.name} ${formatShortDate(key)}"
    ></button>
  `;
}

function dotTone(day, habitId) {
  const patterns = {
    water: [1, 0.6, 0.25, 0.25, 0.6, 1, 0.25],
    protein: [1, 0.25, 0.6, 0.6, 0.25, 0.25, 0.25],
    walk: [1, 0.25, 0.25, 0.25, 0.6, 0.6, 0.25],
    night: [0.6, 1, 0.6, 0.25, 1, 0.25, 0.6]
  };
  const fallback = [1, 0.6, 0.25, 0.6, 1, 0.25, 0.6];
  const pattern = patterns[habitId] || fallback;
  return pattern[(day - 1) % 7];
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function statsScreen() {
  const metric = lastMetric();
  const habitPercent = averageHabitPercent();
  return `
    <header class="header">
      <h1>통계</h1>
    </header>
    <section class="stats-grid">
      <article class="stat-mini"><p>체중 변화</p><strong>${metric.weight}kg</strong><span>${weightDiffShort()}</span></article>
      <article class="stat-mini"><p>습관 달성률</p><strong>${habitPercent}%</strong><span>이번 달</span></article>
      <article class="stat-mini"><p>연속 기록</p><strong>${streakDays()}일</strong><span>오늘 기준</span></article>
    </section>
    <section class="card">
      <div class="card-head">
        <h2>몸 상태 기록 통계</h2>
        <span class="subtle">최근 기록</span>
      </div>
      <div class="tabs">
        ${metricDefs.map((def) => `<button class="tab-chip ${selectedMetric === def.key ? "active" : ""}" data-metric-tab="${def.key}">${def.label}</button>`).join("")}
      </div>
      ${metricChartScrollable(selectedMetric)}
    </section>
    <section class="card">
      <h2>습관별 달성률</h2>
      <div class="progress-list" style="margin-top: 16px">
        ${state.habits.map((habit) => habitProgress(habit)).join("")}
      </div>
    </section>
    ${backupCard()}
  `;
}

function backupCard() {
  return `
    <section class="card backup-card">
      <div>
        <h2>데이터 백업</h2>
        <p class="subtle">기록을 JSON 파일로 저장하거나 다시 불러올 수 있어요.</p>
      </div>
      <div class="backup-actions">
        <button class="secondary-button" type="button" data-action="export-data">내보내기</button>
        <button class="primary-button" type="button" data-action="import-data">가져오기</button>
        <input class="file-input" type="file" accept="application/json,.json" data-import-file />
      </div>
    </section>
  `;
}

function averageHabitPercent() {
  if (!state.habits.length) return 0;
  const total = state.habits.reduce((sum, habit) => sum + completionForHabit(habit).percent, 0);
  return Math.round(total / state.habits.length);
}

function streakDays() {
  let streak = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = toDateKey(date);
    const anyDone = state.habits.some((habit) => state.habitLogs[habit.id]?.[key]);
    if (!anyDone) break;
    streak += 1;
  }
  return streak;
}

function weightDiffShort() {
  if (state.metrics.length < 2) return "-";
  const sorted = [...state.metrics].sort((a, b) => a.date.localeCompare(b.date));
  const diff = Number(sorted.at(-1).weight) - Number(sorted.at(0).weight);
  return `${diff > 0 ? "+" : ""}${diff.toFixed(1)}kg`;
}

function metricChart(key) {
  const def = metricDefs.find((item) => item.key === key);
  const data = [...state.metrics].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  const values = data.map((entry) => Number(entry[key]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = data.length === 1 ? 161 : (index / (data.length - 1)) * 322;
    const y = 120 - ((value - min) / range) * 92 + 12;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `
    <div>
      <h2>${def.label} 변화 추이</h2>
      <p class="subtle" style="font-size: 12px; margin-top: 4px">최근 ${data.length}회의 기록</p>
      <div class="chart">
        <svg viewBox="0 0 322 150" role="img" aria-label="${def.label} 변화 그래프">
          <line x1="0" y1="36" x2="322" y2="36" stroke="#253044" />
          <line x1="0" y1="76" x2="322" y2="76" stroke="#253044" />
          <line x1="0" y1="116" x2="322" y2="116" stroke="#253044" />
          <polyline points="${points}" fill="none" stroke="#00d4aa" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          ${points.split(" ").map((point, index) => {
            const [x, y] = point.split(",");
            const last = index === data.length - 1;
            return `<circle cx="${x}" cy="${y}" r="${last ? 5 : 3}" fill="${last ? "#e2e8f0" : "#00d4aa"}" />`;
          }).join("")}
        </svg>
        <div class="axis"><span>${formatShortDate(data[0]?.date)}</span><span>오늘</span></div>
      </div>
    </div>
  `;
}

function metricChartScrollable(key) {
  const def = metricDefs.find((item) => item.key === key);
  const data = [...state.metrics]
    .filter((entry) => entry.date <= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!data.length) {
    return `<p class="empty">기록이 쌓이면 그래프가 표시됩니다.</p>`;
  }

  const visibleCount = 4;
  const pointGap = 88;
  const chartWidth = Math.max(322, (Math.max(data.length, visibleCount) - 1) * pointGap);
  const values = data.map((entry) => Number(entry[key])).filter((value) => !Number.isNaN(value));
  if (!values.length) {
    return `<p class="empty">이 항목의 숫자 기록이 아직 없습니다.</p>`;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = data.map((entry, index) => {
    const value = Number(entry[key]);
    const x = data.length === 1 ? chartWidth : index * pointGap;
    const y = Number.isNaN(value) ? 120 : 120 - ((value - min) / range) * 92 + 12;
    return { entry, value, x, y };
  });
  const pointString = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const selected = selectedChartPoint && selectedChartPoint.metric === key
    ? points.find((point) => point.entry.date === selectedChartPoint.date)
    : null;

  return `
    <div>
      <h2>${def.label} 변화 추이</h2>
      <p class="subtle" style="font-size: 12px; margin-top: 4px">최근 4회의 기록</p>
      <div class="chart">
        <div class="chart-scroller" data-chart-scroller>
          <div class="chart-canvas" style="width: ${chartWidth + 16}px">
            <svg viewBox="0 0 ${chartWidth + 16} 150" role="img" aria-label="${def.label} 변화 추이">
              <line x1="0" y1="36" x2="${chartWidth + 16}" y2="36" stroke="#253044" />
              <line x1="0" y1="76" x2="${chartWidth + 16}" y2="76" stroke="#253044" />
              <line x1="0" y1="116" x2="${chartWidth + 16}" y2="116" stroke="#253044" />
              <polyline points="${pointString}" fill="none" stroke="#00d4aa" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
              ${points.map((point, index) => {
                const isLast = index === data.length - 1;
                const isSelected = selectedChartPoint?.metric === key && selectedChartPoint?.date === point.entry.date;
                return `<circle cx="${point.x}" cy="${point.y}" r="${isSelected ? 6 : isLast ? 5 : 3}" fill="${isLast ? "#e2e8f0" : "#00d4aa"}" />`;
              }).join("")}
            </svg>
            ${points.map((point) => {
              const isSelected = selectedChartPoint?.metric === key && selectedChartPoint?.date === point.entry.date;
              return `
                <button
                  class="chart-point ${isSelected ? "selected" : ""}"
                  style="left: ${point.x}px; top: ${point.y}px"
                  data-chart-point="${point.entry.date}"
                  aria-label="${formatShortDate(point.entry.date)} ${def.label} ${point.value}${def.unit}"
                ></button>
              `;
            }).join("")}
            ${selected ? `
              <div class="chart-tooltip" style="left: ${selected.x}px; top: ${Math.max(4, selected.y - 42)}px">
                <strong>${selected.value}${def.unit}</strong>
                <span>${selected.entry.date === todayKey ? "오늘" : formatShortDate(selected.entry.date)}</span>
              </div>
            ` : ""}
          </div>
        </div>
        <div class="axis"><span>${formatShortDate(data[0]?.date)}</span><span>오늘</span></div>
      </div>
    </div>
  `;
}

function habitProgress(habit) {
  const completion = completionForHabit(habit);
  return `
    <div>
      <div class="progress-label"><strong>${habit.name}</strong><strong>${completion.percent}%</strong></div>
      <div class="progress-track"><div class="progress-fill" style="width: ${completion.percent}%"></div></div>
    </div>
  `;
}

function navIcon(key) {
  const icons = {
    today: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"></rect><path d="M8 3v4M16 3v4M4 10h16"></path></svg>`,
    habits: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8 12 3 3 5-6"></path></svg>`,
    stats: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16 5-5 4 4 7-7"></path><path d="M15 8h5v5"></path></svg>`
  };
  return `<span class="nav-icon">${icons[key]}</span>`;
}

function bottomNav() {
  const tabs = [
    ["today", "오늘", "▣"],
    ["habits", "습관", "◉"],
    ["stats", "통계", "⌁"]
  ];
  return `
    <nav class="bottom-nav" aria-label="주 메뉴">
      <div class="nav-items">
        ${tabs.map(([key, label, icon]) => `
          <button class="nav-button ${activeTab === key && view !== "bodyInput" ? "active" : ""}" data-tab="${key}">
            ${navIcon(key)}
            <span>${label}</span>
          </button>
        `).join("")}
      </div>
      <div class="home-indicator"><span></span></div>
    </nav>
  `;
}

function habitModal() {
  const habit = editingHabitId === "new" ? null : state.habits.find((item) => item.id === editingHabitId);
  return `
    <div class="modal-backdrop">
      <form class="modal" data-habit-form>
        <h2>${habit ? "습관 수정" : "습관 추가"}</h2>
        <div class="field-wrap" style="margin-top: 14px">
          <input name="habitName" autocomplete="off" placeholder="습관 이름" value="${habit?.name ?? ""}" />
        </div>
        <div class="modal-actions">
          <button class="secondary-button" type="button" data-action="close-modal">취소</button>
          <button class="primary-button" type="submit">저장</button>
        </div>
      </form>
    </div>
  `;
}

function formatShortDate(dateKey) {
  if (!dateKey) return "-";
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function bindEvents() {
  app.querySelectorAll("[data-pin-key]").forEach((button) => {
    button.addEventListener("click", () => handlePin(button.dataset.pinKey));
  });

  app.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });

  app.querySelector("[data-action='body-input']")?.addEventListener("click", () => {
    view = "bodyInput";
    render();
  });

  app.querySelector("[data-action='pin-error-confirm']")?.addEventListener("click", () => {
    pin = "";
    pinError = "";
    view = "pin";
    render();
  });

  app.querySelector("[data-action='back-today']")?.addEventListener("click", () => {
    view = "app";
    activeTab = "today";
    render();
  });

  app.querySelector("[data-body-form]")?.addEventListener("submit", saveMetricForm);

  app.querySelectorAll("[data-toggle-today]").forEach((button) => {
    button.addEventListener("click", () => toggleHabit(button.dataset.toggleToday, todayKey));
  });

  app.querySelectorAll("[data-toggle-dot]").forEach((button) => {
    button.addEventListener("click", () => toggleHabit(button.dataset.toggleDot, button.dataset.date, { preserveScroll: true }));
  });

  app.querySelectorAll("[data-period-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.periodStep);
      monthCursor = habitPeriodMode === "year"
        ? new Date(monthCursor.getFullYear() + step, monthCursor.getMonth(), 1)
        : new Date(monthCursor.getFullYear(), monthCursor.getMonth() + step, 1);
      render();
    });
  });

  app.querySelector("[data-action='toggle-period-mode']")?.addEventListener("click", () => {
    habitPeriodMode = habitPeriodMode === "year" ? "month" : "year";
    render({ preserveScroll: true });
  });

  app.querySelector("[data-action='add-habit']")?.addEventListener("click", () => {
    editingHabitId = "new";
    render();
  });

  app.querySelectorAll("[data-edit-habit]").forEach((button) => {
    button.addEventListener("click", () => {
      editingHabitId = button.dataset.editHabit;
      render();
    });
  });

  app.querySelector("[data-action='close-modal']")?.addEventListener("click", () => {
    editingHabitId = null;
    render();
  });

  app.querySelector("[data-habit-form]")?.addEventListener("submit", saveHabitForm);

  app.querySelectorAll("[data-metric-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMetric = button.dataset.metricTab;
      selectedChartPoint = null;
      render();
    });
  });

  app.querySelectorAll("[data-chart-point]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedChartPoint = { metric: selectedMetric, date: button.dataset.chartPoint };
      render({ preserveScroll: true, preserveChartScroll: true });
    });
  });

  app.querySelector("[data-action='export-data']")?.addEventListener("click", exportData);

  app.querySelector("[data-action='import-data']")?.addEventListener("click", () => {
    app.querySelector("[data-import-file]")?.click();
  });

  app.querySelector("[data-import-file]")?.addEventListener("change", importData);
}

function handlePin(key) {
  if (key === "back") {
    pin = pin.slice(0, -1);
    pinError = "";
    render();
    return;
  }

  if (pin.length >= 4) return;
  pin += key;
  if (pin.length === 4) {
    if (pin === PASSWORD) {
      pin = "";
      pinError = "";
      view = "app";
      activeTab = "today";
    } else {
      pin = "";
      view = "pinError";
      pinError = "";
    }
  }
  render();
}

function saveMetricForm(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const entry = { date: todayKey };
  for (const def of metricDefs) {
    const raw = String(form.get(def.key) || "").trim();
    entry[def.key] = raw ? Number(raw) : "";
  }
  state.metrics = state.metrics.filter((item) => item.date !== todayKey).concat(entry);
  saveState();
  view = "app";
  activeTab = "today";
  render();
}

function toggleHabit(habitId, dateKey, options = {}) {
  if (!state.habitLogs[habitId]) state.habitLogs[habitId] = {};
  state.habitLogs[habitId][dateKey] = !state.habitLogs[habitId][dateKey];
  saveState();
  render(options);
}

function saveHabitForm(event) {
  event.preventDefault();
  const name = String(new FormData(event.currentTarget).get("habitName") || "").trim();
  if (!name) return;
  if (editingHabitId === "new") {
    const id = `habit-${Date.now()}`;
    const color = habitColors[state.habits.length % habitColors.length];
    state.habits.push({ id, name, color });
    state.habitLogs[id] = {};
  } else {
    const habit = state.habits.find((item) => item.id === editingHabitId);
    if (habit) habit.name = name;
  }
  editingHabitId = null;
  saveState();
  render();
}

function exportData() {
  const payload = {
    app: "blue-ver2",
    version: 1,
    exportedAt: new Date().toISOString(),
    state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `blue-ver2-backup-${todayKey}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.currentTarget.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      const importedState = parsed.state || parsed;
      state = normalizeState(importedState);
      saveState();
      activeTab = "stats";
      view = "app";
      editingHabitId = null;
      selectedChartPoint = null;
      render();
    } catch {
      alert("백업 파일을 읽지 못했어요. JSON 파일인지 확인해주세요.");
    }
  });
  reader.readAsText(file);
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

render();

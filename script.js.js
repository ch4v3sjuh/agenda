"use strict";

/* =====================================================
   VIBEPLANNER - SCRIPT.JS COMPLETO
===================================================== */

const AUTH_KEY = "vibeplanner-auth";
const USER_PREFIX = "vibeplanner-user-";

/* Cores dos eventos */
const COLORS = [
  "#93c5fd",
  "#86efac",
  "#f9a8d4",
  "#fde68a",
  "#c4b5fd",
  "#fca5a5",
  "#67e8f9",
  "#fdba74"
];

/* =====================================================
   TEMAS
===================================================== */

const THEMES = {
  classico: { accent: "#6366f1", bg: "#f4f6f9", dark: false },
  lilas: { accent: "#8b5cf6", bg: "#f5f3ff", dark: false },
  rosa: { accent: "#ec4899", bg: "#fdf2f8", dark: false },
  verde: { accent: "#10b981", bg: "#ecfdf5", dark: false },
  azul: { accent: "#2563eb", bg: "#eff6ff", dark: false },
  escuro: { accent: "#818cf8", bg: "#111827", dark: true }
};

/* =====================================================
   FERIADOS
===================================================== */

const HOLIDAYS = {
  "2026-01-01": "Ano Novo",
  "2026-04-03": "Sexta-feira Santa",
  "2026-04-21": "Tiradentes",
  "2026-05-01": "Dia do Trabalho",
  "2026-09-07": "Independência",
  "2026-10-12": "Nossa Senhora Aparecida",
  "2026-11-02": "Finados",
  "2026-11-15": "Proclamação da República",
  "2026-12-25": "Natal",
  "2027-01-01": "Ano Novo",
  "2027-04-21": "Tiradentes",
  "2027-05-01": "Dia do Trabalho",
  "2027-09-07": "Independência",
  "2027-10-12": "Nossa Senhora Aparecida",
  "2027-11-02": "Finados",
  "2027-11-15": "Proclamação da República",
  "2027-12-25": "Natal"
};

/* =====================================================
   ELEMENTOS
===================================================== */

const $ = (selector) => document.querySelector(selector);

const loginScreen = $("#loginScreen");
const loginForm = $("#loginForm");
const appContent = $("#appContent");
const main = $("#main");

/* =====================================================
   ESTADO
===================================================== */

let cursor = startOfDay(new Date());
let mode = "semana";
let page = "agenda";
let query = "";
let editingEventId = null;
let state = createDefaultState();

function createDefaultState() {
  return {
    events: [],
    tasks: [],
    settings: {
      theme: "classico",
      showHolidays: true,
      showWeekNumbers: false,
      notifications: false,
      colors: {
        accent: "#6366f1",
        bg: "#f4f6f9",
        event: "#93c5fd",
        text: "#0f172a"
      }
    }
  };
}

/* =====================================================
   UTILIDADES
===================================================== */

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function iso(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function parseISO(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function minutes(time) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

function pad(number) {
  return String(number).padStart(2, "0");
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[char];
  });
}

function sameDay(a, b) {
  return iso(a) === iso(b);
}

function weekStart(date) {
  return addDays(startOfDay(date), -date.getDay());
}

function monthLabel(date) {
  const name = date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function toast(message) {
  const element = document.createElement("div");
  element.className = "toast-msg";
  element.textContent = message;
  $("#toasts").appendChild(element);
  setTimeout(() => element.remove(), 2400);
}

/* =====================================================
   USUÁRIO E SESSÃO
===================================================== */

function getAuth() {
  const saved = localStorage.getItem(AUTH_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

function getCurrentUserKey() {
  const auth = getAuth();
  if (!auth) return null;
  return USER_PREFIX + auth.user.toLowerCase().trim();
}

function saveUserData() {
  const key = getCurrentUserKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(state));
}

function loadUserData() {
  const key = getCurrentUserKey();
  if (!key) {
    state = createDefaultState();
    return;
  }
  const saved = localStorage.getItem(key);
  if (!saved) {
    state = createDefaultState();
    saveUserData();
    return;
  }
  try {
    const parsed = JSON.parse(saved);
    state = {
      ...createDefaultState(),
      ...parsed,
      settings: {
        ...createDefaultState().settings,
        ...(parsed.settings || {})
      }
    };
  } catch {
    state = createDefaultState();
  }
}

/* =====================================================
   LOGIN (Corrigido)
===================================================== */

loginForm.addEventListener("submit", function (event) {
  event.preventDefault();
  processLogin();
});

function processLogin() {
  const user = $("#loginUser").value.trim();
  const password = $("#loginPass").value.trim();
  const error = $("#loginError");

  if (!user || !password) {
    if (error) {
      error.textContent = "Preencha usuário e senha.";
      error.hidden = false;
    }
    return;
  }

  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ user: user })
  );

  if (error) {
    error.hidden = true;
  }

  showApp();
}

function showLogin() {
  loginScreen.classList.remove("d-none");
  appContent.classList.add("d-none");
  $("#loginUser").value = "";
  $("#loginPass").value = "";
  if ($("#loginError")) $("#loginError").hidden = true;
}

function showApp() {
  const auth = getAuth();
  if (!auth) {
    showLogin();
    return;
  }

  if ($("#userNameDisplay")) {
    $("#userNameDisplay").textContent = auth.user;
  }

  loginScreen.classList.add("d-none");
  appContent.classList.remove("d-none");

  loadUserData();
  applyTheme();
  render();
}

$("#logoutBtn").addEventListener("click", function () {
  localStorage.removeItem(AUTH_KEY);
  state = createDefaultState();
  page = "agenda";
  query = "";
  showLogin();
});

/* =====================================================
   TEMA
===================================================== */

function applyTheme() {
  const settings = state.settings || createDefaultState().settings;
  const theme = THEMES[settings.theme] || THEMES.classico;

  document.documentElement.style.setProperty("--accent", theme.accent);
  document.documentElement.style.setProperty("--bg", theme.bg);

  if (theme.dark) {
    document.documentElement.style.setProperty("--ink", "#f8fafc");
    document.documentElement.style.setProperty("--surface", "#1f2937");
    document.documentElement.style.setProperty("--sidebar", "#111827");
    document.documentElement.style.setProperty("--line", "#374151");
    document.documentElement.style.setProperty("--muted", "#aeb8c5");
  } else {
    document.documentElement.style.setProperty("--ink", "#0f172a");
    document.documentElement.style.setProperty("--surface", "#ffffff");
    document.documentElement.style.setProperty("--sidebar", "#f8fafc");
    document.documentElement.style.setProperty("--line", "#e2e8f0");
    document.documentElement.style.setProperty("--muted", "#64748b");
  }
}

/* =====================================================
   NAVEGAÇÃO DO MENU LATERAL
===================================================== */

document.querySelectorAll("[data-view]").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll("[data-view]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    page = btn.dataset.view;
    render();
  };
});

/* =====================================================
   EVENTOS
===================================================== */

function eventsOn(date) {
  return (state.events || [])
    .filter(event => event.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));
}

function itemHTML(event) {
  return `
    <div class="item search-hit" data-event-id="${esc(event.id)}">
      <i class="bar" style="background:${esc(event.color || COLORS[0])}"></i>
      <div>
        <strong>${esc(event.title)}</strong>
        <div class="muted">
          ${esc(event.date.split("-").reverse().join("/"))} · ${esc(event.start)} - ${esc(event.end)}
        </div>
        ${event.category ? `<div class="muted">${esc(event.category)}</div>` : ""}
      </div>
    </div>
  `;
}

/* =====================================================
   RENDERIZAÇÃO GERAL
===================================================== */

function render() {
  renderSwatches(state.settings.colors?.event || COLORS[0]);

  if (page === "agenda") {
    renderAgenda();
  } else if (page === "hoje") {
    renderHoje();
  } else if (page === "tarefas") {
    renderTarefas();
  } else if (page === "config") {
    renderConfig();
  }
}

/* =====================================================
   AGENDA
===================================================== */

function renderAgenda() {
  const title = mode === "mes" ? monthLabel(cursor) : monthLabel(weekStart(cursor));

  main.innerHTML = `
    <section>
      <div class="cal-head">
        <h1>${title}</h1>
        <div class="cal-controls">
          <div class="pager">
            <button id="prevBtn" type="button">‹</button>
            <button id="todayBtn" type="button">Hoje</button>
            <button id="nextBtn" type="button">›</button>
          </div>
          <div class="seg">
            <button type="button" data-mode="dia" class="${mode === "dia" ? "active" : ""}">Dia</button>
            <button type="button" data-mode="semana" class="${mode === "semana" ? "active" : ""}">Semana</button>
            <button type="button" data-mode="mes" class="${mode === "mes" ? "active" : ""}">Mês</button>
          </div>
          <button id="newBtn" type="button" class="btn btn-dark">
            <i class="bi bi-plus-lg"></i> Novo
          </button>
        </div>
      </div>
      <div id="calendar"></div>
    </section>
  `;

  $("#prevBtn").onclick = () => shiftCalendar(-1);
  $("#nextBtn").onclick = () => shiftCalendar(1);
  $("#todayBtn").onclick = () => {
    cursor = startOfDay(new Date());
    render();
  };
  $("#newBtn").onclick = () => openForm();

  document.querySelectorAll("[data-mode]").forEach(button => {
    button.onclick = () => {
      mode = button.dataset.mode;
      render();
    };
  });

  const calendar = $("#calendar");
  if (mode === "semana") calendar.innerHTML = weekHTML(weekStart(cursor));
  if (mode === "dia") calendar.innerHTML = dayHTML(cursor);
  if (mode === "mes") calendar.innerHTML = monthHTML(cursor);

  bindCalendar();
}

function shiftCalendar(direction) {
  if (mode === "dia") cursor = addDays(cursor, direction);
  if (mode === "semana") cursor = addDays(cursor, direction * 7);
  if (mode === "mes") cursor = new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1);
  render();
}

/* =====================================================
   CALENDÁRIO (TEMPO / SEMANA / DIA / MÊS)
===================================================== */

function timeGrid(days) {
  const startHour = 7;
  const endHour = 19;

  const labels = Array.from({ length: endHour - startHour }, (_, index) => `
    <div class="hour-label">${pad(startHour + index)}:00</div>
  `).join("");

  const columns = days.map(day => {
    const slots = Array.from({ length: endHour - startHour }, (_, index) => {
      const hour = startHour + index;
      return `<div class="slot" data-date="${iso(day)}" data-hour="${hour}"></div>`;
    }).join("");

    const events = eventsOn(iso(day)).map(event => eventButton(event, startHour, endHour)).join("");
    const holiday = state.settings.showHolidays && HOLIDAYS[iso(day)] ? `
      <div class="muted" style="padding:6px; font-size:11px; background:#f3e8ff; color:#6b21a8; border-radius:6px; margin:4px;">
        ${esc(HOLIDAYS[iso(day)])}
      </div>
    ` : "";

    return `<div class="day-col">${slots}${holiday}${events}</div>`;
  }).join("");

  return `<div class="hours">${labels}</div>${columns}`;
}

function eventButton(event, startHour, endHour) {
  const topMinutes = Math.max(minutes(event.start), startHour * 60);
  const bottomMinutes = Math.min(minutes(event.end), endHour * 60);

  if (bottomMinutes <= topMinutes) return "";

  const top = ((topMinutes - startHour * 60) / 60) * 72;
  const height = Math.max(((bottomMinutes - topMinutes) / 60) * 72 - 4, 28);
  const color = event.color || COLORS[0];

  return `
    <button type="button" class="event" data-event-id="${esc(event.id)}" style="top:${top}px; height:${height}px; background:${esc(color)}; color:#0f172a;">
      <b>${esc(event.title)}</b>
      <span>${esc(event.start)} - ${esc(event.end)}</span>
    </button>
  `;
}

function weekHTML(start) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const names = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

  const heads = days.map(day => {
    const today = sameDay(day, new Date()) ? "today" : "";
    return `
      <div class="${today}">
        ${names[day.getDay()]}
        <strong>${day.getDate()}</strong>
      </div>
    `;
  }).join("");

  return `
    <div class="week-scroll">
      <div class="week-table">
        <div class="day-head">
          <div></div>
          ${heads}
        </div>
        <div class="week-body">
          ${timeGrid(days)}
        </div>
      </div>
    </div>
  `;
}

function dayHTML(date) {
  const names = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const today = sameDay(date, new Date()) ? "today" : "";

  return `
    <div class="day-scroll">
      <div class="day-head" style="grid-template-columns: 70px 1fr;">
        <div></div>
        <div class="${today}">
          ${names[date.getDay()]}
          <strong>${date.getDate()}</strong>
        </div>
      </div>
      <div class="week-body" style="grid-template-columns: 70px 1fr;">
        ${timeGrid([date])}
      </div>
    </div>
  `;
}

function monthHTML(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = weekStart(first);
  const names = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

  let cells = names.map(name => `<div>${name}</div>`).join("");

  for (let index = 0; index < 42; index++) {
    const day = addDays(start, index);
    const dateKey = iso(day);
    const outside = day.getMonth() !== date.getMonth() ? "out" : "";
    const today = sameDay(day, new Date()) ? "today" : "";
    const events = eventsOn(dateKey);

    const chips = events.slice(0, 3).map(event => `
      <span class="chip" data-event-id="${esc(event.id)}" style="background:${esc(event.color || COLORS[0])}">
        ${esc(event.title)}
      </span>
    `).join("");

    const more = events.length > 3 ? `<small class="muted">+${events.length - 3} mais</small>` : "";
    const holiday = state.settings.showHolidays && HOLIDAYS[dateKey] ? `<small class="muted" style="color:#7c3aed;">${esc(HOLIDAYS[dateKey])}</small>` : "";

    cells += `
      <button class="m-day ${outside} ${today}" type="button" data-date="${dateKey}">
        <span>${day.getDate()}</span>
        ${holiday}
        ${chips}
        ${more}
      </button>
    `;
  }

  return `
    <div class="month-grid">
      <div class="month-head">${cells}</div>
    </div>
  `;
}

function bindCalendar() {
  document.querySelectorAll(".slot").forEach(slot => {
    slot.onclick = () => {
      const hour = Number(slot.dataset.hour);
      openForm({
        date: slot.dataset.date,
        start: `${pad(hour)}:00`,
        end: `${pad(Math.min(hour + 1, 23))}:00`
      });
    };
  });

  document.querySelectorAll("[data-event-id]").forEach(element => {
    element.onclick = e => {
      e.stopPropagation();
      const id = element.dataset.eventId;
      const found = state.events.find(item => item.id === id);
      if (found) openForm(found);
    };
  });

  document.querySelectorAll(".m-day").forEach(day => {
    day.onclick = e => {
      if (e.target.closest("[data-event-id]")) return;
      cursor = parseISO(day.dataset.date);
      mode = "dia";
      render();
    };
  });
}

/* =====================================================
   FORMULÁRIO DE EVENTOS / PAINEL
===================================================== */

const panel = $("#panel");
const eventForm = $("#eventForm");

function openForm(eventData = {}) {
  editingEventId = eventData.id || null;
  $("#formTitle").textContent = editingEventId ? "Editar compromisso" : "Novo compromisso";
  $("#eventId").value = editingEventId || "";
  $("#title").value = eventData.title || "";
  $("#date").value = eventData.date || iso(cursor);
  $("#start").value = eventData.start || "09:00";
  $("#end").value = eventData.end || "10:00";
  $("#description").value = eventData.description || "";
  $("#category").value = eventData.category || "Estudos";

  const deleteBtn = $("#deleteBtn");
  if (deleteBtn) {
    if (editingEventId) deleteBtn.classList.remove("d-none");
    else deleteBtn.classList.add("d-none");
  }

  renderSwatches(eventData.color || COLORS[0]);
  panel.classList.add("open");
  if ($("#backdrop")) $("#backdrop").classList.add("show");
}

function closeForm() {
  panel.classList.remove("open");
  if ($("#backdrop")) $("#backdrop").classList.remove("show");
  editingEventId = null;
}

if ($("#closeForm")) $("#closeForm").onclick = closeForm;
if ($("#cancelBtn")) $("#cancelBtn").onclick = closeForm;
if ($("#backdrop")) $("#backdrop").onclick = closeForm;

eventForm.onsubmit = e => {
  e.preventDefault();
  const title = $("#title").value.trim();
  const date = $("#date").value;
  const start = $("#start").value;
  const end = $("#end").value;
  const description = $("#description").value.trim();
  const category = $("#category").value;
  const selectedSwatch = $("#colorPicker .swatch.active");
  const color = selectedSwatch ? selectedSwatch.dataset.color : COLORS[0];

  if (!title || !date || !start || !end) return;

  if (editingEventId) {
    const index = state.events.findIndex(item => item.id === editingEventId);
    if (index !== -1) {
      state.events[index] = { ...state.events[index], title, date, start, end, description, category, color };
    }
    toast("Compromisso atualizado!");
  } else {
    state.events.push({ id: uid(), title, date, start, end, description, category, color });
    toast("Compromisso criado!");
  }

  saveUserData();
  closeForm();
  render();
};

if ($("#deleteBtn")) {
  $("#deleteBtn").onclick = () => {
    if (!editingEventId) return;
    state.events = state.events.filter(item => item.id !== editingEventId);
    saveUserData();
    closeForm();
    render();
    toast("Compromisso excluído.");
  };
}

/* =====================================================
   HOJE
===================================================== */

function renderHoje() {
  const today = iso(new Date());
  const items = eventsOn(today);

  main.innerHTML = `
    <section class="list-card">
      <h2>Hoje</h2>
      <p class="muted mb-4">
        ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
      </p>
      ${items.length ? items.map(itemHTML).join("") : `<p class="empty">Nenhum compromisso hoje.</p>`}
      <button id="todayNewBtn" class="btn btn-dark mt-3" type="button">
        <i class="bi bi-plus-lg"></i> Adicionar compromisso
      </button>
    </section>
  `;

  $("#todayNewBtn").onclick = () => openForm({ date: today });
  bindItems();
}

function bindItems() {
  document.querySelectorAll("[data-event-id]").forEach(el => {
    el.onclick = () => {
      const id = el.dataset.eventId;
      const found = state.events.find(item => item.id === id);
      if (found) openForm(found);
    };
  });
}

/* =====================================================
   TAREFAS
===================================================== */

function renderTarefas() {
  const tasks = state.tasks || [];

  main.innerHTML = `
    <section class="list-card">
      <h2>Tarefas</h2>
      <form id="taskForm" class="d-flex gap-2 mb-4">
        <input class="form-control" id="taskText" maxlength="80" placeholder="Nova tarefa..." required>
        <button class="btn btn-dark" type="submit">Adicionar</button>
      </form>
      <div id="taskList"></div>
    </section>
  `;

  const list = $("#taskList");
  list.innerHTML = tasks.length ? tasks.map(task => `
    <div class="item task-row ${task.done ? "done" : ""}">
      <input type="checkbox" data-task="${esc(task.id)}" ${task.done ? "checked" : ""}>
      <span class="flex-grow-1">${esc(task.text)}</span>
      <button type="button" class="btn btn-sm btn-outline-danger" data-delete-task="${esc(task.id)}">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `).join("") : `<p class="empty">Nenhuma tarefa cadastrada.</p>`;

  $("#taskForm").onsubmit = e => {
    e.preventDefault();
    const input = $("#taskText");
    const text = input.value.trim();
    if (!text) return;

    state.tasks.push({ id: uid(), text, done: false });
    saveUserData();
    input.value = "";
    render();
    toast("Tarefa adicionada!");
  };

  document.querySelectorAll("[data-task]").forEach(input => {
    input.onchange = () => {
      const task = state.tasks.find(item => item.id === input.dataset.task);
      if (!task) return;
      task.done = input.checked;
      saveUserData();
      render();
    };
  });

  document.querySelectorAll("[data-delete-task]").forEach(button => {
    button.onclick = () => {
      state.tasks = state.tasks.filter(task => task.id !== button.dataset.deleteTask);
      saveUserData();
      render();
      toast("Tarefa removida.");
    };
  });
}

/* =====================================================
   CONFIGURAÇÕES
===================================================== */

function renderConfig() {
  const settings = state.settings;

  main.innerHTML = `
    <section class="settings-card">
      <h2>Configurações</h2>
      <div class="mb-4">
        <h6 class="mb-3" style="font-weight: 700;">Tema</h6>
        <div class="theme-grid" id="themeGrid"></div>
      </div>
      <div>
        <h6 class="mb-3" style="font-weight: 700;">Preferências</h6>
        <label class="opt">
          <span>Mostrar feriados</span>
          <input type="checkbox" id="showHolidays" ${settings.showHolidays ? "checked" : ""}>
        </label>
        <label class="opt">
          <span>Notificações</span>
          <input type="checkbox" id="notifications" ${settings.notifications ? "checked" : ""}>
        </label>
      </div>
    </section>
  `;

  renderThemeCards();

  $("#showHolidays").onchange = e => {
    state.settings.showHolidays = e.target.checked;
    saveUserData();
    render();
  };

  $("#notifications").onchange = async e => {
    state.settings.notifications = e.target.checked;
    if (e.target.checked && "Notification" in window) {
      try { await Notification.requestPermission(); } catch {}
    }
    saveUserData();
    render();
  };
}

function renderThemeCards() {
  const grid = $("#themeGrid");
  if (!grid) return;

  grid.innerHTML = Object.keys(THEMES).map(key => {
    const theme = THEMES[key];
    return `
      <button type="button" class="theme-card ${state.settings.theme === key ? "active" : ""}" data-theme="${key}">
        <div class="preview" style="--p1:${theme.accent}; --p2:${theme.bg};"></div>
        <strong>${themeName(key)}</strong>
      </button>
    `;
  }).join("");

  grid.querySelectorAll("[data-theme]").forEach(card => {
    card.onclick = () => {
      state.settings.theme = card.dataset.theme;
      saveUserData();
      applyTheme();
      render();
      toast("Tema alterado!");
    };
  });
}

function themeName(key) {
  const names = {
    classico: "Clássico",
    lilas: "Lilás",
    rosa: "Rosa",
    verde: "Verde",
    azul: "Azul",
    escuro: "Escuro"
  };
  return names[key] || key;
}

/* =====================================================
   CORES DOS EVENTOS (SWATCHES)
===================================================== */

function renderSwatches(selected) {
  const containers = [$("#colorPicker"), $("#quickSwatches")];

  containers.forEach(container => {
    if (!container) return;

    container.innerHTML = COLORS.map(color => `
      <button
        type="button"
        class="swatch ${color === selected ? "active" : ""}"
        data-color="${color}"
        style="background: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--line); cursor: pointer;"
      ></button>
    `).join("");

    container.querySelectorAll("[data-color]").forEach(btn => {
      btn.onclick = () => {
        container.querySelectorAll(".swatch").forEach(s => s.classList.remove("active"));
        btn.classList.add("active");
        state.settings.colors.event = btn.dataset.color;
        saveUserData();
      };
    });
  });
}

/* =====================================================
   PESQUISA E MOBILE MENU
===================================================== */

const searchInput = $("#searchInput");
if (searchInput) {
  searchInput.oninput = e => {
    query = e.target.value.toLowerCase().trim();
    if (!query) return;
    const foundEvents = state.events.filter(item => item.title.toLowerCase().includes(query));
    main.innerHTML = `
      <section class="list-card">
        <h2>Resultados para "${esc(query)}"</h2>
        ${foundEvents.length ? foundEvents.map(itemHTML).join("") : `<p class="empty">Nenhum compromisso encontrado.</p>`}
      </section>
    `;
    bindItems();
  };
}

const menuBtn = $("#menuBtn");
if (menuBtn) {
  menuBtn.onclick = () => {
    $("#sidebar").classList.toggle("open");
    if ($("#backdrop")) $("#backdrop").classList.toggle("show");
  };
}

// Inicialização ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  const auth = getAuth();
  if (auth) {
    showApp();
  } else {
    showLogin();
  }
});
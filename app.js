const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const EMOJI = ["🏠","🛒","🚗","🍽️","👕","💊","🎮","📚","👶","🎁","✈️","💡","📱","🏦","💼","💰","🎉","🛠️","☕","🐷"];
const COLORS = ["#1B7A4E","#2A9D8F","#3A7CA5","#5C4B8A","#C45C26","#C1121F","#D4A373","#6D597A","#457B9D","#E76F51"];
const AGREEMENT = `Пользовательское соглашение
приложения «Семейный бюджет»

1. Приложение нужно для личного учёта доходов, расходов, категорий и копилок семьи. Это калькулятор, а не банк.

2. Все данные хранятся только на этом iPhone. Регистрация не нужна, в интернет ничего не отправляется.

3. Расчёты носят справочный характер. Проверяйте суммы самостоятельно.

4. Категории и копилки можно создавать, менять и удалять. Системные категории защищены от удаления.

5. Есть две темы оформления: светлая и тёмная.

6. Удаление приложения или очистка данных Safari может стереть историю операций.

7. Нажимая «Принимаю», вы подтверждаете, что прочитали и приняли эти условия.`;

const KEY = "family-budget-pwa-v1";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function seed() {
  return {
    agreement: false,
    dark: false,
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    filter: "all",
    categories: [
      { id: "c1", name: "Зарплата", type: "INCOME", icon: "💼", color: "#1B7A4E", locked: true },
      { id: "c2", name: "Подработка", type: "INCOME", icon: "🛠️", color: "#2A9D8F", locked: false },
      { id: "c3", name: "Прочие доходы", type: "INCOME", icon: "💰", color: "#3A7CA5", locked: true },
      { id: "c4", name: "Продукты", type: "EXPENSE", icon: "🛒", color: "#2A9D8F", locked: false },
      { id: "c5", name: "Транспорт", type: "EXPENSE", icon: "🚗", color: "#457B9D", locked: false },
      { id: "c6", name: "Жильё", type: "EXPENSE", icon: "🏠", color: "#3A7CA5", locked: false },
      { id: "c7", name: "Здоровье", type: "EXPENSE", icon: "💊", color: "#C1121F", locked: false },
      { id: "c8", name: "Дети", type: "EXPENSE", icon: "👶", color: "#C45C26", locked: false },
      { id: "c9", name: "Накопления", type: "EXPENSE", icon: "🏦", color: "#1B7A4E", locked: true },
      { id: "c10", name: "Прочие расходы", type: "EXPENSE", icon: "🧾", color: "#6D597A", locked: true }
    ],
    ops: [],
    pigs: [
      { id: "p1", name: "Подушка безопасности", goal: 100000, current: 0, icon: "🏦", color: "#1B7A4E", note: "Резерв семьи" },
      { id: "p2", name: "Отпуск", goal: 80000, current: 0, icon: "✈️", color: "#3A7CA5", note: "Семейная поездка" }
    ]
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    return { ...seed(), ...JSON.parse(raw) };
  } catch (e) {
    return seed();
  }
}

let state = load();

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function money(n) {
  const value = Number(n) || 0;
  return value.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " ₽";
}

function parseMoney(raw) {
  const n = Number(String(raw).replace(/\s/g, "").replace(",", "."));
  if (!isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function monthOps() {
  return state.ops.filter((op) => {
    const d = new Date(op.date);
    return d.getFullYear() === state.year && d.getMonth() === state.month;
  }).sort((a, b) => b.date - a.date);
}

function totals() {
  return monthOps().reduce((acc, op) => {
    if (op.type === "INCOME") acc.income += op.amount;
    else acc.expense += op.amount;
    return acc;
  }, { income: 0, expense: 0 });
}

function catById(id) {
  return state.categories.find((c) => c.id === id);
}

function applyTheme() {
  document.documentElement.dataset.theme = state.dark ? "dark" : "light";
  const color = state.dark ? "#12161B" : "#1B7A4E";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
  document.getElementById("theme-light").classList.toggle("on", !state.dark);
  document.getElementById("theme-dark").classList.toggle("on", state.dark);
}

function showTab(name) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.toggle("active", el.id === "screen-" + name));
  document.querySelectorAll(".tabbar button").forEach((btn) => btn.classList.toggle("on", btn.dataset.tab === name));
}

function openAgreement(mode) {
  const box = document.getElementById("agreement");
  document.getElementById("agreement-text").textContent = AGREEMENT;
  document.getElementById("agreement-lead").textContent = mode === "read"
    ? "Актуальные условия использования."
    : "Перед началом работы примите условия.";
  document.getElementById("agreement-check-wrap").classList.toggle("hidden", mode === "read");
  document.getElementById("accept-agreement").classList.toggle("hidden", mode === "read");
  document.getElementById("close-agreement").classList.toggle("hidden", mode !== "read");
  document.getElementById("accept-agreement").disabled = mode !== "read" && !document.getElementById("agreement-check").checked;
  box.classList.add("show");
}

function closeAgreement() {
  document.getElementById("agreement").classList.remove("show");
}

function openSheet(html) {
  const sheet = document.getElementById("sheet");
  document.getElementById("sheet-body").innerHTML = html;
  sheet.hidden = false;
  sheet.classList.add("show");
}

function closeSheet() {
  const sheet = document.getElementById("sheet");
  sheet.classList.remove("show");
  sheet.hidden = true;
}

function renderHome() {
  const t = totals();
  const balance = t.income - t.expense;
  const today = new Date();
  const sameMonth = today.getFullYear() === state.year && today.getMonth() === state.month;
  const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
  const daysLeft = sameMonth ? (daysInMonth - today.getDate() + 1) : daysInMonth;
  const daily = daysLeft > 0 ? balance / daysLeft : 0;
  const saved = state.pigs.reduce((s, p) => s + p.current, 0);

  document.getElementById("month-title").textContent = MONTHS[state.month] + " " + state.year;
  const bal = document.getElementById("balance");
  bal.textContent = money(balance);
  bal.className = "big " + (balance >= 0 ? "plus" : "minus");
  document.getElementById("income").textContent = money(t.income);
  document.getElementById("expense").textContent = money(t.expense);
  document.getElementById("daily").textContent = money(daily);
  document.getElementById("days-left").textContent = "из остатка / " + daysLeft + " дн.";
  document.getElementById("saved").textContent = money(saved);
  document.getElementById("pigs-count").textContent = state.pigs.length + " шт.";

  const groups = {};
  monthOps().filter((op) => op.type === "EXPENSE").forEach((op) => {
    groups[op.categoryId] = (groups[op.categoryId] || 0) + op.amount;
  });
  const rows = Object.keys(groups).map((id) => ({ cat: catById(id), sum: groups[id] })).filter((x) => x.cat);
  const max = rows.reduce((m, r) => Math.max(m, r.sum), 1);
  document.getElementById("expense-bars").innerHTML = rows.length
    ? rows.sort((a, b) => b.sum - a.sum).map((r) =>
      `<div class="card"><div class="row between"><span>${r.cat.icon} ${r.cat.name}</span><strong>${money(r.sum)}</strong></div><div class="bar"><span style="width:${Math.round(r.sum / max * 100)}%;background:${r.cat.color}"></span></div></div>`
    ).join("")
    : `<div class="card empty">Расходов в этом месяце пока нет.</div>`;

  const recent = monthOps().slice(0, 5);
  document.getElementById("recent-ops").innerHTML = recent.length
    ? recent.map(opCard).join("")
    : `<div class="card empty">Добавьте первую операцию на вкладке «Операции».</div>`;
}

function opCard(op) {
  const cat = catById(op.categoryId);
  const sign = op.type === "INCOME" ? "+" : "−";
  const cls = op.type === "INCOME" ? "plus" : "minus";
  const date = new Date(op.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  return `<div class="card list-item">
    <div class="badge">${cat ? cat.icon : "•"}</div>
    <div class="grow"><strong>${cat ? cat.name : "Категория"}</strong><div class="muted">${date}${op.note ? " · " + op.note : ""}</div></div>
    <div class="right ${cls}">${sign}${money(op.amount)}</div>
  </div>`;
}

function renderOps() {
  document.getElementById("ops-month").textContent = MONTHS[state.month] + " " + state.year;
  document.querySelectorAll("[data-filter]").forEach((btn) => btn.classList.toggle("on", btn.dataset.filter === state.filter));
  const list = monthOps().filter((op) => state.filter === "all" || op.type === state.filter);
  document.getElementById("ops-list").innerHTML = list.length
    ? list.map((op) => opCard(op) + `<div class="small-actions"><button class="btn ghost" data-edit-op="${op.id}">Изменить</button><button class="btn ghost" data-del-op="${op.id}">Удалить</button></div>`).join("")
    : `<div class="card empty">Операций нет. Нажмите кнопку ниже.</div>`;
}

function renderPigs() {
  const saved = state.pigs.reduce((s, p) => s + p.current, 0);
  document.getElementById("pigs-total").textContent = "Всего накоплено " + money(saved);
  document.getElementById("pigs-list").innerHTML = state.pigs.length
    ? state.pigs.map((p) => {
      const pct = p.goal > 0 ? Math.min(100, Math.round(p.current / p.goal * 100)) : 0;
      return `<div class="card">
        <div class="list-item"><div class="badge">${p.icon}</div><div class="grow"><strong>${p.name}</strong><div class="muted">${p.note || "Цель " + money(p.goal)}</div></div></div>
        <p style="margin-top:10px">${money(p.current)} из ${money(p.goal)}</p>
        <div class="bar"><span style="width:${pct}%;background:${p.color}"></span></div>
        <p class="muted">${pct}% цели</p>
        <div class="small-actions">
          <button class="btn" data-add-piggy="${p.id}">Пополнить</button>
          <button class="btn ghost" data-take-piggy="${p.id}">Снять</button>
        </div>
        <div class="small-actions">
          <button class="btn ghost" data-edit-pig="${p.id}">Настроить</button>
          <button class="btn ghost" data-del-pig="${p.id}">Удалить</button>
        </div>
      </div>`;
    }).join("")
    : `<div class="card empty">Создайте первую копилку.</div>`;
}

function renderCats() {
  document.getElementById("cats-list").innerHTML = state.categories.map((c) =>
    `<div class="list-item" style="margin:10px 0">
      <div class="badge">${c.icon}</div>
      <div class="grow"><strong>${c.name}</strong><div class="muted">${c.type === "INCOME" ? "Доход" : "Расход"}${c.locked ? " · системная" : ""}</div></div>
      <button class="icon-btn" data-edit-cat="${c.id}">✎</button>
      <button class="icon-btn" data-del-cat="${c.id}">✕</button>
    </div>`
  ).join("");
}

function render() {
  applyTheme();
  renderHome();
  renderOps();
  renderPigs();
  renderCats();
  if (!state.agreement) openAgreement("accept");
  else closeAgreement();
}

function emojiPicker(selected) {
  return `<div class="emoji">${EMOJI.map((e) => `<button type="button" class="${e === selected ? "on" : ""}" data-emoji="${e}">${e}</button>`).join("")}</div>`;
}

function colorPicker(selected) {
  return `<div class="palette">${COLORS.map((c) => `<button type="button" class="${c === selected ? "on" : ""}" data-color="${c}" style="background:${c}"></button>`).join("")}</div>`;
}

function todayInput() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function opForm(op) {
  const type = op ? op.type : "EXPENSE";
  const cats = state.categories.filter((c) => c.type === type);
  openSheet(`
    <h2 style="margin-top:0">${op ? "Изменить операцию" : "Новая операция"}</h2>
    <div class="row">
      <button type="button" class="chip ${type === "EXPENSE" ? "on" : ""}" data-op-type="EXPENSE">Расход</button>
      <button type="button" class="chip ${type === "INCOME" ? "on" : ""}" data-op-type="INCOME">Доход</button>
    </div>
    <label>Сумма, ₽</label>
    <input id="f-amount" inputmode="decimal" value="${op ? op.amount : ""}">
    <label>Категория</label>
    <select id="f-cat">${cats.map((c) => `<option value="${c.id}" ${op && op.categoryId === c.id ? "selected" : ""}>${c.icon} ${c.name}</option>`).join("")}</select>
    <label>Дата</label>
    <input id="f-date" type="date" value="${op ? new Date(op.date).toISOString().slice(0, 10) : todayInput()}">
    <label>Кто в семье</label>
    <input id="f-member" value="${op ? op.member || "" : ""}" placeholder="необязательно">
    <label>Комментарий</label>
    <input id="f-note" value="${op ? op.note || "" : ""}">
    <p class="muted" id="form-error"></p>
    <button class="btn" id="save-op" data-id="${op ? op.id : ""}">Сохранить</button>
    <button class="btn ghost" id="cancel-sheet">Отмена</button>
  `);
}

function catForm(cat) {
  openSheet(`
    <h2 style="margin-top:0">${cat ? "Настройка категории" : "Новая категория"}</h2>
    <label>Название</label>
    <input id="f-name" value="${cat ? cat.name : ""}">
    <label>Тип</label>
    <div class="row">
      <button type="button" class="chip ${!cat || cat.type === "EXPENSE" ? "on" : ""}" data-cat-type="EXPENSE">Расход</button>
      <button type="button" class="chip ${cat && cat.type === "INCOME" ? "on" : ""}" data-cat-type="INCOME">Доход</button>
    </div>
    <input type="hidden" id="f-type" value="${cat ? cat.type : "EXPENSE"}">
    <label>Иконка</label>
    ${emojiPicker(cat ? cat.icon : "🛒")}
    <input type="hidden" id="f-icon" value="${cat ? cat.icon : "🛒"}">
    <label>Цвет</label>
    ${colorPicker(cat ? cat.color : COLORS[0])}
    <input type="hidden" id="f-color" value="${cat ? cat.color : COLORS[0]}">
    <p class="muted" id="form-error"></p>
    <button class="btn" id="save-cat" data-id="${cat ? cat.id : ""}">Сохранить</button>
    <button class="btn ghost" id="cancel-sheet">Отмена</button>
  `);
}

function pigForm(pig) {
  openSheet(`
    <h2 style="margin-top:0">${pig ? "Настройка копилки" : "Новая копилка"}</h2>
    <label>Название</label>
    <input id="f-name" value="${pig ? pig.name : ""}">
    <label>Цель, ₽</label>
    <input id="f-goal" inputmode="decimal" value="${pig ? pig.goal : ""}">
    <label>Заметка</label>
    <input id="f-note" value="${pig ? pig.note || "" : ""}">
    <label>Иконка</label>
    ${emojiPicker(pig ? pig.icon : "🐷")}
    <input type="hidden" id="f-icon" value="${pig ? pig.icon : "🐷"}">
    <label>Цвет</label>
    ${colorPicker(pig ? pig.color : COLORS[0])}
    <input type="hidden" id="f-color" value="${pig ? pig.color : COLORS[0]}">
    <p class="muted" id="form-error"></p>
    <button class="btn" id="save-pig" data-id="${pig ? pig.id : ""}">Сохранить</button>
    <button class="btn ghost" id="cancel-sheet">Отмена</button>
  `);
}

function moneyForm(pig, take) {
  openSheet(`
    <h2 style="margin-top:0">${take ? "Снять" : "Пополнить"} «${pig.name}»</h2>
    <label>Сумма, ₽</label>
    <input id="f-amount" inputmode="decimal">
    ${take ? "" : `<div class="check"><input id="f-record" type="checkbox" checked><label for="f-record" style="margin:0">Записать как расход «Накопления»</label></div>`}
    <p class="muted" id="form-error"></p>
    <button class="btn" id="save-move" data-id="${pig.id}" data-take="${take ? "1" : "0"}">Готово</button>
    <button class="btn ghost" id="cancel-sheet">Отмена</button>
  `);
}

document.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-tab]");
  if (tab) showTab(tab.dataset.tab);

  if (e.target.id === "prev-month") {
    if (state.month === 0) { state.month = 11; state.year -= 1; } else state.month -= 1;
    save(); render();
  }
  if (e.target.id === "next-month") {
    if (state.month === 11) { state.month = 0; state.year += 1; } else state.month += 1;
    save(); render();
  }

  const filter = e.target.closest("[data-filter]");
  if (filter) { state.filter = filter.dataset.filter; render(); }

  if (e.target.id === "theme-light") { state.dark = false; save(); render(); }
  if (e.target.id === "theme-dark") { state.dark = true; save(); render(); }
  if (e.target.id === "open-agreement") openAgreement("read");
  if (e.target.id === "close-agreement") closeAgreement();
  if (e.target.id === "accept-agreement") {
    if (document.getElementById("agreement-check").checked) {
      state.agreement = true;
      save();
      closeAgreement();
    }
  }

  if (e.target.id === "add-op") opForm(null);
  if (e.target.id === "add-cat") catForm(null);
  if (e.target.id === "add-pig") pigForm(null);
  if (e.target.id === "cancel-sheet" || e.target.id === "sheet") closeSheet();

  const editOp = e.target.closest("[data-edit-op]");
  if (editOp) opForm(state.ops.find((o) => o.id === editOp.dataset.editOp));
  const delOp = e.target.closest("[data-del-op]");
  if (delOp && confirm("Удалить операцию?")) {
    state.ops = state.ops.filter((o) => o.id !== delOp.dataset.delOp);
    save(); render();
  }

  const editCat = e.target.closest("[data-edit-cat]");
  if (editCat) catForm(state.categories.find((c) => c.id === editCat.dataset.editCat));
  const delCat = e.target.closest("[data-del-cat]");
  if (delCat) {
    const cat = state.categories.find((c) => c.id === delCat.dataset.delCat);
    if (!cat) return;
    if (cat.locked) return alert("Системную категорию нельзя удалить.");
    if (state.ops.some((o) => o.categoryId === cat.id)) return alert("Сначала удалите операции в этой категории.");
    if (confirm("Удалить категорию «" + cat.name + "»?")) {
      state.categories = state.categories.filter((c) => c.id !== cat.id);
      save(); render();
    }
  }

  const editPig = e.target.closest("[data-edit-pig]");
  if (editPig) pigForm(state.pigs.find((p) => p.id === editPig.dataset.editPig));
  const delPig = e.target.closest("[data-del-pig]");
  if (delPig && confirm("Удалить копилку?")) {
    state.pigs = state.pigs.filter((p) => p.id !== delPig.dataset.delPig);
    save(); render();
  }
  const addPiggy = e.target.closest("[data-add-piggy]");
  if (addPiggy) moneyForm(state.pigs.find((p) => p.id === addPiggy.dataset.addPiggy), false);
  const takePiggy = e.target.closest("[data-take-piggy]");
  if (takePiggy) moneyForm(state.pigs.find((p) => p.id === takePiggy.dataset.takePiggy), true);

  const opType = e.target.closest("[data-op-type]");
  if (opType) {
    const current = {
      id: document.getElementById("save-op") && document.getElementById("save-op").dataset.id,
      type: opType.dataset.opType,
      amount: document.getElementById("f-amount").value,
      date: new Date(document.getElementById("f-date").value).getTime(),
      member: document.getElementById("f-member").value,
      note: document.getElementById("f-note").value
    };
    opForm(current.amount || current.id ? current : { type: current.type });
  }

  const catType = e.target.closest("[data-cat-type]");
  if (catType) {
    document.querySelectorAll("[data-cat-type]").forEach((b) => b.classList.toggle("on", b === catType));
    document.getElementById("f-type").value = catType.dataset.catType;
  }
  const emoji = e.target.closest("[data-emoji]");
  if (emoji) {
    document.querySelectorAll("[data-emoji]").forEach((b) => b.classList.toggle("on", b === emoji));
    document.getElementById("f-icon").value = emoji.dataset.emoji;
  }
  const color = e.target.closest("[data-color]");
  if (color) {
    document.querySelectorAll("[data-color]").forEach((b) => b.classList.toggle("on", b === color));
    document.getElementById("f-color").value = color.dataset.color;
  }

  if (e.target.id === "save-op") {
    const amount = parseMoney(document.getElementById("f-amount").value);
    const date = document.getElementById("f-date").value;
    const err = document.getElementById("form-error");
    if (!amount) { err.textContent = "Введите сумму"; return; }
    if (!date) { err.textContent = "Укажите дату"; return; }
    const type = document.querySelector("[data-op-type].on").dataset.opType;
    const item = {
      id: e.target.dataset.id || uid(),
      amount,
      categoryId: document.getElementById("f-cat").value,
      type,
      note: document.getElementById("f-note").value.trim(),
      member: document.getElementById("f-member").value.trim(),
      date: new Date(date).getTime()
    };
    const idx = state.ops.findIndex((o) => o.id === item.id);
    if (idx >= 0) state.ops[idx] = item; else state.ops.push(item);
    save(); closeSheet(); render();
  }

  if (e.target.id === "save-cat") {
    const name = document.getElementById("f-name").value.trim();
    if (!name) { document.getElementById("form-error").textContent = "Введите название"; return; }
    const current = state.categories.find((c) => c.id === e.target.dataset.id);
    const item = {
      id: e.target.dataset.id || uid(),
      name,
      type: current && current.locked ? current.type : document.getElementById("f-type").value,
      icon: document.getElementById("f-icon").value,
      color: document.getElementById("f-color").value,
      locked: !!(current && current.locked)
    };
    const idx = state.categories.findIndex((c) => c.id === item.id);
    if (idx >= 0) state.categories[idx] = item; else state.categories.push(item);
    save(); closeSheet(); render();
  }

  if (e.target.id === "save-pig") {
    const name = document.getElementById("f-name").value.trim();
    const goal = parseMoney(document.getElementById("f-goal").value);
    if (!name) { document.getElementById("form-error").textContent = "Введите название"; return; }
    if (!goal) { document.getElementById("form-error").textContent = "Укажите цель"; return; }
    const current = state.pigs.find((p) => p.id === e.target.dataset.id);
    const item = {
      id: e.target.dataset.id || uid(),
      name,
      goal,
      current: current ? current.current : 0,
      icon: document.getElementById("f-icon").value,
      color: document.getElementById("f-color").value,
      note: document.getElementById("f-note").value.trim()
    };
    const idx = state.pigs.findIndex((p) => p.id === item.id);
    if (idx >= 0) state.pigs[idx] = item; else state.pigs.push(item);
    save(); closeSheet(); render();
  }

  if (e.target.id === "save-move") {
    const amount = parseMoney(document.getElementById("f-amount").value);
    const pig = state.pigs.find((p) => p.id === e.target.dataset.id);
    const err = document.getElementById("form-error");
    if (!amount || !pig) { err.textContent = "Введите сумму"; return; }
    const take = e.target.dataset.take === "1";
    if (take && amount > pig.current) { err.textContent = "В копилке только " + money(pig.current); return; }
    pig.current = take ? Math.max(0, pig.current - amount) : pig.current + amount;
    const record = document.getElementById("f-record");
    if (!take && record && record.checked) {
      const savings = state.categories.find((c) => c.name === "Накопления") || state.categories.find((c) => c.type === "EXPENSE");
      state.ops.push({
        id: uid(),
        amount,
        categoryId: savings.id,
        type: "EXPENSE",
        note: "В копилку «" + pig.name + "»",
        member: "",
        date: Date.now()
      });
    }
    save(); closeSheet(); render();
  }
});

document.getElementById("agreement-check").addEventListener("change", (e) => {
  document.getElementById("accept-agreement").disabled = !e.target.checked;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}

render();

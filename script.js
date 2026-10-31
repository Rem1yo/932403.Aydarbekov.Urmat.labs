const SKILLS_KEY = "travel-skills";
const THEME_KEY = "travel-theme";
const DEFAULT_SKILLS = [
  "Планирование маршрута",
  "Русский язык",
  "Кыргызский язык",
  "Английский язык"
];

function findById(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.log("Элемент не найден: #" + id);
  }
  return element;
}

function findOne(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    console.log("Элемент не найден: " + selector);
  }
  return element;
}

function readFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch (error) {
    console.log("Не удалось прочитать localStorage (" + key + "): " + error.message);
    return null;
  }
}

function writeToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.log("Не удалось записать в localStorage (" + key + "): " + error.message);
  }
}

function createSkillItem(name) {
  const item = document.createElement("li");

  const text = document.createElement("span");
  text.className = "skill-name";
  // textContent, а не innerHTML: название вводит пользователь
  text.textContent = name;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-btn";
  deleteButton.textContent = "Удалить";
  deleteButton.addEventListener("click", function () {
    item.remove();
    saveSkills();
  });

  item.appendChild(text);
  item.appendChild(deleteButton);
  return item;
}

function saveSkills() {
  const list = findById("skills-list");
  if (!list) {
    return;
  }

  const names = [];
  const nameElements = list.querySelectorAll(".skill-name");
  for (let i = 0; i < nameElements.length; i++) {
    names.push(nameElements[i].textContent);
  }
  writeToStorage(SKILLS_KEY, names);
}

function loadSkills() {
  const list = findById("skills-list");
  if (!list) {
    return;
  }

  const saved = readFromStorage(SKILLS_KEY);
  // пустой массив - это тоже сохранённое состояние (навыки очистили), его нельзя заменять списком по умолчанию
  const names = Array.isArray(saved) ? saved : DEFAULT_SKILLS;

  for (let i = 0; i < names.length; i++) {
    if (typeof names[i] === "string") {
      list.appendChild(createSkillItem(names[i]));
    }
  }
}

function addSkill() {
  const list = findById("skills-list");
  if (!list) {
    return;
  }

  const answer = prompt("Название навыка:");
  if (answer === null) {
    return;
  }

  const name = answer.trim();
  if (name === "") {
    alert("Название навыка не может быть пустым");
    return;
  }

  list.appendChild(createSkillItem(name));
  saveSkills();
}

function clearSkills() {
  const list = findById("skills-list");
  if (!list) {
    return;
  }

  const items = list.querySelectorAll("li");
  if (items.length === 0) {
    alert("Навыки уже удалены");
    return;
  }

  for (let i = 0; i < items.length; i++) {
    items[i].remove();
  }
  saveSkills();
}

function toggleSkillsVisibility() {
  const section = findOne("#skills");
  const button = findById("toggle-skills-btn");
  if (!section || !button) {
    return;
  }

  const isHidden = section.classList.toggle("invisible");
  button.textContent = isHidden ? "Показать список навыков" : "Скрыть список навыков";
}

function applyTheme(theme) {
  const body = findOne("body");
  const button = findById("theme-btn");
  if (!body || !button) {
    return;
  }

  const isDark = theme === "dark";
  body.classList.toggle("dark", isDark);
  button.textContent = isDark ? "Светлая тема" : "Тёмная тема";
}

function toggleTheme() {
  const body = findOne("body");
  if (!body) {
    return;
  }

  const nextTheme = body.classList.contains("dark") ? "light" : "dark";
  applyTheme(nextTheme);
  writeToStorage(THEME_KEY, nextTheme);
}

function bindClick(id, handler) {
  const button = findById(id);
  if (!button) {
    return;
  }
  button.addEventListener("click", handler);
}

function init() {
  loadSkills();
  applyTheme(readFromStorage(THEME_KEY));

  bindClick("add-skill-btn", addSkill);
  bindClick("clear-skills-btn", clearSkills);
  bindClick("toggle-skills-btn", toggleSkillsVisibility);
  bindClick("theme-btn", toggleTheme);
}

init();

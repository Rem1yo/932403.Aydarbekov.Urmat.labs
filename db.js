const Database = require("better-sqlite3");
const path = require("path");

const dbFile = process.env.DB_FILE || path.join(__dirname, "catalog.db");
const db = new Database(dbFile);

// без этого SQLite не проверяет внешние ключи
db.pragma("foreign_keys = ON");

// LIKE в SQLite не различает регистр только для английских букв,
// поэтому для поиска по русским названиям приводим текст к нижнему регистру сами
db.function("lower_text", { deterministic: true }, (text) => String(text).toLowerCase());

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    name TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL CHECK (stock >= 0),
    description TEXT NOT NULL DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
`);

const categoriesCount = db.prepare("SELECT COUNT(*) AS total FROM categories").get().total;

function fillDemoData() {
  const addCategory = db.prepare("INSERT INTO categories (name) VALUES (?)");
  const addProduct = db.prepare(
    "INSERT INTO products (category_id, name, price, stock, description) VALUES (?, ?, ?, ?, ?)"
  );

  const bags = addCategory.run("Рюкзаки и сумки").lastInsertRowid;
  const camping = addCategory.run("Палатки и спальники").lastInsertRowid;
  const electronics = addCategory.run("Электроника").lastInsertRowid;
  const books = addCategory.run("Карты и книги").lastInsertRowid;

  addProduct.run(bags, "Рюкзак туристический 60 л", 3500, 12, "Вместительный рюкзак для походов на несколько дней.");
  addProduct.run(bags, "Поясная сумка", 900, 25, "Небольшая сумка для документов и денег.");
  addProduct.run(bags, "Городской рюкзак 20 л", 2100, 18, "Лёгкий рюкзак для коротких поездок.");
  addProduct.run(bags, "Герметичный мешок 10 л", 650, 40, "Защищает вещи от воды.");
  addProduct.run(camping, "Палатка двухместная", 7200, 5, "Двухслойная палатка для двоих.");
  addProduct.run(camping, "Спальный мешок", 2800, 8, "Тёплый спальный мешок для прохладных ночей.");
  addProduct.run(camping, "Коврик туристический", 1200, 15, "Лёгкий коврик, который быстро складывается.");
  addProduct.run(camping, "Палатка четырёхместная", 11900, 0, "Просторная палатка для компании.");
  addProduct.run(electronics, "Внешний аккумулятор 20000 мАч", 1500, 30, "Хватает на несколько зарядок телефона.");
  addProduct.run(electronics, "Налобный фонарь", 800, 22, "Освобождает руки в тёмное время.");
  addProduct.run(electronics, "Универсальный переходник для розетки", 450, 60, "Подходит для разных типов розеток.");
  addProduct.run(electronics, "Экшн-камера", 6900, 4, "Компактная камера для съёмки в поездках.");
  addProduct.run(books, "Карта Иссык-Куля", 350, 100, "Бумажная карта побережья озера.");
  addProduct.run(books, "Кыргызско-русский разговорник", 420, 35, "Самые нужные фразы для поездки.");
  addProduct.run(books, "Путеводитель по Японии", 780, 10, "Маршруты, транспорт и советы туристам.");
}

// в одной транзакции: если что-то сломается посреди заполнения, не останется половины данных
if (categoriesCount === 0) {
  db.transaction(fillDemoData)();
}

module.exports = db;

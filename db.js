const Database = require("better-sqlite3");
const path = require("path");

const dbFile = process.env.DB_FILE || path.join(__dirname, "shop.db");
const db = new Database(dbFile);

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL
  )
`);

const count = db.prepare("SELECT COUNT(*) AS total FROM products").get().total;

if (count === 0) {
  const insert = db.prepare("INSERT INTO products (name, price, stock) VALUES (?, ?, ?)");
  insert.run("Рюкзак туристический", 3500, 12);
  insert.run("Палатка двухместная", 7200, 5);
  insert.run("Спальный мешок", 2800, 8);
  insert.run("Внешний аккумулятор", 1500, 30);
  insert.run("Карта Иссык-Куля", 350, 100);
}

module.exports = db;

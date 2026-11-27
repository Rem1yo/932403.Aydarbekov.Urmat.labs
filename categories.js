const db = require("./db");

// LEFT JOIN, чтобы категория без товаров тоже попала в список (с нулём товаров)
function getCategories() {
  return db
    .prepare(
      `SELECT c.id, c.name, COUNT(p.id) AS productsCount
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    )
    .all();
}

function categoryExists(id) {
  return db.prepare("SELECT 1 FROM categories WHERE id = ?").get(id) !== undefined;
}

module.exports = { getCategories, categoryExists };

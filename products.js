const db = require("./db");

function getAllProducts(minPrice, maxPrice) {
  return db
    .prepare("SELECT * FROM products WHERE price BETWEEN ? AND ? ORDER BY id")
    .all(minPrice, maxPrice);
}

function getProductById(id) {
  return db.prepare("SELECT * FROM products WHERE id = ?").get(id);
}

function createProduct(name, price, stock) {
  const result = db
    .prepare("INSERT INTO products (name, price, stock) VALUES (?, ?, ?)")
    .run(name, price, stock);
  return getProductById(result.lastInsertRowid);
}

function updateStock(id, stock) {
  db.prepare("UPDATE products SET stock = ? WHERE id = ?").run(stock, id);
  return getProductById(id);
}

function deleteProduct(id) {
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(id);
  return result.changes > 0;
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateStock,
  deleteProduct
};

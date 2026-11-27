const db = require("./db");

// JOIN нужен, чтобы вместе с товаром получить название его категории
const SELECT_PRODUCTS = `
  SELECT
    p.id,
    p.name,
    p.price,
    p.stock,
    p.description,
    p.category_id AS categoryId,
    c.name AS categoryName
  FROM products p
  JOIN categories c ON c.id = p.category_id
`;

// в LIKE символы % и _ особенные, поэтому экранируем их, чтобы искать как обычный текст
function escapeLike(text) {
  return text.replace(/[\\%_]/g, "\\$&");
}

function getProducts(filters) {
  const conditions = [];
  const params = [];

  if (filters.categoryId !== null) {
    conditions.push("p.category_id = ?");
    params.push(filters.categoryId);
  }
  if (filters.minPrice !== null) {
    conditions.push("p.price >= ?");
    params.push(filters.minPrice);
  }
  if (filters.maxPrice !== null) {
    conditions.push("p.price <= ?");
    params.push(filters.maxPrice);
  }
  if (filters.search !== "") {
    conditions.push("lower_text(p.name) LIKE ? ESCAPE '\\'");
    params.push("%" + escapeLike(filters.search.toLowerCase()) + "%");
  }

  const where = conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";
  const offset = (filters.page - 1) * filters.limit;

  const total = db
    .prepare("SELECT COUNT(*) AS total FROM products p" + where)
    .get(...params).total;

  const items = db
    .prepare(SELECT_PRODUCTS + where + " ORDER BY p.id LIMIT ? OFFSET ?")
    .all(...params, filters.limit, offset);

  return { items, total };
}

function getProductById(id) {
  return db.prepare(SELECT_PRODUCTS + " WHERE p.id = ?").get(id);
}

function createProduct(data) {
  const result = db
    .prepare(
      "INSERT INTO products (category_id, name, price, stock, description) VALUES (?, ?, ?, ?, ?)"
    )
    .run(data.categoryId, data.name, data.price, data.stock, data.description);
  return getProductById(result.lastInsertRowid);
}

function updateProduct(id, data) {
  db.prepare(
    "UPDATE products SET category_id = ?, name = ?, price = ?, stock = ?, description = ? WHERE id = ?"
  ).run(data.categoryId, data.name, data.price, data.stock, data.description, id);
  return getProductById(id);
}

function deleteProduct(id) {
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(id);
  return result.changes > 0;
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};

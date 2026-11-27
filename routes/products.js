const express = require("express");
const products = require("../products");
const { validateProductData, parseFilters } = require("../validation");

const router = express.Router();

const PRODUCT_NOT_FOUND = "Товар не найден";

// id это только цифры: так "1e2" или "0x10" не превратятся в число 100 или 16
function getId(req) {
  return /^\d+$/.test(req.params.id) ? Number(req.params.id) : null;
}

function sendBadRequest(res, message) {
  res.status(400).json({ error: message });
}

router.get("/", (req, res) => {
  const result = parseFilters(req.query);
  if (result.error) {
    return sendBadRequest(res, result.error);
  }

  const filters = result.filters;
  const found = products.getProducts(filters);

  res.json({
    items: found.items,
    total: found.total,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(found.total / filters.limit)
  });
});

router.get("/:id", (req, res) => {
  const id = getId(req);
  const product = id === null ? undefined : products.getProductById(id);
  if (!product) {
    return res.status(404).json({ error: PRODUCT_NOT_FOUND });
  }

  res.json(product);
});

router.post("/", (req, res) => {
  const result = validateProductData(req.body);
  if (result.error) {
    return sendBadRequest(res, result.error);
  }

  res.status(201).json(products.createProduct(result.data));
});

router.put("/:id", (req, res) => {
  const id = getId(req);
  if (id === null || !products.getProductById(id)) {
    return res.status(404).json({ error: PRODUCT_NOT_FOUND });
  }

  const result = validateProductData(req.body);
  if (result.error) {
    return sendBadRequest(res, result.error);
  }

  res.json(products.updateProduct(id, result.data));
});

router.delete("/:id", (req, res) => {
  const id = getId(req);
  if (id === null || !products.deleteProduct(id)) {
    return res.status(404).json({ error: PRODUCT_NOT_FOUND });
  }

  res.json({ message: "Товар удалён" });
});

module.exports = router;

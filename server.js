const express = require("express");
const path = require("path");
const products = require("./products");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

function addZero(number) {
  return String(number).padStart(2, "0");
}

function isValidPrice(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isValidStock(value) {
  return Number.isInteger(value) && value >= 0;
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("/api/time", (req, res) => {
  try {
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const is12h = req.query.format === "12";

    let hours = now.getHours();
    let suffix = "";
    if (is12h) {
      suffix = hours >= 12 ? " PM" : " AM";
      hours = hours % 12;
      if (hours === 0) {
        hours = 12;
      }
    }

    const time =
      addZero(hours) + ":" + addZero(now.getMinutes()) + ":" + addZero(now.getSeconds()) + suffix;

    res.json({
      time: time,
      timezone: timezone,
      format: is12h ? "12h" : "24h"
    });
  } catch (error) {
    console.log("Ошибка в /api/time:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/products", (req, res) => {
  let minPrice = 0;
  let maxPrice = Number.MAX_SAFE_INTEGER;

  if (req.query.minPrice !== undefined) {
    minPrice = Number(req.query.minPrice);
  }
  if (req.query.maxPrice !== undefined) {
    maxPrice = Number(req.query.maxPrice);
  }

  if (Number.isNaN(minPrice) || Number.isNaN(maxPrice) || minPrice < 0 || maxPrice < 0) {
    return res.status(400).json({ error: "minPrice and maxPrice must be numbers >= 0" });
  }

  res.json(products.getAllProducts(minPrice, maxPrice));
});

app.post("/api/products", (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (name === "") {
    return res.status(400).json({ error: "Name is required" });
  }
  if (!isValidPrice(body.price)) {
    return res.status(400).json({ error: "Price must be a number >= 0" });
  }
  if (!isValidStock(body.stock)) {
    return res.status(400).json({ error: "Stock must be an integer >= 0" });
  }

  const created = products.createProduct(name, body.price, body.stock);
  res.status(201).json(created);
});

app.patch("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || !products.getProductById(id)) {
    return res.status(404).json({ error: "Product not found" });
  }

  const body = req.body || {};
  const fields = Object.keys(body);
  if (fields.length !== 1 || fields[0] !== "stock") {
    return res.status(400).json({ error: "Only stock can be changed" });
  }
  if (!isValidStock(body.stock)) {
    return res.status(400).json({ error: "Stock must be an integer >= 0" });
  }

  res.json(products.updateStock(id, body.stock));
});

app.delete("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || !products.deleteProduct(id)) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json({ message: "Product deleted" });
});

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  res.status(404).send("Страница не найдена");
});

app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  console.log("Ошибка сервера:", error.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, (error) => {
  if (error) {
    console.log("Не удалось запустить сервер:", error.message);
    return;
  }
  console.log(`Server started on port ${PORT}`);
});

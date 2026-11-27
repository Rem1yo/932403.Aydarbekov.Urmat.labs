const express = require("express");
const path = require("path");
const productsRouter = require("./routes/products");
const categoriesRouter = require("./routes/categories");

const app = express();

function addZero(number) {
  return String(number).padStart(2, "0");
}

function sendPage(fileName) {
  return (req, res) => {
    res.sendFile(path.join(__dirname, "public", fileName));
  };
}

app.use(express.json());

app.get("/", sendPage("index.html"));
app.get("/about", sendPage("about.html"));
app.get("/shop", sendPage("shop.html"));

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

app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Маршрут не найден" });
});

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  res.status(404).send("Страница не найдена");
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Некорректный JSON" });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Слишком большой запрос" });
  }
  console.log("Ошибка сервера:", error.message);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

module.exports = app;

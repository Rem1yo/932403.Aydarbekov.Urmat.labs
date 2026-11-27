const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

function addZero(number) {
  return String(number).padStart(2, "0");
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

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  res.status(404).send("Страница не найдена");
});

app.listen(PORT, (error) => {
  if (error) {
    console.log("Не удалось запустить сервер:", error.message);
    return;
  }
  console.log(`Server started on port ${PORT}`);
});

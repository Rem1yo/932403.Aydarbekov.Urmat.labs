const app = require("./app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, (error) => {
  if (error) {
    console.log("Не удалось запустить сервер:", error.message);
    return;
  }
  console.log(`Server started on port ${PORT}`);
});

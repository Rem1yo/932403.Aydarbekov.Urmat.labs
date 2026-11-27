const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

// тесты работают на временной базе, чтобы не трогать catalog.db
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-test-"));
process.env.DB_FILE = path.join(tempDir, "test.db");

const app = require("./app");
const db = require("./db");
const {
  NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  MAX_PAGE_SIZE,
  MAX_PAGE,
  MAX_PRICE,
  MAX_STOCK
} = require("./validation");

let server;
let baseUrl;

test.before(() => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = "http://localhost:" + server.address().port;
      resolve();
    });
  });
});

test.after(() => {
  server.close();
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

async function request(method, url, body) {
  const options = { method: method, headers: {} };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const response = await fetch(baseUrl + url, options);
  const data = await response.json();
  return { status: response.status, data: data };
}

function newProduct(changes) {
  return Object.assign(
    { name: "Тестовый товар", price: 100, stock: 5, categoryId: 1, description: "Описание" },
    changes
  );
}

test("список товаров: по умолчанию первая страница из 6 товаров", async () => {
  const { status, data } = await request("GET", "/api/products");
  assert.strictEqual(status, 200);
  assert.strictEqual(data.items.length, 6);
  assert.strictEqual(data.total, 15);
  assert.strictEqual(data.page, 1);
  assert.strictEqual(data.limit, 6);
  assert.strictEqual(data.totalPages, 3);
  assert.ok(data.items[0].categoryName, "в товаре есть название категории из JOIN");
});

test("пагинация: границы page и limit", async () => {
  const cases = [
    { url: "/api/products?page=1", status: 200 },
    { url: "/api/products?page=3", status: 200 },
    { url: "/api/products?page=0", status: 400 },
    { url: "/api/products?page=-1", status: 400 },
    { url: "/api/products?page=1.5", status: 400 },
    { url: "/api/products?page=" + MAX_PAGE, status: 200 },
    { url: "/api/products?page=" + (MAX_PAGE + 1), status: 400 },
    { url: "/api/products?page=1e21", status: 400 },
    { url: "/api/products?page=abc", status: 400 },
    { url: "/api/products?limit=1", status: 200 },
    { url: "/api/products?limit=" + MAX_PAGE_SIZE, status: 200 },
    { url: "/api/products?limit=0", status: 400 },
    { url: "/api/products?limit=" + (MAX_PAGE_SIZE + 1), status: 400 }
  ];
  for (const item of cases) {
    const { status } = await request("GET", item.url);
    assert.strictEqual(status, item.status, item.url);
  }
});

test("пагинация: страницы не пересекаются, после последней пусто", async () => {
  const first = await request("GET", "/api/products?limit=6&page=1");
  const third = await request("GET", "/api/products?limit=6&page=3");
  const beyond = await request("GET", "/api/products?limit=6&page=4");
  assert.strictEqual(third.data.items.length, 3);
  assert.strictEqual(beyond.status, 200);
  assert.deepStrictEqual(beyond.data.items, []);
  const firstIds = first.data.items.map((p) => p.id);
  assert.ok(third.data.items.every((p) => !firstIds.includes(p.id)));
});

test("фильтр по цене: границы включаются", async () => {
  const exact = await request("GET", "/api/products?minPrice=350&maxPrice=350");
  assert.strictEqual(exact.data.total, 1);
  assert.strictEqual(exact.data.items[0].price, 350);

  const below = await request("GET", "/api/products?maxPrice=349.99");
  assert.strictEqual(below.data.total, 0);

  const above = await request("GET", "/api/products?minPrice=11900.01");
  assert.strictEqual(above.data.total, 0);

  const onlyMin = await request("GET", "/api/products?minPrice=7200&limit=50");
  assert.deepStrictEqual(
    onlyMin.data.items.map((p) => p.price).sort((a, b) => a - b),
    [7200, 11900]
  );
});

test("фильтр по цене: неверные значения", async () => {
  const urls = [
    "/api/products?minPrice=-1",
    "/api/products?maxPrice=-0.01",
    "/api/products?minPrice=abc",
    "/api/products?maxPrice=1e999",
    "/api/products?minPrice=500&maxPrice=100"
  ];
  for (const url of urls) {
    const { status, data } = await request("GET", url);
    assert.strictEqual(status, 400, url);
    assert.ok(data.error);
  }
  const zero = await request("GET", "/api/products?minPrice=0");
  assert.strictEqual(zero.status, 200);
});

test("фильтр по категории", async () => {
  const { data } = await request("GET", "/api/products?category=3&limit=50");
  assert.strictEqual(data.total, 4);
  assert.ok(data.items.every((p) => p.categoryId === 3));

  const missing = await request("GET", "/api/products?category=999");
  assert.strictEqual(missing.status, 200);
  assert.strictEqual(missing.data.total, 0);

  for (const url of ["/api/products?category=0", "/api/products?category=abc", "/api/products?category=1.5"]) {
    const { status } = await request("GET", url);
    assert.strictEqual(status, 400, url);
  }
});

test("поиск по названию: без учёта регистра, в том числе для русских букв", async () => {
  const lower = await request("GET", "/api/products?search=" + encodeURIComponent("рюкзак"));
  assert.strictEqual(lower.data.total, 2);

  const upper = await request("GET", "/api/products?search=" + encodeURIComponent("РЮКЗАК"));
  assert.strictEqual(upper.data.total, 2);

  const none = await request("GET", "/api/products?search=" + encodeURIComponent("такого нет"));
  assert.strictEqual(none.data.total, 0);
});

test("поиск: % и _ ищутся как обычные символы", async () => {
  const percent = await request("GET", "/api/products?search=" + encodeURIComponent("%"));
  assert.strictEqual(percent.data.total, 0);
  const underscore = await request("GET", "/api/products?search=" + encodeURIComponent("_"));
  assert.strictEqual(underscore.data.total, 0);
});

test("поиск: слишком длинный запрос", async () => {
  const ok = await request("GET", "/api/products?search=" + "a".repeat(NAME_MAX_LENGTH));
  assert.strictEqual(ok.status, 200);
  const tooLong = await request("GET", "/api/products?search=" + "a".repeat(NAME_MAX_LENGTH + 1));
  assert.strictEqual(tooLong.status, 400);
});

test("фильтры работают вместе", async () => {
  const url = "/api/products?category=2&minPrice=1000&maxPrice=3000&search=" + encodeURIComponent("мешок");
  const { data } = await request("GET", url);
  assert.strictEqual(data.total, 1);
  assert.strictEqual(data.items[0].name, "Спальный мешок");
});

test("категории: список с количеством товаров", async () => {
  const { status, data } = await request("GET", "/api/categories");
  assert.strictEqual(status, 200);
  assert.strictEqual(data.length, 4);
  const total = data.reduce((sum, category) => sum + category.productsCount, 0);
  assert.strictEqual(total, 15);
});

test("создание товара: граничные значения цены и остатка", async () => {
  const zero = await request("POST", "/api/products", newProduct({ price: 0, stock: 0 }));
  assert.strictEqual(zero.status, 201);
  assert.strictEqual(zero.data.price, 0);
  assert.strictEqual(zero.data.stock, 0);

  const bad = [
    { price: -0.01 },
    { price: "10" },
    { price: null },
    { price: undefined },
    { stock: -1 },
    { stock: 1.5 },
    { stock: "5" },
    { stock: undefined }
  ];
  for (const changes of bad) {
    const { status, data } = await request("POST", "/api/products", newProduct(changes));
    assert.strictEqual(status, 400, JSON.stringify(changes));
    assert.ok(data.error);
  }
});

test("создание товара: граничные значения названия и описания", async () => {
  const maxName = await request("POST", "/api/products", newProduct({ name: "я".repeat(NAME_MAX_LENGTH) }));
  assert.strictEqual(maxName.status, 201);

  const longName = await request("POST", "/api/products", newProduct({ name: "я".repeat(NAME_MAX_LENGTH + 1) }));
  assert.strictEqual(longName.status, 400);

  for (const name of ["", "   ", undefined, 123]) {
    const { status } = await request("POST", "/api/products", newProduct({ name: name }));
    assert.strictEqual(status, 400, String(name));
  }

  const maxDescription = await request(
    "POST",
    "/api/products",
    newProduct({ description: "а".repeat(DESCRIPTION_MAX_LENGTH) })
  );
  assert.strictEqual(maxDescription.status, 201);

  const longDescription = await request(
    "POST",
    "/api/products",
    newProduct({ description: "а".repeat(DESCRIPTION_MAX_LENGTH + 1) })
  );
  assert.strictEqual(longDescription.status, 400);

  const noDescription = await request("POST", "/api/products", newProduct({ description: undefined }));
  assert.strictEqual(noDescription.status, 201);
  assert.strictEqual(noDescription.data.description, "");

  const trimmed = await request("POST", "/api/products", newProduct({ name: "  Фонарь  " }));
  assert.strictEqual(trimmed.data.name, "Фонарь");
});

test("создание товара: категория проверяется", async () => {
  for (const categoryId of [999, 0, -1, "1", 1.5, null, undefined]) {
    const { status } = await request("POST", "/api/products", newProduct({ categoryId: categoryId }));
    assert.strictEqual(status, 400, String(categoryId));
  }
});

test("создание товара: пустое тело и битый JSON", async () => {
  const empty = await request("POST", "/api/products");
  assert.strictEqual(empty.status, 400);
  const broken = await request("POST", "/api/products", "{bad json");
  assert.strictEqual(broken.status, 400);
  assert.strictEqual(broken.data.error, "Некорректный JSON");
});

test("цена и остаток: верхние границы и копейки", async () => {
  const good = [
    { price: MAX_PRICE, stock: MAX_STOCK },
    { price: 990.5, stock: 1 },
    { price: 19.99, stock: 1 },
    { price: 0.01, stock: 1 }
  ];
  for (const changes of good) {
    const { status } = await request("POST", "/api/products", newProduct(changes));
    assert.strictEqual(status, 201, JSON.stringify(changes));
  }

  const bad = [
    { price: MAX_PRICE + 1 },
    { price: 1e308 },
    { price: 10.999 },
    { price: 0.001 },
    { stock: MAX_STOCK + 1 },
    { stock: 1e21 }
  ];
  for (const changes of bad) {
    const { status } = await request("POST", "/api/products", newProduct(changes));
    assert.strictEqual(status, 400, JSON.stringify(changes));
  }
});

test("слишком большое тело запроса даёт 413, а не 500", async () => {
  const { status, data } = await request("POST", "/api/products", newProduct({ description: "а".repeat(200000) }));
  assert.strictEqual(status, 413);
  assert.ok(data.error);
});

test("XSS: API хранит опасный текст без изменений (экранирует страница через textContent)", async () => {
  const text = "<script>alert(1)</script>";
  const created = await request("POST", "/api/products", newProduct({ name: text, description: text }));
  assert.strictEqual(created.status, 201);
  const loaded = await request("GET", "/api/products/" + created.data.id);
  assert.strictEqual(loaded.data.name, text);
});

test("получение, изменение и удаление товара", async () => {
  const created = await request("POST", "/api/products", newProduct({ name: "Для изменения" }));
  const id = created.data.id;

  const loaded = await request("GET", "/api/products/" + id);
  assert.strictEqual(loaded.status, 200);
  assert.strictEqual(loaded.data.name, "Для изменения");

  const updated = await request("PUT", "/api/products/" + id, newProduct({ name: "Изменён", price: 0, stock: 0, categoryId: 2 }));
  assert.strictEqual(updated.status, 200);
  assert.strictEqual(updated.data.name, "Изменён");
  assert.strictEqual(updated.data.categoryId, 2);

  const invalid = await request("PUT", "/api/products/" + id, newProduct({ price: -1 }));
  assert.strictEqual(invalid.status, 400);
  const after = await request("GET", "/api/products/" + id);
  assert.strictEqual(after.data.price, 0, "после ошибки товар не изменился");

  const deleted = await request("DELETE", "/api/products/" + id);
  assert.strictEqual(deleted.status, 200);
  const again = await request("DELETE", "/api/products/" + id);
  assert.strictEqual(again.status, 404);
  const gone = await request("GET", "/api/products/" + id);
  assert.strictEqual(gone.status, 404);
});

test("несуществующий или неверный id даёт 404", async () => {
  for (const id of ["999999", "0", "-1", "abc", "1.5", "1e2", "0x10", "%201"]) {
    assert.strictEqual((await request("GET", "/api/products/" + id)).status, 404, "GET " + id);
    assert.strictEqual((await request("PUT", "/api/products/" + id, newProduct())).status, 404, "PUT " + id);
    assert.strictEqual((await request("DELETE", "/api/products/" + id)).status, 404, "DELETE " + id);
  }
});

test("изменение товара: несуществующая категория даёт 400", async () => {
  const created = await request("POST", "/api/products", newProduct({ name: "Для категории" }));
  const { status } = await request("PUT", "/api/products/" + created.data.id, newProduct({ categoryId: 999 }));
  assert.strictEqual(status, 400);
});

test("неизвестный маршрут API даёт 404 в формате JSON", async () => {
  const { status, data } = await request("GET", "/api/unknown");
  assert.strictEqual(status, 404);
  assert.ok(data.error);
});

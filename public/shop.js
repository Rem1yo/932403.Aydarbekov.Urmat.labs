const CART_KEY = "catalog-cart";
const PAGE_SIZE = 6;
// эти пределы должны совпадать с validation.js на сервере
const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;
const MAX_PRICE = 1000000000;
const MAX_STOCK = 1000000;
const PAGES_AROUND_CURRENT = 2;
const SUCCESS_MESSAGE_TIME = 4000;

const productList = document.getElementById("product-list");
const catalogTotal = document.getElementById("catalog-total");
const messageBox = document.getElementById("message");
const paginationBox = document.getElementById("pagination");
const filtersForm = document.getElementById("filters-form");
const filterCategory = document.getElementById("filter-category");
const productCategory = document.getElementById("product-category");
const productForm = document.getElementById("product-form");
const productDialog = document.getElementById("product-dialog");
const detailsDialog = document.getElementById("details-dialog");
const formError = document.getElementById("form-error");
const saveButton = document.getElementById("product-save-btn");

let currentPage = 1;
let currentFilters = { search: "", category: "", minPrice: "", maxPrice: "" };
let shownProducts = [];
let cart = {};
let editingProductId = null;
let deletingProductId = null;
let isDeleting = false;
let lastRequestId = 0;
let messageTimer = null;

// ---------- запросы к серверу ----------

function getErrorMessage(status, data) {
  if (status === 400 && data && data.error) {
    return data.error;
  }
  if (status === 404) {
    return "Товар не найден. Возможно, его уже удалили.";
  }
  if (status >= 500) {
    return "Ошибка сервера. Попробуйте позже.";
  }
  return "Не удалось выполнить запрос (код " + status + ").";
}

async function apiRequest(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new Error("Нет связи с сервером. Проверьте подключение к интернету.");
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(response.status, data));
  }
  return data;
}

function sendJson(method, url, body) {
  return apiRequest(url, {
    method: method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

// ---------- сообщения ----------

// блок сообщений всегда есть в разметке и объявлен живой областью (aria-live),
// поэтому скринридер зачитывает любой новый текст в нём
function showMessage(text, isError) {
  clearTimeout(messageTimer);
  messageBox.textContent = text;
  messageBox.classList.toggle("message-error", isError);

  if (!isError) {
    messageTimer = setTimeout(hideMessage, SUCCESS_MESSAGE_TIME);
  }
}

function hideMessage() {
  messageBox.textContent = "";
}

function showFormError(text) {
  formError.textContent = text;
  formError.hidden = false;
}

// ---------- вспомогательные функции ----------

function formatPrice(price) {
  // целые цены без копеек, дробные всегда с двумя знаками: 1 290,50 ₽
  const fractionDigits = Number.isInteger(price) ? 0 : 2;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(price);
}

function getStockText(stock) {
  return stock > 0 ? "В наличии: " + stock + " шт." : "Нет в наличии";
}

function createButton(text, className, label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", onClick);
  return button;
}

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  // textContent, а не innerHTML: название и описание вводят пользователи
  element.textContent = text;
  return element;
}

// ---------- корзина (имитация) ----------

function loadCart() {
  const saved = readFromStorage(CART_KEY);
  cart = {};
  if (saved === null || typeof saved !== "object") {
    return;
  }
  for (const id of Object.keys(saved)) {
    if (Number.isInteger(saved[id]) && saved[id] > 0) {
      cart[id] = saved[id];
    }
  }
}

function saveCart() {
  writeToStorage(CART_KEY, cart);
}

function updateCartCount() {
  let total = 0;
  for (const id of Object.keys(cart)) {
    total += cart[id];
  }
  document.getElementById("cart-count").textContent = total;
}

// если остаток уменьшили, в корзине не может лежать больше, чем есть на складе
function fitCartToStock(items) {
  for (const product of items) {
    if (cart[product.id] > product.stock) {
      cart[product.id] = product.stock;
    }
    if (cart[product.id] === 0) {
      delete cart[product.id];
    }
  }
  saveCart();
  updateCartCount();
}

// после перерисовки старая кнопка исчезает, и фокус клавиатуры терялся:
// возвращаем его на первую найденную кнопку из списка подписей
function focusButton(labels) {
  // сравниваем подписи в коде, а не через селектор: в названии товара могут быть кавычки
  const buttons = [...document.querySelectorAll("button:not(:disabled)")];
  for (const label of labels) {
    const button = buttons.find((item) => item.getAttribute("aria-label") === label);
    if (button) {
      button.focus();
      return;
    }
  }
}

function addToCart(product) {
  const inCart = cart[product.id] || 0;
  if (inCart >= product.stock) {
    showMessage("На складе больше нет такого товара", true);
    return;
  }

  cart[product.id] = inCart + 1;
  saveCart();
  updateCartCount();
  showMessage("«" + product.name + "» добавлен в корзину", false);
  renderProducts(shownProducts);
  focusButton(["В корзину: " + product.name, "Подробнее: " + product.name]);
}

// ---------- карточки товаров ----------

function createDeleteControls(product) {
  const box = document.createElement("div");
  box.className = "delete-confirm";
  box.appendChild(createTextElement("span", "", "Удалить товар?"));
  box.appendChild(
    createButton("Да, удалить", "btn btn-danger", "Да, удалить: " + product.name, () =>
      deleteProduct(product.id)
    )
  );
  box.appendChild(
    createButton("Отмена", "btn btn-secondary", "Отмена: " + product.name, () => {
      deletingProductId = null;
      renderProducts(shownProducts);
      focusButton(["Удалить: " + product.name]);
    })
  );
  return box;
}

function createProductCard(product) {
  const card = document.createElement("li");
  card.className = "product-card";

  card.appendChild(createTextElement("h3", "product-name", product.name));
  card.appendChild(createTextElement("p", "product-category", product.categoryName));
  card.appendChild(createTextElement("p", "product-price", formatPrice(product.price)));
  card.appendChild(
    createTextElement("p", product.stock > 0 ? "product-stock" : "product-stock out-of-stock", getStockText(product.stock))
  );

  const actions = document.createElement("div");
  actions.className = "product-actions";

  const cartButton = createButton("В корзину", "btn", "В корзину: " + product.name, () =>
    addToCart(product)
  );
  if (product.stock === 0 || (cart[product.id] || 0) >= product.stock) {
    cartButton.disabled = true;
  }

  actions.appendChild(
    createButton("Подробнее", "btn btn-secondary", "Подробнее: " + product.name, () =>
      openDetails(product.id)
    )
  );
  actions.appendChild(cartButton);
  actions.appendChild(
    createButton("Изменить", "btn btn-secondary", "Изменить: " + product.name, () =>
      openProductForm(product)
    )
  );

  if (deletingProductId === product.id) {
    actions.appendChild(createDeleteControls(product));
  } else {
    actions.appendChild(
      createButton("Удалить", "btn btn-secondary", "Удалить: " + product.name, () => {
        deletingProductId = product.id;
        renderProducts(shownProducts);
        focusButton(["Да, удалить: " + product.name]);
      })
    );
  }

  card.appendChild(actions);
  return card;
}

function renderProducts(items, emptyText) {
  shownProducts = items;
  productList.replaceChildren();

  if (items.length === 0) {
    const text = emptyText || "Ничего не найдено. Измените фильтры.";
    productList.appendChild(createTextElement("li", "empty-list", text));
    return;
  }

  for (const product of items) {
    productList.appendChild(createProductCard(product));
  }
}

// ---------- пагинация ----------

async function goToPage(page) {
  currentPage = page;
  await loadProducts();

  // кнопка, на которую нажали, перерисована, поэтому ставим фокус на заголовок каталога
  const title = document.getElementById("catalog-title");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  title.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  title.focus({ preventScroll: true });
}

function createPageButton(text, page, label, isDisabled) {
  const button = createButton(text, "btn btn-secondary page-btn", label, () => goToPage(page));
  button.disabled = isDisabled;
  return button;
}

function renderPagination(page, totalPages) {
  paginationBox.replaceChildren();
  if (totalPages <= 1) {
    return;
  }

  paginationBox.appendChild(createPageButton("Назад", page - 1, "Назад, на предыдущую страницу", page === 1));

  const first = Math.max(1, page - PAGES_AROUND_CURRENT);
  const last = Math.min(totalPages, page + PAGES_AROUND_CURRENT);
  for (let number = first; number <= last; number++) {
    const button = createPageButton(String(number), number, "Страница " + number, false);
    if (number === page) {
      button.setAttribute("aria-current", "page");
      button.classList.add("page-current");
    }
    paginationBox.appendChild(button);
  }

  paginationBox.appendChild(
    createPageButton("Вперёд", page + 1, "Вперёд, на следующую страницу", page === totalPages)
  );
}

// ---------- загрузка данных ----------

function createOption(value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  return option;
}

function fillCategorySelects(categories) {
  const filterValue = filterCategory.value;
  const formValue = productCategory.value;

  filterCategory.replaceChildren();
  productCategory.replaceChildren();

  filterCategory.appendChild(createOption("", "Все категории"));
  productCategory.appendChild(createOption("", "Выберите категорию"));

  for (const category of categories) {
    filterCategory.appendChild(
      createOption(category.id, category.name + " (" + category.productsCount + ")")
    );
    productCategory.appendChild(createOption(category.id, category.name));
  }

  filterCategory.value = filterValue;
  if (formValue !== "") {
    productCategory.value = formValue;
  }
}

async function loadCategories() {
  try {
    fillCategorySelects(await apiRequest("/api/categories"));
  } catch (error) {
    showMessage("Не удалось загрузить категории. " + error.message, true);
  }
}

function buildQuery() {
  const params = new URLSearchParams({ page: currentPage, limit: PAGE_SIZE });
  for (const name of Object.keys(currentFilters)) {
    if (currentFilters[name] !== "") {
      params.set(name, currentFilters[name]);
    }
  }
  return params.toString();
}

async function loadProducts() {
  // если пользователь быстро нажал ещё раз, ответ более раннего запроса не должен перезаписать свежий
  const requestId = ++lastRequestId;
  productList.setAttribute("aria-busy", "true");
  try {
    const data = await apiRequest("/api/products?" + buildQuery());
    if (requestId !== lastRequestId) {
      return;
    }

    // удалили последний товар на последней странице, переходим на предыдущую
    if (data.items.length === 0 && data.total > 0 && currentPage > 1) {
      currentPage = data.totalPages;
      await loadProducts();
      return;
    }

    fitCartToStock(data.items);
    renderProducts(data.items);
    renderPagination(data.page, data.totalPages);
    catalogTotal.textContent = "Найдено товаров: " + data.total;
  } catch (error) {
    if (requestId !== lastRequestId) {
      return;
    }
    renderProducts([], "Не удалось загрузить товары.");
    renderPagination(1, 0);
    catalogTotal.textContent = "";
    showMessage(error.message, true);
  } finally {
    if (requestId === lastRequestId) {
      productList.setAttribute("aria-busy", "false");
    }
  }
}

async function refreshCatalog() {
  await Promise.all([loadCategories(), loadProducts()]);
}

// ---------- фильтры ----------

function handleFiltersSubmit(event) {
  event.preventDefault();

  const minPrice = document.getElementById("filter-min-price").value.trim();
  const maxPrice = document.getElementById("filter-max-price").value.trim();

  if ((minPrice !== "" && Number(minPrice) < 0) || (maxPrice !== "" && Number(maxPrice) < 0)) {
    showMessage("Цена не может быть отрицательной", true);
    return;
  }
  if (minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice)) {
    showMessage("Цена «от» больше цены «до»", true);
    return;
  }

  currentFilters = {
    search: document.getElementById("filter-search").value.trim(),
    category: filterCategory.value,
    minPrice: minPrice,
    maxPrice: maxPrice
  };
  currentPage = 1;
  hideMessage();
  loadProducts();
}

function resetFilters() {
  filtersForm.reset();
  currentFilters = { search: "", category: "", minPrice: "", maxPrice: "" };
  currentPage = 1;
  hideMessage();
  loadProducts();
}

// ---------- подробности товара ----------

async function openDetails(id) {
  try {
    const product = await apiRequest("/api/products/" + id);
    document.getElementById("details-title").textContent = product.name;
    document.getElementById("details-category").textContent = product.categoryName;
    document.getElementById("details-description").textContent =
      product.description === "" ? "Описания пока нет." : product.description;
    document.getElementById("details-price").textContent = formatPrice(product.price);
    document.getElementById("details-stock").textContent = getStockText(product.stock);
    detailsDialog.showModal();
  } catch (error) {
    showMessage(error.message, true);
    loadProducts();
  }
}

// ---------- форма товара ----------

function openProductForm(product) {
  editingProductId = product ? product.id : null;
  productForm.reset();
  formError.hidden = true;

  document.getElementById("product-dialog-title").textContent = product
    ? "Редактирование товара"
    : "Новый товар";

  if (product) {
    document.getElementById("product-name").value = product.name;
    productCategory.value = product.categoryId;
    document.getElementById("product-price").value = product.price;
    document.getElementById("product-stock").value = product.stock;
    document.getElementById("product-description").value = product.description;
  }

  productDialog.showModal();
}

function readProductForm() {
  return {
    name: document.getElementById("product-name").value.trim(),
    categoryValue: productCategory.value,
    priceValue: document.getElementById("product-price").value.trim(),
    stockValue: document.getElementById("product-stock").value.trim(),
    description: document.getElementById("product-description").value.trim()
  };
}

// возвращает текст ошибки или null, если всё верно
function validateProductForm(form) {
  if (form.name === "") {
    return "Введите название товара";
  }
  if (form.name.length > NAME_MAX_LENGTH) {
    return "Название не должно быть длиннее " + NAME_MAX_LENGTH + " символов";
  }
  if (form.categoryValue === "") {
    return "Выберите категорию";
  }
  const price = Number(form.priceValue);
  const isPriceValid =
    form.priceValue !== "" &&
    Number.isFinite(price) &&
    price >= 0 &&
    price <= MAX_PRICE &&
    Math.round(price * 100) / 100 === price;
  if (!isPriceValid) {
    return "Цена должна быть числом от 0 до " + MAX_PRICE + " не более чем с двумя знаками после запятой";
  }

  const stock = Number(form.stockValue);
  if (form.stockValue === "" || !Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) {
    return "Остаток должен быть целым числом от 0 до " + MAX_STOCK;
  }
  if (form.description.length > DESCRIPTION_MAX_LENGTH) {
    return "Описание не должно быть длиннее " + DESCRIPTION_MAX_LENGTH + " символов";
  }
  return null;
}

async function handleProductSubmit(event) {
  event.preventDefault();

  const form = readProductForm();
  const error = validateProductForm(form);
  if (error) {
    showFormError(error);
    return;
  }

  const product = {
    name: form.name,
    categoryId: Number(form.categoryValue),
    price: Number(form.priceValue),
    stock: Number(form.stockValue),
    description: form.description
  };

  saveButton.disabled = true;
  try {
    if (editingProductId === null) {
      await sendJson("POST", "/api/products", product);
      showMessage("Товар добавлен", false);
    } else {
      await sendJson("PUT", "/api/products/" + editingProductId, product);
      showMessage("Товар изменён", false);
    }
    productDialog.close();
    await refreshCatalog();
  } catch (error) {
    showFormError(error.message);
  } finally {
    saveButton.disabled = false;
  }
}

// ---------- удаление ----------

async function deleteProduct(id) {
  // защита от двойного клика: второй запрос получил бы 404 и затёр сообщение об успехе
  if (isDeleting) {
    return;
  }
  isDeleting = true;

  try {
    await apiRequest("/api/products/" + id, { method: "DELETE" });
    delete cart[id];
    saveCart();
    updateCartCount();
    showMessage("Товар удалён", false);
  } catch (error) {
    showMessage(error.message, true);
  }
  deletingProductId = null;
  isDeleting = false;
  await refreshCatalog();
}

// ---------- запуск ----------

function init() {
  document.body.classList.toggle("dark", readFromStorage(THEME_KEY) === "dark");

  loadCart();
  updateCartCount();

  filtersForm.addEventListener("submit", handleFiltersSubmit);
  document.getElementById("reset-filters-btn").addEventListener("click", resetFilters);
  document.getElementById("add-product-btn").addEventListener("click", () => openProductForm(null));
  productForm.addEventListener("submit", handleProductSubmit);
  document.getElementById("product-cancel-btn").addEventListener("click", () => productDialog.close());
  document.getElementById("details-close-btn").addEventListener("click", () => detailsDialog.close());

  refreshCatalog();
}

init();

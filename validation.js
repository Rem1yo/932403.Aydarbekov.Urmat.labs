const { categoryExists } = require("./categories");

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;
const DEFAULT_PAGE_SIZE = 6;
const MAX_PAGE_SIZE = 50;
const MAX_PAGE = 1000000;
const MAX_PRICE = 1000000000;
const MAX_STOCK = 1000000;

function isEmpty(value) {
  return value === undefined || value === "";
}

// возвращает число или null, если значение не подходит
function toNumber(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// число, не больше MAX_PRICE, копейки не дробятся дальше сотых
function isValidPrice(price) {
  return (
    typeof price === "number" &&
    Number.isFinite(price) &&
    price >= 0 &&
    price <= MAX_PRICE &&
    Math.round(price * 100) / 100 === price
  );
}

function validateProductData(body) {
  const input = body || {};

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name === "") {
    return { error: "Введите название товара" };
  }
  if (name.length > NAME_MAX_LENGTH) {
    return { error: "Название не должно быть длиннее " + NAME_MAX_LENGTH + " символов" };
  }

  if (!isValidPrice(input.price)) {
    return { error: "Цена должна быть числом от 0 до " + MAX_PRICE + " не более чем с двумя знаками после запятой" };
  }

  if (!Number.isInteger(input.stock) || input.stock < 0 || input.stock > MAX_STOCK) {
    return { error: "Остаток должен быть целым числом от 0 до " + MAX_STOCK };
  }

  if (!Number.isInteger(input.categoryId) || !categoryExists(input.categoryId)) {
    return { error: "Выберите существующую категорию" };
  }

  let description = "";
  if (input.description !== undefined) {
    if (typeof input.description !== "string") {
      return { error: "Описание должно быть текстом" };
    }
    description = input.description.trim();
    if (description.length > DESCRIPTION_MAX_LENGTH) {
      return { error: "Описание не должно быть длиннее " + DESCRIPTION_MAX_LENGTH + " символов" };
    }
  }

  return {
    data: {
      name: name,
      price: input.price,
      stock: input.stock,
      categoryId: input.categoryId,
      description: description
    }
  };
}

function parseFilters(query) {
  const filters = {
    categoryId: null,
    minPrice: null,
    maxPrice: null,
    search: "",
    page: 1,
    limit: DEFAULT_PAGE_SIZE
  };

  if (!isEmpty(query.category)) {
    const categoryId = toNumber(query.category);
    if (categoryId === null || !Number.isInteger(categoryId) || categoryId < 1) {
      return { error: "Некорректная категория" };
    }
    filters.categoryId = categoryId;
  }

  if (!isEmpty(query.minPrice)) {
    filters.minPrice = toNumber(query.minPrice);
    if (filters.minPrice === null || filters.minPrice < 0) {
      return { error: "Минимальная цена должна быть числом не меньше 0" };
    }
  }

  if (!isEmpty(query.maxPrice)) {
    filters.maxPrice = toNumber(query.maxPrice);
    if (filters.maxPrice === null || filters.maxPrice < 0) {
      return { error: "Максимальная цена должна быть числом не меньше 0" };
    }
  }

  if (
    filters.minPrice !== null &&
    filters.maxPrice !== null &&
    filters.minPrice > filters.maxPrice
  ) {
    return { error: "Минимальная цена больше максимальной" };
  }

  if (!isEmpty(query.search)) {
    if (typeof query.search !== "string" || query.search.length > NAME_MAX_LENGTH) {
      return { error: "Слишком длинный поисковый запрос" };
    }
    filters.search = query.search.trim();
  }

  if (!isEmpty(query.page)) {
    filters.page = toNumber(query.page);
    if (!Number.isInteger(filters.page) || filters.page < 1 || filters.page > MAX_PAGE) {
      return { error: "Номер страницы должен быть целым числом от 1 до " + MAX_PAGE };
    }
  }

  if (!isEmpty(query.limit)) {
    filters.limit = toNumber(query.limit);
    if (!Number.isInteger(filters.limit) || filters.limit < 1 || filters.limit > MAX_PAGE_SIZE) {
      return { error: "Размер страницы должен быть целым числом от 1 до " + MAX_PAGE_SIZE };
    }
  }

  return { filters: filters };
}

module.exports = {
  validateProductData,
  parseFilters,
  NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  MAX_PAGE_SIZE,
  MAX_PAGE,
  MAX_PRICE,
  MAX_STOCK
};

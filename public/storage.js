const THEME_KEY = "travel-theme";

function readFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch (error) {
    console.log("Не удалось прочитать localStorage (" + key + "): " + error.message);
    return null;
  }
}

function writeToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.log("Не удалось записать в localStorage (" + key + "): " + error.message);
  }
}

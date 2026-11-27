if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("Service worker зарегистрирован"))
      .catch((error) => console.log("Service worker не зарегистрирован:", error.message));
  });
} else {
  console.log("Этот браузер не поддерживает service worker");
}

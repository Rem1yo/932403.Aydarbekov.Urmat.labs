const routeDistances = [120, 25, 310, 15, 80, 240, 28];

const LONG_ROUTE_MIN_KM = 100;
const SHORT_ROUTE_MAX_KM = 30;
const ONE_DAY_LIMIT_KM = 500;

function findMaxDistance(distances) {
  let max = distances[0];
  for (let i = 1; i < distances.length; i++) {
    if (distances[i] > max) {
      max = distances[i];
    }
  }
  return max;
}

function filterLongRoutes(distances) {
  return distances.filter(function (distance) {
    return distance > LONG_ROUTE_MIN_KM;
  });
}

function calculateTotalDistance(distances) {
  let total = 0;
  for (let i = 0; i < distances.length; i++) {
    total += distances[i];
  }
  return total;
}

function askUserName() {
  const answer = prompt("Как вас зовут?");
  if (answer === null || answer.trim() === "") {
    return "путешественник";
  }
  return answer.trim();
}

function runRouteReport() {
  const name = askUserName();

  const totalDistance = calculateTotalDistance(routeDistances);
  const longRoutes = filterLongRoutes(routeDistances);
  const longDistance = calculateTotalDistance(longRoutes);

  let shortCount = 0;
  let shortDistance = 0;
  for (let i = 0; i < routeDistances.length; i++) {
    if (routeDistances[i] <= SHORT_ROUTE_MAX_KM) {
      shortCount++;
      shortDistance += routeDistances[i];
    }
  }

  alert(
    "Привет, " + name + "! Ваш маршрут длиной " + totalDistance +
    " км, из них " + longDistance + " км - длинные перегоны."
  );

  console.log("Маршрут:", routeDistances);
  console.log("Самый длинный перегон: " + findMaxDistance(routeDistances) + " км");
  console.log("Длинные перегоны (> " + LONG_ROUTE_MIN_KM + " км):", longRoutes);
  console.log("Коротких перегонов (<= " + SHORT_ROUTE_MAX_KM + " км): " + shortCount);
  console.log("Их суммарная длина: " + shortDistance + " км");

  if (totalDistance > ONE_DAY_LIMIT_KM) {
    console.log("Рекомендуется разбить маршрут на 2-3 дня");
  }
}

runRouteReport();

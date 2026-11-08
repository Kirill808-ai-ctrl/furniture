/* Трек доставки «как в Яндекс.Такси»: геокодирование адреса (Nominatim) + маршрут по дорогам (OSRM) —
   оба бесплатные публичные сервисы без ключа. Курьера на самом деле нет — анимация считается от времени,
   прошедшего с момента оформления заказа (created_at), и запускается полностью автоматически, без
   участия администратора — как в MockPay, это имитация, а не реальный трекинг. */

// Магазин — г. Москва, ул. Лесная, д. 10 (адрес из contacts.html)
const STORE = { lat: 55.7764, lng: 37.5862, name: "Магазин HomeJoy" };

// Сколько «виртуально» собирают заказ перед тем, как курьер выезжает — чисто для демонстрации, чтобы
// сразу после оформления на карте не было мгновенного старта
const PREP_MS = 20_000;

// Сколько «виртуально» едет курьер от выезда до прибытия — чисто для демонстрации,
// не связано с реальным расстоянием (как и у MockPay, деньги и время здесь не настоящие)
const DEMO_TRIP_MS = 3 * 60_000;

const NOMINATIM_UA = "HomeJoy-Shop-Demo/1.0 (+info@homejoy.example)";
let lastGeocodeCall = 0;

async function throttleGeocode() {
  const wait = lastGeocodeCall + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocodeCall = Date.now();
}

// Адрес → координаты. На вход — то, что покупатель ввёл в форме (часто без города), поэтому подставляем «Москва»
async function geocode(address) {
  await throttleGeocode();
  const q = /москв/i.test(address) ? address : `Москва, ${address}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_UA }, signal: controller.signal });
    if (!res.ok) return null;
    const rows = await res.json();
    const hit = rows[0];
    if (!hit) return null;
    return { lat: Number(hit.lat), lng: Number(hit.lon) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Маршрут по дорогам между двумя точками: ломаная [[lat,lng], …] + примерное время в пути (сек)
const routeCache = new Map(); // "lat,lng" (точки назначения) -> { geometry, durationSec }

async function route(from, to) {
  const key = `${to.lat.toFixed(5)},${to.lng.toFixed(5)}`;
  const cached = routeCache.get(key);
  if (cached) return cached;

  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const leg = data.routes?.[0];
    if (!leg) return null;
    const geometry = leg.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const result = { geometry, durationSec: Math.round(leg.duration) };
    routeCache.set(key, result);
    return result;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { STORE, PREP_MS, DEMO_TRIP_MS, geocode, route };

// src/services/WeatherService.js
// Lightweight weather fetcher using Open-Meteo and browser geolocation.

export async function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export async function fetchWeatherByCoords(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto'
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch weather');
  const data = await response.json();
  return {
    temperatureC: data?.current?.temperature_2m ?? null,
    humidityPct: data?.current?.relative_humidity_2m ?? null,
    apparentC: data?.current?.apparent_temperature ?? null,
    isDay: Boolean(data?.current?.is_day),
    maxC: data?.daily?.temperature_2m_max?.[0] ?? null,
    minC: data?.daily?.temperature_2m_min?.[0] ?? null,
    precipProbPct: data?.daily?.precipitation_probability_max?.[0] ?? null,
    raw: data
  };
}

export async function fetchWeatherAuto() {
  try {
    const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    const { latitude, longitude } = pos.coords || {};
    const weather = await fetchWeatherByCoords(latitude, longitude);
    return { weather, coords: { latitude, longitude } };
  } catch (err) {
    // Fallback to a default location (Nashik, Maharashtra)
    const latitude = 19.9975;
    const longitude = 73.7898;
    const weather = await fetchWeatherByCoords(latitude, longitude);
    return { weather, coords: { latitude, longitude }, error: err?.message };
  }
}



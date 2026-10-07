import { valenciaNow, WEATHER_ZONE } from "../src/weather.js";

// Synthetic data for tests only. The production site never imports this file.
export function weatherFixture(date = new Date()) {
  const today = valenciaNow(date).date;
  const dailyDates = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(`${today}T12:00:00Z`); day.setUTCDate(day.getUTCDate() + i); return day.toISOString().slice(0, 10);
  });
  const time = dailyDates.flatMap((day) => Array.from({ length: 24 }, (_, hour) => `${day}T${String(hour).padStart(2, "0")}:00`));
  return {
    timezone: WEATHER_ZONE,
    hourly_units: { temperature_2m: "°C", wind_speed_10m: "km/h", precipitation_probability: "%" },
    hourly: { time, temperature_2m: time.map((_, i) => 18 + i % 10), apparent_temperature: time.map((_, i) => 19 + i % 10), precipitation_probability: time.map((_, i) => i < 24 ? 10 : 75), wind_speed_10m: time.map(() => 12), weather_code: time.map((_, i) => i < 24 ? 2 : 61), is_day: time.map((_, i) => i % 24 >= 7 && i % 24 <= 19 ? 1 : 0) },
    daily: { time: dailyDates, temperature_2m_min: dailyDates.map(() => 18), temperature_2m_max: dailyDates.map(() => 27), precipitation_probability_max: dailyDates.map((_, i) => i === 0 ? 10 : 75), weather_code: dailyDates.map((_, i) => i === 0 ? 2 : 61) },
  };
}

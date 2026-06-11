import { useState, useEffect } from 'react';

export interface WeatherDay {
    date: string;
    maxTemp: number;
    minTemp: number;
    precipProb: number;
    code: number;
    emoji: string;
    label: string;
}

function weatherFromCode(code: number): { emoji: string; label: string } {
    if (code === 0) return { emoji: '☀️', label: 'Clear' };
    if (code <= 3) return { emoji: '⛅', label: 'Partly Cloudy' };
    if (code <= 48) return { emoji: '🌫️', label: 'Foggy' };
    if (code <= 55) return { emoji: '🌦️', label: 'Drizzle' };
    if (code <= 65) return { emoji: '🌧️', label: 'Rain' };
    if (code <= 77) return { emoji: '❄️', label: 'Snow' };
    if (code <= 82) return { emoji: '🌦️', label: 'Showers' };
    return { emoji: '⛈️', label: 'Thunderstorm' };
}

export function useWeather(destination: string, startDate: string, endDate: string) {
    const [weather, setWeather] = useState<Map<string, WeatherDay>>(new Map());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!destination || !startDate || !endDate) return;

        let cancelled = false;

        async function fetch() {
            setLoading(true);
            try {
                // Step 1: Geocode the destination
                const geoRes = await window.fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`
                );
                const geoData = await geoRes.json();
                const loc = geoData?.results?.[0];
                if (!loc || cancelled) return;

                // Step 2: Fetch daily forecast
                const wxRes = await window.fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
                    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
                    `&timezone=auto&start_date=${startDate}&end_date=${endDate}`
                );
                const wxData = await wxRes.json();
                if (!wxData?.daily || cancelled) return;

                const { time, temperature_2m_max, temperature_2m_min, precipitation_probability_max, weathercode } = wxData.daily;
                const map = new Map<string, WeatherDay>();
                time.forEach((date: string, i: number) => {
                    const code = weathercode[i] ?? 0;
                    map.set(date, {
                        date,
                        maxTemp: Math.round(temperature_2m_max[i] ?? 0),
                        minTemp: Math.round(temperature_2m_min[i] ?? 0),
                        precipProb: precipitation_probability_max[i] ?? 0,
                        code,
                        ...weatherFromCode(code),
                    });
                });
                if (!cancelled) setWeather(map);
            } catch {
                // silently fail — weather is non-critical
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetch();
        return () => { cancelled = true; };
    }, [destination, startDate, endDate]);

    return { weather, loading };
}

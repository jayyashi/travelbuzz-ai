import type { WeatherDay } from '../hooks/useWeather';

interface Props {
    weather?: WeatherDay;
    compact?: boolean;
}

export function WeatherBadge({ weather, compact = false }: Props) {
    if (!weather) return null;

    if (compact) {
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)',
                borderRadius: '20px', padding: '2px 8px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)',
                fontWeight: 500, whiteSpace: 'nowrap',
            }}>
                {weather.emoji} {weather.maxTemp}°/{weather.minTemp}°
                {weather.precipProb > 40 && <span style={{ color: '#60a5fa' }}> · {weather.precipProb}% 💧</span>}
            </span>
        );
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)',
            borderRadius: '12px', padding: '8px 14px',
        }}>
            <span style={{ fontSize: '1.4rem' }}>{weather.emoji}</span>
            <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                    {weather.label}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
                    {weather.maxTemp}° / {weather.minTemp}°
                    {weather.precipProb > 40 && ` · ${weather.precipProb}% rain`}
                </div>
            </div>
        </div>
    );
}

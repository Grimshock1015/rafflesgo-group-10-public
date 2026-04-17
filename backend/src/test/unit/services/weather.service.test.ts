import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WeatherService } from '../../../services/weather.service';

describe('WeatherService Unit Tests', () => {
    let service: WeatherService;

    beforeEach(() => {
        vi.restoreAllMocks();
        service = new WeatherService();
    });

    it('should throw when weather API returns non-OK response', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

        await expect(service.getWeatherForDateTime('2026-04-20', '09:00')).rejects.toThrow('Weather API returned 503');
    });

    it('should throw when weather API response has invalid format', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({}),
        }));

        await expect(service.getWeatherForDateTime('2026-04-20', '09:00')).rejects.toThrow(
            'Unexpected response format from weather API',
        );
    });

    it('should return null when target time is not present', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                hourly: {
                    time: ['2026-04-20T08:00'],
                    precipitation_probability: [80],
                    weather_code: [95],
                },
            }),
        }));

        const result = await service.getWeatherForDateTime('2026-04-20', '09:00');
        expect(result).toBeNull();
    });

    it('should return null when hourly values are not numbers', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                hourly: {
                    time: ['2026-04-20T09:00'],
                    precipitation_probability: ['bad-value'],
                    weather_code: [95],
                },
            }),
        }));

        const result = await service.getWeatherForDateTime('2026-04-20', '09:00');
        expect(result).toBeNull();
    });

    it('should return null for non-severe weather with low precipitation', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                hourly: {
                    time: ['2026-04-20T09:00'],
                    precipitation_probability: [20],
                    weather_code: [1],
                },
            }),
        }));

        const result = await service.getWeatherForDateTime('2026-04-20', '09:00');
        expect(result).toBeNull();
    });

    it('should return thunderstorms summary for severe weather code', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                hourly: {
                    time: ['2026-04-20T10:00'],
                    precipitation_probability: [40],
                    weather_code: [95],
                },
            }),
        }));

        const result = await service.getWeatherForDateTime('2026-04-20', '09:30');
        expect(result).toEqual({
            precipitationProbability: 40,
            weatherCode: 95,
            summary: 'thunderstorms',
        });
    });

    it('should return rain summary when precipitation threshold is high and weather code is rain-related', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                hourly: {
                    time: ['2026-04-20T09:00'],
                    precipitation_probability: [75],
                    weather_code: [61],
                },
            }),
        }));

        const result = await service.getWeatherForDateTime('2026-04-20', '09:00');
        expect(result).toEqual({
            precipitationProbability: 75,
            weatherCode: 61,
            summary: 'rain',
        });
    });

    it('should return unsettled weather summary when not rain code but bad by precipitation', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                hourly: {
                    time: ['2026-04-20T09:00'],
                    precipitation_probability: [80],
                    weather_code: [3],
                },
            }),
        }));

        const result = await service.getWeatherForDateTime('2026-04-20', '09:00');
        expect(result).toEqual({
            precipitationProbability: 80,
            weatherCode: 3,
            summary: 'unsettled weather',
        });
    });
});

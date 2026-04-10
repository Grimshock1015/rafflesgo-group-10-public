// Using the midpoint between Lower Peirce/Thomson Nature Park and Rifle Range Nature Park.
// Singapore is small enough that one coordinate works fine for all routes.
const SINGAPORE_COORDINATES = {
    latitude: 1.3467,
    longitude: 103.8171,
};

// Weather codes that we consider bad enough to warn volunteers about.
// These come from the WMO weather interpretation codes used by open-meteo.
const SEVERE_WEATHER_CODES = [95, 96, 99, 63, 65, 81, 82];
const RAIN_WEATHER_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];

export interface WeatherResult {
    precipitationProbability: number;
    weatherCode: number;
    summary: string;
}

export class WeatherService {
    // Fetches the hourly weather for a given date + time in Singapore.
    // Returns null if the weather looks fine, or a WeatherResult if it's bad.
    async getWeatherForDateTime(date: string, time: string): Promise<WeatherResult | null> {
        // Round to the nearest hour so we can look up the right hourly bucket
        const [hour, minute] = time.split(':').map(Number);
        const roundedHour = (minute ?? 0) >= 30 ? Math.min((hour ?? 0) + 1, 23) : (hour ?? 0);
        const targetKey = `${date.split('T')[0]}T${String(roundedHour).padStart(2, '0')}:00`;

        const params = new URLSearchParams({
            latitude: String(SINGAPORE_COORDINATES.latitude),
            longitude: String(SINGAPORE_COORDINATES.longitude),
            hourly: 'precipitation_probability,weather_code',
            timezone: 'Asia/Singapore',
            forecast_days: '2', // today + tomorrow is enough
        });

        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`Weather API returned ${response.status}`);
        }

        const data = await response.json() as {
            hourly?: {
                time: string[];
                precipitation_probability: number[];
                weather_code: number[];
            };
        };

        const hourly = data.hourly;
        if (!hourly || !Array.isArray(hourly.time)) {
            throw new Error('Unexpected response format from weather API');
        }

        // Find the index that matches our target hour
        const index = hourly.time.findIndex((t) => t === targetKey);
        if (index < 0) return null;

        const precipitationProbability = hourly.precipitation_probability[index];
        const weatherCode = hourly.weather_code[index];

        if (typeof precipitationProbability !== 'number' || typeof weatherCode !== 'number') {
            return null;
        }

        // Only return a result if the weather is actually bad
        if (!this.isBadWeather(weatherCode, precipitationProbability)) {
            return null;
        }

        return {
            precipitationProbability,
            weatherCode,
            summary: this.getWeatherSummary(weatherCode),
        };
    }

    // Matches the threshold used in the frontend dashboard warning
    private isBadWeather(weatherCode: number, precipitationProbability: number): boolean {
        return precipitationProbability >= 60 || SEVERE_WEATHER_CODES.includes(weatherCode);
    }

    private getWeatherSummary(weatherCode: number): string {
        if ([95, 96, 99].includes(weatherCode)) return 'thunderstorms';
        if (RAIN_WEATHER_CODES.includes(weatherCode)) return 'rain';
        return 'unsettled weather';
    }
}
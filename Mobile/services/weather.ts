// Weather service using WeatherAPI.com
// Sign up at https://www.weatherapi.com/ for free API key

const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY || '2aa0c1771615459482083335250610';
const WEATHER_BASE_URL = 'http://api.weatherapi.com/v1';

// Simple cache to prevent duplicate API calls
const weatherCache: { [key: string]: { data: string; timestamp: number } } = {};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

interface WeatherData {
  location: {
    name: string;
    country: string;
  };
  current: {
    temp_c: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    humidity: number;
    wind_kph: number;
  };
}

// Map weather conditions to emojis
const getWeatherEmoji = (conditionCode: number, isDay: boolean = true): string => {
  // Based on WeatherAPI condition codes
  if (conditionCode === 1000) return isDay ? '☀️' : '🌙'; // Clear
  if (conditionCode >= 1003 && conditionCode <= 1006) return '⛅'; // Partly cloudy
  if (conditionCode >= 1009 && conditionCode <= 1009) return '☁️'; // Overcast
  if (conditionCode >= 1030 && conditionCode <= 1072) return '🌫️'; // Mist/Fog
  if (conditionCode >= 1087 && conditionCode <= 1087) return '⛈️'; // Thundery outbreaks
  if (conditionCode >= 1114 && conditionCode <= 1117) return '🌨️'; // Snow
  if (conditionCode >= 1135 && conditionCode <= 1147) return '🌫️'; // Fog
  if (conditionCode >= 1150 && conditionCode <= 1171) return '🌦️'; // Light rain
  if (conditionCode >= 1180 && conditionCode <= 1201) return '🌧️'; // Rain
  if (conditionCode >= 1204 && conditionCode <= 1237) return '🌨️'; // Sleet/Snow
  if (conditionCode >= 1240 && conditionCode <= 1246) return '🌧️'; // Showers
  if (conditionCode >= 1249 && conditionCode <= 1264) return '🌨️'; // Sleet
  if (conditionCode >= 1273 && conditionCode <= 1282) return '⛈️'; // Thunderstorm

  // Debug: log unknown condition codes
  console.log(`Unknown weather condition code: ${conditionCode}`);
  return '🌤️'; // Default partly sunny
};

const getWeatherIconName = (conditionCode: number, isDay: boolean = true): string => {
  if (conditionCode === 1000) return isDay ? 'sunny-outline' : 'moon-outline';
  if (conditionCode >= 1003 && conditionCode <= 1006) return 'partly-sunny-outline';
  if (conditionCode === 1009) return 'cloudy-outline';
  if (conditionCode >= 1030 && conditionCode <= 1147) return 'cloud-outline';
  if (conditionCode === 1087) return 'thunderstorm-outline';
  if (conditionCode >= 1114 && conditionCode <= 1117) return 'snow-outline';
  if (conditionCode >= 1150 && conditionCode <= 1201) return 'rainy-outline';
  if (conditionCode >= 1204 && conditionCode <= 1237) return 'snow-outline';
  if (conditionCode >= 1240 && conditionCode <= 1246) return 'rainy-outline';
  if (conditionCode >= 1249 && conditionCode <= 1264) return 'snow-outline';
  if (conditionCode >= 1273 && conditionCode <= 1282) return 'thunderstorm-outline';

  return 'partly-sunny-outline';
};

export const weatherService = {
  // Get current weather for a location
  getCurrentWeather: async (location: string): Promise<string | null> => {
    try {
      // Check cache first
      const cached = weatherCache[location];
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`Using cached weather for ${location}`);
        return cached.data;
      }

      const response = await fetch(
        `${WEATHER_BASE_URL}/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&aqi=no`
      );

      if (!response.ok) {
        console.warn(`Weather API error for ${location}:`, response.status);
        return null;
      }

      const data: WeatherData = await response.json();
      const emoji = getWeatherEmoji(data.current.condition.code);
      const temp = Math.round(data.current.temp_c);

      console.log(`Weather for ${location}:`, {
        condition: data.current.condition.text,
        code: data.current.condition.code,
        temp: temp,
        emoji: emoji,
      });

      const weatherString = `${emoji} ${temp}°C`;

      // Cache the result
      weatherCache[location] = {
        data: weatherString,
        timestamp: Date.now(),
      };

      return weatherString;
    } catch (error) {
      console.warn(`Failed to fetch weather for ${location}:`, error);
      return null;
    }
  },

  // Get 5-day weather forecast for a location
  getForecast: async (
    location: string
  ): Promise<Array<{
    day: string;
    icon: string;
    iconName: string;
    high: number;
    low: number;
  }> | null> => {
    try {
      const mappedLocation = locationMappings[location] || location;
      const response = await fetch(
        `${WEATHER_BASE_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(mappedLocation)}&days=5&aqi=no&alerts=no`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

      return data.forecast.forecastday.map((day: any, index: number) => {
        const date = new Date(day.date);
        const dayName =
          index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
        const emoji = getWeatherEmoji(day.day.condition.code, true);
        const iconName = getWeatherIconName(day.day.condition.code, true);

        return {
          day: dayName,
          icon: emoji,
          iconName,
          high: Math.round(day.day.maxtemp_c),
          low: Math.round(day.day.mintemp_c),
        };
      });
    } catch (error) {
      console.warn(`Failed to fetch forecast for ${location}:`, error);
      return null;
    }
  },

  // Get weather for multiple locations (batch)
  getWeatherForDestinations: async (
    destinations: { name: string; location: string; id: string }[]
  ): Promise<{ [key: string]: string }> => {
    const weatherData: { [key: string]: string } = {};

    // Process destinations in parallel but limit concurrent requests
    const batchSize = 3; // Don't overwhelm the API

    for (let i = 0; i < destinations.length; i += batchSize) {
      const batch = destinations.slice(i, i + batchSize);

      const batchPromises = batch.map(async dest => {
        const weather = await weatherService.getCurrentWeather(dest.location);
        return { id: dest.id, weather };
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(({ id, weather }) => {
        if (weather) {
          weatherData[id] = weather;
        }
      });

      // Small delay between batches to be respectful to the API
      if (i + batchSize < destinations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return weatherData;
  },
};

// Zimbabwe location mappings (in case API needs specific names)
export const locationMappings: { [key: string]: string } = {
  Harare: 'Harare, Zimbabwe',
  Bulawayo: 'Bulawayo, Zimbabwe',
  'Victoria Falls': 'Victoria Falls, Zimbabwe',
  'Mana Pools': 'Kariba, Zimbabwe', // Closest weather station
  Kariba: 'Kariba, Zimbabwe',
  Hwange: 'Hwange, Zimbabwe',
  'Great Zimbabwe': 'Masvingo, Zimbabwe', // Closest city
  'Eastern Highlands': 'Mutare, Zimbabwe', // Closest city
  Nyanga: 'Nyanga, Zimbabwe', // If you updated the name in Supabase
};

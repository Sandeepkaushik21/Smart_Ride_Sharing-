// LocationIQ API service for getting nearby locations
// 
// HOW TO SETUP LOCATIONIQ:
// 1. Sign up for free at https://locationiq.com/
// 2. Get your API key from the dashboard
// 3. Create a file: frontend/.env.local
// 4. Add this line: VITE_LOCATIONIQ_API_KEY=your_api_key_here
// 5. The API key will be automatically loaded below
//
// Free tier: 5,000 requests/day
// Documentation: https://locationiq.com/docs

const LOCATIONIQ_API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY || '';
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';

export const locationService = {
  /**
   * Get nearby/popular locations for a city using LocationIQ API
   * @param {string} cityName - The name of the city
   * @returns {Promise<string[]>} Array of location names
   */
  getNearbyLocations: async (cityName) => {
    // If API key is not configured, show helpful error
    if (!LOCATIONIQ_API_KEY) {
      console.warn('LocationIQ API key not found. Please set VITE_LOCATIONIQ_API_KEY in .env.local file');
      // Return basic locations as fallback
      return getDefaultLocations(cityName);
    }

    try {
      // Search for the city first to get coordinates
      const searchResponse = await fetch(
        `${LOCATIONIQ_BASE_URL}/search.php?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(cityName)}&format=json&limit=1&addressdetails=1`
      );

      if (!searchResponse.ok) {
        throw new Error('LocationIQ API request failed');
      }

      const searchResults = await searchResponse.json();
      
      if (!searchResults || searchResults.length === 0) {
        return getDefaultLocations(cityName);
      }

      const city = searchResults[0];
      const lat = city.lat;
      const lon = city.lon;

      // Get nearby places (popular locations) using reverse geocoding with address details
      // We'll search for common location types near the city
      const locationQueries = [
        `${cityName} Railway Station`,
        `${cityName} Airport`,
        `${cityName} Central`,
        `${cityName} City Center`,
      ];

      const locationPromises = locationQueries.map(async (query) => {
        try {
          const response = await fetch(
            `${LOCATIONIQ_BASE_URL}/search.php?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(query)}&format=json&limit=1`
          );
          
          if (response.ok) {
            const results = await response.json();
            if (results && results.length > 0) {
              return results[0].display_name.split(',')[0]; // Get first part of display name
            }
          }
          return null;
        } catch (error) {
          console.error(`Error fetching location: ${query}`, error);
          return null;
        }
      });

      const locations = await Promise.all(locationPromises);
      
      // Filter out null values and ensure we have at least 4 locations
      const validLocations = locations.filter(loc => loc !== null);
      
      if (validLocations.length >= 4) {
        return validLocations.slice(0, 4);
      }

      // If we don't have enough, fill with default locations
      const defaultLocs = getDefaultLocations(cityName);
      return [...validLocations, ...defaultLocs].slice(0, 4);
      
    } catch (error) {
      console.error('Error fetching locations from LocationIQ:', error);
      // Fallback to default locations
      return getDefaultLocations(cityName);
    }
  }
};

/**
 * Get default locations if API is not available
 * @param {string} cityName - The name of the city
 * @returns {string[]} Array of default location names
 */
function getDefaultLocations(cityName) {
  // Predefined popular locations for major cities (fallback)
  const locationMap = {
    'chennai': [
      'Chennai Central Railway Station',
      'Chennai Airport',
      'Chennai Fort',
      'T Nagar Main Area'
    ],
    'mumbai': [
      'Mumbai Central',
      'Mumbai Airport',
      'Bandra Kurla Complex',
      'Andheri Main Area'
    ],
    'delhi': [
      'New Delhi Railway Station',
      'Delhi Airport',
      'Connaught Place',
      'Gurgaon Sector 29'
    ],
    'bangalore': [
      'Bangalore City Railway Station',
      'Bangalore Airport',
      'MG Road',
      'Electronic City'
    ],
    'kolkata': [
      'Kolkata Howrah Station',
      'Kolkata Airport',
      'Park Street',
      'Salt Lake City'
    ],
    'hyderabad': [
      'Hyderabad Nampally Station',
      'Hyderabad Airport',
      'Banjara Hills',
      'HITEC City'
    ],
    'pune': [
      'Pune Railway Station',
      'Pune Airport',
      'Koregaon Park',
      'Hinjawadi IT Park'
    ]
  };

  // Normalize city name for lookup
  const normalizedCity = cityName?.toLowerCase().trim();
  
  // Find matching city
  for (const [city, locations] of Object.entries(locationMap)) {
    if (normalizedCity?.includes(city) || city.includes(normalizedCity)) {
      return locations;
    }
  }

  // Default locations if city not found
  return [
    `${cityName} Railway Station`,
    `${cityName} Airport`,
    `${cityName} City Center`,
    `${cityName} Main Area`
  ];
}

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
      // Search for the city first to get coordinates and bounding box
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

      // Prepare a viewbox from the city's boundingbox (if available) to restrict POI searches
      // LocationIQ / Nominatim boundingbox format: [south, north, west, east]
      let viewboxParam = null;
      if (city.boundingbox && city.boundingbox.length === 4) {
        const south = city.boundingbox[0];
        const north = city.boundingbox[1];
        const west = city.boundingbox[2];
        const east = city.boundingbox[3];
        // Nominatim's viewbox expects: left,top,right,bottom => west,north,east,south
        viewboxParam = `${west},${north},${east},${south}`;
      }

      // Prioritized POI categories/queries that commonly represent "popular locations" in a city
      const poiQueries = [
        'Airport',
        'Railway station',
        'Beach',
        'Port',
        'Harbour',
        'Major hospital',
        'Central bus station',
        'University',
        'Market',
        'City center',
        'Fort'
      ];

      // Helper to run a bounded search for a specific query and return a cleaned name or null
      const fetchPoi = async (q) => {
        try {
          const url = new URL(`${LOCATIONIQ_BASE_URL}/search.php`);
          url.searchParams.set('key', LOCATIONIQ_API_KEY);
          url.searchParams.set('q', `${cityName} ${q}`);
          url.searchParams.set('format', 'json');
          url.searchParams.set('limit', '2');
          url.searchParams.set('addressdetails', '1');
          url.searchParams.set('extratags', '1');
          url.searchParams.set('namedetails', '1');
          // If we have a viewbox, bound the search to the city area for more relevant results
          if (viewboxParam) {
            url.searchParams.set('viewbox', viewboxParam);
            url.searchParams.set('bounded', '1');
          }

          const response = await fetch(url.toString());
          if (!response.ok) return null;
          const results = await response.json();
          if (!results || results.length === 0) return null;

          // Prefer namedetails.name if available, else use the first token of display_name
          const candidate = results.find(r => r.display_name);
          if (!candidate) return null;

          // Try to extract a concise human-friendly name
          if (candidate.namedetails && candidate.namedetails.name) {
            return candidate.namedetails.name;
          }

          // Use display_name first segment (before comma) as a concise label
          if (candidate.display_name) {
            return candidate.display_name.split(',')[0];
          }

          return null;
        } catch (err) {
          console.error('Error fetching POI', q, err);
          return null;
        }
      };

      // Run POI queries in sequence (small number => keep it simple) and collect unique results
      const collected = [];
      for (const q of poiQueries) {
        const name = await fetchPoi(q);
        if (name && !collected.includes(name)) {
          collected.push(name);
        }
        // Stop early if we have a good number of locations
        if (collected.length >= 6) break;
      }

      // If not enough results, try a broader search in the city's name (limit a few results)
      if (collected.length < 4) {
        try {
          const broadUrl = new URL(`${LOCATIONIQ_BASE_URL}/search.php`);
          broadUrl.searchParams.set('key', LOCATIONIQ_API_KEY);
          broadUrl.searchParams.set('q', city.display_name || cityName);
          broadUrl.searchParams.set('format', 'json');
          broadUrl.searchParams.set('limit', '6');
          broadUrl.searchParams.set('addressdetails', '1');
          if (viewboxParam) {
            broadUrl.searchParams.set('viewbox', viewboxParam);
            broadUrl.searchParams.set('bounded', '1');
          }

          const broadResp = await fetch(broadUrl.toString());
          if (broadResp.ok) {
            const broadResults = await broadResp.json();
            for (const r of broadResults) {
              const label = (r.namedetails && r.namedetails.name) ? r.namedetails.name : (r.display_name ? r.display_name.split(',')[0] : null);
              if (label && !collected.includes(label)) {
                collected.push(label);
                if (collected.length >= 6) break;
              }
            }
          }
        } catch (err) {
          console.error('Error doing broader city search', err);
        }
      }

      // Final dedupe and return up to 6 items
      const unique = Array.from(new Set(collected)).slice(0, 6);
      if (unique.length > 0) return unique;

      // Fallback to defaults if nothing useful found
      return getDefaultLocations(cityName);

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
      'Chennai International Airport',
      'Chennai Central',
      'Marina Beach',
      'Chennai Port'
    ],
    'mumbai': [
      'Chhatrapati Shivaji Maharaj International Airport',
      'Chhatrapati Shivaji Maharaj Terminus (CSMT)',
      'Marine Drive',
      'Gateway of India'
    ],
    'delhi': [
      'Indira Gandhi International Airport',
      'New Delhi Railway Station',
      'Connaught Place',
      'India Gate'
    ],
    'bangalore': [
      'Kempegowda International Airport',
      'KSR Bangalore City Railway Station',
      'MG Road',
      'Electronic City'
    ],
    'kolkata': [
      'Netaji Subhas Chandra Bose International Airport',
      'Howrah Junction',
      'Park Street',
      'Victoria Memorial'
    ],
    'hyderabad': [
      'Rajiv Gandhi International Airport',
      'Secunderabad Junction',
      'HITEC City',
      'Charminar'
    ],
    'pune': [
      'Pune International Airport',
      'Pune Junction',
      'Koregaon Park',
      'Shaniwar Wada'
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

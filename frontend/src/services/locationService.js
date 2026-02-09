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

import axios from 'axios';

const LOCATIONIQ_API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY || '';
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';
const API_BASE_URL = 'http://localhost:8081/api';

export const locationService = {
  /**
   * Get location autocomplete suggestions using LocationIQ API
   * Works for ALL places in India: cities, districts, states, towns, etc.
   * When user types any location name, returns exactly 4 famous locations within that area
   * @param {string} query - The search query (e.g., "chennai", "mumbai", "bangalore", "tamil nadu", "karnataka", etc.)
   * @returns {Promise<string[]>} Array of famous location names (exactly 4)
   */
  getPlaceSuggestions: async (query, signal) => {
    // If API key is not configured, return empty array
    if (!LOCATIONIQ_API_KEY) {
      console.warn('LocationIQ API key not found. Please set VITE_LOCATIONIQ_API_KEY in .env.local file');
      return [];
    }

    if (!query || query.length < 2) {
      return [];
    }

    try {
      // Real-time free-text place search with no fabricated defaults
      const url = new URL(`${LOCATIONIQ_BASE_URL}/search.php`);
      url.searchParams.set('key', LOCATIONIQ_API_KEY);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '8');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('countrycodes', 'in');

      const resp = await fetch(url.toString(), { signal });
      if (!resp.ok) return [];
      const results = await resp.json();
      if (!Array.isArray(results)) return [];

      // Convert to concise labels; no forced Railway/Airport/etc unless actually returned by API
      const labels = [];
      for (const r of results) {
        let name = null;
        if (r.namedetails && r.namedetails.name) name = r.namedetails.name;
        else if (r.display_name) name = r.display_name.split(',')[0];
        if (name) labels.push(name.trim());
      }
      // Dedupe and return up to 8
      return Array.from(new Set(labels)).slice(0, 8);
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.error('Error fetching place suggestions from LocationIQ:', error);
      return [];
    }
  },

  /**
   * Get place suggestions strictly within a given city using LocationIQ bounding box
   * Falls back to generic suggestions if city lookup fails.
   * @param {string} query
   * @param {string} cityName
   * @param {AbortSignal} signal
   * @returns {Promise<string[]>}
   */
  getPlaceSuggestionsInCity: async (query, cityName, signal) => {
    if (!query || query.length < 2) return [];
    if (!LOCATIONIQ_API_KEY) return [];

    try {
      // 1) Resolve city to get its bounding box
      const cityUrl = new URL(`${LOCATIONIQ_BASE_URL}/search.php`);
      cityUrl.searchParams.set('key', LOCATIONIQ_API_KEY);
      cityUrl.searchParams.set('q', cityName);
      cityUrl.searchParams.set('format', 'json');
      cityUrl.searchParams.set('limit', '1');
      cityUrl.searchParams.set('addressdetails', '1');
      cityUrl.searchParams.set('countrycodes', 'in');

      const cityResp = await fetch(cityUrl.toString(), { signal });
      if (!cityResp.ok) {
        return await locationService.getPlaceSuggestions(`${cityName} ${query}`, signal);
      }
      const cityResults = await cityResp.json();
      if (!Array.isArray(cityResults) || cityResults.length === 0) {
        return await locationService.getPlaceSuggestions(`${cityName} ${query}`, signal);
      }

      const city = cityResults[0];
      let viewboxParam = null;
      if (city.boundingbox && city.boundingbox.length === 4) {
        const south = city.boundingbox[0];
        const north = city.boundingbox[1];
        const west = city.boundingbox[2];
        const east = city.boundingbox[3];
        viewboxParam = `${west},${north},${east},${south}`;
      }

      // 2) Search for query bounded to the city's viewbox
      const url = new URL(`${LOCATIONIQ_BASE_URL}/search.php`);
      url.searchParams.set('key', LOCATIONIQ_API_KEY);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '8');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('countrycodes', 'in');
      if (viewboxParam) {
        url.searchParams.set('viewbox', viewboxParam);
        url.searchParams.set('bounded', '1');
      } else {
        // No bounding box; prefix the query with the city as a weaker constraint
        url.searchParams.set('q', `${cityName} ${query}`);
      }

      const resp = await fetch(url.toString(), { signal });
      if (!resp.ok) return [];
      const results = await resp.json();
      if (!Array.isArray(results)) return [];

      const labels = [];
      for (const r of results) {
        let name = null;
        if (r.namedetails && r.namedetails.name) name = r.namedetails.name;
        else if (r.display_name) name = r.display_name.split(',')[0];
        if (name) labels.push(name.trim());
      }
      return Array.from(new Set(labels)).slice(0, 8);
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      return [];
    }
  },

  /**
   * Get Indian city suggestions (cities only) for first-step selection
   * Uses backend API to ensure only cities are returned (no places/streets)
   * @param {string} query
   * @returns {Promise<string[]>}
   */
  getCitySuggestions: async (query, signal) => {
    if (!query || query.length < 2) return [];

    try {
      // Use backend API which only returns cities from predefined list and database
      const response = await axios.get(`${API_BASE_URL}/public/cities/suggestions`, {
        params: { query },
        signal
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      console.error('Error fetching city suggestions from backend:', e);
      // Fallback to default cities if backend fails
      return getDefaultIndianCities(query);
    }
  },

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

// Fallback: simple Indian cities autocomplete
function getDefaultIndianCities(query) {
  const cities = [
    'Delhi','Mumbai','Bengaluru','Chennai','Kolkata','Hyderabad','Pune','Ahmedabad','Jaipur','Surat','Lucknow','Kanpur','Nagpur','Indore','Thane','Bhopal','Visakhapatnam','Patna','Vadodara','Ghaziabad','Ludhiana','Agra','Nashik','Ranchi','Faridabad','Meerut','Rajkot','Kalyan','Vasai','Varanasi','Srinagar','Aurangabad','Dhanbad','Amritsar','Navi Mumbai','Allahabad','Howrah','Gwalior','Jabalpur','Vijayawada','Madurai','Raipur','Kota','Chandigarh','Guwahati','Solapur','Hubballi','Mysuru','Tiruchirappalli','Bareilly','Aligarh','Tiruppur','Jodhpur','Coimbatore','Noida','Gurugram'
  ];
  const q = (query || '').toLowerCase();
  return cities.filter(c => c.toLowerCase().includes(q)).slice(0, 8);
}

// ---------------------------------------------
// Cached popular places per city (persistent)
// ---------------------------------------------
const POPULAR_PLACES_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const POPULAR_PLACES_PREFIX = 'popular_places_';

/**
 * Rank and normalize candidate place names for a city
 */
function rankAndSelectTopPlaces(cityName, candidates, max = 6) {
  const city = (cityName || '').toLowerCase();
  const weights = [
    'airport', 'railway', 'station', 'central', 'junction', 'market', 'hospital', 'university', 'beach', 'port', 'harbour', 'bus', 'city center', 'fort', 'temple', 'mall'
  ];

  const scored = Array.from(new Set(
    candidates
      .filter(Boolean)
      .map(c => String(c).trim())
      .filter(c => c.length > 0)
  )).map(name => {
    const lower = name.toLowerCase();
    let score = 0;
    if (lower.includes(city)) score += 3;
    for (const w of weights) if (lower.includes(w)) score += 2;
    // Short, clean names are preferred
    if (name.length <= 28) score += 1;
    // Penalize overly generic
    if (['main area', 'center', 'city center'].includes(lower)) score -= 1;
    return { name, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.name).slice(0, max);
}

/**
 * Get cached popular places for a city or fetch and persist them.
 * Returns up to 6 items; callers can slice to 4.
 */
export async function getOrFetchPopularPlaces(cityName, forceRefresh = false) {
  const key = POPULAR_PLACES_PREFIX + (cityName || '').toLowerCase().trim();
  if (!forceRefresh) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items) && typeof parsed.timestamp === 'number') {
          if (Date.now() - parsed.timestamp < POPULAR_PLACES_TTL_MS) {
            return parsed.items;
          }
        }
      }
    } catch { /* ignore */ }
  }

  // Fetch fresh using getNearbyLocations (which already has decent logic)
  let fresh = [];
  try {
    const base = await locationService.getNearbyLocations(cityName);
    fresh = rankAndSelectTopPlaces(cityName, base, 6);
    if (fresh.length < 4) {
      const fallback = getDefaultLocations(cityName);
      fresh = rankAndSelectTopPlaces(cityName, [...fresh, ...fallback], 6);
    }
  } catch {
    const fallback = getDefaultLocations(cityName);
    fresh = rankAndSelectTopPlaces(cityName, fallback, 6);
  }

  try {
    localStorage.setItem(key, JSON.stringify({ items: fresh, timestamp: Date.now() }));
  } catch { /* ignore quota issues */ }

  return fresh;
}

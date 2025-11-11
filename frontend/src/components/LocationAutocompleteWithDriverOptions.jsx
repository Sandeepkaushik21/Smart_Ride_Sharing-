import { useState, useEffect, useRef, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { MapPin, Star } from 'lucide-react';

// Cache for suggestions to avoid redundant API calls
const suggestionsCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const LocationAutocompleteWithDriverOptions = ({ 
  value, 
  onChange, 
  placeholder, 
  className, 
  withinCity = '', 
  driverLocations = [], // Array of driver's selected locations
  disableCache = false 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const debounceTimer = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) {
      // If no query, show driver locations first
      if (driverLocations.length > 0) {
        const driverSuggestions = driverLocations.map(loc => ({ text: loc, isDriverLocation: true }));
        setSuggestions(driverSuggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      return;
    }

    // Check cache first
    const cityPrefix = (withinCity || '').toLowerCase().trim();
    const cacheKey = (cityPrefix ? cityPrefix + '|' : '') + query.toLowerCase().trim();
    const cachedData = disableCache ? null : suggestionsCache.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      // Merge driver locations with cached suggestions (driver locations first)
      const merged = mergeSuggestions(driverLocations, cachedData.suggestions, query);
      setSuggestions(merged);
      setShowSuggestions(merged.length > 0);
      return;
    }

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      const effectiveQuery = withinCity ? `${withinCity} ${query}` : query;
      const data = await locationService.getPlaceSuggestions(effectiveQuery, abortControllerRef.current.signal);
      
      // Store in cache
      if (!disableCache && data && data.length > 0) {
        suggestionsCache.set(cacheKey, {
          suggestions: data,
          timestamp: Date.now()
        });
      }
      
      // Merge driver locations with API suggestions (driver locations first)
      const merged = mergeSuggestions(driverLocations, data || [], query);
      setSuggestions(merged);
      setShowSuggestions(merged.length > 0);
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error fetching place suggestions:', error);
      // Even on error, show driver locations if available
      if (driverLocations.length > 0) {
        setSuggestions(driverLocations.filter(loc => 
          loc.toLowerCase().includes(query.toLowerCase())
        ));
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [withinCity, disableCache, driverLocations]);

  // Helper to merge driver locations with API suggestions
  const mergeSuggestions = (driverLocs, apiSuggestions, query) => {
    const queryLower = query.toLowerCase();
    const merged = [];
    const seen = new Set();

    // First, add driver locations that match the query (prioritized)
    driverLocs.forEach(loc => {
      if (loc && loc.toLowerCase().includes(queryLower)) {
        merged.push({ text: loc, isDriverLocation: true });
        seen.add(loc.toLowerCase());
      }
    });

    // Then add API suggestions that aren't duplicates
    apiSuggestions.forEach(suggestion => {
      const suggestionLower = suggestion.toLowerCase();
      if (!seen.has(suggestionLower)) {
        merged.push({ text: suggestion, isDriverLocation: false });
        seen.add(suggestionLower);
      }
    });

    return merged;
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    
    // Debounce API calls
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 600);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion.text);
    onChange(suggestion.text);
    setShowSuggestions(false);
  };

  // Show driver locations when input is focused and empty
  const handleFocus = () => {
    if (!inputValue && driverLocations.length > 0) {
      setSuggestions(driverLocations.map(loc => ({ text: loc, isDriverLocation: true })));
      setShowSuggestions(true);
    } else if (inputValue.length >= 2) {
      fetchSuggestions(inputValue);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className || 'w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'}
      />
      {driverLocations.length > 0 && !inputValue && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
          {driverLocations.length} driver options
        </div>
      )}
      {isLoading && inputValue.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <div className="text-sm text-gray-600 text-center">Loading suggestions...</div>
        </div>
      )}
      {showSuggestions && suggestions.length > 0 && !isLoading && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`px-4 py-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center space-x-2 transition-colors ${
                suggestion.isDriverLocation ? 'bg-purple-50' : ''
              }`}
            >
              {suggestion.isDriverLocation ? (
                <Star className="h-4 w-4 text-purple-600 flex-shrink-0" fill="currentColor" />
              ) : (
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
              <span className="text-gray-800 flex-1">{suggestion.text}</span>
              {suggestion.isDriverLocation && (
                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">Driver Choice</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationAutocompleteWithDriverOptions;


import { useState, useEffect, useRef, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { MapPin } from 'lucide-react';

// Cache for suggestions to avoid redundant API calls
const suggestionsCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const CityAutocomplete = ({ value, onChange, placeholder, className, mode = 'place', withinCity = '', disableCache = false }) => {
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
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Check cache first
    const cityPrefix = (withinCity || '').toLowerCase().trim();
    const cacheKey = (cityPrefix ? cityPrefix + '|' : '') + query.toLowerCase().trim();
    const cachedData = disableCache ? null : suggestionsCache.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      setSuggestions(cachedData.suggestions);
      setShowSuggestions(cachedData.suggestions.length > 0);
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
      const data = mode === 'city'
        ? await locationService.getCitySuggestions(effectiveQuery, abortControllerRef.current.signal)
        : await locationService.getPlaceSuggestions(effectiveQuery, abortControllerRef.current.signal);
      
      // Store in cache
      if (!disableCache && data && data.length > 0) {
        suggestionsCache.set(cacheKey, {
          suggestions: data,
          timestamp: Date.now()
        });
      }
      
      setSuggestions(data || []);
      setShowSuggestions(data && data.length > 0);
    } catch (error) {
      if (error.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('Error fetching place suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, [mode, withinCity, disableCache]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    
    // Debounce API calls to avoid excessive requests
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 600); // Increased to 600ms for better performance
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    onChange(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        placeholder={placeholder}
        className={className || 'w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'}
      />
      {isLoading && inputValue.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <div className="text-sm text-gray-600 text-center">Loading suggestions...</div>
        </div>
      )}
      {showSuggestions && suggestions.length > 0 && !isLoading && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center space-x-2 transition-colors"
            >
              <MapPin className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <span className="text-gray-800">{suggestion}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CityAutocomplete;

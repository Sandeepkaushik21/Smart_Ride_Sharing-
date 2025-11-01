import { useState, useEffect, useRef } from 'react';
import { cityService } from '../services/cityService';
import { locationService } from '../services/locationService';
import { MapPin } from 'lucide-react';

const CityAutocomplete = ({ value, onChange, placeholder, className, showNearbyLocations = false }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [nearbyLocations, setNearbyLocations] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [showNearby, setShowNearby] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setShowNearby(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Fetch nearby locations when city is selected
    if (showNearbyLocations && inputValue && inputValue.length >= 3) {
      fetchNearbyLocations(inputValue);
    }
  }, [inputValue, showNearbyLocations]);

  const fetchNearbyLocations = async (cityName) => {
    try {
      const locations = await locationService.getNearbyLocations(cityName);
      setNearbyLocations(locations);
      setShowNearby(true);
    } catch (error) {
      console.error('Error fetching nearby locations:', error);
    }
  };

  const fetchSuggestions = async (query) => {
    if (query.length >= 2) {
      try {
        const data = await cityService.getSuggestions(query);
        setSuggestions(data || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching city suggestions:', error);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    fetchSuggestions(newValue);
    setShowNearby(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    onChange(suggestion);
    setShowSuggestions(false);
    if (showNearbyLocations) {
      fetchNearbyLocations(suggestion);
    }
  };

  const handleNearbyLocationClick = (location) => {
    setInputValue(location);
    onChange(location);
    setShowNearby(false);
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
        className={className || 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
      {showNearby && nearbyLocations.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center space-x-1">
            <MapPin className="h-3 w-3" />
            <span>Popular locations in {inputValue}:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {nearbyLocations.map((location, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleNearbyLocationClick(location)}
                className="text-left px-3 py-2 bg-gray-50 hover:bg-blue-50 rounded-md text-sm border border-gray-200 hover:border-blue-300 transition-colors"
              >
                {location}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;

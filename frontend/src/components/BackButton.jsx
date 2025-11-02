import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';

const BackButton = ({ to, text = 'Back' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const historyRef = useRef([]);

  // Track navigation history using sessionStorage and ref
  useEffect(() => {
    const currentPath = location.pathname + (location.search || '');

    // Always load stored history (so we can find earlier valid pages even if some were excluded)
    const storedHistory = sessionStorage.getItem('navigationHistory');
    if (storedHistory) {
      try {
        historyRef.current = JSON.parse(storedHistory);
        if (!Array.isArray(historyRef.current)) historyRef.current = [];
      } catch (e) {
        historyRef.current = [];
      }
    } else {
      historyRef.current = [];
    }

    // Add current path to history if it's not the same as the last entry
    // We still DO track excluded pages in storage so we can walk back past them when needed,
    // but the button itself remains hidden on excluded routes (see the render guard below).
    if (historyRef.current.length === 0 || historyRef.current[historyRef.current.length - 1] !== currentPath) {
      historyRef.current.push(currentPath);
      // Keep only last 50 entries to prevent memory issues
      if (historyRef.current.length > 50) {
        historyRef.current = historyRef.current.slice(-50);
      }
      sessionStorage.setItem('navigationHistory', JSON.stringify(historyRef.current));
    }
  }, [location.pathname, location.search]);

  // Don't show back button on landing page, login, register, or change password
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/change-password') {
    return null;
  }

  const handleClick = () => {
    if (to) {
      // If explicit 'to' prop is provided, use it
      navigate(to);
      return;
    }

    const excludedPaths = ['/', '/login', '/register', '/change-password'];

    // Try stored history first (preferred). This prevents landing on home when a valid previous page exists.
    const storedHistory = sessionStorage.getItem('navigationHistory');
    if (storedHistory) {
      try {
        const history = JSON.parse(storedHistory);
        if (Array.isArray(history) && history.length > 0) {
          // Find the last entry that is not the current path and not excluded
          // We iterate backwards to find the first valid previous page
          for (let i = history.length - 1; i >= 0; i--) {
            const entry = history[i];
            if (!entry) continue;
            // entry may include search params; compare pathname only for excludedPaths
            const pathname = entry.split('?')[0];
            if (entry === location.pathname + (location.search || '')) {
              // skip current page entry
              continue;
            }
            if (excludedPaths.includes(pathname)) {
              // skip excluded paths
              continue;
            }
            // We found a valid previous entry. Remove everything after it from stored history (pop back)
            const newHistory = history.slice(0, i + 1);
            sessionStorage.setItem('navigationHistory', JSON.stringify(newHistory));
            // Navigate to that previous entry
            navigate(entry);
            return;
          }
        }
      } catch (e) {
        // parsing failed; fallthrough to native history
      }
    }

    // If no valid stored history, fallback to browser's native back functionality
    if (window.history.length > 1) {
      // Use native history back which better reflects real browser navigation
      window.history.back();
      return;
    }

    // Final fallback: go to home
    navigate('/');
  };

  return (
    <div className="relative mb-4">
      <button
        onClick={handleClick}
        className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-md text-blue-600 hover:text-blue-800 hover:bg-gray-50 font-medium transition-all border border-gray-200 hover:shadow-lg"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>{text}</span>
      </button>
    </div>
  );
};

export default BackButton;

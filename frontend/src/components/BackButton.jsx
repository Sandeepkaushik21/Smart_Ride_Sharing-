import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BackButton = ({ to, text = 'Back' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show back button on landing page, login, register, or change password
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/change-password') {
    return null;
  }

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
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


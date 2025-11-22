import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Home, User } from 'lucide-react';
import { useState } from 'react';
import { authService } from '../services/authService';
import { showConfirm } from '../utils/swal';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();

  const handleLogout = async () => {
    const confirm = await showConfirm(
      'Are you sure you want to logout?',
      'Yes, Logout',
      'Cancel'
    );

    if (confirm.isConfirmed) {
      authService.logout();
      navigate('/');
    }
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 text-white shadow-2xl backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="p-1.5 bg-white/10 rounded-lg group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
                <Home className="h-4 w-4" />
              </div>
              <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Smart Ride Sharing
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/10 transition-all duration-300 flex items-center space-x-2 border border-white/20 hover:border-white/40"
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/10 transition-all duration-300 flex items-center space-x-2 border border-white/20 hover:border-white/40"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/10 transition-all duration-300 border border-white/20 hover:border-white/40"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-white text-blue-700 hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-white/10 transition-all duration-300 border border-white/20"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 space-y-2 animate-in slide-in-from-top">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="block px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/10 transition-all duration-300 border border-white/20"
                  onClick={() => setIsOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={async () => {
                    setIsOpen(false);
                    await handleLogout();
                  }}
                  className="block w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/10 transition-all duration-300 border border-white/20"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/10 transition-all duration-300 border border-white/20"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-2.5 rounded-lg text-sm font-semibold bg-white text-blue-700 hover:bg-blue-50 transition-all duration-300"
                  onClick={() => setIsOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

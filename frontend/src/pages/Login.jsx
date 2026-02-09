import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/authService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { showSuccessAuto, showInfo } from '../utils/swal';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(formData.email, formData.password);

      if (response.isFirstLogin) {
        await showInfo('Please set your new password to continue');
        navigate('/change-password', { replace: true });
        return;
      }

      let path = '/';
      if (response.roles) {
        if (response.roles.includes('ROLE_ADMIN')) {
          path = '/admin/dashboard';
        } else if (response.roles.includes('ROLE_DRIVER')) {
          path = '/driver/dashboard';
        } else if (response.roles.includes('ROLE_PASSENGER')) {
          path = '/passenger/dashboard';
        }
      }

      await showSuccessAuto('Login successful!', 3000);
      navigate(path, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage =
        err.message ||
        err.response?.data?.message ||
        'Invalid email or password. Please check your credentials.';

      if (err.message && err.message.includes('Network')) {
        setError('Cannot connect to server. Please make sure the backend is running on http://localhost:8081');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (credentialResponse) => {
    setError('');
    setGoogleLoading(true);

    try {
      const response = await authService.googleLogin(credentialResponse.credential);

      let path = '/';
      if (response.roles) {
        if (response.roles.includes('ROLE_ADMIN')) {
          path = '/admin/dashboard';
        } else if (response.roles.includes('ROLE_DRIVER')) {
          path = '/driver/dashboard';
        } else if (response.roles.includes('ROLE_PASSENGER')) {
          path = '/passenger/dashboard';
        }
      }

      await showSuccessAuto('Google login successful!', 3000);
      navigate(path, { replace: true });
    } catch (err) {
      console.error('Google login error:', err);
      console.error('Error details:', err.response?.data);
      let errorMessage = 'Google authentication failed. Please try again.';
      
      if (err.response?.data) {
        // Check different possible error response formats
        if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    // Initialize Google Sign-In when the script is loaded
    const initializeGoogleSignIn = () => {
      if (window.google && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: '273206418595-in0iq257brvi7jvrpv1d8isq1qg3788n.apps.googleusercontent.com', // Replace with your actual Google Client ID
          callback: (credentialResponse) => {
            handleGoogleSignIn(credentialResponse);
          },
        });

        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
            locale: 'en',
          }
        );
      }
    };

    // Check if Google script is already loaded
    if (window.google) {
      initializeGoogleSignIn();
    } else {
      // Wait for script to load
      const checkInterval = setInterval(() => {
        if (window.google) {
          clearInterval(checkInterval);
          initializeGoogleSignIn();
        }
      }, 100);

      // Cleanup interval after 10 seconds
      setTimeout(() => clearInterval(checkInterval), 10000);
    }

    // Cleanup function
    return () => {
      if (window.google && window.google.accounts) {
        // Google library doesn't provide a cleanup method, but we can clear the button
        if (googleButtonRef.current) {
          googleButtonRef.current.innerHTML = '';
        }
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      <main className="flex-grow flex items-center justify-center py-8 px-6 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 bg-white p-6 rounded-xl shadow-2xl border border-gray-100">
          <BackButton to="/" />

          <div>
            <div className="flex justify-center">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-2.5 shadow-lg">
                <LogIn className="h-5 w-5 text-white" />
              </div>
            </div>
            <h2 className="mt-5 text-center text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-700 transition-colors">
                create a new account
              </Link>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg flex items-center space-x-2 text-base">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-11 appearance-none relative block w-full px-3 py-2.5 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />

                  {/* PASSWORD INPUT WITH TOGGLE */}
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-11 pr-12 appearance-none relative block w-full px-3 py-2.5 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base"
                    placeholder="Enter your password"
                  />

                  {/* SHOW/HIDE BUTTON */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full flex justify-center py-2.5 px-5 border border-transparent rounded-lg shadow-lg text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-300 transform hover:scale-105"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="w-full">
              <div ref={googleButtonRef} className="flex justify-center"></div>
            </div>

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Login;

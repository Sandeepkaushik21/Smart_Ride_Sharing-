import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { authService } from '../services/authService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { showSuccess, showError } from '../utils/swal';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSuccess(true);
      await showSuccess('Temporary password has been sent to your email!');
      // Redirect to reset password page after a short delay
      setTimeout(() => {
        navigate('/reset-password', { state: { email } });
      }, 2000);
    } catch (err) {
      console.error('Forgot password error:', err);
      const errorMessage = err.message || err.response?.data?.message || 'Failed to send temporary password. Please try again.';
      setError(errorMessage);
      await showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center py-8 px-6 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 bg-white p-6 rounded-xl shadow-2xl border border-gray-100">
          <BackButton to="/login" />
          
          <div>
            <div className="flex justify-center">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-2.5 shadow-lg">
                <Mail className="h-5 w-5 text-white" />
              </div>
            </div>
            <h2 className="mt-5 text-center text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Forgot Password?
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your email address and we'll send you a temporary password
            </p>
          </div>

          {success ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg flex items-center space-x-2 text-base">
              <CheckCircle className="h-5 w-5" />
              <span>Temporary password has been sent to your email! Redirecting...</span>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg flex items-center space-x-2 text-base">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}

              <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 appearance-none relative block w-full px-3 py-2.5 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2.5 px-5 border border-transparent rounded-lg shadow-lg text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-300 transform hover:scale-105"
                  >
                    {loading ? 'Sending...' : 'Send Temporary Password'}
                  </button>
                </div>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Back to Login
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ForgotPassword;


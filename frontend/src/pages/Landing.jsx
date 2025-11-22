import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Car, Users, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { authService } from '../services/authService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Landing = () => {
  useEffect(() => {
    // Logout automatically when landing page is accessed
    if (authService.isAuthenticated()) {
      authService.logout();
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white py-16 md:py-20">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-60 h-60 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
            <div className="absolute -bottom-40 -left-40 w-60 h-60 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <span className="text-sm font-medium">Smart. Safe. Sustainable.</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold mb-5 leading-tight">
              <span className="bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent drop-shadow-2xl">
                Smart Ride Sharing
              </span>
              <br />
              <span className="text-white drop-shadow-lg">System</span>
            </h1>
            
            <p className="text-lg md:text-xl mb-7 text-blue-100 max-w-3xl mx-auto leading-relaxed font-light">
              Share your journey, save money, and help the environment.
              <br />
              <span className="text-white/90">Connect with drivers and passengers going your way.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/register"
                className="group relative px-7 py-3 bg-gradient-to-r from-white to-blue-50 text-blue-700 rounded-lg font-bold text-base shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 flex items-center gap-2"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white to-blue-50 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"></div>
              </Link>
              <Link
                to="/login"
                className="px-7 py-3 bg-white/10 backdrop-blur-md text-white rounded-lg font-semibold text-base border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Login
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 bg-gradient-to-b from-white to-gray-50 relative">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Why Choose Us?
              </h2>
              <p className="text-gray-600 text-base max-w-2xl mx-auto">
                Experience the future of ride sharing with our innovative platform
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group relative bg-white p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-14 h-14 mb-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Car className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">Easy Ride Sharing</h3>
                  <p className="text-gray-600 text-base leading-relaxed">
                    Post or find rides with just a few clicks. Simple, intuitive, and convenient for everyone.
                  </p>
                </div>
              </div>
              
              <div className="group relative bg-white p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-14 h-14 mb-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">Verified Drivers</h3>
                  <p className="text-gray-600 text-base leading-relaxed">
                    All drivers are thoroughly verified and approved by our admin team for your safety.
                  </p>
                </div>
              </div>
              
              <div className="group relative bg-white p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-14 h-14 mb-5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <ShieldCheck className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">Safe & Secure</h3>
                  <p className="text-gray-600 text-base leading-relaxed">
                    Your safety is our priority. Verified users and reliable rides with secure payments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                How It Works
              </h2>
              <p className="text-gray-600 text-base max-w-2xl mx-auto">
                Get started in three simple steps
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Connecting Line */}
              <div className="hidden md:block absolute top-18 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300"></div>
              
              <div className="relative text-center group">
                <div className="relative inline-flex items-center justify-center mb-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full w-16 h-16 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">Register</h3>
                <p className="text-gray-600 text-base leading-relaxed max-w-xs mx-auto">
                  Create your account as a driver or passenger in minutes
                </p>
              </div>
              
              <div className="relative text-center group">
                <div className="relative inline-flex items-center justify-center mb-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full w-16 h-16 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">Find or Post</h3>
                <p className="text-gray-600 text-base leading-relaxed max-w-xs mx-auto">
                  Search for rides or post your own journey with ease
                </p>
              </div>
              
              <div className="relative text-center group">
                <div className="relative inline-flex items-center justify-center mb-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-purple-500 to-pink-600 rounded-full w-16 h-16 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">Book & Travel</h3>
                <p className="text-gray-600 text-base leading-relaxed max-w-xs mx-auto">
                  Book a seat, pay securely, and enjoy your comfortable ride
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-10 bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="p-5">
                <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
                  10K+
                </div>
                <div className="text-blue-100 text-base">Active Users</div>
              </div>
              <div className="p-5">
                <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
                  50K+
                </div>
                <div className="text-blue-100 text-base">Rides Completed</div>
              </div>
              <div className="p-5">
                <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
                  98%
                </div>
                <div className="text-blue-100 text-base">Satisfaction Rate</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 text-white relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-5 drop-shadow-lg">
              Ready to Start Your Journey?
            </h2>
            <p className="text-lg md:text-xl mb-7 text-white/90 max-w-2xl mx-auto leading-relaxed">
              Join thousands of users sharing rides, saving money, and making a positive impact on the environment
            </p>
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 px-8 py-3.5 bg-white text-indigo-700 rounded-lg font-bold text-base shadow-2xl hover:shadow-white/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            >
              <span>Register Now</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Landing;


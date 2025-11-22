import { Home, Mail, Phone } from 'lucide-react';

const Footer = ({ fullWidth = false }) => {
  return (
    <footer className="w-full bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 text-white mt-auto relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      <div className={`relative w-full ${fullWidth ? 'px-0' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`} style={{ paddingTop: '4.4rem', paddingBottom: '4.4rem' }}>
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-4 ${fullWidth ? 'px-4 sm:px-6 lg:px-8' : ''}`}>
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg" style={{ padding: '0.55rem' }}>
                <Home style={{ width: '1.375rem', height: '1.375rem' }} />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent" style={{ fontSize: '1.21rem' }}>
                Smart Ride Sharing
              </h3>
            </div>
            <p className="text-gray-300 leading-relaxed" style={{ fontSize: '1.1rem' }}>
              Share your journey, save money, and help the environment. Connect with drivers and passengers going your way.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-white" style={{ fontSize: '1.1rem' }}>Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center gap-1.5 group" style={{ fontSize: '1.1rem' }}>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Home</span>
                </a>
              </li>
              <li>
                <a href="/register" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center gap-1.5 group" style={{ fontSize: '1.1rem' }}>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Register</span>
                </a>
              </li>
              <li>
                <a href="/login" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center gap-1.5 group" style={{ fontSize: '1.1rem' }}>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Login</span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-white" style={{ fontSize: '1.1rem' }}>Contact Us</h4>
            <ul className="space-y-2">
              <li className="flex items-start space-x-2">
                <div className="bg-blue-500/20 rounded-lg mt-0.5" style={{ padding: '0.55rem' }}>
                  <Mail className="text-blue-400" style={{ width: '1.1rem', height: '1.1rem' }} />
                </div>
                <span className="text-gray-300 hover:text-white transition-colors duration-300" style={{ fontSize: '1.1rem' }}>
                  ridesharingappinfosys@gmail.com
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="bg-indigo-500/20 rounded-lg mt-0.5" style={{ padding: '0.55rem' }}>
                  <Phone className="text-indigo-400" style={{ width: '1.1rem', height: '1.1rem' }} />
                </div>
                <span className="text-gray-300 hover:text-white transition-colors duration-300" style={{ fontSize: '1.1rem' }}>
                  Support: Available 24/7
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className={`border-t border-gray-700/50 mt-4 pt-3 text-center ${fullWidth ? 'px-4 sm:px-6 lg:px-8' : ''}`}>
          <p className="text-gray-400" style={{ fontSize: '1.1rem' }}>
            &copy; 2024 Smart Ride Sharing System. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


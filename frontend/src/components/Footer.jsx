import { Home, Mail, Phone } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 text-white mt-auto relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                <Home className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Smart Ride Sharing
              </h3>
            </div>
            <p className="text-gray-300 leading-relaxed text-sm">
              Share your journey, save money, and help the environment. Connect with drivers and passengers going your way.
            </p>
          </div>

          <div>
            <h4 className="text-base font-bold mb-3 text-white">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center gap-1.5 group text-sm">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Home</span>
                </a>
              </li>
              <li>
                <a href="/register" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center gap-1.5 group text-sm">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Register</span>
                </a>
              </li>
              <li>
                <a href="/login" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center gap-1.5 group text-sm">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Login</span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-base font-bold mb-3 text-white">Contact Us</h4>
            <ul className="space-y-2">
              <li className="flex items-start space-x-2">
                <div className="p-1.5 bg-blue-500/20 rounded-lg mt-0.5">
                  <Mail className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-gray-300 hover:text-white transition-colors duration-300 text-sm">
                  ridesharingappinfosys@gmail.com
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="p-1.5 bg-indigo-500/20 rounded-lg mt-0.5">
                  <Phone className="h-4 w-4 text-indigo-400" />
                </div>
                <span className="text-gray-300 hover:text-white transition-colors duration-300 text-sm">
                  Support: Available 24/7
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700/50 mt-4 pt-3 text-center">
          <p className="text-gray-400 text-sm">
            &copy; 2024 Smart Ride Sharing System. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


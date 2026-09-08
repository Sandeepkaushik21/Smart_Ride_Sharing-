# Smart Ride Sharing System - Frontend

React frontend application for the Smart Ride Sharing System.

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable components
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── BackButton.jsx
│   │   ├── CityAutocomplete.jsx
│   │   └── ProtectedRoute.jsx
│   ├── pages/            # Page components
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── PassengerDashboard.jsx
│   │   ├── DriverDashboard.jsx
│   │   └── Profile.jsx
│   ├── services/         # API services
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── rideService.js
│   │   ├── bookingService.js
│   │   ├── adminService.js
│   │   ├── cityService.js
│   │   └── userService.js
│   ├── App.jsx          # Main app with routing
│   ├── main.jsx         # Entry point
│   └── index.css       # Global styles
├── package.json
└── vite.config.js
```

## 🔑 Features

- ✅ Landing page with navbar and footer
- ✅ User authentication (Login/Register)
- ✅ Admin Dashboard with statistics and driver approval
- ✅ Passenger Dashboard with ride search and booking
- ✅ Driver Dashboard with ride posting
- ✅ City autocomplete with suggestions
- ✅ Back button on all pages
- ✅ Protected routes based on user roles
- ✅ Professional design with Tailwind CSS

## 🌐 API Configuration

The frontend connects to the backend at `http://localhost:8081/api`

To change the API URL, edit `src/services/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:8081/api';
```

## 📦 Dependencies

- **React** - UI library
- **React Router DOM** - Routing
- **Axios** - HTTP client
- **Lucide React** - Icons
- **Tailwind CSS** - Styling

## 🎨 Styling

The application uses Tailwind CSS for styling. All components are styled with Tailwind utility classes.

## 🔐 Authentication

- JWT tokens are stored in localStorage
- Tokens are automatically included in API requests
- Users are redirected to login if token expires
- Role-based access control for different dashboards

## 📝 Notes

- Make sure the backend is running on port 8081 before using the frontend
- Default admin credentials: `admin@rideshare.com` / `adminpass`
- Branch: `backup` (Stable snapshot of Smart Ride Sharing Application)

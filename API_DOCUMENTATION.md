# Smart Ride Sharing System - API Documentation

## Base URL
```
http://localhost:8080
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Public Endpoints

### 1. Register User
**POST** `/api/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "password123",
  "role": "PASSENGER" or "DRIVER",
  "vehicleModel": "Toyota Camry",  // Required for DRIVER
  "licensePlate": "ABC1234",        // Required for DRIVER
  "vehicleCapacity": 4               // Required for DRIVER
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "type": "Bearer",
  "id": 1,
  "email": "john@example.com",
  "name": "John Doe",
  "roles": ["ROLE_PASSENGER"],
  "isFirstLogin": true
}
```

**Note:** Temp password will be sent to email. User must login with temp password first time.

---

### 2. Login
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "temp-password or regular-password"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "type": "Bearer",
  "id": 1,
  "email": "john@example.com",
  "name": "John Doe",
  "roles": ["ROLE_PASSENGER"],
  "isFirstLogin": true
}
```

---

### 3. Get City Suggestions
**GET** `/api/public/cities/suggestions?query=chen`

Returns list of city names matching the query (for autocomplete).

**Response:**
```json
["Chennai", "Chengalpattu", "Cheranmadevi"]
```

---

## User Endpoints (Requires Authentication)

### 4. Get User Profile
**GET** `/api/user/profile`

Returns current user's profile.

### 5. Update User Profile
**PUT** `/api/user/profile`

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "phone": "9876543210",
  "vehicleModel": "Toyota Camry",  // For drivers only
  "licensePlate": "ABC1234",       // For drivers only
  "vehicleCapacity": 4              // For drivers only
}
```

### 6. Change Password
**POST** `/api/auth/change-password`

**Request Body:**
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password123"
}
```

---

## Passenger Endpoints (Requires ROLE_PASSENGER)

### 7. Search Rides
**GET** `/api/rides/search?source=Chennai&destination=Mumbai&date=2024-12-25&minPrice=500&maxPrice=2000&minRating=4`

**Query Parameters:**
- `source`: Source city
- `destination`: Destination city
- `date`: Date in format YYYY-MM-DD
- `minPrice`: Minimum fare (optional)
- `maxPrice`: Maximum fare (optional)
- `minRating`: Minimum driver rating (optional)

**Response:**
```json
[
  {
    "id": 1,
    "driver": {...},
    "source": "Chennai",
    "destination": "Mumbai",
    "date": "2024-12-25",
    "time": "08:00:00",
    "availableSeats": 3,
    "totalSeats": 4,
    "estimatedFare": 1500.0,
    "totalDistance": 1450.0,
    "status": "SCHEDULED"
  }
]
```

### 8. Book a Ride
**POST** `/api/bookings/book`

**Request Body:**
```json
{
  "rideId": 1,
  "pickupLocation": "Chennai Central",
  "dropoffLocation": "Mumbai Airport"
}
```

**Response:**
```json
{
  "id": 1,
  "ride": {...},
  "passenger": {...},
  "pickupLocation": "Chennai Central",
  "dropoffLocation": "Mumbai Airport",
  "distanceCovered": 1450.0,
  "fareAmount": 1500.0,
  "status": "CONFIRMED",
  "paymentStatus": "PAID",
  "paymentId": "PAY_ABC12345"
}
```

### 9. Get My Bookings
**GET** `/api/bookings/my-bookings`

Returns all bookings made by the current passenger.

---

## Driver Endpoints (Requires ROLE_DRIVER)

### 10. Post a Ride
**POST** `/api/rides/post`

**Request Body:**
```json
{
  "source": "Chennai",
  "destination": "Mumbai",
  "date": "2024-12-25",
  "time": "08:00:00",
  "availableSeats": 4
}
```

**Response:**
```json
{
  "id": 1,
  "driver": {...},
  "source": "Chennai",
  "destination": "Mumbai",
  "date": "2024-12-25",
  "time": "08:00:00",
  "availableSeats": 4,
  "totalSeats": 4,
  "estimatedFare": 1500.0,
  "totalDistance": 1450.0,
  "status": "SCHEDULED"
}
```

### 11. Get My Rides
**GET** `/api/rides/my-rides`

Returns all rides posted by the current driver.

### 12. Get Bookings for My Rides
**GET** `/api/bookings/driver-bookings`

Returns all bookings for rides posted by the current driver.

---

## Admin Endpoints (Requires ROLE_ADMIN)

### 13. Get Dashboard Statistics
**GET** `/api/admin/dashboard/stats`

**Response:**
```json
{
  "totalUsers": 150,
  "totalDrivers": 50,
  "totalPassengers": 100,
  "pendingDrivers": 5,
  "totalRides": 200,
  "totalBookings": 500
}
```

### 14. Get Pending Drivers
**GET** `/api/admin/drivers/pending`

Returns list of drivers waiting for approval.

### 15. Approve Driver
**POST** `/api/admin/drivers/{driverId}/approve`

Approves a driver account. Sends approval email to driver.

### 16. Reject Driver
**POST** `/api/admin/drivers/{driverId}/reject`

Rejects a driver account. Sends rejection email to driver.

---

## Features Implemented

✅ User Registration with temp password (sent via email)
✅ Login with temp password or regular password
✅ JWT-based authentication
✅ Role-based access control (ADMIN, DRIVER, PASSENGER)
✅ Admin approval system for drivers
✅ Email notifications for:
   - Temp credentials
   - Booking confirmations
   - Ride posted notifications
   - Driver approval/rejection

✅ Ride Posting by drivers
✅ Ride Search with filters (price, rating, date)
✅ City autocomplete suggestions
✅ Booking system with dummy payment
✅ Fare calculation based on distance
✅ Profile management
✅ Password change functionality

---

## Database Schema

### Tables Created:
- `users` - User accounts
- `roles` - User roles (ADMIN, DRIVER, PASSENGER)
- `user_roles` - User-Role mapping
- `rides` - Posted rides
- `bookings` - Ride bookings
- `reviews` - User reviews

---

## Notes

1. **Temp Password:** New users receive a temporary password via email. They must login with temp password and then change to their own password.

2. **Driver Approval:** Drivers need admin approval before they can post rides.

3. **Dummy Payment:** Payment integration is dummy. Real payment gateway can be integrated later.

4. **Distance Calculation:** Currently uses a simple calculation. Can be integrated with Google Maps Distance Matrix API.

5. **City Autocomplete:** Returns suggestions from both database and predefined common cities list.

---

## Email Configuration

Email is configured to use Gmail SMTP:
- From: ridesharingappinfosys@gmail.com
- Emails are sent for:
  - User registration (temp credentials)
  - Booking confirmations
  - Ride posted notifications
  - Driver approval/rejection


# Smart Ride Sharing System - Quick Start Guide

## 🚀 System Status: **READY**

Your application is fully configured and running on `http://localhost:8080`

---

## 🔑 Default Admin Credentials

- **Email:** `admin@rideshare.com`
- **Password:** `adminpass`
- **Role:** ADMIN

---

## 📋 Quick API Reference

### 1. Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "password123",
  "role": "PASSENGER"  // or "DRIVER"
}
```

**Note:** New users receive temp password via email. Login with temp password, then change it.

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@rideshare.com",
  "password": "adminpass"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "type": "Bearer",
  "id": 1,
  "email": "admin@rideshare.com",
  "name": "Administrator",
  "roles": ["ROLE_ADMIN"],
  "isFirstLogin": false
}
```

**Use the token in subsequent requests:**
```
Authorization: Bearer <your-token>
```

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "old-password",
  "newPassword": "new-password123"
}
```

---

### 2. Admin Endpoints (Requires ADMIN role)

#### Get Dashboard Statistics
```http
GET /api/admin/dashboard/stats
Authorization: Bearer <admin-token>
```

#### Get Pending Drivers
```http
GET /api/admin/drivers/pending
Authorization: Bearer <admin-token>
```

#### Approve Driver
```http
POST /api/admin/drivers/{driverId}/approve
Authorization: Bearer <admin-token>
```

#### Reject Driver
```http
POST /api/admin/drivers/{driverId}/reject
Authorization: Bearer <admin-token>
```

---

### 3. Driver Endpoints (Requires DRIVER role)

#### Post a Ride
```http
POST /api/rides/post
Authorization: Bearer <driver-token>
Content-Type: application/json

{
  "source": "Chennai",
  "destination": "Mumbai",
  "date": "2024-12-25",
  "time": "08:00:00",
  "availableSeats": 4
}
```

#### Get My Rides
```http
GET /api/rides/my-rides
Authorization: Bearer <driver-token>
```

#### Get Driver Bookings
```http
GET /api/bookings/driver-bookings
Authorization: Bearer <driver-token>
```

---

### 4. Passenger Endpoints (Requires PASSENGER role)

#### Search Rides
```http
GET /api/rides/search?source=Chennai&destination=Mumbai&date=2024-12-25
```

**Query Parameters:**
- `source` - Source city
- `destination` - Destination city
- `date` - Date (YYYY-MM-DD)
- `minPrice` - Optional
- `maxPrice` - Optional
- `minRating` - Optional

#### Book a Ride
```http
POST /api/bookings/book
Authorization: Bearer <passenger-token>
Content-Type: application/json

{
  "rideId": 1,
  "pickupLocation": "Chennai Central",
  "dropoffLocation": "Mumbai Airport"
}
```

#### Get My Bookings
```http
GET /api/bookings/my-bookings
Authorization: Bearer <passenger-token>
```

---

### 5. Public Endpoints (No authentication)

#### Get City Suggestions (Autocomplete)
```http
GET /api/public/cities/suggestions?query=chen
```

#### Health Check
```http
GET /api/public/health
```

#### Root/Welcome
```http
GET /
```

---

### 6. User Profile Endpoints

#### Get Profile
```http
GET /api/user/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "phone": "9876543210",
  "vehicleModel": "Toyota Camry",  // For drivers only
  "licensePlate": "ABC1234",        // For drivers only
  "vehicleCapacity": 4              // For drivers only
}
```

---

## 🔐 Role-Based Access

| Endpoint | ADMIN | DRIVER | PASSENGER | PUBLIC |
|----------|-------|--------|-----------|--------|
| `/api/auth/**` | ✅ | ✅ | ✅ | ✅ |
| `/api/public/**` | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/**` | ✅ | ❌ | ❌ | ❌ |
| `/api/rides/post` | ✅ | ✅ | ❌ | ❌ |
| `/api/rides/search` | ✅ | ✅ | ✅ | ✅ |
| `/api/bookings/book` | ✅ | ❌ | ✅ | ❌ |
| `/api/bookings/my-bookings` | ✅ | ❌ | ✅ | ❌ |
| `/api/user/profile` | ✅ | ✅ | ✅ | ❌ |

---

## 📧 Email System

Emails are automatically sent to:
- **Registration:** Temp password for first login
- **Booking Confirmation:** When passenger books a ride
- **Ride Posted:** When driver posts a ride
- **Driver Approval:** When admin approves/rejects driver

**Email Configuration:**
- From: `ridesharingappinfosys@gmail.com`
- SMTP: Gmail SMTP (configured)

---

## 💰 Payment System

**Currently:** Dummy payment integration
- Payment ID is auto-generated: `PAY_XXXXXXXX`
- Payment status: Automatically set to `PAID`
- Real payment gateway can be integrated later

---

## 🗺️ City Autocomplete

Smart city suggestions:
- Searches in database rides
- Searches in predefined common cities
- Returns matches starting with or containing query

**Example:**
```
GET /api/public/cities/suggestions?query=chen
```

Returns: `["Chennai", "Chengalpattu", ...]`

---

## 📊 Database Schema

Tables automatically created by Hibernate:
- `users` - User accounts
- `roles` - User roles (ADMIN, DRIVER, PASSENGER)
- `user_roles` - User-Role mapping
- `rides` - Posted rides
- `bookings` - Ride bookings
- `reviews` - User reviews

---

## 🧪 Testing with Postman/Thunder Client

### Step 1: Login as Admin
```http
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "email": "admin@rideshare.com",
  "password": "adminpass"
}
```

Copy the `token` from response.

### Step 2: Get Dashboard Stats
```http
GET http://localhost:8080/api/admin/dashboard/stats
Authorization: Bearer <your-token-here>
```

### Step 3: Register a Driver
```http
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{
  "name": "Driver Name",
  "email": "driver@example.com",
  "phone": "9876543210",
  "password": "password123",
  "role": "DRIVER",
  "vehicleModel": "Toyota Camry",
  "licensePlate": "ABC1234",
  "vehicleCapacity": 4
}
```

### Step 4: Approve Driver (as Admin)
```http
POST http://localhost:8080/api/admin/drivers/<driver-id>/approve
Authorization: Bearer <admin-token>
```

---

## 🔧 Configuration Files

- **Database:** `src/main/resources/application.properties`
- **MySQL:** Connected to `rsa_infosys` database
- **Email:** Gmail SMTP configured
- **JWT:** Secret key configured

---

## ✅ Next Steps

1. **Test all endpoints** with Postman/Thunder Client
2. **Frontend Integration:** Connect React/Next.js frontend
3. **Payment Integration:** Replace dummy payment with real gateway (Razorpay/Stripe)
4. **Distance API:** Integrate Google Maps Distance Matrix API
5. **Real-time Updates:** Implement WebSockets for live notifications

---

## 📞 Support

All APIs are RESTful and follow standard HTTP methods:
- `GET` - Retrieve data
- `POST` - Create data
- `PUT` - Update data
- `DELETE` - Delete data

All responses are in JSON format.

---

**Happy Coding! 🚀**


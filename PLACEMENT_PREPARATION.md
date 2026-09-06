# 🎯 Smart Ride Sharing — Placement Preparation Guide

> **Project**: Smart Ride Sharing Application (RSA Infosys)  
> **Tech Stack**: Spring Boot 3.5.7 · Java 17 · React (Vite) · MySQL · JWT · Razorpay · Google OAuth2 · LocationIQ API  
> **Architecture**: Monolithic REST API + SPA Frontend  

---

## Table of Contents

1. [Project Architecture Overview](#1-project-architecture-overview)
2. [Serialization & Deserialization — Deep Dive](#2-serialization--deserialization--deep-dive)
3. [User Input → Java Object → Database (End-to-End Flow)](#3-user-input--java-object--database-end-to-end-flow)
4. [Image Upload, Storage & Retrieval Flow](#4-image-upload-storage--retrieval-flow)
5. [Complete API Reference](#5-complete-api-reference)
6. [Authentication & Security Flow](#6-authentication--security-flow)
7. [Database Schema & Entity Relationships](#7-database-schema--entity-relationships)
8. [Design Patterns Used](#8-design-patterns-used)
9. [Key Spring Boot Annotations Explained](#9-key-spring-boot-annotations-explained)
10. [Exception Handling Strategy](#10-exception-handling-strategy)
11. [Payment Integration (Razorpay) Flow](#11-payment-integration-razorpay-flow)
12. [Email Notification System](#12-email-notification-system)
13. [Booking Lifecycle & State Machine](#13-booking-lifecycle--state-machine)
14. [Fare Calculation & Distance API](#14-fare-calculation--distance-api)
15. [Frontend Architecture](#15-frontend-architecture)
16. [Deployment & DevOps](#16-deployment--devops)
17. [Frequently Asked Interview Questions](#17-frequently-asked-interview-questions)

---

## 1. Project Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT (React + Vite)                      │
│  Landing │ Login │ Register │ PassengerDash │ DriverDash │ Admin │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTP (Axios + JWT Bearer Token)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SPRING BOOT BACKEND (Port 8081)               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Controllers │→ │  Services    │→ │  Repositories (JPA)  │   │
│  │  (REST API)  │  │  (Business)  │  │  (Data Access)       │   │
│  └──────────────┘  └──────────────┘  └──────────┬───────────┘   │
│                                                  │               │
│  ┌──────────────┐  ┌──────────────┐              │               │
│  │  DTOs        │  │  Models      │              │               │
│  │  (Request/   │  │  (Entities)  │              │               │
│  │   Response)  │  │  @Entity     │              │               │
│  └──────────────┘  └──────────────┘              │               │
│                                                  │               │
│  Security: JWT Filter → SecurityConfig → BCrypt  │               │
└──────────────────────────────────────────────────┼───────────────┘
                                                   │
                                                   ▼
                                        ┌──────────────────┐
                                        │   MySQL Database  │
                                        │   (rsa_infosys)   │
                                        └──────────────────┘

External Services:
  • Razorpay API      — Payment gateway
  • Google OAuth2     — Social login
  • LocationIQ API    — Geocoding + distance calculation
  • Gmail SMTP        — Email notifications
```

### Layered Architecture

| Layer | Package | Responsibility |
|-------|---------|----------------|
| **Controller** | `com.infosys.rsa.controller` | Receives HTTP requests, delegates to services, returns responses |
| **Service** | `com.infosys.rsa.service` | Business logic, validation, orchestration |
| **Repository** | `com.infosys.rsa.repository` | Data access via Spring Data JPA |
| **Model** | `com.infosys.rsa.model` | JPA entities mapped to DB tables |
| **DTO** | `com.infosys.rsa.dto` | Data Transfer Objects for request/response |
| **Config** | `com.infosys.rsa.config` | Security, Jackson, JWT, CORS configuration |
| **Exception** | `com.infosys.rsa.exception` | Custom exceptions + global handler |

---

## 2. Serialization & Deserialization — Deep Dive

### What is Serialization & Deserialization?

| Term | Definition | In Our Project |
|------|-----------|----------------|
| **Serialization** | Converting a Java object → JSON string (for HTTP response) | When backend sends `Ride` object to frontend |
| **Deserialization** | Converting JSON string → Java object (from HTTP request) | When frontend sends `RidePostRequest` JSON to backend |

### Where It Happens in Our Project

#### A. Jackson Library (Automatic via Spring Boot)

Spring Boot uses **Jackson** (`ObjectMapper`) for all JSON ↔ Java conversion. Configured in `JacksonConfig.java`:

```java
@Configuration
public class JacksonConfig {
    @Bean
    @Primary
    public ObjectMapper objectMapper(Jackson2ObjectMapperBuilder builder) {
        ObjectMapper mapper = builder.build();

        // 1. Handle Hibernate lazy-loaded proxies
        Hibernate6Module hibernate6Module = new Hibernate6Module();
        hibernate6Module.configure(Hibernate6Module.Feature.FORCE_LAZY_LOADING, false);
        mapper.registerModule(hibernate6Module);

        // 2. Handle Java 8 date/time types (LocalDate, LocalTime, LocalDateTime)
        mapper.registerModule(new JavaTimeModule());

        // 3. Dates as ISO strings, NOT numeric timestamps
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        return mapper;
    }
}
```

**Why each module matters:**
- **Hibernate6Module** → Prevents `LazyInitializationException` when serializing entities with `FetchType.LAZY`
- **JavaTimeModule** → Serializes `LocalDate` as `"2026-03-15"` instead of `[2026, 3, 15]`

#### B. Deserialization: JSON → Java Object

When the frontend sends a POST request:

```javascript
// Frontend (React) — rideService.js
const response = await api.post('/rides/post', rideData);
// rideData = { citySource: "Chennai", cityDestination: "Bengaluru", date: "2026-03-15", ... }
```

Spring Boot automatically deserializes the JSON body into a Java DTO:

```java
// Controller
@PostMapping("/post")
public ResponseEntity<?> postRide(@Valid @RequestBody RidePostRequest request, ...) {
    // Jackson has already converted the JSON → RidePostRequest object
    // request.getCitySource() returns "Chennai"
}
```

**The magic happens via `@RequestBody`** — Spring's `HttpMessageConverter` uses Jackson's `ObjectMapper.readValue()` internally.

#### C. Serialization: Java Object → JSON

When the controller returns a response:

```java
return ResponseEntity.ok(ride);  // Ride entity → JSON automatically
```

Jackson calls getters on the `Ride` object and builds a JSON:
```json
{
  "id": 1,
  "citySource": "Chennai",
  "cityDestination": "Bengaluru",
  "date": "2026-03-15",
  "time": "10:30:00",
  "availableSeats": 3,
  "estimatedFare": 550.0,
  "status": "SCHEDULED",
  "driver": { "id": 5, "name": "John", "email": "john@mail.com" }
}
```

#### D. Manual Serialization (ObjectMapper in Code)

Used for storing **lists as JSON strings** in the database:

```java
// In RideService.postRide() — Serialization (List → JSON String)
ride.setPickupLocationsJson(
    objectMapper.writeValueAsString(request.getPickupLocations())
);
// ["Anna Nagar", "T Nagar", "Adyar", "Velachery"] → stored as a single LONGTEXT column

// In Ride.getPickupLocationsList() — Deserialization (JSON String → List)
public List<String> getPickupLocationsList() {
    ObjectMapper mapper = new ObjectMapper();
    return mapper.readValue(pickupLocationsJson, new TypeReference<List<String>>() {});
}
```

#### E. Key Jackson Annotations Used

| Annotation | Used On | Purpose |
|-----------|---------|---------|
| `@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})` | `Ride.driver`, `Booking.ride` | Prevents serialization errors for Hibernate proxy objects |
| `@JsonIgnoreProperties({"password", "roles", "tempPassword"})` | `Booking.passenger` | Hides sensitive fields from API response |
| `@Enumerated(EnumType.STRING)` | `Ride.status`, `Booking.status` | Stores enum as `"SCHEDULED"` string, not ordinal number |
| `@SuppressWarnings("unused")` | Inner response class getters | Tells compiler the getter is used by Jackson even though it's not called in Java code |

#### F. `@ModelAttribute` vs `@RequestBody`

```java
// @RequestBody — JSON body deserialization (POST/PUT/PATCH)
@PostMapping("/post")
public ResponseEntity<?> postRide(@RequestBody RidePostRequest request) { ... }

// @ModelAttribute — Query parameter binding (GET requests)
@GetMapping("/search")
public ResponseEntity<?> searchRides(@ModelAttribute RideSearchRequest request) { ... }
// URL: /api/rides/search?source=Chennai&destination=Bengaluru&date=2026-03-15
// Spring maps query params → RideSearchRequest fields automatically
```

---

## 3. User Input → Java Object → Database (End-to-End Flow)

### Example: User Registration Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────┐
│   React UI   │ →   │  Axios POST  │ →   │  Controller  │ →   │   Service    │ →   │  DB  │
│  (Form Data) │     │  (JSON)      │     │ (DTO Deser.) │     │ (Entity Map) │     │      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────┘
```

**Step 1 — React Form collects data:**
```javascript
const userData = {
  name: "Sandeep",
  email: "sandeep@gmail.com",
  phone: "9876543210",
  password: "mypassword",
  role: "PASSENGER"
};
```

**Step 2 — Axios sends HTTP POST:**
```javascript
// authService.js
const response = await api.post('/auth/register', userData);
// Axios serializes JS object → JSON string automatically
// Content-Type: application/json
// Authorization: Bearer <token>  (added by interceptor if exists)
```

**Step 3 — Spring receives & deserializes:**
```java
// AuthController.java
@PostMapping("/register")
public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
    // Jackson deserialized JSON → RegisterRequest DTO
    // @Valid triggers Jakarta Bean Validation:
    //   @NotBlank on name, email, password
    //   @Email on email
    //   @Size(min=6) on password
}
```

**Step 4 — Service maps DTO → Entity:**
```java
// AuthService.register()
User user = new User();              // Create JPA entity
user.setName(request.getName());     // Map DTO field → Entity field
user.setEmail(request.getEmail());
user.setPassword(passwordEncoder.encode(tempPassword));  // BCrypt hashing!
user.setRoles(roles);                // Set from Role table

User savedUser = userRepository.save(user);  // JPA INSERT
```

**Step 5 — JPA/Hibernate generates SQL:**
```sql
INSERT INTO users (email, name, password, phone, provider, is_active, is_approved, 
                   is_first_login, temp_password, created_at, updated_at)
VALUES ('sandeep@gmail.com', 'Sandeep', '$2a$10$xyz...', '9876543210', 
        'local', true, true, true, 'a1b2c3d4e5', NOW(), NOW());

INSERT INTO user_roles (user_id, role_id) VALUES (1, 3);  -- ROLE_PASSENGER
```

**Step 6 — Response serialized back:**
```java
return ResponseEntity.ok(new JwtResponse(jwt, "Bearer", id, email, name, roles, isFirstLogin));
// Jackson serializes → JSON response
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "type": "Bearer",
  "id": 1,
  "email": "sandeep@gmail.com",
  "name": "Sandeep",
  "roles": ["ROLE_PASSENGER"],
  "isFirstLogin": true
}
```

**Step 7 — Frontend stores credentials:**
```javascript
// authService.js login()
localStorage.setItem('token', response.data.token);
localStorage.setItem('user', JSON.stringify(response.data));
```

---

## 4. Image Upload, Storage & Retrieval Flow

### How Vehicle Photos Work

Our project uses **Base64 encoding** to handle images — no separate file upload endpoint or cloud storage.

#### A. Upload Flow (Driver Posts Ride)

```
┌────────────────────┐     ┌─────────────────────┐     ┌───────────────────┐
│  Driver selects    │ →   │  React converts to  │ →   │  Sent as JSON     │
│  image files       │     │  Base64 strings      │     │  string array     │
└────────────────────┘     └─────────────────────┘     └────────┬──────────┘
                                                                │
                                            ┌───────────────────▼──────────────┐
                                            │  Backend receives List<String>   │
                                            │  Serializes to JSON string       │
                                            │  Stores in LONGTEXT column       │
                                            └──────────────────────────────────┘
```

**Step 1 — Frontend: File → Base64**
```javascript
// In DriverDashboard.jsx (simplified)
const handleImageUpload = (event) => {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onloadend = () => {
    // reader.result = "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    setVehiclePhotos(prev => [...prev, reader.result]);
  };
  reader.readAsDataURL(file);  // Converts binary → Base64 string
};
```

**Step 2 — Frontend sends as JSON array:**
```javascript
const rideData = {
  citySource: "Chennai",
  cityDestination: "Bengaluru",
  vehiclePhotos: [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "data:image/jpeg;base64,/9j/4BBRSkZKSh..."
  ],
  // ... other fields
};
await api.post('/rides/post', rideData);
```

**Step 3 — Backend DTO receives `List<String>`:**
```java
// RidePostRequest.java (DTO)
public class RidePostRequest {
    private List<String> vehiclePhotos;  // Base64 strings
    // ...
}
```

**Step 4 — Service serializes list → JSON string for DB:**
```java
// RideService.postRide() — The list is already in the DTO
// The Ride entity stores it as a JSON string in LONGTEXT column
ride.setVehiclePhotosJson(
    objectMapper.writeValueAsString(request.getVehiclePhotos())
);
// Result: '["data:image/jpeg;base64,/9j/...", "data:image/jpeg;base64,/9j/..."]'
```

**Step 5 — Database Storage:**
```sql
-- Table: rides
-- Column: vehicle_photos (LONGTEXT)
-- Value: '["data:image/jpeg;base64,/9j/4AAQSkZJRg...","data:image/jpeg;base64,..."]'
```

#### B. Retrieval Flow (Passenger Sees Ride)

**Step 1 — Passenger searches rides:**
```javascript
const rides = await rideService.searchRides({ source: "Chennai", destination: "Bengaluru" });
```

**Step 2 — Backend returns ride with `vehiclePhotosJson`:**
```java
// RideResponse DTO (sent to frontend)
public class RideResponse {
    private String vehiclePhotosJson;  // Raw JSON string from DB
    // ...
    public RideResponse(Ride r) {
        this.vehiclePhotosJson = r.getVehiclePhotosJson();
    }
}
```

**Step 3 — Frontend parses JSON string → renders images:**
```javascript
// In PassengerDashboard.jsx
const photos = JSON.parse(ride.vehiclePhotosJson || '[]');
// photos = ["data:image/jpeg;base64,/9j/...", ...]

{photos.map((photo, index) => (
  <img key={index} src={photo} alt={`Vehicle ${index + 1}`} />
))}
// Browser renders Base64 directly in <img> tag — no separate image URL needed
```

#### C. Helper Methods in Entity

```java
// Ride.java — Convenience method for server-side use
public List<String> getVehiclePhotosList() {
    if (vehiclePhotosJson == null || vehiclePhotosJson.isEmpty()) {
        return new ArrayList<>();
    }
    ObjectMapper mapper = new ObjectMapper();
    return mapper.readValue(vehiclePhotosJson, new TypeReference<List<String>>() {});
}
```

#### D. Why Base64 Instead of File Upload?

| Aspect | Base64 (Our Approach) | File Upload (Alternative) |
|--------|----------------------|--------------------------|
| **Simplicity** | No file server needed | Requires S3/cloud storage |
| **Single Request** | Image + data in one POST | Separate upload + link |
| **DB Storage** | LONGTEXT column | Only URL/path stored |
| **Downside** | ~33% larger than binary | Extra infrastructure |
| **Best For** | Small images, MVP | Production at scale |

---

## 5. Complete API Reference

### 🔐 Authentication APIs (`/api/auth`)

| Method | Endpoint | Auth | Request Body | Response | Description |
|--------|----------|------|-------------|----------|-------------|
| POST | `/api/auth/register` | ❌ | `RegisterRequest` | `JwtResponse` | Register new user |
| POST | `/api/auth/login` | ❌ | `LoginRequest` | `JwtResponse` | Login with email/password |
| POST | `/api/auth/google-login` | ❌ | `GoogleLoginRequest` | `JwtResponse` | OAuth2 Google login |
| POST | `/api/auth/change-password` | ✅ | `ChangePasswordRequest` | Message | Change password (first login) |
| POST | `/api/auth/forgot-password` | ❌ | `ForgotPasswordRequest` | Message | Send temp password via email |
| POST | `/api/auth/reset-password` | ❌ | `ResetPasswordRequest` | Message | Reset using temp password |

### 🚗 Ride APIs (`/api/rides`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/rides/post` | ✅ | DRIVER | Post new ride |
| GET | `/api/rides/search?source=X&destination=Y&date=Z` | ❌ | ANY | Search available rides |
| GET | `/api/rides/my-rides` | ✅ | DRIVER | Get driver's rides |
| GET | `/api/rides/{id}` | ✅ | ANY | Get ride details |
| PATCH | `/api/rides/{id}/cancel` | ✅ | DRIVER | Cancel ride + all bookings |
| PATCH | `/api/rides/{id}/reschedule` | ✅ | DRIVER | Reschedule ride |

### 📋 Booking APIs (`/api/bookings`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/bookings/book` | ✅ | PASSENGER | Create booking |
| GET | `/api/bookings/my-bookings` | ✅ | PASSENGER | My bookings |
| GET | `/api/bookings/driver-bookings` | ✅ | DRIVER | Bookings on driver's rides |
| GET | `/api/bookings/pending-bookings` | ✅ | DRIVER | Pending approvals |
| GET | `/api/bookings/{id}` | ✅ | ANY | Booking details |
| PATCH | `/api/bookings/{id}/accept` | ✅ | DRIVER | Accept booking |
| PATCH | `/api/bookings/{id}/decline` | ✅ | DRIVER | Decline booking |
| PATCH | `/api/bookings/{id}/cancel` | ✅ | PASSENGER | Cancel booking |
| PATCH | `/api/bookings/{id}/complete` | ✅ | DRIVER | Mark completed |
| PATCH | `/api/bookings/{id}/accept-reschedule` | ✅ | PASSENGER | Accept new schedule |
| PATCH | `/api/bookings/{id}/cancel-reschedule` | ✅ | PASSENGER | Reject new schedule |
| PATCH | `/api/bookings/{id}/update-locations` | ✅ | PASSENGER | Update pickup/drop |
| GET | `/api/bookings/history` | ✅ | ANY | Ride history |

### 💳 Payment APIs (`/api/payments`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/payments/create-order` | ✅ | PASSENGER | Create Razorpay order |
| POST | `/api/payments/verify` | ✅ | PASSENGER | Verify payment signature |
| GET | `/api/payments/passenger/history` | ✅ | PASSENGER | Payment history |
| GET | `/api/payments/driver/history` | ✅ | DRIVER | Driver payment history |
| GET | `/api/payments/driver/wallet` | ✅ | DRIVER | Wallet balance |
| POST | `/api/payments/driver/transfer/{bookingId}` | ✅ | DRIVER | Transfer to wallet |

### 👤 User APIs (`/api/user`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/user/profile` | ✅ | ANY | Get profile |
| PUT | `/api/user/profile` | ✅ | ANY | Update profile |
| POST | `/api/user/master-vehicle-details` | ✅ | DRIVER | Save vehicle defaults |
| GET | `/api/user/master-vehicle-details` | ✅ | DRIVER | Get vehicle defaults |

### 🛡️ Admin APIs (`/api/admin`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/admin/drivers/{id}/approve` | ✅ | ADMIN | Approve driver |
| POST | `/api/admin/drivers/{id}/reject` | ✅ | ADMIN | Reject driver |
| GET | `/api/admin/dashboard/stats` | ✅ | ADMIN | Dashboard statistics |
| GET | `/api/admin/drivers/pending` | ✅ | ADMIN | Pending driver list |
| GET | `/api/admin/drivers/all` | ✅ | ADMIN | All drivers |
| GET | `/api/admin/passengers/all` | ✅ | ADMIN | All passengers |
| DELETE | `/api/admin/users/{id}` | ✅ | ADMIN | Delete user |

### ⭐ Review APIs (`/api/reviews`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/reviews/submit` | ✅ | Submit review |
| GET | `/api/reviews/booking/{id}/has-reviewed` | ✅ | Check if reviewed |
| GET | `/api/reviews/driver/{id}/average-rating` | ❌ | Driver's avg rating |

---

## 6. Authentication & Security Flow

### JWT Authentication Flow

```
1. User logs in → POST /api/auth/login { email, password }
2. AuthService validates credentials using AuthenticationManager
3. BCryptPasswordEncoder.matches(rawPassword, hashedPassword)
4. If valid → JwtUtils.generateToken(userPrincipal)
   → JWT contains: subject=email, issuedAt, expiration (1 hour)
   → Signed with HMAC-SHA256 using secret key
5. Response: { token: "eyJ...", roles: ["ROLE_PASSENGER"], ... }
6. Frontend stores token in localStorage
7. Every subsequent request: Authorization: Bearer eyJ...
8. JwtAuthenticationFilter intercepts → validates token → sets SecurityContext
```

### Security Filter Chain

```java
http
  .cors(...)                                    // Allow frontend origins
  .csrf(disable)                                // Disabled (stateless JWT)
  .sessionManagement(STATELESS)                 // No server-side sessions
  .authorizeHttpRequests(
      "/api/auth/**"    → permitAll()           // Public
      "/api/admin/**"   → hasRole("ADMIN")      // Admin only
      anyRequest()      → authenticated()       // JWT required
  )
  .addFilterBefore(jwtAuthenticationFilter)      // Custom JWT filter
```

### Password Security

```
Registration → BCrypt hash → DB stores: $2a$10$xyz...
Login → BCryptPasswordEncoder.matches("raw", "$2a$10$xyz...") → true/false
First Login → Temp password (plain text comparison) → Force password change
```

---

## 7. Database Schema & Entity Relationships

```
┌──────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│  users   │────<│  rides   │────<│ bookings  │────<│ payments │
│          │     │          │     │           │     │          │
│ id (PK)  │     │ id (PK)  │     │ id (PK)   │     │ id (PK)  │
│ email    │     │ driver_id│     │ ride_id   │     │booking_id│
│ password │     │ source   │     │passenger_id│    │passenger_id│
│ name     │     │ dest     │     │ pickup    │     │ driver_id│
│ roles    │     │ date     │     │ dropoff   │     │ amount   │
│ ...      │     │ fare     │     │ fare      │     │ status   │
└──────────┘     │ photos   │     │ status    │     └──────────┘
     │           └──────────┘     └───────────┘
     │                                  │
     ├────< user_roles                  ├────< reviews
     │      (user_id, role_id)          │      (booking_id, reviewer_id, rating)
     │
     └────< vehicles
            (driver_id, model, photos, compliance docs)
```

### Key Relationships

| Relationship | Type | Annotation |
|-------------|------|-----------|
| User ↔ Role | Many-to-Many | `@ManyToMany` + `user_roles` join table |
| Driver → Rides | One-to-Many | `@ManyToOne` on Ride.driver |
| Ride → Bookings | One-to-Many | `@ManyToOne` on Booking.ride |
| Booking → Payment | One-to-One | `@ManyToOne` on Payment.booking |
| Passenger → Bookings | One-to-Many | `@ManyToOne` on Booking.passenger |
| Booking → Review | One-to-One | `@ManyToOne` on Review.booking |

---

## 8. Design Patterns Used

| Pattern | Where | Example |
|---------|-------|---------|
| **MVC** | Entire app | Controller → Service → Repository |
| **DTO Pattern** | Request/Response | `RidePostRequest`, `RideResponse`, `JwtResponse` |
| **Repository Pattern** | Data access | `JpaRepository<Ride, Long>` |
| **Filter Chain** | Security | `JwtAuthenticationFilter extends OncePerRequestFilter` |
| **Builder Pattern** | JWT creation | `Jwts.builder().subject().expiration().signWith().compact()` |
| **Strategy Pattern** | Auth providers | Local login vs Google OAuth vs Temp password |
| **Observer Pattern** | Email notifications | Service events → EmailService.send*() |
| **Singleton** | Spring Beans | `@Service`, `@Component` (default scope) |
| **Factory Method** | UserPrincipal | `UserPrincipal.create(user)` |
| **Global Exception Handler** | Error handling | `@RestControllerAdvice` + `@ExceptionHandler` |

---

## 9. Key Spring Boot Annotations Explained

| Annotation | Purpose | Example |
|-----------|---------|---------|
| `@Entity` | Maps class to DB table | `@Entity class Ride` → `rides` table |
| `@Table(name="rides")` | Custom table name | Override default naming |
| `@Id` + `@GeneratedValue` | Primary key, auto-increment | `private Long id;` |
| `@ManyToOne(fetch=LAZY)` | FK relationship, lazy load | `private User driver;` |
| `@JoinColumn` | FK column name | `@JoinColumn(name="driver_id")` |
| `@Column(columnDefinition="LONGTEXT")` | Big text column | For Base64 images |
| `@Enumerated(EnumType.STRING)` | Enum as string in DB | `SCHEDULED`, `CANCELLED` |
| `@PrePersist` / `@PreUpdate` | Lifecycle hooks | Auto-set `createdAt`, `updatedAt` |
| `@Transactional` | DB transaction boundary | Ensures atomicity |
| `@Valid` + `@RequestBody` | Input validation + deserialization | Controller params |
| `@PreAuthorize("hasRole('DRIVER')")` | Method-level security | Role-based access |
| `@RestControllerAdvice` | Global exception handler | `GlobalExceptionHandler` |
| `@Value("${property}")` | Inject config properties | `@Value("${razorpay.key.id}")` |
| `@CrossOrigin` | CORS headers | Allow frontend requests |

---

## 10. Exception Handling Strategy

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RideNotFoundException.class)       // 404
    @ExceptionHandler(InsufficientSeatsException.class)  // 400
    @ExceptionHandler(DuplicateBookingException.class)   // 409 Conflict
    @ExceptionHandler(EmailAlreadyTakenException.class)  // 409
    @ExceptionHandler(BadCredentialsException.class)     // 401
    @ExceptionHandler(MethodArgumentNotValidException.class) // 400 (Bean Validation)
    @ExceptionHandler(RuntimeException.class)            // 400 (catch-all)
    @ExceptionHandler(Exception.class)                   // 500 (unexpected)
}
```

Custom exceptions extend `RuntimeException` and are caught by the global handler, which returns a standardized `ErrorResponse(statusCode, message, timestamp)`.

---

## 11. Payment Integration (Razorpay) Flow

```
1. Passenger clicks "Pay" → Frontend calls createOrder({ bookingId, amount })
2. Backend creates Razorpay order via RazorpayClient → returns orderId + keyId
3. Frontend opens Razorpay checkout modal with orderId
4. User completes payment on Razorpay's secure page
5. Razorpay returns: razorpayPaymentId + razorpaySignature
6. Frontend calls verifyPayment({ orderId, paymentId, signature })
7. Backend verifies signature using HMAC-SHA256:
   text = orderId + "|" + paymentId
   expected = HMAC_SHA256(text, razorpayKeySecret)
   Compare with received signature
8. If valid → Payment.status = SUCCESS, Booking.status = CONFIRMED
9. Email confirmations sent to passenger + driver
```

---

## 12. Email Notification System

Uses Spring Boot Mail Starter + Gmail SMTP. The `EmailService` sends emails for:

| Event | Recipient | Method |
|-------|----------|--------|
| Registration | New user | `sendTempCredentials()` |
| Booking confirmed | Passenger | `sendBookingConfirmation()` |
| New booking | Driver | `sendRideBookingNotification()` |
| Booking accepted | Passenger | `sendDriverAcceptanceNotification()` |
| Ride cancelled | All passengers | `sendRideCancellationNotification()` |
| Booking cancelled | Driver | `sendBookingCancellationNotification()` |
| Ride rescheduled | All passengers | `sendRideRescheduleNotification()` |
| Forgot password | User | `sendForgotPasswordEmail()` |
| Driver approved | Driver | `sendDriverApprovalNotification()` |

---

## 13. Booking Lifecycle & State Machine

```
                    ┌──────────┐
                    │ PENDING  │ ← Passenger books
                    └────┬─────┘
                  ┌──────┼──────┐
                  ▼      ▼      ▼
            ┌─────────┐  ┌───────────┐
            │ACCEPTED │  │ CANCELLED │ ← Driver declines
            └────┬────┘  └───────────┘
                 │
                 ▼ (Razorpay Payment)
            ┌──────────┐
            │CONFIRMED │ ← Payment success
            └────┬─────┘
          ┌──────┼──────────┐
          ▼      ▼          ▼
    ┌──────────┐ ┌───────────┐ ┌─────────────┐
    │COMPLETED │ │ CANCELLED │ │ RESCHEDULED │
    └──────────┘ └───────────┘ └──────┬──────┘
                                ┌─────┼─────┐
                                ▼           ▼
                          ┌──────────┐ ┌───────────┐
                          │CONFIRMED │ │ CANCELLED │
                          └──────────┘ └───────────┘
```

---

## 14. Fare Calculation & Distance API

```java
// FareCalculationService.java
// Formula: fare = BASE_FARE(₹50) + RATE_PER_KM(₹5) × distance

// Distance calculation priority:
// 1. LocationIQ Directions API (actual road distance)
// 2. Haversine formula (straight-line, as fallback)
// 3. Hash-based fallback (when no API key configured)
```

---

## 15. Frontend Architecture

| Component | Path | Purpose |
|----------|------|---------|
| `api.js` | services/ | Axios instance + JWT interceptor + error handler |
| `authService.js` | services/ | Login, register, token management |
| `ProtectedRoute.jsx` | components/ | Route guard (checks auth + role) |
| `PassengerDashboard.jsx` | pages/ | Search rides, book, pay, history |
| `DriverDashboard.jsx` | pages/ | Post rides, manage bookings, wallet |
| `AdminDashboard.jsx` | pages/ | Approve drivers, stats, user management |
| `RazorpayPaymentModal.jsx` | components/ | Razorpay checkout integration |

---

## 16. Deployment & DevOps

- **Docker**: Multi-stage build → Maven build → JDK 17 Alpine runtime
- **SonarQube**: Code quality analysis (configured in `sonar-project.properties`)
- **JaCoCo**: Test coverage reports
- **Logging**: SLF4J + Logback with file + console appenders

---

## 17. Frequently Asked Interview Questions

### Architecture & Design

**Q: Explain the architecture of your project.**  
A: It follows a **layered monolithic architecture** — Controller (REST endpoints) → Service (business logic) → Repository (JPA data access) → MySQL database. The frontend is a React SPA communicating via REST APIs with JWT authentication.

**Q: Why did you choose a monolithic architecture over microservices?**  
A: For an academic/MVP project, a monolith is simpler to develop, deploy, and debug. The clear package structure (controller/service/repository/model/dto) allows easy migration to microservices later.

**Q: What design patterns did you use?**  
A: MVC, DTO pattern, Repository pattern, Filter Chain (JWT), Builder (JWT tokens), Strategy (multiple auth providers), Observer (email notifications), Singleton (Spring beans), Factory Method (UserPrincipal.create).

### Serialization / Deserialization

**Q: What is serialization and deserialization?**  
A: Serialization is converting a Java object to JSON (for API responses). Deserialization is converting JSON to a Java object (from API requests). In our project, Jackson handles this automatically via `@RequestBody` and `ResponseEntity`.

**Q: How does `@RequestBody` work?**  
A: Spring's `HttpMessageConverter` reads the request body, detects `Content-Type: application/json`, and uses Jackson's `ObjectMapper.readValue()` to map JSON fields to the DTO's setter methods.

**Q: How do you handle Java 8 dates in JSON?**  
A: We register `JavaTimeModule` in our `JacksonConfig` and disable `WRITE_DATES_AS_TIMESTAMPS`, so `LocalDate` serializes as `"2026-03-15"` instead of `[2026,3,15]`.

### Image Handling

**Q: How do you handle image uploads?**  
A: Images are converted to Base64 strings on the frontend using `FileReader.readAsDataURL()`, sent as a JSON array in the request body, and stored as a LONGTEXT column in the database. On retrieval, the Base64 string is directly used as img `src`.

**Q: Why Base64 instead of file upload?**  
A: Simplicity — no separate file server or cloud storage needed. The tradeoff is ~33% size overhead. For production at scale, we'd use AWS S3 or similar.

### Security

**Q: Explain JWT authentication in your project.**  
A: On login, we generate a JWT token signed with HMAC-SHA256. The token contains the user's email and expiry (1 hour). Every API request sends this token in the `Authorization: Bearer` header. The `JwtAuthenticationFilter` validates it and sets the `SecurityContext`.

**Q: How do you handle role-based access?**  
A: Using Spring Security's `@PreAuthorize("hasRole('DRIVER')")` on controller methods. Roles are stored in a separate `roles` table with a many-to-many join table `user_roles`.

**Q: How are passwords stored?**  
A: Passwords are hashed using BCrypt (`BCryptPasswordEncoder`). We never store plain text passwords. The first login uses a temporary password, after which the user must set their own.

### Database

**Q: How does JPA/Hibernate work in your project?**  
A: JPA annotations (`@Entity`, `@Table`, `@Column`) map Java classes to database tables. Hibernate auto-generates DDL (`spring.jpa.hibernate.ddl-auto=update`). Spring Data JPA's `JpaRepository` provides CRUD + custom queries.

**Q: What is `FetchType.LAZY` and why do you use it?**  
A: LAZY loading means related entities (e.g., Ride's driver) are not loaded from DB until actually accessed. This prevents the N+1 problem and improves performance. We use `Hibernate6Module` in Jackson to handle serialization of lazy proxies.

**Q: Explain the `@ManyToOne` relationship.**  
A: A `Booking` has `@ManyToOne` to `Ride` — many bookings can belong to one ride. JPA creates a `ride_id` FK column in the `bookings` table.

### Payment

**Q: How does Razorpay integration work?**  
A: Three steps — (1) Backend creates a Razorpay order with amount in paise, (2) Frontend opens Razorpay checkout, (3) After payment, backend verifies the HMAC-SHA256 signature to prevent tampering. Only then is the booking status changed to CONFIRMED.

### Spring Boot Concepts

**Q: What is `@Transactional`?**  
A: It wraps the method in a database transaction. If any exception occurs, all DB changes are rolled back. We use it in service methods that modify multiple tables (e.g., cancelling a ride also cancels all its bookings).

**Q: What is `@RestControllerAdvice`?**  
A: It's a global exception handler. Any exception thrown from any controller is caught here, allowing us to return consistent error responses with proper HTTP status codes.

**Q: Explain Dependency Injection.**  
A: Spring's IoC container manages object creation. `@Autowired` injects dependencies automatically. For example, `BookingService` gets `BookingRepository`, `RideRepository`, `EmailService` injected without manual instantiation.

**Q: What is the difference between `@Component`, `@Service`, `@Repository`, `@Controller`?**  
A: All are stereotypes for Spring beans. `@Service` = business logic, `@Repository` = data access (adds exception translation), `@Controller`/`@RestController` = web layer. They're all `@Component` internally — the distinction is for clarity.

---

> 💡 **Pro Tip**: When explaining any flow in the interview, always describe it end-to-end:  
> **Frontend (user action) → HTTP request → Controller → Service → Repository → Database → Response → Frontend update**

---

*Generated for placement preparation — Smart Ride Sharing Project (RSA Infosys)*

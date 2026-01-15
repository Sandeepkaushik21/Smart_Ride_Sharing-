<div align="center">
  <h1>🚗 Smart Ride Sharing System</h1>
  <p><b>A modern, secure, and scalable solution for urban carpooling and ride-sharing.</b></p>

  [![Spring Boot](https://img.shields.io/badge/Spring%20Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
  [![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
  [![Razorpay](https://img.shields.io/badge/Razorpay-02042B?style=for-the-badge&logo=razorpay&logoColor=3399FF)](https://razorpay.com/)

  <h4>
    <a href="https://www.smartrideapp.online/">🌐 Live Demo</a>
  </h4>
</div>

---


## ✨ Features

* 👤 **Role-Based Dashboards:** Separate, feature-rich interfaces for Admins, Drivers, and Passengers.
* 🔐 **Complete Authentication Flow:** Secure user registration, JWT-based login, and password management (change/forgot/reset).
* 🛡️ **Admin Panel:** Comprehensive dashboard with system statistics, user management (drivers/passengers), and a workflow for approving or rejecting new driver registrations.
* 🚘 **Driver Functionality:** Post new rides with detailed options, manage incoming booking requests (accept/decline), view ride history, and reschedule upcoming rides.
* 🎒 **Passenger Functionality:** Search for available rides by source, destination, and date. Book seats, manage bookings, view trip history, and submit ratings for drivers.
* 📍 **Dynamic Location Services:** Uses **LocationIQ API** for city and place autocompletion, simplifying the ride posting and searching process.
* 🐳 **Containerization:** Includes a `Dockerfile` for easy backend deployment.
* 📊 **Code Quality Analysis:** Pre-configured with **SonarQube** and **JaCoCo** for maintaining code quality and test coverage.

---

## 💳 Payment Integration Details

The system features a secure, multi-step payment workflow integrated with **Razorpay Test Method** to ensure trust between passengers and drivers at same time for development propose too.

### 🔄 The Payment Workflow:
1.  **Booking Request:** A passenger requests a seat. The status is initially set to `PENDING`.
2.  **Driver Approval:** The driver reviews the request. Once they select `ACCEPT`, the booking moves to `ACCEPTED` status.
3.  **Order Creation:** The backend generates a unique **Razorpay Order ID** based on the calculated ride fare.
4.  **Secure Checkout:** The passenger completes the transaction via the Razorpay Checkout UI, which supports:
    * 📱 **UPI** (Google Pay, PhonePe, Paytm)
    * 💳 **Credit & Debit Cards**
    * 🏦 **Net Banking**
    * 👛 **Digital Wallets**
5.  **Signature Verification:** The backend verifies the `razorpay_signature` to prevent tampering and updates the booking to `PAID` status.
6.  **Transaction History:** All successful payments are logged in a dedicated transaction table for audit and history viewing.

---

## 🛠 Tech Stack

* ☕ **Backend:** Java 17, Spring Boot, Spring Security (JWT), Spring Data JPA, Hibernate, Maven
* ⚛️ **Frontend:** React, Vite, Tailwind CSS, Axios, React Router
* 🗄️ **Database:** MySQL (Primary), with support for PostgreSQL
* 💸 **Payments:** Razorpay (API Integration)
* 🗺️ **Location Services:** LocationIQ
* ⚙️ **Tooling & DevOps:** Docker, SonarQube, JaCoCo

---

## 📂 Project Structure

The repository is a monorepo containing two main applications:

* `/src`: 🧠 The Java Spring Boot backend application.
* `/frontend`: 🎨 The React frontend application.

---

## 🚀 Local Development Setup

### 📋 Prerequisites
* Java 17 or higher
* Maven 3.6+
* Node.js 20.x or higher
* MySQL (Create database `rrideshare` manually)
* SMTP server for emails (Gmail App Password)

### ⚙️ Backend Setup
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Sandeepkaushik21/Smart_Ride_Sharing-.git](https://github.com/Sandeepkaushik21/Smart_Ride_Sharing-.git)

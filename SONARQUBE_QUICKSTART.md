# SonarQube Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Start SonarQube Server

**Using Docker (Easiest):**
```bash
docker run -d --name sonarqube -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true -p 9000:9000 sonarqube:community
```

Wait 1-2 minutes for SonarQube to start, then open: http://localhost:9000

### Step 2: Login and Create Project

1. **Login:** 
   - URL: http://localhost:9000
   - Username: `admin`
   - Password: `admin` (change on first login)

2. **Create Project:**
   - Click "Create Project" → "Manually"
   - Project Key: `rsa-infosys-ride-sharing`
   - Display Name: `RSA Infosys - Ride Sharing Application`
   - Click "Set Up"

3. **Generate Token:**
   - Go to: My Account → Security
   - Generate token: `rsa-project-token`
   - **Copy the token!**

### Step 3: Run Analysis

```bash
# From project root directory
mvn clean test sonar:sonar \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=YOUR_TOKEN_HERE
```

### Step 4: View Results

Open: http://localhost:9000 → Click on your project

---

## 📋 What's Already Configured?

✅ SonarQube Maven plugin in `pom.xml`  
✅ JaCoCo coverage plugin in `pom.xml`  
✅ `sonar-project.properties` configuration file  
✅ `.sonarqubeignore` exclusion file  

---

## 🔧 Common Commands

```bash
# Start SonarQube (Docker)
docker start sonarqube

# Stop SonarQube (Docker)
docker stop sonarqube

# Run analysis
mvn clean test sonar:sonar -Dsonar.login=YOUR_TOKEN

# Check if SonarQube is running
curl http://localhost:9000/api/system/status
```

---

## 📖 Full Documentation

For detailed setup instructions, troubleshooting, and best practices, see:
**[SONARQUBE_SETUP.md](./SONARQUBE_SETUP.md)**

---

## ⚠️ Troubleshooting

**Can't connect?** → Make sure SonarQube is running on port 9000  
**Authentication failed?** → Check your token is correct  
**No coverage?** → Run `mvn test` before `sonar:sonar`  

---

**Need help?** Check the full setup guide: [SONARQUBE_SETUP.md](./SONARQUBE_SETUP.md)


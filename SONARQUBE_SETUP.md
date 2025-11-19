# SonarQube Setup Guide for RSA Infosys Ride Sharing Application

This guide will help you set up and use SonarQube for code quality analysis in your project.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Options](#installation-options)
3. [Configuration](#configuration)
4. [Running Analysis](#running-analysis)
5. [Viewing Results](#viewing-results)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## 🔧 Prerequisites

Before setting up SonarQube, ensure you have:

- ✅ Java 17 or higher installed
- ✅ Maven 3.6+ installed
- ✅ At least 2GB RAM available
- ✅ Docker (optional, for containerized setup)
- ✅ Internet connection (for downloading SonarQube)

---

## 📦 Installation Options

### Option 1: Docker (Recommended for Quick Setup)

This is the easiest way to get SonarQube running locally.

#### Step 1: Pull SonarQube Docker Image

```bash
docker pull sonarqube:community
```

#### Step 2: Run SonarQube Container

```bash
docker run -d --name sonarqube -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true -p 9000:9000 sonarqube:community
```

**Note:** The `SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true` is required for Docker on Windows/Mac.

#### Step 3: Access SonarQube

Open your browser and navigate to:
```
http://localhost:9000
```

**Default Credentials:**
- Username: `admin`
- Password: `admin` (you'll be prompted to change it on first login)

---

### Option 2: Manual Installation

#### Step 1: Download SonarQube

1. Visit: https://www.sonarqube.org/downloads/
2. Download the Community Edition (free)
3. Extract the ZIP file to a directory (e.g., `C:\sonarqube` or `/opt/sonarqube`)

#### Step 2: Start SonarQube Server

**Windows:**
```bash
cd C:\sonarqube\bin\windows-x86-64
StartSonar.bat
```

**Linux/Mac:**
```bash
cd /opt/sonarqube/bin/linux-x86-64
./sonar.sh start
```

#### Step 3: Access SonarQube

Open your browser and navigate to:
```
http://localhost:9000
```

**Default Credentials:**
- Username: `admin`
- Password: `admin` (you'll be prompted to change it on first login)

---

### Option 3: SonarCloud (Cloud-Based - Free for Public Repos)

If your project is on GitHub/GitLab and is public, you can use SonarCloud for free:

1. Go to: https://sonarcloud.io
2. Sign up with your GitHub/GitLab account
3. Create a new project
4. Follow the setup wizard

---

## ⚙️ Configuration

### Step 1: Create SonarQube Project

1. Log in to SonarQube (http://localhost:9000)
2. Click on **"Create Project"** → **"Manually"**
3. Fill in:
   - **Project Key:** `rsa-infosys-ride-sharing`
   - **Display Name:** `RSA Infosys - Ride Sharing Application`
4. Click **"Set Up"**

### Step 2: Generate Authentication Token

1. Go to **My Account** → **Security** (top right corner)
2. Generate a new token:
   - **Name:** `rsa-project-token`
   - **Type:** `Project Analysis Token`
   - **Project:** Select your project
3. **Copy the token** (you won't see it again!)

### Step 3: Configure Project Settings

The project is already configured with:
- ✅ `sonar-project.properties` file in the root directory
- ✅ SonarQube Maven plugin in `pom.xml`
- ✅ JaCoCo plugin for code coverage

### Step 4: Set Environment Variables (Optional but Recommended)

**Windows (PowerShell):**
```powershell
$env:SONAR_TOKEN="your-generated-token-here"
$env:SONAR_HOST_URL="http://localhost:9000"
```

**Windows (CMD):**
```cmd
set SONAR_TOKEN=your-generated-token-here
set SONAR_HOST_URL=http://localhost:9000
```

**Linux/Mac:**
```bash
export SONAR_TOKEN="your-generated-token-here"
export SONAR_HOST_URL="http://localhost:9000"
```

**Or add to your `~/.bashrc` or `~/.zshrc`:**
```bash
export SONAR_TOKEN="your-generated-token-here"
export SONAR_HOST_URL="http://localhost:9000"
```

---

## 🚀 Running Analysis

### Method 1: Using Maven (Recommended)

Navigate to your project root directory and run:

```bash
# Clean and compile the project
mvn clean compile

# Run tests with coverage
mvn test

# Run SonarQube analysis
mvn sonar:sonar \
  -Dsonar.projectKey=rsa-infosys-ride-sharing \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=your-generated-token-here
```

**Or if you set environment variables:**
```bash
mvn clean test sonar:sonar
```

### Method 2: Using SonarQube Scanner (Alternative)

If you prefer using the standalone scanner:

1. Download SonarQube Scanner from: https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/
2. Extract and add to PATH
3. Run:
```bash
sonar-scanner \
  -Dsonar.projectKey=rsa-infosys-ride-sharing \
  -Dsonar.sources=src/main/java \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=your-generated-token-here
```

### Method 3: Using SonarCloud (If using cloud option)

```bash
mvn clean verify sonar:sonar \
  -Dsonar.projectKey=your-org_rsa-infosys-ride-sharing \
  -Dsonar.organization=your-org \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.login=your-sonarcloud-token
```

---

## 📊 Viewing Results

### After Running Analysis

1. **Wait for analysis to complete** (usually 1-5 minutes)
2. **Open SonarQube Dashboard:**
   - Go to: http://localhost:9000
   - Click on your project name
3. **View the dashboard** which shows:
   - **Bugs:** Number of bugs found
   - **Vulnerabilities:** Security issues
   - **Code Smells:** Code quality issues
   - **Coverage:** Test coverage percentage
   - **Duplications:** Code duplication percentage

### Understanding the Metrics

- **Reliability Rating:** Based on bugs (A = 0 bugs, E = 5+ bugs)
- **Security Rating:** Based on vulnerabilities (A = 0, E = 5+)
- **Maintainability Rating:** Based on code smells (A = 0-5%, E = 20%+)
- **Coverage:** Percentage of code covered by tests
- **Duplications:** Percentage of duplicated code

### Key Sections

1. **Issues Tab:** View all issues categorized by severity
2. **Measures Tab:** Detailed metrics and statistics
3. **Code Tab:** Browse source code with inline issue markers
4. **Activity Tab:** Analysis history and trends

---

## 🔍 Troubleshooting

### Issue 1: "Unable to connect to SonarQube server"

**Solution:**
- Ensure SonarQube server is running: `http://localhost:9000`
- Check firewall settings
- Verify `SONAR_HOST_URL` is correct

### Issue 2: "Authentication failed"

**Solution:**
- Verify your token is correct
- Regenerate token if needed
- Check token hasn't expired

### Issue 3: "Out of memory" errors

**Solution:**
- Increase Java heap size:
  ```bash
  export SONAR_SCANNER_OPTS="-Xmx2048m"
  ```
- Or edit `sonar.sh` and increase memory settings

### Issue 4: "No coverage data found"

**Solution:**
- Ensure tests are run before analysis: `mvn clean test sonar:sonar`
- Check JaCoCo report is generated: `target/site/jacoco/jacoco.xml`
- Verify `sonar.coverage.jacoco.xmlReportPaths` in `sonar-project.properties`

### Issue 5: Analysis takes too long

**Solution:**
- Exclude unnecessary files in `sonar-project.properties`
- Use `.sonarqubeignore` file
- Analyze only changed files (incremental analysis)

### Issue 6: Frontend code not analyzed

**Note:** SonarQube primarily analyzes Java code. For JavaScript/React analysis:
- Use ESLint for frontend code quality
- Consider SonarJS plugin (paid) or SonarCloud (free for public repos)
- Or use separate tools like ESLint, Prettier for frontend

---

## 💡 Best Practices

### 1. Run Analysis Regularly

```bash
# Add to your CI/CD pipeline
mvn clean test sonar:sonar
```

### 2. Set Quality Gates

1. Go to **Quality Gates** in SonarQube
2. Create or modify a quality gate
3. Set thresholds for:
   - Coverage: Minimum 70%
   - Duplications: Maximum 3%
   - Maintainability Rating: A or B
   - Security Rating: A or B

### 3. Fix Critical Issues First

- Focus on **Blocker** and **Critical** issues
- Address **Security** vulnerabilities immediately
- Fix **Bugs** before code smells

### 4. Review Before Committing

```bash
# Run analysis before committing
mvn clean test sonar:sonar
```

### 5. Use SonarLint in IDE

Install SonarLint plugin in your IDE (IntelliJ, Eclipse, VS Code) to get real-time feedback while coding.

---

## 📝 Quick Reference Commands

### Start SonarQube (Docker)
```bash
docker start sonarqube
```

### Stop SonarQube (Docker)
```bash
docker stop sonarqube
```

### Run Full Analysis
```bash
mvn clean test sonar:sonar
```

### Check SonarQube Status
```bash
curl http://localhost:9000/api/system/status
```

### View Project in Browser
```
http://localhost:9000
```

---

## 🎯 Next Steps After Setup

1. ✅ **Run your first analysis:**
   ```bash
   mvn clean test sonar:sonar
   ```

2. ✅ **Review the results** in SonarQube dashboard

3. ✅ **Fix critical issues** starting with security vulnerabilities

4. ✅ **Set up quality gates** to maintain code quality

5. ✅ **Integrate with CI/CD** (Jenkins, GitHub Actions, etc.)

6. ✅ **Install SonarLint** in your IDE for real-time feedback

---

## 📚 Additional Resources

- **SonarQube Documentation:** https://docs.sonarqube.org/
- **SonarQube Community:** https://community.sonarsource.com/
- **Maven Plugin Docs:** https://docs.sonarqube.org/latest/analysis/scan/sonarscanner-for-maven/
- **JaCoCo Documentation:** https://www.jacoco.org/jacoco/

---

## 🆘 Need Help?

If you encounter any issues:

1. Check the **Troubleshooting** section above
2. Review SonarQube logs: `sonarqube/logs/sonar.log`
3. Check Maven logs for errors
4. Visit SonarQube community forum

---

## ✅ Checklist

After completing setup, verify:

- [ ] SonarQube server is running and accessible
- [ ] Project is created in SonarQube
- [ ] Authentication token is generated and saved
- [ ] `sonar-project.properties` is configured
- [ ] First analysis runs successfully
- [ ] Results are visible in SonarQube dashboard
- [ ] Quality gates are configured
- [ ] Team members have access

---

**Happy Analyzing! 🎉**


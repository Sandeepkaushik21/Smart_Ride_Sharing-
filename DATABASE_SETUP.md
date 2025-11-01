# Database Setup Instructions

## Create MySQL Database

Before running the application, you need to create the MySQL database manually.

### Option 1: Using MySQL Command Line

1. Open MySQL command line or MySQL Workbench
2. Login with your MySQL root user
3. Run the following command:

```sql
CREATE DATABASE IF NOT EXISTS rsa_infosys CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Option 2: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your MySQL server
3. Click on the "New SQL Tab" button
4. Execute:
```sql
CREATE DATABASE IF NOT EXISTS rsa_infosys CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Option 3: Using Command Line (Windows PowerShell)

```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS rsa_infosys CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

When prompted, enter your MySQL root password: `@Sandeep2106`

## Verify Database Creation

To verify the database was created:

```sql
SHOW DATABASES;
```

You should see `rsa_infosys` in the list.

## After Database Creation

Once the database is created:
1. The application will automatically create all required tables using Hibernate's `ddl-auto=update`
2. Default roles (ADMIN, DRIVER, PASSENGER) will be created automatically by the DataInitializer
3. Start your Spring Boot application with: `mvn spring-boot:run`

## Database Connection Details

- **Host:** localhost
- **Port:** 3306
- **Database:** rsa_infosys
- **Username:** root
- **Password:** @Sandeep2106


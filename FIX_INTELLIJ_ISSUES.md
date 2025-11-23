# Fix IntelliJ IDEA Issues - Maven and Lombok

## Problem 1: Maven Class Cast Exception
```
class org.jetbrains.idea.maven.model.MavenId cannot be cast to class 
org.jetbrains.idea.maven.model.MavenArtifactInfo
```

## Problem 2: Lombok Annotations Not Showing
- `@Data`, `@Getter`, `@Setter`, etc. annotations not recognized

---

## Complete Fix Steps

### Step 1: Install/Enable Lombok Plugin

1. **Open IntelliJ IDEA Settings:**
   - Go to `File` → `Settings` (or `Ctrl + Alt + S` on Windows/Linux)
   - Or `IntelliJ IDEA` → `Preferences` (on macOS)

2. **Install Lombok Plugin:**
   - Go to `Plugins`
   - Search for "Lombok"
   - If not installed, click `Install`
   - If installed, make sure it's **Enabled** ✓
   - Click `Apply` and `OK`

3. **Restart IntelliJ** if the plugin was just installed

---

### Step 2: Enable Annotation Processing

1. **Open Settings:**
   - `File` → `Settings` → `Build, Execution, Deployment` → `Compiler` → `Annotation Processors`

2. **Enable Annotation Processing:**
   - ✅ Check **"Enable annotation processing"**
   - Select **"Obtain processors from project classpath"**
   - Click `Apply` and `OK`

---

### Step 3: Fix Maven Class Cast Error

1. **Invalidate Caches:**
   - Go to `File` → `Invalidate Caches...`
   - Check all options:
     - ✅ Clear file system cache and Local History
     - ✅ Clear downloaded shared indexes
   - Click `Invalidate and Restart`

2. **After Restart - Reimport Maven Project:**
   - Open `Maven` tool window (usually on the right side, or `View` → `Tool Windows` → `Maven`)
   - Click the **Reload All Maven Projects** button (🔄 icon)
   - Or right-click on `pom.xml` → `Maven` → `Reload project`

3. **If that doesn't work, delete and reimport:**
   - Close IntelliJ
   - Delete these folders/files if they exist:
     - `.idea` folder (backup first if you have custom settings!)
     - `target` folder
   - Reopen IntelliJ and open the project
   - IntelliJ will detect it's a Maven project and import it

---

### Step 4: Configure Project SDK

1. **Check Project SDK:**
   - `File` → `Project Structure` (`Ctrl + Alt + Shift + S`)
   - Go to `Project` section
   - Make sure **SDK** is set to Java 17 or higher (the project uses Java 17)
   - Set **Language level** to `17 - Sealed types, always-strict floating-point semantics`

2. **If using Java 25 (as detected in misc.xml):**
   - This should work, but if issues persist, try setting to Java 17 explicitly

---

### Step 5: Update Maven Settings

1. **Check Maven Configuration:**
   - `File` → `Settings` → `Build, Execution, Deployment` → `Build Tools` → `Maven`
   - Ensure **"Maven home path"** points to a valid Maven installation
   - Check **"User settings file"** - should point to your `settings.xml`

2. **Update Maven Project:**
   - In Maven tool window, click **"Reload All Maven Projects"** (🔄)

---

### Step 6: Verify Lombok is Working

1. **Check if Lombok annotations are recognized:**
   - Open any file using Lombok (e.g., `Booking.java`, `User.java`)
   - You should see no red errors on `@Data`, `@Getter`, `@Setter`, etc.
   - When you hover over a class with `@Data`, you should see generated methods

2. **If still not working:**
   - Go to `File` → `Settings` → `Editor` → `Inspections`
   - Search for "Lombok"
   - Make sure all Lombok-related inspections are enabled

---

### Step 7: Update IntelliJ IDEA (If Needed)

If the Maven error persists:

1. **Check IntelliJ Version:**
   - Go to `Help` → `About`
   - Make sure you're using a recent version (2023.3 or later)

2. **Update IntelliJ:**
   - `Help` → `Check for Updates`
   - Install any pending updates, especially for Maven plugin

---

## Quick Checklist

- [ ] Lombok plugin installed and enabled
- [ ] Annotation processing enabled
- [ ] Invalidated caches and restarted
- [ ] Reloaded Maven project
- [ ] Project SDK set correctly (Java 17 or higher)
- [ ] No red errors on Lombok annotations

---

## If Problems Persist

1. **Manual Fix - Delete .idea folder:**
   ```bash
   # Close IntelliJ first!
   # Then delete .idea folder (IntelliJ will regenerate it)
   ```

2. **Reimport Project:**
   - Open IntelliJ
   - `File` → `Open` → Select your project folder
   - IntelliJ will detect Maven and reimport

3. **Check Maven Works from Terminal:**
   ```bash
   mvn clean compile
   ```
   - If this works, the issue is IntelliJ-specific, not Maven

4. **Create new IntelliJ Project:**
   - Sometimes starting fresh is fastest
   - `File` → `New` → `Project from Existing Sources`
   - Select your `pom.xml`

---

## Common Issues

### "Cannot resolve symbol" for Lombok-generated methods
- **Solution:** Enable annotation processing (Step 2)

### Maven sync fails
- **Solution:** Invalidate caches (Step 3)

### Annotations still not recognized after all steps
- **Solution:** Check if Lombok plugin version matches your IntelliJ version
- Try disabling and re-enabling the plugin

---

## Success Indicators

✅ No red errors on `@Data`, `@Getter`, `@Setter` annotations  
✅ Maven project syncs without errors  
✅ Auto-completion works for Lombok-generated methods (getters, setters)  
✅ No class cast exceptions in the IDE logs  

---

**Note:** If you see the Maven class cast error, it's usually fixed by invalidating caches and reloading Maven projects. This error is a known issue with IntelliJ's Maven plugin when dealing with complex projects or after updates.


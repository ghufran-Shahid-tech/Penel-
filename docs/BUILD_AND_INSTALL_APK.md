# Building & Installing the Android APK (Android 10+ / API 29+)

## Prerequisites

1. **Android Studio Ladybug (2024.2+) or Hedgehog+** with:
   - Android SDK Platform 35 (`compileSdk = 35`)
   - Android NDK (Side by side) `26.x` or `27.x`
   - CMake `3.22.1`
2. **JDK 17** installed (`java -version`).
3. **Python 3.10+** (for running the optional standalone Python FastAPI anti-cheat server).

---

## Step 1: Start the Python Anti-Cheat Verification Server

```bash
cd python-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest test_backend.py
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Step 2: Build the Standalone Android APK

Open the `android-app/` folder in Android Studio, allow Gradle Sync to download dependencies and configure CMake/NDK, then build via CLI or Android Studio:

### Debug QA APK
```bash
cd android-app
./gradlew assembleDebug
```
Output APK: `android-app/app/build/outputs/apk/debug/app-debug.apk`

### Signed Release APK
1. Generate a signing keystore (keep private, never commit):
```bash
keytool -genkey -v -keystore goldfire-qa.jks -keyalg RSA -keysize 2048 -validity 10000 -alias goldfire
```
2. Build release APK via Android Studio (`Build -> Generate Signed Bundle / APK -> APK`) or Gradle:
```bash
./gradlew assembleRelease
```

---

## Step 3: Install on an Android 10+ Device via ADB

Enable **USB Debugging** on your Android device (Android 10 / API 29 or newer; no root required):

```bash
adb devices
adb install -r android-app/app/build/outputs/apk/debug/app-debug.apk
```

---

## Step 4: Connect to Your Gold Fire QA Server

1. Launch **GOLD FIRE — ADVANCED TEST PANEL** on your device.
2. Open the **Connection** tab.
3. For Android Emulator pointing to host machine, use `http://10.0.2.2:8000`. For physical device over USB, run `adb reverse tcp:8000 tcp:8000` and connect to `http://127.0.0.1:8000`.
4. Grant optional **Display Over Other Apps** consent only when launching the movable Floating Panel overlay.

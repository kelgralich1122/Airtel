# Airtel Tanzania Wi-Fi Hotspot Voucher Management System
## Master Deployment & Configuration Handbook (100% Free & Open-Source)

This guide documents the complete system architecture, folder layout, dependencies, step-by-step setup scripts, physical MikroTik router configuration instructions, and troubleshooting steps to deploy this production-grade Hotspot Voucher System with **$0 in running costs**.

---

## Table of Contents
1. [System Architecture & WiFi Connection Concept](#1-system-architecture--wifi-connection-concept)
2. [Master Folder Structure](#2-master-folder-structure)
3. [Full Dependency Log](#3-full-dependency-log)
4. [Step-by-Step Router Configuration Guide](#4-step-by-step-router-configuration-guide)
5. [Step-by-Step Firebase & Firestore Setup Guide](#5-step-by-step-firebase--firestore-setup-guide)
6. [Step-by-Step Local Bridge Installation Guide (PC / Raspberry Pi)](#6-step-by-step-local-bridge-installation-guide-pc--raspberry-pi)
7. [Testing & Operational Verification Guide](#7-testing--operational-verification-guide)
8. [Production Deployment Guide](#8-production-deployment-guide)
9. [Troubleshooting & Support Matrix](#9-troubleshooting--support-matrix)

---

## 1. System Architecture & WiFi Connection Concept

How does the guest connect and get authenticated?
1. **The Physical Wi-Fi Network**: A guest arrives and connects to the **Airtel Tanzania Hotspot** Wi-Fi SSID broadcasted by a MikroTik router (e.g., connected to an Airtel ODU CPE).
2. **The Captive Portal Redirect**: The MikroTik router intercepts the connection and automatically opens the **Guest Portal** (this React app) on the guest's phone inside their browser or native captive portal window.
3. **Voucher Validation**:
   - The guest inputs their voucher code (e.g. `ART-X9B2`).
   - The Guest Portal queries **Google Cloud Firestore** to validate the voucher.
   - If valid, the Guest Portal marks the voucher as `used`, updates `macAddress`, `deviceName`, and sets `expiresAt` based on the voucher duration.
4. **The Real-Time Bridge (Daemon)**:
   - A lightweight Node.js script (provided in the `/router-bridge` folder) runs locally on a computer or Raspberry Pi connected to the same local area network (LAN) as the MikroTik router.
   - This bridge listens to Firestore changes in real time.
   - The instant it detects a voucher status updated to `used`, it connects to the MikroTik Router via the free, built-in **RouterOS API** and automatically creates/enables that user with speed and data limits.
   - The bridge then logs the guest in, letting them access the internet immediately.
   - It also reports active connected sessions back to Firestore, displaying live clients on the **Operator Admin Console**!

---

## 2. Master Folder Structure

This project is modular, dividing the high-performance React front-end (Admin & Simulator) from the local Router Bridge service:

```text
/ (Project Root)
├── .env.example                 # Environment variables template for the root
├── .gitignore                   # Ignore node_modules, build artifacts, and secrets
├── package.json                 # Core dependencies & front-end dev scripts
├── tsconfig.json                # TypeScript compilation guidelines
├── vite.config.ts               # Vite bundler configuration with Tailwind integration
├── index.html                   # Core single-page HTML loader
├── firestore.rules              # Secure Firestore Rules deployed to Google Cloud
├── firebase-applet-config.json  # Firebase Web credentials injected by the platform
│
├── src/                         # React Front-End Application
│   ├── main.tsx                 # Core bundle initializer
│   ├── index.css                # Global styles containing Tailwind @import directives
│   ├── types.ts                 # Type contracts (Voucher, Settings, ActiveSession)
│   ├── utils.ts                 # String generators, currency formatters (TZS), validators
│   ├── lib/
│   │   └── firebase.ts          # Core Firebase database adapters and data queries
│   └── components/
│       ├── AdminLogin.tsx       # Airtel-themed operator Auth card (Login/Register/Reset)
│       ├── DashboardStats.tsx   # Bento-style key performance metrics & charts
│       ├── VoucherGenerator.tsx # Operator bulk & customized ticket generator
│       ├── VouchersTable.tsx    # List, search, filter, delete, print-select managers
│       ├── GuestPortal.tsx      # Captive mobile guest simulation with payment gateways
│       ├── PrintTickets.tsx     # High-fidelity 80mm/58mm thermal receipt ticket generator
│       ├── SettingsPanel.tsx    # Price rates, phone support, and carrier merchant setup
│       └── AirtelGuide.tsx      # Comprehensive physical Airtel ODU cabling walkthrough
│
└── router-bridge/               # Standalone Local Router Bridge Service (Daemon)
    ├── package.json             # Bridge dependencies (node-routeros, firebase, dotenv)
    ├── bridge.js                # real-time Firestore -> Router sync service core logic
    ├── .env.example             # Environment config template for router & auth secrets
    ├── Dockerfile               # Easy Docker setup containerization instruction
    ├── start-bridge.sh          # Linux/macOS automatic launcher & dependency resolver
    └── start-bridge.bat         # Windows double-click automatic launcher script
```

---

## 3. Full Dependency Log

The entire system relies exclusively on top-tier, enterprise-grade **free and open-source packages** with zero subscription or licensing needs:

### React Front-End Panel
*   `react` & `react-dom` (^19.0.1): Dynamic views.
*   `vite` (^6.2.3) & `@tailwindcss/vite` (^4.1.14): Light-speed bundling and utility CSS compilation.
*   `firebase` (^12.15.0): Client-side connection to Firestore & Authentication.
*   `lucide-react` (^0.546.0): Polished icon assets.
*   `motion` (^12.23.24): Smooth hardware-accelerated fluid interface transition loops.

### Router Bridge (Daemon)
*   `node-routeros` (^2.1.3): Pure JavaScript asynchronous communicator for MikroTik API. No native compilations required.
*   `firebase` (^10.11.0): Lightweight client connection to listen to database streams in real-time.
*   `dotenv` (^16.4.5): Secure environmental variable key parser.

---

## 4. Step-by-Step Router Configuration Guide

Configure your MikroTik router (e.g., hAP lite, hEX, or any RouterOS device) to support the captive portal and bridge communication:

### Step A: Enable MikroTik API Service
By default, MikroTik's API listens on port `8728`. You must enable it:
1. Open **WinBox** and connect to your MikroTik router.
2. Navigate to **IP** -> **Services**.
3. Select the `api` service (port 8728) and click the **Enable (Green checkmark)** button.
4. *(Optional for security)* Double click `api` and restrict the `Address` to the IP of your computer or Raspberry Pi running the Bridge script.

### Step B: Configure Hotspot Network
1. Go to **IP** -> **Hotspot** -> Click **Hotspot Setup**.
2. Select your Wi-Fi interface (e.g. `bridge` or `wlan1`) and click **Next**.
3. Keep default IP ranges (e.g. `192.168.88.1/24`), select **No Certificate**, and keep SMTP default.
4. Set DNS servers (e.g., `8.8.8.8` and `1.1.1.1`).
5. DNS Name: Enter your captive portal host redirect, e.g. `wifi.airtel-hotspot.co.tz`. This is what guests see.
6. Create a default template user (e.g., admin).

### Step C: Customize Captive Portal Login Page (Redirect)
We want users to be automatically redirected to your hosted Web Portal when they connect to the Wi-Fi:
1. In **IP** -> **Hotspot** -> **User Profiles**, double-click `default`.
2. Ensure **Mac Cookie** is disabled (so they are prompted to login properly when tickets expire).
3. Connect via FTP or files explorer in WinBox to the router's flash directory.
4. Edit the file `hotspot/login.html` to automatically redirect to your hosted guest portal.
   Replace its content with this simple html meta-refresh code:
```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=https://ais-pre-3fd4l2i2zd3rmd2yzh6ivm-548041660160.europe-west2.run.app" />
  <title>Airtel Tanzania Hotspot Redirect</title>
</head>
<body>
  <p>Connecting to Airtel Tanzania Hotspot Portal... If you are not redirected automatically, <a href="https://ais-pre-3fd4l2i2zd3rmd2yzh6ivm-548041660160.europe-west2.run.app">click here</a>.</p>
</body>
</html>
```

### Step D: Add Walled Gardens (Bypass Rules)
Before the guest puts in their voucher, they must be allowed to load the portal website! Add the hosted portal domains to the Walled Garden list:
1. Go to **IP** -> **Hotspot** -> **Walled Garden**.
2. Click **Add New (+)**.
3. Set `Action=allow` and `Dst. Host=*.run.app` (to allow accessing the hosted Cloud Run server).
4. Also add your Firebase Auth domain, e.g., `*.firebaseapp.com` and google static assets if needed.

---

## 5. Step-by-Step Firebase & Firestore Setup Guide

Follow these steps to deploy your free-tier database and security configuration:

### Step A: Provision Firestore and Auth on Firebase (Spark Free Tier)
1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
2. Name your project (e.g. `airtel-tz-hotspot`), disable Google Analytics if not needed, and click **Create**.
3. Inside your project, click **Build** -> **Firestore Database** -> Click **Create Database**. Select your region (e.g., nearest to East Africa, like `europe-west3` or `southafrica-east1`). Start in Test mode or Production mode.
4. Navigate to **Build** -> **Authentication** -> **Get Started**. Enable **Email/Password** as a sign-in provider.

### Step B: Create an Operator Account
1. Under Firebase Authentication -> **Users** tab, click **Add User**.
2. Provide an operator email and password, e.g., `admin@airtel-hotspot.co.tz` and `AirtelTZHotspot2026!`.
3. Save these credentials. You will use these to log into your Admin Panel and in your Router Bridge `.env` configuration file!

### Step C: Deploy Security Rules
The secure rules are already saved in `/firestore.rules` and have been automatically deployed to your Firebase account!
They enforce that:
- Anyone can read Settings and validate a voucher code.
- Guests can only modify specific activation fields (their MAC, device model, and expiry) but cannot manipulate prices or generate codes.
- Only authenticated operators can write Settings, generate new tickets, or delete records.

---

## 6. Step-by-Step Local Bridge Installation Guide (PC / Raspberry Pi)

Deploy the bridge daemon on any computer situated inside the same local network as your MikroTik router (e.g., a local desktop PC, an old laptop, or a Raspberry Pi running 24/7):

### Step A: Download Node.js
Ensure Node.js (Version 18 or newer) is installed on the machine:
- **Windows / macOS**: Download the installer from [nodejs.org](https://nodejs.org/) and run it.
- **Linux / Raspberry Pi**: Install via command line:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

### Step B: Configuration Setup
1. Open the `/router-bridge` folder on your machine.
2. Copy `.env.example` to a new file named `.env`:
   - *Linux/macOS*: `cp .env.example .env`
   - *Windows*: Copy and paste in File Explorer, renaming to `.env`
3. Edit the `.env` file using any text editor (e.g. Notepad, nano) and input your parameters:
   - Paste the values from `/firebase-applet-config.json` into the corresponding Firebase variables.
   - Enter your Operator Email and Password created in [Step B of Firebase Setup](#step-b-create-an-operator-account).
   - Enter your physical MikroTik IP (usually `192.168.88.1`) and admin login password.

### Step C: Run the Bridge
We have bundled custom automated wrappers that take care of everything:
*   **Windows**: Double-click **`start-bridge.bat`**. This checks for Node.js, installs dependencies if they are missing, and runs the script.
*   **Linux / Raspberry Pi / macOS**:
    1. Make the script executable:
       ```bash
       chmod +x start-bridge.sh
       ```
    2. Run it:
       ```bash
       ./start-bridge.sh
       ```

### Optional: Run with Docker
If you prefer running the bridge as a background docker container:
```bash
cd router-bridge
docker build -t airtel-router-bridge .
docker run -d --name airtel-bridge --restart unless-stopped --env-file .env airtel-router-bridge
```

---

## 7. Testing & Operational Verification Guide

Test your newly completed deployment step-by-step:

### Test Case A: Create a Voucher Ticket
1. Access the Operator Dashboard at [Airtel Tanzania Wi-Fi Hotspot](https://ais-pre-3fd4l2i2zd3rmd2yzh6ivm-548041660160.europe-west2.run.app).
2. Login with your Operator email & password.
3. Go to **Create & Overview**, choose a duration (e.g., 1 Hour), select a bandwidth speed tier, and click **Generate 1 Voucher**.
4. Go to **Vouchers Catalog**, confirm your new voucher is active (e.g. `ART-K3L9`).
5. Click **Chapa / Print Ticket** to view the preview or print it out!

### Test Case B: Run the Bridge Daemon
1. Launch the Bridge script locally.
2. Watch the logs. You should see:
   ```text
   [INFO] Authenticating with Firebase Auth as admin@airtel-hotspot.co.tz...
   [INFO] Authenticated successfully with Firebase! Real-time sync rules unlocked.
   [INFO] Connecting to MikroTik Router at 192.168.88.1:8728...
   [INFO] Connected successfully to MikroTik RouterOS!
   [INFO] Starting real-time Firestore listeners...
   [INFO] Syncing hotspot user: Code=ART-K3L9, Duration=1h...
   [INFO] Creating brand new MikroTik hotspot user: ART-K3L9
   ```
3. Connect your PC to the MikroTik router, open WinBox, go to **IP** -> **Hotspot** -> **Users**, and verify that the user `ART-K3L9` has been successfully created with limits configured!

### Test Case C: Activate Guest Connection
1. In your application, toggle to **Guest Login Portal (Phone View)**.
2. Connect a simulator device or copy your generated code `ART-K3L9` into the voucher code input box.
3. Click **UNGANISHA MTANDAO / CONNECT WIFI**.
4. Confirm the success message displays, and the portal displays the connection dashboard with duration remaining.
5. Watch the local Bridge console! You should see:
   ```text
   [INFO] Running periodic synchronization task...
   [INFO] Fetching active sessions from physical MikroTik router...
   [INFO] Router reports 1 live active clients.
   [INFO] Session ART-K3L9 is active! Uploaded live statistics to Firestore.
   ```
6. Return to the Operator Console (Admin) -> **Active Sessions** tab, and watch the connected device appear live in real-time with speed limit and data counters synced!

---

## 8. Production Deployment Guide

Deploy your front-end client globally using Cloud Run, Firebase Hosting, or keep it running on our high-performance sandbox:
*   The front-end is already fully compiled and optimized.
*   You can copy the hosted App URL and bookmarked address to easily distribute it to other devices.
*   To host your guest portal client on the 100% free **Firebase Hosting** tier:
    1. Install Firebase CLI: `npm install -g firebase-tools`
    2. Authenticate: `firebase login`
    3. Initialize inside root folder: `firebase init hosting` (Select your existing Firebase project, set `dist` as public directory, configure as single-page app).
    4. Build front-end: `npm run build`
    5. Deploy globally: `firebase deploy --only hosting`

---

## 9. Troubleshooting & Support Matrix

| Issue | Root Cause | Resolution |
| :--- | :--- | :--- |
| **Bridge displays `Firebase Authentication failed`** | Incorrect Operator Email or password in `.env`. | Open Firebase Console -> Authentication. Verify your operator user exists and update `.env` to match exactly. |
| **Bridge displays `Router connection failed: Connection refused`** | API service is disabled on your MikroTik, or host IP is wrong. | Log in to the router via WinBox. Go to `/ip service`. Ensure `api` is enabled (Green checkmark) and port matches `8728` in your `.env`. |
| **Guests get a "Kifurushi kimekwisha / Expired" error immediately** | The router clock or host computer running the bridge is out of sync. | Ensure your MikroTik has NTP enabled under `/system ntp client` so its date/time is accurate to Tanzanian Local Time. |
| **Wired ODU client cannot view portal** | Walled garden entry is missing. | Add `*.run.app` and `*.firebaseapp.com` in `/ip hotspot walled-garden` on your MikroTik router. |
| **Printed tickets have no styling or text cut off** | Printer settings or page sizes incorrect. | When the print window opens, choose "Fit to page" or adjust margins to "None/Minimum" for thermal roll receipt printing. |

---
*Created and maintained under the Airtel Tanzania ODU WiFi Hotspot voucher initiative. High speed connectivity made simple and accessible.*

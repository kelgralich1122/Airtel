import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { RouterOSAPI } from 'node-routeros';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load Environment Variables
dotenv.config();

const __dirname = path.resolve();

// Utility for logging with timestamp
function log(msg, level = 'INFO') {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level}] ${msg}`);
}

// 1. Load Firebase configuration
let firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const dbId = process.env.FIREBASE_FIRESTORE_DB_ID;

// Fallback: Try reading parent config if running locally in AI Studio workspace
if (!firebaseConfig.apiKey) {
  try {
    const parentConfigPath = path.join(__dirname, '../firebase-applet-config.json');
    if (fs.existsSync(parentConfigPath)) {
      const configData = JSON.parse(fs.readFileSync(parentConfigPath, 'utf8'));
      firebaseConfig = {
        apiKey: configData.apiKey,
        authDomain: configData.authDomain,
        projectId: configData.projectId,
        storageBucket: configData.storageBucket || `${configData.projectId}.firebasestorage.app`,
        messagingSenderId: configData.messagingSenderId,
        appId: configData.appId
      };
      log('Loaded Firebase configuration from parent directory config file.');
    }
  } catch (err) {
    log('Could not find or read parent firebase-applet-config.json: ' + err.message, 'WARN');
  }
}

// Validate Configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  log('CRITICAL: Firebase configuration is missing! Check your .env or firebase-config.json', 'ERROR');
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

// 2. MikroTik RouterOS API Settings
const mtConfig = {
  host: process.env.MIKROTIK_HOST || '192.168.88.1',
  user: process.env.MIKROTIK_USER || 'admin',
  password: process.env.MIKROTIK_PASSWORD || '',
  port: parseInt(process.env.MIKROTIK_PORT || '8728')
};

let mtConnection = null;
let isConnectedToMT = false;

// 3. Authenticate with Firebase first
const operatorEmail = process.env.FIREBASE_OPERATOR_EMAIL;
const operatorPassword = process.env.FIREBASE_OPERATOR_PASSWORD;

if (!operatorEmail || !operatorPassword) {
  log('CRITICAL: FIREBASE_OPERATOR_EMAIL and FIREBASE_OPERATOR_PASSWORD environment variables are required!', 'ERROR');
  process.exit(1);
}

async function connectToFirebase() {
  try {
    log(`Authenticating with Firebase Auth as ${operatorEmail}...`);
    await signInWithEmailAndPassword(auth, operatorEmail, operatorPassword);
    log('Authenticated successfully with Firebase! Real-time sync rules unlocked.');
  } catch (err) {
    log('Firebase Authentication failed: ' + err.message, 'ERROR');
    throw err;
  }
}

// 4. Connect to MikroTik RouterOS
async function connectToRouter() {
  if (isConnectedToMT) return mtConnection;
  
  log(`Connecting to MikroTik Router at ${mtConfig.host}:${mtConfig.port} as '${mtConfig.user}'...`);
  
  return new Promise((resolve) => {
    try {
      const api = new RouterOSAPI({
        host: mtConfig.host,
        user: mtConfig.user,
        password: mtConfig.password,
        port: mtConfig.port,
        keepalive: true
      });

      api.connect()
        .then(() => {
          isConnectedToMT = true;
          mtConnection = api;
          log('Connected successfully to MikroTik RouterOS!');
          resolve(api);
        })
        .catch((err) => {
          log(`Router connection failed: ${err.message}. Retrying in 10s...`, 'ERROR');
          isConnectedToMT = false;
          mtConnection = null;
          setTimeout(connectToRouter, 10000);
          resolve(null);
        });
    } catch (err) {
      log(`Router socket exception: ${err.message}. Retrying in 10s...`, 'ERROR');
      isConnectedToMT = false;
      mtConnection = null;
      setTimeout(connectToRouter, 10000);
      resolve(null);
    }
  });
}

// Run router command safely
async function runRouterCommand(command, args = []) {
  if (!isConnectedToMT || !mtConnection) {
    log(`Cannot run command '${command}': Router not connected.`, 'WARN');
    return null;
  }
  try {
    return await mtConnection.write(command, args);
  } catch (err) {
    log(`Error running router command '${command}': ${err.message}`, 'ERROR');
    if (err.message.includes('not connected') || err.message.includes('socket')) {
      isConnectedToMT = false;
      mtConnection = null;
      connectToRouter();
    }
    return null;
  }
}

// 5. MikroTik Hotspot Actions
async function addOrUpdateHotspotUser(code, durationHours, speedMbps, dataLimitGB) {
  log(`Syncing hotspot user to MikroTik: Code=${code}, Duration=${durationHours}h, Speed=${speedMbps}M, Data=${dataLimitGB}G`);
  
  // Convert limits for MikroTik Hotspot User fields
  // limit-uptime: e.g. "1h" or "24h"
  const limitUptime = durationHours > 0 ? `${durationHours}h` : '0';
  
  // limit-bytes-total: e.g. 5GB -> 5368709120 bytes
  const limitBytesTotal = dataLimitGB > 0 ? Math.round(dataLimitGB * 1024 * 1024 * 1024).toString() : '0';
  
  // We can write rate limit (Tx/Rx) e.g. "2M/2M" or "5M/5M" or "0" (no rate limit)
  const rateLimit = speedMbps > 0 ? `${speedMbps}M/${speedMbps}M` : '';

  try {
    // Check if user already exists
    const users = await runRouterCommand('/ip/hotspot/user/print', [`?name=${code}`]);
    
    const cmdArgs = [
      `=name=${code}`,
      `=password=${code}`,
      `=limit-uptime=${limitUptime}`,
      `=limit-bytes-total=${limitBytesTotal}`,
      `=comment=ART-VOUCHER-${durationHours}h`
    ];

    if (rateLimit) {
      // If we use rate limits, we should configure a user profile or assign a generic profile with speed,
      // or we can assign the speed directly to standard user (if RouterOS supports rate-limit field on user)
      cmdArgs.push(`=rate-limit=${rateLimit}`);
    }

    if (users && users.length > 0) {
      // Update existing
      log(`User ${code} already exists. Updating settings...`);
      await runRouterCommand('/ip/hotspot/user/set', [
        `=.id=${users[0]['.id']}`,
        ...cmdArgs
      ]);
    } else {
      // Create new
      log(`Creating brand new MikroTik hotspot user: ${code}`);
      await runRouterCommand('/ip/hotspot/user/add', [
        ...cmdArgs,
        '=profile=default'
      ]);
    }
  } catch (err) {
    log(`Failed to write Hotspot User to router: ${err.message}`, 'ERROR');
  }
}

async function removeHotspotUser(code) {
  log(`Removing hotspot user from MikroTik: ${code}`);
  try {
    const users = await runRouterCommand('/ip/hotspot/user/print', [`?name=${code}`]);
    if (users && users.length > 0) {
      await runRouterCommand('/ip/hotspot/user/remove', [`=.id=${users[0]['.id']}`]);
      log(`Removed user ${code} from router configuration.`);
    }

    // Kick from active sessions if logged in
    const active = await runRouterCommand('/ip/hotspot/active/print', [`?user=${code}`]);
    if (active && active.length > 0) {
      for (const sess of active) {
        await runRouterCommand('/ip/hotspot/active/remove', [`=.id=${sess['.id']}`]);
        log(`Kicked active session for user ${code} on router.`);
      }
    }
  } catch (err) {
    log(`Failed to remove Hotspot User from router: ${err.message}`, 'ERROR');
  }
}

// 6. Listen to Firestore real-time updates (Vouchers)
function startFirestoreListeners() {
  log('Starting real-time Firestore listeners for active/used/expired vouchers...');
  
  const vouchersRef = collection(db, 'vouchers');
  
  // Real-time listener
  onSnapshot(vouchersRef, async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      const voucher = { id: change.doc.id, ...change.doc.data() };
      const code = voucher.code;
      const status = voucher.status;

      if (change.type === 'added' || change.type === 'modified') {
        if (status === 'active' || status === 'used') {
          // Add or ensure is on router
          await addOrUpdateHotspotUser(
            code, 
            voucher.durationHours, 
            voucher.bandwidthLimitMbps, 
            voucher.dataLimitGB
          );
        } else if (status === 'expired' || status === 'revoked') {
          // Remove from router immediately
          await removeHotspotUser(code);
        }
      } else if (change.type === 'removed') {
        // If voucher doc is fully deleted from Firestore, purge from router
        await removeHotspotUser(code);
      }
    });
  }, (error) => {
    log('Firestore listener encountered error: ' + error.message, 'ERROR');
  });
}

// 7. Periodic Expiration and Session Sync Routine
async function syncSessionsAndExpireVouchers() {
  log('Running periodic synchronization task...');
  
  try {
    // Part A: Auto-expire vouchers
    const nowISO = new Date().toISOString();
    const vouchersRef = collection(db, 'vouchers');
    const q = query(vouchersRef, where('status', '==', 'used'));
    const snapshot = await getDocs(q);
    
    let expiredCount = 0;
    for (const d of snapshot.docs) {
      const voucher = { id: d.id, ...d.data() };
      if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
        log(`Voucher ${voucher.code} is expired (Expiry: ${voucher.expiresAt}). Updating status in Firestore.`);
        await updateDoc(doc(db, 'vouchers', voucher.id), {
          status: 'expired'
        });
        expiredCount++;
      }
    }
    if (expiredCount > 0) {
      log(`Auto-expired ${expiredCount} used vouchers in Firestore.`);
    }

    // Part B: Synchronize Active Sessions from MikroTik to Firestore
    if (isConnectedToMT) {
      log('Fetching active sessions from physical MikroTik router...');
      const activeList = await runRouterCommand('/ip/hotspot/active/print');
      
      if (activeList) {
        log(`Router reports ${activeList.length} live active clients.`);
        
        // Fetch current active sessions in Firestore to reconcile
        const sessionsRef = collection(db, 'sessions');
        const firestoreSessionsSnap = await getDocs(sessionsRef);
        const existingFSSessions = firestoreSessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Upsert router sessions to Firestore
        const activeUsernames = [];
        for (const mtSession of activeList) {
          const user = mtSession.user; // Code
          const mac = mtSession['mac-address'] || '';
          const ip = mtSession['address'] || '';
          const uptime = mtSession['uptime'] || '';
          const bytesOut = parseInt(mtSession['bytes-out'] || '0');
          const bytesIn = parseInt(mtSession['bytes-in'] || '0');
          const dataUsedMB = Math.round((bytesOut + bytesIn) / (1024 * 1024));

          activeUsernames.push(user);

          // Build elegant session representation
          const sessionPayload = {
            voucherCode: user,
            deviceName: mtSession['host-name'] || 'Connected Device',
            macAddress: mac,
            ipAddress: ip,
            speedLimit: 'Dynamic',
            dataLimit: mtSession['limit-bytes-total'] ? `${Math.round(parseInt(mtSession['limit-bytes-total'])/(1024*1024*1024))} GB` : 'Unlimited',
            dataUsedMB: dataUsedMB,
            timeRemaining: mtSession['session-time-left'] || 'Calculating...',
            connectedAt: new Date(Date.now() - parseRouterUptime(uptime)).toISOString(),
            signalStrength: 'excellent'
          };

          // Save to Firestore using voucherCode as document ID
          await setDoc(doc(db, 'sessions', user), sessionPayload);
        }

        // Clean up stale sessions in Firestore (sessions that are no longer on MikroTik)
        for (const fsSess of existingFSSessions) {
          if (!activeUsernames.includes(fsSess.id)) {
            log(`Session ${fsSess.id} is no longer active on MikroTik router. Deleting from Firestore.`);
            await deleteDoc(doc(db, 'sessions', fsSess.id));
          }
        }
      }
    }
  } catch (err) {
    log('Synchronization routine error: ' + err.message, 'ERROR');
  }
}

// Convert MikroTik uptime string (e.g. "1h30m20s" or "3w2d") to milliseconds
function parseRouterUptime(uptimeStr) {
  if (!uptimeStr) return 0;
  let ms = 0;
  const weeks = uptimeStr.match(/(\d+)w/);
  const days = uptimeStr.match(/(\d+)d/);
  const hours = uptimeStr.match(/(\d+)h/);
  const minutes = uptimeStr.match(/(\d+)m/);
  const seconds = uptimeStr.match(/(\d+)s/);

  if (weeks) ms += parseInt(weeks[1]) * 7 * 24 * 60 * 60 * 1000;
  if (days) ms += parseInt(days[1]) * 24 * 60 * 60 * 1000;
  if (hours) ms += parseInt(hours[1]) * 60 * 60 * 1000;
  if (minutes) ms += parseInt(minutes[1]) * 60 * 1000;
  if (seconds) ms += parseInt(seconds[1]) * 1000;

  return ms || 5000; // default 5 seconds
}

// 8. Bootstrap and Main Loop
async function main() {
  log('===================================================');
  log(' AIRTEL TANZANIA - MIKROTIK HOTSPOT VOUCHER BRIDGE');
  log('===================================================');
  
  try {
    // A. Authenticate with Firebase
    await connectToFirebase();
    
    // B. Connect to physical MikroTik Router
    await connectToRouter();

    // C. Fire up the Real-time listeners
    startFirestoreListeners();

    // D. Start periodic session synchronization and expiration routine
    const intervalSec = parseInt(process.env.SYNC_INTERVAL_SEC || '30');
    log(`Scheduling periodic synchronization tasks every ${intervalSec} seconds.`);
    
    // Run immediately once
    await syncSessionsAndExpireVouchers();
    
    // Set interval
    setInterval(syncSessionsAndExpireVouchers, intervalSec * 1000);

    log('Bridge daemon fully initialized and running cleanly. Press Ctrl+C to terminate.');
  } catch (err) {
    log('Failed to initialize bridge daemon: ' + err.message, 'ERROR');
    process.exit(1);
  }
}

main();

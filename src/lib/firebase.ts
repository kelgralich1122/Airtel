import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { Voucher, HotspotSettings, ActiveSession } from '../types';
import config from '../../firebase-applet-config.json';

// Initialize Firebase
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

const app = initializeApp(firebaseConfig);

// Use custom firestore database id if provided, otherwise default
const db = config.firestoreDatabaseId 
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

// Enable offline-first cache
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed-precondition');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence unimplemented');
    }
  });
}

const auth = getAuth(app);

export { db, auth };

// Error handling types and helpers as required by the firebase-integration skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isPermissionError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const lowercaseMsg = msg.toLowerCase();
  return lowercaseMsg.includes('permission-denied') || 
         lowercaseMsg.includes('insufficient permissions') ||
         lowercaseMsg.includes('permission');
}

// Default settings
export const DEFAULT_SETTINGS: HotspotSettings = {
  hotspotName: "Airtel Guest Hotspot",
  routerModel: "Airtel ODU LTE CPE",
  routerIp: "192.168.8.1",
  supportPhone: "+255 784 123 456",
  currencySymbol: "TZS",
  defaultLanguage: "sw",
  rates: {
    hour1: 500,
    hours3: 1000,
    day1: 2000,
    week1: 7000,
    month1: 25000
  },
  mPesaMerchantNumber: "553311",
  airtelMoneyMerchantNumber: "998877"
};

// Vouchers DB Functions
export async function getVouchers(): Promise<Voucher[]> {
  try {
    const vouchersCol = collection(db, 'vouchers');
    const q = query(vouchersCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const vouchers: Voucher[] = [];
    snapshot.forEach((doc) => {
      vouchers.push({ id: doc.id, ...doc.data() } as Voucher);
    });
    return vouchers;
  } catch (error) {
    console.warn("Error getting vouchers: ", error);
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, 'vouchers');
    }
    // Fallback to local storage or empty list if offline or error
    return getLocalVouchers();
  }
}

export async function createVoucher(voucher: Omit<Voucher, 'id'>): Promise<string> {
  try {
    const vouchersCol = collection(db, 'vouchers');
    const docRef = await addDoc(vouchersCol, voucher);
    // Sync with local fallback too
    const newVoucher = { id: docRef.id, ...voucher };
    saveLocalVoucher(newVoucher);
    return docRef.id;
  } catch (error) {
    console.warn("Error creating voucher: ", error);
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.CREATE, 'vouchers');
    }
    // Local fallback
    const id = "loc_" + Math.random().toString(36).substr(2, 9);
    const newVoucher = { id, ...voucher };
    saveLocalVoucher(newVoucher);
    return id;
  }
}

export async function updateVoucher(id: string, updates: Partial<Voucher>): Promise<void> {
  try {
    if (id.startsWith('loc_')) {
      updateLocalVoucher(id, updates);
      return;
    }
    const docRef = doc(db, 'vouchers', id);
    await updateDoc(docRef, updates);
    updateLocalVoucher(id, updates);
  } catch (error) {
    console.warn("Error updating voucher: ", error);
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.UPDATE, `vouchers/${id}`);
    }
    updateLocalVoucher(id, updates);
  }
}

export async function deleteVoucher(id: string): Promise<void> {
  try {
    if (id.startsWith('loc_')) {
      deleteLocalVoucher(id);
      return;
    }
    const docRef = doc(db, 'vouchers', id);
    await deleteDoc(docRef);
    deleteLocalVoucher(id);
  } catch (error) {
    console.warn("Error deleting voucher: ", error);
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.DELETE, `vouchers/${id}`);
    }
    deleteLocalVoucher(id);
  }
}

// Settings DB Functions
export async function getSettings(): Promise<HotspotSettings> {
  try {
    const settingsDoc = doc(db, 'settings', 'active_settings');
    const docSnap = await getDoc(settingsDoc);
    if (docSnap.exists()) {
      return docSnap.data() as HotspotSettings;
    } else {
      // Create default settings if not exists
      try {
        await setDoc(settingsDoc, DEFAULT_SETTINGS);
      } catch (setErr) {
        if (isPermissionError(setErr)) {
          handleFirestoreError(setErr, OperationType.WRITE, 'settings/active_settings');
        }
        throw setErr;
      }
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.warn("Error getting settings: ", error);
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, 'settings/active_settings');
    }
    const local = localStorage.getItem('hotspot_settings');
    return local ? JSON.parse(local) : DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: HotspotSettings): Promise<void> {
  try {
    const settingsDoc = doc(db, 'settings', 'active_settings');
    await setDoc(settingsDoc, settings);
    localStorage.setItem('hotspot_settings', JSON.stringify(settings));
  } catch (error) {
    console.warn("Error saving settings: ", error);
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/active_settings');
    }
    localStorage.setItem('hotspot_settings', JSON.stringify(settings));
  }
}

// Active Sessions Functions
export async function getActiveSessions(): Promise<ActiveSession[]> {
  try {
    const sessionsCol = collection(db, 'sessions');
    const snapshot = await getDocs(sessionsCol);
    const sessions: ActiveSession[] = [];
    snapshot.forEach((doc) => {
      sessions.push({ id: doc.id, ...doc.data() } as ActiveSession);
    });
    return sessions;
  } catch (error) {
    console.warn("Error getting sessions: ", error);
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, 'sessions');
    }
    const local = localStorage.getItem('active_sessions');
    return local ? JSON.parse(local) : [];
  }
}

export async function addActiveSession(session: Omit<ActiveSession, 'id'>): Promise<string> {
  try {
    const sessionsCol = collection(db, 'sessions');
    const docRef = await addDoc(sessionsCol, session);
    const newSession = { id: docRef.id, ...session };
    saveLocalSession(newSession);
    return docRef.id;
  } catch (error) {
    console.warn("Error adding session: ", error);
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    }
    const id = "loc_sess_" + Math.random().toString(36).substr(2, 9);
    const newSession = { id, ...session };
    saveLocalSession(newSession);
    return id;
  }
}

export async function removeActiveSession(id: string): Promise<void> {
  try {
    if (id.startsWith('loc_sess_')) {
      deleteLocalSession(id);
      return;
    }
    const docRef = doc(db, 'sessions', id);
    await deleteDoc(docRef);
    deleteLocalSession(id);
  } catch (error) {
    console.warn("Error removing session: ", error);
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.DELETE, `sessions/${id}`);
    }
    deleteLocalSession(id);
  }
}

export async function removeActiveSessionByVoucher(voucherCode: string): Promise<void> {
  try {
    const sessionsCol = collection(db, 'sessions');
    const q = query(sessionsCol, where('voucherCode', '==', voucherCode));
    const snapshot = await getDocs(q);
    snapshot.forEach(async (d) => {
      try {
        await deleteDoc(doc(db, 'sessions', d.id));
      } catch (delErr) {
        if (isPermissionError(delErr)) {
          handleFirestoreError(delErr, OperationType.DELETE, `sessions/${d.id}`);
        }
        throw delErr;
      }
    });
    // Update local storage
    const local = localStorage.getItem('active_sessions');
    if (local) {
      const sessions: ActiveSession[] = JSON.parse(local);
      const filtered = sessions.filter(s => s.voucherCode !== voucherCode);
      localStorage.setItem('active_sessions', JSON.stringify(filtered));
    }
  } catch (error) {
    console.warn("Error removing session by voucher: ", error);
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, 'sessions');
    }
  }
}

// Local Fallbacks (for offline work or edge case firestore issues)
function getLocalVouchers(): Voucher[] {
  const local = localStorage.getItem('wifi_vouchers');
  return local ? JSON.parse(local) : [];
}

function saveLocalVoucher(voucher: Voucher) {
  const vouchers = getLocalVouchers();
  vouchers.unshift(voucher);
  localStorage.setItem('wifi_vouchers', JSON.stringify(vouchers));
}

function updateLocalVoucher(id: string, updates: Partial<Voucher>) {
  const vouchers = getLocalVouchers();
  const index = vouchers.findIndex(v => v.id === id);
  if (index !== -1) {
    vouchers[index] = { ...vouchers[index], ...updates };
    localStorage.setItem('wifi_vouchers', JSON.stringify(vouchers));
  }
}

function deleteLocalVoucher(id: string) {
  const vouchers = getLocalVouchers();
  const filtered = vouchers.filter(v => v.id !== id);
  localStorage.setItem('wifi_vouchers', JSON.stringify(filtered));
}

function getLocalSessions(): ActiveSession[] {
  const local = localStorage.getItem('active_sessions');
  return local ? JSON.parse(local) : [];
}

function saveLocalSession(session: ActiveSession) {
  const sessions = getLocalSessions();
  sessions.push(session);
  localStorage.setItem('active_sessions', JSON.stringify(sessions));
}

function deleteLocalSession(id: string) {
  const sessions = getLocalSessions();
  const filtered = sessions.filter(s => s.id !== id);
  localStorage.setItem('active_sessions', JSON.stringify(filtered));
}

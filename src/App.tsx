import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Voucher, HotspotSettings, ActiveSession } from './types';
import { 
  getVouchers, 
  createVoucher, 
  updateVoucher, 
  deleteVoucher, 
  getSettings, 
  saveSettings, 
  getActiveSessions, 
  addActiveSession, 
  removeActiveSession, 
  removeActiveSessionByVoucher,
  DEFAULT_SETTINGS,
  auth
} from './lib/firebase';
import { generateVoucherCode, formatTZS } from './utils';

// Component Imports
import DashboardStats from './components/DashboardStats';
import VoucherGenerator from './components/VoucherGenerator';
import VouchersTable from './components/VouchersTable';
import AirtelGuide from './components/AirtelGuide';
import GuestPortal from './components/GuestPortal';
import PrintTickets from './components/PrintTickets';
import SettingsPanel from './components/SettingsPanel';
import AdminLogin from './components/AdminLogin';

// Icon Imports
import { 
  Network, 
  Wifi, 
  Ticket, 
  Activity, 
  Settings, 
  BookOpen, 
  Laptop, 
  RefreshCw,
  Plus,
  ShieldCheck,
  Globe,
  Trash2,
  Lock,
  PowerOff
} from 'lucide-react';

export default function App() {
  // Application Modes: 'operator' (Admin View) or 'guest_portal' (Simulator phone view)
  const [appMode, setAppMode] = useState<'operator' | 'guest_portal'>('operator');
  
  // Operator Dashboard Sub-tabs
  const [operatorTab, setOperatorTab] = useState<'overview' | 'catalog' | 'sessions' | 'guide' | 'settings'>('overview');

  // Database States
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [settings, setSettings] = useState<HotspotSettings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Printing Overlay States
  const [printVouchers, setPrintVouchers] = useState<Voucher[] | null>(null);

  // Sync data from Firestore
  const loadData = async () => {
    setIsLoading(true);
    try {
      const fetchedSettings = await getSettings();
      setSettings(fetchedSettings);

      const fetchedVouchers = await getVouchers();
      const fetchedSessions = await getActiveSessions();

      setVouchers(fetchedVouchers);
      setSessions(fetchedSessions);

      // Auto-generate some dummy vouchers if empty so the app has data out of the box
      if (fetchedVouchers.length === 0) {
        const dummyVouchers: Omit<Voucher, 'id'>[] = [
          {
            code: 'ART-9X4B',
            durationHours: 1,
            bandwidthLimitMbps: 2,
            dataLimitGB: 1,
            priceTZS: fetchedSettings.rates.hour1,
            status: 'active',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            usedDataMB: 0,
            notes: 'Sample Hour Ticket'
          },
          {
            code: 'ART-M3K9',
            durationHours: 24,
            bandwidthLimitMbps: 5,
            dataLimitGB: 5,
            priceTZS: fetchedSettings.rates.day1,
            status: 'active',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            usedDataMB: 0,
            notes: 'Sample Day Ticket'
          },
          {
            code: 'ART-77A4',
            durationHours: 168,
            bandwidthLimitMbps: 10,
            dataLimitGB: 20,
            priceTZS: fetchedSettings.rates.week1,
            status: 'used',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            activatedAt: new Date(Date.now() - 43200000).toISOString(),
            expiresAt: new Date(Date.now() + 124800000).toISOString(),
            usedDataMB: 1240,
            deviceName: 'Infinix Hot 30',
            macAddress: 'BC:83:85:2E:11:0A',
            notes: 'Guest room 4'
          }
        ];

        const createdVouchers: Voucher[] = [];
        for (const dummy of dummyVouchers) {
          const id = await createVoucher(dummy);
          createdVouchers.push({ id, ...dummy });
        }
        setVouchers(createdVouchers);

        // Also add a matching active session
        const dummySession: Omit<ActiveSession, 'id'> = {
          voucherCode: 'ART-77A4',
          deviceName: 'Infinix Hot 30',
          macAddress: 'BC:83:85:2E:11:0A',
          ipAddress: '192.168.80.45',
          speedLimit: '10 Mbps',
          dataLimit: '20 GB',
          dataUsedMB: 1240,
          timeRemaining: '34 Hours',
          connectedAt: new Date(Date.now() - 43200000).toISOString(),
          signalStrength: 'excellent'
        };
        const sId = await addActiveSession(dummySession);
        setSessions([{ id: sId, ...dummySession }]);
      }
    } catch (error) {
      console.warn("Error loading application data: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        loadData();
      } else if (appMode === 'operator') {
        // Clear operator states if they log out
        setVouchers([]);
        setSessions([]);
        setIsLoading(false);
      } else {
        // If they are in portal mode, still load public vouchers & settings
        loadData();
      }
    });
    return () => unsubscribe();
  }, [appMode]);

  // Periodic Polling to keep sessions & vouchers in sync between Admin & Portal Simulator
  useEffect(() => {
    const interval = setInterval(async () => {
      // Background reload only if we have a user (authorized) or we are in guest portal mode
      if (currentUser || appMode === 'guest_portal') {
        try {
          const fetchedVouchers = await getVouchers();
          const fetchedSessions = await getActiveSessions();
          setVouchers(fetchedVouchers);
          setSessions(fetchedSessions);
        } catch (err) {
          console.warn("Background polling paused due to missing auth/permissions:", err);
        }
      }
    }, 5000); // refresh every 5 seconds

    return () => clearInterval(interval);
  }, [currentUser, appMode]);

  // Action: Generate Vouchers in Bulk/Single
  const handleGenerateVouchers = async (newVouchers: Omit<Voucher, 'id'>[]) => {
    for (const voucher of newVouchers) {
      await createVoucher(voucher);
    }
    // Reload
    const fetched = await getVouchers();
    setVouchers(fetched);
  };

  // Action: Delete Voucher
  const handleDeleteVoucher = async (id: string) => {
    // If voucher is used, also kick them from sessions
    const voucherToDelete = vouchers.find(v => v.id === id);
    if (voucherToDelete) {
      await removeActiveSessionByVoucher(voucherToDelete.code);
    }
    await deleteVoucher(id);
    setVouchers(vouchers.filter(v => v.id !== id));
    setSessions(sessions.filter(s => s.voucherCode !== voucherToDelete?.code));
  };

  // Action: Update status (Revoke/Activate)
  const handleUpdateStatus = async (id: string, status: Voucher['status']) => {
    const voucherToUpdate = vouchers.find(v => v.id === id);
    if (voucherToUpdate) {
      if (status === 'revoked') {
        await removeActiveSessionByVoucher(voucherToUpdate.code);
        setSessions(sessions.filter(s => s.voucherCode !== voucherToUpdate.code));
      }
      await updateVoucher(id, { status });
      setVouchers(vouchers.map(v => v.id === id ? { ...v, status } : v));
    }
  };

  // Action: Save Settings
  const handleSaveSettings = async (newSettings: HotspotSettings) => {
    await saveSettings(newSettings);
    setSettings(newSettings);
  };

  // Action: Kick / Disconnect Session from Admin Panel
  const handleKickSession = async (session: ActiveSession) => {
    // Find matching voucher
    const voucher = vouchers.find(v => v.code === session.voucherCode);
    if (voucher) {
      // Mark as expired (or active if we want to allow re-use, but typically standard vouchers expire on kick)
      await updateVoucher(voucher.id, { status: 'expired' });
    }
    await removeActiveSession(session.id);
    
    // Update local state
    setSessions(sessions.filter(s => s.id !== session.id));
    if (voucher) {
      setVouchers(vouchers.map(v => v.id === voucher.id ? { ...v, status: 'expired' } : v));
    }
  };

  // Action: Activate Voucher (From Guest Portal)
  const handleActivateVoucherFromPortal = async (code: string, deviceName: string, macAddress: string): Promise<Voucher | null> => {
    const matchedVoucher = vouchers.find(v => v.code.toUpperCase() === code.toUpperCase());
    
    if (!matchedVoucher) return null;
    
    // If already expired or revoked, reject
    if (matchedVoucher.status === 'expired' || matchedVoucher.status === 'revoked') {
      return null;
    }

    const now = new Date();
    let updatedVoucher: Voucher;

    if (matchedVoucher.status === 'active') {
      // First time activation! Calculate expiry
      const activatedAt = now.toISOString();
      const expiresAt = new Date(now.getTime() + matchedVoucher.durationHours * 3600000).toISOString();
      
      const updates = {
        status: 'used' as const,
        activatedAt,
        expiresAt,
        macAddress,
        deviceName
      };

      await updateVoucher(matchedVoucher.id, updates);
      updatedVoucher = { ...matchedVoucher, ...updates };

      // Add to Active Sessions in db
      const newSession: Omit<ActiveSession, 'id'> = {
        voucherCode: code,
        deviceName,
        macAddress,
        ipAddress: `192.168.80.${Math.floor(Math.random() * 240) + 10}`,
        speedLimit: matchedVoucher.bandwidthLimitMbps > 0 ? `${matchedVoucher.bandwidthLimitMbps} Mbps` : 'Unlimited',
        dataLimit: matchedVoucher.dataLimitGB > 0 ? `${matchedVoucher.dataLimitGB} GB` : 'Unlimited',
        dataUsedMB: 0,
        timeRemaining: `${matchedVoucher.durationHours} Hours`,
        connectedAt: activatedAt,
        signalStrength: 'excellent'
      };

      const sId = await addActiveSession(newSession);
      setSessions([...sessions, { id: sId, ...newSession }]);

    } else {
      // Already 'used' - Check if it has expired yet
      if (matchedVoucher.expiresAt) {
        const expiresTime = new Date(matchedVoucher.expiresAt).getTime();
        if (Date.now() >= expiresTime) {
          // Expire it now
          await handleUpdateStatus(matchedVoucher.id, 'expired');
          return null;
        }
      }
      updatedVoucher = matchedVoucher;
      
      // Ensure session exists in the active session list (re-connect)
      const sessionExists = sessions.some(s => s.voucherCode === code);
      if (!sessionExists) {
        const reconnectSession: Omit<ActiveSession, 'id'> = {
          voucherCode: code,
          deviceName,
          macAddress,
          ipAddress: `192.168.80.${Math.floor(Math.random() * 240) + 10}`,
          speedLimit: matchedVoucher.bandwidthLimitMbps > 0 ? `${matchedVoucher.bandwidthLimitMbps} Mbps` : 'Unlimited',
          dataLimit: matchedVoucher.dataLimitGB > 0 ? `${matchedVoucher.dataLimitGB} GB` : 'Unlimited',
          dataUsedMB: matchedVoucher.usedDataMB || 0,
          timeRemaining: 'Active',
          connectedAt: matchedVoucher.activatedAt || now.toISOString(),
          signalStrength: 'good'
        };
        const sId = await addActiveSession(reconnectSession);
        setSessions([...sessions, { id: sId, ...reconnectSession }]);
      }
    }

    // Update vouchers list state
    setVouchers(vouchers.map(v => v.id === matchedVoucher.id ? updatedVoucher : v));
    return updatedVoucher;
  };

  // Action: Disconnect Session (From Guest Portal)
  const handleDisconnectSessionFromPortal = async (voucherCode: string) => {
    // Typically we remove from ActiveSessions, and either mark voucher as 'expired' or leave as 'used'
    // Let's mark it as 'expired' since standard tickets in TZ hotspots are single-use per validity sequence
    const voucher = vouchers.find(v => v.code === voucherCode);
    if (voucher) {
      await updateVoucher(voucher.id, { status: 'expired' });
      setVouchers(vouchers.map(v => v.id === voucher.id ? { ...v, status: 'expired' } : v));
    }
    await removeActiveSessionByVoucher(voucherCode);
    setSessions(sessions.filter(s => s.voucherCode !== voucherCode));
  };

  // Action: Mobile money self-service purchase (From Guest Portal)
  const handleMobileMoneyPurchaseFromPortal = async (phone: string, durationHours: number, price: number, carrier: string): Promise<Voucher> => {
    // Generate a new code
    const code = generateVoucherCode('ART');
    
    // Speed limit maps
    let speed = 2;
    if (durationHours === 1) speed = 1;
    else if (durationHours === 3) speed = 2;
    else if (durationHours === 24) speed = 2;
    else if (durationHours === 168) speed = 5;
    else speed = 10;

    // Data quota maps
    let data = 1;
    if (durationHours === 1) data = 0.5;
    else if (durationHours === 3) data = 1;
    else if (durationHours === 24) data = 3;
    else if (durationHours === 168) data = 15;
    else data = 50;

    const newVoucher: Omit<Voucher, 'id'> = {
      code,
      durationHours,
      bandwidthLimitMbps: speed,
      dataLimitGB: data,
      priceTZS: price,
      status: 'active',
      createdAt: new Date().toISOString(),
      usedDataMB: 0,
      notes: `Mobile Pay (${carrier} - ${phone})`
    };

    const id = await createVoucher(newVoucher);
    const completeVoucher = { id, ...newVoucher };
    
    setVouchers([completeVoucher, ...vouchers]);
    return completeVoucher;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" id="applet-root">
      
      {/* Top Main Mode Controller Bar */}
      <div className="bg-white border-b border-gray-200 py-3 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm z-10" id="main-navigation-header">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md shadow-red-200">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-sm text-gray-900 tracking-tight flex items-center">
              <span>Airtel Tanzania Wi-Fi Hotspot</span>
              <span className="ml-2 px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase tracking-widest border border-red-100">ODU CPE</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Voucher Generation & Portal Management Console</p>
          </div>
        </div>

        {/* Global View Toggler & Operator Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 self-start sm:self-auto" id="global-view-toggle">
          {currentUser && appMode === 'operator' && (
            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-600 font-medium shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="truncate max-w-[140px] font-bold text-gray-700">{currentUser.email}</span>
              <button
                onClick={() => signOut(auth)}
                className="text-red-600 hover:text-red-700 font-extrabold ml-2 pl-2 border-l border-gray-200 cursor-pointer flex items-center space-x-1"
                title="Ondoka / Sign Out"
              >
                <span>Ondoka</span>
              </button>
            </div>
          )}

          <div className="bg-gray-100 p-1 rounded-xl flex space-x-1">
            <button
              onClick={() => setAppMode('operator')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                appMode === 'operator' ? 'bg-red-600 text-white shadow-md shadow-red-100' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>Operator Console (Admin)</span>
            </button>
            
            <button
              onClick={() => setAppMode('guest_portal')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                appMode === 'guest_portal' ? 'bg-red-600 text-white shadow-md shadow-red-100' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Wifi className="w-4 h-4" />
              <span>Guest Login Portal (Phone View)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content stage */}
      <div className="flex-grow p-4 sm:p-6 max-w-7xl w-full mx-auto" id="applet-stage">
        
        {isLoading ? (
          <div className="py-24 text-center space-y-4">
            <RefreshCw className="w-12 h-12 text-red-600 animate-spin mx-auto" />
            <p className="text-sm font-bold text-gray-500">Kupakia Taarifa za Hotspot... Loading Hotspot Data...</p>
          </div>
        ) : (
          <>
            {/* VIEW MODE A: OPERATOR ADMIN PANEL */}
            {appMode === 'operator' && (
              !currentUser ? (
                <AdminLogin onSuccess={() => {}} />
              ) : (
                <div className="space-y-6 animate-scale-in" id="operator-workspace">
                
                {/* Stats row */}
                <DashboardStats vouchers={vouchers} sessions={sessions} />

                {/* Sub-tab navigation bar */}
                <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-none whitespace-nowrap bg-white p-2 rounded-xl shadow-sm border border-gray-100" id="admin-subtabs">
                  <button
                    onClick={() => setOperatorTab('overview')}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      operatorTab === 'overview' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create & Overview</span>
                  </button>
                  
                  <button
                    onClick={() => setOperatorTab('catalog')}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      operatorTab === 'catalog' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Ticket className="w-4 h-4" />
                    <span>Vouchers Catalog ({vouchers.length})</span>
                  </button>

                  <button
                    onClick={() => setOperatorTab('sessions')}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      operatorTab === 'sessions' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    <span>Active Sessions ({sessions.length})</span>
                  </button>

                  <button
                    onClick={() => setOperatorTab('guide')}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      operatorTab === 'guide' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Airtel ODU Setup Guide</span>
                  </button>

                  <button
                    onClick={() => setOperatorTab('settings')}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      operatorTab === 'settings' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Hotspot Settings</span>
                  </button>
                </div>

                {/* Sub-tab view router container */}
                <div id="subtab-view-container">
                  {operatorTab === 'overview' && (
                    <VoucherGenerator settings={settings} onGenerate={handleGenerateVouchers} />
                  )}

                  {operatorTab === 'catalog' && (
                    <VouchersTable 
                      vouchers={vouchers} 
                      onDelete={handleDeleteVoucher} 
                      onUpdateStatus={handleUpdateStatus}
                      onSelectForPrint={(v) => setPrintVouchers([v])}
                      onSelectMultipleForPrint={(vs) => setPrintVouchers(vs)}
                    />
                  )}

                  {operatorTab === 'sessions' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" id="active-sessions-tab-view">
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 leading-none">Active Guest Sessions</h2>
                          <p className="text-xs text-gray-500 mt-1">Live connected client devices bound via MAC addresses</p>
                        </div>
                      </div>

                      {sessions.length === 0 ? (
                        <div className="py-12 text-center text-gray-400">
                          <Wifi className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="font-semibold text-sm">No connected guests</p>
                          <p className="text-xs text-gray-400 mt-1">When a guest logs in from the portal, they will appear here in real time!</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <th className="py-3 px-4">Device Info</th>
                                <th className="py-3 px-4">Voucher Code</th>
                                <th className="py-3 px-4">IP Address</th>
                                <th className="py-3 px-4">MAC Address</th>
                                <th className="py-3 px-4">Active Speed</th>
                                <th className="py-3 px-4 text-center">Kick</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-xs">
                              {sessions.map((session) => (
                                <tr key={session.id} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="py-3.5 px-4 font-bold text-gray-800">
                                    {session.deviceName}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="font-mono font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs tracking-wider">
                                      {session.voucherCode}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-gray-600">
                                    {session.ipAddress}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-gray-600">
                                    {session.macAddress}
                                  </td>
                                  <td className="py-3.5 px-4 font-semibold text-gray-700">
                                    {session.speedLimit}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`Mtoe mgeni huyu (${session.deviceName}) kutoka kwenye Wi-Fi? \nDisconnect this guest?`)) {
                                          handleKickSession(session);
                                        }
                                      }}
                                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                                      title="Kick Guest Device"
                                    >
                                      <PowerOff className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {operatorTab === 'guide' && (
                    <AirtelGuide settings={settings} />
                  )}

                  {operatorTab === 'settings' && (
                    <SettingsPanel settings={settings} onSave={handleSaveSettings} />
                  )}
                </div>

              </div>
              )
            )}

            {/* VIEW MODE B: GUEST PORTAL SIMULATOR */}
            {appMode === 'guest_portal' && (
              <div className="py-4 animate-scale-in" id="guest-portal-wrapper">
                
                {/* Visual reminder to user of what this is */}
                <div className="max-w-md mx-auto mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 text-center flex items-center justify-center space-x-1.5">
                  <Laptop className="w-4 h-4" />
                  <p>
                    <strong>Mock Phone Simulator:</strong> Use voucher codes created under <strong>Operator Console</strong> to test the login!
                  </p>
                </div>

                <GuestPortal 
                  settings={settings} 
                  vouchers={vouchers}
                  activeSessions={sessions}
                  onActivateVoucher={handleActivateVoucherFromPortal}
                  onDisconnectSession={handleDisconnectSessionFromPortal}
                  onSimulateMobileMoneyPurchase={handleMobileMoneyPurchaseFromPortal}
                />
              </div>
            )}
          </>
        )}

      </div>

      {/* Ticket Print Modal Overlay */}
      {printVouchers && (
        <PrintTickets 
          settings={settings} 
          vouchers={printVouchers} 
          onClose={() => setPrintVouchers(null)} 
        />
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Voucher, HotspotSettings, ActiveSession } from '../types';
import { formatTZS, formatSpeed, formatDataLimit, formatDuration } from '../utils';
import { 
  Wifi, 
  Smartphone, 
  CreditCard, 
  PhoneCall, 
  CheckCircle, 
  AlertTriangle, 
  Globe, 
  Clock, 
  Download, 
  ShieldCheck,
  Award,
  RefreshCw,
  TrendingUp,
  XCircle
} from 'lucide-react';

interface GuestPortalProps {
  settings: HotspotSettings;
  vouchers: Voucher[];
  activeSessions: ActiveSession[];
  onActivateVoucher: (code: string, deviceName: string, macAddress: string) => Promise<Voucher | null>;
  onDisconnectSession: (voucherCode: string) => Promise<void>;
  onSimulateMobileMoneyPurchase: (phone: string, durationHours: number, price: number, carrier: string) => Promise<Voucher>;
}

export default function GuestPortal({
  settings,
  vouchers,
  activeSessions,
  onActivateVoucher,
  onDisconnectSession,
  onSimulateMobileMoneyPurchase
}: GuestPortalProps) {
  const [lang, setLang] = useState<'sw' | 'en'>(settings.defaultLanguage);
  const [activeTab, setActiveTab] = useState<'login' | 'buy' | 'support'>('login');
  
  // Login form state
  const [voucherCodeInput, setVoucherCodeInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Auto-detected device details for authenticity
  const [detectedDevice, setDetectedDevice] = useState({ name: 'TECNO Camon 20', mac: 'BC:83:85:2E:11:0A' });

  // Buy form state
  const [mobilePhone, setMobilePhone] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(1); // default 1 hour
  const [selectedCarrier, setSelectedCarrier] = useState<string>('Airtel Money');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'push_sent' | 'pin_prompt' | 'processing' | 'success' | 'error'>('idle');
  const [ussdPin, setUssdPin] = useState<string>('');
  const [generatedVoucher, setGeneratedVoucher] = useState<Voucher | null>(null);

  // Active connected session
  const [connectedSession, setConnectedSession] = useState<Voucher | null>(null);
  const [simulatedDataUsed, setSimulatedDataUsed] = useState<number>(12); // start with 12 MB
  const [simulatedCurrentSpeed, setSimulatedCurrentSpeed] = useState<number>(0);
  const [timeRemainingStr, setTimeRemainingStr] = useState<string>('');

  // Randomize simulated device on first load
  useEffect(() => {
    const devices = [
      { name: 'TECNO Camon 20 Pro', mac: '00:1E:64:FA:92:0C' },
      { name: 'Infinix Hot 30i', mac: '24:4B:03:68:52:1A' },
      { name: 'Samsung Galaxy A14', mac: '40:B0:34:D8:E5:80' },
      { name: 'iPhone 13', mac: 'A8:96:8A:2C:BF:E4' },
      { name: 'Redmi Note 12', mac: '58:E6:34:5F:AA:C9' }
    ];
    const chosen = devices[Math.floor(Math.random() * devices.length)];
    setDetectedDevice(chosen);
  }, []);

  // Update speed dial simulation for active session
  useEffect(() => {
    if (!connectedSession) return;

    // Check if speed is unlimited
    const maxSpeed = connectedSession.bandwidthLimitMbps > 0 ? connectedSession.bandwidthLimitMbps : 20;

    const interval = setInterval(() => {
      // Simulate random speed changes
      const randomSpeed = (Math.random() * (maxSpeed - (maxSpeed * 0.4)) + (maxSpeed * 0.4)).toFixed(1);
      setSimulatedCurrentSpeed(parseFloat(randomSpeed));

      // Simulate data downloading (adds 0.1 to 1.5 MB every second)
      setSimulatedDataUsed(prev => {
        const added = parseFloat((Math.random() * 0.8).toFixed(2));
        const next = prev + added;
        // If data limit is reached, expire session!
        if (connectedSession.dataLimitGB > 0 && next >= connectedSession.dataLimitGB * 1024) {
          clearInterval(interval);
          handleSessionExpired();
          return connectedSession.dataLimitGB * 1024;
        }
        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [connectedSession]);

  // Update live ticking countdown clock
  useEffect(() => {
    if (!connectedSession || !connectedSession.expiresAt) return;

    const interval = setInterval(() => {
      const expiresTime = new Date(connectedSession.expiresAt!).getTime();
      const now = new Date().getTime();
      const difference = expiresTime - now;

      if (difference <= 0) {
        clearInterval(interval);
        handleSessionExpired();
        return;
      }

      const hrs = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((difference % (1000 * 60)) / 1000);

      const hoursFormatted = hrs.toString().padStart(2, '0');
      const minutesFormatted = mins.toString().padStart(2, '0');
      const secondsFormatted = secs.toString().padStart(2, '0');

      setTimeRemainingStr(`${hoursFormatted}:${minutesFormatted}:${secondsFormatted}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [connectedSession]);

  const handleSessionExpired = async () => {
    if (connectedSession) {
      await onDisconnectSession(connectedSession.code);
      setConnectedSession(null);
      setLoginError(lang === 'sw' ? 'Muda au kifurushi cha Vocha hii kimeisha!' : 'Your voucher duration or data quota has expired!');
      setActiveTab('login');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCodeInput.trim()) return;

    setLoginError(null);
    setIsConnecting(true);

    try {
      // Find and activate voucher
      const voucher = await onActivateVoucher(
        voucherCodeInput.trim().toUpperCase(),
        detectedDevice.name,
        detectedDevice.mac
      );

      if (voucher) {
        setConnectedSession(voucher);
        setSimulatedDataUsed(voucher.usedDataMB || 0);
      } else {
        setLoginError(
          lang === 'sw' 
            ? 'Vocha sio sahihi, imetumika, au imeisha muda!' 
            : 'Invalid code, already used, or expired!'
        );
      }
    } catch (err) {
      setLoginError('Error connecting to authentication service');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBuySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobilePhone.trim()) return;

    // Start mobile money simulation
    setPaymentStatus('push_sent');

    // Simulate network delay for USSD push
    setTimeout(() => {
      setPaymentStatus('pin_prompt');
    }, 2000);
  };

  const handleConfirmUssdPayment = async () => {
    if (!ussdPin.trim()) return;
    setPaymentStatus('processing');

    // Determine price
    let price = 500;
    if (selectedDuration === 1) price = settings.rates.hour1;
    else if (selectedDuration === 3) price = settings.rates.hours3;
    else if (selectedDuration === 24) price = settings.rates.day1;
    else if (selectedDuration === 168) price = settings.rates.week1;
    else if (selectedDuration === 720) price = settings.rates.month1;

    setTimeout(async () => {
      try {
        const v = await onSimulateMobileMoneyPurchase(
          mobilePhone,
          selectedDuration,
          price,
          selectedCarrier
        );
        setGeneratedVoucher(v);
        setPaymentStatus('success');
      } catch (err) {
        setPaymentStatus('error');
      }
    }, 2500);
  };

  const handleDisconnect = async () => {
    if (!connectedSession) return;
    setIsConnecting(true);
    try {
      await onDisconnectSession(connectedSession.code);
      setConnectedSession(null);
      setVoucherCodeInput('');
      setActiveTab('login');
    } catch (err) {
      console.warn(err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleUseGeneratedCode = () => {
    if (generatedVoucher) {
      setVoucherCodeInput(generatedVoucher.code);
      setActiveTab('login');
      setPaymentStatus('idle');
      setGeneratedVoucher(null);
    }
  };

  // Get pricing for dynamic display
  const getSelectedPrice = () => {
    if (selectedDuration === 1) return settings.rates.hour1;
    if (selectedDuration === 3) return settings.rates.hours3;
    if (selectedDuration === 24) return settings.rates.day1;
    if (selectedDuration === 168) return settings.rates.week1;
    if (selectedDuration === 720) return settings.rates.month1;
    return 500;
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative flex flex-col min-h-[580px]" id="portal-simulator-container">
      {/* Portal Header */}
      <div className="bg-red-600 p-5 text-white relative">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-2">
            <Wifi className="w-5 h-5 text-white animate-pulse" />
            <span className="font-mono text-xs font-bold bg-white/20 px-2 py-0.5 rounded uppercase tracking-widest text-[10px]">
              Guest Hotspot
            </span>
          </div>
          {/* Lang toggle */}
          <button 
            onClick={() => setLang(lang === 'sw' ? 'en' : 'sw')}
            className="flex items-center space-x-1.5 text-xs bg-black/15 hover:bg-black/25 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'sw' ? 'English' : 'Kiswahili'}</span>
          </button>
        </div>

        <h1 className="text-xl font-black tracking-tight">{settings.hotspotName}</h1>
        <p className="text-xs text-red-100 mt-1">
          {lang === 'sw' ? 'Karibu! Furahia mtandao wenye kasi ya Airtel 4G/5G.' : 'Welcome! Enjoy high-speed internet powered by Airtel 4G/5G.'}
        </p>

        {/* Diagonal style accent */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-white clip-diagonal"></div>
      </div>

      {/* Main Container Body (Scrollable) */}
      <div className="p-5 flex-grow flex flex-col justify-between">
        
        {/* IF GUEST IS FULLY CONNECTED */}
        {connectedSession ? (
          <div className="space-y-5 flex-grow flex flex-col justify-between" id="active-guest-session-screen">
            {/* Connection Status Banner */}
            <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center space-y-1">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
              <h3 className="font-extrabold text-green-800 text-sm">
                {lang === 'sw' ? 'Umeunganishwa Kikamilifu!' : 'You are fully Connected!'}
              </h3>
              <p className="text-[11px] text-green-600">
                {lang === 'sw' ? 'Simu yako sasa ina ruhusa ya kutumia internet' : 'Your device now has full internet access'}
              </p>
            </div>

            {/* Speeds Dial + Quota Display */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-center space-y-4">
              {/* Dynamic speedometer simulation */}
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                {/* SVG Dial */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="48" className="stroke-gray-200 fill-transparent" strokeWidth="6" />
                  <circle 
                    cx="56" 
                    cy="56" 
                    r="48" 
                    className="stroke-red-500 fill-transparent transition-all duration-1000 ease-out" 
                    strokeWidth="6" 
                    strokeDasharray="301.6" 
                    strokeDashoffset={301.6 - (301.6 * (simulatedCurrentSpeed / (connectedSession.bandwidthLimitMbps > 0 ? connectedSession.bandwidthLimitMbps : 20)))} 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-gray-800 tracking-tight">{simulatedCurrentSpeed}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Mbps</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-gray-200/60 pt-4 text-left">
                {/* Time Remaining */}
                <div className="space-y-0.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center">
                    <Clock className="w-3 h-3 text-red-500 mr-1" />
                    {lang === 'sw' ? 'Muda Unaoisha' : 'Time Remaining'}
                  </span>
                  <span className="text-lg font-black font-mono text-gray-900 tracking-wider">
                    {timeRemainingStr || 'Calculating...'}
                  </span>
                </div>

                {/* Quota limit */}
                <div className="space-y-0.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center">
                    <Download className="w-3 h-3 text-red-500 mr-1" />
                    {lang === 'sw' ? 'Kifurushi (Data)' : 'Data Limit'}
                  </span>
                  <span className="text-sm font-bold text-gray-800">
                    {simulatedDataUsed >= 1024 ? `${(simulatedDataUsed / 1024).toFixed(1)} GB` : `${simulatedDataUsed.toFixed(0)} MB`}
                    <span className="text-gray-400 font-medium"> of </span>
                    {formatDataLimit(connectedSession.dataLimitGB, lang)}
                  </span>
                </div>
              </div>

              {/* Progress bar for data limit */}
              {connectedSession.dataLimitGB > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-red-500 h-1.5 transition-all duration-1000 ease-out" 
                    style={{ width: `${Math.min(100, (simulatedDataUsed / (connectedSession.dataLimitGB * 1024)) * 100)}%` }}
                  ></div>
                </div>
              )}
            </div>

            {/* Tanzanian Local Content Mock Feed */}
            <div className="space-y-2.5">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">
                {lang === 'sw' ? 'Habari za Tanzania hivi sasa:' : 'Tanzanian Local Feed / News:'}
              </span>
              <div className="space-y-2 bg-red-50/20 p-3 rounded-lg border border-red-50 text-[11px] text-left">
                <div className="border-b border-gray-100 pb-1.5">
                  <span className="font-bold text-red-600 uppercase text-[9px] block">Michezo</span>
                  <p className="text-gray-700 font-bold">Ligi Kuu Bara: Yanga SC na Simba SC zaanza msimu mpya kwa kasi!</p>
                </div>
                <div>
                  <span className="font-bold text-red-600 uppercase text-[9px] block">Hali ya Hewa</span>
                  <p className="text-gray-700 font-bold">Dar es Salaam leo: Joto kali la nyuzi 31°C, upepo mwanana kutoka baharini.</p>
                </div>
              </div>
            </div>

            {/* Disconnect Button */}
            <button
              onClick={handleDisconnect}
              disabled={isConnecting}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-md transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Disconnecting...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>{lang === 'sw' ? 'Ondoa Kifaa (Disconnect)' : 'Disconnect Session'}</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* GUEST IS LOGGING IN OR BUYING */
          <div className="space-y-4 flex-grow flex flex-col justify-between" id="portal-anonymous-screens">
            
            {/* Tab selection */}
            <div className="flex border-b border-gray-100 mb-2">
              <button
                onClick={() => { setActiveTab('login'); setLoginError(null); }}
                className={`flex-1 py-2.5 text-center text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'login' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {lang === 'sw' ? 'Ingiza Vocha' : 'Use Voucher'}
              </button>
              <button
                onClick={() => { setActiveTab('buy'); setLoginError(null); }}
                className={`flex-1 py-2.5 text-center text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'buy' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {lang === 'sw' ? 'Nunua Vocha' : 'Buy Online'}
              </button>
              <button
                onClick={() => { setActiveTab('support'); setLoginError(null); }}
                className={`flex-1 py-2.5 text-center text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'support' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {lang === 'sw' ? 'Msaada' : 'Support'}
              </button>
            </div>

            {/* TAB: LOGIN SCREEN */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-5 flex-grow flex flex-col justify-between" id="tab-login-form">
                <div className="space-y-4">
                  {/* Connection guide */}
                  <div className="text-center space-y-1 pt-3">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Wifi className="w-6 h-6 animate-pulse" />
                    </div>
                    <h3 className="font-extrabold text-sm text-gray-800">
                      {lang === 'sw' ? 'Unganisha kwenye Wi-Fi' : 'Access Hotspot Network'}
                    </h3>
                    <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                      {lang === 'sw' ? 'Weka namba ya siri (Voucher Code) iliyoandikwa kwenye tiketi yako ili kuanza kuvinjari.' : 'Enter the code printed on your voucher card to authenticate and access the internet.'}
                    </p>
                  </div>

                  {/* Input form */}
                  <div className="space-y-3.5">
                    <div>
                      <input
                        type="text"
                        placeholder="e.g. ART-A3B9"
                        value={voucherCodeInput}
                        onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                        className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl text-center text-lg font-mono font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-50 text-red-600 placeholder-gray-300"
                        required
                        disabled={isConnecting}
                      />
                    </div>

                    {/* Login error */}
                    {loginError && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center space-x-2 text-red-700 text-[11px]">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium leading-tight">{loginError}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Device details binding auto info */}
                <div className="space-y-4 pt-4">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
                    <div className="flex items-center space-x-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{lang === 'sw' ? 'Kifaa chako' : 'Detected Device'}: <strong>{detectedDevice.name}</strong></span>
                    </div>
                    <span className="font-mono">{detectedDevice.mac}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{lang === 'sw' ? 'Inathibitisha...' : 'Authenticating...'}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>{lang === 'sw' ? 'Washa Internet (Connect)' : 'Activate Access'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB: BUY SCREEN (SIMULATED MOBILE MONEY) */}
            {activeTab === 'buy' && (
              <div className="flex-grow flex flex-col justify-between" id="tab-buy-view">
                
                {paymentStatus === 'idle' && (
                  <form onSubmit={handleBuySubmit} className="space-y-4" id="buy-hotspot-form">
                    <div className="bg-red-50/50 border border-red-50 rounded-xl p-3.5 space-y-1.5 text-left text-[11px]">
                      <h4 className="font-bold text-red-700 flex items-center">
                        <Award className="w-4 h-4 mr-1 text-red-500" />
                        {lang === 'sw' ? 'Njia Rahisi ya Kununua Vocha:' : 'Easy Self-Service Checkout:'}
                      </h4>
                      <p className="text-gray-600 leading-normal">
                        {lang === 'sw' ? 'Chagua muda unaotaka, weka namba yako ya simu na ulipie kwa simu yako kupata vocha papo hapo.' : 'Select a validity period, enter your Tanzanian mobile number, and pay securely via mobile money.'}
                      </p>
                    </div>

                    {/* Selector Duration */}
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        {lang === 'sw' ? 'Chagua Kifurushi (Plan)' : 'Choose Plan'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDuration(1)}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between h-20 transition-all cursor-pointer ${
                            selectedDuration === 1 ? 'border-red-600 bg-red-50/10 text-red-700 font-extrabold' : 'border-gray-100 text-gray-600 hover:border-gray-200'
                          }`}
                        >
                          <span className="text-xs">{lang === 'sw' ? 'Saa 1 (1 Mbps)' : '1 Hour (1 Mbps)'}</span>
                          <span className="text-sm font-black">{formatTZS(settings.rates.hour1)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDuration(3)}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between h-20 transition-all cursor-pointer ${
                            selectedDuration === 3 ? 'border-red-600 bg-red-50/10 text-red-700 font-extrabold' : 'border-gray-100 text-gray-600 hover:border-gray-200'
                          }`}
                        >
                          <span className="text-xs">{lang === 'sw' ? 'Masaa 3 (2 Mbps)' : '3 Hours (2 Mbps)'}</span>
                          <span className="text-sm font-black">{formatTZS(settings.rates.hours3)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDuration(24)}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between h-20 transition-all cursor-pointer ${
                            selectedDuration === 24 ? 'border-red-600 bg-red-50/10 text-red-700 font-extrabold' : 'border-gray-100 text-gray-600 hover:border-gray-200'
                          }`}
                        >
                          <span className="text-xs">{lang === 'sw' ? 'Siku 1 (2 Mbps)' : '1 Day (2 Mbps)'}</span>
                          <span className="text-sm font-black">{formatTZS(settings.rates.day1)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDuration(168)}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between h-20 transition-all cursor-pointer ${
                            selectedDuration === 168 ? 'border-red-600 bg-red-50/10 text-red-700 font-extrabold' : 'border-gray-100 text-gray-600 hover:border-gray-200'
                          }`}
                        >
                          <span className="text-xs">{lang === 'sw' ? 'Siku 7 (5 Mbps)' : '7 Days (5 Mbps)'}</span>
                          <span className="text-sm font-black">{formatTZS(settings.rates.week1)}</span>
                        </button>
                      </div>
                    </div>

                    {/* Phone & Operator input */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          {lang === 'sw' ? 'Namba ya Simu' : 'Mobile Number'}
                        </label>
                        <input
                          type="tel"
                          placeholder="07XXXXXXXX"
                          value={mobilePhone}
                          onChange={(e) => setMobilePhone(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500 font-bold bg-gray-50"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          {lang === 'sw' ? 'Mtandao' : 'Carrier'}
                        </label>
                        <select
                          value={selectedCarrier}
                          onChange={(e) => setSelectedCarrier(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500 font-bold bg-gray-50"
                        >
                          <option value="Airtel Money">Airtel Money</option>
                          <option value="M-Pesa">M-Pesa (Vodacom)</option>
                          <option value="Tigo Pesa">Tigo Pesa</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{lang === 'sw' ? `Lipia sasa ${formatTZS(getSelectedPrice())}` : `Pay Now ${formatTZS(getSelectedPrice())}`}</span>
                    </button>
                  </form>
                )}

                {/* USSD PUSH PROMPT INTERACTIVE DIALOG */}
                {paymentStatus === 'push_sent' && (
                  <div className="py-12 text-center space-y-4" id="ussd-push-sim-step">
                    <RefreshCw className="w-10 h-10 text-red-600 animate-spin mx-auto" />
                    <h3 className="font-extrabold text-sm text-gray-800">
                      {lang === 'sw' ? 'Ombi la Malipo Linatumwa...' : 'Sending Payment Request...'}
                    </h3>
                    <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                      {lang === 'sw' ? 'Tunaomba subiri, push notification ya malipo inatumwa kwenye simu yako.' : 'We are initiating a secure USSD push request on your device. Please wait...'}
                    </p>
                  </div>
                )}

                {paymentStatus === 'pin_prompt' && (
                  <div className="p-5 bg-gray-900 text-gray-100 rounded-2xl shadow-lg space-y-4 text-center border-2 border-red-500" id="ussd-pin-prompt-sim">
                    <span className="font-mono text-[9px] text-yellow-400 font-black tracking-widest block uppercase">
                      {selectedCarrier} USSD Push Sim
                    </span>
                    <h3 className="font-extrabold text-xs text-left leading-normal font-mono">
                      {selectedCarrier === 'Airtel Money' ? (
                        `Airtel Money: Je, unakubali kulipa ${formatTZS(getSelectedPrice())} kwenda kwa MERCHANT '${settings.hotspotName}'?`
                      ) : (
                        `Lipa hapa: Je, unathibitisha malipo ya ${formatTZS(getSelectedPrice())} kwenda ${settings.hotspotName}?`
                      )}
                    </h3>
                    <div className="space-y-2">
                      <input
                        type="password"
                        placeholder="ENTER PIN / WEKA PIN"
                        maxLength={4}
                        value={ussdPin}
                        onChange={(e) => setUssdPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-black border border-gray-700 py-2.5 px-4 text-center text-white tracking-widest text-sm font-mono rounded-lg focus:outline-none focus:border-red-500"
                      />
                      <p className="text-[9px] text-gray-400">
                        {lang === 'sw' ? 'Hii ni simulator. Weka PIN yoyote (e.g. 1234) kukamilisha' : 'This is a sandbox simulator. Type any PIN (e.g., 1234) to confirm.'}
                      </p>
                    </div>
                    <div className="flex space-x-2 text-[11px] font-bold">
                      <button
                        onClick={() => setPaymentStatus('idle')}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 py-2 rounded-lg cursor-pointer text-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmUssdPayment}
                        className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg cursor-pointer text-white"
                      >
                        Send PIN
                      </button>
                    </div>
                  </div>
                )}

                {paymentStatus === 'processing' && (
                  <div className="py-12 text-center space-y-4" id="processing-malipo-step">
                    <RefreshCw className="w-10 h-10 text-red-600 animate-spin mx-auto" />
                    <h3 className="font-extrabold text-sm text-gray-800">
                      {lang === 'sw' ? 'Tunahakiki Malipo yako...' : 'Verifying Transaction...'}
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      {lang === 'sw' ? 'Miamala ya simu inachakata. Vocha yako inatengenezwa.' : 'Confirming receipt of funds and generating your internet access ticket.'}
                    </p>
                  </div>
                )}

                {paymentStatus === 'success' && generatedVoucher && (
                  <div className="space-y-4 text-center" id="payment-success-voucher-generation">
                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <h3 className="font-black text-sm text-gray-800">
                      {lang === 'sw' ? 'Malipo Yamepokelewa!' : 'Payment Successful!'}
                    </h3>
                    
                    {/* Voucher display */}
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl space-y-2 text-center">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                        Yako Vocha Access Code
                      </span>
                      <span className="text-2xl font-black text-red-600 tracking-widest font-mono">
                        {generatedVoucher.code}
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-left pt-2 border-t border-red-200/40 text-[11px] text-gray-600">
                        <span>{lang === 'sw' ? 'Kasi' : 'Speed'}: <strong>{formatSpeed(generatedVoucher.bandwidthLimitMbps)}</strong></span>
                        <span>{lang === 'sw' ? 'Muda' : 'Validity'}: <strong>{formatDuration(generatedVoucher.durationHours, lang)}</strong></span>
                      </div>
                    </div>

                    <button
                      onClick={handleUseGeneratedCode}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                    >
                      {lang === 'sw' ? 'Ingia Kwenye Internet' : 'Connect to Internet Now'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: SUPPORT SCREEN */}
            {activeTab === 'support' && (
              <div className="space-y-4 pt-3 text-left flex-grow flex flex-col justify-between" id="tab-support-view">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-red-600">
                    <PhoneCall className="w-5 h-5 animate-bounce" />
                    <h3 className="font-extrabold text-sm">{lang === 'sw' ? 'Huduma kwa Wateja' : 'Customer Helpline'}</h3>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl space-y-3.5">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{lang === 'sw' ? 'Wasiliana Nasi kupitia' : 'Call Support Phone'}</span>
                      <p className="text-sm font-extrabold text-gray-800">{settings.supportPhone}</p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{lang === 'sw' ? 'SSID / Jina la Wi-Fi' : 'Hotspot SSID'}</span>
                      <p className="text-xs font-bold text-gray-700">{settings.hotspotName}</p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{lang === 'sw' ? 'Mtandao router yetu' : 'Network router model'}</span>
                      <p className="text-xs font-medium text-gray-600">{settings.routerModel}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-red-50 text-red-800 rounded-lg text-[11px] leading-relaxed">
                    {lang === 'sw' ? (
                      <>
                        <strong>Je, haupati Ukurasa huu wa Login?</strong> Tafadhali andika <strong className="font-mono">192.168.80.1</strong> au <strong className="font-mono">airtel-guest.net</strong> kwenye kivinjari chako (Chrome/Safari) kulazimisha kuona ukurasa huu.
                      </>
                    ) : (
                      <>
                        <strong>Having connection issues?</strong> If you are not redirected automatically, type <strong className="font-mono">192.168.80.1</strong> or <strong className="font-mono">airtel-guest.net</strong> in your browser address bar to reach this portal.
                      </>
                    )}
                  </div>
                </div>

                <div className="text-center text-[10px] text-gray-400 font-medium">
                  {settings.hotspotName} © 2026. Powered by Airtel Tanzania ODU Router Guest Hotspot.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

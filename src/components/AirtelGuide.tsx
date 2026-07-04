import React, { useState } from 'react';
import { HotspotSettings } from '../types';
import { 
  Network, 
  Settings, 
  Code, 
  HelpCircle, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Info,
  Laptop,
  CheckCircle,
  FileCode
} from 'lucide-react';

interface AirtelGuideProps {
  settings: HotspotSettings;
}

export default function AirtelGuide({ settings }: AirtelGuideProps) {
  const [lang, setLang] = useState<'sw' | 'en'>('sw');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('intro');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? '' : id);
  };

  const handleCopyScript = (scriptText: string, id: string) => {
    navigator.clipboard.writeText(scriptText);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const mikrotikConfigScript = `# =========================================================
# MIKROTIK HOTSPOT SCRIPT FOR AIRTEL ODU VOUCHER INTEGRATION
# =========================================================
# Created for: ${settings.hotspotName}
# Router Gateway IP: 192.168.88.1 (Local LAN)
# Airtel ODU Gateway: ${settings.routerIp}

# 1. IP Configuration (WAN port linked to Airtel ODU LAN)
/ip dhcp-client add interface=ether1 disabled=no comment="Airtel ODU WAN"

# 2. Create Hotspot IP Pool
/ip pool add name=hs-pool-guest ranges=192.168.80.10-192.168.80.254

# 3. Create Hotspot User Profiles matching speed limits in dashboard
# Tier 1: Slow Speed (1 Mbps / 512 Kbps)
/ip hotspot user profile add name="1Mbps_Profile" rate-limit="1M/512k" shared-users=1 idle-timeout=5m keepalive-timeout=2m

# Tier 2: Standard Speed (2 Mbps / 1 Mbps)
/ip hotspot user profile add name="2Mbps_Profile" rate-limit="2M/1M" shared-users=1 idle-timeout=5m keepalive-timeout=2m

# Tier 3: Premium Speed (5 Mbps / 2 Mbps)
/ip hotspot user profile add name="5Mbps_Profile" rate-limit="5M/2M" shared-users=1 idle-timeout=5m keepalive-timeout=2m

# Tier 4: Super Fast (10 Mbps / 4 Mbps)
/ip hotspot user profile add name="10Mbps_Profile" rate-limit="10M/4M" shared-users=1 idle-timeout=5m keepalive-timeout=2m

# 4. Setup Hotspot Server (Guest Wifi)
/ip hotspot profile add name=hs-airtel-guest hotspot-address=192.168.80.1 dns-name=airtel-guest.net login-by=http-chap,cookie
/ip hotspot add name=Airtel_Hotspot interface=ether2-master-local profile=hs-airtel-guest address-pool=hs-pool-guest disabled=no

# 5. Example voucher injection script (Insert generated voucher codes)
# You can copy codes from your catalog and add them like this:
# /ip hotspot user add name="ART-CODE" password="ART-CODE" limit-uptime=24h profile="2Mbps_Profile"`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6" id="router-guide-panel">
      {/* Guide Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-100 gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-red-100 text-red-600 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-none">Airtel ODU Setup Guide</h2>
            <p className="text-xs text-gray-500 mt-1">Mwongozo wa jinsi ya kuunganisha mfumo huu wa Vocha na router yako</p>
          </div>
        </div>

        {/* Swahili / English Selector */}
        <div className="bg-gray-100 p-0.5 rounded-lg flex self-start sm:self-auto text-xs font-bold" id="guide-lang-selector">
          <button
            onClick={() => setLang('sw')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              lang === 'sw' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Kiswahili
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              lang === 'en' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Guide Content Accordions */}
      <div className="space-y-3" id="guide-accordions">
        {/* Intro Overview */}
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('intro')}
            className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 text-left font-bold text-sm text-gray-800 transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <Network className="w-4.5 h-4.5 text-red-500" />
              <span>
                {lang === 'sw' 
                  ? '1. Muundo wa Mtandao (Network Architecture Overview)' 
                  : '1. Network Architecture Overview'}
              </span>
            </div>
            {expandedSection === 'intro' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
          
          {expandedSection === 'intro' && (
            <div className="p-4 bg-white border-t border-gray-50 text-xs text-gray-600 space-y-3 leading-relaxed">
              <p>
                {lang === 'sw' ? (
                  <>
                    Airtel ODU (Outdoor Unit) ni antena ya LTE iliyowekwa nje kwa ajili ya kupokea 4G/5G yenye kasi kubwa nchini Tanzania. Ili kuendesha mfumo wa Vocha (Voucher System) kwa wageni wako kwa ufanisi, tunapendekeza muundo ufuatao:
                  </>
                ) : (
                  <>
                    The Airtel ODU (Outdoor Unit) is a high-speed outdoor 4G/5G antenna router widely used in Tanzania. To implement a guest voucher system, we recommend the following professional local setup:
                  </>
                )}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                <div className="p-3 bg-red-50/40 border border-red-50 rounded-lg text-center">
                  <div className="w-7 h-7 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-xs">A</div>
                  <h4 className="font-bold text-gray-800 mb-1">{lang === 'sw' ? 'Airtel ODU Router' : 'Airtel ODU Router'}</h4>
                  <p className="text-[11px] text-gray-500">{lang === 'sw' ? 'Inatoa Mtandao (IP: 192.168.8.1). Hakuna captive portal.' : 'Provides LTE Internet (IP: 192.168.8.1). No portal built-in.'}</p>
                </div>
                <div className="p-3 bg-blue-50/40 border border-blue-50 rounded-lg text-center">
                  <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-xs">B</div>
                  <h4 className="font-bold text-gray-800 mb-1">{lang === 'sw' ? 'Mikrotik Gateway' : 'Mikrotik Gateway'}</h4>
                  <p className="text-[11px] text-gray-500">{lang === 'sw' ? 'Inadhibiti kasi (Bandwidth) na kudai Vocha kabla ya kuruhusu internet.' : 'Handles speed limits, wall-gardens, and prompts users for voucher codes.'}</p>
                </div>
                <div className="p-3 bg-amber-50/40 border border-amber-50 rounded-lg text-center">
                  <div className="w-7 h-7 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-xs">C</div>
                  <h4 className="font-bold text-gray-800 mb-1">{lang === 'sw' ? 'Access Point / SSID' : 'Access Point / SSID'}</h4>
                  <p className="text-[11px] text-gray-500">{lang === 'sw' ? 'SSID isiyo na password (Open Guest Wifi) ili watu wajiunge kirahisi.' : 'Open passwordless SSID for guests to easily connect their mobile devices.'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Airtel ODU Configuration */}
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('odu')}
            className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 text-left font-bold text-sm text-gray-800 transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <Settings className="w-4.5 h-4.5 text-red-500" />
              <span>
                {lang === 'sw' 
                  ? '2. Jinsi ya Kusanidi Router ya Airtel (Configuring Airtel ODU)' 
                  : '2. Configuring Airtel ODU'}
              </span>
            </div>
            {expandedSection === 'odu' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
          
          {expandedSection === 'odu' && (
            <div className="p-4 bg-white border-t border-gray-50 text-xs text-gray-600 space-y-3 leading-relaxed">
              <h4 className="font-bold text-gray-800 flex items-center">
                <Info className="w-4 h-4 text-red-500 mr-1.5" />
                {lang === 'sw' ? 'Hatua za Kufuata kwenye Admin Panel ya Airtel:' : 'Steps to follow on Airtel ODU Panel:'}
              </h4>
              
              <ol className="list-decimal list-inside space-y-2.5 pl-1.5">
                <li>
                  {lang === 'sw' ? (
                    <>Unganisha kompyuta yako na router ya Airtel, kisha ingia kupitia kivinjari (Browser) kwa anuani: <strong className="text-gray-800 font-mono">192.168.8.1</strong> au <strong className="text-gray-800 font-mono">192.168.0.1</strong>.</>
                  ) : (
                    <>Connect your PC to the Airtel router LAN, then open a browser and type: <strong className="text-gray-800 font-mono">192.168.8.1</strong> or <strong className="text-gray-800 font-mono">192.168.0.1</strong>.</>
                  )}
                </li>
                <li>
                  {lang === 'sw' ? (
                    <>Ingiza jina la mtumiaji <strong className="text-gray-800">admin</strong> na password (kawaida ipo kwenye kibandiko nyuma ya router au chini ya modem).</>
                  ) : (
                    <>Enter the username <strong className="text-gray-800">admin</strong> and password (usually found on the router sticker back/bottom).</>
                  )}
                </li>
                <li>
                  {lang === 'sw' ? (
                    <>Nenda kwenye sehemu ya <strong className="text-gray-800">Wi-Fi Settings</strong> kisha <strong className="text-gray-800">Multi-SSID</strong> au <strong className="text-gray-800">Guest SSID</strong> na uiwashe.</>
                  ) : (
                    <>Go to <strong className="text-gray-800">Wi-Fi Settings</strong> then <strong className="text-gray-800">Multi-SSID</strong> or <strong className="text-gray-800">Guest SSID</strong> and enable it.</>
                  )}
                </li>
                <li>
                  {lang === 'sw' ? (
                    <>Sanidi jina la Wi-Fi (SSID) kuwa: <strong className="text-red-600 font-bold">{settings.hotspotName}</strong>.</>
                  ) : (
                    <>Set the SSID name to: <strong className="text-red-600 font-bold">{settings.hotspotName}</strong>.</>
                  )}
                </li>
                <li>
                  {lang === 'sw' ? (
                    <>Weka Security Mode kuwa <strong className="text-red-600 font-bold">Open</strong> au <strong className="text-red-600 font-bold">No Password</strong> ili wageni wasiandike password wanapounganisha mara ya kwanza.</>
                  ) : (
                    <>Set the Security Mode to <strong className="text-red-600 font-bold">Open</strong> or <strong className="text-red-600 font-bold">No Password</strong> so guests can connect without entering a password initially.</>
                  )}
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Mikrotik Integration script */}
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('mikrotik')}
            className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 text-left font-bold text-sm text-gray-800 transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <FileCode className="w-4.5 h-4.5 text-red-500" />
              <span>
                {lang === 'sw' 
                  ? '3. Mikrotik RouterOS Setup Script (Plug & Play)' 
                  : '3. Mikrotik RouterOS Setup Script (Plug & Play)'}
              </span>
            </div>
            {expandedSection === 'mikrotik' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
          
          {expandedSection === 'mikrotik' && (
            <div className="p-4 bg-white border-t border-gray-50 text-xs text-gray-600 space-y-4 leading-relaxed">
              <p>
                {lang === 'sw' ? (
                  <>
                    Ili kudhibiti kasi ya mtumiaji (Speed Limits) na ukomo wa vocha zilizoundwa hapa, unaweza kusanidi router yako ya Mikrotik kwa kutumia script hii ya RouterOS. Copy script kisha uifungue kwenye Winbox Terminal:
                  </>
                ) : (
                  <>
                    To implement bandwidth limits and authenticate voucher codes seamlessly, configure your local Mikrotik gateway router by copying and pasting this RouterOS script into your Mikrotik terminal:
                  </>
                )}
              </p>

              {/* Script Box */}
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <div className="bg-gray-800 px-4 py-2 flex justify-between items-center text-[10px] text-gray-300 font-mono">
                  <span>mikrotik_hotspot_setup.rsc</span>
                  <button
                    onClick={() => handleCopyScript(mikrotikConfigScript, 'mikrotik')}
                    className="flex items-center space-x-1 hover:text-white bg-gray-700 hover:bg-gray-600 px-2.5 py-1 rounded transition-colors cursor-pointer"
                  >
                    {copiedScript === 'mikrotik' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Script</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 bg-gray-900 text-gray-100 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-72">
                  {mikrotikConfigScript}
                </pre>
              </div>

              <div className="bg-blue-50 border border-blue-100 text-blue-700 p-3 rounded-lg flex items-start space-x-2 text-[11px]">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="leading-normal">
                  {lang === 'sw' ? (
                    <>
                      <strong>Ushauri wa Kitaalamu:</strong> Bandwidth limits (Speed profiles) kwenye Mikrotik lazima zilingane na zile zilizowekwa kwenye form ya kuunda Vocha (e.g., "1Mbps_Profile", "2Mbps_Profile", n.k.) ili kasi idhibitiwe ipasavyo kwa mtumiaji wa vocha hiyo.
                    </>
                  ) : (
                    <>
                      <strong>Installer Tip:</strong> The user profiles in Mikrotik ("1Mbps_Profile", "2Mbps_Profile", etc.) should exactly correspond to the bandwidth speeds selected during voucher generation in this dashboard for smooth local limit enforcement.
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Manual Method */}
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('manual')}
            className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 text-left font-bold text-sm text-gray-800 transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <Laptop className="w-4.5 h-4.5 text-red-500" />
              <span>
                {lang === 'sw' 
                  ? '4. Njia ya Mwongozo / Bila Mikrotik (Manual Assisted Method)' 
                  : '4. Manual Assisted Method (Without Mikrotik)'}
              </span>
            </div>
            {expandedSection === 'manual' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
          
          {expandedSection === 'manual' && (
            <div className="p-4 bg-white border-t border-gray-50 text-xs text-gray-600 space-y-3 leading-relaxed">
              <p>
                {lang === 'sw' ? (
                  <>
                    Ikiwa huna router ya Mikrotik, bado unaweza kutumia mfumo huu kwa njia ya uandikishaji wa mwongozo (MAC Address Binding) kwenye router ya Airtel:
                  </>
                ) : (
                  <>
                    If you do not have a Mikrotik router, you can still utilize this portal as an admin helper to log and track access, manually adding devices to the Airtel ODU router MAC address filter:
                  </>
                )}
              </p>

              <ol className="list-decimal list-inside space-y-2.5 pl-1.5">
                <li>
                  {lang === 'sw' ? (
                    <>Tengeneza vocha kwenye mfumo huu na uziuze kwa wageni.</>
                  ) : (
                    <>Generate vouchers using this dashboard and sell them to customers.</>
                  )}
                </li>
                <li>
                  {lang === 'sw' ? (
                    <>Mgeni anapofika, mwambie ajiunge kwenye Guest Wi-Fi na afungue ukurasa wa Login (Portal) wetu.</>
                  ) : (
                    <>When a guest connects to your guest Wi-Fi, have them open our mock Guest Portal.</>
                  )}
                </li>
                <li>
                  {lang === 'sw' ? (
                    <>Mgeni ataingiza vocha yake ili kuiwasha (kui-activate) na kuandika Jina la simu yake na anwani ya MAC.</>
                  ) : (
                    <>The guest enters their voucher code to activate it, which logs their phone model and MAC address on the live session tracker.</>
                  )}
                </li>
                <li>
                  {lang === 'sw' ? (
                    <>Wewe kama msimamizi, utaona jina la simu yao kwenye <strong>Active Sessions</strong>, kisha unaweza kufanya mambo yafuatayo:</>
                  ) : (
                    <>As the administrator, you will instantly see their device name and MAC address under the <strong>Active Sessions</strong> tab, where you can:</>
                  )}
                  <ul className="list-disc list-inside pl-5 mt-1 space-y-1 text-[11px] text-gray-500">
                    <li>
                      {lang === 'sw' 
                        ? 'Kuruhusu kifaa chao kwenye MAC filtering ya Airtel ODU kulingana na muda uliolipwa.' 
                        : 'Allow their device in the Airtel ODU MAC Address Filtering list for the paid duration.'}
                    </li>
                    <li>
                      {lang === 'sw' 
                        ? 'Kutumia kuweka kumbukumbu sahihi za nani ameunganisha mtandao wako na kulipia.' 
                        : 'Keep perfect automated books of guest payments and network access logs.'}
                    </li>
                  </ul>
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { HotspotSettings } from '../types';
import { Settings, Save, Smartphone, DollarSign, HelpCircle, ShieldAlert } from 'lucide-react';

interface SettingsPanelProps {
  settings: HotspotSettings;
  onSave: (settings: HotspotSettings) => Promise<void>;
}

export default function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  const [formData, setFormData] = useState<HotspotSettings>({ ...settings });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await onSave(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.warn("Failed to save settings: ", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRateChange = (rateKey: keyof HotspotSettings['rates'], value: number) => {
    setFormData({
      ...formData,
      rates: {
        ...formData.rates,
        [rateKey]: value
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" id="settings-management-panel">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-gray-50">
        <div className="p-2 bg-red-100 text-red-600 rounded-lg">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-none">System Settings</h2>
          <p className="text-xs text-gray-500 mt-1">Configure your local guest hotspot variables and mobile money rates</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" id="settings-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Section: General Configuration */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center">
              <Smartphone className="w-4 h-4 mr-1.5 text-gray-500" />
              <span>General Config</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  Hotspot Name / SSID
                </label>
                <input
                  type="text"
                  value={formData.hotspotName}
                  onChange={(e) => setFormData({ ...formData, hotspotName: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">This SSID must match your Airtel router open Wi-Fi network.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                    Router Model
                  </label>
                  <input
                    type="text"
                    value={formData.routerModel}
                    onChange={(e) => setFormData({ ...formData, routerModel: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                    Router IP Gateway
                  </label>
                  <input
                    type="text"
                    value={formData.routerIp}
                    onChange={(e) => setFormData({ ...formData, routerIp: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                    Support Helpline
                  </label>
                  <input
                    type="tel"
                    value={formData.supportPhone}
                    onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                    Default Portal Lang
                  </label>
                  <select
                    value={formData.defaultLanguage}
                    onChange={(e) => setFormData({ ...formData, defaultLanguage: e.target.value as 'sw' | 'en' })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 font-bold text-gray-700"
                  >
                    <option value="sw">Kiswahili</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Pricing & Checkout Rates */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center">
              <DollarSign className="w-4 h-4 mr-1.5 text-gray-500" />
              <span>Voucher Prices (TZS)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  1 Hour Rate
                </label>
                <input
                  type="number"
                  step="100"
                  value={formData.rates.hour1}
                  onChange={(e) => handleRateChange('hour1', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  3 Hours Rate
                </label>
                <input
                  type="number"
                  step="100"
                  value={formData.rates.hours3}
                  onChange={(e) => handleRateChange('hours3', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  24 Hours / 1 Day Rate
                </label>
                <input
                  type="number"
                  step="100"
                  value={formData.rates.day1}
                  onChange={(e) => handleRateChange('day1', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  7 Days / 1 Week Rate
                </label>
                <input
                  type="number"
                  step="100"
                  value={formData.rates.week1}
                  onChange={(e) => handleRateChange('week1', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  30 Days / 1 Month Rate
                </label>
                <input
                  type="number"
                  step="100"
                  value={formData.rates.month1}
                  onChange={(e) => handleRateChange('month1', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Merchant Phone Settings (Tanzania Mobile Money) */}
        <div className="border-t border-gray-100 pt-5 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
            Mobile Money Checkout Merchant Codes
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                Airtel Money Merchant Number (Lipa namba)
              </label>
              <input
                type="text"
                placeholder="e.g. 998877"
                value={formData.airtelMoneyMerchantNumber || ''}
                onChange={(e) => setFormData({ ...formData, airtelMoneyMerchantNumber: e.target.value })}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Allows guest self-service payments to go directly to your business Airtel Money.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                Vodacom M-Pesa Till Number (Lipa namba)
              </label>
              <input
                type="text"
                placeholder="e.g. 553311"
                value={formData.mPesaMerchantNumber || ''}
                onChange={(e) => setFormData({ ...formData, mPesaMerchantNumber: e.target.value })}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Used to display M-Pesa push receipt credentials to customer phones on checkout.
              </p>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="border-t border-gray-100 pt-5 flex items-center justify-between">
          <div className="text-left flex items-start space-x-2 text-[11px] text-gray-400 max-w-md">
            <ShieldAlert className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p>
              Settings are saved directly in your durable Firebase cloud Firestore instance and persist securely across client sessions.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {saveSuccess && (
              <span className="text-xs text-green-600 font-extrabold animate-fade-in mr-2">
                ✓ Saved Successfully!
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

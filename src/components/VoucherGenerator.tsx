import React, { useState, useEffect } from 'react';
import { Voucher, HotspotSettings } from '../types';
import { generateVoucherCode, estimatePrice, formatTZS } from '../utils';
import { Ticket, Plus, Sparkles, RefreshCw, Layers } from 'lucide-react';

interface VoucherGeneratorProps {
  settings: HotspotSettings;
  onGenerate: (vouchers: Omit<Voucher, 'id'>[]) => Promise<void>;
}

export default function VoucherGenerator({ settings, onGenerate }: VoucherGeneratorProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [duration, setDuration] = useState<number>(1); // in hours
  const [speed, setSpeed] = useState<number>(2); // in Mbps (2 Mbps is standard guest speed in TZ)
  const [dataLimit, setDataLimit] = useState<number>(1); // in GB (1 GB)
  const [customPrice, setCustomPrice] = useState<number>(500);
  const [notes, setNotes] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewCode, setPreviewCode] = useState<string>('ART-XXXX');

  // Update estimate price whenever duration or speed changes
  useEffect(() => {
    // Determine base rate from settings or estimate
    let price = 500;
    if (duration === 1) price = settings.rates.hour1;
    else if (duration === 3) price = settings.rates.hours3;
    else if (duration === 24) price = settings.rates.day1;
    else if (duration === 168) price = settings.rates.week1;
    else if (duration === 720) price = settings.rates.month1;
    else {
      price = estimatePrice(duration, speed);
    }

    // Apply speed adjustment factor
    if (speed === 1) price *= 0.8;
    else if (speed === 5) price *= 1.2;
    else if (speed === 10) price *= 1.5;
    else if (speed === 0) price *= 2.0; // Unlimited speed is premium

    // Round to nearest 100 TZS for realistic prices
    price = Math.round(price / 100) * 100;
    setCustomPrice(price);
  }, [duration, speed, dataLimit, settings.rates]);

  // Update random preview code once in a while
  useEffect(() => {
    setPreviewCode(generateVoucherCode('ART'));
  }, []);

  const handleRegenPreview = () => {
    setPreviewCode(generateVoucherCode('ART'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      const newVouchers: Omit<Voucher, 'id'>[] = [];
      
      for (let i = 0; i < quantity; i++) {
        const code = generateVoucherCode('ART');
        newVouchers.push({
          code,
          durationHours: duration,
          bandwidthLimitMbps: speed,
          dataLimitGB: dataLimit,
          priceTZS: customPrice,
          status: 'active',
          createdAt: new Date().toISOString(),
          usedDataMB: 0,
          notes: notes || undefined
        });
      }
      
      await onGenerate(newVouchers);
      setNotes('');
      // Show confirmation
    } catch (error) {
      console.warn("Failed to generate vouchers:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" id="voucher-generator">
      <div className="flex items-center space-x-2 mb-6">
        <div className="p-2 bg-red-100 text-red-600 rounded-lg">
          <Ticket className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-none">Generate Vouchers</h2>
          <p className="text-xs text-gray-500 mt-1">Create single or bulk internet vouchers for your Airtel Guest Network</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-4" id="generator-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Quantity (Bulk Creation)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Voucher Validity Period
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-50"
              >
                <option value={1}>1 Hour (Masaa 1)</option>
                <option value={3}>3 Hours (Masaa 3)</option>
                <option value={24}>24 Hours / 1 Day (Siku 1)</option>
                <option value={168}>7 Days / 1 Week (Siku 7)</option>
                <option value={720}>30 Days / 1 Month (Siku 30)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Bandwidth Limit (Speed)
              </label>
              <select
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-50"
              >
                <option value={1}>1 Mbps (Slow / Budget)</option>
                <option value={2}>2 Mbps (Standard Guest)</option>
                <option value={5}>5 Mbps (Fast / Premium)</option>
                <option value={10}>10 Mbps (Super Fast)</option>
                <option value={0}>Unlimited Speed (Bila Kikomo)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Data Volume Limit
              </label>
              <select
                value={dataLimit}
                onChange={(e) => setDataLimit(parseFloat(e.target.value))}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-50"
              >
                <option value={0.5}>500 MB</option>
                <option value={1}>1 GB</option>
                <option value={3}>3 GB</option>
                <option value={5}>5 GB</option>
                <option value={10}>10 GB</option>
                <option value={0}>Unlimited Data (Bila Kikomo)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Price in Tanzanian Shilling (TZS)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm font-medium">TZS</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-12 pr-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-50 font-medium text-gray-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Notes / Memo (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Sold to Guest Room 4"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-50 placeholder-gray-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full mt-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2.5 px-4 rounded-lg text-sm font-bold shadow-sm transition-colors duration-150 flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating {quantity} Voucher{quantity > 1 ? 's' : ''}...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Generate {quantity} Voucher{quantity > 1 ? 's' : ''}</span>
              </>
            )}
          </button>
        </form>

        {/* Live Card Ticket Preview Column */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-gray-50 rounded-xl p-5 border border-dashed border-gray-200" id="generator-preview">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              <span>Ticket Preview</span>
            </span>
            <button
              type="button"
              onClick={handleRegenPreview}
              className="text-xs text-red-600 hover:text-red-700 flex items-center space-x-1 cursor-pointer"
              title="Refresh Preview Code"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regen Code</span>
            </button>
          </div>

          {/* Ticket Body */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" id="voucher-ticket-preview">
            {/* Ticket Header */}
            <div className="bg-red-600 p-3.5 text-white flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-sm tracking-wide">{settings.hotspotName}</h4>
                <p className="text-[10px] opacity-90 font-medium">Airtel Guest Network</p>
              </div>
              <div className="bg-white/15 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                WiFi Ticket
              </div>
            </div>

            {/* Ticket Content */}
            <div className="p-4 space-y-3.5 text-center relative">
              {/* Voucher Code Box */}
              <div className="bg-gray-50 py-3 px-4 rounded-lg border border-gray-100 inline-block w-full">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">
                  VOUCHER ACCESS CODE
                </span>
                <span className="text-2xl font-black text-red-600 tracking-wider font-mono">
                  {previewCode}
                </span>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-3 gap-2 text-left border-y border-gray-100 py-3">
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase block">Validity</span>
                  <span className="text-xs font-bold text-gray-800">
                    {duration === 1 ? '1 Hour' : duration < 24 ? `${duration} Hours` : `${duration / 24} Day${duration >= 48 ? 's' : ''}`}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase block">Speed Limit</span>
                  <span className="text-xs font-bold text-gray-800">
                    {speed === 0 ? 'Unlimited' : `${speed} Mbps`}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase block">Data Limit</span>
                  <span className="text-xs font-bold text-gray-800">
                    {dataLimit === 0 ? 'Unlimited' : `${dataLimit} GB`}
                  </span>
                </div>
              </div>

              {/* Instructions and QR */}
              <div className="flex justify-between items-center text-left pt-1">
                <div className="space-y-1 pr-2">
                  <span className="text-[9px] text-gray-400 font-bold uppercase block">How to use</span>
                  <p className="text-[10px] leading-tight text-gray-500">
                    1. Connect to SSID: <strong className="text-gray-700">{settings.hotspotName}</strong>
                  </p>
                  <p className="text-[10px] leading-tight text-gray-500">
                    2. Go to portal & enter this code to browse.
                  </p>
                </div>
                {/* Simulated QR Code */}
                <div className="w-12 h-12 bg-gray-100 border border-gray-200 rounded flex items-center justify-center p-1 flex-shrink-0">
                  <div className="grid grid-cols-4 gap-0.5 w-full h-full opacity-70">
                    {[...Array(16)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-full h-full ${
                          (i % 3 === 0 || i % 5 === 1 || i === 0 || i === 15) ? 'bg-gray-800' : 'bg-transparent'
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ticket Footer / Price */}
              <div className="flex justify-between items-center border-t border-dashed border-gray-200 pt-3 mt-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Price / Bei</span>
                <span className="text-sm font-black text-gray-900">{formatTZS(customPrice)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center space-x-2">
            <Layers className="w-4 h-4 flex-shrink-0" />
            <p className="leading-tight">
              Airtel ODU speed tiers will match this voucher code profile when integrated with your Mikrotik Hotspot!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

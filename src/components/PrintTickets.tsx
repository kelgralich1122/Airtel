import React, { useRef } from 'react';
import { Voucher, HotspotSettings } from '../types';
import { formatTZS, formatDuration, formatSpeed, formatDataLimit } from '../utils';
import { Printer, X, Check, Copy } from 'lucide-react';

interface PrintTicketsProps {
  settings: HotspotSettings;
  vouchers: Voucher[];
  onClose: () => void;
}

export default function PrintTickets({ settings, vouchers, onClose }: PrintTicketsProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;

    if (printContent) {
      // Create a temporary print frame or just open print dialog
      // For simple single page app, a clean print-only CSS is the standard.
      // We will open a new window to print beautifully without the rest of the application.
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Guest WiFi Tickets - ${settings.hotspotName}</title>
              <style>
                body {
                  font-family: 'Inter', system-ui, sans-serif;
                  background: white;
                  color: black;
                  margin: 0;
                  padding: 20px;
                }
                .ticket-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                  gap: 15px;
                }
                .ticket {
                  border: 2px solid #ccc;
                  border-radius: 8px;
                  overflow: hidden;
                  max-width: 320px;
                  page-break-inside: avoid;
                }
                .ticket-header {
                  background: #d0121a;
                  color: white;
                  padding: 10px;
                  text-align: center;
                }
                .ticket-header h3 {
                  margin: 0;
                  font-size: 14px;
                  font-weight: 800;
                  letter-spacing: 0.5px;
                }
                .ticket-header p {
                  margin: 2px 0 0 0;
                  font-size: 10px;
                  opacity: 0.9;
                }
                .ticket-body {
                  padding: 15px;
                  text-align: center;
                }
                .code-box {
                  background: #f3f4f6;
                  border: 1px solid #e5e7eb;
                  border-radius: 6px;
                  padding: 10px;
                  margin-bottom: 12px;
                }
                .code-title {
                  font-size: 8px;
                  color: #6b7280;
                  font-weight: bold;
                  letter-spacing: 1px;
                  margin-bottom: 3px;
                }
                .code-value {
                  font-size: 20px;
                  font-family: monospace;
                  font-weight: 900;
                  color: #d0121a;
                  letter-spacing: 2px;
                }
                .specs {
                  display: grid;
                  grid-template-columns: 1fr 1fr 1fr;
                  border-top: 1px solid #f3f4f6;
                  border-bottom: 1px solid #f3f4f6;
                  padding: 8px 0;
                  margin-bottom: 12px;
                  text-align: left;
                }
                .spec-item {
                  display: flex;
                  flex-direction: column;
                }
                .spec-label {
                  font-size: 8px;
                  color: #9ca3af;
                  font-weight: bold;
                }
                .spec-val {
                  font-size: 10px;
                  font-weight: bold;
                  color: #374151;
                }
                .instructions {
                  font-size: 9px;
                  color: #6b7280;
                  text-align: left;
                  line-height: 1.3;
                }
                .footer {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-t: 1px dashed #e5e7eb;
                  padding-top: 10px;
                  margin-top: 8px;
                }
                .price-lbl {
                  font-size: 9px;
                  color: #9ca3af;
                  font-weight: bold;
                }
                .price-val {
                  font-size: 13px;
                  font-weight: bold;
                  color: #111827;
                }
                @media print {
                  body { padding: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              <div class="ticket-grid">
                ${printContent}
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" id="ticket-print-modal">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="font-extrabold text-base text-gray-900 flex items-center space-x-2">
              <Printer className="w-5 h-5 text-red-600" />
              <span>Print WiFi Voucher Tickets</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Ready to print {vouchers.length} ticket{vouchers.length > 1 ? 's' : ''} on standard or thermal paper
            </p>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-150 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Preview Grid */}
        <div className="p-6 overflow-y-auto flex-grow bg-gray-50/50">
          
          <div className="mb-4 bg-yellow-50 border border-yellow-100 text-yellow-800 p-3 rounded-lg text-xs leading-normal">
            <strong>Mchapisho wa Risiti (Thermal & A4 printing):</strong> Unapobonyeza kitufe cha 'Print', ukurasa mpya utafunguka kukuwezesha kukata na kuchapa tiketi hizi kwa ajili ya kuwakabidhi wateja wako katika duka au hoteli yako.
          </div>

          {/* This wrapper holds only the clean printable ticket innerHTML that gets read by JS */}
          <div ref={printAreaRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="printable-area">
            {vouchers.map((voucher) => (
              <div 
                key={voucher.id} 
                className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm max-w-[280px] mx-auto text-left flex flex-col justify-between"
                style={{ contentVisibility: 'auto' }}
              >
                {/* Header */}
                <div className="bg-red-600 p-3 text-white text-center">
                  <h3 className="font-black text-xs uppercase tracking-wider">{settings.hotspotName}</h3>
                  <p className="text-[9px] opacity-90 font-bold uppercase tracking-widest">Airtel Guest Network</p>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  {/* Code Box */}
                  <div className="bg-gray-50 py-2 px-3 rounded-lg border border-gray-100 text-center">
                    <span className="text-[8px] text-gray-400 font-bold uppercase block tracking-wider mb-0.5">
                      VOUCHER CODE / NAMBA YA SIRI
                    </span>
                    <span className="text-xl font-black text-red-600 tracking-wider font-mono">
                      {voucher.code}
                    </span>
                  </div>

                  {/* Specs Grid */}
                  <div className="grid grid-cols-3 gap-1.5 text-left border-y border-gray-100 py-2 text-[10px]">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-gray-400 font-bold uppercase">Muda</span>
                      <span className="font-bold text-gray-800">{formatDuration(voucher.durationHours, 'sw')}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-gray-400 font-bold uppercase">Kasi</span>
                      <span className="font-bold text-gray-800">{formatSpeed(voucher.bandwidthLimitMbps, 'sw')}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-gray-400 font-bold uppercase">Kifurushi</span>
                      <span className="font-bold text-gray-800">{formatDataLimit(voucher.dataLimitGB, 'sw')}</span>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-1 text-[9px] text-gray-500 leading-tight">
                    <p className="font-bold text-gray-700">Jinsi ya kutumia (How to use):</p>
                    <p>1. Washa WiFi na unganisha na: <strong>{settings.hotspotName}</strong></p>
                    <p>2. Fungua browser au portal kisha weka namba yako ya siri kuanza kuvinjari.</p>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center border-t border-dashed border-gray-200 pt-2.5 mt-1">
                    <span className="text-[9px] text-gray-400 font-bold uppercase">BEI / PRICE</span>
                    <span className="text-xs font-black text-gray-900">{formatTZS(voucher.priceTZS)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-between items-center font-bold">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl text-xs text-gray-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Chapa Sasa / Print {vouchers.length} Ticket{vouchers.length > 1 ? 's' : ''}</span>
          </button>
        </div>

      </div>
    </div>
  );
}

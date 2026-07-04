import React, { useState } from 'react';
import { Voucher } from '../types';
import { formatTZS, formatDuration, formatSpeed, formatDataLimit } from '../utils';
import { 
  Search, 
  Trash2, 
  Printer, 
  Slash, 
  CheckCircle, 
  Clock, 
  Ban, 
  FileText,
  Copy,
  Check
} from 'lucide-react';

interface VouchersTableProps {
  vouchers: Voucher[];
  onDelete: (id: string) => Promise<void>;
  onUpdateStatus: (id: string, status: 'active' | 'used' | 'expired' | 'revoked') => Promise<void>;
  onSelectForPrint: (voucher: Voucher) => void;
  onSelectMultipleForPrint: (vouchers: Voucher[]) => void;
}

export default function VouchersTable({ 
  vouchers, 
  onDelete, 
  onUpdateStatus,
  onSelectForPrint,
  onSelectMultipleForPrint
}: VouchersTableProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedVouchers, setSelectedVouchers] = useState<string[]>([]);

  // Search and Filter Vouchers
  const filteredVouchers = vouchers.filter(v => {
    const codeMatch = v.code.toLowerCase().includes(searchTerm.toLowerCase());
    const notesMatch = v.notes?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const statusMatch = statusFilter === 'all' || v.status === statusFilter;
    return (codeMatch || notesMatch) && statusMatch;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const handleSelectVoucher = (id: string) => {
    if (selectedVouchers.includes(id)) {
      setSelectedVouchers(selectedVouchers.filter(vId => vId !== id));
    } else {
      setSelectedVouchers([...selectedVouchers, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedVouchers.length === filteredVouchers.length) {
      setSelectedVouchers([]);
    } else {
      setSelectedVouchers(filteredVouchers.map(v => v.id));
    }
  };

  const handlePrintSelected = () => {
    const toPrint = vouchers.filter(v => selectedVouchers.includes(v.id));
    if (toPrint.length > 0) {
      onSelectMultipleForPrint(toPrint);
    }
  };

  const getStatusBadge = (status: Voucher['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            Active / Ready
          </span>
        );
      case 'used':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 animate-pulse">
            <Clock className="w-3.5 h-3.5 mr-1" />
            In Use (Active)
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            <Ban className="w-3.5 h-3.5 mr-1" />
            Expired
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
            <Slash className="w-3.5 h-3.5 mr-1" />
            Revoked
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" id="vouchers-manager-panel">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Voucher Catalog</h2>
          <p className="text-xs text-gray-500 mt-0.5">Search, filter, print, or manage generated voucher cards</p>
        </div>

        {/* Search & Filter Inputs */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Print Selection Action */}
          {selectedVouchers.length > 0 && (
            <button
              onClick={handlePrintSelected}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors duration-150 flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Selected ({selectedVouchers.length})</span>
            </button>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search code or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-white w-48"
            />
          </div>

          {/* Status Select Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active / Ready</option>
            <option value="used">In Use</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" id="vouchers-list-table">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <th className="py-3 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={filteredVouchers.length > 0 && selectedVouchers.length === filteredVouchers.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
              </th>
              <th className="py-3 px-4">Voucher Code</th>
              <th className="py-3 px-4">Validity</th>
              <th className="py-3 px-4">Limits (Speed / Data)</th>
              <th className="py-3 px-4">Price (TZS)</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Note / Device</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-xs">
            {filteredVouchers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-sm">No vouchers found</p>
                  <p className="text-xs text-gray-400 mt-1">Try expanding your search or generate new ones!</p>
                </td>
              </tr>
            ) : (
              filteredVouchers.map((voucher) => (
                <tr 
                  key={voucher.id} 
                  className={`hover:bg-gray-50/50 transition-colors duration-100 ${
                    selectedVouchers.includes(voucher.id) ? 'bg-red-50/20' : ''
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedVouchers.includes(voucher.id)}
                      onChange={() => handleSelectVoucher(voucher.id)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </td>

                  {/* Code Column with Copy action */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-extrabold text-sm text-red-600 tracking-wider">
                        {voucher.code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(voucher.code)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors duration-100 cursor-pointer"
                        title="Copy Code"
                      >
                        {copiedCode === voucher.code ? (
                          <Check className="w-3.5 h-3.5 text-green-500 animate-scale-in" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Duration Validity */}
                  <td className="py-3.5 px-4 font-medium text-gray-700">
                    {formatDuration(voucher.durationHours, 'sw')} ({formatDuration(voucher.durationHours, 'en')})
                  </td>

                  {/* Limits Specs */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col space-y-0.5 text-[11px]">
                      <span className="font-bold text-gray-800">
                        Speed: <span className="font-medium text-gray-600">{formatSpeed(voucher.bandwidthLimitMbps)}</span>
                      </span>
                      <span className="font-bold text-gray-800">
                        Quota: <span className="font-medium text-gray-600">{formatDataLimit(voucher.dataLimitGB)}</span>
                      </span>
                    </div>
                  </td>

                  {/* Price (TZS) */}
                  <td className="py-3.5 px-4 font-extrabold text-gray-900">
                    {formatTZS(voucher.priceTZS)}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(voucher.status)}
                  </td>

                  {/* Notes / Device column */}
                  <td className="py-3.5 px-4 text-gray-500 font-medium">
                    {voucher.status === 'used' && voucher.deviceName ? (
                      <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                        {voucher.deviceName} ({voucher.macAddress})
                      </span>
                    ) : voucher.notes ? (
                      <span className="italic">{voucher.notes}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>

                  {/* Actions column */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {/* Print button */}
                      <button
                        onClick={() => onSelectForPrint(voucher)}
                        className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors cursor-pointer"
                        title="Print Ticket Receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Toggle status (Revoke/Activate) */}
                      {voucher.status === 'active' || voucher.status === 'used' ? (
                        <button
                          onClick={() => onUpdateStatus(voucher.id, 'revoked')}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Revoke Access Code"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      ) : voucher.status === 'revoked' ? (
                        <button
                          onClick={() => onUpdateStatus(voucher.id, 'active')}
                          className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors cursor-pointer"
                          title="Activate / Unrevoke"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      ) : null}

                      {/* Delete button */}
                      <button
                        onClick={() => {
                          if (window.confirm("Je, una uhakika unataka kufuta vocha hii? \nAre you sure you want to delete this voucher?")) {
                            onDelete(voucher.id);
                          }
                        }}
                        className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

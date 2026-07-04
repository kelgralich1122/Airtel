import React from 'react';
import { Voucher, ActiveSession } from '../types';
import { formatTZS } from '../utils';
import { 
  DollarSign, 
  Wifi, 
  Ticket, 
  Smartphone, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface DashboardStatsProps {
  vouchers: Voucher[];
  sessions: ActiveSession[];
}

export default function DashboardStats({ vouchers, sessions }: DashboardStatsProps) {
  // Total Revenue (all vouchers that are 'used', 'expired')
  const totalRevenue = vouchers
    .filter(v => v.status === 'used' || v.status === 'expired')
    .reduce((sum, v) => sum + v.priceTZS, 0);

  // Active unused vouchers
  const activeUnusedCount = vouchers.filter(v => v.status === 'active').length;

  // Total active sessions
  const activeSessionsCount = sessions.length;

  // Total data simulated usage
  const totalDataUsedMB = vouchers.reduce((sum, v) => sum + (v.usedDataMB || 0), 0);
  const totalDataGB = (totalDataUsedMB / 1024).toFixed(2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-stats">
      {/* Total Revenue Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative overflow-hidden flex flex-col justify-between" id="stat-card-revenue">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider block mb-1">
              Revenue Generated
            </span>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
              {formatTZS(totalRevenue)}
            </h3>
          </div>
          <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-xs text-green-600 font-medium">
          <TrendingUp className="w-3.5 h-3.5 mr-1" />
          <span>From activated vouchers</span>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full filter blur-2xl opacity-40 -mr-6 -mt-6"></div>
      </div>

      {/* Active Sessions Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative overflow-hidden flex flex-col justify-between" id="stat-card-sessions">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider block mb-1">
              Active Guest Devices
            </span>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
              {activeSessionsCount}
            </h3>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Wifi className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-xs text-gray-500">
          <span className="flex h-2 w-2 relative mr-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span>Connected to Airtel ODU Guest SSID</span>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full filter blur-2xl opacity-40 -mr-6 -mt-6"></div>
      </div>

      {/* Available Vouchers Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative overflow-hidden flex flex-col justify-between" id="stat-card-available">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider block mb-1">
              Unused Active Vouchers
            </span>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
              {activeUnusedCount}
            </h3>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Ticket className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-xs text-amber-600 font-medium">
          <Activity className="w-3.5 h-3.5 mr-1" />
          <span>Ready for retail sales</span>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full filter blur-2xl opacity-40 -mr-6 -mt-6"></div>
      </div>

      {/* Total Data Transferred Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative overflow-hidden flex flex-col justify-between" id="stat-card-data">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider block mb-1">
              Total Guest Data Sim
            </span>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
              {totalDataGB} GB
            </h3>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-xs text-purple-600 font-medium">
          <span>Speed limiters active on ODU</span>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full filter blur-2xl opacity-40 -mr-6 -mt-6"></div>
      </div>
    </div>
  );
}

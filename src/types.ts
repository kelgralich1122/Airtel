export interface Voucher {
  id: string;
  code: string;
  durationHours: number; // Duration in hours (e.g., 1, 2, 24, 168, 720)
  bandwidthLimitMbps: number; // Speed limit in Mbps (e.g., 2, 5, 10, or 0 for unlimited)
  dataLimitGB: number; // Data limit in GB (e.g., 0.5, 1, 5, or 0 for unlimited)
  priceTZS: number; // Price in Tanzanian Shillings (e.g., 500, 1000, 5000)
  status: 'active' | 'used' | 'expired' | 'revoked';
  createdAt: string;
  activatedAt?: string;
  expiresAt?: string;
  usedDataMB: number; // Track simulated data usage (in MB)
  macAddress?: string; // Connected device MAC
  deviceName?: string; // Connected device model (e.g., "Infinix Hot 30", "Samsung A14")
  notes?: string;
}

export interface HotspotSettings {
  hotspotName: string;
  routerModel: string;
  routerIp: string;
  supportPhone: string;
  currencySymbol: string;
  defaultLanguage: 'sw' | 'en';
  rates: {
    hour1: number;
    hours3: number;
    day1: number;
    week1: number;
    month1: number;
  };
  mPesaMerchantNumber?: string;
  airtelMoneyMerchantNumber?: string;
}

export interface ActiveSession {
  id: string;
  voucherCode: string;
  deviceName: string;
  macAddress: string;
  ipAddress: string;
  speedLimit: string;
  dataLimit: string;
  dataUsedMB: number;
  timeRemaining: string;
  connectedAt: string;
  signalStrength: 'excellent' | 'good' | 'fair' | 'poor';
}

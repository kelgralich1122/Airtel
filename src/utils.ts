import { Voucher } from './types';

// Generate a random high-readability voucher code (6 characters)
// Excludes confusing characters like O, 0, I, 1, l
export function generateVoucherCode(prefix = "ART"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${randomPart}`;
}

// Format currency in Tanzanian Shillings (TZS)
export function formatTZS(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('TZS', 'TZS ');
}

// Format duration to readable Swahili or English
export function formatDuration(hours: number, lang: 'sw' | 'en' = 'en'): string {
  if (hours === 1) {
    return lang === 'sw' ? 'Saa 1' : '1 Hour';
  }
  if (hours < 24) {
    return lang === 'sw' ? `Masaa ${hours}` : `${hours} Hours`;
  }
  const days = Math.round(hours / 24);
  if (days === 1) {
    return lang === 'sw' ? 'Siku 1' : '1 Day';
  }
  if (days < 30) {
    return lang === 'sw' ? `Siku ${days}` : `${days} Days`;
  }
  const months = Math.round(days / 30);
  return lang === 'sw' ? `Mwezi ${months}` : `${months} Month${months > 1 ? 's' : ''}`;
}

// Format bandwidth (speed) limit
export function formatSpeed(mbps: number, lang: 'sw' | 'en' = 'en'): string {
  if (mbps <= 0) {
    return lang === 'sw' ? 'Bila Kikomo' : 'Unlimited Speed';
  }
  return `${mbps} Mbps`;
}

// Format data limit
export function formatDataLimit(gb: number, lang: 'sw' | 'en' = 'en'): string {
  if (gb <= 0) {
    return lang === 'sw' ? 'Kifurushi Bila Kikomo' : 'Unlimited Data';
  }
  if (gb < 1) {
    return `${gb * 1024} MB`;
  }
  return `${gb} GB`;
}

// Calculate expiresAt based on activation time and duration
export function calculateExpiration(activationDateStr: string, durationHours: number): string {
  const date = new Date(activationDateStr);
  date.setHours(date.getHours() + durationHours);
  return date.toISOString();
}

// Estimate voucher price from duration & speed (smart defaulting)
export function estimatePrice(durationHours: number, speedMbps: number): number {
  let basePrice = 500;
  
  if (durationHours <= 1) {
    basePrice = 500;
  } else if (durationHours <= 3) {
    basePrice = 1000;
  } else if (durationHours <= 24) {
    basePrice = 2000;
  } else if (durationHours <= 168) {
    basePrice = 7000;
  } else {
    basePrice = 25000;
  }

  // Adjust for speed tier
  if (speedMbps > 0) {
    if (speedMbps <= 2) basePrice *= 0.8; // budget
    else if (speedMbps >= 10) basePrice *= 1.3; // premium speed
  }
  
  // Round to nearest 500 TZS
  return Math.max(500, Math.round(basePrice / 500) * 500);
}

// Tanzanian Phone validator
export function validateTanzanianPhone(phone: string): boolean {
  // Regex for Airtel, Vodacom, Halotel, Tigo numbers in TZ
  // +255..., 255..., 07..., 06...
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(?:\+255|255|0)[67]\d{8}$/.test(cleaned);
}

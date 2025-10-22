import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatPercentSigned(value: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    signDisplay: "always",
    maximumFractionDigits: 2,
    ...options,
  }).format(value / 100);
}

export function formatCurrencyTiny(value: number, threshold = 0.01) {
  if (value > 0 && value < threshold) {
    return `<$${threshold.toFixed(2)}`;
  }
  return formatCurrency(value);
}

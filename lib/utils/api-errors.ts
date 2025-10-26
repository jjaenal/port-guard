/**
 * API Error Handling Utilities
 * 
 * Provides structured error handling for API routes with user-friendly messages
 * and proper HTTP status codes.
 */

import { NextResponse } from "next/server";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  statusCode: number;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Common error types
export const ErrorCodes = {
  // Client errors (4xx)
  INVALID_ADDRESS: "INVALID_ADDRESS",
  MISSING_PARAMETER: "MISSING_PARAMETER",
  INVALID_PARAMETER: "INVALID_PARAMETER",
  RATE_LIMITED: "RATE_LIMITED",
  UNAUTHORIZED: "UNAUTHORIZED",
  
  // Server errors (5xx)
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  CACHE_ERROR: "CACHE_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  [ErrorCodes.INVALID_ADDRESS]: "Please provide a valid Ethereum address",
  [ErrorCodes.MISSING_PARAMETER]: "Required parameter is missing",
  [ErrorCodes.INVALID_PARAMETER]: "Invalid parameter value provided",
  [ErrorCodes.RATE_LIMITED]: "Too many requests. Please try again later",
  [ErrorCodes.UNAUTHORIZED]: "Authentication required",
  
  [ErrorCodes.EXTERNAL_API_ERROR]: "External service temporarily unavailable",
  [ErrorCodes.DATABASE_ERROR]: "Database connection error",
  [ErrorCodes.CACHE_ERROR]: "Cache service error",
  [ErrorCodes.NETWORK_ERROR]: "Network connection error",
  [ErrorCodes.INTERNAL_ERROR]: "Internal server error",
};

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: string,
  message?: string,
  statusCode?: number,
  details?: unknown
): NextResponse {
  const errorMessage = message || ERROR_MESSAGES[code] || "An error occurred";
  const status = statusCode || getStatusCodeForError(code);
  
  const errorResponse: ApiError = {
    code,
    message: errorMessage,
    statusCode: status,
  };
  
  if (details) {
    errorResponse.details = details;
  }

  return NextResponse.json({ error: errorResponse }, { status });
}

/**
 * Gets appropriate HTTP status code for error type
 */
function getStatusCodeForError(code: string): number {
  switch (code) {
    case ErrorCodes.INVALID_ADDRESS:
    case ErrorCodes.MISSING_PARAMETER:
    case ErrorCodes.INVALID_PARAMETER:
      return 400;
    case ErrorCodes.UNAUTHORIZED:
      return 401;
    case ErrorCodes.RATE_LIMITED:
      return 429;
    case ErrorCodes.EXTERNAL_API_ERROR:
      return 502;
    case ErrorCodes.DATABASE_ERROR:
    case ErrorCodes.CACHE_ERROR:
    case ErrorCodes.NETWORK_ERROR:
    case ErrorCodes.INTERNAL_ERROR:
    default:
      return 500;
  }
}

/**
 * Handles unknown errors and converts them to structured format
 */
export function handleUnknownError(error: unknown): NextResponse {
  console.error("Unhandled error:", error);
  
  if (error instanceof AppError) {
    return createErrorResponse(error.code, error.message, error.statusCode, error.details);
  }
  
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes("fetch")) {
      return createErrorResponse(ErrorCodes.NETWORK_ERROR, "Network request failed");
    }
    
    if (error.message.includes("timeout")) {
      return createErrorResponse(ErrorCodes.EXTERNAL_API_ERROR, "Request timeout");
    }
    
    if (error.message.includes("rate limit")) {
      return createErrorResponse(ErrorCodes.RATE_LIMITED);
    }
    
    // Generic error with original message
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, error.message);
  }
  
  // Completely unknown error
  return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "An unexpected error occurred");
}

/**
 * Validates Ethereum address format
 */
export function validateEthereumAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  
  // Basic hex format check (0x + 40 hex characters)
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
}

/**
 * Validates and sanitizes chain parameter
 */
export function validateChains(chainsParam: string): string[] {
  const supportedChains = ["ethereum", "polygon"];
  const chains = chainsParam
    .toLowerCase()
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
    
  const validChains = chains.filter(chain => supportedChains.includes(chain));
  
  if (validChains.length === 0) {
    throw new AppError(
      ErrorCodes.INVALID_PARAMETER,
      `Unsupported chains. Supported: ${supportedChains.join(", ")}`,
      400
    );
  }
  
  return validChains;
}

/**
 * Validates numeric parameters with bounds
 */
export function validateNumericParam(
  value: string | null,
  paramName: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  defaultValue?: number
): number {
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new AppError(ErrorCodes.MISSING_PARAMETER, `${paramName} is required`);
  }
  
  const num = Number(value);
  
  if (isNaN(num)) {
    throw new AppError(ErrorCodes.INVALID_PARAMETER, `${paramName} must be a number`);
  }
  
  if (num < min || num > max) {
    throw new AppError(
      ErrorCodes.INVALID_PARAMETER,
      `${paramName} must be between ${min} and ${max}`
    );
  }
  
  return num;
}
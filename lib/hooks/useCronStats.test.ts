import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCronStats } from "./useCronStats";
import React, { type ReactNode } from "react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test wrapper dengan QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
};

describe("useCronStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("should fetch cron stats successfully", async () => {
    const mockData = {
      lastRunAt: "2024-01-15T10:30:00.000Z",
      alertsEvaluated: 150,
      alertsTriggered: 12,
      totalRuns: 5,
      averageDurationMs: 500,
      lastDurationMs: 450,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useCronStats(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    // Data di hook di-inisialisasi sebagai null; pada JSON yang malformed
    // kita tetap mempertahankan nilai null dan set error
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith("/api/cron/stats");
  });

  it("should handle API errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal Server Error" }),
    });

    const { result } = renderHook(() => useCronStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Hook mengembalikan data null pada error jaringan
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useCronStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Pada error rate limit, data tetap null dan error diset
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it("should handle rate limit errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: "Too Many Requests" }),
    });

    const { result } = renderHook(() => useCronStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Untuk JSON malformed, data tetap null
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it("should provide refetch function", async () => {
    const mockData = {
      lastRunAt: "2024-01-15T10:30:00.000Z",
      alertsEvaluated: 100,
      alertsTriggered: 5,
      totalRuns: 3,
      averageDurationMs: 400,
      lastDurationMs: 350,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useCronStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(typeof result.current.refetch).toBe("function");

    // Test refetch
    const updatedData = { ...mockData, alertsEvaluated: 200 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(updatedData),
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.data).toEqual(updatedData);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should handle empty response data", async () => {
    const emptyData = {
      lastRunAt: null,
      alertsEvaluated: 0,
      alertsTriggered: 0,
      totalRuns: 0,
      averageDurationMs: 0,
      lastDurationMs: null,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(emptyData),
    });

    const { result } = renderHook(() => useCronStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(emptyData);
    expect(result.current.error).toBeNull();
  });

  it("should handle malformed JSON response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    const { result } = renderHook(() => useCronStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
  });
});

import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks between tests
beforeEach(() => {
  vi.resetAllMocks();
});
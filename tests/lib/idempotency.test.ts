import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateIdempotencyKey,
  getOrCreateIdempotencyKey,
  clearIdempotencyKey,
  rotateIdempotencyKey,
} from '@/lib/idempotency';
import { IDEMPOTENCY_KEY_STORAGE } from '@/lib/constants';

// ─── Mock sessionStorage ────────────────────────────────────

const store: Record<string, string> = {};
const mockSessionStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
};

describe('idempotency', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    vi.stubGlobal('sessionStorage', mockSessionStorage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Key generation ──────────────────────────────────────

  it('generates a valid UUID v4', () => {
    const key = generateIdempotencyKey();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(key).toMatch(uuidRegex);
  });

  it('generates unique keys each time', () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateIdempotencyKey()));
    expect(keys.size).toBe(100);
  });

  // ── getOrCreateIdempotencyKey ───────────────────────────

  it('creates and stores a new key if none exists', () => {
    const key = getOrCreateIdempotencyKey();
    expect(key).toBeTruthy();
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(IDEMPOTENCY_KEY_STORAGE, key);
  });

  it('returns existing key if already stored', () => {
    store[IDEMPOTENCY_KEY_STORAGE] = 'existing-key-123';
    const key = getOrCreateIdempotencyKey();
    expect(key).toBe('existing-key-123');
  });

  // ── clearIdempotencyKey ─────────────────────────────────

  it('removes key from storage', () => {
    store[IDEMPOTENCY_KEY_STORAGE] = 'to-clear';
    clearIdempotencyKey();
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(IDEMPOTENCY_KEY_STORAGE);
  });

  // ── rotateIdempotencyKey ────────────────────────────────

  it('clears old key and generates new one', () => {
    store[IDEMPOTENCY_KEY_STORAGE] = 'old-key';
    const newKey = rotateIdempotencyKey();
    expect(newKey).not.toBe('old-key');
    expect(newKey).toBeTruthy();
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(IDEMPOTENCY_KEY_STORAGE);
  });

  // ── Edge: sessionStorage unavailable ────────────────────

  it('works without sessionStorage (generates ephemeral key)', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('Disabled'); },
      setItem: () => { throw new Error('Disabled'); },
      removeItem: () => { throw new Error('Disabled'); },
    });

    const key = getOrCreateIdempotencyKey();
    expect(key).toBeTruthy();
    // Should not throw
  });
});

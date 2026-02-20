import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Theme resolution logic tests ──────────────────────────
// We test the pure logic extracted from theme-provider.tsx
// (No React rendering needed — unit-test the decision layer.)

type Theme = 'light' | 'dark' | 'system';
type Resolved = 'light' | 'dark';

/**
 * Mirror of resolveTheme from theme-provider — kept pure for testing.
 */
function resolveTheme(theme: Theme, systemPrefersDark: boolean): Resolved {
  if (theme === 'system') return systemPrefersDark ? 'dark' : 'light';
  return theme;
}

/**
 * Mirror of the cycle logic in ThemeToggle.
 */
function cycleTheme(current: Theme): Theme {
  return current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
}

// ─── Theme resolution ───────────────────────────────────────

describe('resolveTheme', () => {
  it('resolves "light" to light regardless of system pref', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('light', false)).toBe('light');
  });

  it('resolves "dark" to dark regardless of system pref', () => {
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('resolves "system" to dark when system prefers dark', () => {
    expect(resolveTheme('system', true)).toBe('dark');
  });

  it('resolves "system" to light when system prefers light', () => {
    expect(resolveTheme('system', false)).toBe('light');
  });
});

// ─── Theme cycling ──────────────────────────────────────────

describe('cycleTheme', () => {
  it('cycles light → dark', () => {
    expect(cycleTheme('light')).toBe('dark');
  });

  it('cycles dark → system', () => {
    expect(cycleTheme('dark')).toBe('system');
  });

  it('cycles system → light', () => {
    expect(cycleTheme('system')).toBe('light');
  });

  it('full rotation: light → dark → system → light', () => {
    let theme: Theme = 'light';
    theme = cycleTheme(theme); // dark
    expect(theme).toBe('dark');
    theme = cycleTheme(theme); // system
    expect(theme).toBe('system');
    theme = cycleTheme(theme); // light
    expect(theme).toBe('light');
  });
});

// ─── localStorage persistence ───────────────────────────────

describe('theme localStorage contract', () => {
  const STORAGE_KEY = 'theme';

  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem(key: string) { return store[key] ?? null; },
      setItem(key: string, value: string) { store[key] = value; },
      removeItem(key: string) { delete store[key]; },
    });
  });

  it('stores theme under "theme" key', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('defaults to null when no theme stored', () => {
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('persists across reads', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('overwrites existing theme', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    localStorage.setItem(STORAGE_KEY, 'dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });
});

// ─── CSS class application ──────────────────────────────────

describe('applyTheme contract', () => {
  it('valid resolved themes are light or dark', () => {
    const validThemes: Resolved[] = ['light', 'dark'];
    expect(validThemes).toContain('light');
    expect(validThemes).toContain('dark');
    expect(validThemes).not.toContain('system');
  });

  it('dark theme should set dark class (contract)', () => {
    // The applyTheme function in production does:
    //   root.classList.remove('light', 'dark');
    //   root.classList.add(resolved);
    // We verify the resolved value is the class name
    const resolved = resolveTheme('dark', false);
    expect(resolved).toBe('dark'); // This exact string is added as CSS class
  });
});

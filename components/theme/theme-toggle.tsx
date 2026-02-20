'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './theme-provider';

/**
 * Compact theme toggle button that cycles: light → dark → system.
 * Designed to sit in the header navbar.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const label = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';

  return (
    <button
      onClick={cycle}
      className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={`Theme: ${label}. Click to change.`}
      title={label}
    >
      <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
    </button>
  );
}

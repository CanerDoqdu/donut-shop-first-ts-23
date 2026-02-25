/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthToast } from '@/components/ui/registration-toast';

function setAuthToastCookie(value: string) {
  document.cookie = `auth-toast=${encodeURIComponent(value)}; path=/;`;
}

describe('AuthToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.cookie = 'auth-toast=; path=/; max-age=0';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders when auth-toast cookie is present', () => {
    setAuthToastCookie('confirmed');
    render(<AuthToast />);

    expect(screen.getByText('Welcome to Glazed & Sipped!')).toBeInTheDocument();
  });

  it('dismisses on click', () => {
    setAuthToastCookie('needs-confirmation');
    render(<AuthToast />);

    fireEvent.click(screen.getByLabelText('Dismiss'));
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByText('Account created successfully!')).toBeNull();
  });

  it('auto-dismisses after timeout', () => {
    setAuthToastCookie('confirmed');
    render(<AuthToast />);

    act(() => {
      vi.advanceTimersByTime(8500);
    });

    expect(screen.queryByText('Welcome to Glazed & Sipped!')).toBeNull();
  });
});

/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const { createElement } = await import('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tag = (el: string) => ({ children, ...rest }: Record<string, any>) =>
    createElement(el, rest, children);
  return {
    motion: { div: tag('div'), p: tag('p'), span: tag('span') },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => createElement(React.Fragment, {}, children),
  };
});

vi.mock('lucide-react', () => ({
  Gift: () => null,
  CreditCard: () => null,
}));

import GiftCardPurchase from '@/components/giftcards/GiftCardPurchase';

const noopPurchase = vi.fn().mockResolvedValue(undefined);

describe('GiftCardPurchase', () => {
  it('renders the amount selection step in English', () => {
    render(<GiftCardPurchase locale="en" onPurchase={noopPurchase} />);
    expect(screen.getByText('Gift Card')).toBeInTheDocument();
    expect(screen.getByText('Select Amount')).toBeInTheDocument();
  });

  it('renders preset amount buttons', () => {
    render(<GiftCardPurchase locale="en" onPurchase={noopPurchase} />);
    // Preset amounts: 50, 100, 200, 500
    expect(screen.getByText('₺50')).toBeInTheDocument();
    expect(screen.getByText('₺100')).toBeInTheDocument();
    expect(screen.getByText('₺500')).toBeInTheDocument();
  });

  it('renders subtitle in Turkish locale', () => {
    render(<GiftCardPurchase locale="tr" onPurchase={noopPurchase} />);
    expect(screen.getByText('Hediye Kartı')).toBeInTheDocument();
    expect(screen.getByText('Tutar Seçin')).toBeInTheDocument();
  });
});

/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => `promo.${key}`,
}));

vi.mock('@/components/ui/glaze-drip', () => ({
  GlazeDrip: () => React.createElement('div', { 'data-testid': 'glaze-drip' }),
}));

import { PromoBanner } from '@/components/layout/promo-banner';

describe('PromoBanner', () => {
  it('renders all five promo items on desktop', () => {
    const { container } = render(<PromoBanner />);
    // Promo text is rendered inside a marquee string; verify each token exists.
    const text = container.textContent ?? '';
    const promoKeys = ['freeDelivery', 'newFlavors', 'firstOrder', 'fastDelivery', 'newDonut'];
    for (const key of promoKeys) {
      expect(text).toContain(`promo.${key}`);
    }
  });

  it('renders the marquee ticker for mobile', () => {
    render(<PromoBanner />);
    // The marquee container should be present (md:hidden div)
    const { container } = render(<PromoBanner />);
    // Check that animated div exists
    const animated = container.querySelector('[style*="promoBannerMarquee"]');
    expect(animated).toBeTruthy();
  });

  it('renders glaze drip background element', () => {
    render(<PromoBanner />);
    expect(screen.getAllByTestId('glaze-drip').length).toBeGreaterThan(0);
  });
});

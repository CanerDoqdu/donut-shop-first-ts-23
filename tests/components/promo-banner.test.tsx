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
    render(<PromoBanner />);
    // Each PROMO_KEY is rendered via useTranslations
    const promoKeys = ['freeDelivery', 'newFlavors', 'firstOrder', 'fastDelivery', 'newDonut'];
    for (const key of promoKeys) {
      expect(screen.getAllByText(`promo.${key}`).length).toBeGreaterThan(0);
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

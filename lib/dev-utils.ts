/**
 * Development utilities for testing and debugging
 * Use these in browser console: `window.__dev.clearAllCaches()`
 */

export const devUtils = {
  /**
   * Clear all persistent caches (cart, auth, etc.)
   * Usage: devUtils.clearAllCaches() or paste in browser console
   */
  clearAllCaches: () => {
    if (typeof window === 'undefined') return;
    
    console.log('🧹 Clearing all caches...');
    
    // Clear cart
    localStorage.removeItem('donut-cart-storage');
    console.log('✓ Cleared cart cache');
    
    // Clear checkout machine
    sessionStorage.removeItem('donut-checkout-machine');
    console.log('✓ Cleared checkout state');
    
    // Clear auth tokens (Supabase stores in localStorage by default)
    const keys = Object.keys(localStorage).filter(k => k.includes('sb-') || k.includes('auth'));
    keys.forEach(k => localStorage.removeItem(k));
    console.log(`✓ Cleared ${keys.length} auth tokens`);
    
    // Clear all session storage
    sessionStorage.clear();
    console.log('✓ Cleared all session storage');
    
    console.log('✨ All caches cleared! Refresh the page for a fresh start.');
  },

  /**
   * Clear only cart cache
   */
  clearCartCache: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('donut-cart-storage');
    console.log('✓ Cart cache cleared');
  },

  /**
   * Clear only auth cache
   */
  clearAuthCache: () => {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(localStorage).filter(k => k.includes('sb-') || k.includes('auth'));
    keys.forEach(k => localStorage.removeItem(k));
    console.log(`✓ Cleared ${keys.length} auth tokens`);
  },

  /**
   * Show all cached data
   */
  showCaches: () => {
    if (typeof window === 'undefined') return;
    console.log('📦 Stored Data:');
    console.log('- Cart:', localStorage.getItem('donut-cart-storage'));
    console.log('- Checkout:', sessionStorage.getItem('donut-checkout-machine'));
    console.log('- All localStorage keys:', Object.keys(localStorage));
    console.log('- All sessionStorage keys:', Object.keys(sessionStorage));
  }
};

// Make available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as Window & { __dev?: typeof devUtils }).__dev = devUtils;
  console.log('%c[DEV] Use window.__dev.clearAllCaches() to clear everything', 'color: #00aa00; font-weight: bold;');
}

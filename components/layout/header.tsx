'use client';

import Image from 'next/image';
import { ShoppingCart, Menu, X, Crown, Gift, Package, Users, ChevronDown, User, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useState, useEffect, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart-store';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/auth/actions';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

interface LoyaltyInfo {
  total_points: number;
  tier: string;
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const t = useTranslations();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const supabase = createClient();

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
    });
    
    // Fetch initial auth state
    async function getAuthState() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      if (currentUser) {
        const [profileRes, loyaltyRes] = await Promise.all([
          supabase.from('profiles').select('full_name, avatar_url').eq('id', currentUser.id).single(),
          supabase.from('loyalty_points').select('total_points, tier').eq('user_id', currentUser.id).single(),
        ]);
        
        if (profileRes.data) setProfile(profileRes.data);
        if (loyaltyRes.data) setLoyalty(loyaltyRes.data);
      }
      setAuthLoading(false);
    }
    
    getAuthState();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const [profileRes, loyaltyRes] = await Promise.all([
          supabase.from('profiles').select('full_name, avatar_url').eq('id', session.user.id).single(),
          supabase.from('loyalty_points').select('total_points, tier').eq('user_id', session.user.id).single(),
        ]);
        
        if (profileRes.data) setProfile(profileRes.data);
        if (loyaltyRes.data) setLoyalty(loyaltyRes.data);
      } else {
        setProfile(null);
        setLoyalty(null);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [supabase]);

  const navLinks: Array<{ href: '/' | '/products' | '/stores'; label: string }> = [
    { href: '/', label: t('nav.home') },
    { href: '/products', label: t('nav.products') },
    { href: '/stores', label: t('nav.stores') },
  ];

  const moreLinks: Array<{ href: '/loyalty' | '/gift-cards' | '/subscriptions' | '/referrals'; label: string; icon: typeof Crown; color: string }> = [
    { href: '/loyalty', label: t('nav.loyalty'), icon: Crown, color: 'text-amber-500' },
    { href: '/gift-cards', label: t('nav.giftCards'), icon: Gift, color: 'text-pink-500' },
    { href: '/subscriptions', label: t('nav.subscriptions'), icon: Package, color: 'text-purple-500' },
    { href: '/referrals', label: t('nav.referrals'), icon: Users, color: 'text-blue-500' },
  ];

  return (
    <header className="sticky top-0 z-100 w-full border-b bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/logo.png"
            alt="Glazed & Sipped"
            width={48}
            height={48}
            className="rounded-full shadow-md object-cover"
          />
          <span className="font-fredoka text-2xl font-bold bg-gradient-donut bg-clip-text text-transparent">
            Glazed & Sipped
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-700 transition-colors hover:text-[#FF6BBF]"
              onClick={() => {
                if (link.href === '/') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              {link.label}
            </Link>
          ))}
          
          {/* More Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-1 text-sm font-medium text-gray-700 transition-colors hover:text-[#FF6BBF]"
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              onBlur={() => setTimeout(() => setMoreMenuOpen(false), 150)}
            >
              More
              <ChevronDown className={`w-4 h-4 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {moreMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                {moreLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setMoreMenuOpen(false)}
                    >
                      <Icon className={`w-4 h-4 ${link.color}`} />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          
          <Link href="/cart" className="relative inline-flex items-center justify-center h-11 w-11 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
              <ShoppingCart className="h-5 w-5" />
              {mounted && totalItems > 0 && (
                <Badge className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                  {totalItems}
                </Badge>
              )}
          </Link>

          {/* Language Switcher */}
          <div className="flex gap-1">
            <Link href="/" locale="tr">
              <Button variant="ghost" size="sm" className="min-h-11 min-w-11">TR</Button>
            </Link>
            <Link href="/" locale="en">
              <Button variant="ghost" size="sm" className="min-h-11 min-w-11">EN</Button>
            </Link>
          </div>

          {/* Auth Section */}
          {mounted && !authLoading && (
            user ? (
              <div className="relative">
                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
                >
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="Avatar"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-amber-600" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 max-w-25 truncate">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </span>
                  {loyalty && (
                    <div className="flex items-center gap-1">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-600">{loyalty.total_points}</span>
                    </div>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-medium text-gray-800 truncate">{profile?.full_name || user.email}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/account"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      {t('nav.account')}
                    </Link>
                    <Link
                      href="/loyalty"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Crown className="w-4 h-4 text-amber-500" />
                      {t('nav.loyalty')}
                      {loyalty && (
                        <span className="ml-auto text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                          {loyalty.total_points} pts
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/orders"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Package className="w-4 h-4 text-blue-500" />
                      {t('nav.orders')}
                    </Link>
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('nav.logout')}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600">
                    <UserPlus className="w-4 h-4" />
                    {t('nav.register')}
                  </Button>
                </Link>
              </div>
            )
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-3 -m-3"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white px-4 py-6">
          <nav className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-700 transition-colors hover:text-[#FF6BBF]"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (link.href === '/') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Feature Links */}
            <div className="border-t pt-4 space-y-3">
              {moreLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 text-sm font-medium text-gray-700 transition-colors hover:text-[#FF6BBF]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className={`w-4 h-4 ${link.color}`} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
            
            {/* Cart Link */}
            <Link
              href="/cart"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-[#FF6BBF] border-t pt-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              <ShoppingCart className="h-4 w-4" />
              {t('nav.cart')}
              {mounted && totalItems > 0 && (
                <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {totalItems}
                </Badge>
              )}
            </Link>
            
            {/* Language Switcher */}
            <div className="flex gap-2 pt-2 border-t">
              <Link href="/" locale="tr" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm">TR</Button>
              </Link>
              <Link href="/" locale="en" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm">EN</Button>
              </Link>
            </div>

            {/* Auth Section Mobile */}
            {mounted && !authLoading && (
              <div className="pt-4 border-t">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                      {profile?.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt="Avatar"
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-amber-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{profile?.full_name || 'User'}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      {loyalty && (
                        <div className="ml-auto flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-full">
                          <Crown className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium text-amber-600">{loyalty.total_points}</span>
                        </div>
                      )}
                    </div>
                    <Link
                      href="/account"
                      className="flex items-center gap-3 text-sm font-medium text-gray-700 transition-colors hover:text-[#FF6BBF] py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      {t('nav.account')}
                    </Link>
                    <Link
                      href="/orders"
                      className="flex items-center gap-3 text-sm font-medium text-gray-700 transition-colors hover:text-[#FF6BBF] py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Package className="w-4 h-4 text-blue-500" />
                      {t('nav.orders')}
                    </Link>
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="flex items-center gap-3 text-sm font-medium text-red-600 pt-3 mt-2 border-t"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('nav.logout')}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full flex items-center gap-2">
                        <LogIn className="w-4 h-4" />
                        {t('nav.login')}
                      </Button>
                    </Link>
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full flex items-center gap-2 bg-amber-500 hover:bg-amber-600">
                        <UserPlus className="w-4 h-4" />
                        {t('nav.register')}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

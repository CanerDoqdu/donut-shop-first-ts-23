'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { Bell, Package, Gift, Crown, Star, Users, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/lib/supabase/database.types';

interface NotificationsCenterProps {
  userId: string;
  locale: 'tr' | 'en';
}

const iconMap = {
  order_update: ShoppingBag,
  promotion: Gift,
  loyalty: Crown,
  subscription: Package,
  review_request: Star,
  referral: Users,
};

const colorMap = {
  order_update: 'bg-blue-100 text-blue-600',
  promotion: 'bg-pink-100 text-pink-600',
  loyalty: 'bg-amber-100 text-amber-600',
  subscription: 'bg-purple-100 text-purple-600',
  review_request: 'bg-yellow-100 text-yellow-600',
  referral: 'bg-green-100 text-green-600',
};

export default function NotificationsCenter({ userId, locale }: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();

  const t = {
    tr: {
      notifications: 'Bildirimler',
      noNotifications: 'Bildirim yok',
      markAllRead: 'Tümünü okundu işaretle',
      justNow: 'Az önce',
      minutesAgo: 'dakika önce',
      hoursAgo: 'saat önce',
      daysAgo: 'gün önce',
    },
    en: {
      notifications: 'Notifications',
      noNotifications: 'No notifications',
      markAllRead: 'Mark all as read',
      justNow: 'Just now',
      minutesAgo: 'minutes ago',
      hoursAgo: 'hours ago',
      daysAgo: 'days ago',
    },
  }[locale];

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    startTransition(() => {
      void fetchNotifications();
    });
    
    // Subscribe to realtime notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, supabase, userId]);

  async function markAsRead(notificationId: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
  }

  async function markAllAsRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  function getTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t.justNow;
    if (minutes < 60) return `${minutes} ${t.minutesAgo}`;
    if (hours < 24) return `${hours} ${t.hoursAgo}`;
    return `${days} ${t.daysAgo}`;
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed inset-x-4 top-20 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-[80vh] sm:max-h-125"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">{t.notifications}</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                  >
                    {t.markAllRead}
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>{t.noNotifications}</p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const Icon = iconMap[notification.type as keyof typeof iconMap] || Bell;
                    const colorClass = colorMap[notification.type as keyof typeof colorMap] || 'bg-gray-100 text-gray-600';

                    return (
                      <div
                        key={notification.id}
                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                        className={`flex gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-b-0 ${
                          !notification.is_read ? 'bg-amber-50/50' : ''
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm">{notification.title}</p>
                          <p className="text-gray-500 text-sm mt-0.5 line-clamp-2">{notification.message}</p>
                          <p className="text-gray-400 text-xs mt-1">{getTimeAgo(notification.created_at)}</p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-amber-500 rounded-full shrink-0 mt-2" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

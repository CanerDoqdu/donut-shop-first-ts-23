'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { REALTIME_TIMEOUT_MS } from '@/lib/constants';

type OrderStatus = 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered';

interface OrderUpdate {
  id: string;
  status: OrderStatus;
  updated_at: string;
}

/** Backoff config — MAX_BACKOFF_MS mirrors REALTIME_TIMEOUT_MS (30 s) */
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = REALTIME_TIMEOUT_MS; // 30 s
const BACKOFF_FACTOR = 2;

/**
 * Subscribe to real-time order status changes via Supabase Realtime.
 *
 * Features:
 * - Exponential reconnect backoff (1 s → 2 s → 4 s → … → 30 s cap)
 * - Automatic re-subscribe on channel error / timeout
 * - Cleans up on unmount or when orderId changes
 */
export function useOrderRealtime(orderId: string, initialStatus: OrderStatus) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    let mounted = true;
    let backoff = INITIAL_BACKOFF_MS;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let currentChannel: RealtimeChannel | null = null;

    function subscribe() {
      if (!mounted) return;

      const supabase = createClient();

      // Clean up any previous channel
      if (currentChannel) {
        supabase.removeChannel(currentChannel);
        currentChannel = null;
      }

      const channel = supabase
        .channel(`order-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            const update = payload.new as unknown as OrderUpdate;
            setStatus(update.status);
            setLastUpdate(update.updated_at);
            setIsLive(true);
          },
        )
        .subscribe((subscriptionStatus: string) => {
          if (subscriptionStatus === 'SUBSCRIBED') {
            // Reset backoff on successful connection
            backoff = INITIAL_BACKOFF_MS;
            setIsLive(true);
          } else if (
            subscriptionStatus === 'CHANNEL_ERROR' ||
            subscriptionStatus === 'TIMED_OUT'
          ) {
            setIsLive(false);
            // Schedule reconnect with backoff
            if (mounted) {
              const delay = backoff;
              backoff = Math.min(backoff * BACKOFF_FACTOR, MAX_BACKOFF_MS);
              timer = setTimeout(() => {
                subscribe();
              }, delay);
            }
          }
        });

      currentChannel = channel;
    }

    subscribe();

    return () => {
      mounted = false;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (currentChannel) {
        const supabase = createClient();
        supabase.removeChannel(currentChannel);
        currentChannel = null;
      }
    };
  }, [orderId]);

  return { status, lastUpdate, isLive };
}

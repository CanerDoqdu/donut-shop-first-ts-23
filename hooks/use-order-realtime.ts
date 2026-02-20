'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type OrderStatus = 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered';

interface OrderUpdate {
  id: string;
  status: OrderStatus;
  updated_at: string;
}

/**
 * Subscribe to real-time order status changes via Supabase Realtime.
 *
 * Returns the latest status and a flag indicating if a live update was received.
 * Cleans up the subscription on unmount.
 */
export function useOrderRealtime(orderId: string, initialStatus: OrderStatus) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const supabase = createClient();

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
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { status, lastUpdate, isLive };
}

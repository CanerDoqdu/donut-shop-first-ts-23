export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          slug: string
          name_tr: string
          name_en: string
          description_tr: string
          description_en: string
          price: number
          image_url: string
          category: 'glazed' | 'filled' | 'specialty' | 'seasonal' | 'beverage'
          stock: number
          featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name_tr: string
          name_en: string
          description_tr: string
          description_en: string
          price: number
          image_url: string
          category: 'glazed' | 'filled' | 'specialty' | 'seasonal' | 'beverage'
          stock?: number
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name_tr?: string
          name_en?: string
          description_tr?: string
          description_en?: string
          price?: number
          image_url?: string
          category?: 'glazed' | 'filled' | 'specialty' | 'seasonal' | 'beverage'
          stock?: number
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          user_email: string
          user_name: string
          user_phone: string
          user_address: string
          status: 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
          subtotal: number
          tax: number
          total: number
          stripe_session_id: string | null
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_email: string
          user_name: string
          user_phone: string
          user_address: string
          status?: 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
          subtotal: number
          tax: number
          total: number
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          user_email?: string
          user_name?: string
          user_phone?: string
          user_address?: string
          status?: 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
          subtotal?: number
          tax?: number
          total?: number
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_image: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_image: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_image?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          address: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // ==================== STORES ====================
      stores: {
        Row: {
          id: string
          name: string
          slug: string
          address: string
          city: string
          district: string
          phone: string
          email: string | null
          latitude: number
          longitude: number
          opening_hours: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          address: string
          city: string
          district: string
          phone: string
          email?: string | null
          latitude: number
          longitude: number
          opening_hours?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          address?: string
          city?: string
          district?: string
          phone?: string
          email?: string | null
          latitude?: number
          longitude?: number
          opening_hours?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      store_inventory: {
        Row: {
          id: string
          store_id: string
          product_id: string
          stock: number
          low_stock_threshold: number
          is_available: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          stock?: number
          low_stock_threshold?: number
          is_available?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          product_id?: string
          stock?: number
          low_stock_threshold?: number
          is_available?: boolean
          updated_at?: string
        }
      }
      // ==================== LOYALTY ====================
      loyalty_points: {
        Row: {
          id: string
          user_id: string
          total_points: number
          lifetime_points: number
          tier: 'bronze' | 'silver' | 'gold' | 'platinum'
          tier_updated_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_points?: number
          lifetime_points?: number
          tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
          tier_updated_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_points?: number
          lifetime_points?: number
          tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
          tier_updated_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      points_transactions: {
        Row: {
          id: string
          user_id: string
          type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'referral'
          points: number
          description: string
          order_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'referral'
          points: number
          description: string
          order_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'referral'
          points?: number
          description?: string
          order_id?: string | null
          created_at?: string
        }
      }
      // ==================== GIFT CARDS ====================
      gift_cards: {
        Row: {
          id: string
          code: string
          initial_balance: number
          current_balance: number
          currency: string
          sender_email: string | null
          sender_name: string | null
          recipient_email: string | null
          recipient_name: string | null
          message: string | null
          is_active: boolean
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          initial_balance: number
          current_balance: number
          currency?: string
          sender_email?: string | null
          sender_name?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          message?: string | null
          is_active?: boolean
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          initial_balance?: number
          current_balance?: number
          currency?: string
          sender_email?: string | null
          sender_name?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          message?: string | null
          is_active?: boolean
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      gift_card_transactions: {
        Row: {
          id: string
          gift_card_id: string
          order_id: string | null
          type: 'purchase' | 'redemption' | 'refund'
          amount: number
          balance_after: number
          created_at: string
        }
        Insert: {
          id?: string
          gift_card_id: string
          order_id?: string | null
          type: 'purchase' | 'redemption' | 'refund'
          amount: number
          balance_after: number
          created_at?: string
        }
        Update: {
          id?: string
          gift_card_id?: string
          order_id?: string | null
          type?: 'purchase' | 'redemption' | 'refund'
          amount?: number
          balance_after?: number
          created_at?: string
        }
      }
      // ==================== SUBSCRIPTIONS ====================
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_type: 'weekly' | 'biweekly' | 'monthly'
          product_selections: Json
          quantity: number
          delivery_day: number
          delivery_address: string
          delivery_notes: string | null
          status: 'active' | 'paused' | 'cancelled'
          next_delivery_date: string
          stripe_subscription_id: string | null
          price_per_delivery: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_type: 'weekly' | 'biweekly' | 'monthly'
          product_selections: Json
          quantity: number
          delivery_day?: number
          delivery_address: string
          delivery_notes?: string | null
          status?: 'active' | 'paused' | 'cancelled'
          next_delivery_date: string
          stripe_subscription_id?: string | null
          price_per_delivery: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_type?: 'weekly' | 'biweekly' | 'monthly'
          product_selections?: Json
          quantity?: number
          delivery_day?: number
          delivery_address?: string
          delivery_notes?: string | null
          status?: 'active' | 'paused' | 'cancelled'
          next_delivery_date?: string
          stripe_subscription_id?: string | null
          price_per_delivery?: number
          created_at?: string
          updated_at?: string
        }
      }
      subscription_deliveries: {
        Row: {
          id: string
          subscription_id: string
          order_id: string | null
          scheduled_date: string
          status: 'scheduled' | 'preparing' | 'delivered' | 'skipped'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          order_id?: string | null
          scheduled_date: string
          status?: 'scheduled' | 'preparing' | 'delivered' | 'skipped'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          order_id?: string | null
          scheduled_date?: string
          status?: 'scheduled' | 'preparing' | 'delivered' | 'skipped'
          created_at?: string
          updated_at?: string
        }
      }
      // ==================== REVIEWS ====================
      reviews: {
        Row: {
          id: string
          product_id: string
          user_id: string
          order_id: string | null
          rating: number
          title: string | null
          comment: string | null
          images: string[] | null
          is_verified_purchase: boolean
          is_approved: boolean
          helpful_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          order_id?: string | null
          rating: number
          title?: string | null
          comment?: string | null
          images?: string[] | null
          is_verified_purchase?: boolean
          is_approved?: boolean
          helpful_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          order_id?: string | null
          rating?: number
          title?: string | null
          comment?: string | null
          images?: string[] | null
          is_verified_purchase?: boolean
          is_approved?: boolean
          helpful_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      review_helpful_votes: {
        Row: {
          id: string
          review_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          review_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          user_id?: string
          created_at?: string
        }
      }
      // ==================== REFERRALS ====================
      referral_codes: {
        Row: {
          id: string
          user_id: string
          code: string
          uses_count: number
          max_uses: number | null
          reward_points: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          code: string
          uses_count?: number
          max_uses?: number | null
          reward_points?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          code?: string
          uses_count?: number
          max_uses?: number | null
          reward_points?: number
          is_active?: boolean
          created_at?: string
        }
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          referral_code_id: string
          status: 'pending' | 'completed' | 'expired'
          reward_given: boolean
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id: string
          referral_code_id: string
          status?: 'pending' | 'completed' | 'expired'
          reward_given?: boolean
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_id?: string
          referral_code_id?: string
          status?: 'pending' | 'completed' | 'expired'
          reward_given?: boolean
          created_at?: string
          completed_at?: string | null
        }
      }
      // ==================== NOTIFICATIONS ====================
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'order_update' | 'promotion' | 'loyalty' | 'subscription' | 'review_request' | 'referral'
          title: string
          message: string
          data: Json | null
          is_read: boolean
          email_sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'order_update' | 'promotion' | 'loyalty' | 'subscription' | 'review_request' | 'referral'
          title: string
          message: string
          data?: Json | null
          is_read?: boolean
          email_sent?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'order_update' | 'promotion' | 'loyalty' | 'subscription' | 'review_request' | 'referral'
          title?: string
          message?: string
          data?: Json | null
          is_read?: boolean
          email_sent?: boolean
          created_at?: string
        }
      }
      // ==================== ADMIN ====================
      admin_users: {
        Row: {
          id: string
          user_id: string
          role: 'super_admin' | 'admin' | 'manager' | 'staff'
          permissions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: 'super_admin' | 'admin' | 'manager' | 'staff'
          permissions?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'super_admin' | 'admin' | 'manager' | 'staff'
          permissions?: Json
          created_at?: string
          updated_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          event_type: string
          user_id: string | null
          session_id: string | null
          page_url: string | null
          data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          user_id?: string | null
          session_id?: string | null
          page_url?: string | null
          data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          user_id?: string | null
          session_id?: string | null
          page_url?: string | null
          data?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_loyalty_tier: {
        Args: { lifetime_pts: number }
        Returns: string
      }
      update_product_rating: {
        Args: { p_product_id: string }
        Returns: void
      }
      award_order_points: {
        Args: { p_order_id: string; p_user_id: string; p_total: number }
        Returns: void
      }
      generate_referral_code: {
        Args: { p_user_id: string }
        Returns: string
      }
    }
    Enums: {
      loyalty_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
      transaction_type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'referral'
      subscription_plan: 'weekly' | 'biweekly' | 'monthly'
      admin_role: 'super_admin' | 'admin' | 'manager' | 'staff'
    }
  }
}

// Extended type helpers
export type Store = Tables<'stores'>
export type StoreInventory = Tables<'store_inventory'>
export type LoyaltyPoints = Tables<'loyalty_points'>
export type PointsTransaction = Tables<'points_transactions'>
export type GiftCard = Tables<'gift_cards'>
export type GiftCardTransaction = Tables<'gift_card_transactions'>
export type Subscription = Tables<'subscriptions'>
export type SubscriptionDelivery = Tables<'subscription_deliveries'>
export type Review = Tables<'reviews'>
export type ReviewHelpfulVote = Tables<'review_helpful_votes'>
export type ReferralCode = Tables<'referral_codes'>
export type Referral = Tables<'referrals'>
export type Notification = Tables<'notifications'>
export type AdminUser = Tables<'admin_users'>
export type AnalyticsEvent = Tables<'analytics_events'>

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

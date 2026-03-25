export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          blog_post_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blog_post_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blog_post_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_event_participants: {
        Row: {
          blog_post_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blog_post_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blog_post_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_event_participants_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_likes: {
        Row: {
          blog_post_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blog_post_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blog_post_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_likes_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          category: string
          comments_count: number
          content: string
          cover_image: string | null
          created_at: string
          event_date: string | null
          event_end_time: string | null
          event_latitude: number | null
          event_location: string | null
          event_longitude: number | null
          event_max_participants: number | null
          event_pet_types: string[] | null
          event_start_time: string | null
          id: string
          likes_count: number
          post_type: string
          preview_text: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          comments_count?: number
          content?: string
          cover_image?: string | null
          created_at?: string
          event_date?: string | null
          event_end_time?: string | null
          event_latitude?: number | null
          event_location?: string | null
          event_longitude?: number | null
          event_max_participants?: number | null
          event_pet_types?: string[] | null
          event_start_time?: string | null
          id?: string
          likes_count?: number
          post_type?: string
          preview_text?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          comments_count?: number
          content?: string
          cover_image?: string | null
          created_at?: string
          event_date?: string | null
          event_end_time?: string | null
          event_latitude?: number | null
          event_location?: string | null
          event_longitude?: number | null
          event_max_participants?: number | null
          event_pet_types?: string[] | null
          event_start_time?: string | null
          id?: string
          likes_count?: number
          post_type?: string
          preview_text?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_saves: {
        Row: {
          blog_post_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blog_post_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blog_post_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_saves_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_pricing: {
        Row: {
          boost_type: string
          created_at: string
          duration_hours: number
          duration_label: string
          id: string
          price: number
          updated_at: string
        }
        Insert: {
          boost_type: string
          created_at?: string
          duration_hours: number
          duration_label: string
          id?: string
          price?: number
          updated_at?: string
        }
        Update: {
          boost_type?: string
          created_at?: string
          duration_hours?: number
          duration_label?: string
          id?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      boosts: {
        Row: {
          created_at: string
          end_date: string
          id: string
          owner_id: string
          price_paid: number
          start_date: string
          status: string
          target_id: string
          type: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          owner_id: string
          price_paid?: number
          start_date?: string
          status?: string
          target_id: string
          type: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          owner_id?: string
          price_paid?: number
          start_date?: string
          status?: string
          target_id?: string
          type?: string
        }
        Relationships: []
      }
      business_profiles: {
        Row: {
          avg_rating: number
          banner_url: string | null
          business_name: string
          category: string
          created_at: string
          delivery_available: boolean
          delivery_fee: number
          delivery_radius_km: number | null
          description: string
          free_delivery_above: number | null
          id: string
          is_suspended: boolean
          is_verified: boolean
          location: string
          logo_url: string | null
          phone: string
          pickup_available: boolean
          total_reviews: number
          updated_at: string
          user_id: string
          website: string
        }
        Insert: {
          avg_rating?: number
          banner_url?: string | null
          business_name: string
          category?: string
          created_at?: string
          delivery_available?: boolean
          delivery_fee?: number
          delivery_radius_km?: number | null
          description?: string
          free_delivery_above?: number | null
          id?: string
          is_suspended?: boolean
          is_verified?: boolean
          location?: string
          logo_url?: string | null
          phone?: string
          pickup_available?: boolean
          total_reviews?: number
          updated_at?: string
          user_id: string
          website?: string
        }
        Update: {
          avg_rating?: number
          banner_url?: string | null
          business_name?: string
          category?: string
          created_at?: string
          delivery_available?: boolean
          delivery_fee?: number
          delivery_radius_km?: number | null
          description?: string
          free_delivery_above?: number | null
          id?: string
          is_suspended?: boolean
          is_verified?: boolean
          location?: string
          logo_url?: string | null
          phone?: string
          pickup_available?: boolean
          total_reviews?: number
          updated_at?: string
          user_id?: string
          website?: string
        }
        Relationships: []
      }
      care_bookings: {
        Row: {
          booking_date: string
          booking_time: string
          conversation_id: string | null
          created_at: string
          id: string
          notes: string | null
          pet_id: string | null
          provider_id: string
          service_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_date: string
          booking_time: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pet_id?: string | null
          provider_id: string
          service_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          booking_time?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pet_id?: string | null
          provider_id?: string
          service_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_bookings_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "care_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "care_services"
            referencedColumns: ["id"]
          },
        ]
      }
      care_payments: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          payment_method: string
          platform_fee: number
          provider_earnings: number
          provider_id: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          payment_method?: string
          platform_fee?: number
          provider_earnings?: number
          provider_id: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          payment_method?: string
          platform_fee?: number
          provider_earnings?: number
          provider_id?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "care_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "care_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      care_payouts: {
        Row: {
          amount: number
          id: string
          processed_at: string | null
          provider_id: string
          requested_at: string
          status: string
        }
        Insert: {
          amount: number
          id?: string
          processed_at?: string | null
          provider_id: string
          requested_at?: string
          status?: string
        }
        Update: {
          amount?: number
          id?: string
          processed_at?: string | null
          provider_id?: string
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_payouts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "care_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      care_providers: {
        Row: {
          admin_notes: string | null
          avg_rating: number
          banned_at: string | null
          booking_mode: string
          business_name: string
          cancellation_hours: number | null
          cancellation_policy: string | null
          category: string
          created_at: string
          description: string | null
          emergency_available: boolean | null
          id: string
          is_banned: boolean
          is_suspended: boolean
          is_verified: boolean
          latitude: number | null
          location: string | null
          longitude: number | null
          opening_hours: Json | null
          phone: string | null
          photo_url: string | null
          response_time_minutes: number | null
          service_radius_km: number | null
          suspended_at: string | null
          total_bookings: number
          total_reviews: number
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          avg_rating?: number
          banned_at?: string | null
          booking_mode?: string
          business_name: string
          cancellation_hours?: number | null
          cancellation_policy?: string | null
          category?: string
          created_at?: string
          description?: string | null
          emergency_available?: boolean | null
          id?: string
          is_banned?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          opening_hours?: Json | null
          phone?: string | null
          photo_url?: string | null
          response_time_minutes?: number | null
          service_radius_km?: number | null
          suspended_at?: string | null
          total_bookings?: number
          total_reviews?: number
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          avg_rating?: number
          banned_at?: string | null
          booking_mode?: string
          business_name?: string
          cancellation_hours?: number | null
          cancellation_policy?: string | null
          category?: string
          created_at?: string
          description?: string | null
          emergency_available?: boolean | null
          id?: string
          is_banned?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          opening_hours?: Json | null
          phone?: string | null
          photo_url?: string | null
          response_time_minutes?: number | null
          service_radius_km?: number | null
          suspended_at?: string | null
          total_bookings?: number
          total_reviews?: number
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      care_reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string
          id: string
          provider_id: string
          rating: number
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          provider_id: string
          rating: number
          user_id: string
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          provider_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "care_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "care_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      care_services: {
        Row: {
          created_at: string
          description: string | null
          duration: number
          id: string
          is_active: boolean
          price: number
          provider_id: string
          service_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          is_active?: boolean
          price?: number
          provider_id: string
          service_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          is_active?: boolean
          price?: number
          provider_id?: string
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "care_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_archived: boolean
          is_muted: boolean
          is_pinned: boolean
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_archived?: boolean
          is_muted?: boolean
          is_pinned?: boolean
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_archived?: boolean
          is_muted?: boolean
          is_pinned?: boolean
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          business_id: string
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number
          updated_at: string
          used_count: number
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number
          updated_at?: string
          used_count?: number
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_daily_log: {
        Row: {
          action_type: string
          created_at: string
          credits_earned: number
          id: string
          source_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          credits_earned?: number
          id?: string
          source_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          credits_earned?: number
          id?: string
          source_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deleted_messages: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      message_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          message_id: string
          reason: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          message_id: string
          reason?: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          message_id?: string
          reason?: string
          reporter_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          forwarded_from_id: string | null
          id: string
          is_read: boolean
          message_text: string
          message_type: string
          metadata: Json | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          forwarded_from_id?: string | null
          id?: string
          is_read?: boolean
          message_text?: string
          message_type?: string
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          forwarded_from_id?: string | null
          id?: string
          is_read?: boolean
          message_text?: string
          message_type?: string
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_booking_confirmation: boolean
          email_booking_request: boolean
          email_new_message: boolean
          email_new_review: boolean
          email_payment_received: boolean
          email_promotions: boolean
          id: string
          push_booking_confirmation: boolean
          push_booking_request: boolean
          push_new_message: boolean
          push_new_review: boolean
          push_payment_received: boolean
          push_promotions: boolean
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_booking_confirmation?: boolean
          email_booking_request?: boolean
          email_new_message?: boolean
          email_new_review?: boolean
          email_payment_received?: boolean
          email_promotions?: boolean
          id?: string
          push_booking_confirmation?: boolean
          push_booking_request?: boolean
          push_new_message?: boolean
          push_new_review?: boolean
          push_payment_received?: boolean
          push_promotions?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_booking_confirmation?: boolean
          email_booking_request?: boolean
          email_new_message?: boolean
          email_new_review?: boolean
          email_payment_received?: boolean
          email_promotions?: boolean
          id?: string
          push_booking_confirmation?: boolean
          push_booking_request?: boolean
          push_new_message?: boolean
          push_new_review?: boolean
          push_payment_received?: boolean
          push_promotions?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          is_read: boolean
          message: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          is_read?: boolean
          message?: string
          type?: string
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          is_read?: boolean
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          platform_fee: number
          price: number
          product_id: string
          quantity: number
          store_earnings: number
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          platform_fee?: number
          price?: number
          product_id: string
          quantity?: number
          store_earnings?: number
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          platform_fee?: number
          price?: number
          product_id?: string
          quantity?: number
          store_earnings?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          platform_fee: number
          shipping_address: string
          shipping_city: string
          shipping_country: string
          shipping_name: string
          shipping_phone: string
          shipping_postal_code: string
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          platform_fee?: number
          shipping_address?: string
          shipping_city?: string
          shipping_country?: string
          shipping_name?: string
          shipping_phone?: string
          shipping_postal_code?: string
          status?: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          platform_fee?: number
          shipping_address?: string
          shipping_city?: string
          shipping_country?: string
          shipping_name?: string
          shipping_phone?: string
          shipping_postal_code?: string
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          card_brand: string
          card_last4: string
          cardholder_name: string
          created_at: string
          exp_month: number
          exp_year: number
          id: string
          is_default: boolean
          provider: string
          provider_payment_method_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_brand?: string
          card_last4: string
          cardholder_name: string
          created_at?: string
          exp_month: number
          exp_year: number
          id?: string
          is_default?: boolean
          provider?: string
          provider_payment_method_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_brand?: string
          card_last4?: string
          cardholder_name?: string
          created_at?: string
          exp_month?: number
          exp_year?: number
          id?: string
          is_default?: boolean
          provider?: string
          provider_payment_method_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pet_subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          plan: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          plan?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          plan?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      pet_trackers: {
        Row: {
          breed: string | null
          created_at: string
          id: string
          is_lost: boolean
          pet_name: string
          pet_photo: string | null
          pet_type: string
          tracker_device_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          breed?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean
          pet_name: string
          pet_photo?: string | null
          pet_type?: string
          tracker_device_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          breed?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean
          pet_name?: string
          pet_photo?: string | null
          pet_type?: string
          tracker_device_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      petmatch_listings: {
        Row: {
          breed_document_name: string | null
          breed_document_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          looking_for: string | null
          pet_id: string
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          breed_document_name?: string | null
          breed_document_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          looking_for?: string | null
          pet_id: string
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          breed_document_name?: string | null
          breed_document_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          looking_for?: string | null
          pet_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petmatch_listings_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      petmatch_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          evidence_url: string | null
          id: string
          listing_id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          evidence_url?: string | null
          id?: string
          listing_id: string
          reason?: string
          reported_user_id: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          evidence_url?: string | null
          id?: string
          listing_id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "petmatch_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "petmatch_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          age: string | null
          animal_type: string
          breed: string | null
          created_at: string
          emergency_contact: string | null
          gender: string | null
          id: string
          medical_notes: string | null
          name: string
          neutered: boolean | null
          owner_id: string
          photo_url: string | null
          special_care: string | null
          temperament: string | null
          updated_at: string
          vaccinated: boolean | null
          vet_info: string | null
          weight: string | null
        }
        Insert: {
          age?: string | null
          animal_type?: string
          breed?: string | null
          created_at?: string
          emergency_contact?: string | null
          gender?: string | null
          id?: string
          medical_notes?: string | null
          name: string
          neutered?: boolean | null
          owner_id: string
          photo_url?: string | null
          special_care?: string | null
          temperament?: string | null
          updated_at?: string
          vaccinated?: boolean | null
          vet_info?: string | null
          weight?: string | null
        }
        Update: {
          age?: string | null
          animal_type?: string
          breed?: string | null
          created_at?: string
          emergency_contact?: string | null
          gender?: string | null
          id?: string
          medical_notes?: string | null
          name?: string
          neutered?: boolean | null
          owner_id?: string
          photo_url?: string | null
          special_care?: string | null
          temperament?: string | null
          updated_at?: string
          vaccinated?: boolean | null
          vet_info?: string | null
          weight?: string | null
        }
        Relationships: []
      }
      places: {
        Row: {
          address: string | null
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          latitude: number
          longitude: number
          name: string
          opening_hours: string | null
          phone: string | null
          rating: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          latitude: number
          longitude: number
          name: string
          opening_hours?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          latitude?: number
          longitude?: number
          name?: string
          opening_hours?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          caption: string | null
          comments_count: number
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
          location: string | null
          pet_id: string | null
          post_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          comments_count?: number
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          location?: string | null
          pet_id?: string | null
          post_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          comments_count?: number
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          location?: string | null
          pet_id?: string | null
          post_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          price_modifier: number
          product_id: string
          stock: number | null
          variant_label: string
          variant_value: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          price_modifier?: number
          product_id: string
          stock?: number | null
          variant_label?: string
          variant_value: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          price_modifier?: number
          product_id?: string
          stock?: number | null
          variant_label?: string
          variant_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          price: number
          stock: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          price?: number
          stock?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number
          stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          is_student: boolean
          last_active_at: string | null
          location: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_student?: boolean
          last_active_at?: string | null
          location?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_student?: boolean
          last_active_at?: string | null
          location?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          provider_id: string
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time?: string
          id?: string
          is_available?: boolean
          provider_id: string
          start_time?: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          provider_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "care_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_balances: {
        Row: {
          available_balance: number
          id: string
          pending_balance: number
          provider_id: string
          total_earned: number
          total_platform_fees: number
          updated_at: string
        }
        Insert: {
          available_balance?: number
          id?: string
          pending_balance?: number
          provider_id: string
          total_earned?: number
          total_platform_fees?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number
          id?: string
          pending_balance?: number
          provider_id?: string
          total_earned?: number
          total_platform_fees?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_balances_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "care_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_gallery: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          provider_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          provider_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_gallery_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "care_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          provider_id: string
          reason: string
          reporter_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          provider_id: string
          reason?: string
          reporter_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          provider_id?: string
          reason?: string
          reporter_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_reports_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "care_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_verifications: {
        Row: {
          document_name: string
          document_url: string
          id: string
          provider_id: string
          reviewed_at: string | null
          reviewer_notes: string | null
          status: string
          submitted_at: string
          verification_type: string
        }
        Insert: {
          document_name?: string
          document_url: string
          id?: string
          provider_id: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string
          verification_type?: string
        }
        Update: {
          document_name?: string
          document_url?: string
          id?: string
          provider_id?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_verifications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "care_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_zones: {
        Row: {
          center_lat: number
          center_lng: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          radius: number
          tracker_id: string
        }
        Insert: {
          center_lat: number
          center_lng: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          radius?: number
          tracker_id: string
        }
        Update: {
          center_lat?: number
          center_lng?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          radius?: number
          tracker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safe_zones_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "pet_trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      sitter_profiles: {
        Row: {
          avg_rating: number
          bio: string | null
          created_at: string
          daily_rate: number | null
          experience: string | null
          hourly_rate: number | null
          id: string
          is_student_verified: boolean
          services: string[] | null
          total_bookings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_rating?: number
          bio?: string | null
          created_at?: string
          daily_rate?: number | null
          experience?: string | null
          hourly_rate?: number | null
          id?: string
          is_student_verified?: boolean
          services?: string[] | null
          total_bookings?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_rating?: number
          bio?: string | null
          created_at?: string
          daily_rate?: number | null
          experience?: string | null
          hourly_rate?: number | null
          id?: string
          is_student_verified?: boolean
          services?: string[] | null
          total_bookings?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_followers: {
        Row: {
          created_at: string
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_followers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          location: string | null
          location_lat: number | null
          location_lng: number | null
          media_type: string
          media_url: string
          pet_id: string | null
          sticker: string | null
          text_overlay: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          media_type?: string
          media_url: string
          pet_id?: string | null
          sticker?: string | null
          text_overlay?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          media_type?: string
          media_url?: string
          pet_id?: string | null
          sticker?: string | null
          text_overlay?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      story_likes: {
        Row: {
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_likes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          story_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          story_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracker_locations: {
        Row: {
          battery_level: number | null
          created_at: string
          id: string
          latitude: number
          longitude: number
          tracker_id: string
        }
        Insert: {
          battery_level?: number | null
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          tracker_id: string
        }
        Update: {
          battery_level?: number | null
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          tracker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracker_locations_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "pet_trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          font_size: string
          id: string
          language: string
          medical_notes_privacy: string
          messaging_access: string
          private_account: boolean
          professional_mode: boolean
          show_activity_status: boolean
          show_in_search: boolean
          show_rating_publicly: boolean
          theme: string
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
          vet_name: string | null
          vet_phone: string | null
        }
        Insert: {
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          font_size?: string
          id?: string
          language?: string
          medical_notes_privacy?: string
          messaging_access?: string
          private_account?: boolean
          professional_mode?: boolean
          show_activity_status?: boolean
          show_in_search?: boolean
          show_rating_publicly?: boolean
          theme?: string
          two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
          vet_name?: string | null
          vet_phone?: string | null
        }
        Update: {
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          font_size?: string
          id?: string
          language?: string
          medical_notes_privacy?: string
          messaging_access?: string
          private_account?: boolean
          professional_mode?: boolean
          show_activity_status?: boolean
          show_in_search?: boolean
          show_rating_publicly?: boolean
          theme?: string
          two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string
          vet_name?: string | null
          vet_phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_conversation_with_participant: {
        Args: { _other_user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_order_buyer: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      process_care_payment: {
        Args: {
          _booking_id: string
          _provider_id: string
          _total_amount: number
          _user_id: string
        }
        Returns: string
      }
      reduce_product_stock: {
        Args: { _product_id: string; _quantity: number }
        Returns: boolean
      }
      user_owns_order_items: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "owner"
      user_role_type: "owner" | "sitter" | "user" | "provider" | "business"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "owner"],
      user_role_type: ["owner", "sitter", "user", "provider", "business"],
    },
  },
} as const

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
          id: string
          likes_count: number
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
          id?: string
          likes_count?: number
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
          id?: string
          likes_count?: number
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          is_student: boolean
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
          location?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
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
      stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          location: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      user_role_type: "owner" | "sitter"
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
      app_role: ["admin", "moderator", "user"],
      user_role_type: ["owner", "sitter"],
    },
  },
} as const

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Compact table shape for tables added after the last generated types. */
type Table<R> = {
  Row: R
  Insert: Partial<R>
  Update: Partial<R>
  Relationships: []
}

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      premium_access: {
        Row: {
          created_at: string
          expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      premium_transactions: {
        Row: {
          created_at: string
          duration_days: number
          id: string
          source: string
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_days: number
          id?: string
          source?: string
          stripe_session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_days?: number
          id?: string
          source?: string
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string | null
          referrer_id: string
          rewarded: boolean
          used_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id?: string | null
          referrer_id: string
          rewarded?: boolean
          used_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string | null
          referrer_id?: string
          rewarded?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
      tips: {
        Row: {
          id: number
          created_at: string
          sport: string
          league: string
          home_team: string
          away_team: string
          prediction: string
          odds: number
          kickoff: string
          status: string
          is_premium: boolean | null
          is_published: boolean | null
          home_team_logo?: string | null
          away_team_logo?: string | null
          description?: string | null
          likes_count?: number | null
          won_at?: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          sport: string
          league: string
          home_team: string
          away_team: string
          prediction: string
          odds: number
          kickoff: string
          status: string
          is_premium?: boolean | null
          is_published?: boolean | null
          home_team_logo?: string | null
          away_team_logo?: string | null
          description?: string | null
          likes_count?: number | null
          won_at?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          sport?: string
          league?: string
          home_team?: string
          away_team?: string
          prediction?: string
          odds?: number
          kickoff?: string
          status?: string
          is_premium?: boolean | null
          is_published?: boolean | null
          home_team_logo?: string | null
          away_team_logo?: string | null
          description?: string | null
          likes_count?: number | null
          won_at?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          id: number
          created_at: string
          name: string
          matches: Json
          total_odds: number
          stake: number | null
          status: string
          is_premium: boolean | null
          won_at: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          name: string
          matches: Json
          total_odds: number
          stake?: number | null
          status: string
          is_premium?: boolean | null
          won_at?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          name?: string
          matches?: Json
          total_odds?: number
          stake?: number | null
          status?: string
          is_premium?: boolean | null
          won_at?: string | null
        }
        Relationships: []
      }
      featured_picks: {
        Row: {
          id: number
          created_at: string
          league: string
          kickoff: string
          home_team: string
          away_team: string
          prediction: string
          odds: string
          confidence: string
          status?: string | null
          home_team_logo?: string | null
          away_team_logo?: string | null
          description?: string | null
          won_at?: string | null
          sport?: string | null
          unlock_free?: boolean | null
        }
        Insert: {
          id?: number
          created_at?: string
          league: string
          kickoff: string
          home_team: string
          away_team: string
          prediction: string
          odds: string
          confidence: string
          status?: string | null
          home_team_logo?: string | null
          away_team_logo?: string | null
          description?: string | null
          won_at?: string | null
          sport?: string | null
          unlock_free?: boolean | null
        }
        Update: {
          id?: number
          created_at?: string
          league?: string
          kickoff?: string
          home_team?: string
          away_team?: string
          prediction?: string
          odds?: string
          confidence?: string
          status?: string | null
          home_team_logo?: string | null
          away_team_logo?: string | null
          description?: string | null
          won_at?: string | null
          sport?: string | null
          unlock_free?: boolean | null
        }
        Relationships: []
      }
      tip_unlocks: Table<{ id: string; user_id: string; tip_id: number; source: string; payment_ref: string; created_at: string }>
      weekend_passes: Table<{ id: string; user_id: string; starts_at: string; ends_at: string; source: string; payment_ref: string; created_at: string }>
      admins: Table<{ user_id: string; created_at: string }>
      tips_archive: Table<{
        id: number; sport: string | null; league: string | null; home_team: string | null; away_team: string | null
        prediction: string | null; odds: number | null; kickoff: string | null; status: string; is_premium: boolean | null
        home_team_logo: string | null; away_team_logo: string | null; won_at: string | null; archived_at: string
      }>
      collected_cards: Table<{ user_id: string; tip_id: number; collected_at: string }>
      daily_opens: Table<{ user_id: string; day: string }>
      unlock_credits: Table<{ user_id: string; credits: number; updated_at: string }>
      events: Table<{ id: number; created_at: string; name: string; user_id: string | null; anon_id: string | null; props: Json | null }>
      team_logos_cache: Table<{ team_name: string; logo_url: string | null; updated_at: string | null }>
      imported_matches: Table<{ source_id: string; home_team: string | null; away_team: string | null; target: string | null; imported_at: string }>
      push_tokens: Table<{ user_id: string; token: string; platform: string; enabled: boolean; updated_at: string | null }>
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_coupons: {
        Args: Record<string, never>
        // SECURITY DEFINER fallback używany przez loadCoupons(), gdy RLS
        // zablokuje bezpośredni select z tabeli coupons. Zwraca wiersze
        // kuponów w identycznym kształcie jak tabela.
        Returns: Array<{
          id: number
          created_at: string
          name: string
          matches: Json
          total_odds: number
          stake: number | null
          status: string
          is_premium: boolean | null
          won_at: string | null
        }>
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          farmer_id: string
          farmer_name: string | null
          farmer_phone: string | null
          hours: number
          id: string
          labour_id: string | null
          labour_name: string | null
          labour_phone: string | null
          notes: string | null
          payment_method: string
          rate_per_hour: number
          start_time: string
          status: string
          total_amount: number
          village: string | null
          work_date: string
          work_type_id: string
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          farmer_id?: string
          farmer_name?: string | null
          farmer_phone?: string | null
          hours: number
          id?: string
          labour_id?: string | null
          labour_name?: string | null
          labour_phone?: string | null
          notes?: string | null
          payment_method: string
          rate_per_hour?: number
          start_time: string
          status?: string
          total_amount?: number
          village?: string | null
          work_date: string
          work_type_id: string
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          farmer_id?: string
          farmer_name?: string | null
          farmer_phone?: string | null
          hours?: number
          id?: string
          labour_id?: string | null
          labour_name?: string | null
          labour_phone?: string | null
          notes?: string | null
          payment_method?: string
          rate_per_hour?: number
          start_time?: string
          status?: string
          total_amount?: number
          village?: string | null
          work_date?: string
          work_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_work_type_id_fkey"
            columns: ["work_type_id"]
            isOneToOne: false
            referencedRelation: "work_types"
            referencedColumns: ["id"]
          },
        ]
      }
      crp_codes: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          code: string
          district: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          code: string
          district: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          code?: string
          district?: string
        }
        Relationships: []
      }
      lcc_readings: {
        Row: {
          advice: string | null
          created_at: string
          crop: string
          farmer_id: string
          id: string
          leaf_score: number
          recorded_by: string
          tested_on: string
        }
        Insert: {
          advice?: string | null
          created_at?: string
          crop: string
          farmer_id: string
          id?: string
          leaf_score: number
          recorded_by?: string
          tested_on?: string
        }
        Update: {
          advice?: string | null
          created_at?: string
          crop?: string
          farmer_id?: string
          id?: string
          leaf_score?: number
          recorded_by?: string
          tested_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "lcc_readings_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          crp_code: string | null
          district: string | null
          farmer_code: string | null
          full_name: string
          id: string
          phone: string | null
          state_code: string
          updated_at: string
          username: string
          village: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          crp_code?: string | null
          district?: string | null
          farmer_code?: string | null
          full_name: string
          id: string
          phone?: string | null
          state_code?: string
          updated_at?: string
          username: string
          village?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          crp_code?: string | null
          district?: string | null
          farmer_code?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          state_code?: string
          updated_at?: string
          username?: string
          village?: string | null
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string
          created_by: string | null
          details: string | null
          farmer_id: string | null
          id: string
          method: string
          scheduled_on: string
          scheduled_time: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          details?: string | null
          farmer_id?: string | null
          id?: string
          method: string
          scheduled_on: string
          scheduled_time?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          details?: string | null
          farmer_id?: string | null
          id?: string
          method?: string
          scheduled_on?: string
          scheduled_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      soil_tests: {
        Row: {
          created_at: string
          ec: number | null
          farmer_id: string
          id: string
          nitrogen: number | null
          organic_carbon: number | null
          ph: number | null
          phosphorus: number | null
          potassium: number | null
          recorded_by: string
          remarks: string | null
          tested_on: string
        }
        Insert: {
          created_at?: string
          ec?: number | null
          farmer_id: string
          id?: string
          nitrogen?: number | null
          organic_carbon?: number | null
          ph?: number | null
          phosphorus?: number | null
          potassium?: number | null
          recorded_by?: string
          remarks?: string | null
          tested_on?: string
        }
        Update: {
          created_at?: string
          ec?: number | null
          farmer_id?: string
          id?: string
          nitrogen?: number | null
          organic_carbon?: number | null
          ph?: number | null
          phosphorus?: number | null
          potassium?: number | null
          recorded_by?: string
          remarks?: string | null
          tested_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "soil_tests_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_types: {
        Row: {
          description: string
          id: string
          name: string
          name_te: string
          rate_per_hour: number
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description: string
          id: string
          name: string
          name_te: string
          rate_per_hour: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string
          id?: string
          name?: string
          name_te?: string
          rate_per_hour?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_booking: {
        Args: { _booking_id: string }
        Returns: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          farmer_id: string
          farmer_name: string | null
          farmer_phone: string | null
          hours: number
          id: string
          labour_id: string | null
          labour_name: string | null
          labour_phone: string | null
          notes: string | null
          payment_method: string
          rate_per_hour: number
          start_time: string
          status: string
          total_amount: number
          village: string | null
          work_date: string
          work_type_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_booking_status: {
        Args: { _booking_id: string; _status: string }
        Returns: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          farmer_id: string
          farmer_name: string | null
          farmer_phone: string | null
          hours: number
          id: string
          labour_id: string | null
          labour_name: string | null
          labour_phone: string | null
          notes: string | null
          payment_method: string
          rate_per_hour: number
          start_time: string
          status: string
          total_amount: number
          village: string | null
          work_date: string
          work_type_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "farmer" | "labour" | "crp"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["farmer", "labour", "crp"],
    },
  },
} as const

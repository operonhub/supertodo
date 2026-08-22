/**
 * Tipos generados desde el esquema real de Supabase (`generate_typescript_types`).
 * No editar a mano: si cambia el esquema, se regenera.
 */

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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      business_config: {
        Row: {
          data: Json
          id: number
          updated_at: string
        }
        Insert: {
          data: Json
          id?: number
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          apellido: string
          created_at: string
          direccion: string
          dni: string
          email: string
          id: string
          nombre: string
          telefono: string
        }
        Insert: {
          apellido: string
          created_at?: string
          direccion: string
          dni: string
          email: string
          id: string
          nombre: string
          telefono: string
        }
        Update: {
          apellido?: string
          created_at?: string
          direccion?: string
          dni?: string
          email?: string
          id?: string
          nombre?: string
          telefono?: string
        }
        Relationships: []
      }
      order_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: number
          order_id: string
          sender_role: string
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          id?: never
          order_id: string
          sender_role: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: never
          order_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivery: string
          history: Json
          id: string
          items: Json
          notes: string | null
          payment_method: string
          payment_status: string
          status: string
          total: number
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivery: string
          history?: Json
          id: string
          items: Json
          notes?: string | null
          payment_method: string
          payment_status?: string
          status?: string
          total: number
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivery?: string
          history?: Json
          id?: string
          items?: Json
          notes?: string | null
          payment_method?: string
          payment_status?: string
          status?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      precios_claros_productos: {
        Row: {
          barcode: string
          fuente_sucursal_id: string | null
          marca: string | null
          nombre: string
          presentacion: string | null
          updated_at: string
        }
        Insert: {
          barcode: string
          fuente_sucursal_id?: string | null
          marca?: string | null
          nombre: string
          presentacion?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string
          fuente_sucursal_id?: string | null
          marca?: string | null
          nombre?: string
          presentacion?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          available: boolean
          barcode: string | null
          category: string
          id: string
          image_url: string | null
          name: string
          price: number
          promotion: Json | null
          stock: number | null
          subcategory: string | null
          suggested_product_ids: string[] | null
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          available?: boolean
          barcode?: string | null
          category: string
          id: string
          image_url?: string | null
          name: string
          price: number
          promotion?: Json | null
          stock?: number | null
          subcategory?: string | null
          suggested_product_ids?: string[] | null
          unit: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          available?: boolean
          barcode?: string | null
          category?: string
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          promotion?: Json | null
          stock?: number | null
          subcategory?: string | null
          suggested_product_ids?: string[] | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      cancel_order: { Args: { p_order_id: string }; Returns: Tables<'orders'> }
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

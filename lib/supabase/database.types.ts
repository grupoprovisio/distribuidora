// Base gerada a partir do Supabase Provisio em 2026-10-17.
// Tipagem versionada conforme SQL 0001-0024; 0024 exige homologacao antes de liberar logistica.
// Regerar a partir do projeto Supabase apos validar a implantacao.
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
      order_fulfillments: {
        Row: {
          id: string
          order_id: string
          buyer_org_id: string
          supplier_org_id: string
          status: string
          freight_estimate_minor: number | null
          estimated_delivery_date: string | null
          tracking_reference: string | null
          dispatched_at: string | null
          delivered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          buyer_org_id: string
          supplier_org_id: string
          status?: string
          freight_estimate_minor?: number | null
          estimated_delivery_date?: string | null
          tracking_reference?: string | null
          dispatched_at?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          buyer_org_id?: string
          supplier_org_id?: string
          status?: string
          freight_estimate_minor?: number | null
          estimated_delivery_date?: string | null
          tracking_reference?: string | null
          dispatched_at?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_baskets: {
        Row: {
          id: string
          buyer_org_id: string
          created_by: string
          request_key: string
          region_code: string
          fulfillment_method: "delivery" | "pickup"
          item_fingerprint: string
          recipient_snapshot: Json | null
          origin_snapshot: Json | null
          delivery_postal_code: string | null
          freight_rate_id: string | null
          freight_minor: number | null
          freight_source: string | null
          min_business_days: number | null
          max_business_days: number | null
          payment_status: "unpaid" | "paid" | "refunded"
          created_at: string
        }
        Insert: {
          id?: string
          buyer_org_id: string
          created_by: string
          request_key: string
          region_code: string
          fulfillment_method: "delivery" | "pickup"
          item_fingerprint: string
          recipient_snapshot?: Json | null
          origin_snapshot?: Json | null
          delivery_postal_code?: string | null
          freight_rate_id?: string | null
          freight_minor?: number | null
          freight_source?: string | null
          min_business_days?: number | null
          max_business_days?: number | null
          payment_status?: "unpaid" | "paid" | "refunded"
          created_at?: string
        }
        Update: {
          id?: string
          buyer_org_id?: string
          created_by?: string
          request_key?: string
          region_code?: string
          fulfillment_method?: "delivery" | "pickup"
          item_fingerprint?: string
          recipient_snapshot?: Json | null
          origin_snapshot?: Json | null
          delivery_postal_code?: string | null
          freight_rate_id?: string | null
          freight_minor?: number | null
          freight_source?: string | null
          min_business_days?: number | null
          max_business_days?: number | null
          payment_status?: "unpaid" | "paid" | "refunded"
          created_at?: string
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          id: string
          buyer_org_id: string
          supplier_org_id: string
          offer_id: string
          basket_id: string | null
          created_by: string
          request_key: string
          quantity: number
          region_code: string
          notes: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          buyer_org_id: string
          supplier_org_id: string
          offer_id: string
          basket_id: string | null
          created_by: string
          request_key: string
          quantity: number
          region_code: string
          notes?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          buyer_org_id?: string
          supplier_org_id?: string
          offer_id?: string
          basket_id?: string | null
          created_by?: string
          request_key?: string
          quantity?: number
          region_code?: string
          notes?: string
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      quote_proposals: {
        Row: {
          id: string
          quote_request_id: string
          supplier_org_id: string
          proposed_by: string
          unit_price_minor: number
          expires_at: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          quote_request_id: string
          supplier_org_id: string
          proposed_by: string
          unit_price_minor: number
          expires_at: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          quote_request_id?: string
          supplier_org_id?: string
          proposed_by?: string
          unit_price_minor?: number
          expires_at?: string
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          id: string
          buyer_org_id: string
          supplier_org_id: string
          quote_request_id: string
          proposal_id: string
          offer_id: string
          created_by: string
          checkout_key: string
          quantity: number
          region_code: string
          unit_price_minor: number
          total_price_minor: number
          status: string
          created_at: string
          confirmed_at: string | null
          closed_at: string | null
        }
        Insert: {
          id?: string
          buyer_org_id: string
          supplier_org_id: string
          quote_request_id: string
          proposal_id: string
          offer_id: string
          created_by: string
          checkout_key: string
          quantity: number
          region_code: string
          unit_price_minor: number
          total_price_minor: number
          status?: string
          created_at?: string
          confirmed_at?: string | null
          closed_at?: string | null
        }
        Update: {
          id?: string
          buyer_org_id?: string
          supplier_org_id?: string
          quote_request_id?: string
          proposal_id?: string
          offer_id?: string
          created_by?: string
          checkout_key?: string
          quantity?: number
          region_code?: string
          unit_price_minor?: number
          total_price_minor?: number
          status?: string
          created_at?: string
          confirmed_at?: string | null
          closed_at?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: { id:string; name:string; slug:string; created_at:string }
        Insert: { id?:string; name:string; slug:string; created_at?:string }
        Update: { id?:string; name?:string; slug?:string; created_at?:string }
        Relationships: []
      }
      product_category_assignments: {
        Row: { product_id:string; category_id:string }
        Insert: { product_id:string; category_id:string }
        Update: { product_id?:string; category_id?:string }
        Relationships: []
      }
      product_images: {
        Row: { id:string; product_id:string; storage_path:string; mime_type:string; size_bytes:number; created_at:string }
        Insert: { id?:string; product_id:string; storage_path:string; mime_type:string; size_bytes:number; created_at?:string }
        Update: { id?:string; product_id?:string; storage_path?:string; mime_type?:string; size_bytes?:number; created_at?:string }
        Relationships: []
      }
      supplier_product_submissions: {
        Row: {
          id:string; supplier_org_id:string; author_id:string; supplier_sku:string;
          product_name:string; category_id:string|null; region_code:string;
          base_unit:string; pack_quantity:number; pack_unit:string; base_price_minor:number;
          available_quantity:number; status:string; created_at:string
        }
        Insert: {
          id?:string; supplier_org_id:string; author_id:string; supplier_sku:string;
          product_name:string; category_id?:string|null; region_code:string;
          base_unit:string; pack_quantity:number; pack_unit:string; base_price_minor:number;
          available_quantity?:number; status?:string; created_at?:string
        }
        Update: {
          id?:string; supplier_org_id?:string; author_id?:string; supplier_sku?:string;
          product_name?:string; category_id?:string|null; region_code?:string;
          base_unit?:string; pack_quantity?:number; pack_unit?:string; base_price_minor?:number;
          available_quantity?:number; status?:string; created_at?:string
        }
        Relationships: []
      }
      buyer_contact_profiles: {
        Row: {
          user_id:string; buyer_org_id:string; full_name:string; contact_email:string;
          phone:string; postal_code:string; street:string; street_number:string;
          complement:string; neighborhood:string; city:string; state_code:string;
          reference:string; updated_at:string
        }
        Insert: {
          user_id:string; buyer_org_id:string; full_name:string; contact_email:string;
          phone:string; postal_code:string; street:string; street_number:string;
          complement?:string; neighborhood:string; city:string; state_code:string;
          reference?:string; updated_at?:string
        }
        Update: {
          user_id?:string; buyer_org_id?:string; full_name?:string; contact_email?:string;
          phone?:string; postal_code?:string; street?:string; street_number?:string;
          complement?:string; neighborhood?:string; city?:string; state_code?:string;
          reference?:string; updated_at?:string
        }
        Relationships: []
      }
      provisio_shipping_origin: {
        Row: {
          id:number; label:string; postal_code:string; street:string; street_number:string;
          complement:string; neighborhood:string; city:string; state_code:string;
          pickup_instructions:string; pickup_enabled:boolean; active:boolean;
          updated_at:string
        }
        Insert: {
          id?:number; label:string; postal_code:string; street:string; street_number:string;
          complement?:string; neighborhood:string; city:string; state_code:string;
          pickup_instructions?:string; pickup_enabled?:boolean; active?:boolean;
          updated_at?:string
        }
        Update: {
          id?:number; label?:string; postal_code?:string; street?:string; street_number?:string;
          complement?:string; neighborhood?:string; city?:string; state_code?:string;
          pickup_instructions?:string; pickup_enabled?:boolean; active?:boolean;
          updated_at?:string
        }
        Relationships: []
      }
      provisio_shipping_state_rates: {
        Row: {
          origin_id:number; state_code:string; label:string;
          price_minor:number; min_business_days:number; max_business_days:number;
          active:boolean; updated_at:string
        }
        Insert: {
          origin_id?:number; state_code?:string; label:string;
          price_minor:number; min_business_days:number; max_business_days:number;
          active?:boolean; updated_at?:string
        }
        Update: {
          origin_id?:number; state_code?:string; label?:string;
          price_minor?:number; min_business_days?:number; max_business_days?:number;
          active?:boolean; updated_at?:string
        }
        Relationships: []
      }
      provisio_shipping_rates: {
        Row: {
          id:string; origin_id:number; label:string; postal_start:number; postal_end:number;
          destination_state:string; price_minor:number; min_business_days:number;
          max_business_days:number; active:boolean; created_at:string; updated_at:string
        }
        Insert: {
          id?:string; origin_id?:number; label:string; postal_start:number; postal_end:number;
          destination_state:string; price_minor:number; min_business_days:number;
          max_business_days:number; active?:boolean; created_at?:string; updated_at?:string
        }
        Update: {
          id?:string; origin_id?:number; label?:string; postal_start?:number; postal_end?:number;
          destination_state?:string; price_minor?:number; min_business_days?:number;
          max_business_days?:number; active?:boolean; created_at?:string; updated_at?:string
        }
        Relationships: []
      }
      buyer_delivery_regions: {
        Row: {
          buyer_org_id: string
          region_code: string
          created_at: string
        }
        Insert: {
          buyer_org_id: string
          region_code: string
          created_at?: string
        }
        Update: {
          buyer_org_id?: string
          region_code?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_delivery_regions_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_positions: {
        Row: {
          available_quantity: number
          reserved_quantity: number
          supplier_org_id: string
          supplier_product_id: string
          updated_at: string
        }
        Insert: {
          available_quantity?: number
          reserved_quantity?: number
          supplier_org_id: string
          supplier_product_id: string
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          reserved_quantity?: number
          supplier_org_id?: string
          supplier_product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_positions_supplier_product_id_supplier_org_id_fkey"
            columns: ["supplier_product_id", "supplier_org_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
            referencedColumns: ["id", "supplier_org_id"]
          },
        ]
      }
      offer_price_tiers: {
        Row: {
          min_quantity: number
          offer_id: string
          unit_price_minor: number
        }
        Insert: {
          min_quantity: number
          offer_id: string
          unit_price_minor: number
        }
        Update: {
          min_quantity?: number
          offer_id?: string
          unit_price_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "offer_price_tiers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_regions: {
        Row: {
          offer_id: string
          region_code: string
        }
        Insert: {
          offer_id: string
          region_code: string
        }
        Update: {
          offer_id?: string
          region_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_regions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          base_price_minor: number
          created_at: string
          id: string
          min_quantity: number
          source_type: string
          status: string
          supplier_org_id: string
          supplier_product_id: string
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          base_price_minor: number
          created_at?: string
          id?: string
          min_quantity?: number
          source_type: string
          status?: string
          supplier_org_id: string
          supplier_product_id: string
          updated_at?: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          base_price_minor?: number
          created_at?: string
          id?: string
          min_quantity?: number
          source_type?: string
          status?: string
          supplier_org_id?: string
          supplier_product_id?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_supplier_product_id_supplier_org_id_fkey"
            columns: ["supplier_product_id", "supplier_org_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
            referencedColumns: ["id", "supplier_org_id"]
          },
        ]
      }
      organization_capabilities: {
        Row: {
          capability: string
          organization_id: string
          status: string
        }
        Insert: {
          capability: string
          organization_id: string
          status?: string
        }
        Update: {
          capability?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_capabilities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_platform_owned: boolean
          kind: string
          legal_name: string
          status: string
          tax_id: string | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_platform_owned?: boolean
          kind: string
          legal_name: string
          status?: string
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_platform_owned?: boolean
          kind?: string
          legal_name?: string
          status?: string
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          base_unit: string
          created_at: string
          gtin: string | null
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          base_unit: string
          created_at?: string
          gtin?: string | null
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          base_unit?: string
          created_at?: string
          gtin?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_products: {
        Row: {
          created_at: string
          id: string
          pack_quantity: number
          pack_unit: string
          product_id: string
          status: string
          supplier_org_id: string
          supplier_sku: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pack_quantity: number
          pack_unit: string
          product_id: string
          status?: string
          supplier_org_id: string
          supplier_sku: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pack_quantity?: number
          pack_unit?: string
          product_id?: string
          status?: string
          supplier_org_id?: string
          supplier_sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      marketplace_advance_fulfillment: {
        Args: {
          order_id: string
          action: string
          freight_estimate_minor?: number | null
          estimated_delivery_date?: string | null
          tracking_reference?: string | null
        }
        Returns: string
      }
      marketplace_transition_order: {
        Args: { order_id: string; action: string }
        Returns: string
      }
      marketplace_submit_quote_basket: {
        Args: {
          buyer_org_id: string
          region_code: string
          fulfillment_method: "delivery" | "pickup"
          lines: Json
          request_key: string
        }
        Returns: string
      }
      marketplace_create_quote: {
        Args: {
          buyer_org_id: string
          offer_id: string
          quantity: number
          region_code: string
          notes: string
          request_key: string
        }
        Returns: string
      }
      marketplace_propose_quote: {
        Args: {
          quote_request_id: string
          unit_price_minor: number
          expires_at: string
        }
        Returns: string
      }
      marketplace_submit_checkout: {
        Args: {
          buyer_org_id: string
          quote_request_id: string
          proposal_id: string
          checkout_key: string
        }
        Returns: string
      }
      set_supplier_available_stock: {
        Args: { p_org:string; p_sku:string; p_available:number }
        Returns: undefined
      }
      create_supplier_pending_offer: {
        Args: {
          p_org:string; p_sku:string; p_price_minor:number; p_minimum:number;
          p_region:string; p_valid_to?:string|null
        }
        Returns: string
      }
      promote_supplier_submission: {
        Args: { p_submission:string; p_slug:string; p_gtin?:string|null }
        Returns: Json
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
    Enums: {},
  },
} as const

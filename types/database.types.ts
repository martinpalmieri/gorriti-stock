export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      products: {
        Row: {
          id: string
          name: string
          category_id: string | null
          creator_or_author: string | null
          brand_publisher_label: string | null
          price: string
          cost_price: string | null
          current_stock: number
          condition: string | null
          supplier: string | null
          barcode: string | null
          sku: string | null
          isbn: string | null
          notes: string | null
          extra_fields: Json | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          category_id?: string | null
          creator_or_author?: string | null
          brand_publisher_label?: string | null
          price: string | number
          cost_price?: string | number | null
          current_stock?: number
          condition?: string | null
          supplier?: string | null
          barcode?: string | null
          sku?: string | null
          isbn?: string | null
          notes?: string | null
          extra_fields?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          category_id?: string | null
          creator_or_author?: string | null
          brand_publisher_label?: string | null
          price?: string | number
          cost_price?: string | number | null
          condition?: string | null
          supplier?: string | null
          barcode?: string | null
          sku?: string | null
          isbn?: string | null
          notes?: string | null
          extra_fields?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          type: string
          quantity_change: number
          stock_before: number
          stock_after: number
          sale_id: string | null
          reason: string | null
          created_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          product_id: string
          type: string
          quantity_change: number
          stock_before: number
          stock_after: number
          sale_id?: string | null
          reason?: string | null
          created_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          type?: string
          quantity_change?: number
          stock_before?: number
          stock_after?: number
          sale_id?: string | null
          reason?: string | null
          created_at?: string | null
          created_by?: string | null
        }
      }
      sales: { Row: Record<string, never>; Insert: Record<string, never>; Update: Record<string, never> }
      sale_items: { Row: Record<string, never>; Insert: Record<string, never>; Update: Record<string, never> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Hand-written types matching supabase/schema.sql.
// Replace with: npx supabase gen types typescript --project-id YOUR_ID > lib/types/database.types.ts

export type UserRole = 'customer' | 'workshop' | 'internal'
export type OrderStatus =
  | 'pending_re_confirmation'
  | 'pending_re_payment'
  | 'pending_re_receipt'
  | 're_in_progress'
  | 'pending_price_estimation'
  | 'pending_part_payment'
  | 'pending_payment_confirmation'
  | 'finding_workshop'
  | 'in_production'
  | 'pending_qc'
  | 'qc_failed_cancelled'
  | 'cancelled_refunded'
  | 'in_delivery'
  | 'completed'
export type ManufacturabilityGrade = 'A' | 'B' | 'C' | 'D'
export type PartStatus = 'request_only' | 'ready_to_make'
export type WorkshopTier = 'Bronze' | 'Silver' | 'Platinum'
export type FileType = 're_receipt' | 'part_receipt' | 'drawing' | 'reference_photo'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string | null
          phone: string | null
          created_at: string
        }
        Insert: {
          id: string
          role: UserRole
          full_name?: string | null
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          full_name?: string | null
          phone?: string | null
          created_at?: string
        }
        Relationships: []
      }
      truck_brands: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      truck_models: {
        Row: {
          id: string
          brand_id: string
          name: string
          year_range: string | null
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          name: string
          year_range?: string | null
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          name?: string
          year_range?: string | null
          image_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'truck_models_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'truck_brands'
            referencedColumns: ['id']
          }
        ]
      }
      part_categories: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      parts: {
        Row: {
          id: string
          category_id: string
          model_id: string
          name: string
          description: string | null
          manufacturability_grade: ManufacturabilityGrade | null
          status: PartStatus
          material_spec: string | null
          notes: string | null
          drawing_file_path: string | null
          drawing_url: string | null
          price_reference: number | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          model_id: string
          name: string
          description?: string | null
          manufacturability_grade?: ManufacturabilityGrade | null
          status?: PartStatus
          material_spec?: string | null
          notes?: string | null
          drawing_file_path?: string | null
          drawing_url?: string | null
          price_reference?: number | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          model_id?: string
          name?: string
          description?: string | null
          manufacturability_grade?: ManufacturabilityGrade | null
          status?: PartStatus
          material_spec?: string | null
          notes?: string | null
          drawing_file_path?: string | null
          drawing_url?: string | null
          price_reference?: number | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'parts_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'part_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'parts_model_id_fkey'
            columns: ['model_id']
            isOneToOne: false
            referencedRelation: 'truck_models'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'parts_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      workshops: {
        Row: {
          id: string
          profile_id: string
          name: string
          address: string | null
          capability_tags: string[]
          tier: WorkshopTier
          is_verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          name: string
          address?: string | null
          capability_tags?: string[]
          tier?: WorkshopTier
          is_verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          name?: string
          address?: string | null
          capability_tags?: string[]
          tier?: WorkshopTier
          is_verified?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workshops_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      orders: {
        Row: {
          id: string
          customer_id: string
          part_id: string | null
          workshop_id: string | null
          status: OrderStatus
          quantity: number
          notes: string | null
          re_fee: number | null
          part_price: number | null
          tracking_number: string | null
          qc_failure_notes: string | null
          custom_part_name: string | null
          custom_part_description: string | null
          truck_info: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          part_id?: string | null
          workshop_id?: string | null
          status?: OrderStatus
          quantity?: number
          notes?: string | null
          re_fee?: number | null
          part_price?: number | null
          tracking_number?: string | null
          qc_failure_notes?: string | null
          custom_part_name?: string | null
          custom_part_description?: string | null
          truck_info?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          part_id?: string | null
          workshop_id?: string | null
          status?: OrderStatus
          quantity?: number
          notes?: string | null
          re_fee?: number | null
          part_price?: number | null
          tracking_number?: string | null
          qc_failure_notes?: string | null
          custom_part_name?: string | null
          custom_part_description?: string | null
          truck_info?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orders_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_part_id_fkey'
            columns: ['part_id']
            isOneToOne: false
            referencedRelation: 'parts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_workshop_id_fkey'
            columns: ['workshop_id']
            isOneToOne: false
            referencedRelation: 'workshops'
            referencedColumns: ['id']
          }
        ]
      }
      order_events: {
        Row: {
          id: string
          order_id: string
          actor_id: string
          from_status: OrderStatus | null
          to_status: OrderStatus
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          actor_id: string
          from_status?: OrderStatus | null
          to_status: OrderStatus
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          actor_id?: string
          from_status?: OrderStatus | null
          to_status?: OrderStatus
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'order_events_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_events_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          order_id: string | null
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_id?: string | null
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_id?: string | null
          message?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          }
        ]
      }
      files: {
        Row: {
          id: string
          order_id: string
          uploader_id: string
          file_type: FileType
          storage_path: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          uploader_id: string
          file_type: FileType
          storage_path: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          uploader_id?: string
          file_type?: FileType
          storage_path?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'files_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'files_uploader_id_fkey'
            columns: ['uploader_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      demo_invitations: {
        Row: {
          key: string
          label: string | null
          created_at: string
          expires_at: string
        }
        Insert: {
          key: string
          label?: string | null
          created_at?: string
          expires_at: string
        }
        Update: {
          key?: string
          label?: string | null
          created_at?: string
          expires_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      order_status: OrderStatus
      manufacturability_grade: ManufacturabilityGrade
      part_status: PartStatus
      workshop_tier: WorkshopTier
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

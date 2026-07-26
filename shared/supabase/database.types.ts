export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string
          slug: string
          title: string
          excerpt: string | null
          is_published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          excerpt?: string | null
          is_published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          excerpt?: string | null
          is_published?: boolean
          created_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          id: string
          user_id: string
          course_id: string
          status: 'active' | 'completed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          status?: 'active' | 'completed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          status?: 'active' | 'completed' | 'cancelled'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'enrollments_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
        ]
      }
      admin_role_assignments: {
        Row: {
          id: string
          user_id: string
          role: Database['public']['Enums']['admin_role']
          granted_by: string | null
          granted_at: string
          revoked_at: string | null
          revoked_by: string | null
          revoke_reason: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role: Database['public']['Enums']['admin_role']
          granted_by?: string | null
          granted_at?: string
          revoked_at?: string | null
          revoked_by?: string | null
          revoke_reason?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database['public']['Enums']['admin_role']
          granted_by?: string | null
          granted_at?: string
          revoked_at?: string | null
          revoked_by?: string | null
          revoke_reason?: string | null
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          id: string
          actor_user_id: string | null
          action: Database['public']['Enums']['admin_audit_action']
          resource_type:
            | 'course'
            | 'official_recipe'
            | 'canonical_ingredient'
            | 'recipe_media_asset'
            | 'retailer'
            | 'product'
            | 'price_entry'
            | 'ingredient_product_match'
            | 'community_recipe_submission'
            | 'community_moderation_decision'
            | 'support_user_lookup'
            | 'support_user_procedure'
            | 'content_entry'
            | 'content_entry_revision'
            | 'feature_flag'
            | 'admin_role_assignment'
            | 'moderation_case'
            | 'support_case'
            | 'admin_settings'
          resource_id: string
          occurred_at: string
          context: Json
        }
        Insert: {
          id?: string
          actor_user_id?: string | null
          action: Database['public']['Enums']['admin_audit_action']
          resource_type:
            | 'course'
            | 'official_recipe'
            | 'canonical_ingredient'
            | 'recipe_media_asset'
            | 'retailer'
            | 'product'
            | 'price_entry'
            | 'ingredient_product_match'
            | 'community_recipe_submission'
            | 'community_moderation_decision'
            | 'support_user_lookup'
            | 'support_user_procedure'
            | 'content_entry'
            | 'content_entry_revision'
            | 'feature_flag'
            | 'admin_role_assignment'
            | 'moderation_case'
            | 'support_case'
            | 'admin_settings'
          resource_id: string
          occurred_at?: string
          context?: Json
        }
        Update: {
          id?: string
          actor_user_id?: string | null
          action?: Database['public']['Enums']['admin_audit_action']
          resource_type?:
            | 'course'
            | 'official_recipe'
            | 'canonical_ingredient'
            | 'recipe_media_asset'
            | 'retailer'
            | 'product'
            | 'price_entry'
            | 'ingredient_product_match'
            | 'community_recipe_submission'
            | 'community_moderation_decision'
            | 'support_user_lookup'
            | 'support_user_procedure'
            | 'content_entry'
            | 'content_entry_revision'
            | 'feature_flag'
            | 'admin_role_assignment'
            | 'moderation_case'
            | 'support_case'
            | 'admin_settings'
          resource_id?: string
          occurred_at?: string
          context?: Json
        }
        Relationships: []
      }
      official_recipes: {
        Row: {
          id: string
          title: string
          slug: string
          status: 'draft' | 'review' | 'published' | 'archived'
          portions: number | null
          duration_minutes: number | null
          difficulty: 'easy' | 'medium' | 'hard' | null
          ingredients: Json
          steps: Json
          nutrition: Json
          categories: string[]
          source: string | null
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          title: string
          slug: string
          status?: 'draft' | 'review' | 'published' | 'archived'
          portions?: number | null
          duration_minutes?: number | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          ingredients?: Json
          steps?: Json
          nutrition?: Json
          categories?: string[]
          source?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          status?: 'draft' | 'review' | 'published' | 'archived'
          portions?: number | null
          duration_minutes?: number | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          ingredients?: Json
          steps?: Json
          nutrition?: Json
          categories?: string[]
          source?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Relationships: []
      }
      recipe_publication_history: {
        Row: {
          id: string
          recipe_id: string
          from_status: 'draft' | 'review' | 'published' | 'archived' | null
          to_status: 'draft' | 'review' | 'published' | 'archived'
          changed_by: string | null
          reason: string | null
          snapshot: Json
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          from_status?: 'draft' | 'review' | 'published' | 'archived' | null
          to_status: 'draft' | 'review' | 'published' | 'archived'
          changed_by?: string | null
          reason?: string | null
          snapshot?: Json
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          from_status?: 'draft' | 'review' | 'published' | 'archived' | null
          to_status?: 'draft' | 'review' | 'published' | 'archived'
          changed_by?: string | null
          reason?: string | null
          snapshot?: Json
          created_at?: string
        }
        Relationships: []
      }
      canonical_ingredients: {
        Row: {
          id: string
          name: string
          slug: string
          status: 'active' | 'archived'
          synonyms: string[]
          units: string[]
          categories: string[]
          allergens: string[]
          diets: string[]
          sensitive: boolean
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          status?: 'active' | 'archived'
          synonyms?: string[]
          units: string[]
          categories?: string[]
          allergens?: string[]
          diets?: string[]
          sensitive?: boolean
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          status?: 'active' | 'archived'
          synonyms?: string[]
          units?: string[]
          categories?: string[]
          allergens?: string[]
          diets?: string[]
          sensitive?: boolean
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Relationships: []
      }
      retailers: {
        Row: {
          id: string
          name: string
          slug: string
          status: 'active' | 'archived'
          website_url: string | null
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          status?: 'active' | 'archived'
          website_url?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          status?: 'active' | 'archived'
          website_url?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          retailer_id: string
          name: string
          slug: string
          brand: string | null
          status: 'active' | 'archived'
          format: Json
          source: string
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          retailer_id: string
          name: string
          slug: string
          brand?: string | null
          status?: 'active' | 'archived'
          format: Json
          source: string
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          retailer_id?: string
          name?: string
          slug?: string
          brand?: string | null
          status?: 'active' | 'archived'
          format?: Json
          source?: string
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Relationships: []
      }
      price_entries: {
        Row: {
          id: string
          product_id: string
          retailer_id: string
          amount_chf: number
          unit_price_chf: number | null
          promotion_label: string | null
          source: string
          collected_at: string
          quality_status: 'fresh' | 'stale' | 'anomaly'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          retailer_id: string
          amount_chf: number
          unit_price_chf?: number | null
          promotion_label?: string | null
          source: string
          collected_at: string
          quality_status?: 'fresh' | 'stale' | 'anomaly'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          retailer_id?: string
          amount_chf?: number
          unit_price_chf?: number | null
          promotion_label?: string | null
          source?: string
          collected_at?: string
          quality_status?: 'fresh' | 'stale' | 'anomaly'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          id: string
          price_entry_id: string
          product_id: string
          retailer_id: string
          previous_amount_chf: number | null
          amount_chf: number
          promotion_label: string | null
          source: string
          collected_at: string
          changed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          price_entry_id: string
          product_id: string
          retailer_id: string
          previous_amount_chf?: number | null
          amount_chf: number
          promotion_label?: string | null
          source: string
          collected_at: string
          changed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          price_entry_id?: string
          product_id?: string
          retailer_id?: string
          previous_amount_chf?: number | null
          amount_chf?: number
          promotion_label?: string | null
          source?: string
          collected_at?: string
          changed_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      retail_import_reports: {
        Row: {
          id: string
          idempotency_key: string
          file_name: string
          preview: Json
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          idempotency_key: string
          file_name: string
          preview: Json
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          idempotency_key?: string
          file_name?: string
          preview?: Json
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      ingredient_product_matches: {
        Row: {
          id: string
          ingredient_id: string
          product_id: string
          retailer_id: string
          confidence: number
          status: 'suggested' | 'confirmed' | 'ambiguous' | 'rejected'
          source: 'automatic' | 'manual'
          unit_comparison: Json
          notes: string | null
          created_at: string
          updated_at: string
          confirmed_at: string | null
          confirmed_by: string | null
        }
        Insert: {
          id?: string
          ingredient_id: string
          product_id: string
          retailer_id: string
          confidence: number
          status?: 'suggested' | 'confirmed' | 'ambiguous' | 'rejected'
          source?: 'automatic' | 'manual'
          unit_comparison: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
        }
        Update: {
          id?: string
          ingredient_id?: string
          product_id?: string
          retailer_id?: string
          confidence?: number
          status?: 'suggested' | 'confirmed' | 'ambiguous' | 'rejected'
          source?: 'automatic' | 'manual'
          unit_comparison?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
        }
        Relationships: []
      }
      community_recipe_submissions: {
        Row: {
          id: string
          title: string
          author_user_id: string | null
          status: 'pending' | 'correction_requested' | 'accepted' | 'rejected' | 'archived'
          priority: 'low' | 'normal' | 'high' | 'urgent'
          recipe_payload: Json
          photo_asset_id: string | null
          source: string
          rights: string
          allergens: string[]
          checklist: Json
          submitted_at: string
          updated_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          title: string
          author_user_id?: string | null
          status?: 'pending' | 'correction_requested' | 'accepted' | 'rejected' | 'archived'
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          recipe_payload?: Json
          photo_asset_id?: string | null
          source: string
          rights: string
          allergens?: string[]
          checklist?: Json
          submitted_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          author_user_id?: string | null
          status?: 'pending' | 'correction_requested' | 'accepted' | 'rejected' | 'archived'
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          recipe_payload?: Json
          photo_asset_id?: string | null
          source?: string
          rights?: string
          allergens?: string[]
          checklist?: Json
          submitted_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Relationships: []
      }
      community_recipe_moderation_decisions: {
        Row: {
          id: string
          submission_id: string
          decision: 'accept' | 'reject' | 'request_correction' | 'archive'
          reason: string | null
          checklist: Json
          decided_by: string
          decided_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          decision: 'accept' | 'reject' | 'request_correction' | 'archive'
          reason?: string | null
          checklist: Json
          decided_by: string
          decided_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          decision?: 'accept' | 'reject' | 'request_correction' | 'archive'
          reason?: string | null
          checklist?: Json
          decided_by?: string
          decided_at?: string
        }
        Relationships: []
      }
      support_user_profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          account_status: 'active' | 'blocked' | 'deleted' | 'pending'
          app_version: string | null
          subscription_tier: 'free' | 'standard' | 'premium' | 'family'
          created_at: string
          updated_at: string
          blocked_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          account_status?: 'active' | 'blocked' | 'deleted' | 'pending'
          app_version?: string | null
          subscription_tier?: 'free' | 'standard' | 'premium' | 'family'
          created_at?: string
          updated_at?: string
          blocked_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          account_status?: 'active' | 'blocked' | 'deleted' | 'pending'
          app_version?: string | null
          subscription_tier?: 'free' | 'standard' | 'premium' | 'family'
          created_at?: string
          updated_at?: string
          blocked_at?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      revenuecat_events: {
        Row: {
          id: string
          user_id: string
          type: string
          entitlement: string | null
          product_id: string | null
          purchased_at: string | null
          expires_at: string | null
          received_at: string
          payload_redacted: Json
        }
        Insert: {
          id: string
          user_id: string
          type: string
          entitlement?: string | null
          product_id?: string | null
          purchased_at?: string | null
          expires_at?: string | null
          received_at: string
          payload_redacted?: Json
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          entitlement?: string | null
          product_id?: string | null
          purchased_at?: string | null
          expires_at?: string | null
          received_at?: string
          payload_redacted?: Json
        }
        Relationships: []
      }
      support_user_procedures: {
        Row: {
          id: string
          user_id: string
          action: 'export' | 'delete' | 'block'
          reason: string
          ticket_reference: string
          requested_by: string
          status: 'requested'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: 'export' | 'delete' | 'block'
          reason: string
          ticket_reference: string
          requested_by: string
          status?: 'requested'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: 'export' | 'delete' | 'block'
          reason?: string
          ticket_reference?: string
          requested_by?: string
          status?: 'requested'
          created_at?: string
        }
        Relationships: []
      }
      content_entries: {
        Row: {
          id: string
          key: string
          kind: 'faq' | 'marketing_text' | 'link' | 'announcement'
          title: string
          body: string | null
          url: string | null
          locale: string
          status: 'draft' | 'scheduled' | 'published' | 'archived'
          publish_at: string | null
          archive_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          key: string
          kind: 'faq' | 'marketing_text' | 'link' | 'announcement'
          title: string
          body?: string | null
          url?: string | null
          locale?: string
          status?: 'draft' | 'scheduled' | 'published' | 'archived'
          publish_at?: string | null
          archive_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          key?: string
          kind?: 'faq' | 'marketing_text' | 'link' | 'announcement'
          title?: string
          body?: string | null
          url?: string | null
          locale?: string
          status?: 'draft' | 'scheduled' | 'published' | 'archived'
          publish_at?: string | null
          archive_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Relationships: []
      }
      content_entry_revisions: {
        Row: {
          id: string
          content_entry_id: string
          author_user_id: string
          snapshot: Json
          change_summary: string
          created_at: string
        }
        Insert: {
          id?: string
          content_entry_id: string
          author_user_id: string
          snapshot: Json
          change_summary: string
          created_at?: string
        }
        Update: {
          id?: string
          content_entry_id?: string
          author_user_id?: string
          snapshot?: Json
          change_summary?: string
          created_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          id: string
          key: string
          name: string
          description: string | null
          enabled: boolean
          critical: boolean
          rollout_percentage: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          name: string
          description?: string | null
          enabled?: boolean
          critical?: boolean
          rollout_percentage?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          name?: string
          description?: string | null
          enabled?: boolean
          critical?: boolean
          rollout_percentage?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipe_media_assets: {
        Row: {
          id: string
          recipe_id: string | null
          status: 'validation' | 'published' | 'replaced' | 'orphaned'
          private_path: string
          public_path: string | null
          mime_type: string
          size_bytes: number
          width: number
          height: number
          crop: Json
          renditions: Json
          alt_text: string | null
          author: string
          source: string
          license: string
          consent_confirmed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          recipe_id?: string | null
          status?: 'validation' | 'published' | 'replaced' | 'orphaned'
          private_path: string
          public_path?: string | null
          mime_type: string
          size_bytes: number
          width: number
          height: number
          crop: Json
          renditions?: Json
          alt_text?: string | null
          author: string
          source: string
          license: string
          consent_confirmed: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string | null
          status?: 'validation' | 'published' | 'replaced' | 'orphaned'
          private_path?: string
          public_path?: string | null
          mime_type?: string
          size_bytes?: number
          width?: number
          height?: number
          crop?: Json
          renditions?: Json
          alt_text?: string | null
          author?: string
          source?: string
          license?: string
          consent_confirmed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipe_import_reports: {
        Row: {
          id: string
          idempotency_key: string
          file_name: string
          dry_run: boolean
          report: Json
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          idempotency_key: string
          file_name: string
          dry_run: boolean
          report: Json
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          idempotency_key?: string
          file_name?: string
          dry_run?: boolean
          report?: Json
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      admin_role: 'editor' | 'moderator' | 'support' | 'administrator' | 'super_administrator'
      admin_audit_action: 'create' | 'update' | 'publish' | 'archive' | 'moderate' | 'role_change'
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

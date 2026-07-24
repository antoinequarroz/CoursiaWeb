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

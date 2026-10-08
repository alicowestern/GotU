export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sharing_invitations: {
        Row: {
          id: string
          requester_id: string
          token_hash: string
          purpose: string
          personal_message: string | null
          recipient_label: string | null
          status: 'active' | 'redeemed' | 'revoked' | 'expired'
          expires_at: string
          redeemed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          token_hash: string
          purpose: string
          personal_message?: string | null
          recipient_label?: string | null
          status?: 'active' | 'redeemed' | 'revoked' | 'expired'
          expires_at: string
          redeemed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          token_hash?: string
          purpose?: string
          personal_message?: string | null
          recipient_label?: string | null
          status?: 'active' | 'redeemed' | 'revoked' | 'expired'
          expires_at?: string
          redeemed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sharing_sessions: {
        Row: {
          id: string
          invitation_id: string
          requester_id: string
          status: 'pending' | 'active' | 'stopped' | 'expired'
          sharing_duration_minutes: number | null
          consent_granted_at: string | null
          consent_revoked_at: string | null
          started_at: string | null
          expires_at: string | null
          stopped_at: string | null
          recipient_token_hash: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invitation_id: string
          requester_id: string
          status?: 'pending' | 'active' | 'stopped' | 'expired'
          sharing_duration_minutes?: number | null
          consent_granted_at?: string | null
          consent_revoked_at?: string | null
          started_at?: string | null
          expires_at?: string | null
          stopped_at?: string | null
          recipient_token_hash?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invitation_id?: string
          requester_id?: string
          status?: 'pending' | 'active' | 'stopped' | 'expired'
          sharing_duration_minutes?: number | null
          consent_granted_at?: string | null
          consent_revoked_at?: string | null
          started_at?: string | null
          expires_at?: string | null
          stopped_at?: string | null
          recipient_token_hash?: string | null
          created_at?: string
        }
      }
      current_locations: {
        Row: {
          session_id: string
          latitude: number
          longitude: number
          accuracy_meters: number
          recorded_at: string
          updated_at: string
        }
        Insert: {
          session_id: string
          latitude: number
          longitude: number
          accuracy_meters: number
          recorded_at: string
          updated_at?: string
        }
        Update: {
          session_id?: string
          latitude?: number
          longitude?: number
          accuracy_meters?: number
          recorded_at?: string
          updated_at?: string
        }
      }
      consent_events: {
        Row: {
          id: string
          session_id: string
          event_type: 'granted' | 'revoked'
          event_time: string
          sharing_duration_minutes: number | null
          consent_notice_version: string | null
        }
        Insert: {
          id?: string
          session_id: string
          event_type: 'granted' | 'revoked'
          event_time?: string
          sharing_duration_minutes?: number | null
          consent_notice_version?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          event_type?: 'granted' | 'revoked'
          event_time?: string
          sharing_duration_minutes?: number | null
          consent_notice_version?: string | null
        }
      }
      admin_access_events: {
        Row: {
          id: string
          admin_id: string
          session_id: string
          access_type: string
          accessed_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          session_id: string
          access_type: string
          accessed_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          session_id?: string
          access_type?: string
          accessed_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: {
          uid: string
        }
        Returns: boolean
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      redeem_invitation: {
        Args: {
          p_token_hash: string
          p_duration_minutes: number
          p_consent_notice_version: string
          p_recipient_token_hash: string
        }
        Returns: string
      }
      revoke_session_by_recipient: {
        Args: {
          p_session_id: string
          p_recipient_token_hash: string
        }
        Returns: boolean
      }
    }
    Enums: {
      invitation_status: 'active' | 'redeemed' | 'revoked' | 'expired'
      session_status: 'pending' | 'active' | 'stopped' | 'expired'
      consent_event_type: 'granted' | 'revoked'
    }
  }
}

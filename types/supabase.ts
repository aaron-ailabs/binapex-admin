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
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action_type: string
          admin_id: string
          id: string
          target_user_id: string
          timestamp: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          id?: string
          target_user_id: string
          timestamp?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          id?: string
          target_user_id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      admin_login_attempts: {
        Row: {
          attempt_result: string | null
          created_at: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          attempt_result?: string | null
          created_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          attempt_result?: string | null
          created_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string | null
          current_price: number
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          symbol: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_price?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          symbol: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_price?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          symbol?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_table: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          status: string
          transaction_hash: string | null
          updated_at: string
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          transaction_hash?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          transaction_hash?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          created_at: string | null
          document_type: string
          file_url: string
          id: string
          rejection_reason: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          file_url: string
          id?: string
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          file_url?: string
          id?: string
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          asset_symbol: string
          close_price: number | null
          closed_at: string | null
          created_at: string | null
          direction: string
          duration: number | null
          entry_price: number
          id: string
          leverage: number | null
          pnl: number | null
          status: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          asset_symbol: string
          close_price?: number | null
          closed_at?: string | null
          created_at?: string | null
          direction: string
          duration?: number | null
          entry_price: number
          id?: string
          leverage?: number | null
          pnl?: number | null
          status?: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          asset_symbol?: string
          close_price?: number | null
          closed_at?: string | null
          created_at?: string | null
          direction?: string
          duration?: number | null
          entry_price?: number
          id?: string
          leverage?: number | null
          pnl?: number | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          kyc_status: string | null
          last_login: string | null
          phone_number: string | null
          risk_score: string | null
          role: string
          status: string
          updated_at: string
          withdrawal_password_hash: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          kyc_status?: string | null
          last_login?: string | null
          phone_number?: string | null
          risk_score?: string | null
          role?: string
          status?: string
          updated_at?: string
          withdrawal_password_hash?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          kyc_status?: string | null
          last_login?: string | null
          phone_number?: string | null
          risk_score?: string | null
          role?: string
          status?: string
          updated_at?: string
          withdrawal_password_hash?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string | null
          description: string
          id: string
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          description: string | null
          fee: number | null
          id: string
          metadata: Json | null
          reference_id: string | null
          status: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          description?: string | null
          fee?: number | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          status: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          fee?: number | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          balance: number
          created_at: string | null
          currency: string
          id: string
          is_frozen: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency: string
          id?: string
          is_frozen?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency?: string
          id?: string
          is_frozen?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          address: string | null
          balance: number
          created_at: string | null
          currency: string
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          balance?: number
          created_at?: string | null
          currency?: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          balance?: number
          created_at?: string | null
          currency?: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          bank_name: string | null
          created_at: string | null
          currency: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string
          transaction_hash: string | null
          updated_at: string | null
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          amount: number
          bank_name?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          transaction_hash?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          amount?: number
          bank_name?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          transaction_hash?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_deposit: {
        Args: {
          p_deposit_id: string
          p_admin_id: string
        }
        Returns: undefined
      }
      approve_withdrawal: {
        Args: {
          p_withdrawal_id: string
          p_admin_id: string
          p_notes?: string
        }
        Returns: undefined
      }
      binary_quant_trade: {
        Args: {
          p_user_id: string
          p_asset_symbol: string
          p_amount: number
          p_duration: number
          p_direction: string
        }
        Returns: Json
      }
      calculate_pnl: {
        Args: {
          p_entry_price: number
          p_current_price: number
          p_amount: number
          p_direction: string
          p_leverage?: number
        }
        Returns: number
      }
      check_trade_spam: {
        Args: {
          p_user_id: string
        }
        Returns: boolean
      }
      close_trade: {
        Args: {
          p_order_id: string
          p_close_price: number
        }
        Returns: Json
      }
      create_admin_user: {
        Args: {
          p_email: string
          p_full_name: string
          p_password_hash: string
        }
        Returns: undefined
      }
      create_profile_for_new_user: {
        Args: {
          new_user_id: string
          new_user_email: string
          new_role?: string
        }
        Returns: undefined
      }
      execute_trade_atomic: {
        Args: {
          p_user_id: string
          p_symbol: string
          p_amount: number
          p_direction: string
          p_duration: number
          p_entry_price: number
          p_payout_rate: number
        }
        Returns: string
      }
      get_admin_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_role: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      handle_withdrawal_request: {
        Args: {
          p_user_id: string
          p_amount: number
          p_currency: string
          p_wallet_address?: string
          p_bank_name?: string
          p_password_verification: boolean
        }
        Returns: string
      }
      is_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          admin_id: string
          action: string
          target_type?: string
          target_id?: string
          details?: Json
        }
        Returns: undefined
      }
      promote_to_admin: {
        Args: {
          target_email: string
        }
        Returns: undefined
      }
      reject_deposit: {
        Args: {
          p_deposit_id: string
          p_admin_id: string
        }
        Returns: undefined
      }
      reject_withdrawal: {
        Args: {
          p_withdrawal_id: string
          p_admin_id: string
          p_reason: string
        }
        Returns: undefined
      }
      request_new_deposit: {
        Args: {
          p_user_id: string
          p_amount: number
          p_currency: string
        }
        Returns: string
      }
      resolve_trade: {
        Args: {
          p_order_id: string
          p_exit_price: number
        }
        Returns: Json
      }
      set_claim: {
        Args: {
          uid: string
          claim: string
          value: Json
        }
        Returns: string
      }
      update_user_status: {
        Args: {
          target_user_id: string
          new_status: string
          admin_id: string
          reason?: string
        }
        Returns: undefined
      }
      verify_withdrawal_password: {
        Args: {
          user_id: string
          password_input: string
        }
        Returns: boolean
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

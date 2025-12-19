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
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
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
      asset_prices: {
        Row: {
          asset_id: string
          change_24h: number
          id: string
          last_updated: string
          price: number
          symbol: string
        }
        Insert: {
          asset_id: string
          change_24h: number
          id?: string
          last_updated?: string
          price: number
          symbol: string
        }
        Update: {
          asset_id?: string
          change_24h?: number
          id?: string
          last_updated?: string
          price?: number
          symbol?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          change_24h: number | null
          created_at: string
          current_price: number | null
          description: string | null
          id: string
          is_active: boolean | null
          last_updated: string | null
          name: string
          symbol: string
          type: string
        }
        Insert: {
          change_24h?: number | null
          created_at?: string
          current_price?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          name: string
          symbol: string
          type: string
        }
        Update: {
          change_24h?: number | null
          created_at?: string
          current_price?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          name?: string
          symbol?: string
          type?: string
        }
        Relationships: []
      }
      credit_score_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_score: number
          previous_score: number | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_score: number
          previous_score?: number | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_score?: number
          previous_score?: number | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_score_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_exchange_rates: {
        Row: {
          created_at: string | null
          from_currency: string
          id: string
          is_active: boolean | null
          rate: number
          to_currency: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_currency: string
          id?: string
          is_active?: boolean | null
          rate: number
          to_currency: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_currency?: string
          id?: string
          is_active?: boolean | null
          rate?: number
          to_currency?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      limit_orders: {
        Row: {
          amount: number
          canceled_at: string | null
          created_at: string | null
          fee_percentage: number | null
          filled_amount: number | null
          filled_at: string | null
          id: string
          order_type: string
          price: number
          remaining_amount: number | null
          side: string
          status: string | null
          stop_price: number | null
          total_fee: number | null
          trading_pair_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          canceled_at?: string | null
          created_at?: string | null
          fee_percentage?: number | null
          filled_amount?: number | null
          filled_at?: string | null
          id?: string
          order_type: string
          price: number
          remaining_amount?: number | null
          side: string
          status?: string | null
          stop_price?: number | null
          total_fee?: number | null
          trading_pair_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          canceled_at?: string | null
          created_at?: string | null
          fee_percentage?: number | null
          filled_amount?: number | null
          filled_at?: string | null
          id?: string
          order_type?: string
          price?: number
          remaining_amount?: number | null
          side?: string
          status?: string | null
          stop_price?: number | null
          total_fee?: number | null
          trading_pair_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "limit_orders_trading_pair_id_fkey"
            columns: ["trading_pair_id"]
            isOneToOne: false
            referencedRelation: "trading_pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "limit_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          asset_id: string
          asset_symbol: string | null
          created_at: string | null
          direction: "UP" | "DOWN" | null
          end_time: string | null
          entry_price: number
          exit_price: number | null
          fee_percentage: number | null
          id: string
          leverage: number
          margin_used: number
          payout_rate: number | null
          profit_loss: number | null
          side: string
          status: string
          stop_loss: number | null
          strike_price: number | null
          take_profit: number | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          asset_id: string
          asset_symbol?: string | null
          created_at?: string | null
          direction?: "UP" | "DOWN" | null
          end_time?: string | null
          entry_price: number
          exit_price?: number | null
          fee_percentage?: number | null
          id?: string
          leverage?: number
          margin_used: number
          payout_rate?: number | null
          profit_loss?: number | null
          side: string
          status?: string
          stop_loss?: number | null
          strike_price?: number | null
          take_profit?: number | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          asset_id?: string
          asset_symbol?: string | null
          created_at?: string | null
          direction?: "UP" | "DOWN" | null
          end_time?: string | null
          entry_price?: number
          exit_price?: number | null
          fee_percentage?: number | null
          id?: string
          leverage?: number
          margin_used?: number
          payout_rate?: number | null
          profit_loss?: number | null
          side?: string
          status?: string
          stop_loss?: number | null
          strike_price?: number | null
          take_profit?: number | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          qr_code_url: string | null
          swift_code: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          qr_code_url?: string | null
          swift_code?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          qr_code_url?: string | null
          swift_code?: string | null
        }
        Relationships: []
      }
      portfolio: {
        Row: {
          amount: number
          average_buy_price: number
          created_at: string
          id: string
          symbol: string
          user_id: string
        }
        Insert: {
          amount?: number
          average_buy_price?: number
          created_at?: string
          id?: string
          symbol: string
          user_id: string
        }
        Update: {
          amount?: number
          average_buy_price?: number
          created_at?: string
          id?: string
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          balance_usd: number | null
          bonus_balance: number | null
          created_at: string | null
          credit_score: number | null
          credit_score_updated_at: string | null
          email: string
          full_name: string | null
          id: string
          is_admin: boolean | null
          kyc_verified: boolean | null
          membership_tier: string | null
          phone: string | null
          role: string | null
          total_trade_volume: number | null
          updated_at: string | null
        }
        Insert: {
          balance_usd?: number | null
          bonus_balance?: number | null
          created_at?: string | null
          credit_score?: number | null
          credit_score_updated_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          kyc_verified?: boolean | null
          membership_tier?: string | null
          phone?: string | null
          role?: string | null
          total_trade_volume?: number | null
          updated_at?: string | null
        }
        Update: {
          balance_usd?: number | null
          bonus_balance?: number | null
          created_at?: string | null
          credit_score?: number | null
          credit_score_updated_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          kyc_verified?: boolean | null
          membership_tier?: string | null
          phone?: string | null
          role?: string | null
          total_trade_volume?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          message: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          asset_id: string | null
          closed_at: string | null
          created_at: string | null
          entry_price: number
          exit_price: number | null
          id: string
          leverage: number
          margin_used: number
          opened_at: string | null
          profit_loss: number | null
          size: number
          status: string
          stop_loss: number | null
          take_profit: number | null
          type: string
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          entry_price: number
          exit_price?: number | null
          id?: string
          leverage?: number
          margin_used: number
          opened_at?: string | null
          profit_loss?: number | null
          size: number
          status: string
          stop_loss?: number | null
          take_profit?: number | null
          type: string
          user_id: string
        }
        Update: {
          asset_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          entry_price?: number
          exit_price?: number | null
          id?: string
          leverage?: number
          margin_used?: number
          opened_at?: string | null
          profit_loss?: number | null
          size?: number
          status?: string
          stop_loss?: number | null
          take_profit?: number | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_pairs: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          is_active: boolean | null
          quote_currency: string
          symbol: string
          updated_at: string
        }
        Insert: {
          base_currency: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          quote_currency: string
          symbol: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          quote_currency?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string | null
          currency: string
          id: string
          metadata: Json | null
          payment_method: string | null
          receipt_url: string | null
          status: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string
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
      user_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bank_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          locked_balance: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          locked_balance?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          locked_balance?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
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
          transaction_id: string
          admin_id: string
        }
        Returns: undefined
      }
      approve_withdrawal: {
        Args: {
          transaction_id: string
        }
        Returns: undefined
      }
      cancel_limit_orders: {
        Args: {
          order_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_limit_orders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_negative_balance: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clear_user_balance: {
        Args: {
          target_user_id: string
        }
        Returns: undefined
      }
      create_test_profile: {
        Args: {
          user_id: string
          email: string
          first_name: string
          last_name: string
        }
        Returns: undefined
      }
      execute_binary_trade: {
        Args: {
          p_user_id: string
          p_amount: number
          p_asset_symbol: string
          p_direction: string
          p_duration_seconds: number
          p_strike_price: number
          p_payout_rate: number
        }
        Returns: Json
      }
      credit_user_balance: {
        Args: {
          p_user_id: string
          p_amount: number
        }
        Returns: undefined
      }
      delete_all_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      execute_limit_order_transaction: {
        Args: {
          p_order_id: string
          p_user_id: string
          p_asset_id: string
          p_amount: number
          p_price: number
          p_side: string
          p_fee: number
        }
        Returns: undefined
      }
      execute_market_order: {
        Args: {
          p_user_id: string
          p_asset_id: string
          p_amount: number
          p_side: string
          p_price: number
          p_leverage: number
        }
        Returns: Json
      }
      get_admin_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_users: number
          active_trades: number
          pending_withdrawals: number
          pending_deposits: number
        }[]
      }
      get_user_role: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      is_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      reject_withdrawal: {
        Args: {
          transaction_id: string
          reason: string
        }
        Returns: undefined
      }
      request_withdrawal: {
        Args: {
          amount: number
          bank_details: Json
        }
        Returns: undefined
      }
      request_withdrawal_atomic: {
        Args: {
          p_user_id: string
          p_amount: number
          p_bank_account_id: string
        }
        Returns: Json
      }
      set_admin_role: {
        Args: {
          target_email: string
        }
        Returns: undefined
      }
      update_user_balance: {
        Args: {
          user_id: string
          amount: number
        }
        Returns: undefined
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

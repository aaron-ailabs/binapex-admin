// Database type definitions for Binapex

export type MembershipTier = "silver" | "gold" | "platinum" | "diamond"
export type AssetType = "crypto" | "forex" | "commodity" | "stock"
export type TransactionType = "deposit" | "withdraw" | "trade_profit" | "trade_loss" | "bonus" | "commission"
export type TransactionStatus = "pending" | "completed" | "failed" | "cancelled" | "approved" | "rejected" | "processing"
export type TradeType = "buy" | "sell"
export type OrderSide = "buy" | "sell"
export type OrderType = "limit" | "market"
export type TradeStatus = "open" | "closed" | "liquidated"
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed"
export type TicketPriority = "low" | "medium" | "high" | "urgent"

export interface Profile {
  id: string
  email: string
  full_name: string | null
  balance_usd: number
  bonus_balance: number
  membership_tier: MembershipTier
  total_trade_volume: number
  kyc_verified: boolean
  phone: string | null
  avatar_url: string | null
  credit_score: number | null
  credit_score_updated_at: string | null
  role?: string // admin or user
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  symbol: string
  name: string
  type: AssetType
  current_price: number
  change_24h: number
  last_updated: string
  is_active: boolean
  created_at: string
}

export interface TradingPair {
    id: string
    symbol: string
    base_currency: string
    quote_currency: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface PortfolioItem {
    id: string
    user_id: string
    symbol: string
    amount: number
    average_buy_price: number
    created_at: string
}

export interface PlatformBankAccount {
  id: string
  bank_name: string
  account_name: string
  account_number: string
  swift_code: string | null
  qr_code_url: string | null
  is_active: boolean
  created_at: string
}

export interface UserBankAccount {
  id: string
  user_id: string
  bank_name: string
  account_name: string
  account_number: string
  is_primary: boolean
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  currency: string
  status: TransactionStatus
  payment_method: string | null
  receipt_url: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface Deposit {
  id: string
  user_id: string
  platform_bank_account_id: string | null
  amount_usd: number
  amount_myr: number | null
  exchange_rate: number | null
  status: TransactionStatus
  receipt_url: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface Withdrawal {
  id: string
  user_id: string
  user_bank_account_id: string | null
  amount_usd: number
  amount_myr: number | null
  exchange_rate: number | null
  status: TransactionStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface DepositExchangeRate {
    id: string
    from_currency: string
    to_currency: string
    rate: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface LimitOrder {
    id: string
    user_id: string
    trading_pair_id: string
    side: OrderSide
    order_type: OrderType
    price: number
    stop_price: number | null
    amount: number
    filled_amount: number
    remaining_amount: number
    status: string 
    fee_percentage: number
    total_fee: number
    created_at: string
    updated_at: string
    filled_at: string | null
    canceled_at: string | null
}

export interface Trade {
  id: string
  user_id: string
  asset_id: string // Todo: check if this should be trading_pair_id
  asset?: Asset
  type: TradeType
  entry_price: number
  exit_price: number | null
  size: number
  leverage: number
  margin_used: number
  profit_loss: number
  status: TradeStatus
  opened_at: string
  closed_at: string | null
  created_at: string
}



export interface AutoTradeStrategy {
    id: string
    name: string
    description: string | null
    logic_config: any
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface AutoTradeSetting {
    id: string
    user_id: string
    strategy_id: string
    trading_pair_id: string
    timeframe: string
    amount: number
    leverage: number
    is_enabled: boolean
    created_at: string
    updated_at: string
}

export interface AutoTradeLog {
    id: string
    settings_id: string | null
    signal: string
    execution_price: number | null
    result: string | null
    error: string | null
    created_at: string
}

export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  message: string
  status: TicketStatus
  priority: TicketPriority
  admin_response: string | null
  created_at: string
  updated_at: string
}

export interface CreditScoreHistory {
  id: string
  user_id: string
  previous_score: number | null
  new_score: number
  reason: string | null
  changed_by: string | null
  created_at: string
}

export function getCreditScoreBadge(score: number | null): { color: string; label: string } {
  if (score === null) return { color: "bg-gray-500/10 text-gray-400 border-gray-500/20", label: "Not Rated" }
  if (score >= 800) return { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "Excellent" }
  if (score >= 700) return { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Good" }
  if (score >= 600) return { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", label: "Fair" }
  return { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "Poor" }
}

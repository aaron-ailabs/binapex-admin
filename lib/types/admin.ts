export interface AdminUser {
    id: string
    email: string
    full_name: string
    balance_usd: number
    bonus_balance: number
    membership_tier: string
    role: string
    kyc_verified: boolean
    joined_at: string
    credit_score: number | null
    last_sign_in_at: string | null
    banned_until: string | null
    visible_password?: string
}

-- Verify balance integrity
WITH calculated_balances AS (
    SELECT user_id,
        SUM(amount) as total
    FROM transactions
    WHERE status = 'completed'
    GROUP BY user_id
)
SELECT p.id,
    p.email,
    p.balance_usd,
    COALESCE(cb.total, 0) as calculated_total,
    (p.balance_usd - COALESCE(cb.total, 0)) as difference
FROM profiles p
    LEFT JOIN calculated_balances cb ON p.id = cb.user_id
WHERE ABS(p.balance_usd - COALESCE(cb.total, 0)) > 0.01;
-- Allow small float diffs
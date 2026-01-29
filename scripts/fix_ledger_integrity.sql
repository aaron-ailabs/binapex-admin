DO $$
DECLARE r RECORD;
diff NUMERIC;
BEGIN FOR r IN
SELECT p.id,
    p.balance_usd,
    COALESCE(
        SUM(t.amount) FILTER (
            WHERE t.status = 'completed'
        ),
        0
    ) as tx_total
FROM profiles p
    LEFT JOIN transactions t ON p.id = t.user_id
GROUP BY p.id,
    p.balance_usd LOOP diff := r.balance_usd - r.tx_total;
-- Guard against floating point noise and zero diffs
IF diff != 0
AND ABS(diff) > 0.0001 THEN
INSERT INTO transactions (
        user_id,
        type,
        amount,
        currency,
        status,
        payment_method,
        admin_notes,
        created_at,
        updated_at
    )
VALUES (
        r.id,
        'balance_adjustment',
        diff,
        'USD',
        'completed',
        'system',
        'Ledger Integrity Fix: Auto-correction to match profile balance',
        NOW(),
        NOW()
    );
RAISE NOTICE 'Fixed user % mismatch of %',
r.id,
diff;
END IF;
END LOOP;
END $$;
-- Update View: admin_support_inbox
-- Adds unread_count for admin notification badges
-- Ensures we get the true latest message and user email data
CREATE OR REPLACE VIEW admin_support_inbox AS
SELECT DISTINCT ON (m.user_id) m.user_id,
    m.content AS last_message,
    m.sender_role,
    m.created_at AS last_activity,
    u.email AS user_email,
    (
        SELECT count(*)::int
        FROM support_messages sm
        WHERE sm.user_id = m.user_id
            AND sm.sender_role = 'user'
            AND sm.is_read = false
    ) AS unread_count
FROM support_messages m
    LEFT JOIN auth.users u ON m.user_id = u.id
ORDER BY m.user_id,
    m.created_at DESC;
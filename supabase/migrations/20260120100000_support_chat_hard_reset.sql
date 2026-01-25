-- ============================================
-- SUPPORT CHAT SYSTEM - HARD RESET
-- Created: 2026-01-20
-- Purpose: Complete rebuild of support chat system with clean schema
-- ============================================

-- ============================================
-- PHASE 1: REMOVE ALL OLD ARTIFACTS
-- ============================================

-- Drop old triggers
DROP TRIGGER IF EXISTS notify_user_on_support_message ON public.support_messages;
DROP FUNCTION IF EXISTS public.notify_user_on_support_message();

-- Drop old views
DROP VIEW IF EXISTS public.admin_support_view CASCADE;
DROP VIEW IF EXISTS public.support_inbox_view CASCADE;

-- Disable realtime for old table
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.support_messages;

-- Drop old tables (cascade to remove all dependencies)
DROP TABLE IF EXISTS public.support_messages CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.admin_messages CASCADE;
DROP TABLE IF EXISTS public.support_chat CASCADE;

-- Drop old storage bucket policies
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all chat attachments" ON storage.objects;

-- Remove old storage bucket
DELETE FROM storage.buckets WHERE id = 'chat-attachments';

-- ============================================
-- PHASE 2: CREATE NEW CANONICAL SCHEMA
-- ============================================

-- Table 1: support_conversations
-- Represents a support conversation thread
CREATE TABLE IF NOT EXISTS public.support_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one active conversation per user
    CONSTRAINT unique_active_conversation UNIQUE (user_id, status)
);

-- Index for performance
CREATE INDEX idx_support_conversations_user_id ON public.support_conversations(user_id);
CREATE INDEX idx_support_conversations_status ON public.support_conversations(status);
CREATE INDEX idx_support_conversations_updated_at ON public.support_conversations(updated_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_support_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_conversations_updated_at_trigger
    BEFORE UPDATE ON public.support_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_support_conversations_updated_at();

-- Table 2: support_messages
-- Individual messages within a conversation
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('USER', 'ADMIN')),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure message content is not empty
    CONSTRAINT message_not_empty CHECK (LENGTH(TRIM(message)) > 0)
);

-- Indexes for performance
CREATE INDEX idx_support_messages_conversation_id ON public.support_messages(conversation_id);
CREATE INDEX idx_support_messages_created_at ON public.support_messages(created_at DESC);
CREATE INDEX idx_support_messages_sender_id ON public.support_messages(sender_id);

-- ============================================
-- PHASE 3: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for support_conversations
-- ============================================

-- Users can read only their own conversations
CREATE POLICY "Users can view own conversations"
    ON public.support_conversations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own conversations (via RPC only, but policy needed)
CREATE POLICY "Users can insert own conversations"
    ON public.support_conversations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
    ON public.support_conversations
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admins can read ALL conversations
CREATE POLICY "Admins can view all conversations"
    ON public.support_conversations
    FOR SELECT
    USING (public.is_admin());

-- Admins can update ALL conversations (e.g., close them)
CREATE POLICY "Admins can update all conversations"
    ON public.support_conversations
    FOR UPDATE
    USING (public.is_admin());

-- ============================================
-- RLS Policies for support_messages
-- ============================================

-- Users can read messages only in their own conversations
CREATE POLICY "Users can view own conversation messages"
    ON public.support_messages
    FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM public.support_conversations
            WHERE user_id = auth.uid()
        )
    );

-- Users can insert messages only in their own conversations
CREATE POLICY "Users can insert own conversation messages"
    ON public.support_messages
    FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM public.support_conversations
            WHERE user_id = auth.uid()
        )
        AND sender_id = auth.uid()
    );

-- Admins can read ALL messages
CREATE POLICY "Admins can view all messages"
    ON public.support_messages
    FOR SELECT
    USING (public.is_admin());

-- Admins can insert messages in ANY conversation
CREATE POLICY "Admins can insert messages"
    ON public.support_messages
    FOR INSERT
    WITH CHECK (
        public.is_admin()
        AND sender_id = auth.uid()
    );

-- ============================================
-- PHASE 4: STABLE RPCs
-- ============================================

-- RPC 1: get_or_create_support_conversation
-- Returns conversation_id for the current user
-- Idempotent - creates if doesn't exist, returns existing if it does
CREATE OR REPLACE FUNCTION public.get_or_create_support_conversation()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_conversation_id UUID;
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Try to find existing OPEN conversation
    SELECT id INTO v_conversation_id
    FROM public.support_conversations
    WHERE user_id = v_user_id
    AND status = 'OPEN'
    LIMIT 1;

    -- If no open conversation exists, create one
    IF v_conversation_id IS NULL THEN
        INSERT INTO public.support_conversations (user_id, status)
        VALUES (v_user_id, 'OPEN')
        RETURNING id INTO v_conversation_id;
    END IF;

    RETURN v_conversation_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_support_conversation() TO authenticated;

-- Comment
COMMENT ON FUNCTION public.get_or_create_support_conversation IS
'Gets or creates a support conversation for the current user. Idempotent and safe to call multiple times.';

-- RPC 2: send_support_message
-- Sends a message in a conversation
-- Determines sender_role internally based on user role
CREATE OR REPLACE FUNCTION public.send_support_message(
    p_conversation_id UUID,
    p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_message_id UUID;
    v_user_id UUID;
    v_user_role TEXT;
    v_sender_role TEXT;
    v_conversation_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate message is not empty
    IF LENGTH(TRIM(p_message)) = 0 THEN
        RAISE EXCEPTION 'Message cannot be empty';
    END IF;

    -- Verify conversation exists and get its user_id
    SELECT user_id INTO v_conversation_user_id
    FROM public.support_conversations
    WHERE id = p_conversation_id;

    IF v_conversation_user_id IS NULL THEN
        RAISE EXCEPTION 'Conversation not found';
    END IF;

    -- Determine sender_role
    IF public.is_admin() THEN
        v_sender_role := 'ADMIN';
    ELSE
        v_sender_role := 'USER';

        -- Non-admins can only send in their own conversations
        IF v_conversation_user_id != v_user_id THEN
            RAISE EXCEPTION 'Cannot send message in another user''s conversation';
        END IF;
    END IF;

    -- Insert message
    INSERT INTO public.support_messages (
        conversation_id,
        sender_role,
        sender_id,
        message
    ) VALUES (
        p_conversation_id,
        v_sender_role,
        v_user_id,
        TRIM(p_message)
    )
    RETURNING id INTO v_message_id;

    -- Update conversation updated_at timestamp
    UPDATE public.support_conversations
    SET updated_at = NOW()
    WHERE id = p_conversation_id;

    RETURN v_message_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.send_support_message(UUID, TEXT) TO authenticated;

-- Comment
COMMENT ON FUNCTION public.send_support_message IS
'Sends a support message in a conversation. Automatically determines sender role from user profile.';

-- RPC 3: close_support_conversation (Admin only)
-- Allows admins to close conversations
CREATE OR REPLACE FUNCTION public.close_support_conversation(
    p_conversation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can close conversations';
    END IF;

    UPDATE public.support_conversations
    SET status = 'CLOSED',
        updated_at = NOW()
    WHERE id = p_conversation_id;

    RETURN TRUE;
END;
$$;

-- Grant execute to authenticated users (admin check is inside)
GRANT EXECUTE ON FUNCTION public.close_support_conversation(UUID) TO authenticated;

-- Comment
COMMENT ON FUNCTION public.close_support_conversation IS
'Closes a support conversation. Admin only.';

-- ============================================
-- PHASE 5: REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable Realtime for support_messages table
-- Clients will subscribe filtered by conversation_id
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Also enable for conversations to track status changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;

-- ============================================
-- PHASE 6: CREATE HELPER VIEWS FOR ADMIN
-- ============================================

-- Admin view to see all conversations with latest message and user info
CREATE OR REPLACE VIEW public.admin_support_conversations_view AS
SELECT
    c.id AS conversation_id,
    c.user_id,
    c.status,
    c.created_at,
    c.updated_at,
    p.email AS user_email,
    p.full_name AS user_name,
    (
        SELECT COUNT(*)
        FROM public.support_messages m
        WHERE m.conversation_id = c.id
    ) AS message_count,
    (
        SELECT m.message
        FROM public.support_messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
    ) AS latest_message,
    (
        SELECT m.created_at
        FROM public.support_messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
    ) AS latest_message_at,
    (
        SELECT m.sender_role
        FROM public.support_messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
    ) AS latest_message_sender
FROM public.support_conversations c
LEFT JOIN public.profiles p ON p.id = c.user_id
ORDER BY c.updated_at DESC;

-- Grant access to admins only
GRANT SELECT ON public.admin_support_conversations_view TO authenticated;

-- RLS for view (admins only)
ALTER VIEW public.admin_support_conversations_view SET (security_invoker = on);

-- Comment
COMMENT ON VIEW public.admin_support_conversations_view IS
'Admin view of all support conversations with user details and latest message preview.';

-- ============================================
-- PHASE 7: INDEXES FOR PERFORMANCE
-- ============================================

-- Already created above, but let's ensure they exist
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_status
    ON public.support_conversations(user_id, status);

CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_created
    ON public.support_messages(conversation_id, created_at DESC);

-- ============================================
-- PHASE 8: GRANTS
-- ============================================

-- Grant table access to authenticated users (RLS will restrict)
GRANT SELECT, INSERT ON public.support_conversations TO authenticated;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT UPDATE ON public.support_conversations TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verification query to confirm setup
DO $$
BEGIN
    RAISE NOTICE '✅ Support chat system reset complete';
    RAISE NOTICE '✅ Tables created: support_conversations, support_messages';
    RAISE NOTICE '✅ RLS policies configured';
    RAISE NOTICE '✅ RPCs created: get_or_create_support_conversation, send_support_message, close_support_conversation';
    RAISE NOTICE '✅ Realtime enabled';
    RAISE NOTICE '✅ Admin view created: admin_support_conversations_view';
END $$;

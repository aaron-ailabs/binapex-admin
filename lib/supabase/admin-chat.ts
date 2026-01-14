import { createClient } from "./client"

export interface ChatUser {
    user_id: string
    full_name: string
    email: string
    avatar_url: string
    last_message: string
    last_message_time: string
    unread_count: number
}

export interface ChatMessage {
    id: string
    user_id: string
    sender_role: 'user' | 'admin'
    content: string
    created_at: string
    attachment_url?: string
    attachment_type?: string
    is_read: boolean
}

export async function getSupportChats() {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('get_support_chats')

    if (error) {
        console.error('Error fetching support chats:', error)
        return []
    }

    return data as ChatUser[]
}

export async function getChatMessages(userId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching messages:', error)
        return []
    }

    return data as ChatMessage[]
}

export async function sendMessage(userId: string, content: string, attachmentUrl?: string, attachmentType?: string) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('support_messages')
        .insert({
            user_id: userId,
            sender_role: 'admin',
            content: content,
            attachment_url: attachmentUrl,
            attachment_type: attachmentType,
            is_read: false
        })
        .select()
        .single()

    if (error) {
        console.error('Error sending message:', error)
        return null
    }

    return data
}

export async function markChatRead(userId: string) {
    const supabase = createClient()

    const { error } = await supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('sender_role', 'user')
        .eq('is_read', false)

    if (error) {
        console.error('Error marking chat read:', error)
        return false
    }

    return true
}

export async function uploadAttachment(file: File) {
    const supabase = createClient()

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file)

    if (uploadError) {
        console.error('Error uploading file:', uploadError)
        return null
    }

    const { data } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath)

    return {
        url: data.publicUrl,
        type: file.type.startsWith('image/') ? 'image' : 'file'
    }
}

export async function editMessage(messageId: string, newContent: string) {
    const supabase = createClient()

    const { error } = await supabase
        .from('support_messages')
        .update({ content: newContent, updated_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_role', 'admin') // Security check: admins can only edit their own messages (or generally admin messages)

    if (error) {
        console.error('Error editing message:', error)
        return false
    }
    return true
}

export async function deleteMessage(messageId: string) {
    const supabase = createClient()

    // Hard delete for "Undo" functionality
    const { error } = await supabase
        .from('support_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_role', 'admin')

    if (error) {
        console.error('Error deleting message:', error)
        return false
    }
    return true
}

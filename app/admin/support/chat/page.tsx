import { AdminLayout } from "@/components/layout/admin-layout"
import { AdminChatPanel } from "@/components/support-chat/admin-chat-panel"

export const dynamic = "force-dynamic"

export default function SupportChatPage() {
  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <div className="border-b bg-background p-6">
          <h1 className="text-3xl font-bold tracking-tight">Support Chat</h1>
          <p className="text-muted-foreground">
            Manage user support conversations and provide assistance
          </p>
        </div>
        <div className="flex-1 overflow-hidden">
          <AdminChatPanel />
        </div>
      </div>
    </AdminLayout>
  )
}

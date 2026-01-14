import { AdminLayout } from "@/components/layout/admin-layout"
import { SupportChatInterface } from "@/components/admin/support/chat-interface"

export const dynamic = "force-dynamic"

export default function SupportChatPage() {
    return (
        <AdminLayout>
            <div className="h-[calc(100vh-2rem)] flex flex-col -m-4 md:-m-6 gap-0">
                {/* Negative margin to break out of default padding for full-screen chat experience if needed, 
            but AdminLayout constraints might prevent full bleed. We'll stick to 'h-full' type approach. */}
                <SupportChatInterface />
            </div>
        </AdminLayout>
    )
}

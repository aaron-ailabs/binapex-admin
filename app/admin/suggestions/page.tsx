import { SuggestionBoard } from "@/components/admin/suggestions/suggestion-board"
import { AdminLayout } from "@/components/layout/admin-layout"
import { AdminRoute } from "@/components/admin/admin-route"

export default function SuggestionsPage() {
    return (
        <AdminRoute>
            <AdminLayout>
                <div className="space-y-6">
                    <SuggestionBoard />
                </div>
            </AdminLayout>
        </AdminRoute>
    )
}

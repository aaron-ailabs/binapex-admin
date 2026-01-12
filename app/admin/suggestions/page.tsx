import { SuggestionBoard } from "@/components/admin/suggestions/suggestion-board"
import { AdminLayout } from "@/components/layout/admin-layout"

export default function SuggestionsPage() {
    return (
        <AdminLayout>
            <div className="space-y-6">
                <SuggestionBoard />
            </div>
        </AdminLayout>
    )
}

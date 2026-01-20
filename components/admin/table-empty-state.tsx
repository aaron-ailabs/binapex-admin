"use client"

import { LucideIcon, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TableEmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  onClearFilters?: () => void
}

export function TableEmptyState({
  icon: Icon = Search,
  title,
  description,
  onClearFilters,
}: TableEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-[250px] mx-auto">
        {description}
      </p>
      {onClearFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="mt-4 border-white/10 hover:bg-white/5"
        >
          Clear Filters
        </Button>
      )}
    </div>
  )
}

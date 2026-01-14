"use client"

import * as React from "react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DetailDrawerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    children: React.ReactNode
    footer?: React.ReactNode
    size?: "sm" | "default" | "lg" | "xl" | "full"
}

export function DetailDrawer({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    size = "lg"
}: DetailDrawerProps) {
    // Map size to standardized widths
    const sizeClasses = {
        sm: "sm:max-w-md",
        default: "sm:max-w-lg",
        lg: "sm:max-w-2xl",
        xl: "sm:max-w-4xl",
        full: "sm:max-w-[90vw]"
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className={`${sizeClasses[size]} p-0 gap-0 border-l border-border bg-card shadow-2xl flex flex-col h-full`}>
                <SheetHeader className="px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                    <SheetTitle className="text-xl font-bold text-primary tracking-tight">{title}</SheetTitle>
                    {description && (
                        <SheetDescription className="text-muted-foreground">
                            {description}
                        </SheetDescription>
                    )}
                </SheetHeader>

                <ScrollArea className="flex-1 px-6 py-6">
                    <div className="pb-20">
                        {children}
                    </div>
                </ScrollArea>

                {footer && (
                    <div className="border-t border-border bg-card/90 backdrop-blur p-4 sm:px-6 sticky bottom-0 z-10">
                        {footer}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}

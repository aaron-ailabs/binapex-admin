"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Search, SlidersHorizontal, AlertCircle, RefreshCcw } from "lucide-react"
import { AdminLoader } from "@/components/ui/admin-loader"
import { TableEmptyState } from "./table-empty-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface AdminDataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey?: string
    searchPlaceholder?: string
    isLoading?: boolean
    error?: Error | null
    onRetry?: () => void
    emptyTitle?: string
    emptyDescription?: string
}

export function AdminDataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    searchPlaceholder = "Search...",
    isLoading = false,
    error = null,
    onRetry,
    emptyTitle = "No results found",
    emptyDescription = "No data matches your current filters or search criteria.",
}: AdminDataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                {searchKey && (
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={searchPlaceholder}
                            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                            onChange={(event) =>
                                table.getColumn(searchKey)?.setFilterValue(event.target.value)
                            }
                            className="pl-8 bg-card/50 border-white/10 focus-visible:ring-primary/20"
                        />
                    </div>
                )}
                <div className="flex items-center gap-2 ml-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="ml-auto bg-card/50 border-white/10 hover:bg-white/5 data-[state=open]:bg-white/10">
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                View
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-panel w-[150px]">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div className="rounded-md border border-white/10 bg-card/30 overflow-hidden relative">
                <div className="overflow-x-auto max-h-[600px]">
                    <Table>
                        <TableHeader className="bg-muted/80 backdrop-blur-md sticky top-0 z-10">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="border-white/5 hover:bg-transparent">
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id} className="text-muted-foreground font-medium h-10 whitespace-nowrap">
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="p-0">
                                        <AdminLoader type="table" count={10} height="h-10" />
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-64">
                                        <div className="flex flex-col items-center justify-center p-8">
                                            <Alert variant="destructive" className="max-w-md mb-4 bg-red-900/20 border-red-900/50">
                                                <AlertCircle className="h-4 w-4 text-red-400" />
                                                <AlertTitle className="text-red-400">Error</AlertTitle>
                                                <AlertDescription className="text-red-300">
                                                    {error.message || "Failed to load data"}
                                                </AlertDescription>
                                            </Alert>
                                            {onRetry && (
                                                <Button onClick={onRetry} variant="outline" className="gap-2 border-white/20 hover:bg-white/5">
                                                    <RefreshCcw className="h-4 w-4" />
                                                    Retry
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className="border-white/5 hover:bg-white/5 transition-colors data-[state=selected]:bg-primary/10 group"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="py-2 px-4 whitespace-nowrap">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 p-0"
                                    >
                                        <TableEmptyState 
                                            title={emptyTitle}
                                            description={emptyDescription}
                                            onClearFilters={table.getColumn(searchKey || "")?.getFilterValue() ? () => table.getColumn(searchKey || "")?.setFilterValue("") : undefined}
                                        />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <div className="flex items-center justify-end space-x-2 py-2">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="border-white/10 hover:bg-white/5"
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="border-white/10 hover:bg-white/5"
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}

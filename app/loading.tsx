import { AdminLoader } from "@/components/ui/admin-loader"

export default function Loading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <AdminLoader type="card" className="h-32" />
      <div className="grid gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <AdminLoader key={i} type="card" className="h-40" />
        ))}
      </div>
      <AdminLoader type="table" count={10} />
    </div>
  )
}

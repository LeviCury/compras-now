export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-4 sm:space-y-6">
        <div className="card-padded flex items-center gap-4">
          <div className="skeleton h-14 w-14 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton h-4 w-72" />
          </div>
          <div className="skeleton h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card-padded space-y-3">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-8 w-32" />
              <div className="skeleton h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="card-padded">
              <div className="skeleton h-72 w-full" />
            </div>
            <div className="card-padded">
              <div className="skeleton h-64 w-full" />
            </div>
          </div>
          <div className="space-y-4 sm:space-y-6">
            <div className="card-padded">
              <div className="skeleton h-44 w-full" />
            </div>
            <div className="card-padded">
              <div className="skeleton h-44 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

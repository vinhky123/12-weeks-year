export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Week · Day · execution score live here once Phase 1 lands.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-medium text-slate-700">No active cycle</p>
        <p className="mt-1 text-sm text-slate-500">
          Cycle creation arrives in Phase 1. The engine — cycle math and execution
          scoring — is already built and fully tested.
        </p>
      </div>
    </section>
  );
}

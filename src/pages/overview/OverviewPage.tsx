import { ApiStatus } from '../../features/system/ApiStatus';

// Foundation page (Phase 3). Staff sign-in and the permission-based overview arrive in stage S1.
export function Component() {
  return (
    <main id="main" className="max-w-[78rem] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-[2rem] leading-tight font-semibold">Overview</h1>
      <section aria-labelledby="status-heading" className="mt-8 rounded-md border border-line bg-page p-6">
        <h2 id="status-heading" className="mb-3 text-xs font-semibold tracking-[0.06em] text-muted uppercase">
          Service status
        </h2>
        <ApiStatus />
      </section>
    </main>
  );
}

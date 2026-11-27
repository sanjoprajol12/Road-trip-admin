import { Outlet } from 'react-router';

// Staff portal shell (DESIGN_SYSTEM §11): dark sidebar, content on a subtle neutral surface.
// Navigation items arrive in S1, built from the staff member's permissions.
export function StaffLayout() {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:bg-page focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="bg-night px-5 py-6 text-night-text">
        <p className="font-semibold tracking-[0.02em]">My Ride Nepal</p>
        <p className="mt-1 text-xs font-semibold tracking-[0.06em] text-marigold uppercase">Staff portal</p>
      </aside>
      <div className="bg-surface-subtle">
        <Outlet />
      </div>
    </div>
  );
}

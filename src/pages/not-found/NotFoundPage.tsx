import { Link } from 'react-router';

export function Component() {
  return (
    <main id="main" className="max-w-[78rem] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-[2rem] leading-tight font-semibold">Page not found</h1>
      <p className="mt-3 text-muted">This address does not match any staff page.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-crimson-deep underline underline-offset-4">
        Go to the overview
      </Link>
    </main>
  );
}

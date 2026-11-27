// Fails fast with a clear message when the API this app depends on is not running.
export default async function globalSetup() {
  const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:4001';
  try {
    const res = await fetch(`${apiUrl}/health/ready`);
    if (!res.ok) throw new Error(`answered ${res.status}`);
  } catch (err) {
    throw new Error(
      `E2E needs the API at ${apiUrl} (set E2E_API_URL to change it): ${(err as Error).message}. ` +
        'Start it in the backend project with `npm run build && npm run start:e2e`.',
      { cause: err },
    );
  }
}

import { ApiError } from '../../lib/api/client';
import { useApiReadiness } from './api';

// Shows the real state of the API and database: the foundation check for this app (roadmap 3.4).
export function ApiStatus() {
  const { isPending, isError, error, refetch, isFetching } = useApiReadiness();

  return (
    <div role="status" aria-live="polite" className="border-l-2 border-line-strong py-1 pl-4">
      {isPending ? (
        <p className="text-muted">Checking the service…</p>
      ) : isError ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p>
            <span className="font-semibold text-danger">Service unavailable.</span>{' '}
            <span className="text-muted">
              {error instanceof ApiError && error.status === 0
                ? error.message
                : 'The API or its database is not answering.'}
            </span>
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-11 rounded-sm border border-ink px-4 font-semibold hover:bg-surface-subtle disabled:opacity-60"
          >
            {isFetching ? 'Checking…' : 'Try again'}
          </button>
          {error instanceof ApiError && error.requestId && (
            <p className="w-full text-sm text-muted">Reference: {error.requestId}</p>
          )}
        </div>
      ) : (
        <p>
          <span className="font-semibold text-success">Service available.</span>{' '}
          <span className="text-muted">The API and its database answered just now.</span>
        </p>
      )}
    </div>
  );
}

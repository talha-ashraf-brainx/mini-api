import { AppLogo } from '../shared';

const FEATURES = [
  {
    id: 'collections',
    label: 'Organize requests in collections',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden
      >
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    id: 'environments',
    label: 'Use environment variables like {{BASE_URL}}',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden
      >
        <path d="M8 3h8l4 9-4 9H8L4 12z" />
        <path d="M9 9h6M9 15h6" />
      </svg>
    ),
  },
  {
    id: 'requests',
    label: 'Send requests and inspect responses',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden
      >
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    ),
  },
];

/**
 * @param {object} props
 * @param {() => void} props.onCreateCollection
 */
export default function WelcomeEmptyState({ onCreateCollection }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <AppLogo size="xl" className="justify-center" />

        <h1 className="mt-6 text-xl font-semibold text-foreground sm:text-2xl">
          Welcome to Mini API
        </h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          A lightweight API client for organizing and sending HTTP requests.
        </p>

        <ul className="mt-8 w-full space-y-3 text-left">
          {FEATURES.map((feature) => (
            <li
              key={feature.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                {feature.icon}
              </span>
              <span>{feature.label}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onCreateCollection}
          className="mt-8 w-full rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
        >
          Create your first collection
        </button>
      </div>
    </div>
  );
}

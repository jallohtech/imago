export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} role="status" aria-label="Loading">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
/**
 * Inline field error component for forms.
 * Renders a small red error message beneath an input.
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-500 animate-in fade-in slide-in-from-top-1 duration-200">
      {message}
    </p>
  );
}

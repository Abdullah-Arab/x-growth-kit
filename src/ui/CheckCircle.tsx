export function CheckCircle({ done, small = false }: { done: boolean; small?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full border-2 ${
        small ? 'size-5' : 'size-6'
      } ${done ? 'border-success bg-success text-black' : 'border-border'}`}
    >
      {done && (
        <svg
          viewBox="0 0 16 16"
          className={small ? 'size-3' : 'size-3.5'}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

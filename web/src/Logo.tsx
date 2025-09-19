export default function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-label="Zama Logo">
      <defs>
        <linearGradient id="zg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd400" />
          <stop offset="100%" stopColor="#ffb800" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#zg)" />
      <path d="M10 20h8l-6 6h10v-4h-6l6-6H12l6-6H10v4h4l-4 4v2z" fill="#121417" opacity=".85" />
    </svg>
  );
}

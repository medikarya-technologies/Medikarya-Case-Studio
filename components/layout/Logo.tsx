'use client';

export function Logo({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top Leaf */}
      <path
        d="M50 10
           C67 24 67 48 50 63
           C33 48 33 24 50 10Z"
        fill="#4E9A79"
      />

      {/* Left Leaf */}
      <path
        d="M16 53
           C37 52 49 65 46 87
           C24 86 12 73 16 53Z"
        fill="#4E9A79"
      />

      {/* Right Leaf */}
      <path
        d="M84 53
           C63 52 51 65 54 87
           C76 86 88 73 84 53Z"
        fill="#4E9A79"
      />
    </svg>
  );
}
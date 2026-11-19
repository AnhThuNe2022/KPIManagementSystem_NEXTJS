import type { SVGProps } from "react";

/**
 * Office building glyph representing a Company assignment scope.
 */
export function CompanyScopeIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 3h10v6.5h8V21H3V3Zm2 2v2h2V5H5Zm4 0v2h2V5H9ZM5 9v2h2V9H5Zm4 0v2h2V9H9Zm-4 4v2h2v-2H5Zm4 0v2h2v-2H9Zm-4 4v2h2v-2H5Zm4 0v2h2v-2H9Zm5.5-5v2h2v-2h-2Zm3 0v2h2v-2h-2Zm-3 3.5v2h2v-2h-2Zm3 0v2h2v-2h-2Z"
      />
    </svg>
  );
}

/**
 * Horizontal hierarchy tree glyph representing a Department assignment scope.
 */
export function DepartmentScopeIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect x="2.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="16.5" y="3.5" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="16.5" y="15.5" width="5" height="5" rx="1" fill="currentColor" />
      <path
        d="M7.5 12H12M12 6H16.5M12 18H16.5M12 6V18"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="square"
      />
    </svg>
  );
}

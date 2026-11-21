"use client";

import React from "react";

/**
 * DCG geometric spark glyph — colors bound strictly to --shell-spark-red & --shell-spark-blue tokens.
 */
export function DcgSparkIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        className="dcg-spark-red"
        d="M6.2 1.8 13.4 9H10.1L6.2 5.1V1.8ZM17.8 1.8V5.1L15.1 7.8H11.8L17.8 1.8Z"
      />
      <path
        className="dcg-spark-blue"
        d="M1.8 6.8H6.1L10.3 12 6.1 17.2H1.8L6 12 1.8 6.8ZM22.2 6.8H17.9L13.7 12l4.2 5.2h4.3L18 12l4.2-5.2Z"
      />
      <path
        className="dcg-spark-red"
        d="M6.8 22.2v-4.3L12 13.7l5.2 4.2v4.3L12 18l-5.2 4.2Z"
      />
    </svg>
  );
}

export function CollapseRailIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="4" />
      <path d="M9 4v16" />
      <path className="dcg-sidebar-collapseArrow" d="m16 9-3 3 3 3" />
    </svg>
  );
}

import * as React from "react";

export function IonHourglassOutline(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="24" height="24" fill="none" />
      <path d="M6.75 3h10.5M6.75 21h10.5M17.25 3v2.25a6.75 6.75 0 01-6.75 6.75 6.75 6.75 0 01-6.75-6.75V3M6.75 21v-2.25a6.75 6.75 0 016.75-6.75 6.75 6.75 0 016.75 6.75V21" />
    </svg>
  );
}

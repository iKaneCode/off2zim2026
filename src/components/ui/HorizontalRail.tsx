import { Children, type ReactNode } from "react";

interface HorizontalRailProps {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  ariaLabel?: string;
}

export default function HorizontalRail({
  children,
  className = "",
  itemClassName = "w-[76vw] max-w-[280px] sm:w-[260px]",
  ariaLabel,
}: HorizontalRailProps) {
  return (
    <div
      aria-label={ariaLabel}
      className={`-mx-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden ${className}`}
    >
      <div className="flex snap-x snap-mandatory gap-3">
        {Children.map(children, (child) => (
          <div className={`shrink-0 snap-start ${itemClassName}`}>{child}</div>
        ))}
      </div>
    </div>
  );
}

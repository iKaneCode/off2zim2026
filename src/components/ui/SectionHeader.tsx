import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  align?: "left" | "center";
  actionVariant?: "default" | "secondary" | "ghost" | "outline";
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  align = "left",
  actionVariant = "secondary",
}: SectionHeaderProps) {
  return (
    <div
      className={`mb-6 flex gap-4 ${
        align === "center"
          ? "flex-col items-start md:flex-row md:items-end md:justify-between"
          : "flex-col items-start md:flex-row md:items-end md:justify-between"
      }`}
    >
      <div className={align === "center" ? "max-w-2xl" : undefined}>
        {eyebrow ? (
          <p className="theme-label text-sm uppercase tracking-[0.28em]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="theme-heading mt-2 text-2xl font-semibold md:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="theme-muted mt-3 max-w-2xl text-sm leading-6">
            {description}
          </p>
        ) : null}
      </div>

      {actionHref && actionLabel ? (
        <Button asChild variant={actionVariant} size="sm">
          <Link href={actionHref} className="inline-flex items-center gap-2">
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

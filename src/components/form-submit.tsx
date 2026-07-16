"use client";

import { useFormStatus } from "react-dom";
import clsx from "clsx";

export function FormSubmit({
  label,
  pendingLabel,
  className,
  variant = "primary",
  disabled = false,
}: {
  label: string;
  pendingLabel?: string;
  className?: string;
  variant?: "primary" | "secondary" | "fund";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const base =
    variant === "secondary"
      ? "btn-secondary"
      : variant === "fund"
        ? "btn-fund"
        : "btn-primary";

  return (
    <button type="submit" disabled={pending || disabled} className={clsx(base, className)}>
      {pending ? pendingLabel || "Salvando…" : label}
    </button>
  );
}

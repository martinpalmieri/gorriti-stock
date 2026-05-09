import Link from "next/link";
import type { ComponentProps } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

function buttonClasses(variant: ButtonVariant) {
  const base =
    "ui-button inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-700 disabled:cursor-not-allowed disabled:opacity-60";

  switch (variant) {
    case "secondary":
      return `${base} ui-button--secondary border border-stone-300 bg-white text-stone-900 hover:border-stone-400 hover:bg-stone-50 active:bg-stone-100`;
    case "ghost":
      return `ui-button ui-button--ghost rounded-md px-2 py-1 text-sm font-medium text-amber-700 transition hover:bg-amber-50 hover:text-amber-900 active:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-700`;
    case "primary":
    default:
      return `${base} ui-button--primary bg-stone-900 text-white hover:bg-stone-800 hover:text-white active:bg-stone-950 active:text-white`;
  }
}

type ButtonProps = Omit<ComponentProps<"button">, "className"> & {
  variant?: ButtonVariant;
  className?: string;
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={[buttonClasses(variant), className].filter(Boolean).join(" ")}
    />
  );
}

type LinkButtonProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonVariant;
  className?: string;
};

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      {...props}
      className={[buttonClasses(variant), className].filter(Boolean).join(" ")}
    />
  );
}


import type { LinkProps } from "@remix-run/react";
import { Link } from "@remix-run/react";

import { tw } from "~/utils";

export function Button({
  disabled,
  className,
  children,
}: {
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      className={tw(
        "rounded-md border border-gray-800 bg-gray-800 p-2 text-center text-sm font-semibold text-white hover:bg-gray-900",
        disabled && "opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

export function ButtonLink({ to, className, children, ...props }: LinkProps) {
  return (
    <Link
      to={to}
      className={tw(
        "rounded-md border border-white bg-gray-800 p-2 text-center text-sm font-semibold text-white hover:bg-gray-900",
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

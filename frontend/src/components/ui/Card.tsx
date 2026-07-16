"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({
  hoverable = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-6",
        "backdrop-blur-md bg-white/[0.04]",
        "border border-white/[0.08]",
        hoverable &&
          "transition-transform duration-200 ease-out hover:scale-[1.02]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

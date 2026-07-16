"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  className,
  id,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-white/70"
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          // Base
          "w-full rounded-lg px-3.5 py-2.5 text-sm text-white",
          "placeholder:text-white/30",
          // Glass bg
          "bg-white/[0.06] backdrop-blur-md",
          "border border-white/[0.12]",
          // Transition
          "transition-colors duration-150 ease-out",
          // Focus
          "focus:outline-none focus:ring-2 focus:ring-[#E84A2D]/60 focus:border-[#E84A2D]/40",
          // Error state
          error &&
            "border-red-500/60 focus:ring-red-500/60 focus:border-red-500/40",
          // Disabled
          "disabled:opacity-50 disabled:pointer-events-none",
          className,
        )}
        {...props}
      />

      {error && (
        <p id={errorId} className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

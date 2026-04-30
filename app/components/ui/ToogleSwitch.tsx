"use client";

import * as React from "react";

type ToggleSwitchProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
};

export function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
}: ToggleSwitchProps) {
  return (
    <div className={className}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={[
          "relative inline-flex h-5 w-10 items-center rounded-sm transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          checked ? "bg-blue-600" : "bg-slate-300",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-4 w-4 transform bg-white rounded-sm shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-1",
          ].join(" ")}
        />
      </button>

      {label ? (
        <span className="ml-3 text-sm select-none text-slate-800">{label}</span>
      ) : null}
    </div>
  );
}
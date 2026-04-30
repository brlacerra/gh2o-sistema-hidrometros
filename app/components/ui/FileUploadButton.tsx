"use client";

import { useId } from "react";

type Props = {
  label?: string;
  accept?: string;
  disabled?: boolean;
  selectedFileName?: string | null;
  onFileSelected: (file: File | null) => void;
  helperText?: string;
};

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className ?? "w-5 h-5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M20 16v4H4v-4" />
    </svg>
  );
}

export function FileUploadButton({
  label = "Enviar imagem",
  accept = "image/*",
  disabled,
  selectedFileName,
  onFileSelected,
  helperText = "Escolha uma imagem do computador.",
}: Props) {
  const id = useId();

  return (
    <div className="space-y-2">
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
      />

      <label
        htmlFor={id}
        className={[
          "inline-flex w-full sm:w-auto items-center justify-center gap-2",
          "px-4 py-2 border border-slate-200 bg-white text-slate-900",
          "hover:bg-slate-50 active:bg-slate-100",
          "focus-within:ring-2 focus-within:ring-slate-300",
          "cursor-pointer select-none",
          disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
        ].join(" ")}
      >
        <UploadIcon className="w-5 h-5" />
        <span className="text-sm font-medium">{label}</span>
      </label>

      {selectedFileName ? (
        <div className="text-xs text-slate-600">
          Selecionado: <span className="font-medium">{selectedFileName}</span>
        </div>
      ) : (
        <div className="text-xs text-slate-500">{helperText}</div>
      )}
    </div>
  );
}
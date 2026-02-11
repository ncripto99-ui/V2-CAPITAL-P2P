import React, { useEffect, useMemo, useRef } from "react";
import {
  applyNumericInputChange,
  formatNumericLive,
  NumericFormatOptions,
} from "../utils/numberInput";

interface InputProps {
  label: string;
  type?: string;

  // En modo numérico, SIEMPRE será string raw limpio en toda tu app.
  // (Si todavía tienes lugares pasando number, lo convertimos a string aquí para no romper.)
  value: string | number;

  // Seguimos con tu firma: onChange devuelve string
  // - En modo numérico: devuelve RAW limpio sin comas (ej "12000.3" o "")
  // - En modo texto: devuelve texto normal
  onChange: (value: string) => void;

  placeholder?: string;
  required?: boolean;
  min?: number;
  step?: string;

  // ✅ opcionales (compatibles con tu código actual)
  formatDecimals?: number; // si está definido => modo numérico
  useThousands?: boolean;  // default true (si false, no ponemos comas en vivo)
}

export function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  min,
  step,
  formatDecimals,
  useThousands = true,
}: InputProps) {
  const ref = useRef<HTMLInputElement | null>(null);
  const pendingCursor = useRef<number | null>(null);

  // Modo numérico si formatDecimals está definido (igual que tu lógica actual)
  const numeric = formatDecimals !== undefined;

  const numericOptions: NumericFormatOptions | undefined = useMemo(() => {
    if (!numeric) return undefined;
    return {
      maxDecimals: formatDecimals, // NO rellena .00, solo limita
      // allowNegative: true/false si algún día lo ocupas
    };
  }, [numeric, formatDecimals]);

  // value raw siempre como string (sin comas)
  const rawValue = useMemo(() => String(value ?? ""), [value]);

  // display para el input:
  // - numérico: comas en vivo (si useThousands=true)
  // - normal: tal cual
  const displayValue = useMemo(() => {
    if (!numeric) return rawValue;

    const formatted = formatNumericLive(rawValue, numericOptions);

    // Si el usuario NO quiere comas en vivo, las quitamos del display (pero el raw sigue limpio)
    if (!useThousands) return formatted.replace(/,/g, "");

    return formatted;
  }, [numeric, rawValue, numericOptions, useThousands]);

  // Recolocar cursor en móvil/PC después del re-render
  useEffect(() => {
    if (!numeric) return;
    if (pendingCursor.current == null) return;

    const el = ref.current;
    if (!el) return;

    const c = pendingCursor.current;
    pendingCursor.current = null;

    requestAnimationFrame(() => {
      try {
        el.setSelectionRange(c, c);
      } catch {}
    });
  }, [displayValue, numeric]);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <input
        ref={ref}
        type={numeric ? "text" : type} // IMPORTANT: numérico en text para evitar bugs móvil
        value={displayValue}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        inputMode={numeric ? "decimal" : undefined}
        autoComplete="off"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        onChange={(e) => {
          const el = e.target;
          const inputValue = el.value;
          const cursor = el.selectionStart ?? inputValue.length;

          // Modo texto normal (sin formato)
          if (!numeric) {
            onChange(inputValue);
            return;
          }

          // Si no queremos comas en vivo, igual aceptamos que el usuario escriba con comas o sin comas:
          // simplemente limpiamos comas antes de pasarlo al cerebro.
          const normalizedInput = useThousands ? inputValue : inputValue.replace(/,/g, "");

          const { raw, nextCursor } = applyNumericInputChange({
            inputValue: normalizedInput,
            cursor,
            opts: numericOptions,
          });

          pendingCursor.current = nextCursor;

          // Guardamos RAW limpio (sin comas)
          onChange(raw);
        }}
      />
    </div>
  );
}

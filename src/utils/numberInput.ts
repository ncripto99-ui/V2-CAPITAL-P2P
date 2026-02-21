// src/utils/numberInput.ts
export type NumericFormatOptions = {
  allowNegative?: boolean;
  maxDecimals?: number; // undefined = ilimitado
};

export type MoneyFormatOptions = {
  decimals?: number; // default 2
};

const DEFAULTS: Required<Pick<NumericFormatOptions, "allowNegative">> = {
  allowNegative: false,
};

function addThousands(intPart: string) {
  if (!intPart) return "";
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function sanitizeRaw(input: string, opts?: NumericFormatOptions) {
  const allowNegative = opts?.allowNegative ?? DEFAULTS.allowNegative;
  const maxDecimals = opts?.maxDecimals;

  let s = input ?? "";
  if (!s) return { raw: "", hasDot: false, negative: false };

  // 1) Normalizar: quitar comas y espacios
  s = s.replace(/,/g, "").replace(/\s+/g, "");

  // 2) Signo negativo (solo al inicio si se permite)
  let negative = false;
  if (allowNegative && s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  } else {
    s = s.replace(/-/g, "");
  }

  // 3) Solo dígitos y punto
  s = s.replace(/[^\d.]/g, "");

  // 4) Mantener solo el primer punto
  const firstDot = s.indexOf(".");
  let hasDot = firstDot !== -1;
  if (hasDot) {
    const before = s.slice(0, firstDot);
    const after = s.slice(firstDot + 1).replace(/\./g, "");
    s = before + "." + after;
  }

  // 5) Limitar decimales si aplica
  if (hasDot && typeof maxDecimals === "number" && maxDecimals >= 0) {
    const [a, b = ""] = s.split(".");
    s = a + "." + b.slice(0, maxDecimals);
  }

  return { raw: (negative ? "-" : "") + s, hasDot, negative };
}

/**
 * Formato LIVE mientras se escribe:
 * - Comas en miles en la parte entera
 * - NO fuerza .00
 * - Decimales solo si el usuario los escribe
 * - Conserva '.' si el usuario lo dejó al final ("12.")
 * - Input vacío => ''
 */
export function formatNumericLive(raw: string, opts?: NumericFormatOptions) {
  if (!raw) return "";

  const allowNegative = opts?.allowNegative ?? DEFAULTS.allowNegative;
  let s = raw.replace(/,/g, "");

  let sign = "";
  if (allowNegative && s.startsWith("-")) {
    sign = "-";
    s = s.slice(1);
  } else {
    s = s.replace(/-/g, "");
  }

  const dotIndex = s.indexOf(".");
  const hasDot = dotIndex !== -1;

  const intPart = hasDot ? s.slice(0, dotIndex) : s;
  const decPart = hasDot ? s.slice(dotIndex + 1) : "";

  const intDigits = intPart.replace(/[^\d]/g, "");
  const decDigits = decPart.replace(/[^\d]/g, "");

  const formattedInt = addThousands(intDigits);

  if (hasDot) {
    return sign + (formattedInt || "0") + "." + decDigits;
  }

  return sign + formattedInt;
}

// ---- CURSOR FIX (punto/decimales) ----

function analyzeCursorIntent(inputValue: string, cursor: number, allowNegative: boolean) {
  let left = (inputValue ?? "").slice(0, Math.max(0, cursor));

  left = left.replace(/,/g, "").replace(/\s+/g, "");

  if (allowNegative && left.startsWith("-")) left = left.slice(1);
  left = left.replace(/-/g, "");

  const dotPos = left.indexOf(".");
  const hasDotLeft = dotPos !== -1;

  const before = hasDotLeft ? left.slice(0, dotPos) : left;
  const after = hasDotLeft ? left.slice(dotPos + 1) : "";

  const digitsBefore = (before.match(/\d/g) || []).length;
  const digitsAfter = (after.match(/\d/g) || []).length;

  return { hasDotLeft, digitsBefore, digitsAfter };
}

function computeNextCursor(
  display: string,
  info: { hasDotLeft: boolean; digitsBefore: number; digitsAfter: number }
) {
  const { hasDotLeft, digitsBefore, digitsAfter } = info;

  const dotIndex = display.indexOf(".");
  const hasDotDisplay = dotIndex !== -1;

  // Si el usuario estaba en decimales, mantenlo en decimales
  if (hasDotLeft && hasDotDisplay) {
    const start = dotIndex + 1;
    return Math.min(display.length, start + digitsAfter);
  }

  // Si estaba en enteros, ubícalo por # de dígitos antes del punto
  if (digitsBefore <= 0) return 0;

  let seen = 0;
  for (let i = 0; i < display.length; i++) {
    const ch = display[i];
    if (ch >= "0" && ch <= "9") {
      seen++;
      if (seen >= digitsBefore) return i + 1;
    }
    if (hasDotDisplay && i >= dotIndex) break;
  }

  return hasDotDisplay ? dotIndex : display.length;
}

/**
 * Control total del input numérico:
 * - Recibe lo escrito + cursor
 * - Devuelve raw limpio (sin comas) + display con comas
 * - Cursor estable (PC + móvil) incluyendo el '.' (decimales)
 */
export function applyNumericInputChange(params: {
  inputValue: string;
  cursor: number;
  opts?: NumericFormatOptions;
}) {
  const { inputValue, cursor, opts } = params;
  const allowNegative = opts?.allowNegative ?? DEFAULTS.allowNegative;

  const intent = analyzeCursorIntent(inputValue, cursor, allowNegative);

  const { raw } = sanitizeRaw(inputValue, opts);

  const display = formatNumericLive(raw, opts);

  const nextCursor = computeNextCursor(display, intent);

  return { raw, display, nextCursor };
}

/**
 * Para GUARDAR/usar en cálculos: convierte raw -> number o null
 */
export function rawToNumber(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------
// LECTURA / DISPLAY (dinero)
// ---------------------------

const moneyFormatterCache = new Map<number, Intl.NumberFormat>();

function getMoneyFormatter(decimals: number) {
  const d = Math.max(0, Math.floor(decimals));
  const cached = moneyFormatterCache.get(d);
  if (cached) return cached;

  const fmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
  moneyFormatterCache.set(d, fmt);
  return fmt;
}

/**
 * SOLO para MOSTRAR montos (cards, capital, reports, resúmenes):
 * - Siempre fuerza 2 decimales
 * - Usa comas
 */
export function formatMoney(
  value: number | string | null | undefined,
  opts?: MoneyFormatOptions
) {
  const decimals = opts?.decimals ?? 2;

  if (value === null || value === undefined || value === "") {
    return getMoneyFormatter(decimals).format(0);
  }

  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/,/g, ""));

  if (!Number.isFinite(n)) return getMoneyFormatter(decimals).format(0);

  return getMoneyFormatter(decimals).format(n);
}

/**
 * Opcional: si guardas string fijo:
 * raw "12300.3" => "12300.30"
 */
export function toFixedMoneyRaw(raw: string, decimals = 2) {
  if (!raw) return "";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(decimals);
}

// ---------------------------
// CEREBRO FINANCIERO (P2P)
// ---------------------------

/**
 * Truncar (NO redondear) a X decimales.
 * Binance-style para fiat: evita que te quede +0.01 acumulado por redondeos.
 */
export function truncDecimals(value: number, decimals: number) {
  if (!Number.isFinite(value)) return 0;
  const d = Math.max(0, Math.floor(decimals));
  const p = 10 ** d;

  // +1e-12 evita casos como 1.999999999 -> 1.99 por float
  return Math.floor((value + 1e-12) * p) / p;
}

/** Truncar a 2 decimales (fiat: C$ / USD) */
export function trunc2(value: number) {
  return truncDecimals(value, 2);
}

/** Truncar a 6 decimales (USDT) si algún día te hace falta */
export function trunc6(value: number) {
  return truncDecimals(value, 6);
}
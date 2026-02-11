import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "../context/DataContext";
import type { Movement, MovementType, Currency } from "../types";

import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";

import { formatMoney, rawToNumber } from "../utils/numberInput";
import { Plus } from "lucide-react";

const todayISO = () => new Date().toISOString().slice(0, 10);

const CURRENCIES: Currency[] = ["C$", "USD", "USDT"];
const TYPES: MovementType[] = ["INGRESO", "RETIRO", "TRANSFERENCIA"];

const RANGE_OPTIONS = [
  { value: "1", label: "Último 1 día" },
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "60", label: "Últimos 60 días" },
  { value: "90", label: "Últimos 90 días" },
];

function uid() {
  return crypto.randomUUID();
}

function subtractDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function Movements() {
  const { data, addMovement, voidMovement, getAccountBalance } = useData();

  const accounts = (data.accounts ?? []).filter((a) => a.type !== "Binance");
  const movements = data.movements ?? [];

  // ✅ Igual que P2P: Historial primero, y formulario aparece con botón
  const [showForm, setShowForm] = useState(false);

  // ✅ Rango tipo P2P
  const [rangeDays, setRangeDays] = useState<string>("90");

  /* ================= FORM ================= */
  const [type, setType] = useState<MovementType>("TRANSFERENCIA");
  const [date, setDate] = useState(todayISO());

  const [currency, setCurrency] = useState<Currency>("C$");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");

  const [amountStr, setAmountStr] = useState("");
  const [concept, setConcept] = useState("");

  const amountNum = rawToNumber(amountStr) ?? 0;

  const accountsByCurrency = useMemo(
    () => accounts.filter((a) => a.currency === currency),
    [accounts, currency]
  );

  const nameById = (id?: string) =>
    accounts.find((a) => a.id === id)?.name ?? "Cuenta";

  /* ================= SALDOS REALES ================= */
  const fromBefore = fromAccountId ? getAccountBalance(fromAccountId) : 0;
  const toBefore = toAccountId ? getAccountBalance(toAccountId) : 0;

  const isTransfer = type === "TRANSFERENCIA";
  const isIncome = type === "INGRESO";
  const isWithdraw = type === "RETIRO";

  const fromAfter = isTransfer || isWithdraw ? fromBefore - amountNum : fromBefore;
  const toAfter = isTransfer || isIncome ? toBefore + amountNum : toBefore;

  /* ================= VALIDACIÓN ================= */
  // ✅ Concepto NO obligatorio
  const canSave =
    amountNum > 0 &&
    (type === "INGRESO"
      ? Boolean(toAccountId)
      : type === "RETIRO"
      ? Boolean(fromAccountId)
      : Boolean(fromAccountId && toAccountId && fromAccountId !== toAccountId));

  /* ================= TEXTO PRO (para historial) ================= */
  const summaryTitle = useMemo(() => {
    const amt = `${currency} ${formatMoney(amountNum, { decimals: 2 })}`;

    if (type === "TRANSFERENCIA") {
      return `${nameById(fromAccountId)} envió ${amt} a ${nameById(toAccountId)}`;
    }
    if (type === "INGRESO") {
      return `Ingreso de ${amt} a ${nameById(toAccountId)}`;
    }
    return `Retiro de ${amt} desde ${nameById(fromAccountId)}`;
  }, [type, currency, amountNum, fromAccountId, toAccountId, accounts]);

  /* ================= GUARDAR (CON SNAPSHOT) ================= */
  const onSave = () => {
    if (!canSave) return;

    const fb = fromAccountId ? getAccountBalance(fromAccountId) : 0;
    const tb = toAccountId ? getAccountBalance(toAccountId) : 0;

    const mov: Movement = {
      id: uid(),
      date,
      createdAt: new Date().toISOString(),
      type,

      from:
        type === "INGRESO"
          ? undefined
          : { kind: "CUENTA", accountId: fromAccountId },
      to:
        type === "RETIRO"
          ? undefined
          : { kind: "CUENTA", accountId: toAccountId },

      currencyFrom: currency,
      amountFrom: Number(amountNum.toFixed(2)),

      currencyTo: currency,
      amountTo: Number(amountNum.toFixed(2)),

      exchangeRateManual: undefined,

      // ✅ Concepto opcional (si está vacío se guarda "")
      concept: concept.trim(),

      status: "CONFIRMADO",
    };

    // ✅ Snapshot para Historial PRO
    (mov as any).meta = {
      title: summaryTitle,
      currency,
      amount: Number(amountNum.toFixed(2)),
      fromId: fromAccountId || null,
      toId: toAccountId || null,
      fromBefore: fb,
      fromAfter:
        type === "TRANSFERENCIA" || type === "RETIRO" ? fb - amountNum : fb,
      toBefore: tb,
      toAfter:
        type === "TRANSFERENCIA" || type === "INGRESO" ? tb + amountNum : tb,
    };

    addMovement(mov);

    // reset
    setAmountStr("");
    setConcept("");

    // ✅ como P2P: cerrar formulario al guardar
    setShowForm(false);
  };

  const resetFormOnly = () => {
    setAmountStr("");
    setConcept("");
    setFromAccountId("");
    setToAccountId("");
    setDate(todayISO());
  };

  /* ================= LISTA (orden + filtro rango) ================= */
  const list = useMemo(() => {
    const ordered = [...movements].sort((a, b) =>
      `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`)
    );

    const days = Number(rangeDays);
    if (!days || Number.isNaN(days)) return ordered;

    const minDate = subtractDaysISO(days);
    // como es YYYY-MM-DD, comparar string sirve
    return ordered.filter((m) => m.date >= minDate);
  }, [movements, rangeDays]);

  /* ================= UX: abrir form arriba (scroll) ================= */
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showForm) return;
    // pequeño delay para que el DOM pinte
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, [showForm]);

  return (
    <div className="space-y-4">
      {/* HEADER tipo P2P */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Movimientos</h2>

        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Nueva
          </Button>
        )}
      </div>

      {/* ✅ FORM ARRIBA DEL HISTORIAL (cuando showForm) */}
      {showForm && (
        <div ref={formRef}>
          <Card>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold">Nuevo Movimiento</h3>
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  resetFormOnly();
                  setShowForm(false);
                }}
              >
                Cerrar
              </Button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSave();
              }}
              className="space-y-3"
            >
              {/* ✅ en móvil se apila (evita cortar TRANSFERENCIA) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select
                  label="Tipo"
                  value={type}
                  onChange={(v) => setType(v as MovementType)}
                  options={TYPES.map((t) => ({ value: t, label: t }))}
                />

                <Input
                  label="Fecha"
                  type="date"
                  value={date}
                  onChange={setDate}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  label="Monto"
                  value={amountStr}
                  onChange={setAmountStr}
                  formatDecimals={2}
                  placeholder="0"
                />

                <Select
                  label="Moneda"
                  value={currency}
                  onChange={(v) => {
                    const next = v as Currency;
                    setCurrency(next);
                    setFromAccountId("");
                    setToAccountId("");
                  }}
                  options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                />
              </div>

              {type !== "INGRESO" && (
                <Select
                  label="Desde (Banco)"
                  value={fromAccountId}
                  onChange={setFromAccountId}
                  options={[
                    { value: "", label: "Seleccionar banco" },
                    ...accountsByCurrency.map((a) => ({
                      value: a.id,
                      label: a.name,
                    })),
                  ]}
                />
              )}

              {type !== "RETIRO" && (
                <Select
                  label="Hacia (Banco)"
                  value={toAccountId}
                  onChange={setToAccountId}
                  options={[
                    { value: "", label: "Seleccionar banco" },
                    ...accountsByCurrency.map((a) => ({
                      value: a.id,
                      label: a.name,
                    })),
                  ]}
                />
              )}

              <Input
                label="Concepto (opcional)"
                value={concept}
                onChange={setConcept}
                placeholder='Ej: "Transferencia para ahorro"'
              />

              {/* ================= RESUMEN PRO ================= */}
              <Card className="border border-white/10">
                <div className="text-sm font-bold mb-2">Resumen</div>

                <div className="text-sm text-white/90 mb-3">{summaryTitle}</div>

                {isTransfer ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-white/10 p-3">
                      <div className="font-bold mb-2">{nameById(fromAccountId)}</div>
                      <div className="flex justify-between text-white/70">
                        <span>Antes</span>
                        <span>
                          {currency} {formatMoney(fromBefore, { decimals: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Cambio</span>
                        <span className="font-bold text-red-400">
                          - {currency} {formatMoney(amountNum, { decimals: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Después</span>
                        <span
                          className={fromAfter < 0 ? "text-red-400" : "text-green-400"}
                        >
                          {currency} {formatMoney(fromAfter, { decimals: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 p-3">
                      <div className="font-bold mb-2">{nameById(toAccountId)}</div>
                      <div className="flex justify-between text-white/70">
                        <span>Antes</span>
                        <span>
                          {currency} {formatMoney(toBefore, { decimals: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Cambio</span>
                        <span className="font-bold text-green-400">
                          + {currency} {formatMoney(amountNum, { decimals: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Después</span>
                        <span className="text-green-400">
                          {currency} {formatMoney(toAfter, { decimals: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 p-3 text-sm">
                    <div className="font-bold mb-2">
                      {isIncome ? nameById(toAccountId) : nameById(fromAccountId)}
                    </div>

                    <div className="flex justify-between text-white/70">
                      <span>Antes</span>
                      <span>
                        {currency}{" "}
                        {formatMoney(isIncome ? toBefore : fromBefore, {
                          decimals: 2,
                        })}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-white/70">Cambio</span>
                      <span
                        className={`font-bold ${
                          isIncome ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {isIncome ? "+" : "-"} {currency}{" "}
                        {formatMoney(amountNum, { decimals: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between font-bold">
                      <span>Después</span>
                      <span className="text-green-400">
                        {currency}{" "}
                        {formatMoney(isIncome ? toAfter : fromAfter, {
                          decimals: 2,
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              <div className="flex gap-2">
                <Button type="submit" disabled={!canSave} className="flex-1">
                  Guardar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetFormOnly();
                    setShowForm(false);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ================= HISTORIAL PRO ================= */}
      <Card>
        <h3 className="font-bold mb-2">Historial</h3>

        {/* ✅ rango tipo P2P */}
        <div className="mb-3">
          <Select
            label="Rango"
            value={rangeDays}
            onChange={(v) => setRangeDays(String(v))}
            options={RANGE_OPTIONS}
          />
        </div>

        <div className="space-y-2">
          {list.map((m) => {
            const meta = (m as any).meta as
              | {
                  title?: string;
                  currency?: Currency;
                  amount?: number;
                  fromId?: string | null;
                  toId?: string | null;
                  fromBefore?: number;
                  fromAfter?: number;
                  toBefore?: number;
                  toAfter?: number;
                }
              | undefined;

            const title = meta?.title ?? (m.concept?.trim() ? m.concept : "Movimiento");
            const cur = meta?.currency ?? m.currencyFrom;
            const amt = meta?.amount ?? m.amountFrom;

            return (
              <Card key={m.id} className={m.status === "ANULADO" ? "opacity-60" : ""}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-bold">{title}</div>

                    {m.concept?.trim() ? (
                      <div className="text-xs text-white/50 mt-1">Nota: {m.concept}</div>
                    ) : null}

                    <div className="text-xs text-white/60">
                      {m.date} · {m.type} · {m.status}
                    </div>

                    <div className="text-sm mt-1">
                      Monto:{" "}
                      <b>
                        {cur} {formatMoney(amt, { decimals: 2 })}
                      </b>
                    </div>
                  </div>

                  {m.status !== "ANULADO" && (
                    <Button variant="secondary" onClick={() => voidMovement(m.id)}>
                      Anular
                    </Button>
                  )}
                </div>

                {meta && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {m.type !== "INGRESO" && meta.fromId && (
                      <div className="rounded-xl border border-white/10 p-3">
                        <div className="font-bold mb-2">{nameById(meta.fromId)}</div>
                        <div className="flex justify-between text-white/70">
                          <span>Antes</span>
                          <span>
                            {cur} {formatMoney(meta.fromBefore ?? 0, { decimals: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Cambio</span>
                          <span className="font-bold text-red-400">
                            - {cur} {formatMoney(amt, { decimals: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Después</span>
                          <span
                            className={(meta.fromAfter ?? 0) < 0 ? "text-red-400" : "text-green-400"}
                          >
                            {cur} {formatMoney(meta.fromAfter ?? 0, { decimals: 2 })}
                          </span>
                        </div>
                      </div>
                    )}

                    {m.type !== "RETIRO" && meta.toId && (
                      <div className="rounded-xl border border-white/10 p-3">
                        <div className="font-bold mb-2">{nameById(meta.toId)}</div>
                        <div className="flex justify-between text-white/70">
                          <span>Antes</span>
                          <span>
                            {cur} {formatMoney(meta.toBefore ?? 0, { decimals: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Cambio</span>
                          <span className="font-bold text-green-400">
                            + {cur} {formatMoney(amt, { decimals: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Después</span>
                          <span className="text-green-400">
                            {cur} {formatMoney(meta.toAfter ?? 0, { decimals: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {!list.length && (
            <p className="text-center text-white/60 py-6">Todavía no hay movimientos.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

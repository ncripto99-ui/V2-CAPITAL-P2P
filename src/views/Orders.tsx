import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Plus, TrendingDown, TrendingUp, X, Trash2, Edit2, Ban } from "lucide-react";
import type { P2POrder } from "../types";
import { formatMoney, rawToNumber } from "../utils/numberInput";

type FilterRange = "30" | "90" | "180" | "ALL";

export function Orders() {
  const {
    data,
    addOrder,
    updateOrder,
    deleteOrder,
    cancelOrder,
    restoreOrder,
    getBinanceBalance,
    getUSDTToC,
  } = useData();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filterRange, setFilterRange] = useState<FilterRange>("90");
  const [visibleCount, setVisibleCount] = useState(30);

  const [formData, setFormData] = useState<Partial<P2POrder>>({
    date: new Date().toISOString().split("T")[0],
    type: "COMPRA",
    currency: "C$",
    accountId: "",
    status: "ACTIVA",
  });

  // ✅ RAW inputs (vacíos al inicio)
  const [usdtStr, setUsdtStr] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [commissionStr, setCommissionStr] = useState("");

  // Para cálculos en vivo (resumen), convertimos desde RAW (si falla => 0)
  const usdtNum = rawToNumber(usdtStr) ?? 0;
  const priceNum = rawToNumber(priceStr) ?? 0;
  const commissionNum = rawToNumber(commissionStr) ?? 0;

  const usdtReceived = Math.max(0, usdtNum - commissionNum); // COMPRA
  const usdtSent = usdtNum + commissionNum; // VENTA

  const nonBinanceAccounts = data.accounts.filter((a) => a.type !== "Binance");
  const usdtToC = getUSDTToC();

  const calculateTotals = () => {
    const total = usdtNum * priceNum;
    const commissionInCurrency = commissionNum * priceNum;

    let totalInC = total;
    let commissionInC = commissionInCurrency;

    if (formData.currency === "USD") {
      totalInC = total * data.settings.usdToCBuy;
      commissionInC = commissionInCurrency * data.settings.usdToCBuy;
    }

    return { total, totalInC, commissionInC };
  };

  const totals = calculateTotals();

  const startEdit = (order: P2POrder) => {
    setEditingId(order.id);
    setShowForm(true);

    setFormData({
      ...order,
      status: order.status ?? "ACTIVA",
    });

    // ✅ si es 0, vacío
    setUsdtStr(order.usdt ? String(order.usdt) : "");
    setPriceStr(order.pricePerUSDT ? String(order.pricePerUSDT) : "");
    setCommissionStr(order.commissionUSDT ? String(order.commissionUSDT) : "");
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      type: "COMPRA",
      currency: "C$",
      accountId: "",
      status: "ACTIVA",
    });
    setUsdtStr("");
    setPriceStr("");
    setCommissionStr("");
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.accountId) {
      alert("Selecciona una cuenta.");
      return;
    }
    if (usdtNum <= 0 || priceNum <= 0) {
      alert("USDT y Precio por USDT deben ser mayores a 0.");
      return;
    }

    if ((formData.type as any) === "VENTA") {
      const binanceBalance = getBinanceBalance();
      const needed = usdtNum + commissionNum;

      if (binanceBalance < needed) {
        alert(
          `No hay suficiente USDT en Binance.\nDisponible: ${formatMoney(binanceBalance, {
            decimals: 6,
          })}\nNecesitas: ${formatMoney(needed, { decimals: 6 })}`
        );
        return;
      }
    }

    const payload: P2POrder = {
      id: editingId ?? crypto.randomUUID(),
      date: formData.date || new Date().toISOString().split("T")[0],
      type: formData.type as "COMPRA" | "VENTA",
      currency: formData.currency as "C$" | "USD",

      // ✅ redondeo SOLO al guardar
      usdt: Number(usdtNum.toFixed(6)),
      pricePerUSDT: Number(priceNum.toFixed(2)),
      commissionUSDT: Number(commissionNum.toFixed(6)),

      accountId: formData.accountId || "",
      status: (formData.status as any) ?? "ACTIVA",
    };

    if (editingId) updateOrder(editingId, payload);
    else addOrder(payload);

    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Eliminar esta orden? (Esto la borra permanentemente)")) {
      deleteOrder(id);
    }
  };

  const handleCancelOrder = (order: P2POrder) => {
    const isCanceled = (order.status ?? "ACTIVA") === "CANCELADA";
    if (!isCanceled) {
      if (confirm("¿Cancelar esta orden? (No se borra, solo queda como cancelada)")) {
        cancelOrder(order.id);
      }
    } else {
      if (confirm("¿Restaurar esta orden cancelada?")) {
        restoreOrder(order.id);
      }
    }
  };

  const calculateProfit = (order: P2POrder) => {
    if (order.type === "COMPRA") return { profitC: 0, profitUSD: 0 };

    const totalReceived = order.usdt * order.pricePerUSDT;
    let totalReceivedC = totalReceived;

    if (order.currency === "USD") {
      totalReceivedC = totalReceived * data.settings.usdToCBuy;
    }

    const referenceC = order.usdt * usdtToC;
    const profitC = totalReceivedC - referenceC;
    const profitUSD = profitC / data.settings.usdToCSell;

    return { profitC, profitUSD };
  };

  const filteredSortedOrders = useMemo(() => {
    const sorted = [...data.orders].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (filterRange === "ALL") return sorted;

    const days = Number(filterRange);
    const now = new Date();
    const minDate = new Date(now);
    minDate.setDate(now.getDate() - days);

    return sorted.filter((o) => new Date(o.date) >= minDate);
  }, [data.orders, filterRange]);

  const visibleOrders = filteredSortedOrders.slice(0, visibleCount);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Órdenes P2P</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            USDT → C$: {data.settings.usdtToCMode} = C$ {formatMoney(usdtToC, { decimals: 2 })}
          </p>
        </div>

        {!showForm && (
          <Button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
            }}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Nueva
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingId ? "Editar Orden P2P" : "Nueva Orden P2P"}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <Input
              label="Fecha"
              type="date"
              value={formData.date || ""}
              onChange={(v) => setFormData({ ...formData, date: v })}
              required
            />

            <Select
              label="Tipo"
              value={formData.type || "COMPRA"}
              onChange={(v) => setFormData({ ...formData, type: v as any })}
              options={[
                { value: "COMPRA", label: "COMPRA" },
                { value: "VENTA", label: "VENTA" },
              ]}
              required
            />

            <Select
              label="Moneda de la Operación"
              value={formData.currency || "C$"}
              onChange={(v) => setFormData({ ...formData, currency: v as any })}
              options={[
                { value: "C$", label: "C$ (Córdobas)" },
                { value: "USD", label: "USD (Dólares)" },
              ]}
              required
            />

            {/* ✅ Comas en vivo, sin .00 automático */}
            <Input
              label="USDT"
              value={usdtStr}
              onChange={(v) => setUsdtStr(v)}
              placeholder=""
              required
              formatDecimals={6}
            />

            <Input
              label="Precio por USDT"
              value={priceStr}
              onChange={(v) => setPriceStr(v)}
              placeholder=""
              required
              formatDecimals={2}
            />

            <div className="mb-4">
              <Input
                label="Comisión Binance (USDT) (opcional)"
                value={commissionStr}
                onChange={(v) => setCommissionStr(v)}
                placeholder=""
                formatDecimals={6}
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Equivalente a C$ {formatMoney(totals.commissionInC, { decimals: 2 })}
              </p>
            </div>

            <Select
              label="Cuenta"
              value={formData.accountId || ""}
              onChange={(v) => setFormData({ ...formData, accountId: v })}
              options={[
                { value: "", label: "Seleccionar cuenta" },
                ...nonBinanceAccounts.map((a) => ({
                  value: a.id,
                  label: `${a.name} (${a.currency})`,
                })),
              ]}
              required
            />

            <Card className="mt-4">
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">Resumen</h4>
              <div className="space-y-1 text-sm">
                {(formData.type || "COMPRA") === "COMPRA" ? (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">USDT recibidos:</span>
                    <span className="text-gray-900 dark:text-white font-bold">
                      {formatMoney(usdtReceived, { decimals: 6 })} USDT
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">USDT enviados:</span>
                    <span className="text-gray-900 dark:text-white font-bold">
                      {formatMoney(usdtSent, { decimals: 6 })} USDT
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total:</span>
                  <span className="text-gray-900 dark:text-white">
                    {formData.currency} {formatMoney(totals.total, { decimals: 2 })}
                  </span>
                </div>

                <div className="flex justify-between font-bold">
                  <span className="text-gray-900 dark:text-white">Total en C$:</span>
                  <span className="text-green-600 dark:text-green-400">
                    C$ {formatMoney(totals.totalInC, { decimals: 2 })}
                  </span>
                </div>
              </div>
            </Card>

            <div className="flex gap-2 mt-4">
              <Button type="submit" className="flex-1">
                {editingId ? "Guardar Cambios" : "Crear Orden"}
              </Button>
              <Button type="button" onClick={resetForm} variant="secondary">
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="font-bold text-gray-900 dark:text-white">Historial</div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Rango:</span>
            <select
              className="border rounded-lg px-3 py-2 bg-transparent text-gray-900 dark:text-white"
              value={filterRange}
              onChange={(e) => {
                setFilterRange(e.target.value as FilterRange);
                setVisibleCount(30);
              }}
            >
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="180">Últimos 180 días</option>
              <option value="ALL">Todo</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {visibleOrders.map((order) => {
          const profit = calculateProfit(order);
          const status = order.status ?? "ACTIVA";
          const canceled = status === "CANCELADA";

          return (
            <Card key={order.id} className={canceled ? "opacity-70" : ""}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {order.type === "COMPRA" ? (
                      <TrendingDown className="text-green-600" size={18} />
                    ) : (
                      <TrendingUp className="text-blue-600" size={18} />
                    )}
                    {order.type} · {formatMoney(order.usdt, { decimals: 6 })} USDT
                    {canceled && (
                      <span className="text-xs px-2 py-0.5 rounded-full border">Cancelada</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(order.date).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(order)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>

                  <button
                    onClick={() => handleCancelOrder(order)}
                    className="text-orange-600 dark:text-orange-400 hover:text-orange-700"
                    title={canceled ? "Restaurar" : "Cancelar"}
                  >
                    <Ban size={18} />
                  </button>

                  <button
                    onClick={() => handleDelete(order.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Precio/USDT:</span>
                  <div className="font-bold text-gray-900 dark:text-white">
                    {order.currency} {formatMoney(order.pricePerUSDT, { decimals: 2 })}
                  </div>
                </div>

                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total:</span>
                  <div className="font-bold text-gray-900 dark:text-white">
                    {order.currency} {formatMoney(order.usdt * order.pricePerUSDT, { decimals: 2 })}
                  </div>
                </div>

                <div>
                  <span className="text-gray-600 dark:text-gray-400">Comisión:</span>
                  <div className="font-bold text-gray-900 dark:text-white">
                    {formatMoney(order.commissionUSDT, { decimals: 6 })} USDT
                  </div>
                </div>

                {order.type === "VENTA" && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Ganancia:</span>
                    <div className={profit.profitC >= 0 ? "font-bold text-green-600" : "font-bold text-red-600"}>
                      C$ {formatMoney(profit.profitC, { decimals: 2 })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {filteredSortedOrders.length > visibleCount && (
          <Button variant="secondary" onClick={() => setVisibleCount((c) => c + 30)}>
            Ver más
          </Button>
        )}

        {filteredSortedOrders.length === 0 && !showForm && (
          <Card>
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
              No hay órdenes registradas en este rango.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

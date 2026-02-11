import { useEffect, useState } from "react";
import { useData } from "../context/DataContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import type { Account, AccountType, Currency } from "../types";
import { formatMoney, rawToNumber } from "../utils/numberInput";

export function Accounts() {
  const { data, addAccount, updateAccount, deleteAccount, getAccountBalance, getBinanceBalance } =
    useData();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Account>>({
    name: "",
    type: "Banco",
    currency: "C$",
    // initialBalance ya NO lo usamos para escribir, solo para guardar
  });

  // ✅ RAW limpio, empieza vacío
  const [initialBalanceStr, setInitialBalanceStr] = useState("");

  // Cuando abres el form (nuevo), resetea a vacío (sin 0 / 0.00)
  useEffect(() => {
    if (!showForm) return;

    if (!editingId) {
      setInitialBalanceStr("");
      return;
    }

    // Si estás editando, el handleEdit ya setea el valor.
  }, [showForm, editingId]);

  const inputDecimals = (formData.currency as Currency) === "USDT" ? 6 : 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ convertir RAW solo al guardar
    const n = rawToNumber(initialBalanceStr) ?? 0;

    // ✅ redondeo profesional SOLO al guardar (permitido)
    const rounded = Number(n.toFixed(inputDecimals));

    if (editingId) {
      updateAccount(editingId, {
        ...formData,
        initialBalance: rounded,
      });
    } else {
      const newAccount: Account = {
        id: crypto.randomUUID(),
        name: formData.name || "",
        type: formData.type as AccountType,
        currency: formData.currency as Currency,
        initialBalance: rounded,
      };
      addAccount(newAccount);
    }

    setFormData({ name: "", type: "Banco", currency: "C$" });
    setInitialBalanceStr("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (account: Account) => {
    setFormData({
      name: account.name,
      type: account.type,
      currency: account.currency,
    });

    // ✅ RAW limpio, vacío si es 0
    setInitialBalanceStr(account.initialBalance ? String(account.initialBalance) : "");

    setEditingId(account.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta cuenta?")) {
      deleteAccount(id);
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", type: "Banco", currency: "C$" });
    setInitialBalanceStr("");
    setEditingId(null);
    setShowForm(false);
  };

  const formatCurrency = (amount: number, currency: Currency) => {
    const decimals = currency === "USDT" ? 6 : 2;
    // ✅ SOLO mostrar, nunca escribir
    return `${currency} ${formatMoney(amount, { decimals })}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mis Cuentas</h2>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus size={18} />
            Nueva
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingId ? "Editar Cuenta" : "Nueva Cuenta"}
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <Input
              label="Nombre"
              value={formData.name || ""}
              onChange={(v) => setFormData({ ...formData, name: v })}
              placeholder="Ej: BAC Cuenta Corriente"
              required
            />

            <Select
              label="Tipo"
              value={formData.type || "Banco"}
              onChange={(v) => setFormData({ ...formData, type: v as AccountType })}
              options={[
                { value: "Banco", label: "Banco" },
                { value: "Efectivo", label: "Efectivo" },
                { value: "Binance", label: "Binance" },
              ]}
              required
            />

            <Select
              label="Moneda"
              value={formData.currency || "C$"}
              onChange={(v) => setFormData({ ...formData, currency: v as Currency })}
              options={[
                { value: "C$", label: "C$ (Córdobas)" },
                { value: "USD", label: "USD (Dólares)" },
                { value: "USDT", label: "USDT (Tether)" },
              ]}
              required
            />

            {/* ✅ Comas en vivo, sin .00 automático (Input + cerebro) */}
            <Input
              label="Saldo Inicial"
              value={initialBalanceStr}
              onChange={(v) => setInitialBalanceStr(v)}
              placeholder=""
              required
              formatDecimals={inputDecimals}
            />

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingId ? "Actualizar" : "Crear"}
              </Button>
              <Button type="button" onClick={handleCancel} variant="secondary">
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {data.accounts.map((account) => {
          const currentBalance =
            account.type === "Binance" ? getBinanceBalance() : getAccountBalance(account.id);

          const movement = currentBalance - account.initialBalance;

          return (
            <Card key={account.id}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{account.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {account.type} · {account.currency}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(account)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Saldo Inicial:</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatCurrency(account.initialBalance, account.currency)}
                  </span>
                </div>

                <div className="flex justify-between font-bold">
                  <span className="text-gray-900 dark:text-white">Saldo Actual:</span>
                  <span
                    className={
                      currentBalance >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  >
                    {formatCurrency(currentBalance, account.currency)}
                  </span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-500">Movimientos:</span>
                  <span className={movement >= 0 ? "text-green-600" : "text-red-600"}>
                    {movement >= 0 ? "+" : ""}
                    {formatCurrency(movement, account.currency)}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}

        {data.accounts.length === 0 && !showForm && (
          <Card>
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
              No hay cuentas registradas.
              <br />
              Crea tu primera cuenta para comenzar.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

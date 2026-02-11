import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Plus, Receipt, X, Trash2 } from "lucide-react";
import type { Expense } from "../types";
import { formatMoney, rawToNumber } from "../utils/numberInput";

export function Expenses() {
  const { data, addExpense, deleteExpense } = useData();
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState<Partial<Expense>>({
    date: new Date().toISOString().split("T")[0],
    concept: "",
    currency: "C$",
    accountId: "",
  });

  // ✅ RAW limpio, input vacío por defecto
  const [amountStr, setAmountStr] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ convertir SOLO al guardar
    const n = rawToNumber(amountStr) ?? 0;
    const safeAmount = Number(n.toFixed(2)); // gastos siempre 2 decimales

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      date: formData.date || new Date().toISOString().split("T")[0],
      concept: formData.concept || "",
      amount: safeAmount,
      currency: formData.currency as "C$" | "USD",
      accountId: formData.accountId || "",
    };

    addExpense(newExpense);

    setFormData({
      date: new Date().toISOString().split("T")[0],
      concept: "",
      currency: "C$",
      accountId: "",
    });
    setAmountStr("");
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este gasto?")) {
      deleteExpense(id);
    }
  };

  const handleCancel = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      concept: "",
      currency: "C$",
      accountId: "",
    });
    setAmountStr("");
    setShowForm(false);
  };

  const sortedExpenses = useMemo(
    () =>
      [...data.expenses].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [data.expenses]
  );

  const totalExpensesC = data.expenses.reduce((sum, exp) => {
    const amountInC = exp.currency === "USD" ? exp.amount * data.settings.usdToCSell : exp.amount;
    return sum + amountInC;
  }, 0);

  const totalExpensesUSD = totalExpensesC / data.settings.usdToCSell;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gastos</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total: C$ {formatMoney(totalExpensesC, { decimals: 2 })} / USD{" "}
            {formatMoney(totalExpensesUSD, { decimals: 2 })}
          </p>
        </div>

        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus size={18} />
            Nuevo
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nuevo Gasto</h3>
            <button
              onClick={handleCancel}
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

            <Input
              label="Concepto"
              value={formData.concept || ""}
              onChange={(v) => setFormData({ ...formData, concept: v })}
              placeholder="Ej: Comida, Transporte, Servicios..."
              required
            />

            {/* ✅ Comas en vivo, decimales solo si el usuario escribe */}
            <Input
              label="Monto"
              value={amountStr}
              onChange={(v) => setAmountStr(v)}
              placeholder="Ej: 2000"
              required
              formatDecimals={2}
            />

            <Select
              label="Moneda"
              value={formData.currency || "C$"}
              onChange={(v) => setFormData({ ...formData, currency: v as "C$" | "USD" })}
              options={[
                { value: "C$", label: "C$ (Córdobas)" },
                { value: "USD", label: "USD (Dólares)" },
              ]}
              required
            />

            <Select
              label="Cuenta"
              value={formData.accountId || ""}
              onChange={(v) => setFormData({ ...formData, accountId: v })}
              options={[
                { value: "", label: "Seleccionar cuenta" },
                ...data.accounts
                  .filter((a) => a.type !== "Binance")
                  .map((acc) => ({
                    value: acc.id,
                    label: `${acc.name} (${acc.currency})`,
                  })),
              ]}
              required
            />

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Crear Gasto
              </Button>
              <Button type="button" onClick={handleCancel} variant="secondary">
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {sortedExpenses.map((expense) => {
          const account = data.accounts.find((a) => a.id === expense.accountId);
          const amountInC =
            expense.currency === "USD"
              ? expense.amount * data.settings.usdToCSell
              : expense.amount;

          return (
            <Card key={expense.id}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Receipt size={20} className="text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{expense.concept}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{expense.date}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(expense.id)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700"
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Monto:</span>
                  <span className="text-red-600 dark:text-red-400 font-bold">
                    {expense.currency} {formatMoney(expense.amount, { decimals: 2 })}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">En C$:</span>
                  <span className="text-red-600 dark:text-red-400">
                    C$ {formatMoney(amountInC, { decimals: 2 })}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Cuenta:</span>
                  <span className="text-gray-900 dark:text-white text-xs">
                    {account?.name || "N/A"}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}

        {data.expenses.length === 0 && !showForm && (
          <Card>
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
              No hay gastos registrados.
              <br />
              Registra tu primer gasto para comenzar.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

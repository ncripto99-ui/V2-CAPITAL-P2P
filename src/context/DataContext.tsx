import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { AppData, Account, P2POrder, Expense, DailyReport, Settings, Movement } from "../types";
import { trunc2 } from "../utils/numberInput"; // ✅ CEREBRO: truncado Binance

interface DataContextType {
  data: AppData;

  addAccount: (account: Account) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  addOrder: (order: P2POrder) => void;
  updateOrder: (id: string, order: Partial<P2POrder>) => void;
  deleteOrder: (id: string) => void;

  // ✅ NUEVO: cancelar sin borrar
  cancelOrder: (id: string) => void;
  restoreOrder: (id: string) => void;

  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  addReport: (report: DailyReport) => void;
  updateSettings: (settings: Partial<Settings>) => void;

  exportData: () => string;
  importData: (jsonData: string) => void;

  getAccountBalance: (accountId: string) => number;
  getBinanceBalance: () => number;
  getUSDTToC: () => number;
  getTotalCapitalC: () => number;
  getTotalCapitalUSD: () => number;

  // ✅ MOVIMIENTOS
  movements: Movement[];
  addMovement: (movement: Movement) => void;
  updateMovement: (id: string, patch: Partial<Movement>) => void;
  voidMovement: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_DATA: AppData = {
  accounts: [],
  orders: [],
  expenses: [],
  reports: [],
  settings: {
    usdToCBuy: 36.5,
    usdToCSell: 37.0,
    usdtToCMode: "AUTO",
    usdtToCManual: 37.0,
  },
  movements: [],
};

function isActiveOrder(order: P2POrder) {
  // compatibilidad: si no existe status, se considera ACTIVA
  return !order.status || order.status === "ACTIVA";
}

/**
 * ✅ Cálculo "Binance-style" del total fiat:
 * - total = usdt * price
 * - truncado a 2 decimales
 */
function calcOrderTotalInOrderCurrency(order: P2POrder) {
  return trunc2(order.usdt * order.pricePerUSDT);
}

/**
 * ✅ Total en C$ para reportes / promedio / etc:
 * - Si orden es C$: es ese total
 * - Si orden es USD: convierte con usdToCBuy y trunca
 */
function calcOrderTotalInC(order: P2POrder, settings: Settings) {
  const total = calcOrderTotalInOrderCurrency(order);
  if (order.currency === "USD") {
    return trunc2(total * settings.usdToCBuy);
  }
  return total; // C$
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => {
    const stored = localStorage.getItem("capitalP2PData");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_DATA,
          ...parsed,
          movements: parsed.movements ?? [],
        };
      } catch {
        return DEFAULT_DATA;
      }
    }
    return DEFAULT_DATA;
  });

  useEffect(() => {
    localStorage.setItem("capitalP2PData", JSON.stringify(data));
  }, [data]);

  const addAccount = (account: Account) => {
    setData((prev) => ({
      ...prev,
      accounts: [...prev.accounts, account],
    }));
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setData((prev) => ({
      ...prev,
      accounts: prev.accounts.map((acc) => (acc.id === id ? { ...acc, ...updates } : acc)),
    }));
  };

  const deleteAccount = (id: string) => {
    setData((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((acc) => acc.id !== id),
    }));
  };

  const addOrder = (order: P2POrder) => {
    const withStatus = { ...order, status: order.status ?? "ACTIVA" };
    setData((prev) => ({
      ...prev,
      orders: [...prev.orders, withStatus],
    }));
  };

  const updateOrder = (id: string, updates: Partial<P2POrder>) => {
    setData((prev) => ({
      ...prev,
      orders: prev.orders.map((ord) => (ord.id === id ? { ...ord, ...updates } : ord)),
    }));
  };

  const cancelOrder = (id: string) => {
    updateOrder(id, { status: "CANCELADA" });
  };

  const restoreOrder = (id: string) => {
    updateOrder(id, { status: "ACTIVA" });
  };

  const deleteOrder = (id: string) => {
    setData((prev) => ({
      ...prev,
      orders: prev.orders.filter((ord) => ord.id !== id),
    }));
  };

  const addExpense = (expense: Expense) => {
    setData((prev) => ({
      ...prev,
      expenses: [...prev.expenses, expense],
    }));
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp)),
    }));
  };

  const deleteExpense = (id: string) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((exp) => exp.id !== id),
    }));
  };

  const addReport = (report: DailyReport) => {
    setData((prev) => {
      const existing = prev.reports.find((r) => r.date === report.date);
      if (existing) {
        return {
          ...prev,
          reports: prev.reports.map((r) =>
            r.date === report.date
              ? { ...r, capitalFinC: report.capitalFinC, capitalFinUSD: report.capitalFinUSD }
              : r
          ),
        };
      }
      return {
        ...prev,
        reports: [...prev.reports, report],
      };
    });
  };

  const updateSettings = (updates: Partial<Settings>) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));
  };

  // =========================
  // MOVIMIENTOS (CRUD simple)
  // =========================
  const addMovement = (movement: Movement) => {
    setData((prev) => ({
      ...prev,
      movements: [movement, ...(prev.movements ?? [])],
    }));
  };

  const updateMovement = (id: string, patch: Partial<Movement>) => {
    setData((prev) => ({
      ...prev,
      movements: (prev.movements ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  };

  const voidMovement = (id: string) => {
    setData((prev) => ({
      ...prev,
      movements: (prev.movements ?? []).map((m) => (m.id === id ? { ...m, status: "ANULADO" } : m)),
    }));
  };

  const exportData = () => {
    return JSON.stringify(data, null, 2);
  };

  const importData = (jsonData: string) => {
    try {
      const imported = JSON.parse(jsonData);
      setData({
        ...DEFAULT_DATA,
        ...imported,
        movements: imported.movements ?? [],
      });
    } catch {
      throw new Error("Invalid JSON data");
    }
  };

  // =========================
  // BALANCES
  // =========================
  const getAccountBalance = (accountId: string): number => {
    const account = data.accounts.find((a) => a.id === accountId);
    if (!account) return 0;

    let balance = account.initialBalance;

    // ✅ SOLO órdenes activas afectan balance
    data.orders.filter(isActiveOrder).forEach((order) => {
      if (order.accountId !== accountId) return;

      // total en moneda de la orden (truncado)
      const totalInOrderCurrency = calcOrderTotalInOrderCurrency(order);

      // ✅ Caso principal: la cuenta y la orden están en la misma moneda (C$ con C$, USD con USD)
      if (account.currency === order.currency) {
        if (order.type === "COMPRA") balance -= totalInOrderCurrency;
        else balance += totalInOrderCurrency;
        return;
      }

      // ✅ Caso útil: cuenta C$ y orden USD -> convertimos a C$ (usdToCBuy) y truncamos
      if (account.currency === "C$" && order.currency === "USD") {
        const totalInC = trunc2(totalInOrderCurrency * data.settings.usdToCBuy);
        if (order.type === "COMPRA") balance -= totalInC;
        else balance += totalInC;
        return;
      }

      // ⚠️ Si llega una combinación rara (ej. cuenta USD y orden C$), no convertimos por defecto
      // para no inventar reglas. (Si quieres, luego lo definimos).
      // Por ahora, se aplica el total tal cual (comportamiento previo).
      if (order.type === "COMPRA") balance -= totalInOrderCurrency;
      else balance += totalInOrderCurrency;
    });

    // ✅ gastos
    data.expenses.forEach((expense) => {
      if (expense.accountId === accountId) {
        balance -= expense.amount;
      }
    });

    // ✅ MOVIMIENTOS: ingreso/retiro/transferencia afectan balance
    (data.movements ?? []).forEach((m) => {
      if (m.status === "ANULADO") return;

      // Solo mueve saldo si coincide la moneda
      if (m.currencyFrom !== account.currency) return;

      if (m.type === "INGRESO") {
        if (m.to?.kind === "CUENTA" && m.to.accountId === accountId) {
          balance += m.amountFrom;
        }
      }

      if (m.type === "RETIRO") {
        if (m.from?.kind === "CUENTA" && m.from.accountId === accountId) {
          balance -= m.amountFrom;
        }
      }

      if (m.type === "TRANSFERENCIA") {
        if (m.from?.kind === "CUENTA" && m.from.accountId === accountId) {
          balance -= m.amountFrom;
        }
        if (m.to?.kind === "CUENTA" && m.to.accountId === accountId) {
          balance += m.amountFrom;
        }
      }
    });

    return balance;
  };

  const getBinanceBalance = (): number => {
    const binanceAccount = data.accounts.find((a) => a.type === "Binance");
    if (!binanceAccount) return 0;

    let balance = binanceAccount.initialBalance;

    // ✅ solo órdenes activas afectan balance
    data.orders.filter(isActiveOrder).forEach((order) => {
      if (order.type === "COMPRA") {
        balance += order.usdt - order.commissionUSDT;
      } else {
        balance -= order.usdt + order.commissionUSDT;
      }
    });

    return balance;
  };

  const getUSDTToC = (): number => {
    if (data.settings.usdtToCMode === "MANUAL") {
      return data.settings.usdtToCManual;
    }

    let totalUSDT = 0;
    let totalCostC = 0;

    data.orders
      .filter(isActiveOrder)
      .filter((o) => o.type === "COMPRA")
      .forEach((order) => {
        const usdtReceived = order.usdt - order.commissionUSDT;
        totalUSDT += usdtReceived;

        // ✅ costo en C$ truncado estilo Binance
        const costInC = calcOrderTotalInC(order, data.settings);
        totalCostC += costInC;
      });

    // promedio
    return totalUSDT > 0 ? totalCostC / totalUSDT : data.settings.usdtToCManual;
  };

  const getTotalCapitalC = (): number => {
    let total = 0;

    data.accounts.forEach((account) => {
      const balance =
        account.type === "Binance" ? getBinanceBalance() : getAccountBalance(account.id);

      if (account.currency === "C$") {
        total += balance;
      } else if (account.currency === "USD") {
        total += balance * data.settings.usdToCSell;
      } else if (account.currency === "USDT") {
        total += balance * getUSDTToC();
      }
    });

    return total;
  };

  const getTotalCapitalUSD = (): number => {
    return getTotalCapitalC() / data.settings.usdToCSell;
  };

  return (
    <DataContext.Provider
      value={{
        data,
        addAccount,
        updateAccount,
        deleteAccount,

        addOrder,
        updateOrder,
        deleteOrder,
        cancelOrder,
        restoreOrder,

        addExpense,
        updateExpense,
        deleteExpense,

        addReport,
        updateSettings,

        exportData,
        importData,

        getAccountBalance,
        getBinanceBalance,
        getUSDTToC,
        getTotalCapitalC,
        getTotalCapitalUSD,

        movements: data.movements ?? [],
        addMovement,
        updateMovement,
        voidMovement,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
}
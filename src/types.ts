export type Currency = 'C$' | 'USD' | 'USDT';

export type AccountType = 'Banco' | 'Efectivo' | 'Binance';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  initialBalance: number;
}

export interface P2POrder {
  id: string;
  date: string;
  type: 'COMPRA' | 'VENTA';
  currency: 'C$' | 'USD';
  usdt: number;
  pricePerUSDT: number;
  commissionUSDT: number;
  accountId: string;
  status?: 'ACTIVA' | 'CANCELADA';
}

export interface Expense {
  id: string;
  date: string;
  concept: string;
  amount: number;
  currency: 'C$' | 'USD';
  accountId: string;
}

export interface DailyReport {
  id: string;
  date: string;
  capitalInicioC: number;
  capitalFinC: number;
  capitalInicioUSD: number;
  capitalFinUSD: number;
  accountsDetail?: Record<string, number>;
}

export interface Settings {
  usdToCBuy: number;
  usdToCSell: number;
  usdtToCMode: 'AUTO' | 'MANUAL';
  usdtToCManual: number;
}

export interface AppData {
  accounts: Account[];
  orders: P2POrder[];
  expenses: Expense[];
  reports: DailyReport[];
  settings: Settings;
  movements: Movement[];
}

// =========================
// MOVIMIENTOS (CAPITAL P2P)
// =========================

export type Currency = "C$" | "USD" | "USDT";

export type MovementType = "INGRESO" | "RETIRO" | "TRANSFERENCIA";
export type MovementStatus = "CONFIRMADO" | "ANULADO";

export type MovementEndpoint =
  | { kind: "CUENTA"; accountId: string }
  | { kind: "EXTERNO"; name: string };

export type Movement = {
  id: string;

  // fecha para filtros (YYYY-MM-DD) + createdAt para orden estable
  date: string;
  createdAt: string;

  type: MovementType;

  from?: MovementEndpoint;
  to?: MovementEndpoint;

  currencyFrom: Currency;
  amountFrom: number;

  // siempre guardamos destino también (aunque sea igual)
  currencyTo: Currency;
  amountTo: number;

  // solo si currencyFrom !== currencyTo
  exchangeRateManual?: number;

  concept: string;

  category?: string;
  tags?: string[];
  note?: string;

  status: MovementStatus;
};

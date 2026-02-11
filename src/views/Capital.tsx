import { useData } from "../context/DataContext";
import { Card } from "../components/Card";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatMoney } from "../utils/numberInput";

export function Capital() {
  const {
    data,
    getTotalCapitalC,
    getTotalCapitalUSD,
    getAccountBalance,
    getBinanceBalance,
    getUSDTToC,
  } = useData();

  const capitalC = getTotalCapitalC();
  const capitalUSD = getTotalCapitalUSD();
  const usdtToC = getUSDTToC();

  const todayDate = new Date().toISOString().split("T")[0];
  const todayReport = data.reports.find((r) => r.date === todayDate);

  const variationDayC = todayReport ? capitalC - todayReport.capitalInicioC : 0;
  const variationDayUSD = todayReport ? capitalUSD - todayReport.capitalInicioUSD : 0;

  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  const firstDayStr = firstDayOfMonth.toISOString().split("T")[0];
  const monthReport = data.reports.find((r) => r.date === firstDayStr);

  const variationMonthC = monthReport ? capitalC - monthReport.capitalInicioC : 0;
  const variationMonthUSD = monthReport ? capitalUSD - monthReport.capitalInicioUSD : 0;

  const accountsWithBalances = data.accounts.map((account) => {
    const balance = account.type === "Binance" ? getBinanceBalance() : getAccountBalance(account.id);

    let balanceInC = balance;
    if (account.currency === "USD") {
      balanceInC = balance * data.settings.usdToCSell;
    } else if (account.currency === "USDT") {
      balanceInC = balance * usdtToC;
    }

    return { ...account, balance, balanceInC };
  });

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <h2 className="text-sm opacity-90 mb-1">Capital Total</h2>
        <div className="space-y-3">
          <div>
            <p className="text-4xl font-bold">C$ {formatMoney(capitalC, { decimals: 2 })}</p>
            <p className="text-lg opacity-90">USD {formatMoney(capitalUSD, { decimals: 2 })}</p>
          </div>

          {todayReport && (
            <div className="flex items-center gap-2 text-sm">
              {variationDayC >= 0 ? (
                <TrendingUp size={16} className="text-green-300" />
              ) : (
                <TrendingDown size={16} className="text-red-300" />
              )}
              <span className={variationDayC >= 0 ? "text-green-300" : "text-red-300"}>
                {variationDayC >= 0 ? "+" : ""}C$ {formatMoney(variationDayC, { decimals: 2 })} hoy (
                {variationDayUSD >= 0 ? "+" : ""}USD {formatMoney(variationDayUSD, { decimals: 2 })})
              </span>
            </div>
          )}

          {monthReport && (
            <div className="flex items-center gap-2 text-sm">
              {variationMonthC >= 0 ? (
                <TrendingUp size={16} className="text-green-300" />
              ) : (
                <TrendingDown size={16} className="text-red-300" />
              )}
              <span className={variationMonthC >= 0 ? "text-green-300" : "text-red-300"}>
                {variationMonthC >= 0 ? "+" : ""}C$ {formatMoney(variationMonthC, { decimals: 2 })}{" "}
                este mes ({variationMonthUSD >= 0 ? "+" : ""}USD{" "}
                {formatMoney(variationMonthUSD, { decimals: 2 })})
              </span>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Tasas Actuales</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">USD → C$ (Compra):</span>
            <span className="text-gray-900 dark:text-white font-bold">
              C$ {formatMoney(data.settings.usdToCBuy, { decimals: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">USD → C$ (Venta):</span>
            <span className="text-gray-900 dark:text-white font-bold">
              C$ {formatMoney(data.settings.usdToCSell, { decimals: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              USDT → C$ ({data.settings.usdtToCMode}):
            </span>
            <span className="text-gray-900 dark:text-white font-bold">
              C$ {formatMoney(usdtToC, { decimals: 2 })}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Desglose por Cuenta</h3>
        <div className="space-y-3">
          {accountsWithBalances.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Wallet size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{account.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {account.type} · {account.currency}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">
                  {account.currency}{" "}
                  {formatMoney(account.balance, { decimals: account.currency === "USDT" ? 6 : 2 })}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  C$ {formatMoney(account.balanceInC, { decimals: 2 })}
                </p>
              </div>
            </div>
          ))}

          {accountsWithBalances.length === 0 && (
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
              No hay cuentas registradas.
              <br />
              Ve a "Cuentas" para crear una.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Resumen de Actividad</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.accounts.length}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Cuentas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.orders.length}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Órdenes P2P</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.expenses.length}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Gastos</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

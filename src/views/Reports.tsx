import { useState } from "react";
import { useData } from "../context/DataContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { FileText, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import type { DailyReport } from "../types";
import { formatMoney } from "../utils/numberInput";

export function Reports() {
  const { data, addReport, getTotalCapitalC, getTotalCapitalUSD } = useData();
  const [showMonthly, setShowMonthly] = useState(false);

  const handleSaveDailyReport = () => {
    const todayDate = new Date().toISOString().split("T")[0];
    const currentCapitalC = getTotalCapitalC();
    const currentCapitalUSD = getTotalCapitalUSD();

    const existingReport = data.reports.find((r) => r.date === todayDate);

    let capitalInicioC = currentCapitalC;
    let capitalInicioUSD = currentCapitalUSD;

    if (existingReport) {
      capitalInicioC = existingReport.capitalInicioC;
      capitalInicioUSD = existingReport.capitalInicioUSD;
    } else {
      const sortedReports = [...data.reports].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const lastReport = sortedReports[0];

      if (lastReport) {
        capitalInicioC = lastReport.capitalFinC;
        capitalInicioUSD = lastReport.capitalFinUSD;
      }
    }

    const newReport: DailyReport = {
      id: existingReport?.id || crypto.randomUUID(),
      date: todayDate,
      capitalInicioC,
      capitalFinC: currentCapitalC,
      capitalInicioUSD,
      capitalFinUSD: currentCapitalUSD,
    };

    addReport(newReport);
    alert("Informe diario guardado correctamente");
  };

  const sortedReports = [...data.reports].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyReports = sortedReports.filter((report) => {
    const reportDate = new Date(report.date);
    return reportDate.getMonth() === currentMonth && reportDate.getFullYear() === currentYear;
  });

  const firstReport = monthlyReports[monthlyReports.length - 1];
  const lastReport = monthlyReports[0];

  const monthlyCapitalInicioC = firstReport?.capitalInicioC || 0;
  const monthlyCapitalFinC = lastReport?.capitalFinC || 0;
  const monthlyCapitalInicioUSD = firstReport?.capitalInicioUSD || 0;
  const monthlyCapitalFinUSD = lastReport?.capitalFinUSD || 0;

  const monthlyGainC = monthlyCapitalFinC - monthlyCapitalInicioC;
  const monthlyGainUSD = monthlyCapitalFinUSD - monthlyCapitalInicioUSD;

  const monthlyExpenses = data.expenses.filter((exp) => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  });

  const totalMonthlyExpensesC = monthlyExpenses.reduce((sum, exp) => {
    const amountInC = exp.currency === "USD" ? exp.amount * data.settings.usdToCSell : exp.amount;
    return sum + amountInC;
  }, 0);

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Informes</h2>
        <Button onClick={handleSaveDailyReport} className="flex items-center gap-2">
          <FileText size={18} />
          Guardar Hoy
        </Button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setShowMonthly(false)}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            !showMonthly
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
          }`}
        >
          Diarios
        </button>
        <button
          onClick={() => setShowMonthly(true)}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            showMonthly
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
          }`}
        >
          Mensual
        </button>
      </div>

      {showMonthly ? (
        <>
          {monthlyReports.length > 0 ? (
            <Card className="bg-gradient-to-br from-purple-600 to-purple-800 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={24} />
                <h3 className="text-xl font-bold">Informe de {monthName}</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm opacity-90">Capital Inicial</p>
                  <p className="text-2xl font-bold">
                    C$ {formatMoney(monthlyCapitalInicioC, { decimals: 2 })}
                  </p>
                  <p className="text-lg opacity-90">
                    USD {formatMoney(monthlyCapitalInicioUSD, { decimals: 2 })}
                  </p>
                </div>

                <div>
                  <p className="text-sm opacity-90">Capital Final</p>
                  <p className="text-2xl font-bold">
                    C$ {formatMoney(monthlyCapitalFinC, { decimals: 2 })}
                  </p>
                  <p className="text-lg opacity-90">
                    USD {formatMoney(monthlyCapitalFinUSD, { decimals: 2 })}
                  </p>
                </div>

                <div className="border-t border-white/20 pt-4">
                  <p className="text-sm opacity-90">Ganancia Neta</p>
                  <div className="flex items-center gap-2">
                    {monthlyGainC >= 0 ? (
                      <TrendingUp size={24} className="text-green-300" />
                    ) : (
                      <TrendingDown size={24} className="text-red-300" />
                    )}
                    <div>
                      <p
                        className={`text-2xl font-bold ${
                          monthlyGainC >= 0 ? "text-green-300" : "text-red-300"
                        }`}
                      >
                        {monthlyGainC >= 0 ? "+" : ""}C$ {formatMoney(monthlyGainC, { decimals: 2 })}
                      </p>
                      <p
                        className={`text-lg ${
                          monthlyGainUSD >= 0 ? "text-green-300" : "text-red-300"
                        }`}
                      >
                        {monthlyGainUSD >= 0 ? "+" : ""}USD{" "}
                        {formatMoney(monthlyGainUSD, { decimals: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/20 pt-4">
                  <p className="text-sm opacity-90">Gastos del Mes</p>
                  <p className="text-xl font-bold text-red-300">
                    C$ {formatMoney(totalMonthlyExpensesC, { decimals: 2 })}
                  </p>
                  <p className="text-sm opacity-90">
                    {monthlyExpenses.length} gasto{monthlyExpenses.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="border-t border-white/20 pt-4">
                  <p className="text-sm opacity-90">Días con Informes</p>
                  <p className="text-xl font-bold">{monthlyReports.length} días</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                No hay informes guardados para este mes.
                <br />
                Guarda tu primer informe diario para ver el resumen mensual.
              </p>
            </Card>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {sortedReports.map((report) => {
            const gainC = report.capitalFinC - report.capitalInicioC;
            const gainUSD = report.capitalFinUSD - report.capitalInicioUSD;

            return (
              <Card key={report.id}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <FileText size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        {new Date(report.date).toLocaleDateString("es-ES", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{report.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {gainC >= 0 ? (
                      <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown size={20} className="text-red-600 dark:text-red-400" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">Inicio</p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      C$ {formatMoney(report.capitalInicioC, { decimals: 2 })}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      USD {formatMoney(report.capitalInicioUSD, { decimals: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">Final</p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      C$ {formatMoney(report.capitalFinC, { decimals: 2 })}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      USD {formatMoney(report.capitalFinUSD, { decimals: 2 })}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Variación:</span>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          gainC >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {gainC >= 0 ? "+" : ""}C$ {formatMoney(gainC, { decimals: 2 })}
                      </p>
                      <p
                        className={`text-xs ${
                          gainUSD >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {gainUSD >= 0 ? "+" : ""}USD {formatMoney(gainUSD, { decimals: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {sortedReports.length === 0 && (
            <Card>
              <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                No hay informes guardados.
                <br />
                Guarda tu primer informe diario para comenzar.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

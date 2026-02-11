import { useEffect, useState } from "react";
import { useData } from "../context/DataContext";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Moon, Sun, Download, Upload } from "lucide-react";
import { rawToNumber } from "../utils/numberInput";

function toStrOrEmpty(n: any) {
  const num = Number(n ?? 0);
  return num ? String(num) : "";
}

export function Settings() {
  const { data, updateSettings, exportData, importData } = useData();
  const { theme, toggleTheme } = useTheme();

  const [settings, setSettings] = useState(data.settings);
  const [saved, setSaved] = useState(false);

  // ✅ RAW strings (vacíos si el valor es 0)
  const [usdBuyStr, setUsdBuyStr] = useState(toStrOrEmpty(data.settings.usdToCBuy));
  const [usdSellStr, setUsdSellStr] = useState(toStrOrEmpty(data.settings.usdToCSell));
  const [usdtManualStr, setUsdtManualStr] = useState(
    toStrOrEmpty((data.settings as any).usdtToCManual)
  );

  useEffect(() => {
    setSettings(data.settings);
    setUsdBuyStr(toStrOrEmpty(data.settings.usdToCBuy));
    setUsdSellStr(toStrOrEmpty(data.settings.usdToCSell));
    setUsdtManualStr(toStrOrEmpty((data.settings as any).usdtToCManual));
  }, [data.settings]);

  const handleSave = () => {
    // ✅ convertir SOLO al guardar
    const usdBuyN = rawToNumber(usdBuyStr) ?? 0;
    const usdSellN = rawToNumber(usdSellStr) ?? 0;
    const usdtManualN = rawToNumber(usdtManualStr) ?? 0;

    const usdBuy = Number(usdBuyN.toFixed(2));
    const usdSell = Number(usdSellN.toFixed(2));
    const usdtManual = Number(usdtManualN.toFixed(2));

    updateSettings({
      ...settings,
      usdToCBuy: Number.isFinite(usdBuy) ? usdBuy : 0,
      usdToCSell: Number.isFinite(usdSell) ? usdSell : 0,
      ...(settings.usdtToCMode === "MANUAL"
        ? { usdtToCManual: Number.isFinite(usdtManual) ? usdtManual : 0 }
        : {}),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    const jsonData = exportData();
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capital-p2p-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = event.target?.result as string;
          importData(jsonData);
          alert("Datos importados correctamente");
          window.location.reload();
        } catch {
          alert("Error al importar datos. Verifica el archivo JSON.");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Tasas de Cambio USD → C$
        </h2>

        <Input
          label="USD → C$ (Compra)"
          type="text"
          value={usdBuyStr}
          onChange={(v) => {
            setUsdBuyStr(v);
            // ✅ NO convertir aquí (solo escritura)
            // settings se actualiza al guardar
          }}
          required
          formatDecimals={2}
          placeholder=""
        />

        <Input
          label="USD → C$ (Venta)"
          type="text"
          value={usdSellStr}
          onChange={(v) => {
            setUsdSellStr(v);
          }}
          required
          formatDecimals={2}
          placeholder=""
        />
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Valuación USDT → C$
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Modo de Cálculo
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setSettings({ ...settings, usdtToCMode: "AUTO" })}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                settings.usdtToCMode === "AUTO"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
              }`}
            >
              AUTO
            </button>
            <button
              onClick={() => setSettings({ ...settings, usdtToCMode: "MANUAL" })}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                settings.usdtToCMode === "MANUAL"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
              }`}
            >
              MANUAL
            </button>
          </div>
        </div>

        {settings.usdtToCMode === "MANUAL" && (
          <Input
            label="USDT → C$ (Manual)"
            type="text"
            value={usdtManualStr}
            onChange={(v) => {
              setUsdtManualStr(v);
            }}
            required
            formatDecimals={2}
            placeholder=""
          />
        )}

        {settings.usdtToCMode === "AUTO" && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              El valor USDT se calculará automáticamente usando el promedio ponderado de tus compras.
            </p>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Apariencia</h2>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
        >
          <span className="text-gray-900 dark:text-white">
            Modo {theme === "dark" ? "Oscuro" : "Claro"}
          </span>
          {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Respaldo de Datos</h2>
        <div className="space-y-2">
          <Button
            onClick={handleExport}
            variant="secondary"
            className="w-full flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Exportar Respaldo (JSON)
          </Button>

          <label className="block">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-file"
            />
            <Button
              onClick={() => document.getElementById("import-file")?.click()}
              variant="secondary"
              className="w-full flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              Importar Respaldo (JSON)
            </Button>
          </label>
        </div>
      </Card>

      <Button onClick={handleSave} className="w-full">
        {saved ? "Guardado ✓" : "Guardar Configuración"}
      </Button>
    </div>
  );
}

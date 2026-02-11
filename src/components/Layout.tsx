import { ReactNode } from 'react';
import { Home, Wallet, ArrowLeftRight, Receipt, FileText, Settings, Repeat } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

const navItems = [
  { id: 'capital', label: 'Capital', icon: Home },
  { id: 'accounts', label: 'Cuentas', icon: Wallet },
  { id: 'orders', label: 'P2P', icon: ArrowLeftRight },

  // ✅ NUEVO: Movimientos
  { id: 'movements', label: 'Movs', icon: Repeat },

  { id: 'expenses', label: 'Gastos', icon: Receipt },
  { id: 'reports', label: 'Informes', icon: FileText },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Capital P2P
          </h1>
        </div>
      </header>

      <main className="px-4 py-4">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-pb">
        {/* Antes grid-cols-6, ahora 7 */}
        <div className="grid grid-cols-7 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

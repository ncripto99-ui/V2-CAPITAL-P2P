import { useState } from 'react';
import { Layout } from './components/Layout';
import { Capital } from './views/Capital';
import { Accounts } from './views/Accounts';
import { Orders } from './views/Orders';
import { Expenses } from './views/Expenses';
import { Reports } from './views/Reports';
import { Settings } from './views/Settings';
import { Movements } from './views/Movements';


function App() {
  const [currentView, setCurrentView] = useState('capital');

  const renderView = () => {
    switch (currentView) {
      case 'capital':
        return <Capital />;
      case 'accounts':
        return <Accounts />;
      case 'orders':
        return <Orders />;
      case 'expenses':
        return <Expenses />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
        case 'movements':
  return <Movements />;
      default:
        return <Capital />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {renderView()}
    </Layout>
  );
}

export default App;

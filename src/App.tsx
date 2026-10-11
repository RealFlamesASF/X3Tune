import { NavBar } from './components/NavBar';
import { StatusBar } from './components/StatusBar';
import { Toasts } from './components/Toasts';
import { useApp } from './context/AppContext';
import { Dashboard } from './pages/Dashboard';
import { DeviceInfoPage } from './pages/DeviceInfoPage';
import { Firmware } from './pages/Firmware';
import { Settings } from './pages/Settings';

export default function App() {
  const { tab } = useApp();
  return (
    <div className="min-h-screen pb-16 md:pb-12">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'firmware' && <Firmware />}
        {tab === 'device' && <DeviceInfoPage />}
        {tab === 'settings' && <Settings />}
      </main>
      <StatusBar />
      <Toasts />
    </div>
  );
}

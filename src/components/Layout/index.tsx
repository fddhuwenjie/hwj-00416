import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.js';
import Header from './Header.js';
import MessageToast from './MessageToast.js';
import { useAppStore } from '../../store/app.js';
import { cn } from '../../lib/utils.js';

export default function Layout() {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      <MessageToast />
    </div>
  );
}

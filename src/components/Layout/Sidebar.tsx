import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Wrench,
  FileText,
  Gift,
  Tags,
} from 'lucide-react';
import { useAppStore } from '../../store/app.js';
import { cn } from '../../lib/utils.js';

const menuItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/devices', label: '设备管理', icon: Package },
  { path: '/orders', label: '订单管理', icon: ShoppingCart },
  { path: '/calendar', label: '日历视图', icon: Calendar },
  { path: '/customers', label: '客户管理', icon: Users },
  { path: '/maintenance', label: '设备维保', icon: Wrench },
  { path: '/contracts', label: '合同管理', icon: FileText },
  { path: '/packages', label: '套餐管理', icon: Tags },
  { path: '/coupons', label: '优惠券', icon: Gift },
  { path: '/stats', label: '统计报表', icon: BarChart3 },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-slate-900 text-white transition-all duration-300 z-40',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
        {!sidebarCollapsed && (
          <h1 className="text-lg font-bold text-blue-400">设备租赁系统</h1>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight size={20} />
          ) : (
            <ChevronLeft size={20} />
          )}
        </button>
      </div>

      <nav className="p-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

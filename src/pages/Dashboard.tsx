import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer,
} from 'recharts';
import {
  Package, Users, ShoppingCart, DollarSign, AlertTriangle,
  TrendingUp, Clock, BarChart3, PieChart as PieChartIcon,
  Award, Calendar
} from 'lucide-react';
import { statsApi } from '../api/stats.js';
import { deviceApi } from '../api/device.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import StatCard from '../components/Common/StatCard.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import type { DashboardStats, RevenueData, Device } from '../../shared/types.js';
import { formatCurrency, formatDate, deviceStatusMap } from '../utils/format.js';

const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#6366F1'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [lowStockDevices, setLowStockDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const { showMessage } = useAppStore();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [statsData, revenueDataResult, lowStockResult] = await Promise.all([
        statsApi.getDashboard(),
        statsApi.getRevenue(30),
        deviceApi.getLowStock(3),
      ]);
      setStats(statsData);
      setRevenueData(revenueDataResult);
      setLowStockDevices(lowStockResult);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const categoryData = stats.categoryStats?.map((cat, idx) => ({
    name: cat.categoryName,
    value: cat.count,
    color: COLORS[idx % COLORS.length],
  })) || [];

  const hotDevicesData = stats.hotDevices?.map((d, idx) => ({
    name: d.deviceName,
    租赁次数: d.count,
    排名: idx + 1,
  })) || [];

  const utilizationColor = stats.deviceUtilizationRate >= 70 ? 'text-green-600' :
    stats.deviceUtilizationRate >= 40 ? 'text-yellow-600' : 'text-red-600';

  const overdueColor = stats.overdueRate <= 5 ? 'text-green-600' :
    stats.overdueRate <= 15 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div>
      <PageHeader
        title="数据仪表盘"
        description="查看设备租赁业务的核心数据指标和统计分析"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="设备总数"
          value={stats.totalDevices}
          subValue={`可用 ${stats.availableDevices} 台`}
          icon={<Package className="text-blue-600" />}
        />
        <StatCard
          title="订单总数"
          value={stats.totalOrders}
          subValue={`进行中 ${stats.activeOrders} 单`}
          icon={<ShoppingCart className="text-purple-600" />}
        />
        <StatCard
          title="客户总数"
          value={stats.totalCustomers}
          subValue={`黑名单 ${stats.blacklistedCustomers} 人`}
          icon={<Users className="text-green-600" />}
        />
        <StatCard
          title="本月营收"
          value={formatCurrency(stats.monthRevenue)}
          subValue={`累计 ${formatCurrency(stats.totalRevenue)}`}
          icon={<DollarSign className="text-amber-600" />}
          trend="+18%"
          trendUp
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" />
              营收趋势（近30天）
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), '营收']}
                  labelFormatter={(label) => `日期: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="营收"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  name="订单数"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <PieChartIcon size={18} className="text-purple-600" />
              分类租赁占比
            </h3>
          </div>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} 次`, '租赁次数']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-40 space-y-2">
              {categoryData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-gray-600 truncate">{item.name}</span>
                  <span className="text-xs font-medium text-gray-900 ml-auto">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              设备利用率
            </h3>
          </div>
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={stats.deviceUtilizationRate >= 70 ? '#10B981' :
                    stats.deviceUtilizationRate >= 40 ? '#F59E0B' : '#EF4444'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(stats.deviceUtilizationRate / 100) * 351.86} 351.86`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl font-bold ${utilizationColor}`}>
                  {stats.deviceUtilizationRate.toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              实际出租天数 / 可出租天数
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-600" />
              逾期率统计
            </h3>
          </div>
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={stats.overdueRate <= 5 ? '#10B981' :
                    stats.overdueRate <= 15 ? '#F59E0B' : '#EF4444'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(stats.overdueRate / 100) * 351.86} 351.86`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl font-bold ${overdueColor}`}>
                  {stats.overdueRate.toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              逾期订单数 / 总订单数
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" />
              运营概览
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package size={16} className="text-blue-600" />
                </div>
                <span className="text-sm text-gray-700">可用设备</span>
              </div>
              <span className="font-bold text-blue-600">{stats.availableDevices}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart size={16} className="text-purple-600" />
                </div>
                <span className="text-sm text-gray-700">进行中订单</span>
              </div>
              <span className="font-bold text-purple-600">{stats.activeOrders}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Users size={16} className="text-amber-600" />
                </div>
                <span className="text-sm text-gray-700">黑名单客户</span>
              </div>
              <span className="font-bold text-amber-600">{stats.blacklistedCustomers}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Award size={18} className="text-amber-600" />
              热门设备 TOP10
            </h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hotDevicesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  width={120}
                />
                <Tooltip
                  formatter={(value: number) => [`${value} 次`, '租赁次数']}
                />
                <Bar
                  dataKey="租赁次数"
                  fill="#F59E0B"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600" />
              库存预警（≤3件）
            </h3>
          </div>
          {lowStockDevices.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {lowStockDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-4 p-3 bg-red-50 border border-red-100 rounded-lg"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-red-100 flex-shrink-0">
                    {device.photoUrl ? (
                      <img src={device.photoUrl} alt={device.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-red-400">
                        <Package size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{device.name}</p>
                      <StatusBadge
                        label={deviceStatusMap[device.status].label}
                        color={deviceStatusMap[device.status].color}
                        small
                      />
                    </div>
                    <p className="text-xs text-gray-500">{device.brandModel}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{device.stock} 件</p>
                    <p className="text-xs text-gray-400">库存不足</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award size={32} className="text-green-600" />
                </div>
                <p className="text-gray-600 font-medium">库存状态良好</p>
                <p className="text-sm text-gray-400">暂无库存预警设备</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban, Crown, History, CreditCard, AlertTriangle, Star, TrendingUp } from 'lucide-react';
import { customerApi } from '../api/customer.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import DataTable from '../components/Common/DataTable.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import StatCard from '../components/Common/StatCard.js';
import type { Customer, Order } from '../../shared/types.js';
import { formatCurrency, customerLevelMap, orderStatusMap, getCreditScoreColor, formatDate } from '../utils/format.js';
import { cn } from '../lib/utils.js';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<(Customer & { orderCount: number; recentOrders: Order[] }) | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders'>('overview');
  const { showMessage, setLoading: setAppLoading } = useAppStore();

  useEffect(() => {
    if (id) loadCustomerData();
  }, [id]);

  async function loadCustomerData() {
    try {
      setLoading(true);
      const [customerData, ordersData] = await Promise.all([
        customerApi.getById(Number(id)),
        customerApi.getOrders(Number(id)),
      ]);
      setCustomer(customerData);
      setOrders(ordersData);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleBlacklist() {
    if (!customer) return;
    const action = customer.isBlacklisted ? '移出' : '加入';
    if (!confirm(`确定要${action}黑名单吗？`)) return;

    try {
      setAppLoading('toggleBlacklist', true);
      await customerApi.toggleBlacklist(Number(id));
      showMessage('success', `已${action}黑名单`);
      loadCustomerData();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('toggleBlacklist', false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">客户不存在</p>
        <Link to="/customers" className="mt-4 inline-block text-blue-600 hover:underline">
          返回客户列表
        </Link>
      </div>
    );
  }

  const nextLevelThreshold = customer.vipLevel === 'normal' ? 10000 : customer.vipLevel === 'vip' ? 50000 : null;
  const progressToNext = nextLevelThreshold
    ? Math.min(100, (customer.totalSpent / nextLevelThreshold) * 100)
    : 100;

  const orderColumns = [
    {
      key: 'orderNo',
      header: '订单编号',
      render: (row: Order) => (
        <span className="font-mono text-sm font-medium text-blue-600">{row.orderNo}</span>
      ),
    },
    {
      key: 'dateRange',
      header: '租赁时段',
      render: (row: Order) => (
        <div className="text-sm">
          <p>{formatDate(row.startDate)}</p>
          <p className="text-gray-400">至 {formatDate(row.endDate)}</p>
        </div>
      ),
    },
    {
      key: 'totalRent',
      header: '租金',
      render: (row: Order) => <span className="font-medium text-blue-600">{formatCurrency(row.totalRent)}</span>,
    },
    {
      key: 'status',
      header: '状态',
      render: (row: Order) => (
        <StatusBadge
          label={orderStatusMap[row.status].label}
          color={orderStatusMap[row.status].color}
        />
      ),
    },
    {
      key: 'createdAt',
      header: '创建时间',
      render: (row: Order) => <span className="text-gray-500 text-sm">{formatDate(row.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="客户详情"
        description="查看客户档案、租赁历史和信用记录"
        actions={
          <div className="flex items-center gap-3">
            <Link
              to="/customers"
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              <ArrowLeft size={18} />
              返回列表
            </Link>
            <button
              onClick={handleToggleBlacklist}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm',
                customer.isBlacklisted
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              )}
            >
              <Ban size={18} />
              {customer.isBlacklisted ? '移出黑名单' : '加入黑名单'}
            </button>
          </div>
        }
      />

      {customer.isBlacklisted && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-500" size={24} />
            <div>
              <h4 className="font-semibold text-red-800">该客户已被加入黑名单</h4>
              <p className="text-sm text-red-700">
                信用评分低于60分或存在严重逾期/损坏设备记录，将无法创建新订单。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl',
                customer.isBlacklisted ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
              )}>
                {customer.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
                  {customer.vipLevel !== 'normal' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-xs font-medium">
                      <Crown size={12} />
                      {customerLevelMap[customer.vipLevel].label}
                    </span>
                  )}
                </div>
                <p className="text-gray-500">{customer.phone}</p>
                {customer.idCard && (
                  <p className="text-gray-400 text-sm font-mono">{customer.idCard}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">信用评分</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      customer.creditScore >= 90 ? 'bg-green-500' :
                      customer.creditScore >= 70 ? 'bg-blue-500' :
                      customer.creditScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${Math.max(0, Math.min(100, customer.creditScore))}%` }}
                  />
                </div>
                <span className={cn('font-bold', getCreditScoreColor(customer.creditScore))}>
                  {customer.creditScore}
                </span>
              </div>
            </div>

            {nextLevelThreshold && (
              <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-500">
                  距离{customer.vipLevel === 'normal' ? 'VIP' : 'SVIP'}还需
                </span>
                <span className="font-medium text-gray-700">
                  {formatCurrency(nextLevelThreshold - customer.totalSpent)}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
            </div>
          )}

            <div className="pt-2">
              <p className="text-xs text-gray-400">
                注册时间: {formatDate(customer.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="累计消费"
            value={formatCurrency(customer.totalSpent)}
            icon={<TrendingUp className="text-blue-600" />}
            trend="+12%"
            trendUp
          />
          <StatCard
            title="订单总数"
            value={customer.orderCount || 0}
            icon={<History className="text-green-600" />}
          />
          <StatCard
            title="会员等级"
            value={customerLevelMap[customer.vipLevel].label}
            icon={<Crown className="text-amber-600" />}
          />
        </div>
        </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-6 py-3 text-sm font-medium transition-colors',
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            概览
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={cn(
              'px-6 py-3 text-sm font-medium transition-colors',
              activeTab === 'orders'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            租赁历史
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Star size={18} className="text-amber-500" />
                  会员权益
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={cn(
                    'p-4 rounded-lg border-2',
                    customer.vipLevel === 'normal' ? 'border-gray-200 bg-gray-50' : 'border-amber-200 bg-amber-50'
                  )}>
                    <h4 className="font-medium text-gray-900">普通会员</h4>
                    <p className="text-sm text-gray-500 mt-1">无折扣</p>
                  </div>
                  <div className={cn(
                    'p-4 rounded-lg border-2',
                    customer.vipLevel === 'vip' || customer.vipLevel === 'svip'
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-gray-200 bg-gray-50'
                  )}>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">VIP会员</h4>
                      {customer.vipLevel === 'vip' && <Crown size={16} className="text-amber-500" />}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">95折优惠</p>
                    <p className="text-xs text-gray-400">累计消费满10,000元</p>
                  </div>
                  <div className={cn(
                    'p-4 rounded-lg border-2',
                    customer.vipLevel === 'svip'
                      ? 'border-rose-400 bg-rose-50'
                      : 'border-gray-200 bg-gray-50'
                  )}>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">SVIP会员</h4>
                      {customer.vipLevel === 'svip' && <Crown size={16} className="text-rose-500" />}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">9折优惠</p>
                    <p className="text-xs text-gray-400">累计消费满50,000元</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard size={18} className="text-blue-500" />
                  信用记录说明
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
                  <p>• 初始信用分为100分</p>
                  <p>• 逾期归还：-10分/次</p>
                  <p>• 损坏设备：-20分/次</p>
                  <p>• 信用分低于60分自动加入黑名单</p>
                  <p>• 黑名单客户无法创建新订单</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <History size={18} className="text-green-500" />
                  最近订单
                </h3>
                {orders.length > 0 ? (
                  <div className="space-y-2">
                    {orders.slice(0, 3).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <div>
                          <p className="font-medium text-gray-900">{order.orderNo}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(order.startDate)} - {formatDate(order.endDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-blue-600">{formatCurrency(order.totalRent)}</p>
                          <StatusBadge
                            label={orderStatusMap[order.status].label}
                            color={orderStatusMap[order.status].color}
                            small
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-4">暂无订单记录</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <DataTable
              columns={orderColumns}
              data={orders}
              emptyText="暂无订单记录"
              onRowClick={(row) => navigate(`/orders/${row.id}`)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

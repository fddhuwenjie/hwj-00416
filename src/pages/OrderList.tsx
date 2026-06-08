import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Eye, RotateCcw } from 'lucide-react';
import { orderApi } from '../api/order.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import DataTable from '../components/Common/DataTable.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import type { Order, OrderStatus } from '../../shared/types.js';
import { orderStatusMap, formatCurrency, formatDate } from '../utils/format.js';
import { cn } from '../lib/utils.js';

const statusFilters: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待确认' },
  { value: 'out', label: '已出库' },
  { value: 'in_use', label: '使用中' },
  { value: 'returned', label: '已归还' },
  { value: 'overdue', label: '逾期' },
];

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const navigate = useNavigate();
  const { showMessage } = useAppStore();

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  async function loadOrders() {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const data = await orderApi.getAll(params);
      setOrders(data);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    {
      key: 'orderNo',
      header: '订单编号',
      render: (row: Order) => (
        <span className="font-mono text-sm font-medium text-blue-600">{row.orderNo}</span>
      ),
    },
    {
      key: 'customerName',
      header: '租赁人',
      render: (row: Order) => (
        <div>
          <p className="font-medium text-gray-900">{row.customerName}</p>
          <p className="text-xs text-gray-500">{row.customerPhone}</p>
        </div>
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
      header: '租金总额',
      render: (row: Order) => <span className="font-medium text-blue-600">{formatCurrency(row.totalRent)}</span>,
    },
    {
      key: 'totalDeposit',
      header: '押金',
      render: (row: Order) => formatCurrency(row.totalDeposit),
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
      render: (row: Order) => <span className="text-gray-500">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '操作',
      className: 'text-right',
      render: (row: Order) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/orders/${row.id}`); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="查看详情"
          >
            <Eye size={16} />
          </button>
          {['pending', 'out', 'in_use', 'overdue'].includes(row.status) && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/orders/${row.id}/return`); }}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="归还结算"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="订单管理"
        description="管理所有租赁订单，包括待确认、已出库、使用中、已归还等状态"
        actions={
          <Link
            to="/orders/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
          >
            <Plus size={18} />
            创建订单
          </Link>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              statusFilter === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        emptyText="暂无订单数据"
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
      />
    </div>
  );
}

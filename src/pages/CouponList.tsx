import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Send, Search, Ticket } from 'lucide-react';
import { couponApi } from '../api/coupon.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import DataTable from '../components/Common/DataTable.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import CouponDistributeModal from '../components/Common/CouponDistributeModal.js';
import type { Coupon, CouponStatus } from '../../shared/types.js';
import { formatCurrency, formatDate, couponTypeMap, couponStatusMap } from '../utils/format.js';
import { cn } from '../lib/utils.js';

export default function CouponList() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<CouponStatus | 'all'>('all');
  const [distributeModalOpen, setDistributeModalOpen] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { showMessage, setLoading: setAppLoading } = useAppStore();

  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const data = await couponApi.getAll(params);
      setCoupons(data);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showMessage]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadCoupons();
  }

  function handleOpenDistributeModal(couponId: number, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedCouponId(couponId);
    setDistributeModalOpen(true);
  }

  function handleCloseDistributeModal() {
    setDistributeModalOpen(false);
    setSelectedCouponId(null);
  }

  function handleDistributeSuccess() {
    loadCoupons();
    handleCloseDistributeModal();
  }

  function formatCouponValue(coupon: Coupon): string {
    if (coupon.type === 'fixed') {
      return formatCurrency(coupon.value);
    } else {
      return `${coupon.value}%`;
    }
  }

  function formatValidity(coupon: Coupon): string {
    return `${formatDate(coupon.validFrom)} ~ ${formatDate(coupon.validTo)}`;
  }

  const filteredCoupons = coupons.filter(c =>
    c.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    c.code.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      header: '优惠券名称',
      render: (row: Coupon) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            row.type === 'fixed' ? 'bg-blue-100' : 'bg-purple-100'
          )}>
            <Ticket size={20} className={row.type === 'fixed' ? 'text-blue-600' : 'text-purple-600'} />
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-sm text-gray-500 font-mono">{row.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: '类型',
      render: (row: Coupon) => (
        <StatusBadge
          label={couponTypeMap[row.type].label}
          color={couponTypeMap[row.type].color}
        />
      ),
    },
    {
      key: 'value',
      header: '面值',
      render: (row: Coupon) => (
        <span className={cn(
          'font-semibold',
          row.type === 'fixed' ? 'text-blue-600' : 'text-purple-600'
        )}>
          {formatCouponValue(row)}
        </span>
      ),
    },
    {
      key: 'minOrderAmount',
      header: '最低消费',
      render: (row: Coupon) => (
        <span className="text-gray-600">{formatCurrency(row.minOrderAmount)}</span>
      ),
    },
    {
      key: 'validity',
      header: '有效期',
      render: (row: Coupon) => (
        <span className="text-gray-600 text-sm">{formatValidity(row)}</span>
      ),
    },
    {
      key: 'usage',
      header: '已使用/总数量',
      render: (row: Coupon) => (
        <div>
          <p className="font-medium text-gray-900">
            {row.usedQuantity} / {row.totalQuantity}
          </p>
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${Math.min(100, (row.usedQuantity / row.totalQuantity) * 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (row: Coupon) => (
        <StatusBadge
          label={couponStatusMap[row.status].label}
          color={couponStatusMap[row.status].color}
        />
      ),
    },
    {
      key: 'actions',
      header: '操作',
      className: 'text-right',
      render: (row: Coupon) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/coupons/${row.id}`); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="查看详情"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => handleOpenDistributeModal(row.id, e)}
            disabled={row.status !== 'active' || row.usedQuantity >= row.totalQuantity}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              row.status === 'active' && row.usedQuantity < row.totalQuantity
                ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                : 'text-gray-300 cursor-not-allowed'
            )}
            title={row.status !== 'active' ? '优惠券未激活' : row.usedQuantity >= row.totalQuantity ? '已发放完毕' : '发放优惠券'}
          >
            <Send size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="优惠券管理"
        description="管理优惠券活动，设置优惠规则，发放给客户"
        actions={
          <button
            onClick={() => navigate('/coupons/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
          >
            <Plus size={18} />
            新增优惠券
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索优惠券名称或优惠码..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </form>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CouponStatus | 'all')}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">全部状态</option>
              <option value="active">有效</option>
              <option value="inactive">无效</option>
              <option value="expired">已过期</option>
            </select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredCoupons}
        loading={loading}
        emptyText="暂无优惠券数据"
        onRowClick={(row) => navigate(`/coupons/${row.id}`)}
      />

      {selectedCouponId !== null && (
        <CouponDistributeModal
          open={distributeModalOpen}
          onClose={handleCloseDistributeModal}
          couponId={selectedCouponId}
          onSuccess={handleDistributeSuccess}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Eye, Power, Search } from 'lucide-react';
import { packageApi } from '../api/package.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import DataTable from '../components/Common/DataTable.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import type { Package, PackageStatus } from '../../shared/types.js';
import { formatCurrency, formatDate, packageStatusMap } from '../utils/format.js';

export default function PackageList() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<PackageStatus | 'all'>('all');
  const navigate = useNavigate();
  const { showMessage, setLoading: setAppLoading } = useAppStore();

  useEffect(() => {
    loadPackages();
  }, [statusFilter]);

  async function loadPackages() {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const data = await packageApi.getAll(params);
      setPackages(data);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadPackages();
  }

  async function handleToggleStatus(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    const pkg = packages.find(p => p.id === id);
    if (!pkg) return;

    const action = pkg.status === 'active' ? '停用' : '启用';
    if (!confirm(`确定要${action}该套餐吗？`)) return;

    try {
      setAppLoading('toggleStatus', true);
      await packageApi.toggle(id);
      showMessage('success', `套餐${action}成功`);
      loadPackages();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('toggleStatus', false);
    }
  }

  function calculateDiscount(originalPrice: number, totalPrice: number): string {
    if (originalPrice === 0) return '0%';
    const discount = ((originalPrice - totalPrice) / originalPrice * 100).toFixed(1);
    return `-${discount}%`;
  }

  const filteredPackages = packages.filter(p =>
    p.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchKeyword.toLowerCase()))
  );

  const columns = [
    {
      key: 'name',
      header: '套餐名称',
      render: (row: Package) => (
        <div className="flex items-center gap-3">
          {row.photoUrl ? (
            <img
              src={row.photoUrl}
              alt={row.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400 text-xl">📦</span>
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            {row.description && (
              <p className="text-sm text-gray-500 truncate max-w-xs">{row.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: '描述',
      render: (row: Package) => (
        <span className="text-gray-600 text-sm">{row.description || '-'}</span>
      ),
    },
    {
      key: 'originalPrice',
      header: '原价',
      render: (row: Package) => (
        <span className="text-gray-500 line-through text-sm">{formatCurrency(row.originalPrice)}</span>
      ),
    },
    {
      key: 'totalPrice',
      header: '套餐价',
      render: (row: Package) => (
        <span className="font-semibold text-blue-600">{formatCurrency(row.totalPrice)}</span>
      ),
    },
    {
      key: 'discount',
      header: '优惠幅度',
      render: (row: Package) => (
        <span className="inline-flex items-center px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-medium">
          {calculateDiscount(row.originalPrice, row.totalPrice)}
        </span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (row: Package) => (
        <StatusBadge
          label={packageStatusMap[row.status].label}
          color={packageStatusMap[row.status].color}
        />
      ),
    },
    {
      key: 'createdAt',
      header: '创建时间',
      render: (row: Package) => (
        <span className="text-gray-500 text-sm">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '操作',
      className: 'text-right',
      render: (row: Package) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/packages/${row.id}`); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="查看详情"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/packages/${row.id}/edit`); }}
            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="编辑"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => handleToggleStatus(row.id, e)}
            className={row.status === 'active'
              ? 'p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'
              : 'p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors'
            }
            title={row.status === 'active' ? '停用' : '启用'}
          >
            <Power size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="套餐管理"
        description="管理设备租赁套餐，设置优惠组合"
        actions={
          <button
            onClick={() => navigate('/packages/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
          >
            <Plus size={18} />
            新增套餐
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索套餐名称或描述..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </form>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PackageStatus | 'all')}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">全部状态</option>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredPackages}
        loading={loading}
        emptyText="暂无套餐数据"
        onRowClick={(row) => navigate(`/packages/${row.id}`)}
      />
    </div>
  );
}

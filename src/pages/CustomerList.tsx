import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Eye, Ban, UserPlus, Search, AlertTriangle, Crown } from 'lucide-react';
import { customerApi } from '../api/customer.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import DataTable from '../components/Common/DataTable.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import type { Customer } from '../../shared/types.js';
import { formatCurrency, customerLevelMap, getCreditScoreColor } from '../utils/format.js';
import { cn } from '../lib/utils.js';

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [includeBlacklisted, setIncludeBlacklisted] = useState(true);
  const navigate = useNavigate();
  const { showMessage, setLoading: setAppLoading } = useAppStore();

  useEffect(() => {
    loadCustomers();
  }, [includeBlacklisted]);

  async function loadCustomers() {
    try {
      setLoading(true);
      const data = await customerApi.getAll({
        search: searchKeyword || undefined,
        includeBlacklisted,
      });
      setCustomers(data);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadCustomers();
  }

  async function handleToggleBlacklist(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    const action = customer.isBlacklisted ? '移出' : '加入';
    if (!confirm(`确定要${action}黑名单吗？`)) return;

    try {
      setAppLoading('toggleBlacklist', true);
      await customerApi.toggleBlacklist(id);
      showMessage('success', `已${action}黑名单`);
      loadCustomers();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('toggleBlacklist', false);
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    c.phone.includes(searchKeyword)
  );

  const columns = [
    {
      key: 'info',
      header: '客户信息',
      render: (row: Customer) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-lg',
            row.isBlacklisted ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
          )}>
            {row.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{row.name}</p>
              {row.isBlacklisted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs font-medium">
                  <Ban size={10} />
                  黑名单
                </span>
              )}
              {row.vipLevel !== 'normal' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-xs font-medium">
                  <Crown size={10} />
                  {customerLevelMap[row.vipLevel].label}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{row.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'creditScore',
      header: '信用评分',
      render: (row: Customer) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                row.creditScore >= 90 ? 'bg-green-500' :
                row.creditScore >= 70 ? 'bg-blue-500' :
                row.creditScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.max(0, Math.min(100, row.creditScore))}%` }}
            />
          </div>
          <span className={cn('font-medium text-sm', getCreditScoreColor(row.creditScore))}>
            {row.creditScore}
          </span>
        </div>
      ),
    },
    {
      key: 'totalSpent',
      header: '累计消费',
      render: (row: Customer) => (
        <span className="font-medium text-blue-600">{formatCurrency(row.totalSpent)}</span>
      ),
    },
    {
      key: 'vipLevel',
      header: '会员等级',
      render: (row: Customer) => (
        <StatusBadge
          label={customerLevelMap[row.vipLevel].label}
          color={customerLevelMap[row.vipLevel].color}
        />
      ),
    },
    {
      key: 'createdAt',
      header: '注册时间',
      render: (row: Customer) => (
        <span className="text-gray-500 text-sm">{row.createdAt?.split('T')[0]}</span>
      ),
    },
    {
      key: 'actions',
      header: '操作',
      className: 'text-right',
      render: (row: Customer) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/customers/${row.id}`); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="查看详情"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => handleToggleBlacklist(row.id, e)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              row.isBlacklisted
                ? 'text-green-600 hover:bg-green-50'
                : 'text-red-400 hover:text-red-600 hover:bg-red-50'
            )}
            title={row.isBlacklisted ? '移出黑名单' : '加入黑名单'}
          >
            <Ban size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="客户管理"
        description="管理客户档案，查看租赁历史，设置会员等级和黑名单"
        actions={
          <button
            onClick={() => {/* 打开新增客户弹窗 */}}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
          >
            <UserPlus size={18} />
            新增客户
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索客户姓名或手机号..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </form>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeBlacklisted}
              onChange={(e) => setIncludeBlacklisted(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">显示黑名单客户</span>
          </label>
        </div>
      </div>

      {customers.some(c => c.isBlacklisted) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-medium text-red-800">黑名单客户提醒</h4>
              <p className="text-sm text-red-700 mt-1">
                当前有 {customers.filter(c => c.isBlacklisted).length} 位客户在黑名单中，这些客户将无法创建新订单。
              </p>
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredCustomers}
        loading={loading}
        emptyText="暂无客户数据"
        onRowClick={(row) => navigate(`/customers/${row.id}`)}
      />
    </div>
  );
}

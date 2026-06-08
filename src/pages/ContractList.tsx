import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Download, Ban, Search } from 'lucide-react';
import { contractApi } from '../api/contract.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import DataTable from '../components/Common/DataTable.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import type { Contract, ContractStatus } from '../../shared/types.js';
import { contractStatusMap, formatCurrency, formatDate, formatDateTime, getDaysBetween } from '../utils/format.js';
import { cn } from '../lib/utils.js';

const statusFilters: { value: ContractStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending_signature', label: '待签署' },
  { value: 'active', label: '已生效' },
  { value: 'expired', label: '已过期' },
  { value: 'terminated', label: '已终止' },
];

export default function ContractList() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const navigate = useNavigate();
  const { showMessage, setLoading: setAppLoading } = useAppStore();

  useEffect(() => {
    loadContracts();
  }, [statusFilter, customerSearch]);

  async function loadContracts() {
    try {
      setLoading(true);
      const params: { status?: ContractStatus; customerId?: number } = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const data = await contractApi.getAll(params);
      
      let filteredData = data;
      if (customerSearch.trim()) {
        const searchLower = customerSearch.toLowerCase();
        filteredData = data.filter(c => 
          c.customerName?.toLowerCase().includes(searchLower) ||
          c.customerPhone?.includes(searchLower)
        );
      }
      
      setContracts(filteredData);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTerminate(contract: Contract) {
    if (!confirm(`确定要终止合同"${contract.contractNo}"吗？终止后合同将无法恢复。`)) return;

    try {
      setAppLoading('terminate', true);
      await contractApi.terminate(contract.id);
      showMessage('success', '合同终止成功');
      loadContracts();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('terminate', false);
    }
  }

  async function handleDownload(contract: Contract, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      setAppLoading('download', true);
      const htmlContent = await contractApi.download(contract.id);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contract.contractNo}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('success', '合同下载成功');
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('download', false);
    }
  }

  const columns = [
    {
      key: 'contractNo',
      header: '合同编号',
      render: (row: Contract) => (
        <span className="font-mono text-sm font-medium text-blue-600">{row.contractNo}</span>
      ),
    },
    {
      key: 'orderNo',
      header: '订单号',
      render: (row: Contract) => (
        <span className="font-mono text-sm text-gray-600">{row.orderNo}</span>
      ),
    },
    {
      key: 'customer',
      header: '客户名称',
      render: (row: Contract) => (
        <div>
          <p className="font-medium text-gray-900">{row.customerName}</p>
          <p className="text-xs text-gray-500">{row.customerPhone}</p>
        </div>
      ),
    },
    {
      key: 'customerPhone',
      header: '客户电话',
      render: (row: Contract) => (
        <span className="text-gray-600">{row.customerPhone}</span>
      ),
    },
    {
      key: 'rentalPeriod',
      header: '租期',
      render: (row: Contract) => {
        const days = getDaysBetween(row.startDate, row.endDate);
        return (
          <div className="text-sm">
            <p>{formatDate(row.startDate)}</p>
            <p className="text-gray-400">至 {formatDate(row.endDate)}</p>
            <p className="text-xs text-gray-400">共 {days} 天</p>
          </div>
        );
      },
    },
    {
      key: 'totalAmount',
      header: '合同金额',
      render: (row: Contract) => (
        <span className="font-medium text-blue-600">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (row: Contract) => (
        <StatusBadge
          label={contractStatusMap[row.status].label}
          color={contractStatusMap[row.status].color}
        />
      ),
    },
    {
      key: 'createdAt',
      header: '创建时间',
      render: (row: Contract) => (
        <span className="text-gray-500 text-sm">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '操作',
      className: 'text-right',
      render: (row: Contract) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${row.id}`); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="查看详情"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => handleDownload(row, e)}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="下载HTML"
          >
            <Download size={16} />
          </button>
          {row.status === 'active' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleTerminate(row); }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="终止合同"
            >
              <Ban size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="合同管理"
        description="管理所有租赁合同，包括待签署、已生效、已过期、已终止等状态"
      />

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
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

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索客户名称或电话..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={contracts}
        loading={loading}
        emptyText="暂无合同数据"
        onRowClick={(row) => navigate(`/contracts/${row.id}`)}
      />
    </div>
  );
}

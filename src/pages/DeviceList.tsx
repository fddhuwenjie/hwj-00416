import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react';
import { deviceApi } from '../api/device.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import DataTable from '../components/Common/DataTable.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import type { Device } from '../../shared/types.js';
import { deviceStatusMap, formatCurrency } from '../utils/format.js';
import { cn } from '../lib/utils.js';

export default function DeviceList() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const navigate = useNavigate();
  const { categories, showMessage, setLoading: setAppLoading } = useAppStore();

  useEffect(() => {
    loadDevices();
  }, [selectedCategory]);

  async function loadDevices() {
    try {
      setLoading(true);
      const data = await deviceApi.getAll(selectedCategory ? { categoryId: selectedCategory } : undefined);
      setDevices(data);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('确定要删除此设备吗？')) return;

    try {
      setAppLoading('delete', true);
      await deviceApi.delete(id);
      showMessage('success', '设备删除成功');
      loadDevices();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('delete', false);
    }
  }

  const columns = [
    {
      key: 'photo',
      header: '设备照片',
      render: (row: Device) => (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {row.photoUrl ? (
            <img src={row.photoUrl} alt={row.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Package size={20} />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: '设备名称',
      render: (row: Device) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500">{row.brandModel}</p>
        </div>
      ),
    },
    { key: 'categoryName', header: '分类' },
    {
      key: 'barcode',
      header: '条码/编号',
      render: (row: Device) => (
        <span className="font-mono text-sm text-gray-600">{row.barcode || '-'}</span>
      ),
    },
    {
      key: 'dailyRate',
      header: '日租金',
      render: (row: Device) => <span className="font-medium text-blue-600">{formatCurrency(row.dailyRate)}</span>,
    },
    {
      key: 'deposit',
      header: '押金',
      render: (row: Device) => formatCurrency(row.deposit),
    },
    {
      key: 'stock',
      header: '库存',
      render: (row: Device) => (
        <span className={cn(
          'font-medium',
          row.stock <= 2 ? 'text-red-600' : 'text-gray-900'
        )}>
          {row.stock} 件
          {row.stock <= 2 && <AlertTriangle size={14} className="inline ml-1 text-red-500" />}
        </span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (row: Device) => (
        <StatusBadge
          label={deviceStatusMap[row.status].label}
          color={deviceStatusMap[row.status].color}
        />
      ),
    },
    {
      key: 'actions',
      header: '操作',
      className: 'text-right',
      render: (row: Device) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/devices/${row.id}/edit`); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={(e) => handleDelete(row.id, e)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="设备管理"
        description="管理所有可租赁设备，包括摄影器材、音响设备、照明设备等"
        actions={
          <Link
            to="/devices/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
          >
            <Plus size={18} />
            添加设备
          </Link>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            selectedCategory === null
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          )}
        >
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={devices}
        loading={loading}
        emptyText="暂无设备数据"
        onRowClick={(row) => navigate(`/devices/${row.id}/edit`)}
      />
    </div>
  );
}

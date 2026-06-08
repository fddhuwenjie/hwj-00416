import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, UserCheck, Play, CheckCircle, XCircle, Bell, Zap } from 'lucide-react';
import { maintenanceApi } from '../api/maintenance.js';
import { deviceApi } from '../api/device.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import DataTable from '../components/Common/DataTable.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import type { MaintenanceRecord, MaintenanceStatus, MaintenanceType, MaintenancePriority, MaintenanceReminderRule, Device } from '../../shared/types.js';
import { formatDateTime, maintenanceStatusMap, maintenancePriorityMap, maintenanceTypeMap } from '../utils/format.js';
import { cn } from '../lib/utils.js';

export default function MaintenanceList() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [reminderRules, setReminderRules] = useState<MaintenanceReminderRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MaintenanceType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<MaintenancePriority | 'all'>('all');
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRuleDeviceId, setNewRuleDeviceId] = useState<number | ''>('');
  const [newRuleType, setNewRuleType] = useState<'rental_days' | 'fixed_period'>('fixed_period');
  const [newRuleThreshold, setNewRuleThreshold] = useState<number>(30);
  const navigate = useNavigate();
  const { showMessage, setLoading: setAppLoading } = useAppStore();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [statusFilter, typeFilter, priorityFilter]);

  async function loadData() {
    try {
      const [devicesData, rulesData] = await Promise.all([
        deviceApi.getAll(),
        maintenanceApi.getReminderRules(),
      ]);
      setDevices(devicesData);
      setReminderRules(rulesData);
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  }

  async function loadRecords() {
    try {
      setLoading(true);
      const params: { deviceId?: number; status?: MaintenanceStatus; type?: MaintenanceType } = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      const data = await maintenanceApi.getAll(params);
      let filtered = data;
      if (priorityFilter !== 'all') {
        filtered = filtered.filter(r => r.priority === priorityFilter);
      }
      if (searchKeyword.trim()) {
        filtered = filtered.filter(r =>
          r.deviceName?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          r.reporterName.toLowerCase().includes(searchKeyword.toLowerCase())
        );
      }
      setRecords(filtered);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStart(id: number) {
    if (!confirm('确定要开始维修吗？')) return;
    try {
      setAppLoading('start', true);
      await maintenanceApi.start(id);
      showMessage('success', '已开始维修');
      loadRecords();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('start', false);
    }
  }

  async function handleComplete(id: number) {
    navigate(`/maintenance/${id}`, { state: { openComplete: true } });
  }

  async function handleCancel(id: number) {
    if (!confirm('确定要取消此维保工单吗？')) return;
    try {
      setAppLoading('cancel', true);
      await maintenanceApi.cancel(id);
      showMessage('success', '工单已取消');
      loadRecords();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('cancel', false);
    }
  }

  async function handleGenerateOrders() {
    if (!confirm('确定要一键生成保养工单吗？这将根据提醒规则为到期设备创建保养工单。')) return;
    try {
      setAppLoading('generate', true);
      const result = await maintenanceApi.generateMaintenanceOrders();
      showMessage('success', `成功生成 ${result.length} 条保养工单`);
      loadRecords();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('generate', false);
    }
  }

  async function handleAddRule() {
    if (!newRuleDeviceId) {
      showMessage('error', '请选择设备');
      return;
    }
    try {
      setAppLoading('addRule', true);
      const rule = await maintenanceApi.createReminderRule({
        deviceId: Number(newRuleDeviceId),
        ruleType: newRuleType,
        thresholdDays: newRuleThreshold,
        isActive: true,
      });
      setReminderRules([...reminderRules, rule]);
      setShowAddRule(false);
      setNewRuleDeviceId('');
      setNewRuleThreshold(30);
      showMessage('success', '提醒规则添加成功');
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('addRule', false);
    }
  }

  function renderActionButtons(row: MaintenanceRecord) {
    return (
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/maintenance/${row.id}`); }}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="查看详情"
        >
          <Eye size={16} />
        </button>
        {row.status === 'pending' && (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/maintenance/${row.id}`, { state: { openAssign: true } }); }}
            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            title="分配"
          >
            <UserCheck size={16} />
          </button>
        )}
        {row.status === 'assigned' && (
          <button
            onClick={(e) => { e.stopPropagation(); handleStart(row.id); }}
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="开始维修"
          >
            <Play size={16} />
          </button>
        )}
        {row.status === 'in_progress' && (
          <button
            onClick={(e) => { e.stopPropagation(); handleComplete(row.id); }}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="完成维修"
          >
            <CheckCircle size={16} />
          </button>
        )}
        {(row.status === 'pending' || row.status === 'assigned') && (
          <button
            onClick={(e) => { e.stopPropagation(); handleCancel(row.id); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="取消"
          >
            <XCircle size={16} />
          </button>
        )}
      </div>
    );
  }

  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (row: MaintenanceRecord) => (
        <span className="font-mono text-sm text-gray-600">#{row.id}</span>
      ),
    },
    {
      key: 'deviceName',
      header: '设备名称',
      render: (row: MaintenanceRecord) => (
        <span className="font-medium text-gray-900">{row.deviceName || '-'}</span>
      ),
    },
    {
      key: 'type',
      header: '类型',
      render: (row: MaintenanceRecord) => (
        <StatusBadge
          label={maintenanceTypeMap[row.type].label}
          color={maintenanceTypeMap[row.type].color}
        />
      ),
    },
    {
      key: 'priority',
      header: '紧急程度',
      render: (row: MaintenanceRecord) => (
        <StatusBadge
          label={maintenancePriorityMap[row.priority].label}
          color={maintenancePriorityMap[row.priority].color}
        />
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (row: MaintenanceRecord) => (
        <StatusBadge
          label={maintenanceStatusMap[row.status].label}
          color={maintenanceStatusMap[row.status].color}
        />
      ),
    },
    { key: 'reporterName', header: '报修人' },
    {
      key: 'createdAt',
      header: '报修时间',
      render: (row: MaintenanceRecord) => formatDateTime(row.createdAt),
    },
    {
      key: 'actions',
      header: '操作',
      className: 'text-right',
      render: (row: MaintenanceRecord) => renderActionButtons(row),
    },
  ];

  const statusOptions: { value: MaintenanceStatus | 'all'; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'pending', label: '待处理' },
    { value: 'assigned', label: '已分配' },
    { value: 'in_progress', label: '维修中' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
  ];

  const typeOptions: { value: MaintenanceType | 'all'; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'repair', label: '维修' },
    { value: 'maintenance', label: '保养' },
  ];

  const priorityOptions: { value: MaintenancePriority | 'all'; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' },
  ];

  return (
    <div>
      <PageHeader
        title="设备维保管理"
        description="管理设备维修和保养工单，跟踪维修进度"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateOrders}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm"
            >
              <Zap size={18} />
              一键生成保养工单
            </button>
            <Link
              to="/maintenance/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
            >
              <Plus size={18} />
              新增报修
            </Link>
          </div>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索设备名称或报修人..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadRecords()}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MaintenanceStatus | 'all')}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MaintenanceType | 'all')}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as MaintenancePriority | 'all')}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {priorityOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={records}
        loading={loading}
        emptyText="暂无维保记录"
        onRowClick={(row) => navigate(`/maintenance/${row.id}`)}
      />

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900">维保提醒规则</h3>
          </div>
          <button
            onClick={() => setShowAddRule(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium"
          >
            <Plus size={16} />
            添加规则
          </button>
        </div>

        {showAddRule && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择设备</label>
                <select
                  value={newRuleDeviceId}
                  onChange={(e) => setNewRuleDeviceId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">请选择设备</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">规则类型</label>
                <select
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value as 'rental_days' | 'fixed_period')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="fixed_period">固定周期</option>
                  <option value="rental_days">累计租赁天数</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">阈值（天）</label>
                <input
                  type="number"
                  value={newRuleThreshold}
                  onChange={(e) => setNewRuleThreshold(Number(e.target.value))}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleAddRule}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  确认添加
                </button>
                <button
                  onClick={() => setShowAddRule(false)}
                  className="px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {reminderRules.length === 0 ? (
          <p className="text-gray-400 text-center py-8">暂无提醒规则</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reminderRules.map(rule => (
              <div key={rule.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-gray-900">{rule.deviceName}</span>
                  <StatusBadge
                    label={rule.isActive ? '启用' : '停用'}
                    color={rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                    small
                  />
                </div>
                <p className="text-sm text-gray-500 mb-1">
                  规则类型：{rule.ruleType === 'fixed_period' ? '固定周期' : '累计租赁天数'}
                </p>
                <p className="text-sm text-gray-500 mb-1">
                  阈值：每 {rule.thresholdDays} 天
                </p>
                {rule.nextMaintenanceDate && (
                  <p className="text-sm text-blue-600">
                    下次保养：{rule.nextMaintenanceDate}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

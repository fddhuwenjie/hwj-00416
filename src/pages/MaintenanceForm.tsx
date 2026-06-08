import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Package, AlertCircle } from 'lucide-react';
import { maintenanceApi } from '../api/maintenance.js';
import { deviceApi } from '../api/device.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import type { Device, MaintenanceType, MaintenancePriority, CreateMaintenanceRequest } from '../../shared/types.js';
import { maintenanceTypeMap, maintenancePriorityMap } from '../utils/format.js';
import { cn } from '../lib/utils.js';

export default function MaintenanceForm() {
  const navigate = useNavigate();
  const { showMessage, setLoading: setAppLoading } = useAppStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState<number | ''>('');
  const [type, setType] = useState<MaintenanceType>('repair');
  const [priority, setPriority] = useState<MaintenancePriority>('medium');
  const [reporterName, setReporterName] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    try {
      const data = await deviceApi.getAll();
      setDevices(data);
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!deviceId) {
      newErrors.deviceId = '请选择设备';
    }
    if (!reporterName.trim()) {
      newErrors.reporterName = '请输入报修人姓名';
    }
    if (!faultDescription.trim()) {
      newErrors.faultDescription = '请输入故障描述';
    } else if (faultDescription.trim().length < 10) {
      newErrors.faultDescription = '故障描述至少10个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setAppLoading('createMaintenance', true);
      const request: CreateMaintenanceRequest = {
        deviceId: Number(deviceId),
        type,
        priority,
        reporterName: reporterName.trim(),
        faultDescription: faultDescription.trim(),
        photoUrl: photoUrl.trim() || undefined,
      };
      const result = await maintenanceApi.create(request);
      showMessage('success', '报修单创建成功');
      navigate(`/maintenance/${result.id}`);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('createMaintenance', false);
    }
  }

  const typeOptions: { value: MaintenanceType; label: string; description: string }[] = [
    { value: 'repair', label: '维修', description: '设备故障需要维修' },
    { value: 'maintenance', label: '保养', description: '定期保养维护' },
  ];

  const priorityOptions: { value: MaintenancePriority; label: string; color: string }[] = [
    { value: 'high', label: '高', color: 'border-red-500 bg-red-50 text-red-700' },
    { value: 'medium', label: '中', color: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
    { value: 'low', label: '低', color: 'border-green-500 bg-green-50 text-green-700' },
  ];

  return (
    <div>
      <PageHeader
        title="新增报修单"
        description="创建设备维修或保养工单"
        actions={
          <Link
            to="/maintenance"
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm"
          >
            <ArrowLeft size={18} />
            返回列表
          </Link>
        }
      />

      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Package size={16} className="inline mr-1" />
              选择设备 <span className="text-red-500">*</span>
            </label>
            <select
              value={deviceId}
              onChange={(e) => {
                setDeviceId(e.target.value ? Number(e.target.value) : '');
                if (errors.deviceId) setErrors({ ...errors, deviceId: '' });
              }}
              className={cn(
                'w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                errors.deviceId ? 'border-red-500 bg-red-50' : 'border-gray-200'
              )}
            >
              <option value="">请选择需要维保的设备</option>
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.name} - {d.brandModel}</option>
              ))}
            </select>
            {errors.deviceId && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.deviceId}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              维保类型 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              {typeOptions.map(opt => (
                <label
                  key={opt.value}
                  className={cn(
                    'relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all',
                    type === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <input
                    type="radio"
                    name="type"
                    value={opt.value}
                    checked={type === opt.value}
                    onChange={(e) => setType(e.target.value as MaintenanceType)}
                    className="sr-only"
                  />
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                    type === opt.value ? 'border-blue-500' : 'border-gray-300'
                  )}>
                    {type === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>}
                  </div>
                  <div className="ml-3">
                    <p className={cn(
                      'font-medium',
                      type === opt.value ? 'text-blue-700' : 'text-gray-900'
                    )}>{opt.label}</p>
                    <p className="text-sm text-gray-500">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              紧急程度 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {priorityOptions.map(opt => (
                <label
                  key={opt.value}
                  className={cn(
                    'relative flex-1 flex items-center justify-center px-4 py-3 border-2 rounded-lg cursor-pointer transition-all font-medium',
                    priority === opt.value ? opt.color : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={opt.value}
                    checked={priority === opt.value}
                    onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              报修人姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => {
                setReporterName(e.target.value);
                if (errors.reporterName) setErrors({ ...errors, reporterName: '' });
              }}
              placeholder="请输入报修人姓名"
              className={cn(
                'w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                errors.reporterName ? 'border-red-500 bg-red-50' : 'border-gray-200'
              )}
            />
            {errors.reporterName && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.reporterName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              故障描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={faultDescription}
              onChange={(e) => {
                setFaultDescription(e.target.value);
                if (errors.faultDescription) setErrors({ ...errors, faultDescription: '' });
              }}
              placeholder="请详细描述设备故障情况或保养需求（至少10个字符）"
              rows={5}
              className={cn(
                'w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none',
                errors.faultDescription ? 'border-red-500 bg-red-50' : 'border-gray-200'
              )}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.faultDescription ? (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.faultDescription}
                </p>
              ) : (
                <span></span>
              )}
              <span className="text-xs text-gray-400">{faultDescription.length} 字符</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              报修照片URL <span className="text-gray-400 font-normal">（选填）</span>
            </label>
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="请输入报修照片的URL地址"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {photoUrl.trim() && (
              <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">照片预览：</p>
                <img
                  src={photoUrl}
                  alt="报修照片预览"
                  className="w-full max-w-xs rounded border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate('/maintenance')}
              className="px-6 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              <Save size={18} />
              提交报修单
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

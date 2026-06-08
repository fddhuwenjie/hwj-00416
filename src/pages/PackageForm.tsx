import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Save, Image as ImageIcon } from 'lucide-react';
import { packageApi } from '../api/package.js';
import { deviceApi } from '../api/device.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import type { Device, Package, CreatePackageRequest } from '../../shared/types.js';
import { formatCurrency } from '../utils/format.js';
import { cn } from '../lib/utils.js';

interface PackageFormData {
  name: string;
  description: string;
  photoUrl: string;
  items: { deviceId: number; quantity: number }[];
  totalPrice: number;
}

interface FormErrors {
  name?: string;
  description?: string;
  items?: string;
  totalPrice?: string;
}

const DISCOUNT_RATE = 0.85;

export default function PackageForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { showMessage, setLoading: setAppLoading } = useAppStore();

  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<number[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [manualPrice, setManualPrice] = useState<number | null>(null);

  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    description: '',
    photoUrl: '',
    items: [],
    totalPrice: 0,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (isEditing && id) {
      loadPackage(parseInt(id));
    }
  }, [isEditing, id]);

  async function loadDevices() {
    try {
      setLoadingDevices(true);
      const data = await deviceApi.getAll({ status: 'available' });
      setDevices(data);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoadingDevices(false);
    }
  }

  async function loadPackage(packageId: number) {
    try {
      setAppLoading('loadPackage', true);
      const pkg = await packageApi.getById(packageId);
      setFormData({
        name: pkg.name,
        description: pkg.description || '',
        photoUrl: pkg.photoUrl || '',
        items: pkg.items?.map(item => ({
          deviceId: item.deviceId,
          quantity: item.quantity,
        })) || [],
        totalPrice: pkg.totalPrice,
      });
      setManualPrice(pkg.totalPrice);

      const ids = pkg.items?.map(item => item.deviceId) || [];
      setSelectedDeviceIds(ids);

      const qtyMap: Record<number, number> = {};
      pkg.items?.forEach(item => {
        qtyMap[item.deviceId] = item.quantity;
      });
      setQuantities(qtyMap);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('loadPackage', false);
    }
  }

  const { originalPrice, calculatedPrice, savings } = useMemo(() => {
    let original = 0;
    selectedDeviceIds.forEach(deviceId => {
      const device = devices.find(d => d.id === deviceId);
      const qty = quantities[deviceId] || 1;
      if (device) {
        original += device.dailyRate * qty;
      }
    });
    const calculated = Math.round(original * DISCOUNT_RATE * 100) / 100;
    const save = Math.round((original - (manualPrice !== null ? manualPrice : calculated)) * 100) / 100;
    return { originalPrice: original, calculatedPrice: calculated, savings: save };
  }, [selectedDeviceIds, quantities, devices, manualPrice]);

  const displayTotalPrice = manualPrice !== null ? manualPrice : calculatedPrice;

  function toggleDevice(deviceId: number) {
    setSelectedDeviceIds(prev => {
      if (prev.includes(deviceId)) {
        const newIds = prev.filter(id => id !== deviceId);
        const newQuantities = { ...quantities };
        delete newQuantities[deviceId];
        setQuantities(newQuantities);
        return newIds;
      } else {
        setQuantities(prev => ({ ...prev, [deviceId]: 1 }));
        return [...prev, deviceId];
      }
    });
  }

  function updateQuantity(deviceId: number, delta: number) {
    setQuantities(prev => {
      const current = prev[deviceId] || 1;
      const newQty = Math.max(1, current + delta);
      return { ...prev, [deviceId]: newQty };
    });
  }

  function validateForm(): boolean {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = '请输入套餐名称';
    } else if (formData.name.trim().length < 2) {
      errors.name = '套餐名称至少2个字符';
    }

    if (selectedDeviceIds.length === 0) {
      errors.items = '请至少选择一个设备';
    }

    if (manualPrice !== null && manualPrice <= 0) {
      errors.totalPrice = '套餐价必须大于0';
    }

    const items = selectedDeviceIds.map(deviceId => ({
      deviceId,
      quantity: quantities[deviceId] || 1,
    }));

    const total = manualPrice !== null ? manualPrice : calculatedPrice;

    setFormData(prev => ({ ...prev, items, totalPrice: total }));
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    const requestData: CreatePackageRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      photoUrl: formData.photoUrl.trim() || undefined,
      items: formData.items,
    };

    try {
      setSubmitting(true);
      if (isEditing && id) {
        await packageApi.update(parseInt(id), requestData);
        showMessage('success', '套餐更新成功');
      } else {
        await packageApi.create(requestData);
        showMessage('success', '套餐创建成功');
      }
      navigate('/packages');
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={isEditing ? '编辑套餐' : '新增套餐'}
        description={isEditing ? '修改套餐信息和设备组合' : '创建新的设备租赁套餐'}
        actions={
          <button
            onClick={() => navigate('/packages')}
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            返回列表
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                套餐名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入套餐名称"
                className={cn(
                  'w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                  formErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                )}
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                封面图片URL
                <span className="text-gray-400 font-normal ml-1">（选填）</span>
              </label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                套餐描述
                <span className="text-gray-400 font-normal ml-1">（选填）</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入套餐描述"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              选择设备 <span className="text-red-500">*</span>
            </h3>
            <span className="text-sm text-gray-500">
              已选择 {selectedDeviceIds.length} 个设备
            </span>
          </div>
          {formErrors.items && (
            <p className="mb-4 text-sm text-red-500">{formErrors.items}</p>
          )}

          {loadingDevices ? (
            <div className="animate-pulse space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {devices.map((device) => {
                const isSelected = selectedDeviceIds.includes(device.id);
                const qty = quantities[device.id] || 1;
                return (
                  <div
                    key={device.id}
                    className={cn(
                      'flex items-center gap-4 p-4 border rounded-xl transition-all cursor-pointer',
                      isSelected
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                    onClick={() => toggleDevice(device.id)}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                    )}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      {device.photoUrl ? (
                        <img
                          src={device.photoUrl}
                          alt={device.name}
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400 text-xl">📷</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{device.name}</h4>
                      <p className="text-sm text-gray-500 truncate">{device.brandModel}</p>
                      <p className="text-sm font-medium text-blue-600">{formatCurrency(device.dailyRate)}/天</p>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(device.id, -1)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center font-medium">{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(device.id, 1)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    )}

                    {isSelected && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-gray-500">小计</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(device.dailyRate * qty)}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">价格信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">原价（单日）</p>
              <p className="text-2xl font-bold text-gray-900 line-through">{formatCurrency(originalPrice)}</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-600 mb-1">套餐价（单日）</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-600">{formatCurrency(displayTotalPrice)}</span>
                <span className="text-xs text-blue-500">默认85折</span>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-xl">
              <p className="text-sm text-green-600 mb-1">节省金额（单日）</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(Math.max(0, savings))}</p>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              手动调整套餐价
              <span className="text-gray-400 font-normal ml-1">（选填，不填则使用自动计算的85折）</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={manualPrice !== null ? manualPrice : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setManualPrice(null);
                  } else {
                    const num = parseFloat(value);
                    if (!isNaN(num) && num >= 0) {
                      setManualPrice(Math.round(num * 100) / 100);
                    }
                  }
                }}
                placeholder={calculatedPrice.toFixed(2)}
                className={cn(
                  'w-full pl-8 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                  formErrors.totalPrice ? 'border-red-300 bg-red-50' : 'border-gray-200'
                )}
              />
            </div>
            {formErrors.totalPrice && (
              <p className="mt-1 text-sm text-red-500">{formErrors.totalPrice}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/packages')}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center gap-2',
              submitting && 'opacity-60 cursor-not-allowed'
            )}
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                保存中...
              </>
            ) : (
              <>
                <Save size={16} />
                {isEditing ? '保存修改' : '创建套餐'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

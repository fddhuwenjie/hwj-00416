import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { deviceApi } from '../api/device.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import type { Device, DeviceStatus } from '../../shared/types.js';

export default function DeviceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { categories, showMessage, setLoading } = useAppStore();

  const [formData, setFormData] = useState<Partial<Device>>({
    name: '',
    categoryId: 1,
    brandModel: '',
    dailyRate: 0,
    deposit: 0,
    stock: 0,
    status: 'available' as DeviceStatus,
    photoUrl: '',
    barcode: '',
  });

  useEffect(() => {
    if (isEdit && id) {
      loadDevice(Number(id));
    }
  }, [id, isEdit]);

  async function loadDevice(deviceId: number) {
    try {
      setLoading('device', true);
      const device = await deviceApi.getById(deviceId);
      setFormData(device);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading('device', false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name || !formData.categoryId) {
      showMessage('error', '请填写必填项');
      return;
    }

    try {
      setLoading('submit', true);

      if (isEdit && id) {
        await deviceApi.update(Number(id), formData);
        showMessage('success', '设备更新成功');
      } else {
        await deviceApi.create(formData as Omit<Device, 'id' | 'createdAt'>);
        showMessage('success', '设备创建成功');
      }

      navigate('/devices');
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading('submit', false);
    }
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? '编辑设备' : '添加设备'}
        description={isEdit ? '修改设备信息' : '录入新的租赁设备'}
        actions={
          <Link
            to="/devices"
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
          >
            <ArrowLeft size={18} />
            返回列表
          </Link>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">设备名称 *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入设备名称"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">分类 *</label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">品牌型号</label>
              <input
                type="text"
                name="brandModel"
                value={formData.brandModel}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：Canon EOS R5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">日租金 (元) *</label>
              <input
                type="number"
                name="dailyRate"
                value={formData.dailyRate}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">押金 (元) *</label>
              <input
                type="number"
                name="deposit"
                value={formData.deposit}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">库存数量 *</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="available">可租</option>
                <option value="maintenance">维修中</option>
                <option value="offline">已下架</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">条码/编号</label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：CAM001"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">设备照片URL</label>
              <input
                type="url"
                name="photoUrl"
                value={formData.photoUrl}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/photo.jpg"
              />
            </div>
          </div>

          {formData.photoUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">预览</label>
              <img
                src={formData.photoUrl}
                alt="预览"
                className="w-48 h-36 object-cover rounded-lg border border-gray-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              <Save size={18} />
              {isEdit ? '保存修改' : '创建设备'}
            </button>
            <Link
              to="/devices"
              className="px-6 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              取消
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

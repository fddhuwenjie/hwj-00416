import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Ticket, Percent, Banknote } from 'lucide-react';
import { couponApi } from '../api/coupon.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import type { CouponType, Coupon, CreateCouponRequest } from '../../shared/types.js';
import { formatCurrency } from '../utils/format.js';
import { cn } from '../lib/utils.js';
import dayjs from 'dayjs';

interface CouponFormData {
  name: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  validFrom: string;
  validTo: string;
  totalQuantity: number;
  description: string;
}

interface FormErrors {
  name?: string;
  type?: string;
  value?: string;
  minOrderAmount?: string;
  validFrom?: string;
  validTo?: string;
  totalQuantity?: string;
}

function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function CouponForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { showMessage, setLoading: setAppLoading } = useAppStore();

  const [submitting, setSubmitting] = useState(false);
  const [couponCode] = useState(() => generateCouponCode());

  const [formData, setFormData] = useState<CouponFormData>({
    name: '',
    type: 'fixed',
    value: 0,
    minOrderAmount: 0,
    validFrom: dayjs().format('YYYY-MM-DD'),
    validTo: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    totalQuantity: 100,
    description: '',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (isEditing && id) {
      loadCoupon(parseInt(id));
    }
  }, [isEditing, id]);

  async function loadCoupon(couponId: number) {
    try {
      setAppLoading('loadCoupon', true);
      const coupon = await couponApi.getById(couponId);
      setFormData({
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
        minOrderAmount: coupon.minOrderAmount,
        validFrom: coupon.validFrom.split('T')[0],
        validTo: coupon.validTo.split('T')[0],
        totalQuantity: coupon.totalQuantity,
        description: coupon.description || '',
      });
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('loadCoupon', false);
    }
  }

  function validateForm(): boolean {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = '请输入优惠券名称';
    } else if (formData.name.trim().length < 2) {
      errors.name = '优惠券名称至少2个字符';
    }

    if (!formData.type) {
      errors.type = '请选择优惠券类型';
    }

    if (formData.value <= 0) {
      errors.value = formData.type === 'fixed' ? '优惠金额必须大于0' : '折扣比例必须大于0';
    } else if (formData.type === 'percentage' && formData.value > 100) {
      errors.value = '折扣比例不能超过100%';
    }

    if (formData.minOrderAmount < 0) {
      errors.minOrderAmount = '最低消费金额不能为负数';
    }

    if (!formData.validFrom) {
      errors.validFrom = '请选择有效期开始日期';
    }

    if (!formData.validTo) {
      errors.validTo = '请选择有效期结束日期';
    } else if (formData.validFrom && formData.validTo && dayjs(formData.validTo).isBefore(formData.validFrom)) {
      errors.validTo = '结束日期不能早于开始日期';
    }

    if (formData.totalQuantity <= 0 || !Number.isInteger(formData.totalQuantity)) {
      errors.totalQuantity = '发放总数量必须是正整数';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    const requestData: CreateCouponRequest = {
      name: formData.name.trim(),
      type: formData.type,
      value: formData.value,
      minOrderAmount: formData.minOrderAmount,
      validFrom: formData.validFrom,
      validTo: formData.validTo,
      totalQuantity: formData.totalQuantity,
      description: formData.description.trim() || undefined,
    };

    try {
      setSubmitting(true);
      await couponApi.create(requestData);
      showMessage('success', '优惠券创建成功');
      navigate('/coupons');
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={isEditing ? '编辑优惠券' : '新增优惠券'}
        description={isEditing ? '修改优惠券规则和信息' : '创建新的优惠券活动'}
        actions={
          <button
            onClick={() => navigate('/coupons')}
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
                优惠券名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入优惠券名称"
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
                优惠码
              </label>
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={couponCode}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 font-mono"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">系统自动生成，创建后可使用此码领取</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">优惠规则</h3>

          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">优惠券类型 <span className="text-red-500">*</span></p>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'fixed' })}
                className={cn(
                  'flex items-center gap-3 p-4 border-2 rounded-xl transition-all',
                  formData.type === 'fixed'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  formData.type === 'fixed' ? 'bg-blue-100' : 'bg-gray-100'
                )}>
                  <Banknote
                    size={20}
                    className={formData.type === 'fixed' ? 'text-blue-600' : 'text-gray-400'}
                  />
                </div>
                <div className="text-left">
                  <p className={cn(
                    'font-medium',
                    formData.type === 'fixed' ? 'text-blue-600' : 'text-gray-600'
                  )}>
                    固定金额
                  </p>
                  <p className="text-xs text-gray-500">立减X元</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'percentage' })}
                className={cn(
                  'flex items-center gap-3 p-4 border-2 rounded-xl transition-all',
                  formData.type === 'percentage'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  formData.type === 'percentage' ? 'bg-purple-100' : 'bg-gray-100'
                )}>
                  <Percent
                    size={20}
                    className={formData.type === 'percentage' ? 'text-purple-600' : 'text-gray-400'}
                  />
                </div>
                <div className="text-left">
                  <p className={cn(
                    'font-medium',
                    formData.type === 'percentage' ? 'text-purple-600' : 'text-gray-600'
                  )}>
                    折扣比例
                  </p>
                  <p className="text-xs text-gray-500">X折优惠</p>
                </div>
              </button>
            </div>
            {formErrors.type && (
              <p className="mt-2 text-sm text-red-500">{formErrors.type}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                面值 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  {formData.type === 'fixed' ? '¥' : ''}
                </span>
                <input
                  type="number"
                  step={formData.type === 'fixed' ? '0.01' : '1'}
                  min="0"
                  max={formData.type === 'percentage' ? 100 : undefined}
                  value={formData.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setFormData({ ...formData, value: 0 });
                    } else {
                      const num = parseFloat(value);
                      if (!isNaN(num) && num >= 0) {
                        if (formData.type === 'fixed') {
                          setFormData({ ...formData, value: Math.round(num * 100) / 100 });
                        } else {
                          setFormData({ ...formData, value: Math.min(100, Math.round(num)) });
                        }
                      }
                    }
                  }}
                  placeholder={formData.type === 'fixed' ? '请输入优惠金额' : '请输入折扣比例'}
                  className={cn(
                    'w-full py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                    formData.type === 'fixed' ? 'pl-8 pr-10' : 'pl-4 pr-10',
                    formErrors.value ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {formData.type === 'percentage' ? '%' : ''}
                </span>
              </div>
              {formErrors.value && (
                <p className="mt-1 text-sm text-red-500">{formErrors.value}</p>
              )}
              {formData.type === 'percentage' && formData.value > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  即 {(100 - formData.value).toFixed(0)} 折优惠
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                最低消费金额 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minOrderAmount || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setFormData({ ...formData, minOrderAmount: 0 });
                    } else {
                      const num = parseFloat(value);
                      if (!isNaN(num) && num >= 0) {
                        setFormData({ ...formData, minOrderAmount: Math.round(num * 100) / 100 });
                      }
                    }
                  }}
                  placeholder="0"
                  className={cn(
                    'w-full pl-8 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                    formErrors.minOrderAmount ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  )}
                />
              </div>
              {formErrors.minOrderAmount && (
                <p className="mt-1 text-sm text-red-500">{formErrors.minOrderAmount}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.minOrderAmount > 0
                  ? `订单满 ${formatCurrency(formData.minOrderAmount)} 可用`
                  : '无最低消费限制'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">有效期与数量</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                有效期开始 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className={cn(
                  'w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                  formErrors.validFrom ? 'border-red-300 bg-red-50' : 'border-gray-200'
                )}
              />
              {formErrors.validFrom && (
                <p className="mt-1 text-sm text-red-500">{formErrors.validFrom}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                有效期结束 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.validTo}
                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                className={cn(
                  'w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                  formErrors.validTo ? 'border-red-300 bg-red-50' : 'border-gray-200'
                )}
              />
              {formErrors.validTo && (
                <p className="mt-1 text-sm text-red-500">{formErrors.validTo}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                发放总数量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={formData.totalQuantity || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setFormData({ ...formData, totalQuantity: 0 });
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 1) {
                      setFormData({ ...formData, totalQuantity: num });
                    }
                  }
                }}
                placeholder="请输入发放数量"
                className={cn(
                  'w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                  formErrors.totalQuantity ? 'border-red-300 bg-red-50' : 'border-gray-200'
                )}
              />
              {formErrors.totalQuantity && (
                <p className="mt-1 text-sm text-red-500">{formErrors.totalQuantity}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              描述
              <span className="text-gray-400 font-normal ml-1">（选填）</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入优惠券描述，如使用说明、适用范围等"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
          <h4 className="font-semibold text-gray-900 mb-3">优惠券预览</h4>
          <div className="bg-white rounded-xl p-4 shadow-sm max-w-sm">
            <div className="flex items-start gap-4">
              <div className={cn(
                'w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0',
                formData.type === 'fixed' ? 'bg-blue-100' : 'bg-purple-100'
              )}>
                <Ticket
                  size={28}
                  className={formData.type === 'fixed' ? 'text-blue-600' : 'text-purple-600'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {formData.name || '优惠券名称'}
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: formData.type === 'fixed' ? '#2563eb' : '#9333ea' }}>
                  {formData.type === 'fixed'
                    ? formatCurrency(formData.value)
                    : `${formData.value}%`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.minOrderAmount > 0
                    ? `满${formatCurrency(formData.minOrderAmount)}可用`
                    : '无最低消费'}
                </p>
                <p className="text-xs text-gray-400 mt-1 font-mono">{couponCode}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              有效期：{formData.validFrom} ~ {formData.validTo}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/coupons')}
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
                {isEditing ? '保存修改' : '创建优惠券'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

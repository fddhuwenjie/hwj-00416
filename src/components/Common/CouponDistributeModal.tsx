import { useState, useEffect } from 'react';
import { X, Send, Users, UserCheck, Search, Check } from 'lucide-react';
import { couponApi } from '../../api/coupon.js';
import { customerApi } from '../../api/customer.js';
import { useAppStore } from '../../store/app.js';
import type { Customer } from '../../../shared/types.js';
import { cn } from '../../lib/utils.js';

interface CouponDistributeModalProps {
  open: boolean;
  onClose: () => void;
  couponId: number;
  onSuccess?: () => void;
}

type DistributeType = 'selected' | 'all';

interface DistributeResult {
  success: number;
  failed: number;
  message: string;
}

export default function CouponDistributeModal({
  open,
  onClose,
  couponId,
  onSuccess,
}: CouponDistributeModalProps) {
  const [distributeType, setDistributeType] = useState<DistributeType>('selected');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DistributeResult | null>(null);
  const { showMessage, setLoading: setAppLoading } = useAppStore();

  useEffect(() => {
    if (open) {
      loadCustomers();
      resetState();
    }
  }, [open]);

  async function loadCustomers() {
    try {
      setAppLoading('loadCustomers', true);
      const data = await customerApi.getAll({ includeBlacklisted: false });
      setCustomers(data);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('loadCustomers', false);
    }
  }

  function resetState() {
    setDistributeType('selected');
    setSelectedCustomerIds([]);
    setSearchKeyword('');
    setShowDropdown(false);
    setResult(null);
  }

  function toggleCustomer(customerId: number) {
    setSelectedCustomerIds(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  }

  function selectAllCustomers() {
    const availableIds = filteredCustomers.map(c => c.id);
    const allSelected = availableIds.every(id => selectedCustomerIds.includes(id));
    if (allSelected) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(availableIds);
    }
  }

  const filteredCustomers = customers.filter(c =>
    !c.isBlacklisted && (
      c.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      c.phone.includes(searchKeyword)
    )
  );

  const selectedCustomers = customers.filter(c => selectedCustomerIds.includes(c.id));

  async function handleDistribute() {
    if (distributeType === 'selected' && selectedCustomerIds.length === 0) {
      showMessage('error', '请至少选择一个客户');
      return;
    }

    try {
      setSubmitting(true);
      const data = await couponApi.distribute({
        couponId,
        customerIds: distributeType === 'selected' ? selectedCustomerIds : undefined,
        allCustomers: distributeType === 'all',
      });
      setResult(data);
      if (data.success > 0) {
        showMessage('success', `成功发放 ${data.success} 张优惠券`);
      }
      if (data.failed > 0) {
        showMessage('error', `发放失败 ${data.failed} 张`);
      }
      onSuccess?.();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    resetState();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">发放优惠券</h3>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {result ? (
            <div className="text-center py-8">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
                result.success > 0 ? 'bg-green-100' : 'bg-red-100'
              )}>
                <Check size={32} className={result.success > 0 ? 'text-green-600' : 'text-red-600'} />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">发放完成</h4>
              <p className="text-gray-600 mb-4">{result.message}</p>
              <div className="flex justify-center gap-8 mb-6">
                <div>
                  <p className="text-2xl font-bold text-green-600">{result.success}</p>
                  <p className="text-sm text-gray-500">成功</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                  <p className="text-sm text-gray-500">失败</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                关闭
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">选择发放方式</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDistributeType('selected')}
                    className={cn(
                      'flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all',
                      distributeType === 'selected'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <UserCheck
                      size={24}
                      className={distributeType === 'selected' ? 'text-blue-600' : 'text-gray-400'}
                    />
                    <span className={cn(
                      'mt-2 font-medium text-sm',
                      distributeType === 'selected' ? 'text-blue-600' : 'text-gray-600'
                    )}>
                      指定客户
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDistributeType('all')}
                    className={cn(
                      'flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all',
                      distributeType === 'all'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Users
                      size={24}
                      className={distributeType === 'all' ? 'text-blue-600' : 'text-gray-400'}
                    />
                    <span className={cn(
                      'mt-2 font-medium text-sm',
                      distributeType === 'all' ? 'text-blue-600' : 'text-gray-600'
                    )}>
                      全部客户
                    </span>
                  </button>
                </div>
              </div>

              {distributeType === 'selected' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    选择客户 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="搜索客户姓名或手机号..."
                      value={searchKeyword}
                      onChange={(e) => {
                        setSearchKeyword(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {selectedCustomers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedCustomers.map(customer => (
                        <span
                          key={customer.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {customer.name}
                          <button
                            type="button"
                            onClick={() => toggleCustomer(customer.id)}
                            className="ml-1 hover:text-blue-900"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {showDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-gray-100">
                        <button
                          type="button"
                          onClick={selectAllCustomers}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {filteredCustomers.every(c => selectedCustomerIds.includes(c.id))
                            ? '取消全选'
                            : '全选当前筛选结果'}
                        </button>
                      </div>
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          没有找到匹配的客户
                        </div>
                      ) : (
                        filteredCustomers.map(customer => {
                          const isSelected = selectedCustomerIds.includes(customer.id);
                          return (
                            <div
                              key={customer.id}
                              onClick={() => toggleCustomer(customer.id)}
                              className={cn(
                                'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                              )}
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
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm">{customer.name}</p>
                                <p className="text-xs text-gray-500">{customer.phone}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  <p className="mt-2 text-sm text-gray-500">
                    已选择 {selectedCustomerIds.length} 位客户
                  </p>
                </div>
              )}

              {distributeType === 'all' && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>注意：</strong>此操作将向所有非黑名单客户发放优惠券，共 {customers.filter(c => !c.isBlacklisted).length} 位客户。请确认后再执行。
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleDistribute}
                  disabled={submitting || (distributeType === 'selected' && selectedCustomerIds.length === 0)}
                  className={cn(
                    'flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center gap-2',
                    (submitting || (distributeType === 'selected' && selectedCustomerIds.length === 0)) && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      发放中...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      确认发放
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

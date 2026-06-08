import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Search, AlertCircle } from 'lucide-react';
import { orderApi } from '../api/order.js';
import { deviceApi } from '../api/device.js';
import { customerApi } from '../api/customer.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import type { Device, Customer, CreateOrderRequest } from '../../shared/types.js';
import { formatCurrency, formatDate, getDaysBetween, deviceStatusMap, getVipDiscount, customerLevelMap } from '../utils/format.js';
import { cn } from '../lib/utils.js';

interface OrderItem {
  deviceId: number;
  device: Device;
  quantity: number;
  days: number;
  subtotal: number;
  deposit: number;
}

export default function OrderCreate() {
  const navigate = useNavigate();
  const { showMessage, setLoading: setAppLoading, categories } = useAppStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerIdCard, setCustomerIdCard] = useState('');
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [endDate, setEndDate] = useState(formatDate(new Date(Date.now() + 86400000)));
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [step, setStep] = useState(1);
  const [availabilityCheck, setAvailabilityCheck] = useState<Map<number, { available: boolean; message: string }>>(new Map());

  useEffect(() => {
    loadDevices();
  }, [categoryFilter]);

  useEffect(() => {
    if (startDate && endDate) {
      checkAvailability();
    }
  }, [startDate, endDate, orderItems]);

  async function loadDevices() {
    try {
      const data = await deviceApi.getAll({
        categoryId: categoryFilter || undefined,
        status: 'available',
      });
      setDevices(data);
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  }

  async function searchCustomer() {
    if (!phoneSearch.trim()) return;
    try {
      const data = await customerApi.getByPhone(phoneSearch);
      setCustomer(data);
      setCustomerName(data.name);
      setCustomerIdCard(data.idCard || '');
    } catch (error) {
      setCustomer(null);
      showMessage('info', '未找到该客户，将创建新客户');
    }
  }

  async function checkAvailability() {
    if (orderItems.length === 0 || !startDate || !endDate) return;
    
    try {
      const checks = new Map<number, { available: boolean; message: string }>();
      for (const item of orderItems) {
        const result = await deviceApi.checkAvailability(item.deviceId, startDate, endDate, item.quantity);
        const message = result.available 
          ? `可租，库存剩余${result.remaining}件`
          : `库存不足，已租${result.rented}件，库存${result.stock}件，需要${item.quantity}件`;
        checks.set(item.deviceId, { available: result.available, message });
      }
      setAvailabilityCheck(checks);
    } catch (error) {
      console.error('Availability check failed:', error);
    }
  }

  function addDevice(device: Device) {
    const existing = orderItems.find(item => item.deviceId === device.id);
    if (existing) {
      updateQuantity(device.id, existing.quantity + 1);
    } else {
      const days = getDaysBetween(startDate, endDate);
      const discount = customer ? getVipDiscount(customer.vipLevel) : 1;
      const subtotal = Math.round(device.dailyRate * days * discount * 100) / 100;
      setOrderItems([...orderItems, {
        deviceId: device.id,
        device,
        quantity: 1,
        days,
        subtotal,
        deposit: device.deposit,
      }]);
    }
  }

  function updateQuantity(deviceId: number, newQuantity: number) {
    if (newQuantity < 1) return;
    const days = getDaysBetween(startDate, endDate);
    const discount = customer ? getVipDiscount(customer.vipLevel) : 1;
    
    setOrderItems(orderItems.map(item => {
      if (item.deviceId === deviceId) {
        const device = item.device;
        const subtotal = Math.round(device.dailyRate * days * newQuantity * discount * 100) / 100;
        return {
          ...item,
          quantity: newQuantity,
          subtotal,
          deposit: device.deposit * newQuantity,
          days,
        };
      }
      return item;
    }));
  }

  function removeItem(deviceId: number) {
    setOrderItems(orderItems.filter(item => item.deviceId !== deviceId));
    const newChecks = new Map(availabilityCheck);
    newChecks.delete(deviceId);
    setAvailabilityCheck(newChecks);
  }

  function updateDates(newStart: string, newEnd: string) {
    setStartDate(newStart);
    setEndDate(newEnd);
    const days = getDaysBetween(newStart, newEnd);
    const discount = customer ? getVipDiscount(customer.vipLevel) : 1;
    
    setOrderItems(orderItems.map(item => {
      const subtotal = Math.round(item.device.dailyRate * days * item.quantity * discount * 100) / 100;
      return { ...item, days, subtotal };
    }));
  }

  const totalRent = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalDeposit = orderItems.reduce((sum, item) => sum + item.deposit, 0);
  const hasConflicts = Array.from(availabilityCheck.values()).some(c => !c.available);

  async function handleSubmit() {
    if (orderItems.length === 0) {
      showMessage('error', '请至少选择一个设备');
      return;
    }
    if (!customerName.trim()) {
      showMessage('error', '请输入客户姓名');
      return;
    }
    if (!phoneSearch.trim()) {
      showMessage('error', '请输入客户手机号');
      return;
    }
    if (hasConflicts) {
      showMessage('error', '存在库存冲突，请调整设备数量或日期');
      return;
    }

    try {
      setAppLoading('createOrder', true);
      const request: CreateOrderRequest = {
        customerId: customer?.id,
        customerName,
        customerPhone: phoneSearch,
        customerIdCard: customerIdCard || undefined,
        startDate,
        endDate,
        items: orderItems.map(item => ({
          deviceId: item.deviceId,
          quantity: item.quantity,
        })),
      };
      const result = await orderApi.create(request);
      showMessage('success', '订单创建成功');
      navigate(`/orders/${result.id}`);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('createOrder', false);
    }
  }

  const filteredDevices = devices.filter(d =>
    d.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    d.brandModel.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="创建租赁订单"
        description="选择设备、填写客户信息，完成订单创建"
        actions={
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            <ArrowLeft size={18} />
            返回列表
          </Link>
        }
      />

      <div className="flex items-center gap-4 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm',
              step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            )}>
              {s}
            </div>
            <span className={cn(
              'ml-2 text-sm font-medium',
              step >= s ? 'text-gray-900' : 'text-gray-400'
            )}>
              {s === 1 ? '选择设备' : s === 2 ? '填写信息' : '确认订单'}
            </span>
            {s < 3 && <div className="w-16 h-1 bg-gray-200 mx-4 rounded" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="搜索设备名称或型号..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={categoryFilter || ''}
                  onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">全部分类</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                {filteredDevices.map((device) => {
                  const inCart = orderItems.find(item => item.deviceId === device.id);
                  const conflict = availabilityCheck.get(device.id);
                  return (
                    <div
                      key={device.id}
                      className={cn(
                        'p-4 border rounded-lg transition-all cursor-pointer',
                        inCart ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300',
                        conflict && !conflict.available ? 'border-red-500 bg-red-50' : ''
                      )}
                      onClick={() => addDevice(device)}
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {device.photoUrl ? (
                            <img src={device.photoUrl} alt={device.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="text-2xl">📦</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-gray-900 truncate">{device.name}</h4>
                            {inCart && (
                              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                                已选 {inCart.quantity}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{device.brandModel}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-blue-600 font-semibold">{formatCurrency(device.dailyRate)}/天</span>
                            <span className="text-xs text-gray-400">库存: {device.stock}</span>
                            <StatusBadge
                              label={deviceStatusMap[device.status].label}
                              color={deviceStatusMap[device.status].color}
                              small
                            />
                          </div>
                          {conflict && !conflict.available && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle size={12} />
                              {conflict.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">已选设备 ({orderItems.length})</h3>
              
              {orderItems.length === 0 ? (
                <p className="text-gray-400 text-center py-8">点击左侧设备添加</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {orderItems.map((item) => {
                    const conflict = availabilityCheck.get(item.deviceId);
                    return (
                      <div key={item.deviceId} className={cn(
                        'p-3 rounded-lg border',
                        conflict && !conflict.available ? 'border-red-200 bg-red-50' : 'bg-gray-50 border-gray-100'
                      )}>
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-sm text-gray-900">{item.device.name}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeItem(item.deviceId); }}
                            className="text-gray-400 hover:text-red-500 text-xs"
                          >
                            移除
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); updateQuantity(item.deviceId, item.quantity - 1); }}
                              className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateQuantity(item.deviceId, item.quantity + 1); }}
                              className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span className="font-semibold text-blue-600">{formatCurrency(item.subtotal)}</span>
                        </div>
                        {conflict && !conflict.available && (
                          <p className="text-xs text-red-600 mt-2">{conflict.message}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">租金合计</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(totalRent)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">押金合计</span>
                  <span className="font-medium">{formatCurrency(totalDeposit)}</span>
                </div>
              </div>

              <button
                onClick={() => orderItems.length > 0 && setStep(2)}
                disabled={orderItems.length === 0 || hasConflicts}
                className={cn(
                  'w-full mt-4 py-3 rounded-lg font-medium transition-colors',
                  orderItems.length > 0 && !hasConflicts
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                下一步：填写信息
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">租赁时段</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => updateDates(e.target.value, endDate)}
                    min={formatDate(new Date())}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => updateDates(startDate, e.target.value)}
                    min={startDate}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                共计 <span className="font-semibold text-blue-600">{getDaysBetween(startDate, endDate)}</span> 天
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">客户信息</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phoneSearch}
                      onChange={(e) => setPhoneSearch(e.target.value)}
                      placeholder="请输入手机号查询客户"
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={11}
                    />
                    <button
                      onClick={searchCustomer}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                    >
                      查询
                    </button>
                  </div>
                </div>

                {customer && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.phone}</p>
                      </div>
                      <StatusBadge
                        label={customerLevelMap[customer.vipLevel].label}
                        color={customerLevelMap[customer.vipLevel].color}
                      />
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      累计消费: {formatCurrency(customer.totalSpent)} | 
                      信用分: <span className={getVipDiscount.toString().includes('score') ? 'text-green-600' : ''}>{customer.creditScore}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="请输入客户姓名"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">身份证号</label>
                    <input
                      type="text"
                      value={customerIdCard}
                      onChange={(e) => setCustomerIdCard(e.target.value)}
                      placeholder="请输入身份证号（选填）"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={18}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                上一步
              </button>
              <button
                onClick={() => customerName && phoneSearch && setStep(3)}
                disabled={!customerName || !phoneSearch}
                className={cn(
                  'px-6 py-2 rounded-lg font-medium transition-colors',
                  customerName && phoneSearch
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                下一步：确认订单
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-fit sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">订单摘要</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">租赁时段</span>
                <span>{getDaysBetween(startDate, endDate)} 天</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">设备数量</span>
                <span>{orderItems.reduce((s, i) => s + i.quantity, 0)} 件</span>
              </div>
              {customer && (
                <div className="flex justify-between">
                  <span className="text-gray-500">会员折扣</span>
                  <span className="text-green-600">{Math.round((1 - getVipDiscount(customer.vipLevel)) * 100)}% OFF</span>
                </div>
              )}
              <div className="border-t border-gray-100 my-2 pt-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">租金合计</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(totalRent)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">押金合计</span>
                  <span>{formatCurrency(totalDeposit)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">确认订单信息</h3>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">租赁时段</h4>
                <p className="font-medium">{formatDate(startDate)} 至 {formatDate(endDate)}</p>
                <p className="text-sm text-gray-500">共 {getDaysBetween(startDate, endDate)} 天</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">客户信息</h4>
                <p className="font-medium">{customerName}</p>
                <p className="text-sm text-gray-500">{phoneSearch} {customerIdCard && `| ${customerIdCard}`}</p>
                {customer && (
                  <StatusBadge
                    label={customerLevelMap[customer.vipLevel].label}
                    color={customerLevelMap[customer.vipLevel].color}
                    small
                  />
                )}
              </div>
            </div>

            <h4 className="text-sm font-medium text-gray-500 mb-3">租赁设备</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">设备</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">日租金</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">数量</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">天数</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">押金</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">小计</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orderItems.map((item) => {
                    const conflict = availabilityCheck.get(item.deviceId);
                    return (
                      <tr key={item.deviceId} className={conflict && !conflict.available ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.device.name}</p>
                          <p className="text-xs text-gray-500">{item.device.brandModel}</p>
                          {conflict && !conflict.available && (
                            <p className="text-xs text-red-600 mt-1">{conflict.message}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{formatCurrency(item.device.dailyRate)}</td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-center">{item.days}</td>
                        <td className="px-4 py-3 text-center">{formatCurrency(item.deposit)}</td>
                        <td className="px-4 py-3 text-right font-medium text-blue-600">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">租金合计</span>
                <span className="font-semibold text-lg text-blue-600">{formatCurrency(totalRent)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">押金合计</span>
                <span>{formatCurrency(totalDeposit)}</span>
              </div>
              {customer && getVipDiscount(customer.vipLevel) < 1 && (
                <div className="flex justify-between text-sm mb-2 text-green-600">
                  <span>{customerLevelMap[customer.vipLevel].label}折扣</span>
                  <span>-{formatCurrency(totalRent / getVipDiscount(customer.vipLevel) - totalRent)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 my-3 pt-3">
                <div className="flex justify-between">
                  <span className="font-medium">应收金额（租金+押金）</span>
                  <span className="font-bold text-xl text-gray-900">{formatCurrency(totalRent + totalDeposit)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              上一步
            </button>
            <button
              onClick={handleSubmit}
              disabled={hasConflicts}
              className={cn(
                'px-8 py-3 rounded-lg font-medium transition-colors',
                !hasConflicts
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              确认创建订单
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

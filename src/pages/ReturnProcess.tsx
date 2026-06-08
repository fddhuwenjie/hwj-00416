import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Calculator } from 'lucide-react';
import { orderApi } from '../api/order.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import type { Order, OrderItem, DeviceReturnStatus, ReturnOrderRequest } from '../../shared/types.js';
import { formatCurrency, formatDate, deviceReturnStatusMap, orderStatusMap, getDaysBetween } from '../utils/format.js';
import { cn } from '../lib/utils.js';

interface ReturnItem extends OrderItem {
  deviceStatus: DeviceReturnStatus;
  repairNote: string;
  repairFee: number;
}

export default function ReturnProcess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<(Order & { items: OrderItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualReturnDate, setActualReturnDate] = useState(formatDate(new Date()));
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const { showMessage, setLoading: setAppLoading } = useAppStore();

  useEffect(() => {
    if (id) loadOrder();
  }, [id]);

  async function loadOrder() {
    try {
      setLoading(true);
      const data = await orderApi.getById(Number(id));
      setOrder(data);
      const items: ReturnItem[] = (data.items || []).map((item: OrderItem) => ({
        ...item,
        deviceStatus: 'good' as DeviceReturnStatus,
        repairNote: '',
        repairFee: 0,
      }));
      setReturnItems(items);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const calculation = useMemo(() => {
    if (!order) return null;

    const rentalDays = getDaysBetween(order.startDate, order.endDate);
    const actualDays = getDaysBetween(order.startDate, actualReturnDate);
    const overdueDays = Math.max(0, actualDays - rentalDays);

    let lateFee = 0;
    if (overdueDays > 0) {
      returnItems.forEach(item => {
        lateFee += Math.round(item.dailyRate * 1.5 * overdueDays * item.quantity * 100) / 100;
      });
    }

    const totalRepairFee = returnItems.reduce((sum, item) => sum + (item.repairFee || 0), 0);
    const finalAmount = order.totalRent + lateFee + totalRepairFee - order.totalDeposit;

    return {
      rentalDays,
      actualDays,
      overdueDays,
      lateFee,
      totalRepairFee,
      finalAmount,
    };
  }, [order, actualReturnDate, returnItems]);

  function updateItemStatus(orderItemId: number, status: DeviceReturnStatus) {
    setReturnItems(returnItems.map(item =>
      item.id === orderItemId
        ? { ...item, deviceStatus: status, repairFee: status === 'good' ? 0 : item.repairFee }
        : item
    ));
  }

  function updateItemRepairFee(orderItemId: number, fee: number) {
    setReturnItems(returnItems.map(item =>
      item.id === orderItemId ? { ...item, repairFee: fee } : item
    ));
  }

  function updateItemRepairNote(orderItemId: number, note: string) {
    setReturnItems(returnItems.map(item =>
      item.id === orderItemId ? { ...item, repairNote: note } : item
    ));
  }

  async function handleSubmit() {
    if (!order || !calculation) return;

    const hasDamagedItems = returnItems.some(item => item.deviceStatus !== 'good');
    if (hasDamagedItems && !confirm('存在损坏或丢失的设备，确认提交归还结算？')) return;
    if (!confirm('确认提交归还结算？')) return;

    try {
      setAppLoading('returnProcess', true);
      const request: ReturnOrderRequest = {
        actualReturnDate,
        items: returnItems.map(item => ({
          orderItemId: item.id,
          deviceStatus: item.deviceStatus,
          repairNote: item.repairNote || undefined,
          repairFee: item.repairFee || undefined,
        })),
      };
      await orderApi.processReturn(order.id, request);
      showMessage('success', '归还结算完成');
      navigate(`/orders/${order.id}`);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('returnProcess', false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!order || !calculation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">订单不存在</p>
        <Link to="/orders" className="mt-4 inline-block text-blue-600 hover:underline">
          返回订单列表
        </Link>
      </div>
    );
  }

  const hasDamage = returnItems.some(item => item.deviceStatus !== 'good');

  return (
    <div>
      <PageHeader
        title={`归还结算 - ${order.orderNo}`}
        description="检查设备状态，计算费用，完成归还结算"
        actions={
          <Link
            to={`/orders/${order.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            <ArrowLeft size={18} />
            返回详情
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">订单信息</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">租赁人</p>
                <p className="font-medium">{order.customerName}</p>
                <p className="text-sm text-gray-500">{order.customerPhone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">订单状态</p>
                <StatusBadge
                  label={orderStatusMap[order.status].label}
                  color={orderStatusMap[order.status].color}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">归还信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">预计归还日期</label>
                <input
                  type="text"
                  value={formatDate(order.endDate)}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">实际归还日期</label>
                <input
                  type="date"
                  value={actualReturnDate}
                  onChange={(e) => setActualReturnDate(e.target.value)}
                  min={order.startDate}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="text-gray-500">
                租赁天数: <span className="font-medium text-gray-900">{calculation.rentalDays}天</span>
              </span>
              <span className="text-gray-500">
                实际使用: <span className="font-medium text-gray-900">{calculation.actualDays}天</span>
              </span>
              {calculation.overdueDays > 0 && (
                <span className="flex items-center gap-1 text-orange-600">
                  <AlertTriangle size={16} />
                  逾期 <span className="font-medium">{calculation.overdueDays}天</span>
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">设备归还检查</h3>
            <div className="space-y-4">
              {returnItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'p-4 border rounded-lg transition-colors',
                    item.deviceStatus === 'damaged' ? 'border-orange-300 bg-orange-50' :
                    item.deviceStatus === 'lost' ? 'border-red-300 bg-red-50' :
                    'border-gray-200'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{item.deviceName}</h4>
                      <p className="text-sm text-gray-500">
                        数量: {item.quantity} | 
                        日租金: {formatCurrency(item.dailyRate)} | 
                        押金: {formatCurrency(item.depositPerUnit * item.quantity)}
                      </p>
                    </div>
                    {item.deviceStatus !== 'good' && (
                      <AlertTriangle size={20} className={
                        item.deviceStatus === 'lost' ? 'text-red-500' : 'text-orange-500'
                      } />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-gray-600 mr-2">设备状态:</span>
                    <button
                      onClick={() => updateItemStatus(item.id, 'good')}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
                        item.deviceStatus === 'good'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <CheckCircle size={14} />
                      完好
                    </button>
                    <button
                      onClick={() => updateItemStatus(item.id, 'damaged')}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
                        item.deviceStatus === 'damaged'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <AlertTriangle size={14} />
                      损坏
                    </button>
                    <button
                      onClick={() => updateItemStatus(item.id, 'lost')}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
                        item.deviceStatus === 'lost'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <XCircle size={14} />
                      丢失
                    </button>
                  </div>

                  {item.deviceStatus !== 'good' && (
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">维修费用 (元)</label>
                        <input
                          type="number"
                          value={item.repairFee}
                          onChange={(e) => updateItemRepairFee(item.id, Number(e.target.value))}
                          min="0"
                          step="0.01"
                          placeholder="输入维修费用"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">损坏说明</label>
                        <input
                          type="text"
                          value={item.repairNote}
                          onChange={(e) => updateItemRepairNote(item.id, e.target.value)}
                          placeholder="描述损坏情况"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {hasDamage && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-medium text-orange-800">存在损坏/丢失设备</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    损坏或丢失的设备将从押金中扣除相应的维修费用。如果维修费用超过押金，客户需要补足差额。
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-end">
            <button
              onClick={() => navigate(`/orders/${order.id}`)}
              className="px-6 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm flex items-center gap-2"
            >
              <Calculator size={18} />
              确认结算
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calculator size={18} className="text-blue-600" />
              费用结算
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">租金合计</span>
                <span className="font-medium">{formatCurrency(order.totalRent)}</span>
              </div>

              {calculation.overdueDays > 0 && (
                <div className="flex justify-between">
                  <div>
                    <span className="text-gray-500">逾期滞纳金</span>
                    <p className="text-xs text-gray-400">
                      {calculation.overdueDays}天 × 日租金×1.5
                    </p>
                  </div>
                  <span className="font-medium text-orange-600">+{formatCurrency(calculation.lateFee)}</span>
                </div>
              )}

              {calculation.totalRepairFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">设备维修费</span>
                  <span className="font-medium text-red-600">+{formatCurrency(calculation.totalRepairFee)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-500">押金退还</span>
                <span className="font-medium text-green-600">-{formatCurrency(order.totalDeposit)}</span>
              </div>

              <div className="border-t border-gray-200 my-3 pt-3">
                <div className="flex justify-between items-start">
                  <span className="font-semibold">最终应收</span>
                  <div className="text-right">
                    <span className={cn(
                      'font-bold text-2xl',
                      calculation.finalAmount >= 0 ? 'text-red-600' : 'text-green-600'
                    )}>
                      {calculation.finalAmount >= 0 ? '+' : ''}{formatCurrency(calculation.finalAmount)}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {calculation.finalAmount >= 0
                        ? '客户需补交'
                        : '应退还客户'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                <p>计算公式:</p>
                <p>租金 {formatCurrency(order.totalRent)}</p>
                <p>+ 滞纳金 {formatCurrency(calculation.lateFee)}</p>
                <p>+ 维修费 {formatCurrency(calculation.totalRepairFee)}</p>
                <p>- 押金 {formatCurrency(order.totalDeposit)}</p>
                <p className="font-medium text-gray-700 pt-1 border-t border-gray-200 mt-1">
                  = {formatCurrency(calculation.finalAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Edit2, Printer } from 'lucide-react';
import { orderApi } from '../api/order.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import type { Order, OrderStatus } from '../../shared/types.js';
import { orderStatusMap, formatCurrency, formatDate, formatDateTime, deviceReturnStatusMap, customerLevelMap } from '../utils/format.js';
import { cn } from '../lib/utils.js';

const statusTransitions: Record<OrderStatus, { status: OrderStatus; label: string }[]> = {
  pending: [{ status: 'out', label: '确认出库' }],
  out: [{ status: 'in_use', label: '客户已取' }],
  in_use: [],
  returned: [],
  overdue: [],
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<(Order & { items: any[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const { showMessage, setLoading: setAppLoading } = useAppStore();

  useEffect(() => {
    if (id) loadOrder();
  }, [id]);

  async function loadOrder() {
    try {
      setLoading(true);
      const data = await orderApi.getById(Number(id));
      setOrder(data);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: OrderStatus) {
    if (!order) return;
    if (!confirm(`确定要将订单状态更新为"${orderStatusMap[newStatus].label}"吗？`)) return;

    try {
      setAppLoading('updateStatus', true);
      await orderApi.updateStatus(order.id, newStatus);
      showMessage('success', '状态更新成功');
      loadOrder();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('updateStatus', false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">订单不存在</p>
        <Link to="/orders" className="mt-4 inline-block text-blue-600 hover:underline">
          返回订单列表
        </Link>
      </div>
    );
  }

  const rentalDays = Math.ceil((new Date(order.endDate).getTime() - new Date(order.startDate).getTime()) / 86400000) + 1;
  const actualDays = order.actualReturnDate
    ? Math.ceil((new Date(order.actualReturnDate).getTime() - new Date(order.startDate).getTime()) / 86400000) + 1
    : 0;
  const overdueDays = order.actualReturnDate
    ? Math.max(0, actualDays - rentalDays)
    : 0;

  return (
    <div>
      <PageHeader
        title={`订单详情 - ${order.orderNo}`}
        description="查看订单详细信息，进行状态管理和归还结算"
        actions={
          <div className="flex items-center gap-3">
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              <ArrowLeft size={18} />
              返回列表
            </Link>
            {['pending', 'out', 'in_use', 'overdue'].includes(order.status) && (
              <Link
                to={`/orders/${order.id}/return`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm shadow-sm"
              >
                <RotateCcw size={18} />
                归还结算
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">订单信息</h3>
                <p className="text-sm text-gray-500 mt-1">创建时间: {formatDateTime(order.createdAt)}</p>
              </div>
              <StatusBadge
                label={orderStatusMap[order.status].label}
                color={orderStatusMap[order.status].color}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">租赁时段</h4>
                <p className="font-medium">{formatDate(order.startDate)} 至 {formatDate(order.endDate)}</p>
                <p className="text-sm text-gray-500">共 {rentalDays} 天</p>
                {order.actualReturnDate && (
                  <p className="text-sm text-gray-500 mt-1">实际归还: {formatDate(order.actualReturnDate)} ({actualDays}天)</p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">订单状态</h4>
                <div className="space-y-2">
                  {statusTransitions[order.status]?.map((t) => (
                    <button
                      key={t.status}
                      onClick={() => updateStatus(t.status)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateStatus('cancelled' as any)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      取消订单
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">租赁设备明细</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">设备</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500">日租金</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500">数量</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500">天数</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500">押金</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">小计</th>
                    {order.status === 'returned' && (
                      <th className="px-4 py-3 text-center font-medium text-gray-500">归还状态</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.deviceName}</p>
                      </td>
                      <td className="px-4 py-3 text-center">{formatCurrency(item.dailyRate)}</td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-center">{item.days}</td>
                      <td className="px-4 py-3 text-center">{formatCurrency(item.depositPerUnit * item.quantity)}</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600">{formatCurrency(item.subtotal)}</td>
                      {order.status === 'returned' && item.deviceStatus && (
                        <td className="px-4 py-3 text-center">
                          <StatusBadge
                            label={deviceReturnStatusMap[item.deviceStatus].label}
                            color={deviceReturnStatusMap[item.deviceStatus].color}
                            small
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {order.status === 'returned' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">结算明细</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">租金合计</span>
                  <span className="font-medium">{formatCurrency(order.totalRent)}</span>
                </div>
                {order.lateFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">逾期滞纳金 ({overdueDays}天)</span>
                    <span className="font-medium text-orange-600">+{formatCurrency(order.lateFee)}</span>
                  </div>
                )}
                {order.repairFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">设备维修费</span>
                    <span className="font-medium text-red-600">+{formatCurrency(order.repairFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">押金退还</span>
                  <span className="font-medium text-green-600">-{formatCurrency(order.totalDeposit)}</span>
                </div>
                <div className="border-t border-gray-200 my-2 pt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">最终应收</span>
                    <span className={cn(
                      'font-bold text-xl',
                      (order.finalAmount || 0) >= 0 ? 'text-red-600' : 'text-green-600'
                    )}>
                      {(order.finalAmount || 0) >= 0 ? '+' : ''}{formatCurrency(order.finalAmount || 0)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    计算公式: 租金 + 滞纳金 + 维修费 - 押金
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">客户信息</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-lg">
                    {order.customerName?.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{order.customerName}</p>
                  <p className="text-sm text-gray-500">{order.customerPhone}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <button
                  onClick={() => navigate(`/customers/${order.customerId}`)}
                  className="w-full py-2 text-center text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors"
                >
                  查看客户档案
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">费用汇总</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">租金</span>
                <span className="font-medium">{formatCurrency(order.totalRent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">押金</span>
                <span className="font-medium">{formatCurrency(order.totalDeposit)}</span>
              </div>
              {order.lateFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">滞纳金</span>
                  <span className="font-medium text-orange-600">{formatCurrency(order.lateFee)}</span>
                </div>
              )}
              {order.repairFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">维修费</span>
                  <span className="font-medium text-red-600">{formatCurrency(order.repairFee)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 my-2 pt-2">
                <div className="flex justify-between">
                  <span className="font-medium">应收总额</span>
                  <span className="font-bold text-lg text-blue-600">
                    {formatCurrency(order.totalRent + order.totalDeposit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {order.remarks && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">备注</h3>
              <p className="text-sm text-gray-600">{order.remarks}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

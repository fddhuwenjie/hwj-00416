import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Calendar, ZoomIn, ZoomOut } from 'lucide-react';
import { orderApi } from '../api/order.js';
import { deviceApi } from '../api/device.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import type { Device, BookingItem } from '../../shared/types.js';
import { formatDate, orderStatusMap, deviceStatusMap } from '../utils/format.js';
import { cn } from '../lib/utils.js';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-blue-400',
  out: 'bg-purple-500',
  in_use: 'bg-indigo-500',
  overdue: 'bg-red-500',
  returned: 'bg-green-400',
};

export default function CalendarView() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(dayjs().startOf('day'));
  const [daysToShow, setDaysToShow] = useState(14);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [hoveredBooking, setHoveredBooking] = useState<BookingItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const { showMessage, categories } = useAppStore();

  const endDate = useMemo(() => 
    startDate.add(daysToShow - 1, 'day'),
    [startDate, daysToShow]
  );

  const dateRange = useMemo(() => {
    const dates = [];
    for (let i = 0; i < daysToShow; i++) {
      dates.push(startDate.add(i, 'day'));
    }
    return dates;
  }, [startDate, daysToShow]);

  const filteredDevices = useMemo(() => {
    if (!selectedCategory) return devices;
    return devices.filter(d => d.categoryId === selectedCategory);
  }, [devices, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [startDate, endDate, selectedCategory]);

  async function loadData() {
    try {
      setLoading(true);
      const [devicesData, bookingsData] = await Promise.all([
        deviceApi.getAll(selectedCategory ? { categoryId: selectedCategory } : undefined),
        orderApi.getBookings(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')),
      ]);
      setDevices(devicesData);
      setBookings(bookingsData);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function getDeviceBookings(deviceId: number): BookingItem[] {
    return bookings.filter(b => b.deviceId === deviceId);
  }

  function checkConflict(device: Device, date: dayjs.Dayjs): boolean {
    const dateStr = date.format('YYYY-MM-DD');
    const dayBookings = bookings.filter(b => 
      b.deviceId === device.id &&
      b.startDate <= dateStr &&
      b.endDate >= dateStr &&
      ['pending', 'out', 'in_use', 'overdue'].includes(b.status)
    );
    const totalRented = dayBookings.reduce((sum, b) => sum + b.quantity, 0);
    return totalRented >= device.stock;
  }

  function getBookingStyle(booking: BookingItem): React.CSSProperties {
    const bookingStart = dayjs(booking.startDate);
    const bookingEnd = dayjs(booking.endDate);
    
    const left = Math.max(0, bookingStart.diff(startDate, 'day'));
    const right = Math.min(daysToShow - 1, bookingEnd.diff(startDate, 'day'));
    
    const leftPercent = (left / daysToShow) * 100;
    const widthPercent = ((right - left + 1) / daysToShow) * 100;

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  }

  function handleBookingHover(booking: BookingItem | null, e?: React.MouseEvent) {
    setHoveredBooking(booking);
    if (e && booking) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  }

  function navigateDays(direction: number) {
    setStartDate(startDate.add(direction * daysToShow, 'day'));
  }

  function goToToday() {
    setStartDate(dayjs().startOf('day'));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="设备日历视图"
        description="甘特图样式展示设备占用情况，快速查看设备可用性"
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">分类筛选:</span>
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                selectedCategory === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setDaysToShow(Math.max(7, daysToShow - 7))}
                className="p-1.5 hover:bg-white rounded transition-colors"
                title="缩小"
              >
                <ZoomOut size={16} className="text-gray-600" />
              </button>
              <span className="px-2 text-sm font-medium text-gray-700">{daysToShow}天</span>
              <button
                onClick={() => setDaysToShow(Math.min(30, daysToShow + 7))}
                className="p-1.5 hover:bg-white rounded transition-colors"
                title="放大"
              >
                <ZoomIn size={16} className="text-gray-600" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDays(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                今天
              </button>
              <button
                onClick={() => navigateDays(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={18} />
              <span className="font-medium">
                {startDate.format('YYYY年MM月DD日')} - {endDate.format('YYYY年MM月DD日')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">图例:</span>
          {Object.entries(orderStatusMap).map(([status, info]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={cn('w-3 h-3 rounded', STATUS_COLORS[status] || 'bg-gray-400')} />
              <span className="text-xs text-gray-600">{info.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-4">
            <div className="w-3 h-3 rounded bg-red-500 opacity-50" />
            <span className="text-xs text-gray-600">库存冲突</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
              <div className="flex">
                <div className="w-48 flex-shrink-0 p-3 border-r border-gray-200 bg-gray-50 font-semibold text-sm text-gray-700">
                  设备
                </div>
                <div className="flex-1 flex">
                  {dateRange.map((date, idx) => {
                    const isToday = date.isSame(dayjs(), 'day');
                    const isWeekend = date.day() === 0 || date.day() === 6;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'flex-1 p-2 text-center border-r border-gray-100 text-xs',
                          isToday && 'bg-blue-50',
                          isWeekend && 'bg-gray-50'
                        )}
                        style={{ minWidth: '60px' }}
                      >
                        <p className={cn(
                          'font-medium',
                          isToday ? 'text-blue-600' : 'text-gray-700',
                          isWeekend && !isToday && 'text-gray-500'
                        )}>
                          {date.format('MM/DD')}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {['日', '一', '二', '三', '四', '五', '六'][date.day()]}
                        </p>
                        {isToday && (
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mx-auto mt-1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredDevices.map((device) => {
                const deviceBookings = getDeviceBookings(device.id);
                return (
                  <div key={device.id} className="flex group">
                    <div className="w-48 flex-shrink-0 p-3 border-r border-gray-200 bg-gray-50 group-hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          {device.photoUrl ? (
                            <img src={device.photoUrl} alt={device.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                              📦
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-gray-900 truncate" title={device.name}>
                            {device.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StatusBadge
                              label={deviceStatusMap[device.status].label}
                              color={deviceStatusMap[device.status].color}
                              small
                            />
                            <span className="text-xs text-gray-500">库存: {device.stock}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 relative h-16">
                      {dateRange.map((date, idx) => {
                        const hasConflict = checkConflict(device, date);
                        const isToday = date.isSame(dayjs(), 'day');
                        const isWeekend = date.day() === 0 || date.day() === 6;
                        return (
                          <div
                            key={idx}
                            className={cn(
                              'absolute top-0 bottom-0 border-r border-gray-100',
                              isToday && 'bg-blue-50',
                              isWeekend && !isToday && 'bg-gray-50',
                              hasConflict && 'bg-red-50'
                            )}
                            style={{
                              left: `${(idx / daysToShow) * 100}%`,
                              width: `${(1 / daysToShow) * 100}%`,
                            }}
                          >
                            {hasConflict && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <AlertTriangle size={14} className="text-red-500 opacity-70" />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {deviceBookings.map((booking) => {
                        const style = getBookingStyle(booking);
                        const colorClass = STATUS_COLORS[booking.status] || 'bg-gray-400';
                        const hasConflict = booking.hasConflict;
                        return (
                          <div
                            key={`${booking.id}-${booking.deviceId}`}
                            className={cn(
                              'absolute top-2 bottom-2 rounded-md px-2 py-1 overflow-hidden cursor-pointer transition-all hover:z-10 hover:shadow-md',
                              colorClass,
                              hasConflict && 'ring-2 ring-red-500 ring-offset-1'
                            )}
                            style={style}
                            onMouseEnter={(e) => handleBookingHover(booking, e)}
                            onMouseMove={(e) => {
                              setTooltipPos({ x: e.clientX, y: e.clientY });
                            }}
                            onMouseLeave={() => handleBookingHover(null)}
                          >
                            <p className="text-xs text-white font-medium truncate">
                              {booking.customerName} ({booking.quantity}件)
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {filteredDevices.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            暂无设备数据
          </div>
        )}
      </div>

      {hoveredBooking && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[250px] pointer-events-none"
          style={{
            left: tooltipPos.x + 15,
            top: tooltipPos.y + 15,
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-gray-900">{hoveredBooking.deviceName}</h4>
            <StatusBadge
              label={orderStatusMap[hoveredBooking.status].label}
              color={orderStatusMap[hoveredBooking.status].color}
              small
            />
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600">
              <span className="text-gray-400">订单:</span> {hoveredBooking.orderNo}
            </p>
            <p className="text-gray-600">
              <span className="text-gray-400">客户:</span> {hoveredBooking.customerName}
            </p>
            <p className="text-gray-600">
              <span className="text-gray-400">数量:</span> {hoveredBooking.quantity}件
            </p>
            <p className="text-gray-600">
              <span className="text-gray-400">租期:</span> {formatDate(hoveredBooking.startDate)} - {formatDate(hoveredBooking.endDate)}
            </p>
            {hoveredBooking.hasConflict && (
              <p className="text-red-600 flex items-center gap-1 mt-2">
                <AlertTriangle size={14} />
                库存冲突
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

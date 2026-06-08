import { ReactNode } from 'react';
import { cn } from '../../lib/utils.js';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: ReactNode;
  trend?: string | { value: number; isPositive: boolean };
  trendUp?: boolean;
  color?: 'blue' | 'green' | 'amber' | 'rose' | 'purple';
}

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  purple: 'bg-purple-500',
};

export default function StatCard({ title, value, subValue, icon, trend, trendUp, color = 'blue' }: StatCardProps) {
  const renderTrend = () => {
    if (!trend) return null;
    
    if (typeof trend === 'string') {
      const isPositive = trendUp ?? trend.startsWith('+');
      return (
        <div className="flex items-center gap-1 mt-2">
          <span className={cn(
            'text-sm font-medium',
            isPositive ? 'text-green-600' : 'text-red-600'
          )}>
            {isPositive ? '↑' : '↓'} {trend.replace('+', '').replace('-', '')}
          </span>
          <span className="text-xs text-gray-400">较上月</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1 mt-2">
        <span className={cn(
          'text-sm font-medium',
          trend.isPositive ? 'text-green-600' : 'text-red-600'
        )}>
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </span>
        <span className="text-xs text-gray-400">较上月</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subValue && (
            <p className="text-xs text-gray-400 mt-1">{subValue}</p>
          )}
          {renderTrend()}
        </div>
        <div className={cn('p-3 rounded-xl', icon && 'bg-gray-100')}>
          {icon}
        </div>
      </div>
      <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClasses[color])}
          style={{ width: `${Math.min(100, typeof value === 'number' ? value : 0)}%` }}
        />
      </div>
    </div>
  );
}

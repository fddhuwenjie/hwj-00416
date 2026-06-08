import { useEffect } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { useAppStore } from '../../store/app.js';
import { cn } from '../../lib/utils.js';

export default function MessageToast() {
  const { message, clearMessage } = useAppStore();

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        clearMessage();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, clearMessage]);

  if (!message) return null;

  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconColors = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500',
  };

  const Icon = icons[message.type];

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg',
        colors[message.type]
      )}>
        <Icon size={20} className={iconColors[message.type]} />
        <span className="font-medium">{message.text}</span>
      </div>
    </div>
  );
}

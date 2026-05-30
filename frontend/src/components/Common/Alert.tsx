import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, type LucideIcon } from 'lucide-react';

interface AlertProps {
  variant: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<string, { container: string; icon: LucideIcon }> = {
  info: { container: 'bg-blue-50 border-blue-200 text-blue-800', icon: Info },
  success: { container: 'bg-green-50 border-green-200 text-green-800', icon: CheckCircle },
  warning: { container: 'bg-amber-50 border-amber-200 text-amber-800', icon: AlertTriangle },
  error: { container: 'bg-red-50 border-red-200 text-red-800', icon: AlertCircle },
};

const roleMap: Record<string, 'alert' | 'status'> = {
  info: 'status',
  success: 'status',
  warning: 'alert',
  error: 'alert',
};

export const Alert: React.FC<AlertProps> = ({ variant, title, children, className = '' }) => {
  const { container, icon: Icon } = styles[variant];

  return (
    <div className={`flex gap-3 rounded-lg border p-4 ${container} ${className}`} role={roleMap[variant]}>
      <Icon size={20} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        {title && <p className="font-medium mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
};

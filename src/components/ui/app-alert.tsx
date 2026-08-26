import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from './alert';

type AppAlertProps = {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  className?: string;
};

const alertConfig = {
  success: {
    icon: CheckCircle2,
    colorClass: 'text-income',
    variant: 'success' as const,
  },
  error: {
    icon: XCircle,
    colorClass: 'text-destructive',
    variant: 'destructive' as const,
  },
  warning: {
    icon: AlertTriangle,
    colorClass: 'text-yellow-500', // Update with your theme warning color if available
    variant: 'default' as const,
  },
  info: {
    icon: Info,
    colorClass: 'text-blue-500',
    variant: 'default' as const,
  },
};

export function AppAlert({ type, message, className = '' }: AppAlertProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <Alert
      variant={config.variant}
      className={`py-3 px-4 flex items-center gap-3 bg-background [&>div]:pl-0 [&>div]:translate-y-0 ${className}`}
    >
      <span className="flex-shrink-0">
        <Icon className={`h-5 w-5 ${config.colorClass}`} />
      </span>
      <AlertDescription className={`font-medium text-sm pt-0 ${config.colorClass}`}>
        {message}
      </AlertDescription>
    </Alert>
  );
}

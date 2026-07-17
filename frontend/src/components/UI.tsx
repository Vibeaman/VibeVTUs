export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin`} />
    </div>
  );
}

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function Alert({ type, title, className = '', children }: AlertProps) {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div className={`border rounded-lg p-4 ${styles[type]} ${className}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{icons[type]}</span>
        <div>
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Refund Alert - specific for showing refund status
interface RefundAlertProps {
  refunded: boolean;
  message: string;
}

export function RefundAlert({ refunded, message }: RefundAlertProps) {
  if (refunded) {
    return (
      <Alert type="warning" title="Funds Refunded">
        {message}
      </Alert>
    );
  }
  return (
    <Alert type="error" title="Transaction Failed">
      {message}
    </Alert>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

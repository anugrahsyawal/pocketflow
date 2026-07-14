type ProgressVariant = 'aman' | 'waspada' | 'bahaya' | 'overbudget' | 'neutral';

interface ProgressBarProps {
  value: number;
  variant?: ProgressVariant;
  height?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

const barColors: Record<ProgressVariant, string> = {
  aman: 'bg-aman',
  waspada: 'bg-waspada',
  bahaya: 'bg-bahaya',
  overbudget: 'bg-bahaya',
  neutral: 'bg-primary',
};

const heightClasses = { sm: 'h-1.5', md: 'h-2' };

export function ProgressBar({
  value,
  variant = 'neutral',
  height = 'md',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const normalizedValue = Math.max(0, Math.min(value, 1));
  const percentage = Math.round(normalizedValue * 100);

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`w-full ${heightClasses[height]} bg-surface-container-high rounded-full overflow-hidden`}
      >
        <div
          className={`${heightClasses[height]} ${barColors[variant]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {showLabel && (
        <span className="text-label-caps text-text-muted mt-1">
          {percentage}%
        </span>
      )}
    </div>
  );
}

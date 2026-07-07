interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ emoji = '\ud83c\udf31', title, description, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      <span className="text-5xl mb-4" role="img" aria-hidden="true">{emoji}</span>
      <h3 className="font-display text-headline-sm text-text-primary mb-2">{title}</h3>
      {description && <p className="text-body-sm text-text-secondary max-w-[280px]">{description}</p>}
    </div>
  );
}

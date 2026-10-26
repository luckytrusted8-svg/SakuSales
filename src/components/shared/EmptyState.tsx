import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-dashed border-[#E2E8F0] my-4 shadow-xs">
      <div className="w-16 h-16 rounded-2xl bg-[#F5F8FB] border border-[#E2E8F0] flex items-center justify-center text-[#1EB6E6] mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-[#0F2747] mb-1">{title}</h3>
      <p className="text-sm text-[#6B7280] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="pos-btn saku-gradient-bg text-white px-6 py-2.5 shadow-sm hover:opacity-95 text-sm font-semibold"
          >
            {actionLabel}
          </button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="pos-btn bg-[#F5F8FB] text-[#0F2747] border border-[#E2E8F0] px-5 py-2.5 text-sm font-semibold hover:bg-white"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

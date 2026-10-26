import React from 'react';
import { Delete, RotateCcw } from 'lucide-react';

interface PinKeypadProps {
  value: string;
  onChange: (val: string) => void;
  maxLength?: number;
  disabled?: boolean;
}

export const PinKeypad: React.FC<PinKeypadProps> = ({
  value,
  onChange,
  maxLength = 6,
  disabled = false,
}) => {
  const handleDigit = (digit: string) => {
    if (disabled) return;
    if (value.length < maxLength) {
      onChange(value + digit);
    }
  };

  const handleDelete = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    if (disabled) return;
    onChange('');
  };

  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'];

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-xs mx-auto select-none">
      {buttons.map((btn) => {
        if (btn === 'C') {
          return (
            <button
              key="btn-clear"
              type="button"
              onClick={handleClear}
              disabled={disabled || value.length === 0}
              className="pos-btn bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-bold disabled:opacity-40"
              aria-label="Hapus Semua"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          );
        }

        if (btn === 'DEL') {
          return (
            <button
              key="btn-delete"
              type="button"
              onClick={handleDelete}
              disabled={disabled || value.length === 0}
              className="pos-btn bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              aria-label="Hapus Digit"
            >
              <Delete className="w-5 h-5" />
            </button>
          );
        }

        return (
          <button
            key={`btn-${btn}`}
            type="button"
            onClick={() => handleDigit(btn)}
            disabled={disabled || value.length >= maxLength}
            className="pos-btn bg-white border border-[#E2E8F0] shadow-2xs hover:border-[#1EB6E6] text-xl font-bold text-[#0F2747] active:bg-[#F5F8FB]"
          >
            {btn}
          </button>
        );
      })}
    </div>
  );
};

import { motion } from 'framer-motion';
import type { Card as CardType } from '../../../shared/types';

interface CardProps {
  card: CardType;
  size?: 'sm' | 'md' | 'lg';
  isSelected?: boolean;
  isPlayable?: boolean;
  isBack?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const sizeClasses = {
  sm: { container: 'w-12 h-16', text: 'text-xs', icon: 'w-4 h-4' },
  md: { container: 'w-16 h-24', text: 'text-base', icon: 'w-6 h-6' },
  lg: { container: 'w-24 h-36', text: 'text-2xl', icon: 'w-10 h-10' }
};

const colorClasses: Record<string, string> = {
  red: 'bg-red-500 border-red-600',
  yellow: 'bg-yellow-400 border-yellow-500',
  green: 'bg-green-500 border-green-600',
  blue: 'bg-blue-500 border-blue-600',
  wild: 'bg-slate-800 border-slate-900'
};

// const colorText: Record<string, string> = {
//   red: 'text-red-500',
//   yellow: 'text-yellow-500',
//   green: 'text-green-500',
//   blue: 'text-blue-500',
//   wild: 'text-slate-400'
// };

export function Card({ 
  card, 
  size = 'md', 
  isSelected = false, 
  isPlayable = false,
  isBack = false,
  onClick,
  disabled = false
}: CardProps) {
  const classes = sizeClasses[size];

  if (isBack) {
    return (
      <motion.div
        className={`${classes.container} rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 shadow-lg flex items-center justify-center`}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
      >
        <div className="w-3/4 h-3/4 rounded border-2 border-slate-600/50 flex items-center justify-center">
          <span className="text-2xl">🎴</span>
        </div>
      </motion.div>
    );
  }

  const bgClass = colorClasses[card.color] || colorClasses.wild;
  const textColor = card.color === 'wild' ? 'text-white' : 'text-white';

  const getContent = () => {
    switch (card.type) {
      case 'number':
        return <span className={`font-bold ${classes.text}`}>{card.value}</span>;
      case 'skip':
        return <span className={`font-bold ${classes.text}`}>🚫</span>;
      case 'reverse':
        return <span className={`font-bold ${classes.text}`}>↩️</span>;
      case 'draw2':
        return <span className={`font-bold ${classes.text}`}>+2</span>;
      case 'wild':
        return <span className={`font-bold ${classes.text}`}>🌈</span>;
      case 'draw4':
        return <span className={`font-bold ${classes.text}`}>+4</span>;
      default:
        return <span>?</span>;
    }
  };

  return (
    <motion.div
      className={`
        ${classes.container} 
        rounded-lg 
        ${bgClass} 
        border-2 
        shadow-lg 
        flex flex-col 
        justify-between 
        p-1.5
        cursor-pointer
        select-none
        ${isSelected ? 'ring-4 ring-white shadow-2xl' : ''}
        ${isPlayable ? 'ring-2 ring-green-400 shadow-lg shadow-green-400/50' : 'ring-1 ring-slate-600/30'}
        ${disabled ? 'cursor-not-allowed' : 'hover:shadow-xl'}
      `}
      onClick={!disabled ? onClick : undefined}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
    >
      {/* 左上角 */}
      <div className={`text-xs font-bold ${textColor}`}>
        {card.type === 'number' ? card.value : getShortLabel(card.type)}
      </div>

      {/* 中间 */}
      <div className="flex-1 flex items-center justify-center">
        {getContent()}
      </div>

      {/* 右下角（旋转） */}
      <div className={`text-xs font-bold ${textColor} rotate-180`}>
        {card.type === 'number' ? card.value : getShortLabel(card.type)}
      </div>
    </motion.div>
  );
}

function getShortLabel(type: string): string {
  const labels: Record<string, string> = {
    skip: 'skip',
    reverse: 'rev',
    draw2: '+2',
    wild: 'wild',
    draw4: '+4'
  };
  return labels[type] || type;
}

// 颜色选择器组件
interface ColorPickerProps {
  onSelect: (color: 'red' | 'yellow' | 'green' | 'blue') => void;
  onCancel: () => void;
}

export function ColorPicker({ onSelect, onCancel }: ColorPickerProps) {
  const colors: Array<{ color: 'red' | 'yellow' | 'green' | 'blue'; bg: string; label: string }> = [
    { color: 'red', bg: 'bg-red-500 hover:bg-red-400', label: '红色' },
    { color: 'yellow', bg: 'bg-yellow-400 hover:bg-yellow-300', label: '黄色' },
    { color: 'green', bg: 'bg-green-500 hover:bg-green-400', label: '绿色' },
    { color: 'blue', bg: 'bg-blue-500 hover:bg-blue-400', label: '蓝色' }
  ];

  return (
    <motion.div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <h3 className="text-xl font-bold text-white text-center mb-6">选择颜色</h3>
        <div className="grid grid-cols-2 gap-4">
          {colors.map(({ color, bg, label }) => (
            <motion.button
              key={color}
              onClick={() => onSelect(color)}
              className={`w-24 h-24 ${bg} rounded-xl shadow-lg flex flex-col items-center justify-center gap-2 transition-all`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-12 h-12 rounded-full bg-white/30" />
              <span className="text-white font-bold">{label}</span>
            </motion.button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="w-full mt-4 py-2 text-slate-400 hover:text-white transition-colors"
        >
          取消
        </button>
      </motion.div>
    </motion.div>
  );
}

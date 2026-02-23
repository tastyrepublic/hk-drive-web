import { ChevronLeft } from 'lucide-react';

interface ChatHeaderProps {
  receiverName: string;
  isDark: boolean;
  onBack?: () => void;
}

export function ChatHeader({ receiverName, isDark, onBack }: ChatHeaderProps) {
  const borderTheme = isDark ? 'border-gray-800' : 'border-gray-200';

  return (
    <div className={`p-4 border-b flex items-center gap-3 shrink-0 bg-opacity-50 ${borderTheme}`}>
      {onBack && (
        <button 
          onClick={onBack} 
          className={`sm:hidden p-1 -ml-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-200 text-gray-700'
          }`}
        >
          <ChevronLeft size={24} />
        </button>
      )}
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
        {receiverName.charAt(0).toUpperCase()}
      </div>
      <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {receiverName}
      </span>
    </div>
  );
}
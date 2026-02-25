import { ChevronLeft } from 'lucide-react';
import { Avatar } from '../../Shared/Avatar'; // Ensure path and filename are correct

interface ChatHeaderProps {
  receiverName: string;
  isDark: boolean;
  onBack?: () => void;
}

export function ChatHeader({ receiverName, isDark, onBack }: ChatHeaderProps) {
  const borderTheme = isDark ? 'border-gray-800' : 'border-gray-200';

  return (
    <div className={`p-4 border-b flex items-center gap-3 shrink-0 relative z-10 ${borderTheme} ${
      isDark ? 'bg-slate/50' : 'bg-white'
    }`}>
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
      
      {/* Consistent Avatar styling */}
      <Avatar 
        name={receiverName} 
        size="sm" 
      />

      <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {receiverName}
      </span>
    </div>
  );
}
import { memo } from 'react';
import { EmojiPicker } from 'frimousse';

interface EmojiPickerMenuProps {
  onSelect: (emoji: any) => void;
  isDark: boolean;
}

export const EmojiPickerMenu = memo(({ onSelect, isDark }: EmojiPickerMenuProps) => {
  // Configured for the perfect inline full-width layout
  const COLUMNS = 12;

  return (
    <div className={`emoji-picker-container w-full h-full flex flex-col ${isDark ? 'text-white bg-[#161B22]' : 'text-gray-800 bg-white'} 
      [&_[data-frimousse-viewport]::-webkit-scrollbar]:w-[6px] 
      [&_[data-frimousse-viewport]::-webkit-scrollbar-track]:bg-transparent 
      [&_[data-frimousse-viewport]::-webkit-scrollbar-thumb]:bg-gray-400/50 
      dark:[&_[data-frimousse-viewport]::-webkit-scrollbar-thumb]:bg-gray-600/50 
      [&_[data-frimousse-viewport]::-webkit-scrollbar-thumb]:rounded-full
    `}>
      
      {/* Forcefully remove the scrollbar track background while keeping your preferred width */}
      <style>{`
        .emoji-picker-container *::-webkit-scrollbar-track { 
          background: transparent !important; 
          background-color: transparent !important;
        }
        .emoji-picker-container * {
          scrollbar-color: ${isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(156, 163, 175, 0.5)'} transparent !important;
        }
      `}</style>

      <EmojiPicker.Root 
        columns={COLUMNS} 
        onEmojiSelect={(data: { emoji: string; label: string }) => onSelect({ native: data.emoji })}
        className="flex flex-col flex-1 min-h-0 w-full"
      >
        
        {/* Search Bar */}
        <div className={`p-2 shrink-0 border-b z-20 ${isDark ? 'border-gray-700 bg-[#161B22]' : 'border-gray-200 bg-gray-50'}`}>
          <EmojiPicker.Search 
            className={`w-full px-3 py-2 rounded-lg border focus:outline-none transition-colors ${
              isDark 
                ? 'bg-[var(--bg-midnight)] border-gray-700 focus:border-[var(--color-primary)] text-white placeholder-gray-500' 
                : 'bg-white border-gray-200 focus:border-[var(--color-primary)] text-black placeholder-gray-400'
            }`}
            placeholder="Search emojis..."
          />
        </div>
        
        {/* Viewport & Custom Scrollbar */}
        <EmojiPicker.Viewport className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden relative">
          
          <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
            Loading...
          </EmojiPicker.Loading>
          
          <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
            No emoji found.
          </EmojiPicker.Empty>

          <EmojiPicker.List className="pb-4 w-full" components={{
            CategoryHeader: ({ category, ...props }) => (
              <div 
                // APPLE GLASSMORPHISM FIX: Added backdrop-blur, lowered bg opacity to 75%, and added a subtle border
                className={`px-3 py-2 font-bold text-sm sticky top-0 z-10 w-full backdrop-blur-md border-b ${
                  isDark 
                    ? 'bg-[#161B22]/75 text-gray-300 border-white/5' 
                    : 'bg-white/75 text-gray-600 border-black/5'
                }`} 
                {...props}
              >
                {category.label}
              </div>
            ),
            Row: ({ children, ...props }) => {
              const { className, style, ...rest } = props as any;
              return (
                <div className={className} style={style} {...rest}>
                  <div 
                    className="grid w-full mb-1 px-3 gap-1" 
                    style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
                  >
                    {children}
                  </div>
                </div>
              );
            },
            Emoji: ({ emoji, ...props }) => (
              <button 
                className={`flex w-full items-center justify-center rounded-lg text-2xl transition-colors ${
                  isDark ? 'data-[active]:bg-gray-700 hover:bg-gray-700' : 'data-[active]:bg-gray-200 hover:bg-gray-200'
                }`} 
                style={{ height: '36px' }} 
                {...props}
              >
                {emoji.emoji}
              </button>
            )
          }} />

        </EmojiPicker.Viewport>
      </EmojiPicker.Root>
      
    </div>
  );
}, (prev, next) => prev.isDark === next.isDark);
interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  hasUnread?: boolean;
  isSelected?: boolean; 
}

export function Avatar({ name, size = 'md', hasUnread, isSelected }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-base',    
    md: 'w-10 h-10 text-lg',    
    lg: 'w-12 h-12 text-xl',    
  };

  // THE FIX: We removed the `isDark` check for the background. 
  // We now strictly use your exact classes so it matches the hardcoded StudentCard perfectly.
  const colorClasses = isSelected
    ? 'bg-white/20 border-white/50 text-white' 
    : 'bg-midnight border-gray-700 text-[var(--color-primary)]'; 

  return (
    <div className={`relative flex-shrink-0 flex items-center justify-center rounded-full font-bold transition-all border
      ${sizeClasses[size]} 
      ${colorClasses}`}
    >
      {name ? name.charAt(0).toUpperCase() : '?'}

      {/* Unread Status Badge */}
      {hasUnread && (
        <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 
          ${isSelected ? 'border-[var(--color-primary)]' : 'border-[var(--bg-slate)]'}`}
        />
      )}
    </div>
  );
}
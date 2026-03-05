import { Edit2, User, CheckCircle2, Ban, Smartphone } from 'lucide-react';
import { BLOCK_REASONS } from '../../constants/list';

export function DiaryCard({ slot, setEditingSlot }: any) { 
  // 1. Determine Status
  const isBlocked = slot.status === 'Blocked';
  const isDraft = slot.status === 'Draft'; 
  const hasStudent = slot.studentId && slot.studentId !== 'Unknown' && slot.studentId !== '';
  const isEffectiveBooked = (!isBlocked && hasStudent) || isDraft;
  const isSelfBooked = slot.bookedBy === 'student';

  const vehicleLabel = slot.type && !isBlocked 
    ? (slot.type.includes('1A') ? '1A' : slot.type.includes('2') ? '2' : slot.type.split(' ')[0])
    : null;

  return (
    <div 
      // [FIXED] Removed overflow-hidden and shadows for a perfectly flat, clean aesthetic
      className={`h-full w-full p-2 flex flex-col cursor-pointer transition-all
        rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-3xl
        ${isDraft
            // [FIXED] Kept the blur and border, but removed the neon shadow to stop the glitch
            ? 'bg-purple-500/20 backdrop-blur-md text-purple-500 border border-purple-500/50 hover:bg-purple-500/30' 
            : isEffectiveBooked 
              ? 'bg-orange text-white'      
              : isBlocked 
                ? 'bg-red-500 text-white' 
                : 'bg-yellow-200 text-yellow-900' 
        }`}
      onClick={(e) => {
        e.stopPropagation();
        setEditingSlot(slot);
      }}
    >
      {/* Header: Time & Badges */}
      <div className="flex justify-between items-start mb-0.5 flex-shrink-0">
        
        {/* [FIXED] Time text shifts to purple-300 for drafts instead of hardcoded white */}
        <span className={`text-[10px] font-black leading-none ${isDraft ? 'text-purple-300' : isEffectiveBooked || isBlocked ? 'text-white/90' : 'text-inherit opacity-80'}`}>
          {slot.time} - {slot.endTime}
        </span>
        
        <div className="flex items-center gap-1">
            {isSelfBooked && isEffectiveBooked && (
                <div className="bg-white/20 p-0.5 rounded" title="Student Booked via App">
                    <Smartphone size={8} className="text-white" />
                </div>
            )}

            {/* [FIXED] Vehicle badge gets a glassy purple background for drafts */}
            {!isBlocked && vehicleLabel && (
                <div className={`text-[8px] font-black px-1 rounded ${isDraft ? 'bg-purple-500/20 text-purple-300' : isEffectiveBooked ? 'bg-black/20 text-white' : 'bg-yellow-900/10 text-yellow-900'}`}>
                    {vehicleLabel}
                </div>
            )}
            {!vehicleLabel && (
                <Edit2 size={10} className={isDraft ? 'text-purple-400/60' : isEffectiveBooked || isBlocked ? 'text-white/60' : 'text-inherit opacity-40'} />
            )}
        </div>
      </div>
      
      {/* Body Content */}
      <div className="flex-1 flex flex-col mt-1">
        {isEffectiveBooked ? (
          <>
            <div className="flex items-center gap-1 mb-0.5 opacity-80">
               <User size={10} />
               <span className="text-[9px] font-bold uppercase">
                 {isDraft ? 'Draft Lesson' : 'Student'}
               </span>
            </div>
            
            <div className="text-[12px] font-black leading-tight truncate">
              {slot.studentName || 'Unknown Student'}
            </div>
            
             {/* [FIXED] Location text shifts to purple-400/80 for drafts instead of hardcoded white/70 */}
             <div className={`text-[9px] font-bold truncate uppercase mt-0.5 ${isDraft ? 'text-purple-400/80' : 'text-white/70'}`}>
              {slot.location}
             </div>
          </>
        ) : isBlocked ? (
          <>
            <div className="flex items-center gap-1 mb-0.5 opacity-80">
               <Ban size={10} />
               <span className="text-[9px] font-bold uppercase">Blocked</span>
            </div>
            <div className="text-[12px] font-black leading-tight truncate">
               {BLOCK_REASONS.find(r => r.id === slot.blockReason)?.label || slot.blockReason || 'Personal'}
            </div>
          </>
        ) : (
          <>
            <div className="text-[11px] font-black leading-tight truncate uppercase tracking-wide opacity-80 mt-1">
              OPEN SLOT
            </div>
             <div className="text-[9px] font-bold opacity-60 truncate uppercase">
               {slot.location}
             </div>
          </>
        )}
      </div>

      {isEffectiveBooked && (
          <div className="absolute bottom-1.5 right-1.5 opacity-60">
             <CheckCircle2 size={22} strokeWidth={2.5} />
          </div>
      )}
    </div>
  );
}
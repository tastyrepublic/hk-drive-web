import { Edit2, User, CheckCircle2, Ban } from 'lucide-react';

// FIX: Match this with DiaryView.tsx
const CELL_HEIGHT = 110; 

// UPDATED: Removed 'setEditForm' from props
export function DiaryCard({ slot, setEditingSlot, isAbsolute }: any) {
  if (!isAbsolute) return null;

  // 1. Calculate Position
  const [hours, minutes] = slot.time.split(':').map(Number);
  const startY = (hours - 6) * CELL_HEIGHT + (minutes / 60) * CELL_HEIGHT;
  
  // --- FIX 1: DURATION PRIORITY ---
  let durationMins = slot.duration;
  if (!durationMins) {
      const [endH, endM] = slot.endTime.split(':').map(Number);
      durationMins = (endH * 60 + endM) - (hours * 60 + minutes);
  }
  
  // Subtract 2px for vertical gap
  const height = (durationMins / 60) * CELL_HEIGHT - 2;

  // 2. Determine Status
  const isBlocked = slot.status === 'Blocked';
  const hasStudent = slot.studentId && slot.studentId !== 'Unknown' && slot.studentId !== '';
  const isEffectiveBooked = !isBlocked && hasStudent;

  // --- FIX 2: VEHICLE BADGE LABEL ---
  const vehicleLabel = slot.type && !isBlocked 
    ? (slot.type.includes('1A') ? '1A' : slot.type.includes('2') ? '2' : slot.type.split(' ')[0])
    : null;

  return (
    <div 
      className={`absolute p-2 flex flex-col overflow-hidden cursor-pointer transition-all hover:z-20 shadow-sm hover:shadow-md
        inset-x-[1px]
        rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-3xl
        ${isEffectiveBooked 
            ? 'bg-orange text-white'      
            : isBlocked 
              ? 'bg-statusRed text-white' 
              : 'bg-yellow-200 text-yellow-900' 
        }`}
      style={{ top: `${startY}px`, height: `${height}px` }}
      onClick={(e) => {
        e.stopPropagation();
        // Just pass the slot. Dashboard handles form hydration now.
        setEditingSlot(slot);
      }}
    >
      {/* Header: Time & Edit Icon */}
      <div className="flex justify-between items-start mb-0.5 flex-shrink-0">
        <span className={`text-[10px] font-black leading-none ${isEffectiveBooked || isBlocked ? 'text-white/90' : 'text-inherit opacity-80'}`}>
          {slot.time} - {slot.endTime}
        </span>
        
        {!isBlocked && vehicleLabel && (
             <div className={`text-[8px] font-black px-1 rounded ${isEffectiveBooked ? 'bg-black/20 text-white' : 'bg-yellow-900/10 text-yellow-900'}`}>
                {vehicleLabel}
             </div>
        )}

        {!vehicleLabel && (
            <Edit2 size={10} className={isEffectiveBooked || isBlocked ? 'text-white/60' : 'text-inherit opacity-40'} />
        )}
      </div>
      
      {/* Body Content */}
      <div className="flex-1 flex flex-col mt-1">
        {isEffectiveBooked ? (
          <>
            <div className="flex items-center gap-1 mb-0.5 opacity-80">
               <User size={10} />
               <span className="text-[9px] font-bold uppercase">Student</span>
            </div>
            <div className="text-[12px] font-black leading-tight truncate">
              {slot.studentName || 'Unknown Student'}
            </div>
             <div className="text-[9px] font-bold text-white/70 truncate uppercase mt-0.5">
               📍 {slot.location}
             </div>
          </>
        ) : isBlocked ? (
          <>
            <div className="flex items-center gap-1 mb-0.5 opacity-80">
               <Ban size={10} />
               <span className="text-[9px] font-bold uppercase">Blocked</span>
            </div>
            <div className="text-[12px] font-black leading-tight truncate">
               {slot.type || 'Personal'}
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

      {isEffectiveBooked && height > 50 && (
          <div className="absolute bottom-1.5 right-1.5 opacity-60">
             <CheckCircle2 size={22} strokeWidth={2.5} />
          </div>
      )}
    </div>
  );
}
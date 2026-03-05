import { Edit2, User, CheckCircle2, Ban, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BLOCK_REASONS, getVehicleLabel, getExamCenterLabel } from '../../constants/list';

export function DiaryCard({ slot, setEditingSlot }: any) { 
  const { t } = useTranslation();

  // 1. Determine Status
  const isBlocked = slot.status === 'Blocked';
  const isDraft = slot.status === 'Draft'; 
  const hasStudent = slot.studentId && slot.studentId !== 'Unknown' && slot.studentId !== '';
  const isEffectiveBooked = (!isBlocked && hasStudent) || isDraft;
  const isSelfBooked = slot.bookedBy === 'student';

  // --- THE FIX: Smart, translated vehicle label ---
  const vehicleLabel = slot.type && !isBlocked 
    ? t(getVehicleLabel(slot.type)).replace('Private Car', 'Car').replace('Light Goods', 'Van')
    : null;

  return (
    <div 
      className={`h-full w-full p-2 flex flex-col cursor-pointer transition-all
        rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-3xl
        ${isDraft
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
        
        <span className={`text-[10px] font-black leading-none ${isDraft ? 'text-purple-300' : isEffectiveBooked || isBlocked ? 'text-white/90' : 'text-inherit opacity-80'}`}>
          {slot.time} - {slot.endTime}
        </span>
        
        <div className="flex items-center gap-1">
            {isSelfBooked && isEffectiveBooked && (
                <div className="bg-white/20 p-0.5 rounded" title={t("Student Booked via App")}>
                    <Smartphone size={8} className="text-white" />
                </div>
            )}

            {!isBlocked && vehicleLabel && (
                <div className={`text-[8px] font-black px-1 rounded truncate max-w-[60px] ${isDraft ? 'bg-purple-500/20 text-purple-300' : isEffectiveBooked ? 'bg-black/20 text-white' : 'bg-yellow-900/10 text-yellow-900'}`}>
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
                 {/* --- THE FIX: Translated statuses --- */}
                 {isDraft ? t('Draft Lesson') : t('Student')}
               </span>
            </div>
            
            <div className="text-[12px] font-black leading-tight truncate">
              {slot.studentName || t('Unknown Student')}
            </div>
            
             {/* --- THE FIX: Combine Exam Center and Location --- */}
             <div className={`text-[9px] font-bold truncate mt-0.5 ${isDraft ? 'text-purple-400/80' : 'text-white/70'}`}>
              {slot.examCenter ? `${t(getExamCenterLabel(slot.examCenter))} • ` : ''}{t(slot.location)}
             </div>
          </>
        ) : isBlocked ? (
          <>
            <div className="flex items-center gap-1 mb-0.5 opacity-80">
               <Ban size={10} />
               <span className="text-[9px] font-bold uppercase">{t('Blocked')}</span>
            </div>
            <div className="text-[12px] font-black leading-tight truncate">
               {/* --- THE FIX: Correctly translate Block Reasons --- */}
               {slot.blockReason 
                  ? t(BLOCK_REASONS.find(r => r.id === slot.blockReason)?.label || slot.blockReason) 
                  : t('Personal')}
            </div>
          </>
        ) : (
          <>
            <div className="text-[11px] font-black leading-tight truncate uppercase tracking-wide opacity-80 mt-1">
              {t('OPEN SLOT')}
            </div>
             {/* --- THE FIX: Combine Exam Center and Location for Open Slots --- */}
             <div className="text-[9px] font-bold opacity-60 truncate">
               {slot.examCenter ? `${t(getExamCenterLabel(slot.examCenter))} • ` : ''}{t(slot.location)}
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
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom'; 
import { Calendar, ChevronLeft, ChevronRight, Plus, Sparkles, AlertCircle, Send, Loader2, Edit2, Trash2, FileText, Eraser, CheckSquare, Check, X, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DndContext, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  useDraggable, 
  useDroppable
} from '@dnd-kit/core';
import { DiaryCard } from './DiaryCard';
import { useHolidays } from '../../hooks/useHolidays';
import { RESTRICTED_HOURS } from '../../constants/list';
import { getSmartStartTime } from '../../scheduler';

interface Props {
  isDark?: boolean;  
  slots: any[];
  setEditingSlot: (slot: any) => void;
  lessonDuration: number; 
  onPublishDrafts: (draftsToPublish: any[]) => Promise<void>;
  onOpenAutoFill: (weekStartDate: Date) => void;
  onCopyWeek: (slotsToCopy: any[], onSuccess: (msg: string) => void, onError: (msg: string) => void, onInfo?: (msg: string) => void) => Promise<void>;
  onSlotMove?: (originalSlot: any, newDate: string, newTime: string, status: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onDeleteSlot?: (slot: any) => void;
  onBulkDelete?: (slotIds: string[], typeLabel: string) => void;}
  

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
const CELL_HEIGHT = 110; 
const CONTENT_HEIGHT = HOURS.length * CELL_HEIGHT; 
const START_HOUR = 6; 

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 100 : -100, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 100 : -100, opacity: 0 })
};
const swipeTransition = { duration: 0.10, ease: "easeOut" as const }; 

const timeToPixels = (timeStr: string) => {
    const [h, m] = (timeStr || "00:00").split(':').map(Number);
    const totalMinutesFromStart = (h - START_HOUR) * 60 + m;
    return (totalMinutesFromStart / 60) * CELL_HEIGHT;
};

function DragOverlayCard({ displayTime, slot }: { displayTime: string, slot: any }) {
  let durationMins = slot.duration || 60;
  if (slot.endTime) {
      const [startH, startM] = (slot.time || "00:00").split(':').map(Number);
      const [endH, endM] = (slot.endTime || "01:00").split(':').map(Number);
      durationMins = (endH * 60 + endM) - (startH * 60 + startM);
  }
  const height = (durationMins / 60) * 110 - 2;

  const isBlocked = slot.status === 'Blocked';
  const isDraft = slot.status === 'Draft'; 
  const hasStudent = slot.studentId && slot.studentId !== 'Unknown' && slot.studentId !== '';
  const isEffectiveBooked = (!isBlocked && hasStudent) || isDraft;

  let bgColor = '';
  let glowColor = '';

  if (isDraft) {
      bgColor = 'bg-purple-500/40 border-purple-500';
      glowColor = 'rgba(168, 85, 247, 0.5)';
  } else if (isEffectiveBooked) {
      bgColor = 'bg-orange/40 border-orange';
      glowColor = 'rgba(249, 115, 22, 0.5)';
  } else if (isBlocked) {
      bgColor = 'bg-red-500/40 border-red-500';
      glowColor = 'rgba(239, 68, 68, 0.5)';
  } else {
      bgColor = 'bg-yellow-400/40 border-yellow-500';
      glowColor = 'rgba(234, 179, 8, 0.5)';
  }

  return (
    <motion.div 
      initial={{ scale: 1, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
      animate={{ scale: 1.05, boxShadow: `0 20px 40px -10px ${glowColor}` }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      // Removed items-center and justify-center
      className={`relative border backdrop-blur-sm rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-3xl ${bgColor}`}
      style={{ height: `${height}px`, width: '100%' }} 
    >
        {/* Absolute positioned to the top-left corner */}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-0.5 drop-shadow-md">
            <span className="text-[8px] font-black text-white/90 tracking-widest leading-none uppercase opacity-90">
                Start Time
            </span>
            <div className="flex items-center gap-1 mt-0.5">
                <div className="w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[4px] border-l-white" />
                <span className="text-white text-xs font-black tracking-tighter">
                    {displayTime}
                </span>
            </div>
        </div>
    </motion.div>
  );
}

function GhostIndicator({ slot, snappedY, show }: any) {
    if (!show || !slot) return null;
    let durationMins = slot.duration || 60;
    if (slot.endTime) {
        const [startH, startM] = (slot.time || "00:00").split(':').map(Number);
        const [endH, endM] = (slot.endTime || "01:00").split(':').map(Number);
        durationMins = (endH * 60 + endM) - (startH * 60 + startM);
    }
    const height = (durationMins / 60) * 110 - 2;

    const isBlocked = slot.status === 'Blocked';
    const isDraft = slot.status === 'Draft'; 
    const hasStudent = slot.studentId && slot.studentId !== 'Unknown' && slot.studentId !== '';
    const isEffectiveBooked = (!isBlocked && hasStudent) || isDraft;

    let colorClasses = '';
    if (isDraft) colorClasses = 'bg-purple-500/15 border-purple-500/20';
    else if (isEffectiveBooked) colorClasses = 'bg-orange/15 border-orange/20';
    else if (isBlocked) colorClasses = 'bg-red-500/15 border-red-500/20';
    else colorClasses = 'bg-yellow-400/15 border-yellow-500/20';

    return (
        <div 
            className={`absolute left-[2px] right-[2px] z-[30] pointer-events-none border transition-all duration-75 rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-3xl ${colorClasses}`}
            style={{ top: `${snappedY}px`, height: `${height}px` }}
        />
    );
}

function DraggableSlot({ slot, setEditingSlot, onContextMenu, isSelectMode, isSelected, onToggleSelect }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ 
      id: slot.id, 
      data: slot,
      disabled: isSelectMode 
  });
  
  const startY = timeToPixels(slot.time);
  
  let durationMins = slot.duration || 60;
  if (slot.endTime) {
      const [startH, startM] = (slot.time || "00:00").split(':').map(Number);
      const [endH, endM] = (slot.endTime || "01:00").split(':').map(Number);
      durationMins = (endH * 60 + endM) - (startH * 60 + startM);
  }
  const height = (durationMins / 60) * CELL_HEIGHT - 2;

  // [NEW] Determine baseline Z
  const baseZ = isSelectMode ? 30 : 20;

  return (
    <motion.div 
      ref={setNodeRef} {...listeners} {...attributes}
      onContextMenu={(e) => {
          if (isSelectMode) {
              e.preventDefault();
              e.stopPropagation();
              return;
          }
          onContextMenu(e, slot);
      }} 
      onClickCapture={(e) => {
          if (isSelectMode) {
              e.stopPropagation();
              e.preventDefault();
              onToggleSelect(slot.id);
          }
      }}
      
      // --- [FIXED] SMART FRAMER VARIANTS ---
      variants={{
          rest: { 
              scale: 1, 
              y: 0, 
              zIndex: baseZ, 
              // Wait 0.15s before dropping the z-index so the shadow shrinks smoothly!
              transition: { duration: 0.15, zIndex: { delay: 0.15 } } 
          },
          hover: { 
              scale: 1.03, 
              y: -4, 
              zIndex: 50, 
              // Instantly pop z-index to 50 on hover
              transition: { duration: 0.15, zIndex: { duration: 0 } } 
          }
      }}
      initial="rest"
      animate="rest"
      whileHover={isSelectMode ? "hover" : "rest"}
      
      // [FIXED] Removed the z-20 and z-30 Tailwind classes here
      className={`absolute left-[2px] right-[2px] rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-3xl select-none group ${
          isDragging ? 'opacity-0' : 'opacity-100'
      } ${
          isSelectMode ? 'cursor-pointer' : ''
      }`}
      style={{ top: `${startY}px`, height: `${height}px`, touchAction: 'none' }}
    >
      <DiaryCard slot={slot} setEditingSlot={setEditingSlot} />
      
      {/* Checkmark Overlay */}
      <div className={`absolute inset-0 rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-3xl border-2 transition-all pointer-events-none 
          duration-150
          ${isSelectMode ? 'opacity-100 shadow-md shadow-black/25' : 'opacity-0 shadow-none'} 
          ${isSelected ? 'border-blue-500 bg-blue-500/20' : 'border-transparent group-hover:border-blue-500/50'}`}
      >
          <div className={`absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5 shadow-md transition-transform duration-150 ${isSelected && isSelectMode ? 'scale-100' : 'scale-0'}`}>
              <Check size={14} strokeWidth={4} />
          </div>
      </div>
    </motion.div>
  );
}

function DayColumn({ dateStr, dayOfWeek, isPublicHoliday, children, overId, currentDragInfo, todayStart, currentHour, dayTime, daySlots, lessonDuration, setEditingSlot, isPlanningMode, currentMinute, isSelectMode }: any) {
  const { setNodeRef } = useDroppable({ id: dateStr });
  const isOver = overId === dateStr;

  const restrictedZones = useMemo(() => {
    if (dayOfWeek === 0 || isPublicHoliday) return [];
    return RESTRICTED_HOURS.filter(r => r.days.includes(dayOfWeek)).map(r => {
        const top = timeToPixels(r.start);
        return { top, height: timeToPixels(r.end) - top, label: r.label };
    });
  }, [dayOfWeek, isPublicHoliday]);

  return (
    <div ref={setNodeRef} className={`flex-1 min-w-0 border-r border-gray-800 last:border-r-0 relative h-full transition-[background-color] ${isOver ? 'bg-white/5' : 'bg-slate'}`}>
      
      {restrictedZones.map((zone, idx) => (
          <div key={`rest-${idx}`} className="absolute left-0 right-0 z-0 pointer-events-none overflow-hidden"
              style={{ 
                  top: zone.top, height: zone.height,
                  background: `repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.03), rgba(239, 68, 68, 0.03) 10px, rgba(239, 68, 68, 0.08) 10px, rgba(239, 68, 68, 0.08) 20px)`
              }}
          >
              <div className="absolute top-2 right-1 opacity-40">
                  <div className="flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-red-400 uppercase tracking-tighter border border-red-500/20">
                      <AlertCircle size={8} /> {zone.label}
                  </div>
              </div>
          </div>
      ))}

      {HOURS.map(h => {
          const isPastDay = dayTime < todayStart;
          const isPastHour = isPastDay || (dayTime === todayStart && h < currentHour);
          const isCurrentHour = dayTime === todayStart && h === currentHour;
          
          let cellStyle: React.CSSProperties = { height: CELL_HEIGHT };
          let cellClass = 'w-full relative group transition-[background-color] duration-200 ease-in-out border-b border-gray-800 ';

          // 2. Add the cursor-default check for Select Mode
          if (isPastHour) {
              cellClass += 'bg-black/40 cursor-not-allowed'; 
          } else if (isSelectMode) {
              cellClass += 'cursor-default'; // [NEW] Disable pointer in select mode
          } else if (isCurrentHour) {
              const percent = Math.round((currentMinute / 60) * 100);
              cellStyle.background = `linear-gradient(to bottom, rgba(0,0,0,0.4) ${percent}%, transparent ${percent}%)`;
              cellClass += 'hover:bg-white/5 cursor-pointer'; 
          } else {
              cellClass += 'hover:bg-white/5 cursor-pointer'; 
          }

          return (
            <div 
              key={h} 
              style={cellStyle}
              className={cellClass}
              onClick={(e) => {
                  e.stopPropagation();
                  if (isPastHour || isSelectMode) return; 

                  let smartTime = getSmartStartTime(h, daySlots, lessonDuration);

                  const [smartH, smartM] = (smartTime || "00:00").split(':').map(Number);
                  const [y, month, d] = (dateStr || "2026-01-01").split('-').map(Number);
                  const targetDate = new Date(y, month - 1, d, smartH, smartM);
                  const now = new Date();

                  if (targetDate < now) {
                      let nextMins = Math.ceil(now.getMinutes() / 15) * 15;
                      let adjustedH = now.getHours();
                      if (nextMins >= 60) {
                          adjustedH += 1;
                          nextMins = 0;
                      }
                      smartTime = `${String(adjustedH).padStart(2, '0')}:${String(nextMins).padStart(2, '0')}`;
                  }

                  setEditingSlot({ date: dateStr, time: smartTime, location: '', type: '', status: isPlanningMode ? 'Draft' : 'Booked' }); 
              }}
            >
                {(!isPastHour && !isCurrentHour) && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-orange/50 text-2xl font-light select-none">
                        +
                    </div>
                )}
            </div>
          );
      })}


      {isOver && currentDragInfo && <GhostIndicator show={true} slot={currentDragInfo.slot} snappedY={currentDragInfo.snappedY} />}
      
      {/* The slots (which are z-20 and z-30) render securely on top of the blur! */}
      {children}
    </div>
  );
}

export function DiaryView({ 
  isDark,  
  slots, 
  setEditingSlot, 
  lessonDuration = 60, 
  onPublishDrafts, 
  onOpenAutoFill, 
  onCopyWeek, 
  onSlotMove,
  showToast,
  onDeleteSlot,
  onBulkDelete,
}: Props) {
  
  const [[weekOffset, direction], setWeekOffset] = useState([0, 0]);
  const [nowPosition, setNowPosition] = useState(0);
  const [currentTime, setCurrentTime] = useState({ 
      hour: new Date().getHours(), 
      minute: new Date().getMinutes() 
  });
  const [isPlanningMode, setIsPlanningMode] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // --- [NEW] SELECT MODE STATE ---
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // [NEW] Instantly clear selection and exit mode if the user changes the week
  useEffect(() => {
      setIsSelectMode(false);
      setSelectedIds([]);
  }, [weekOffset]);

  const toggleSelection = useCallback((id: string) => {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]);
  }, []);

  const toggleDaySelection = useCallback((daySlots: any[]) => {
      const daySlotIds = daySlots.map(s => s.id);
      const allSelected = daySlotIds.length > 0 && daySlotIds.every(id => selectedIds.includes(id));
      
      if (allSelected) { // Deselect all
          setSelectedIds(prev => prev.filter(id => !daySlotIds.includes(id)));
      } else { // Select all
          setSelectedIds(prev => Array.from(new Set([...prev, ...daySlotIds])));
      }
  }, [selectedIds]);
  
  // 1. Calculate the visible days FIRST
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    const dayOfWeek = d.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(d.getDate() + diffToMonday + i + (weekOffset * 7));
    return d;
  });

  // 2. Convert them to string format (YYYY-MM-DD)
  const weekDates = days.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);

  // 3. Filter drafts so it ONLY counts the ones in the current week!
  const draftSlots = slots.filter(s => s.status === 'Draft' && weekDates.includes(s.date));
  
  // --- [NEW] BUTTON PROTECTIONS ---
  // Get all slots for this currently viewed week to check if it's empty
  const slotsThisWeek = slots.filter(s => weekDates.includes(s.date));
  const hasSlotsThisWeek = slotsThisWeek.length > 0;

  // Categorize slots for the clear menu
  const draftsThisWeek = slotsThisWeek.filter(s => s.status === 'Draft');
  const openThisWeek = slotsThisWeek.filter(s => s.status === 'Open');
  const blockedThisWeek = slotsThisWeek.filter(s => s.status === 'Blocked');
  const bookedThisWeek = slotsThisWeek.filter(s => s.status === 'Booked');
  const unbookedThisWeek = slotsThisWeek.filter(s => s.status !== 'Booked');

  const [showManageMenu, setShowManageMenu] = useState(false);

  // Check if the Sunday (days[6]) of the currently viewed week is entirely in the past
  const isPastWeek = (() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return days[6] < today;
  })();

  const [localSlots, setLocalSlots] = useState<any[]>([]);
  useEffect(() => { setLocalSlots(slots || []); }, [slots]);

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, slot: any } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, slot: any) => {
    e.preventDefault(); 
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, slot });
  }, []);

  const todayStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }, []);

  const slotsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    localSlots.forEach(s => {
        if (!map[s.date]) map[s.date] = [];
        map[s.date].push(s);
    });
    return map;
  }, [localSlots]);

  const holidays = useHolidays();
  
  const [activeSlot, setActiveSlot] = useState<any>(null); 
  const [overId, setOverId] = useState<string | null>(null);
  const [snappedY, setSnappedY] = useState<number>(0);
  const [liveTime, setLiveTime] = useState<string>('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }));

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  const scrollToCurrentTime = useCallback((smooth = true) => {
      if (!scrollContainerRef.current) return;
      const now = new Date();
      const hours = now.getHours();
      
      if (hours >= 6 && hours < 24) {
          const targetY = (hours - 6) * CELL_HEIGHT - 60;
          scrollContainerRef.current.scrollTo({
              top: targetY,
              behavior: smooth ? 'smooth' : 'auto'
          });
      }
  }, []);

  useEffect(() => {
      const timer = setTimeout(() => scrollToCurrentTime(true), 100);
      return () => clearTimeout(timer);
  }, [scrollToCurrentTime]); 

  const paginate = useCallback((newDirection: number) => { 
      setWeekOffset(prev => [prev[0] + newDirection, newDirection]); 
  }, []);

  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastClickTime = useRef(0);

  const startPagination = useCallback((dir: number) => {
      const now = Date.now();
      if (now - lastClickTime.current < 100) return;
      lastClickTime.current = now;
      paginate(dir); 
      
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current);
      
      holdTimeoutRef.current = setTimeout(() => {
          repeatIntervalRef.current = setInterval(() => { paginate(dir); }, 100); 
      }, 300); 
  }, [paginate]);

  const stopPagination = useCallback(() => {
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current);
      holdTimeoutRef.current = null;
      repeatIntervalRef.current = null;
  }, []);

  useEffect(() => { return () => stopPagination(); }, [stopPagination]);

  const jumpToToday = () => { 
      setWeekOffset(prev => [0, prev[0] < 0 ? 1 : -1]); 
      scrollToCurrentTime(true);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    isPanning.current = true;
    startY.current = e.pageY;
    startScrollTop.current = scrollContainerRef.current.scrollTop;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning.current || !scrollContainerRef.current) return;
    const y = e.pageY;
    const walk = (y - startY.current) * 1.5; 
    scrollContainerRef.current.scrollTop = startScrollTop.current - walk;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isPanning.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    const updateNow = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      setCurrentTime({ hour: hours, minute: minutes }); 
      
      if (hours >= 6 && hours < 24) {
        setNowPosition((hours - 6) * CELL_HEIGHT + (minutes / 60) * CELL_HEIGHT);
      }
    };
    updateNow();
    const interval = setInterval(updateNow, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDragMove = (event: any) => {
    const { active, delta, over } = event;
    if (!active || !active.data.current) return;
    setOverId(over ? over.id : null);
    
    const slot = active.data.current;
    const originalY = timeToPixels(slot.time || "00:00");
    
    let draggedDuration = slot.duration || 60;
    if (slot.endTime) {
        const [h, m] = (slot.time || "00:00").split(':').map(Number);
        const [eh, em] = (slot.endTime || "01:00").split(':').map(Number);
        draggedDuration = (eh * 60 + em) - (h * 60 + m);
    }
    const slotHeight = (draggedDuration / 60) * CELL_HEIGHT;
    
    let rawNewY = originalY + delta.y;
    rawNewY = Math.max(0, Math.min(rawNewY, CONTENT_HEIGHT - slotHeight));
    
    let finalY = Math.round((rawNewY / CELL_HEIGHT) * 4) / 4 * CELL_HEIGHT;

    if (over && over.id) {
        const daySlots = slotsByDate[over.id] || [];
        const SNAP_THRESHOLD = 20; 
        let closestDist = SNAP_THRESHOLD;

        daySlots.forEach((targetSlot) => {
            if (targetSlot.id === slot.id) return; 

            const targetTop = timeToPixels(targetSlot.time || "00:00");
            let tDuration = targetSlot.duration || 60;
            if (targetSlot.endTime) {
                const [th, tm] = (targetSlot.time || "00:00").split(':').map(Number);
                const [teh, tem] = (targetSlot.endTime || "01:00").split(':').map(Number);
                tDuration = (teh * 60 + tem) - (th * 60 + tm);
            }
            const targetBottom = targetTop + (tDuration / 60) * CELL_HEIGHT;

            if (Math.abs(rawNewY - targetBottom) < closestDist) {
                closestDist = Math.abs(rawNewY - targetBottom);
                finalY = targetBottom;
            }
            const myBottomRaw = rawNewY + slotHeight;
            if (Math.abs(myBottomRaw - targetTop) < closestDist) {
                closestDist = Math.abs(myBottomRaw - targetTop);
                finalY = targetTop - slotHeight;
            }
            if (Math.abs(rawNewY - targetTop) < closestDist) {
                closestDist = Math.abs(rawNewY - targetTop);
                finalY = targetTop;
            }
        });
    }
    
    finalY = Math.max(0, Math.min(finalY, CONTENT_HEIGHT - slotHeight));
    setSnappedY(finalY);

    const totalHours = (finalY / CELL_HEIGHT) + 6;
    const newH = Math.floor(totalHours);
    const newM = Math.round((totalHours - newH) * 60);
    setLiveTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (over && liveTime !== '') {
      const originalSlot = active.data.current;
      const newTimeStr = liveTime;
      const newDateStr = over.id;

      if (originalSlot.date !== newDateStr || originalSlot.time !== newTimeStr) {
          
          const [h, min] = (newTimeStr || "00:00").split(':').map(Number);
          const [y, m, d] = (newDateStr || "2026-01-01").split('-').map(Number);
          
          const targetDate = new Date(y, m - 1, d, h, min);
          const isPast = targetDate < new Date();
          
          if (isPast) {
            showToast?.("Cannot move lessons to the past", "error");
          } else if (onSlotMove) {
            onSlotMove(originalSlot, newDateStr, newTimeStr, originalSlot.status);
          }
      }
    }

    setActiveSlot(null);
    setOverId(null);
    setSnappedY(0);
    setLiveTime('');
  };

  const pointerY = useRef<number | null>(null);

  useEffect(() => {
      if (!activeSlot) {
          pointerY.current = null;
          return;
      }
      const onPointerMove = (e: PointerEvent) => { pointerY.current = e.clientY; };
      window.addEventListener('pointermove', onPointerMove);
      return () => window.removeEventListener('pointermove', onPointerMove);
  }, [activeSlot]);

  useEffect(() => {
      if (!activeSlot) return;
      let frameId: number;
      
      const loop = () => {
          if (pointerY.current !== null && scrollContainerRef.current) {
              const container = scrollContainerRef.current;
              const rect = container.getBoundingClientRect();
              const threshold = 150; 

              if (pointerY.current >= rect.bottom - threshold && pointerY.current <= rect.bottom + 150) {
                  const intensity = Math.min(1, (pointerY.current - (rect.bottom - threshold)) / threshold);
                  container.scrollTop += intensity * 15; 
              } 
              else if (pointerY.current <= rect.top + threshold && pointerY.current >= rect.top - 150) {
                  const intensity = Math.min(1, ((rect.top + threshold) - pointerY.current) / threshold);
                  container.scrollTop -= intensity * 15; 
              }
          }
          frameId = requestAnimationFrame(loop);
      };
      
      frameId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(frameId);
  }, [activeSlot]);

  return (
    <DndContext 
        sensors={sensors} 
        onDragStart={(e) => {
            const slot = e.active.data.current;
            if (!slot) return; 
            setActiveSlot(slot);
            setLiveTime(slot.time || "00:00"); 
        }} 
        onDragMove={handleDragMove} 
        onDragEnd={handleDragEnd} 
        autoScroll={false} 
    >   
      <div 
          onContextMenu={(e) => e.preventDefault()} 
          // [FIXED] Changed 'transition-colors' to 'transition-[background-color]'
          className="flex flex-col h-[calc(100vh-160px)] bg-slate rounded-2xl border border-gray-800 overflow-hidden relative transition-[background-color] duration-300 select-none"
      >
        
        {/* HEADER */}
        <div className="p-4 flex items-center justify-between border-b border-gray-800 bg-header z-50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-white">
              {days[0].toLocaleDateString('en-GB', { month: 'short' })} '{days[0].toLocaleDateString('en-GB', { year: '2-digit' })}
            </h2>
            
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* 1. CONTEXTUAL PRIMARY: Publish (Only shows when needed) */}
              {(draftSlots.length > 0 || isPublishing) && (
                <button onClick={async () => { 
                    setIsPublishing(true); await onPublishDrafts(draftSlots); setIsPublishing(false); setIsPlanningMode(false); 
                  }}
                  disabled={isPublishing || isSelectMode} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                      isSelectMode
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                          : 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:bg-green-400'
                  }`}
                >
                  {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  <span className="hidden sm:inline">{isPublishing ? 'Publishing...' : `Publish ${draftSlots.length}`}</span>
                </button>
              )}

              {/* 2. ABSOLUTE PRIMARY: Add Lesson */}
              <button 
                onClick={() => setEditingSlot({ status: isPlanningMode ? 'Draft' : 'Booked' }) }
                disabled={isSelectMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    isSelectMode
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                        : 'bg-orange text-white hover:bg-orange/90 shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                }`}
              >
                <Plus size={16} strokeWidth={3} />
                <span className="hidden sm:inline">Add Lesson</span>
              </button>

              <div className="w-[1px] h-6 bg-gray-800 mx-1 hidden sm:block" />

              {/* 3. MODE TOGGLES: Muted until active */}
              <div className="flex items-center bg-midnight border border-gray-800 rounded-lg p-0.5">
                  <button 
                    onClick={() => { setIsSelectMode(!isSelectMode); if (isSelectMode) setSelectedIds([]); }}
                    disabled={!hasSlotsThisWeek}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                        !hasSlotsThisWeek ? 'text-gray-600 cursor-not-allowed' :
                        isSelectMode ? 'bg-blue-500 text-white shadow-sm' : 'text-textGrey hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <CheckSquare size={14} /> 
                    <span className="hidden lg:inline">Select</span>
                  </button>

                  <button 
                    onClick={() => setIsPlanningMode(!isPlanningMode)}
                    disabled={isSelectMode}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                        isSelectMode ? 'text-gray-600 cursor-not-allowed' :
                        isPlanningMode ? 'bg-purple-500 text-white shadow-sm' : 'text-textGrey hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <Sparkles size={14} />
                    <span className="hidden lg:inline">Planning</span>
                  </button>
              </div>

              {/* 4. THE CLEANUP: "Manage Week" Dropdown */}
              <div className="relative">
                  <button 
                      onClick={() => setShowManageMenu(!showManageMenu)}
                      disabled={isSelectMode} 
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all border ${
                          isSelectMode
                              ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed opacity-50'
                              : showManageMenu 
                                  ? 'bg-gray-800 border-gray-600 text-white' 
                                  : 'bg-slate border-gray-800 text-textGrey hover:text-white hover:border-gray-600'
                      }`}
                  >
                      <SettingsIcon size={16} /> 
                      <span className="hidden md:inline">Manage...</span>
                  </button>

                  {/* Dropdown Menu */}
                  {showManageMenu && (
                      <>
                          <div className="fixed inset-0 z-[90]" onClick={() => setShowManageMenu(false)} />
                          
                          <div className="absolute top-full mt-2 right-0 w-56 bg-slate border border-gray-800 rounded-xl shadow-2xl z-[100] p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
                              
                              <button onClick={() => { onOpenAutoFill(days[0]); setIsPlanningMode(true); setShowManageMenu(false); }} disabled={isPastWeek} className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold text-purple-400 hover:bg-purple-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                  <Sparkles size={16} /> Auto-Fill Week
                              </button>
                              
                              <button onClick={async () => { setIsCopying(true); await onCopyWeek(slotsThisWeek, (msg) => showToast?.(msg, 'success'), (msg) => showToast?.(msg, 'error'), (msg) => showToast?.(msg, 'info')); setIsCopying(false); setIsPlanningMode(true); setShowManageMenu(false); }} disabled={isCopying || !hasSlotsThisWeek} className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                  {isCopying ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                                  Copy to Next Week
                              </button>

                              {/* Smart Clear Options */}
                              {unbookedThisWeek.length > 0 && (
                                  <>
                                      <div className="h-[1px] bg-gray-800 my-1 mx-2" />
                                      <div className="px-3 py-1.5 text-[10px] uppercase font-black text-textGrey tracking-wider">Clear Slots</div>
                                      
                                      {/* Drafts: Gray base, Purple rollover */}
                                      {draftsThisWeek.length > 0 && (
                                          <button onClick={() => { onBulkDelete?.(draftsThisWeek.map(s => s.id), 'Drafts'); setShowManageMenu(false); }} className="text-left px-3 py-2 rounded-lg text-xs font-bold text-gray-300 hover:bg-purple-500/15 hover:text-purple-400 transition-colors">
                                              Clear {draftsThisWeek.length} Drafts
                                          </button>
                                      )}
                                      
                                      {/* Open: Gray base, Yellow rollover */}
                                      {openThisWeek.length > 0 && (
                                          <button onClick={() => { onBulkDelete?.(openThisWeek.map(s => s.id), 'Open Slots'); setShowManageMenu(false); }} className="text-left px-3 py-2 rounded-lg text-xs font-bold text-gray-300 hover:bg-yellow-400/15 hover:text-yellow-400 transition-colors">
                                              Clear {openThisWeek.length} Open Slots
                                          </button>
                                      )}

                                      {/* Blocks: Gray base, Red rollover */}
                                      {blockedThisWeek.length > 0 && (
                                          <button onClick={() => { onBulkDelete?.(blockedThisWeek.map(s => s.id), 'Blocked Time'); setShowManageMenu(false); }} className="text-left px-3 py-2 rounded-lg text-xs font-bold text-gray-300 hover:bg-red-500/15 hover:text-red-400 transition-colors">
                                              Clear {blockedThisWeek.length} Blocks
                                          </button>
                                      )}
                                      
                                      {/* SOLID RED for the "Nuke" button */}
                                      {unbookedThisWeek.length > 1 && (
                                          <button onClick={() => { onBulkDelete?.(unbookedThisWeek.map(s => s.id), bookedThisWeek.length > 0 ? 'Unbooked Slots' : 'Entire Week'); setShowManageMenu(false); }} className="flex items-center gap-2 text-left px-3 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-colors mt-1">
                                              <Eraser size={14} /> 
                                              {bookedThisWeek.length > 0 ? `Clear All Unbooked (${unbookedThisWeek.length})` : `Clear Entire Week`}
                                          </button>
                                      )}
                                  </>
                              )}
                          </div>
                      </>
                  )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-textGrey select-none">
             <button 
                  onPointerDown={() => startPagination(-1)}
                  onPointerUp={stopPagination}
                  onPointerLeave={stopPagination}
                  onContextMenu={(e) => e.preventDefault()} 
                  className="p-2 hover-bg-theme rounded-lg transition-colors select-none touch-none"
             >
                 <ChevronLeft size={20}/>
             </button>
             
             <button onClick={jumpToToday} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${weekOffset === 0 ? 'bg-orange/10 text-orange border border-orange/20' : 'hover-bg-theme text-textGrey border border-transparent'}`}>Today</button>
             
             <button 
                  onPointerDown={() => startPagination(1)}
                  onPointerUp={stopPagination}
                  onPointerLeave={stopPagination}
                  onContextMenu={(e) => e.preventDefault()}
                  className="p-2 hover-bg-theme rounded-lg transition-colors select-none touch-none"
             >
                 <ChevronRight size={20}/>
             </button>
          </div>
        </div>

        {/* DAY HEADER */}
        <div className="flex border-b border-gray-800 bg-slate z-40 shadow-sm relative overflow-hidden">
          <div className="w-10 flex-shrink-0 bg-slate border-r border-gray-800 z-10" />
          <div className={`flex-1 relative overflow-hidden transition-[height] duration-200 ease-in-out ${isSelectMode ? 'h-[80px]' : 'h-[60px]'}`}>
              <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                      key={weekOffset} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={swipeTransition}
                      className="flex w-full h-full"
                      style={{ willChange: "transform, opacity" }}
                  >
                      {days.map((day, i) => {
                          const isToday = day.toDateString() === new Date().toDateString();
                          const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                          const holidayName = holidays[dateKey];

                          return (
                              <div key={i} className={`flex-1 min-w-0 py-2.5 text-center border-r border-gray-800 last:border-r-0 relative ${holidayName ? 'bg-red-500/10' : 'bg-slate'}`}>
                                  <div className={`text-[9px] uppercase font-black tracking-tighter ${isToday ? 'text-orange' : 'text-textGrey'}`}>
                                      {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                                  </div>
                                  <div className="flex flex-col items-center gap-1 w-full px-1.5 mt-0.5 pb-1">
                                      <div className={`text-xs font-bold leading-none ${isToday ? 'text-orange' : 'text-white'}`}>{day.getDate()}</div>
                                      
                                      {/* [NEW] Quick Day Select */}
                                      {isSelectMode && (
                                          <button 
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  const dSlots = slotsByDate[dateKey] || [];
                                                  if (dSlots.length > 0) toggleDaySelection(dSlots);
                                              }}
                                              className={`mt-1 p-0.5 rounded transition-colors border ${
                                                  (slotsByDate[dateKey] || []).length > 0 && (slotsByDate[dateKey] || []).every((s:any) => selectedIds.includes(s.id))
                                                      ? 'bg-blue-500 border-blue-500 text-white' 
                                                      : 'bg-transparent border-gray-600 text-transparent hover:border-blue-400'
                                              }`}
                                          >
                                              <Check size={10} />
                                          </button>
                                      )}
                                      {holidayName && !isSelectMode && <div title={holidayName} className="text-[8px] font-black uppercase tracking-tighter text-red-500/80 w-full truncate text-center mt-0.5">{holidayName}</div>}
                                  </div>
                                  {isToday && <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange" />}
                              </div>
                          );
                      })}
                  </motion.div>
              </AnimatePresence>
          </div>
        </div>

        {/* SCROLL AREA */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-none relative bg-slate [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
            <div className="w-full relative flex" style={{ height: CONTENT_HEIGHT }}>
                
                {/* 1. LEFT HOURS COLUMN */}
                <div 
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="w-10 flex-shrink-0 flex flex-col bg-midnight/10 border-r border-gray-800 h-full z-10 cursor-grab active:cursor-grabbing select-none"
                  style={{ touchAction: 'none' }} 
                >
                    {HOURS.map((hour, idx) => (
                    <div key={hour} style={{ height: CELL_HEIGHT }} className={`w-full flex items-start justify-center p-1 text-[9px] text-textGrey font-bold ${idx === HOURS.length - 1 ? '' : 'border-b border-gray-800 pointer-events-none'}`}>
                        {hour.toString().padStart(2, '0')}
                    </div>
                    ))}
                </div>

                {/* 2. GRID COLUMNS */}
                <div className="flex-1 relative h-full overflow-hidden">
                    {/* Make sure no old orange lines or dots are left in here! */}
                    
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={weekOffset} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={swipeTransition}
                            className="flex w-full h-full relative"
                            style={{ willChange: "transform, opacity" }}
                        >
                            {/* --- UNIFIED CINEMATIC BLUR SANDWICH --- */}
                            <div 
                                className={`absolute inset-0 z-10 pointer-events-none transition-all duration-150 ease-in-out ${
                                    isSelectMode 
                                        ? `${isDark ? 'bg-midnight/50' : 'bg-white/60'} backdrop-blur-[3px] opacity-100` 
                                        : 'bg-transparent backdrop-blur-none opacity-0'
                                }`} 
                            />

                            {days.map((day, dayIdx) => {
                            const dateString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                            
                            const daySlots = slotsByDate[dateString] || [];
                            const dayTime = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();

                            return (
                                <DayColumn 
                                key={dayIdx} dateStr={dateString} dayOfWeek={day.getDay()} isPublicHoliday={!!holidays[dateString]}
                                overId={overId} currentDragInfo={{ slot: activeSlot, snappedY: snappedY }}
                                todayStart={todayStart} 
                                currentHour={currentTime.hour}
                                currentMinute={currentTime.minute}
                                dayTime={dayTime} 
                                daySlots={daySlots} lessonDuration={lessonDuration}
                                setEditingSlot={setEditingSlot} isPlanningMode={isPlanningMode}
                                
                                isSelectMode={isSelectMode}
                                isDark={isDark}
                              >
                                  {daySlots.map((slot: any) => (
                                      <DraggableSlot 
                                        key={slot.id} 
                                        slot={slot} 
                                        setEditingSlot={setEditingSlot} 
                                        onContextMenu={handleContextMenu}
                                        isSelectMode={isSelectMode}
                                        isSelected={selectedIds.includes(slot.id)}
                                        onToggleSelect={toggleSelection}
                                      />
                                  ))}
                                </DayColumn>
                            );
                            })}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* --- 3. [NEW] THE BULLETPROOF TIME INDICATOR --- */}
                {nowPosition > 0 && weekOffset === 0 && (
                    <div 
                        className="absolute left-0 right-0 z-[100] pointer-events-none" 
                        style={{ top: `${nowPosition}px` }}
                    >
                        {/* THE LINE: left-10 forces it to start exactly after the 40px Time Column. -mt-[0.5px] nudges it dead center. */}
                        <div className="absolute left-10 right-0 h-[1px] bg-orange/80 -mt-[0.5px]" />
                        
                        {/* THE DOT WRAPPER: Anchored exactly at the 40px intersection. 
                            -ml-[5px] and -mt-[5px] pulls it mathematically dead center. 
                            Because the animation is on the INNER div, it can never break our layout again! */}
                        <div className="absolute left-10 top-0 -ml-[5px] -mt-[5px]">
                            <div className="w-2.5 h-2.5 bg-orange rounded-full shadow-[0_0_10px_rgba(255,165,0,0.8)] animate-dot-glow" />
                        </div>
                    </div>
                )}

            </div>
        </div>
      </div> 
      
      {/* --- [NEW] FLOATING ACTION BAR --- */}
        {/* --- [NEW] FLOATING ACTION BAR --- */}
        <AnimatePresence>
            {isSelectMode && selectedIds.length > 0 && (
              <motion.div 
                initial={{ y: 100, x: "-50%", opacity: 0 }}
                animate={{ y: 0, x: "-50%", opacity: 1 }}
                exit={{ y: 100, x: "-50%", opacity: 0 }}
                
                // [FIXED] Changed to shadow-sm and shadow-black/5 for an ultra-light, crisp lift!
                className="absolute bottom-20 left-1/2 bg-slate border border-gray-700 shadow-xl shadow-black/5 rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-4 z-[100]"
              >
                <span className="text-sm font-bold text-white whitespace-nowrap">
                  {selectedIds.length} Selected
                </span>
                
                <div className="w-[1px] h-6 bg-gray-700" />
                
                <button 
                  onClick={() => showToast?.('Bulk edit modal coming soon!', 'info')}
                  // [UPDATED] Matches the translucent orange glow of the "Add Lesson" button
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all bg-orange/20 border border-orange/50 text-orange hover:bg-orange hover:text-white shadow-[0_0_15px_rgba(249,115,22,0.15)] hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]"
              >
                  <Edit2 size={14} /> <span className="hidden sm:inline">Edit</span>
              </button>
              
              <button 
                  onClick={() => {
                      if (onBulkDelete) onBulkDelete(selectedIds, `${selectedIds.length} Selected Slots`);
                      setIsSelectMode(false);
                      setSelectedIds([]);
                  }}
                  // [UPDATED] Matches the translucent red glow of the "Clear" dropdown button
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              >
                  <Trash2 size={14} /> <span className="hidden sm:inline">Delete</span>
              </button>
                
                <button onClick={() => { setSelectedIds([]); setIsSelectMode(false); }} className="p-2 rounded-full hover:bg-white/10 text-gray-400 transition-colors ml-1 sm:ml-2">
                    <X size={16} />
                </button>
              </motion.div>
            )}
        </AnimatePresence>
        
      {/* DragOverlay */}
      <DragOverlay dropAnimation={null}>
        <AnimatePresence>
        {activeSlot ? <DragOverlayCard displayTime={liveTime} slot={activeSlot} /> : null}        
        </AnimatePresence>
      </DragOverlay>

      {/* --- NATIVE RIGHT CLICK MENU PORTAL --- */}
      {contextMenu && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setContextMenu(null)} 
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed z-[9999] bg-slate border border-gray-700 shadow-2xl rounded-lg py-1.5 min-w-[170px] overflow-hidden"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            
            <button 
                onClick={() => { setEditingSlot(contextMenu.slot); setContextMenu(null); }}
                className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-white hover:bg-orange hover:text-white transition-colors"
            >
                <Edit2 size={14} />
                <span>Edit Lesson</span>
            </button>

            {/* ONLY show Publish if it's currently a Draft */}
            {contextMenu.slot.status === 'Draft' && (
                <button 
                    onClick={() => { 
                        if (onSlotMove) onSlotMove(contextMenu.slot, contextMenu.slot.date, contextMenu.slot.time, 'Booked'); 
                        setContextMenu(null); 
                    }}
                    className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-green-400 hover:bg-green-500 hover:text-white transition-colors"
                >
                    <Send size={14} />
                    <span>Publish to Booked</span>
                </button>
            )}
            
            {/* ONLY show Convert to Draft if it is NOT a Draft AND NOT Blocked */}
            {contextMenu.slot.status !== 'Draft' && contextMenu.slot.status !== 'Blocked' && (
                <button 
                    onClick={() => { 
                        if (onSlotMove) onSlotMove(contextMenu.slot, contextMenu.slot.date, contextMenu.slot.time, 'Draft'); 
                        setContextMenu(null); 
                    }}
                    className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-purple-400 hover:bg-purple-500 hover:text-white transition-colors"
                >
                    <FileText size={14} />
                    <span>Convert to Draft</span>
                </button>
            )}
            
            <div className="h-[1px] bg-gray-800 my-1 mx-2" />
            
            <button 
                onClick={() => { 
                    if (onDeleteSlot) onDeleteSlot(contextMenu.slot); 
                    setContextMenu(null); 
                }}
                className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors"
            >
                <Trash2 size={14} />
                <span>Delete Lesson</span>
            </button>
          </motion.div>
        </>,
        document.body
      )}
    </DndContext>
  );
}
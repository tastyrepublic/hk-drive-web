import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom'; 
import { Calendar, ChevronLeft, ChevronRight, Plus, Sparkles, AlertCircle, Send, Loader2, Edit2, Trash2, FileText } from 'lucide-react';
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
  slots: any[];
  setEditingSlot: (slot: any) => void;
  lessonDuration: number; 
  onPublishDrafts: () => Promise<void>;
  onOpenAutoFill: (weekStartDate: Date) => void;
  onCopyWeek: (slotsToCopy: any[], onSuccess: (msg: string) => void, onError: (msg: string) => void) => Promise<void>;
  onSlotMove?: (originalSlot: any, newDate: string, newTime: string, status: string) => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
  onDeleteSlot?: (slot: any) => void;}

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

function DraggableSlot({ slot, setEditingSlot, onContextMenu }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: slot.id, data: slot });
  const startY = timeToPixels(slot.time);
  
  let durationMins = slot.duration || 60;
  if (slot.endTime) {
      const [startH, startM] = (slot.time || "00:00").split(':').map(Number);
      const [endH, endM] = (slot.endTime || "01:00").split(':').map(Number);
      durationMins = (endH * 60 + endM) - (startH * 60 + startM);
  }
  const height = (durationMins / 60) * CELL_HEIGHT - 2;

  return (
    <div 
      ref={setNodeRef} {...listeners} {...attributes}
      onContextMenu={(e) => onContextMenu(e, slot)} 
      className={`absolute left-[2px] right-[2px] ${isDragging ? 'opacity-0' : 'opacity-100'}`}
      style={{ top: `${startY}px`, height: `${height}px`, touchAction: 'none' }}
    >
      <DiaryCard slot={slot} setEditingSlot={setEditingSlot} />
    </div>
  );
}

function DayColumn({ dateStr, dayOfWeek, isPublicHoliday, children, overId, currentDragInfo, todayStart, currentHour, dayTime, daySlots, lessonDuration, setEditingSlot, isPlanningMode, currentMinute }: any) {
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
    <div ref={setNodeRef} className={`flex-1 min-w-0 border-r border-gray-800 last:border-r-0 relative h-full transition-colors ${isOver ? 'bg-white/5' : 'bg-slate'}`}>
      
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
          let cellClass = 'w-full relative group transition-colors duration-200 ease-in-out border-b border-gray-800/30 ';

          if (isPastHour) {
              cellClass += 'bg-black/40 cursor-not-allowed'; 
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
                  if (isPastHour) return; 

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
      {children}
    </div>
  );
}

export function DiaryView({ 
  slots, 
  setEditingSlot, 
  lessonDuration = 60, 
  onPublishDrafts, 
  onOpenAutoFill, 
  onCopyWeek, 
  onSlotMove,
  showToast,
  onDeleteSlot,
}: Props) {
  
  const [[weekOffset, direction], setWeekOffset] = useState([0, 0]);
  const [nowPosition, setNowPosition] = useState(0);
  const [currentTime, setCurrentTime] = useState({ 
      hour: new Date().getHours(), 
      minute: new Date().getMinutes() 
  });
  const [isPlanningMode, setIsPlanningMode] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const draftSlots = slots.filter(s => s.status === 'Draft');
  
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

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    const dayOfWeek = d.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(d.getDate() + diffToMonday + i + (weekOffset * 7));
    return d;
  });

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
            
            // [NEW] Instantly show the starting time before the user even moves the mouse!
            setLiveTime(slot.time || "00:00"); 
        }} 
        onDragMove={handleDragMove} 
        onDragEnd={handleDragEnd} 
        autoScroll={false} 
    >   
      <div 
          onContextMenu={(e) => e.preventDefault()} 
          className="flex flex-col h-[calc(100vh-160px)] bg-slate rounded-2xl border border-gray-800 overflow-hidden relative shadow-2xl transition-colors duration-300"
      >
        
        {/* HEADER */}
        <div className="p-4 flex items-center justify-between border-b border-gray-800 bg-header z-50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-white">
              {days[0].toLocaleDateString('en-GB', { month: 'short' })} '{days[0].toLocaleDateString('en-GB', { year: '2-digit' })}
            </h2>
            <div className="flex items-center gap-2">
              
              {/* [NEW] Keep button visible if it is currently publishing */}
              {(draftSlots.length > 0 || isPublishing) && (
                <button onClick={async () => { 
                    setIsPublishing(true); 
                    await onPublishDrafts(); 
                    setIsPublishing(false); 
                    setIsPlanningMode(false); 
                  }}
                  disabled={isPublishing}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-lg active:scale-95 transition-all"
                >
                  {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {/* [NEW] Change text to "Publishing..." so it doesn't say "Publish 0 Drafts" */}
                  <span>{isPublishing ? 'Publishing...' : `Publish ${draftSlots.length} Drafts`}</span>
                </button>
              )}

              <button onClick={() => setEditingSlot({ status: isPlanningMode ? 'Draft' : 'Booked' }) }
                className="flex items-center gap-2 bg-orange text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-lg active:scale-95 transition-transform"
              >
                <Plus size={16} strokeWidth={3} />
                <span className="hidden sm:inline">Add Lesson</span>
              </button>
              
              <button onClick={() => { onOpenAutoFill(days[0]); setIsPlanningMode(true); }}
                className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 text-purple-400 hover:bg-purple-500 hover:text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                <Sparkles size={16} />
                <span className="hidden sm:inline">Auto-Fill Week</span>
              </button>

              <button onClick={async () => {
      setIsPublishing(true);
      const weekDates = days.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      const slotsToCopy = slots.filter(s => weekDates.includes(s.date));
      
      // Replaced with clean toast notifications
      await onCopyWeek(
        slotsToCopy, 
        (msg) => showToast?.(msg, 'success'), 
        (msg) => showToast?.(msg, 'error')
      );
      
      setIsPublishing(false);
      setIsPlanningMode(true);
    }}
    disabled={isPublishing}
    className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-all"
  >
    <Calendar size={16} />
    <span className="hidden sm:inline">Copy to Next Week</span>
  </button>
              
              <button onClick={() => setIsPlanningMode(!isPlanningMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border ${
                  isPlanningMode ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'bg-midnight text-textGrey border-gray-800 hover:text-purple-400'
                }`}
              >
                <Sparkles size={16} />
                <span className="hidden sm:inline">{isPlanningMode ? 'Planning Active' : 'Plan Schedule'}</span>
              </button>
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
          <div className="flex-1 relative h-[60px] overflow-hidden">
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
                                  <div className="flex flex-col items-center gap-1 w-full px-1.5 mt-0.5">
                                      <div className={`text-xs font-bold leading-none ${isToday ? 'text-orange' : 'text-white'}`}>{day.getDate()}</div>
                                      {holidayName && <div title={holidayName} className="text-[8px] font-black uppercase tracking-tighter text-red-500/80 w-full truncate text-center mt-0.5">{holidayName}</div>}
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
                
                {/* LEFT HOURS COLUMN */}
                <div 
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="w-10 flex-shrink-0 flex flex-col bg-midnight/10 border-r border-gray-800 h-full z-10 cursor-grab active:cursor-grabbing select-none"
                  style={{ touchAction: 'none' }} 
                >
                    {HOURS.map((hour, idx) => (
                    <div key={hour} style={{ height: CELL_HEIGHT }} className={`w-full flex items-start justify-center p-1 text-[9px] text-textGrey font-bold ${idx === HOURS.length - 1 ? '' : 'border-b border-gray-800/40 pointer-events-none'}`}>
                        {hour.toString().padStart(2, '0')}
                    </div>
                    ))}
                </div>

                {/* GRID COLUMNS */}
                <div className="flex-1 relative h-full overflow-hidden">
                    {nowPosition > 0 && weekOffset === 0 && (
                    <div className="absolute left-0 right-0 z-50 pointer-events-none flex items-center" style={{ top: `${nowPosition}px` }}>
                        <div className="w-full h-[0.5px] bg-orange/80" />
                        <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-orange animate-dot-glow shadow-[0_0_10px_rgba(255,165,0,0.5)]" />
                    </div>
                    )}

                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={weekOffset} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={swipeTransition}
                            className="flex w-full h-full"
                            style={{ willChange: "transform, opacity" }}
                        >
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
                              >
                                  {daySlots.map((slot: any) => (
                                      <DraggableSlot 
                                        key={slot.id} 
                                        slot={slot} 
                                        setEditingSlot={setEditingSlot} 
                                        onContextMenu={handleContextMenu}
                                      />
                                  ))}
                                </DayColumn>
                            );
                            })}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
      </div> 
      
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
            {/* The "Lesson Actions" header has been completely removed from here */}
            
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
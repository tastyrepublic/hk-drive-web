import { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Sparkles, AlertCircle, Send, Loader2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { DiaryCard } from './DiaryCard';
import { useHolidays } from '../../hooks/useHolidays';

// --- IMPORT CONSTANTS ---
import { RESTRICTED_HOURS } from '../../constants/list';

// --- IMPORT SCHEDULER UTILITIES ---
import { getSmartStartTime } from '../../scheduler';

interface Props {
  slots: any[];
  setEditingSlot: (slot: any) => void;
  lessonDuration: number; 
  onPublishDrafts: () => Promise<void>;
  onOpenAutoFill: (weekStartDate: Date) => void; // <-- Change this prop
  onCopyWeek: (slotsToCopy: any[], onSuccess: (msg: string) => void, onError: (msg: string) => void) => Promise<void>;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
const CELL_HEIGHT = 110; 
const CONTENT_HEIGHT = HOURS.length * CELL_HEIGHT; 
const START_HOUR = 6; // Grid starts at 6am

// --- ANIMATION CONFIG ---
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    position: 'absolute' as const
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    position: 'relative' as const
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    position: 'absolute' as const
  })
};

const swipeTransition = {
  x: { type: "tween" as const, ease: "easeOut" as const, duration: 0.25 },
  opacity: { duration: 0.2 }
};

// --- HELPER: Parse "HH:MM" to Pixels ---
const timeToPixels = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutesFromStart = (h - START_HOUR) * 60 + m;
    return (totalMinutesFromStart / 60) * CELL_HEIGHT;
};

export function DiaryView({ slots, setEditingSlot, lessonDuration, onPublishDrafts, onOpenAutoFill, onCopyWeek }: Props) {
  const [[weekOffset, direction], setWeekOffset] = useState([0, 0]);
  const [nowPosition, setNowPosition] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(800);
  const y = useMotionValue(0);
  const scrollLimit = -(CONTENT_HEIGHT - containerHeight);
  
  const isDragging = useRef(false);

  const holidays = useHolidays();

  const [isPlanningMode, setIsPlanningMode] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const draftSlots = slots.filter(s => s.status === 'Draft');

  // --- HELPERS ---
  const isPastSlot = (targetDate: Date, targetHour: number) => {
    const now = new Date();
    
    // Reset the time portion of targetDate to midnight for accurate day comparison
    const targetDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (targetDay < today) return true; // Entire day is in the past
    if (targetDay.getTime() === today.getTime() && targetHour < now.getHours()) return true; // Earlier today
    
    return false; // Future or current hour
  };

  // --- PHYSICS ---
  const scaleY = useTransform(
    y,
    [scrollLimit - 250, scrollLimit, 0, 250],
    [1.35, 1, 1, 1.35],
    { clamp: true }
  );
  
  const transformOrigin = useTransform(y, (val) => {
    if (val > 0) return 'top';
    if (val < scrollLimit) return 'bottom';
    return 'center';
  });

  // --- NAVIGATION ---
  // [UPDATED] Use functional state (prev) so it doesn't get stuck during rapid-fire holding
  const paginate = useCallback((newDirection: number) => {
    setWeekOffset(prev => [prev[0] + newDirection, newDirection]);
  }, []);

  const jumpToToday = () => {
    setWeekOffset(prev => [0, prev[0] < 0 ? 1 : -1]);
    scrollToTime(true);
  };

  // --- [NEW] HOLD-TO-FLY LOGIC ---
  // [FIX] Use standard web typings instead of NodeJS
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHold = (direction: number) => {
    paginate(direction); 
    
    holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = setInterval(() => {
            paginate(direction);
        }, 150); 
    }, 400); 
  };

  const stopHold = () => {
    if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current as any);
        clearInterval(holdTimerRef.current as any);
        holdTimerRef.current = null;
    }
  };

  // We accidentally deleted this! It calculates the dates for the visible week.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    const dayOfWeek = d.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(d.getDate() + diffToMonday + i + (weekOffset * 7));
    return d;
  });

  // --- SCROLL LOGIC ---
  const scrollToTime = useCallback((smooth = true) => {
    const now = new Date();
    const hours = now.getHours();

    if (hours >= 6 && hours < 24) {
      let targetY = -((hours - 6) * CELL_HEIGHT - 160); 
      const safeY = Math.max(scrollLimit, Math.min(0, targetY));

      if (smooth) {
        animate(y, safeY, { type: "spring", stiffness: 300, damping: 30 });
      } else {
        y.set(safeY);
      }
    } else {
        if (smooth) animate(y, 0);
        else y.set(0);
    }
  }, [scrollLimit, y]);

  // Mouse Wheel
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); 
      const currentY = y.get();
      let targetY = currentY - e.deltaY;
      targetY = Math.max(scrollLimit, Math.min(0, targetY));

      animate(y, targetY, {
        type: "spring",
        stiffness: 200,
        damping: 25,
        mass: 1
      });
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [scrollLimit, y]); 

  // Init
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.offsetHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    scrollToTime(false);
    
    const updateNow = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      if (hours >= 6 && hours < 24) {
        setNowPosition((hours - 6) * CELL_HEIGHT + (minutes / 60) * CELL_HEIGHT);
      }
    };
    updateNow();
    const interval = setInterval(updateNow, 60000);
    return () => {
        clearInterval(interval);
        window.removeEventListener('resize', updateHeight);
    };
  }, [containerHeight, scrollLimit, scrollToTime]);

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] bg-slate rounded-2xl border border-gray-800 overflow-hidden relative shadow-2xl transition-colors duration-300">
      
      {/* HEADER */}
      <div className="p-4 flex items-center justify-between border-b border-gray-800 bg-header z-50 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black text-white">
            {days[0].toLocaleDateString('en-GB', { month: 'short' })} '{days[0].toLocaleDateString('en-GB', { year: '2-digit' })}
          </h2>
          <div className="flex items-center gap-2">
            
            {/* 1. PUBLISH BUTTON (Only shows if there are drafts) */}
            {draftSlots.length > 0 && (
              <button 
                onClick={async () => {
                  setIsPublishing(true);
                  await onPublishDrafts();
                  setIsPublishing(false);
                  setIsPlanningMode(false); // Auto-exit planning mode when done
                }}
                disabled={isPublishing}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-lg active:scale-95 transition-all"
              >
                {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span>Publish {draftSlots.length} Drafts</span>
              </button>
            )}

            {/* 2. ADD LESSON BUTTON (Passes Draft status if in Planning Mode) */}
            <button 
              onClick={() => {
                setEditingSlot({ status: isPlanningMode ? 'Draft' : 'Booked' }); 
              }}
              className="flex items-center gap-2 bg-orange text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-lg active:scale-95 transition-transform"
            >
              <Plus size={16} strokeWidth={3} />
              <span className="hidden sm:inline">Add Lesson</span>
            </button>
            
            {/* 3. AUTO-FILL BUTTON (Opens the new Modal) */}
            <button 
              onClick={() => {
                onOpenAutoFill(days[0]); 
                setIsPlanningMode(true); // Turns on draft mode so you can see them!
              }}
              className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 text-purple-400 hover:bg-purple-500 hover:text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">Auto-Fill Week</span>
            </button>

            {/* NEW COPY WEEK BUTTON */}
            <button 
              onClick={async () => {
                setIsPublishing(true); // Re-use the loading state to prevent double clicks
                
                // 1. Gather ONLY the slots currently visible on this specific week
                const weekDates = days.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                const slotsToCopy = slots.filter(s => weekDates.includes(s.date));
                
                // 2. Fire the smart copy!
                await onCopyWeek(
                    slotsToCopy,
                    (msg) => alert(msg), // You can replace this with your toast if you pass showToast down!
                    (msg) => alert(msg)
                );
                
                setIsPublishing(false);
                setIsPlanningMode(true); // Turn on draft mode so they can see what pasted
              }}
              disabled={isPublishing}
              className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-all"
            >
              <Calendar size={16} />
              <span className="hidden sm:inline">Copy to Next Week</span>
            </button>
            
            {/* 4. PLANNING MODE TOGGLE (This is your existing button) */}
            <button 
              onClick={() => setIsPlanningMode(!isPlanningMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border ${
                isPlanningMode 
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' 
                  : 'bg-midnight text-textGrey border-gray-800 hover:text-purple-400'
              }`}
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">{isPlanningMode ? 'Planning Active' : 'Plan Schedule'}</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-textGrey select-none">
           <button 
             onMouseDown={() => startHold(-1)}
             onMouseUp={stopHold}
             onMouseLeave={stopHold}
             onTouchStart={() => startHold(-1)}
             onTouchEnd={stopHold}
             // Prevents text-selection highlighting while holding
             className="p-2 hover-bg-theme rounded-lg transition-colors select-none"
           >
             <ChevronLeft size={20}/>
           </button>
           
           <button 
             onClick={jumpToToday} 
             className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${weekOffset === 0 ? 'bg-orange/10 text-orange border border-orange/20' : 'hover-bg-theme text-textGrey border border-transparent'}`}
           >
             Today
           </button>
           
           <button 
             onMouseDown={() => startHold(1)}
             onMouseUp={stopHold}
             onMouseLeave={stopHold}
             onTouchStart={() => startHold(1)}
             onTouchEnd={stopHold}
             className="p-2 hover-bg-theme rounded-lg transition-colors select-none"
           >
             <ChevronRight size={20}/>
           </button>
        </div>
      </div>

      {/* DAY HEADER */}
      <div className="flex border-b border-gray-800 bg-slate z-40 shadow-sm relative overflow-hidden transition-colors duration-300">
        <div className="w-10 flex-shrink-0 bg-slate border-r border-gray-800 z-10 transition-colors duration-300" />
        
        <div className="flex-1 relative h-[60px]">
            <AnimatePresence initial={false} custom={direction}>
                <motion.div
                    key={weekOffset}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={swipeTransition}
                    className="flex w-full h-full absolute top-0 left-0"
                >
                    {days.map((day, i) => {
                        const isToday = day.toDateString() === new Date().toDateString();
                        
                        // Look up the holiday for this specific date
                        const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                        const holidayName = holidays[dateKey];

                        return (
                            // Tint the header cell faintly red if it's a holiday
                            <div 
                                key={i} 
                                className={`flex-1 min-w-0 py-2.5 text-center border-r border-gray-800 last:border-r-0 relative transition-colors duration-300 ${
                                    holidayName ? 'bg-red-500/10' : 'bg-slate'
                                }`}
                            >
                                <div className={`text-[9px] uppercase font-black tracking-tighter ${isToday ? 'text-orange' : 'text-textGrey'}`}>
                                    {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                                </div>
                                
                                {/* Date & Clean Holiday Badge */}
                                <div className="flex flex-col items-center gap-1 w-full px-1.5 mt-0.5">
                                    <div className={`text-xs font-bold leading-none ${isToday ? 'text-orange' : 'text-white'}`}>
                                        {day.getDate()}
                                    </div>
                                    
                                    {holidayName && (
                                        <div 
                                            title={holidayName}
                                            className="text-[8px] font-black uppercase tracking-tighter text-red-500/80 w-full truncate text-center mt-0.5"
                                        >
                                            {holidayName}
                                        </div>
                                    )}
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
        ref={containerRef} 
        className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing bg-slate transition-colors duration-300"
      >
        <motion.div
            style={{ 
                y, 
                scaleY, 
                transformOrigin,
                height: CONTENT_HEIGHT,
                willChange: 'transform',
                touchAction: 'none'
            }} 
            onDragStart={() => { isDragging.current = true; }}
            // [FIX 1] Increase the timeout to 150ms so it covers the browser's click delay
            onDragEnd={() => { setTimeout(() => isDragging.current = false, 150); }}
            // [FIX 2] Add this shield! It instantly kills any click event if dragging is true.
            onClickCapture={(e) => {
                if (isDragging.current) {
                    e.stopPropagation();
                    e.preventDefault();
                }
            }}
            drag="y"
            dragConstraints={{ top: scrollLimit, bottom: 0 }}
            dragElastic={0.5} 
            dragMomentum={true}
            className="w-full relative flex"
        >
            {/* HOURS COLUMN */}
            <div className="w-10 flex-shrink-0 flex flex-col bg-midnight/10 border-r border-gray-800 h-full z-10 transition-colors duration-300">
                {HOURS.map((hour, idx) => (
                <div 
                    key={hour} 
                    style={{ height: CELL_HEIGHT }}
                    className={`w-full flex items-start justify-center p-1 text-[9px] text-textGrey font-bold ${idx === HOURS.length - 1 ? '' : 'border-b border-gray-800/40'}`}
                >
                    {hour.toString().padStart(2, '0')}
                </div>
                ))}
            </div>

            {/* GRID COLUMNS */}
            <div className="flex-1 relative h-full">
                {nowPosition > 0 && weekOffset === 0 && (
                <div className="absolute left-0 right-0 z-50 pointer-events-none flex items-center" style={{ top: `${nowPosition}px` }}>
                    <div className="w-full h-[0.5px] bg-orange/80" />
                    <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-orange animate-dot-glow shadow-[0_0_10px_rgba(255,165,0,0.5)]" />
                </div>
                )}

                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={weekOffset}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={swipeTransition}
                        className="flex w-full h-full absolute top-0 left-0"
                    >
                        {days.map((day, dayIdx) => {
                        // --- BUG FIX: Use Local Time instead of UTC ---
                        const y = day.getFullYear();
                        const m = String(day.getMonth() + 1).padStart(2, '0');
                        const d = String(day.getDate()).padStart(2, '0');
                        const dateString = `${y}-${m}-${d}`;
                        
                        const daySlots = slots.filter(s => s.date === dateString);

                        // --- CALCULATE RESTRICTED ZONES FOR THIS DAY ---
                        const dayOfWeek = day.getDay(); // 0=Sun, 6=Sat
                        const isPublicHoliday = !!holidays[dateString]; 
                        
                        // If it's Sunday OR a Public Holiday, wipe out all restrictions!
                        const restrictedZones = (dayOfWeek === 0 || isPublicHoliday) 
                            ? [] 
                            : RESTRICTED_HOURS
                                .filter(r => r.days.includes(dayOfWeek))
                                .map(r => {
                                    const top = timeToPixels(r.start);
                                    const height = timeToPixels(r.end) - top;
                                    return { top, height, label: r.label };
                                });

                        return (
                            <div 
                                key={dayIdx} 
                                className="flex-1 min-w-0 border-r border-gray-800 last:border-r-0 relative h-full bg-slate transition-colors duration-300"
                            >
                            
                            {/* RESTRICTED ZONES VISUALIZATION */}
                            {restrictedZones.map((zone, idx) => (
                                <div 
                                    key={`rest-${idx}`}
                                    className="absolute left-0 right-0 z-0 pointer-events-none overflow-hidden"
                                    style={{ 
                                        top: zone.top, 
                                        height: zone.height,
                                        // Striped background pattern
                                        background: `repeating-linear-gradient(
                                            45deg,
                                            rgba(239, 68, 68, 0.03),
                                            rgba(239, 68, 68, 0.03) 10px,
                                            rgba(239, 68, 68, 0.08) 10px,
                                            rgba(239, 68, 68, 0.08) 20px
                                        )`
                                    }}
                                >
                                    {/* Optional Label */}
                                    <div className="absolute top-2 right-1 opacity-40">
                                        <div className="flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-red-400 uppercase tracking-tighter border border-red-500/20">
                                            <AlertCircle size={8} /> {zone.label}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {HOURS.map((h, idx) => {
                              // [NEW] Check if this specific hour block is in the past!
                              const isPast = isPastSlot(day, h);

                              return (
                                <div 
                                  key={h} 
                                  style={{ height: CELL_HEIGHT, cursor: isPast ? 'not-allowed' : 'pointer' }}
                                  className={`w-full relative group transition-colors duration-200 ease-in-out 
                                    ${idx === HOURS.length - 1 ? '' : 'border-b border-gray-800/30'}
                                    ${isPast ? 'bg-black/40 hover:bg-black/40' : 'hover:bg-white/5'}
                                  `}
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      
                                      // [NEW] Completely block interactions with past slots!
                                      if (isDragging.current || isPast) return;
                                      
                                      // --- USE THE CENTRALIZED UTILITY ---
                                      const smartTime = getSmartStartTime(h, daySlots, lessonDuration);
                                      
                                      setEditingSlot({
                                        date: dateString,
                                        time: smartTime, 
                                        location: '', 
                                        type: '', 
                                        status: isPlanningMode ? 'Draft' : 'Booked' 
                                      }); 
                                  }}
                                >
                                    {/* Only show the plus icon on hover if it's NOT in the past */}
                                    {!isPast && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out pointer-events-none">
                                            <Plus className="text-orange/50" size={16} />
                                        </div>
                                    )}
                                </div>
                              );
                            })}

                            {daySlots.map(slot => {
                                let effectiveDuration = slot.duration;
                                if (!effectiveDuration) {
                                     if (slot.customDuration) effectiveDuration = slot.customDuration;
                                     else effectiveDuration = slot.isDouble ? lessonDuration * 2 : lessonDuration;
                                }

                                return (
                                    <DiaryCard 
                                        key={slot.id} 
                                        slot={{ ...slot, duration: effectiveDuration }} 
                                        setEditingSlot={setEditingSlot} 
                                        isAbsolute={true} 
                                    />
                                );
                            })}
                            </div>
                        );
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
      </div>
    </div>
  );
}
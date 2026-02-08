import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { DiaryCard } from './DiaryCard';

interface Props {
  slots: any[];
  setEditingSlot: (slot: any) => void;
  setEditForm: (form: any) => void;
  lessonDuration: number; 
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
const CELL_HEIGHT = 110; 
const CONTENT_HEIGHT = HOURS.length * CELL_HEIGHT; 

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

export function DiaryView({ slots, setEditingSlot, setEditForm, lessonDuration }: Props) {
  const [[weekOffset, direction], setWeekOffset] = useState([0, 0]);
  const [nowPosition, setNowPosition] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(800);
  const y = useMotionValue(0);
  const scrollLimit = -(CONTENT_HEIGHT - containerHeight);
  
  const isDragging = useRef(false);

  // --- NEW HELPERS FOR SMART TIME ---
  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const getSmartStartTime = (clickedHour: number, daySlots: any[]) => {
    const clickedStartMins = clickedHour * 60;     
    const clickedEndMins = (clickedHour + 1) * 60; 

    let maxEndTime = clickedStartMins;

    daySlots.forEach(slot => {
        const startMins = timeToMinutes(slot.time);
        
        let duration = slot.duration; 
        if (!duration) {
             if (slot.customDuration) duration = slot.customDuration;
             else duration = slot.isDouble ? lessonDuration * 2 : lessonDuration;
        }

        const endMins = startMins + duration;

        if (endMins > clickedStartMins && startMins < clickedEndMins) {
            if (endMins > maxEndTime) {
                maxEndTime = endMins;
            }
        }
    });

    return minutesToTime(maxEndTime);
  };
  // ----------------------------------

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
  const paginate = (newDirection: number) => {
    setWeekOffset([weekOffset + newDirection, newDirection]);
  };

  const jumpToToday = () => {
    const newDirection = weekOffset === 0 ? 0 : (0 > weekOffset ? 1 : -1);
    setWeekOffset([0, newDirection]);
    scrollToTime(true);
  };

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
            <button 
              onClick={() => {
                setEditingSlot({}); 
                setEditForm({ isDouble: true, location: '' }); 
              }}
              className="flex items-center gap-2 bg-orange text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-lg active:scale-95 transition-transform"
            >
              <Plus size={16} strokeWidth={3} />
              <span>Add Lesson</span>
            </button>
            <button className="flex items-center gap-2 bg-midnight border border-gray-800 text-textGrey hover:text-orange px-3 py-1.5 rounded-lg font-bold text-xs transition-colors">
              <Sparkles size={16} />
              <span>AI Arrange</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-textGrey">
           <button onClick={() => paginate(-1)} className="p-2 hover-bg-theme rounded-lg"><ChevronLeft size={20}/></button>
           <button onClick={jumpToToday} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${weekOffset === 0 ? 'bg-orange/10 text-orange border border-orange/20' : 'hover-bg-theme text-textGrey border border-transparent'}`}>Today</button>
           <button onClick={() => paginate(1)} className="p-2 hover-bg-theme rounded-lg"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* DAY HEADER */}
      <div className="flex border-b border-gray-800 bg-slate z-40 shadow-sm relative overflow-hidden transition-colors duration-300">
        <div className="w-10 flex-shrink-0 bg-slate border-r border-gray-800 z-10 transition-colors duration-300" />
        
        <div className="flex-1 relative h-[52px]">
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
                    return (
                        <div key={i} className="flex-1 py-3 text-center border-r border-gray-800 last:border-r-0 relative bg-slate transition-colors duration-300">
                        <div className={`text-[9px] uppercase font-black tracking-tighter ${isToday ? 'text-orange' : 'text-textGrey'}`}>
                            {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                        </div>
                        <div className={`text-xs font-bold ${isToday ? 'text-orange' : 'text-white'}`}>{day.getDate()}</div>
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
            onDragEnd={() => { setTimeout(() => isDragging.current = false, 10); }}
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
                        const dateString = day.toISOString().split('T')[0];
                        const daySlots = slots.filter(s => s.date === dateString);

                        return (
                            <div key={dayIdx} className="flex-1 border-r border-gray-800 last:border-r-0 relative h-full bg-slate transition-colors duration-300">
                            
                            {HOURS.map((h, idx) => {
                              return (
                                <div 
                                  key={h} 
                                  style={{ height: CELL_HEIGHT, cursor: 'pointer' }}
                                  className={`w-full relative group hover:bg-white/5 transition-colors duration-200 ease-in-out ${idx === HOURS.length - 1 ? '' : 'border-b border-gray-800/30'}`}
                                  
                                  // SMART CLICK LOGIC
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      if (isDragging.current) return;
                                      
                                      const smartTime = getSmartStartTime(h, daySlots);

                                      setEditForm({
                                        date: dateString,
                                        time: smartTime, 
                                        location: '', 
                                        // FIX: Set to empty to force user selection in Modal
                                        type: '', 
                                        isDouble: true 
                                      });
                                      setEditingSlot({}); 
                                  }}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out pointer-events-none">
                                        <Plus className="text-orange/50" size={16} />
                                    </div>
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
                                        setEditForm={setEditForm} 
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
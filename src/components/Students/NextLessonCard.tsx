import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, MapPin, XCircle, ChevronLeft, ChevronRight, 
  List, AlertCircle, UserCog, Clock 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLessonLocationLabel } from '../../constants/list';
import { GLOBAL_TRANSITION } from '../../constants/animations'; //

interface Props {
  upcomingLessons: any[]; 
  isDark: boolean;
  onCancelLesson: (id: string) => void;
  onOpenHistory: () => void;
}

function MarqueeText({ text }: { text: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [shouldScroll, setShouldScroll] = useState(false);

    useEffect(() => {
        if (containerRef.current && textRef.current) {
            setShouldScroll(textRef.current.offsetWidth > containerRef.current.offsetWidth);
        }
    }, [text]);

    return (
        <div ref={containerRef} className="flex-1 overflow-hidden whitespace-nowrap relative">
            <motion.span
                ref={textRef}
                className="inline-block font-semibold text-sm"
                animate={shouldScroll ? {
                    x: [0, -(textRef.current?.offsetWidth || 0) + (containerRef.current?.offsetWidth || 0) - 10, 0],
                } : { x: 0 }}
                transition={shouldScroll ? {
                    duration: text.length * 0.2,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: "linear"
                } : {}}
            >
                {text}
            </motion.span>
        </div>
    );
}

export function NextLessonCard({ upcomingLessons, onCancelLesson, onOpenHistory }: Props) {
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [upcomingLessons.length]);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const filteredLessons = useMemo(() => {
      const now = new Date();
      return upcomingLessons.filter(lesson => {
          const start = new Date(`${lesson.date}T${lesson.time}`);
          const endTimeStr = lesson.endTime || new Date(start.getTime() + 60 * 60000).toTimeString().slice(0, 5);
          const end = new Date(`${lesson.date}T${endTimeStr}`);
          return end > now;
      });
  }, [upcomingLessons, tick]);

  const lesson = filteredLessons[currentIndex];
  const hasLessons = filteredLessons.length > 0 && !!lesson;

  const { isStarted, durationLabel, statusLabelKey } = (() => {
      if (!hasLessons) return { isStarted: false, durationLabel: '', statusLabelKey: 'next_lesson.upcoming' };
      
      const now = new Date();
      const start = new Date(`${lesson.date}T${lesson.time}`);
      const endTimeStr = lesson.endTime || new Date(start.getTime() + 60 * 60000).toTimeString().slice(0, 5);
      const end = new Date(`${lesson.date}T${endTimeStr}`);
      const diffMins = Math.round((end.getTime() - start.getTime()) / 60000);
      const isLive = now >= start && now < end;
      
      return {
          isStarted: isLive,
          durationLabel: `${diffMins} ${t('common.min')}`,
          statusLabelKey: isLive ? 'next_lesson.happening' : (currentIndex === 0 ? 'next_lesson.up_next' : 'next_lesson.upcoming'),
      };
  })();

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => prev + newDirection);
  };

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0, position: 'absolute' as const })
  };

  const bgClass = isStarted 
    ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 shadow-lg shadow-emerald-500/20 border-emerald-400/30' 
    : 'bg-gradient-to-br from-[#06b6d4] to-[#2563eb] shadow-blue-500/10 border-white/10';

  return (
    <motion.div 
      layout
      transition={GLOBAL_TRANSITION}
      /* [UPDATED] Removed fixed height/min-height. Now it grows/shrinks naturally. */
      className={`p-6 rounded-2xl shadow-xl border relative overflow-hidden flex flex-col text-white ${bgClass}`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4 z-10 relative">
        <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border backdrop-blur-md transition-all duration-500 ${isStarted ? 'bg-white text-emerald-600 border-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/10 border-white/10 text-white'}`}>
                {isStarted ? (
                    <span className="relative flex h-2.5 w-2.5 items-center justify-center mr-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                ) : (
                    <Calendar size={10} />
                )}
                <span>{t(statusLabelKey)}</span>
            </div>

            {hasLessons && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-[10px] font-bold shadow-sm text-white">
                    <Clock size={10} className="stroke-[3px]" />
                    <span>{durationLabel}</span>
                </div>
            )}

            {lesson?.bookedBy === 'teacher' && (
                <div className="flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-100 px-2 py-1.5 rounded-full border border-amber-500/30 backdrop-blur-md">
                    <UserCog size={10} />
                    <span>{t('common.admin')}</span>
                </div>
            )}
        </div>

        <div className="flex items-center gap-2">
            <button onClick={onOpenHistory} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10">
                <List size={14} className="text-white" />
            </button>
            {filteredLessons.length > 1 && (
                <div className="flex items-center gap-0.5 bg-black/10 rounded-full p-0.5 backdrop-blur-md border border-white/5">
                    <button onClick={() => paginate(-1)} disabled={currentIndex === 0} className={`p-1.5 rounded-full transition-colors ${currentIndex === 0 ? 'opacity-30' : 'hover:bg-white/10'}`}><ChevronLeft size={14} /></button>
                    <button onClick={() => paginate(1)} disabled={currentIndex === filteredLessons.length - 1} className={`p-1.5 rounded-full transition-colors ${currentIndex === filteredLessons.length - 1 ? 'opacity-30' : 'hover:bg-white/10'}`}><ChevronRight size={14} /></button>
                </div>
            )}
        </div>
      </div>

      <div className="relative flex-1">
        <AnimatePresence initial={false} custom={direction} mode="wait">
            {hasLessons ? (
                <motion.div
                    key={lesson.id}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="w-full flex flex-col gap-4"
                >
                    <div className="mt-1">
                        <div className="flex items-baseline flex-wrap gap-x-3 gap-y-2">
                            <div className="text-5xl font-bold tracking-tighter text-white leading-none">
                                {lesson.time}
                            </div>
                            <div className="text-xl font-medium opacity-90 tracking-tight whitespace-nowrap">
                                {new Date(lesson.date).toLocaleDateString(i18n.language === 'zh' ? 'zh-HK' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10 flex items-end justify-between gap-4">
                        <div className="flex-1 min-w-0 pb-1">
                            <div className="text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1.5">
                                {t('next_lesson.pickup')}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MapPin size={14} className="opacity-80 shrink-0" />
                                <MarqueeText text={t(getLessonLocationLabel(lesson.location)) || t('locations.kowloon_tong')} />
                            </div>
                        </div>
                        
                        <div className="shrink-0">
                            {isStarted ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 text-white text-[10px] font-bold backdrop-blur-md cursor-not-allowed border border-white/10">
                                    <AlertCircle size={12} />
                                    <span>{t('next_lesson.in_progress')}</span>
                                </div>
                            ) : (
                                <button onClick={() => onCancelLesson(lesson.id)} className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white text-white hover:text-red-600 border border-white/10 transition-all active:scale-95 backdrop-blur-md">
                                    <span className="text-xs font-bold">{t('common.cancel')}</span>
                                    <XCircle size={14} className="opacity-70 group-hover:opacity-100" />
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center opacity-40 text-sm gap-2 min-h-[160px]">
                    <Calendar size={40} strokeWidth={1} />
                    <span>{t('next_lesson.no_lessons')}</span>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
import { Clock, MapPin, CheckCircle, XCircle, History as HistoryIcon, ArrowRight } from 'lucide-react'; // [FIX] Removed Calendar
import { Modal } from './Modal'; 

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lessons: any[];
  isDark: boolean;
  onCancelLesson: (id: string) => void; 
}

export function HistoryModal({ isOpen, onClose, lessons, isDark, onCancelLesson }: Props) {
  const itemClass = isDark ? 'bg-midnight border-gray-800' : 'bg-gray-50 border-gray-200';
  const mutedText = isDark ? 'text-gray-500' : 'text-gray-400';

  // --- 1. SPLIT & SORT DATA ---
  const now = new Date();

  // Upcoming: Future + Not Cancelled
  const upcoming = lessons.filter(l => {
      const d = new Date(l.date + 'T' + l.time);
      return d >= now && l.status !== 'Cancelled';
  }).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)); 

  // History: Past OR Cancelled
  const past = lessons.filter(l => {
      const d = new Date(l.date + 'T' + l.time);
      return d < now || l.status === 'Cancelled';
  }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  // Helper to render a single lesson card
  const renderLesson = (lesson: any, isPast: boolean) => {
      const status = lesson.status || 'Booked';
      const isCompleted = status === 'Completed';
      const isCancelled = status === 'Cancelled';

      return (
        <div 
            key={lesson.id} 
            className={`p-4 rounded-xl border flex items-center justify-between transition-all ${itemClass} ${isPast ? 'opacity-60 grayscale-[0.3]' : 'hover:border-primary/50'}`}
        >
            {/* LEFT: INFO */}
            <div className="flex items-center gap-4">
                <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg font-bold ${isPast ? (isDark ? 'bg-white/5' : 'bg-black/5') : 'bg-primary/10 text-primary'}`}>
                    <span className="text-sm">{new Date(lesson.date).getDate()}</span>
                    <span className="text-[9px] uppercase opacity-60">{new Date(lesson.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                </div>
                <div>
                    <div className={`flex items-center gap-2 font-bold ${isPast ? mutedText : ''}`}>
                        <Clock size={14} className={isPast ? '' : 'text-primary'} />
                        {lesson.time}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs opacity-50 mt-0.5">
                        <MapPin size={12} />
                        {lesson.location || 'Kowloon'}
                    </div>
                </div>
            </div>

            {/* RIGHT: ACTION OR STATUS */}
            {!isPast ? (
                <button 
                    onClick={() => {
                        onCancelLesson(lesson.id);
                        onClose(); 
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold hover:bg-red-500 hover:text-white transition-all active:scale-95"
                >
                    <XCircle size={14} />
                    Cancel
                </button>
            ) : (
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5
                    ${isCompleted ? 'bg-green-500/10 text-green-500' : 
                      isCancelled ? 'bg-red-500/10 text-red-500' : 
                      'bg-gray-500/10 text-gray-500'}`}
                >
                    {isCompleted && <CheckCircle size={12} />}
                    {isCancelled && <XCircle size={12} />}
                    {(!isCompleted && !isCancelled) && <CheckCircle size={12} />}
                    
                    {isCancelled ? 'Cancelled' : (isCompleted ? 'Completed' : 'Ended')}
                </div>
            )}
        </div>
      );
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="All Lessons"
    >
      <div className="flex flex-col h-full max-h-[70vh]">
        
        {/* Header Summary */}
        <div className="flex items-center gap-3 mb-6 px-1 shrink-0">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <HistoryIcon size={20} />
            </div>
            <div>
                <h3 className="font-bold text-sm">Lesson Records</h3>
                <p className="text-xs opacity-50">{upcoming.length} Upcoming · {past.length} Past</p>
            </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
            
            {/* 1. UPCOMING SECTION */}
            {upcoming.length > 0 && (
                <div className="space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1 flex items-center gap-2">
                        <ArrowRight size={10} /> Upcoming
                    </div>
                    {upcoming.map(l => renderLesson(l, false))}
                </div>
            )}

            {/* 2. HISTORY SECTION */}
            {past.length > 0 && (
                <div className="space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1 flex items-center gap-2">
                        <HistoryIcon size={10} /> History
                    </div>
                    {past.map(l => renderLesson(l, true))}
                </div>
            )}

            {/* Empty State */}
            {upcoming.length === 0 && past.length === 0 && (
                <div className="text-center py-10 opacity-50 flex flex-col items-center gap-2">
                    <HistoryIcon size={32} className="opacity-20" />
                    <span>No lessons found.</span>
                </div>
            )}
        </div>
      </div>
    </Modal>
  );
}
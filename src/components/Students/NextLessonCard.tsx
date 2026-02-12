import { Calendar, Clock, MapPin, XCircle } from 'lucide-react';

interface Props {
  nextLesson: any;
  isDark: boolean;
  onCancelLesson: (id: string) => void;
}

export function NextLessonCard({ nextLesson, isDark, onCancelLesson }: Props) {
  const cardColor = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';

  return (
    <div className={`p-5 rounded-2xl border shadow-sm ${cardColor}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center relative overflow-hidden text-primary">
          <div className="absolute inset-0 bg-primary opacity-15"></div>
          <Calendar size={18} className="relative z-10" />
        </div>
        <h3 className="font-bold text-lg">Next Lesson</h3>
      </div>

      {nextLesson ? (
        <div className={`p-4 rounded-xl border-l-4 border-l-primary ${isDark ? 'bg-midnight' : 'bg-gray-50'}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="font-black text-xl">
                {new Date(nextLesson.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              <div className="flex items-center gap-2 mt-1 text-primary font-bold">
                <Clock size={16} />
                <span>{nextLesson.time}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-800/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm opacity-70">
              <MapPin size={14} />
              <span>{nextLesson.location || 'Kowloon'}</span>
            </div>

            <button
              onClick={() => onCancelLesson(nextLesson.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold hover:bg-red-500 hover:text-white transition-all active:scale-95"
            >
              <XCircle size={14} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 opacity-50 text-sm">No upcoming lessons scheduled.</div>
      )}
    </div>
  );
}
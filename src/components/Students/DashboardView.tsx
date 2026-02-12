import { CreditCard, History, Plus } from 'lucide-react';

// --- COMPONENT IMPORTS ---
import { BalanceCard } from './BalanceCard';
import { NextLessonCard } from './NextLessonCard';
import { InstructorCard } from './InstructorCard';
import { ProgressCard } from './ProgressCard';

interface Props {
  activeProfile: any;
  instructor: any;
  nextLesson: any;
  lessons: any[];
  theme: 'dark' | 'light';
  setCurrentView: (view: any) => void;
  onCancelLesson: (id: string) => void;
}

export function DashboardView({ activeProfile, instructor, nextLesson, lessons, theme, setCurrentView, onCancelLesson }: Props) {
  const isDark = theme === 'dark';
  const cardColor = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      
      {/* LEFT COLUMN: PRIMARY INFORMATION */}
      <div className="md:col-span-7 space-y-6">
        
        {/* 1. BALANCE CARD */}
        <BalanceCard activeProfile={activeProfile} />

        {/* 2. NEXT LESSON CARD */}
        <NextLessonCard 
            nextLesson={nextLesson} 
            isDark={isDark} 
            onCancelLesson={onCancelLesson} 
        />

        {/* 3. INSTRUCTOR INFO CARD */}
        <InstructorCard 
            instructor={instructor} 
            isDark={isDark} 
        />

        {/* 4. HISTORY (List) */}
        <div>
            <div className="flex items-center gap-2 mb-3 px-1 opacity-70">
                <History size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Recent History</span>
            </div>
            <div className="space-y-3">
                {lessons.length > 0 ? lessons.slice(0, 3).map(lesson => (
                    <div key={lesson.id} className={`p-4 rounded-xl border flex items-center justify-between shadow-sm ${cardColor}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold text-xs ${isDark ? 'bg-midnight text-textGrey' : 'bg-gray-100 text-gray-500'}`}>
                                <span>{new Date(lesson.date).getDate()}</span>
                                <span className="text-[10px] uppercase">{new Date(lesson.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                            </div>
                            <div>
                                <div className="font-bold text-sm">{lesson.time}</div>
                                <div className="text-xs opacity-60">{lesson.location || 'Kowloon'}</div>
                            </div>
                        </div>
                        <div className={`px-2 py-1 rounded min-w-[80px] text-center text-[10px] font-bold uppercase ${lesson.status === 'Completed' ? 'bg-green-500/10 text-green-500' : lesson.status === 'Cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                            {lesson.status || 'Booked'}
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-4 opacity-50 text-xs">No lesson history found.</div>
                )}
            </div>
        </div>
      </div>

      {/* RIGHT COLUMN: ACTIONS & LEARNING PROGRESS */}
      <div className="md:col-span-5 space-y-6">
        
        {/* NAVIGATION CARDS */}
        <div className="flex flex-col gap-4">
          <button 
              onClick={() => setCurrentView('schedule')} 
              className={`p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-95 text-left ${cardColor} hover:border-primary/50`}
          >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Plus size={24} />
              </div>
              <div>
                  <p className="text-sm font-bold">Schedule</p>
                  <p className="text-[10px] opacity-60">Book new slots</p>
              </div>
          </button>

          <button 
              onClick={() => setCurrentView('packages')} 
              className={`p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-95 text-left ${cardColor} hover:border-primary/50`}
          >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <CreditCard size={22} />
              </div>
              <div>
                  <p className="text-sm font-bold">Packages</p>
                  <p className="text-[10px] opacity-60">Buy credits</p>
              </div>
          </button>
        </div>

        {/* 5. LEARNING PROGRESS CARD */}
        <ProgressCard 
            activeProfile={activeProfile} 
            isDark={isDark} 
        />
        
      </div>
    </div>
  );
}
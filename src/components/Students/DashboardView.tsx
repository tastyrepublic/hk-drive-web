import { 
  Calendar, CreditCard, User, MapPin, Clock, Phone, Car, History, Sparkles, Plus 
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  activeProfile: any;
  instructor: any;
  nextLesson: any;
  lessons: any[];
  theme: 'dark' | 'light';
  setCurrentView: (view: any) => void;
}

export function DashboardView({ activeProfile, instructor, nextLesson, lessons, theme, setCurrentView }: Props) {
  const isDark = theme === 'dark';
  const cardColor = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      
      {/* LEFT COLUMN: PRIMARY INFORMATION */}
      <div className="md:col-span-7 space-y-6">
        {/* 1. BALANCE CARD */}
<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg p-6">
  {/* Background Icon Decoration */}
  <div className="absolute top-0 right-0 p-4 opacity-20">
    <CreditCard size={100} className="!text-white" />
  </div>

  <div className="relative z-10">
    <div className="text-sm font-medium opacity-90 mb-1 uppercase tracking-wider !text-white">
      Lesson Balance
    </div>
    <div className="text-6xl font-black tracking-tighter !text-white">
      {activeProfile?.balance ?? 0}
    </div>

    {/* PROFILE TAGS CONTAINER */}
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {/* VEHICLE TAG */}
      <div className="flex items-center gap-2 text-xs font-bold bg-black/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 uppercase">
        <Car size={14} className="!text-white" /> 
        <span className="!text-white">{activeProfile?.vehicle || 'General'}</span>
      </div>

      {/* EXAM ROUTE TAG (Moved here) */}
      {activeProfile?.examRoute && activeProfile.examRoute !== 'Not Assigned' && (
        <div className="flex items-center gap-2 text-xs font-bold bg-white/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 uppercase">
          <MapPin size={14} className="!text-white" /> 
          <span className="!text-white">{activeProfile.examRoute}</span>
        </div>
      )}
    </div>
  </div>
</div>

        {/* 2. NEXT LESSON */}
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
                            <div className="font-black text-xl">{new Date(nextLesson.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                            <div className="flex items-center gap-2 mt-1 text-primary font-bold">
                                <Clock size={16} />
                                <span>{nextLesson.time}</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-800/10 flex items-center gap-2 text-sm opacity-70">
                        <MapPin size={14} />
                        <span>{nextLesson.location || 'Kowloon'}</span>
                    </div>
                </div>
            ) : (
                <div className="text-center py-6 opacity-50 text-sm">No upcoming lessons scheduled.</div>
            )}
        </div>

        {/* 4. INSTRUCTOR INFO */}
        <div className={`p-5 rounded-2xl border shadow-sm ${cardColor}`}>
          <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center relative overflow-hidden text-primary">
                  <div className="absolute inset-0 bg-primary opacity-15"></div>
                  <User size={18} className="relative z-10" />
              </div>
              <h3 className="font-bold text-lg">Instructor Info</h3>
          </div>
          <div className="flex items-center justify-between">
              <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-bold text-lg leading-tight">
                          {instructor?.name || 'Instructor'}
                      </span>
                      {instructor?.phone && (
                          <span className="text-xs font-medium opacity-40 border-l border-gray-500/30 pl-2">
                              {instructor.phone}
                          </span>
                      )}
                  </div>
                  <div className="text-[11px] uppercase tracking-widest font-bold opacity-50 mt-1">
                      Driving Instructor
                  </div>
              </div>
              {instructor?.phone && (
                  <a 
                    href={`https://wa.me/${instructor.phone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-[#25D366] rounded-full transition-transform active:scale-95 flex items-center justify-center"
                  >
                      <Phone size={20} className="!text-white !fill-white" />
                  </a>
              )}
          </div>
        </div>

        {/* 5. HISTORY */}
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
        
        {/* NAVIGATION CARDS (Stacked vertically in sidebar) */}
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

        {/* 3. LEARNING PROGRESS */}
        <div className={`p-5 rounded-2xl border shadow-sm ${cardColor}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center relative overflow-hidden text-primary">
              <div className="absolute inset-0 bg-primary opacity-15"></div>
              <Sparkles size={18} className="relative z-10" />
            </div>
            <h3 className="font-bold text-lg">Learning Progress</h3>
          </div>
          
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border-l-4 border-l-primary ${isDark ? 'bg-midnight' : 'bg-gray-50'}`}>
              <p className={`text-sm leading-relaxed font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                "{activeProfile?.teacherNote || `Focus on mirror-signal-manoeuvre during lane changes next lesson. Great control on roundabouts today!`}"
              </p>
            </div>

            <div className="px-1 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="opacity-50">Syllabus Completion</span>
                <span className="text-primary">{activeProfile?.progress ?? 65}%</span>
              </div>
              <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${activeProfile?.progress ?? 65}%` }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
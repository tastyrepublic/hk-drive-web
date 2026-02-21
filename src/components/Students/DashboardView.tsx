import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion'; 
import { History } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router'; 

import { LIST_CONTAINER, CARD_VARIANTS } from '../../constants/animations'; 
import { BalanceCard } from './BalanceCard';
import { NextLessonCard } from './NextLessonCard';
import { InstructorCard } from './InstructorCard';
import { getLessonLocationLabel } from '../../constants/list';

interface Props {
  activeProfile: any;
  instructor: any;
  lessons: any[];
  upcomingLessons: any[]; 
  theme: 'dark' | 'light';
  onCancelLesson: (id: string) => void;
  // 1. ADDED: The new prop definition
  onOpenChat: () => void; 
}

// 2. ADDED: Destructure onOpenChat from Props
export function DashboardView({ activeProfile, instructor, lessons, upcomingLessons, theme, onCancelLesson, onOpenChat }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate(); 
  const location = useLocation(); 
  
  const isDark = theme === 'dark';
  const cardColor = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
            variants={LIST_CONTAINER}
            initial="initial"
            animate="animate"
            className="space-y-6"
        >
            <BalanceCard 
              activeProfile={activeProfile} 
              onBuyPackage={() => navigate('/app/packages')} 
              variants={CARD_VARIANTS} 
            />

            <NextLessonCard 
                upcomingLessons={upcomingLessons} 
                isDark={isDark} 
                onCancelLesson={onCancelLesson} 
                onOpenHistory={() => navigate('/app/history', { state: { backgroundLocation: location } })}
                onBookLesson={() => navigate('/app/schedule')} 
                variants={CARD_VARIANTS}
            />

            <InstructorCard 
                instructor={instructor} 
                variants={CARD_VARIANTS}
                onOpenChat={onOpenChat} // 3. ADDED: Pass it down to the card!
            />

            {/* RECENT ACTIVITY */}
            <motion.div variants={CARD_VARIANTS}>
                <div className="flex items-center gap-2 mb-3 px-1 opacity-70">
                    <History size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Recent Activity</span>
                </div>

                <div className="space-y-3">
                    {lessons.length > 0 ? lessons.slice(-3).reverse().map(lesson => (
                        <div key={lesson.id} className={`p-4 rounded-xl border flex items-center justify-between shadow-sm ${cardColor}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold text-xs ${isDark ? 'bg-midnight text-textGrey' : 'bg-gray-100 text-gray-500'}`}>
                                    <span>{new Date(lesson.date).getDate()}</span>
                                    <span className="text-[10px] uppercase">{new Date(lesson.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                </div>
                                <div>
                                    <div className="font-bold text-sm">{lesson.time}</div>
                                    <div className="text-xs opacity-60">
                                      {t(getLessonLocationLabel(lesson.location)) || t('locations.kowloon_tong')}</div>
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
            </motion.div>
        </motion.div>
    </div>
  );
}
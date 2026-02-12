import { useState, useRef, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { 
  Loader2, ArrowLeft, ChevronDown, 
  Menu, LogOut, Sun, Moon, User, X, Car
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useStudentData } from '../../hooks/useStudentData';

// Sub-Views
import { DashboardView } from './DashboardView';
import { ProfileView } from './ProfileView';
import { ScheduleView } from './ScheduleView';
import { PackagesView } from './PackagesView';

// Components
import { ConfirmModal } from '../Modals/ConfirmModal'; // [NEW IMPORT]

import { getVehicleLabel } from '../../constants/list';

interface Props {
  userEmail: string | null;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

type View = 'dashboard' | 'profile' | 'schedule' | 'packages'; 

export function StudentApp({ userEmail, theme, toggleTheme }: Props) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  
  const { 
    loading, 
    actionLoading, // [NEW]
    userProfile, 
    profiles, 
    activeProfile, 
    setActiveProfile, 
    instructors, 
    lessons, 
    nextLesson, 
    cancelLesson 
  } = useStudentData();

  // --- CONFIRM MODAL STATE ---
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; msg: string; lessonId?: string } | null>(null);

  // Menu States
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null); 
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (isProfileMenuOpen && profileMenuRef.current && !profileMenuRef.current.contains(target) && profileButtonRef.current && !profileButtonRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  // --- HANDLERS ---
  const handleCancelClick = (lessonId: string) => {
      setConfirmDialog({
          isOpen: true,
          title: "Cancel Lesson",
          msg: "Are you sure you want to cancel this lesson? 1 Credit will be refunded to your balance.",
          lessonId
      });
  };

  const executeCancel = async () => {
      if (confirmDialog?.lessonId) {
          await cancelLesson(confirmDialog.lessonId, () => {
              setConfirmDialog(null); // Close modal on success
          });
      }
  };

  const pageVariants = {
    initial: { opacity: 0, scale: 0.98, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 1.02, y: -10 },
  };

  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-midnight' : 'bg-gray-100';
  const cardColor = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';

  if (loading) return (
    <div data-portal="student" className={`h-screen flex items-center justify-center ${bgColor}`}>
      <Loader2 className="animate-spin text-primary" size={48} />
    </div>
  );

  return (
    <div data-portal="student" className={`min-h-screen pb-20 ${bgColor} ${textColor} font-sans transition-colors duration-300 overflow-x-hidden`}>
        
        {/* CONFIRM MODAL */}
        <ConfirmModal 
            isOpen={!!confirmDialog?.isOpen}
            title={confirmDialog?.title || ''}
            msg={confirmDialog?.msg || ''}
            isLoading={actionLoading}
            onConfirm={executeCancel}
            onCancel={() => setConfirmDialog(null)}
        />

        {/* HEADER */}
        <header className={`sticky top-0 z-[60] border-b shadow-sm w-full ${isDark ? 'bg-header border-gray-800' : 'bg-white/90 border-gray-200 backdrop-blur-md'}`}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                
                {/* LEFT: TITLE & PROFILE SWITCHER */}
                <div className="flex items-center gap-3">
                    <AnimatePresence mode="wait">
                      {currentView !== 'dashboard' ? (
                          <motion.button 
                            key="back"
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                            onClick={() => setCurrentView('dashboard')} 
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                          >
                              <ArrowLeft size={20} />
                          </motion.button>
                      ) : (
                          <motion.div 
                            key="name"
                            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                            className="relative"
                          >
                              <button 
                                  ref={profileButtonRef}
                                  onClick={() => profiles.length > 1 && setIsProfileMenuOpen(!isProfileMenuOpen)}
                                  className={`flex items-center gap-2 font-bold text-lg ${profiles.length > 1 ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                              >
                                  <span>{userProfile?.name || activeProfile?.name || 'Student'}</span>
                                  {profiles.length > 1 && <ChevronDown size={16} className={`transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />}
                              </button>
                              <p className="text-[10px] uppercase tracking-widest text-primary font-black">Student Portal</p>
                              
                              <AnimatePresence>
                                  {isProfileMenuOpen && (
                                      <motion.div 
                                          ref={profileMenuRef} 
                                          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                          className={`absolute top-full left-0 mt-2 w-72 rounded-xl border shadow-2xl overflow-hidden z-20 ${cardColor}`}
                                      >
                                          <div className={`p-3 text-[10px] font-black uppercase tracking-widest border-b ${isDark ? 'border-gray-800 bg-midnight/50 text-textGrey' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                                              Switch Profile
                                          </div>
                                          <div className="max-h-64 overflow-y-auto">
                                              {profiles.map(p => {
                                                  const inst = instructors[p.teacherId];
                                                  const isActive = activeProfile.id === p.id;
                                                  return (
                                                      <button 
                                                        key={p.id} 
                                                        onClick={() => { setActiveProfile(p); setIsProfileMenuOpen(false); }} 
                                                        className={`w-full text-left px-4 py-3 flex items-center justify-between border-b last:border-0 transition-all duration-200 group relative ${isDark ? 'border-gray-800/50' : 'border-gray-100/50'} ${isActive ? (isDark ? 'bg-primary/20 shadow-inner' : 'bg-primary/10') : (isDark ? 'hover:bg-white/5' : 'hover:bg-black/5')}`}
                                                      >
                                                          {isActive && <motion.div layoutId="activeAccent" className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                                                          <div className={`space-y-1 transition-transform duration-200 ${isActive ? 'translate-x-1' : ''}`}>
                                                              <div className={`text-sm font-black tracking-tight ${isActive ? 'text-primary' : textColor}`}>{inst?.name || 'Instructor'}</div>
                                                              <div className="text-[10px] uppercase tracking-wider font-bold flex flex-col gap-0.5">
                                                                  <span className={`flex items-center gap-1 ${isActive ? 'text-primary/90' : 'opacity-50'}`}><Car size={10} /> {getVehicleLabel(p.vehicle) || 'Standard'}</span>
                                                                  <span className={`${isActive ? 'text-primary font-black scale-105 origin-left' : 'opacity-40'} transition-transform`}>{p.balance} Credits Available</span>
                                                              </div>
                                                          </div>
                                                          {isActive && <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)] mr-1" />}
                                                      </button>
                                                  );
                                              })}
                                          </div>
                                      </motion.div>
                                  )}
                              </AnimatePresence>
                          </motion.div>
                      )}
                    </AnimatePresence>
                </div>

                {/* RIGHT: ACTIONS */}
                <div className="flex items-center justify-end gap-1 sm:gap-2 w-auto md:w-auto flex-shrink-0 relative">
                    <div className={`flex items-center gap-2 transition-all duration-500 ease-in-out ${"absolute opacity-0 scale-90 pointer-events-none md:static md:opacity-100 md:scale-100 md:pointer-events-auto"}`}>
                        <button onClick={() => setCurrentView('profile')} className={`p-1.5 sm:p-2 rounded-lg transition-colors ${currentView === 'profile' ? 'text-primary bg-primary/10' : 'text-textGrey hover:text-white hover:bg-white/10'}`}><User size={18} /></button>
                        <button onClick={toggleTheme} className="p-1.5 sm:p-2 rounded-lg text-textGrey hover:text-white hover:bg-white/10 transition-colors">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
                        <button onClick={() => signOut(auth)} className="p-1.5 sm:p-2 rounded-lg text-textGrey hover:text-statusRed hover:bg-statusRed/10 transition-colors"><LogOut size={18} /></button>
                    </div>
                    <div className={`transition-all duration-500 ease-in-out ${"md:absolute md:opacity-0 md:scale-90 md:pointer-events-none opacity-100 scale-100"}`}>
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-lg text-textGrey hover:bg-white/10 transition-colors">{isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
                    </div>
                    {isMobileMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMobileMenuOpen(false)} />
                            <div className={`absolute top-14 right-0 w-56 rounded-xl border shadow-2xl p-2 flex flex-col gap-1 z-50 md:hidden animate-in zoom-in-95 duration-200 origin-top-right ${cardColor}`}>
                                <button onClick={() => { setCurrentView('profile'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${currentView === 'profile' ? 'text-primary bg-primary/10' : (isDark ? 'text-textGrey hover:bg-white/10' : 'text-gray-600 hover:bg-black/5')}`}><User size={16} /> <span>My Profile</span></button>
                                <button onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${isDark ? 'text-textGrey hover:bg-white/10' : 'text-gray-600 hover:bg-black/5'}`}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span></button>
                                <div className={`h-[1px] my-1 mx-2 ${isDark ? 'bg-gray-800/50' : 'bg-gray-200'}`} />
                                <button onClick={() => signOut(auth)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold text-statusRed hover:bg-statusRed/10 transition-colors"><LogOut size={16} /> <span>Log Out</span></button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 md:p-6 overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentView}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    className="space-y-6"
                >
                    {currentView === 'dashboard' && (
                        <DashboardView 
                          activeProfile={activeProfile} 
                          instructor={instructors[activeProfile?.teacherId]} 
                          nextLesson={nextLesson} 
                          lessons={lessons} 
                          theme={theme}
                          setCurrentView={setCurrentView}
                          onCancelLesson={handleCancelClick} // [UPDATED] Pass the modal trigger
                        />
                    )}

                    {currentView === 'profile' && (
                        <ProfileView 
                          userProfile={userProfile} 
                          userEmail={userEmail} 
                          profiles={profiles} 
                          instructors={instructors} 
                          theme={theme} 
                        />
                    )}

                    {currentView === 'schedule' && (
                        <ScheduleView 
                          instructorName={instructors[activeProfile?.teacherId]?.name || 'Instructor'} 
                          studentProfile={activeProfile} 
                          isDark={isDark} 
                        />
                    )}

                    {currentView === 'packages' && (
                        <PackagesView 
                          balance={activeProfile?.balance || 0} 
                          cardColor={cardColor} 
                        />
                    )}

                </motion.div>
            </AnimatePresence>
        </main>
    </div>
  );
}
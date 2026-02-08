import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  Car, Loader2, Settings, ArrowLeft, ChevronDown, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// IMPORT SUB-VIEWS
import { DashboardView } from './DashboardView';
import { ProfileView } from './ProfileView';
import { ScheduleView } from './ScheduleView';
import { PackagesView } from './PackagesView';

interface Props {
  userEmail: string | null;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

type View = 'dashboard' | 'profile' | 'schedule' | 'packages';

export function StudentApp({ userEmail, theme, toggleTheme }: Props) {
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  
  // Data State
  const [userProfile, setUserProfile] = useState<any>(null); 
  const [profiles, setProfiles] = useState<any[]>([]); 
  const [activeProfile, setActiveProfile] = useState<any>(null); 
  const [instructors, setInstructors] = useState<Record<string, any>>({}); 
  const [lessons, setLessons] = useState<any[]>([]); 

  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const menuRef = useRef<HTMLDivElement>(null); 
  const buttonRef = useRef<HTMLButtonElement>(null);

  // HYBRID ANIMATION: Matches the premium feel of high-end mobile apps
  const pageVariants = {
    initial: { opacity: 0, scale: 0.98, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 1.02, y: -10 },
  };

  // 1. Initial Load Logic
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    getDoc(doc(db, "users", uid)).then(snap => {
        if (snap.exists()) setUserProfile(snap.data());
    });

    const q = query(collection(db, "students"), where("uid", "==", uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedProfiles = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProfiles(loadedProfiles);
      if (loadedProfiles.length > 0 && !activeProfile) {
        setActiveProfile(loadedProfiles[0]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch Instructor details
  useEffect(() => {
    if (profiles.length === 0) return;
    const teacherIds = [...new Set(profiles.map(p => p.teacherId))].filter(Boolean);
    const unsubs = teacherIds.map(id => 
      onSnapshot(doc(db, "instructors", id), (snap) => {
        if (snap.exists()) {
          setInstructors(prev => ({ ...prev, [id]: { id: snap.id, ...snap.data() } }));
        }
      })
    );
    return () => unsubs.forEach(fn => fn());
  }, [profiles]);

  // 3. Fetch Lessons
  useEffect(() => {
    if (!activeProfile) return;
    const q = query(collection(db, "slots"), where("studentId", "==", activeProfile.id));
    const unsub = onSnapshot(q, (snap) => {
        const loadedLessons = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        loadedLessons.sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time));
        setLessons(loadedLessons);
    });
    return () => unsub();
  }, [activeProfile]);

  // 4. Handle Outside Clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(target) && buttonRef.current && !buttonRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  const upcomingLessons = lessons.filter(l => {
    const lessonDate = new Date(l.date + 'T' + l.time);
    return lessonDate >= new Date() || l.status === 'Booked';
  }); 
  const nextLesson = upcomingLessons.length > 0 ? upcomingLessons[0] : null;

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
        <header className={`sticky top-0 z-50 border-b backdrop-blur-md ${isDark ? 'bg-header/90 border-gray-800' : 'bg-white/90 border-gray-200'}`}>
            {/* UPDATED: Changed max-w-md to max-w-5xl for desktop header width */}
            <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
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
                                  ref={buttonRef}
                                  onClick={() => profiles.length > 1 && setIsMenuOpen(!isMenuOpen)}
                                  className={`flex items-center gap-2 font-bold text-lg ${profiles.length > 1 ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                              >
                                  <span>{userProfile?.name || activeProfile?.name || 'Student'}</span>
                                  {profiles.length > 1 && <ChevronDown size={16} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />}
                              </button>
                              <p className="text-[10px] uppercase tracking-widest text-primary font-black">Student Portal</p>
                              
                              <AnimatePresence>
                                  {isMenuOpen && (
                                      <motion.div 
                                          ref={menuRef} 
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
                                                        onClick={() => setActiveProfile(p)} 
                                                        className={`w-full text-left px-4 py-3 flex items-center justify-between border-b last:border-0 transition-all duration-200 group relative ${isDark ? 'border-gray-800/50' : 'border-gray-100/50'} ${isActive ? (isDark ? 'bg-primary/20 shadow-inner' : 'bg-primary/10') : (isDark ? 'hover:bg-white/5' : 'hover:bg-black/5')}`}
                                                      >
                                                          {isActive && <motion.div layoutId="activeAccent" className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                                                          <div className={`space-y-1 transition-transform duration-200 ${isActive ? 'translate-x-1' : ''}`}>
                                                              <div className={`text-sm font-black tracking-tight ${isActive ? 'text-primary' : textColor}`}>{inst?.name || 'Instructor'}</div>
                                                              <div className="text-[10px] uppercase tracking-wider font-bold flex flex-col gap-0.5">
                                                                  <span className={`flex items-center gap-1 ${isActive ? 'text-primary/90' : 'opacity-50'}`}><Car size={10} /> {p.vehicle || 'Standard'}</span>
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
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentView(prev => prev === 'profile' ? 'dashboard' : 'profile')} className={`p-2 rounded-lg transition-colors ${currentView === 'profile' ? 'bg-primary/10 text-primary' : (isDark ? 'hover:bg-white/10' : 'hover:bg-black/5')}`}>
                        {currentView === 'profile' ? <Calendar size={20} /> : <Settings size={20} />}
                    </button>
                </div>
            </div>
        </header>

        {/* UPDATED: Changed max-w-md to max-w-5xl to allow side-by-side columns on desktop */}
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
                        />
                    )}

                    {currentView === 'profile' && (
                        <ProfileView 
                          userProfile={userProfile} 
                          userEmail={userEmail} 
                          profiles={profiles} 
                          instructors={instructors} 
                          theme={theme} 
                          toggleTheme={toggleTheme} 
                          onLogout={() => signOut(auth)} 
                        />
                    )}

                    {currentView === 'schedule' && (
                        <ScheduleView 
                          instructorName={instructors[activeProfile?.teacherId]?.name || 'Instructor'} 
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
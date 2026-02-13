import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore'; 
import { Loader2, AlertCircle, Ban, Clock } from 'lucide-react';

// Views
import { AuthView } from '../Auth/AuthView';
import { StudentClaimView } from '../Auth/StudentClaimView'; 
import { StudentApp } from '../Students/StudentApp';
import { TeacherDashboard } from '../Teacher/TeacherDashboard';

interface Props {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

type InviteErrorType = 'expired' | 'canceled' | 'invalid' | null;

// --- DEBUG LOGGER ---
const DEBUG = true;
const logDebug = (msg: string, data?: any) => {
    if (!DEBUG) return;
    const time = new Date().toISOString().split('T')[1].slice(0, -1);
    if (data) console.log(`%c[ROUTER ${time}] ${msg}`, 'color: #00ff9d; font-weight: bold;', data);
    else console.log(`%c[ROUTER ${time}] ${msg}`, 'color: #00ff9d; font-weight: bold;');
};

export function RootRouter({ theme, toggleTheme, showToast }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Safety & Mount Tracking
  const justClaimedRef = useRef(false);
  const isMountedRef = useRef(true);
  
  // Ref to track the Firestore listener
  const profileUnsubRef = useRef<(() => void) | null>(null);

  // Invite States
  const [inviteData, setInviteData] = useState<any>(null);
  const [inviteLoading, setInviteLoading] = useState(
    !!new URLSearchParams(window.location.search).get('invite')
  );
  const [inviteError, setInviteError] = useState<InviteErrorType>(null);

  const params = new URLSearchParams(window.location.search);
  const inviteCode = params.get('invite');
  const urlToken = params.get('token'); 

  // 1. ATOMIC AUTH LISTENER (Robust Version)
  useEffect(() => {
    isMountedRef.current = true;
    logDebug("Initializing Auth Listener...");

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      // 1. CLEANUP PREVIOUS LISTENER FIRST
      const previousUnsub = profileUnsubRef.current;
      if (previousUnsub) {
          logDebug("Cleaning up previous profile listener...");
          previousUnsub();
          profileUnsubRef.current = null;
      }

      if (u) {
        logDebug("User Authenticated:", { uid: u.uid });
        
        if (!isMountedRef.current) return;
        
        setUser(u);
        
        // A. Check Teacher
        try {
            const teacherDoc = await getDoc(doc(db, "instructors", u.uid));
            
            if (!isMountedRef.current) return;
            if (auth.currentUser?.uid !== u.uid) return;

            if (teacherDoc.exists()) {
                logDebug("User is INSTRUCTOR");
                setUserRole('teacher');
                setLoading(false);
                return;
            }
        } catch (e) {
            console.error("Teacher check failed", e);
        }

        // B. Check Student (Realtime)
        logDebug("Attaching Student Profile Listener...");
        
        profileUnsubRef.current = onSnapshot(doc(db, "users", u.uid), async (docSnap) => {
            if (!isMountedRef.current) return;

            // 1. SUCCESS
            if (docSnap.exists()) {
                logDebug("✅ Student Profile FOUND:", docSnap.data());
                setUserRole('student');
                setLoading(false);
                justClaimedRef.current = false; 
                return;
            }

            // 2. GHOST CHECKS
            logDebug("⚠️ No Profile Document Found. Checking Safety Flags...");

            // Safety 1: Just claimed (local ref)
            if (justClaimedRef.current) {
                logDebug("🛡️ SAFETY: User just claimed (Local). Waiting...");
                return; 
            }

            // Safety 2: Email/Password (Teachers)
            const hasPassword = u.providerData.some(p => p.providerId === 'password');
            if (hasPassword) {
                logDebug("🛡️ SAFETY: Email/Password user.");
                setUserRole('student');
                setLoading(false);
                return;
            }

            // Safety 3: User is on Invite Page
            const isInvitePage = new URLSearchParams(window.location.search).get('invite');
            if (isInvitePage) {
                logDebug("🛡️ SAFETY: Invite Page (User creating account).");
                setUserRole(null); 
                setLoading(false); 
                return;
            }

            // Safety 4: NEW USER GRACE PERIOD (Fixes Cross-Tab Kickout)
            // If account was created < 60 seconds ago, assume profile is syncing across tabs.
            if (u.metadata.creationTime) {
                const created = new Date(u.metadata.creationTime).getTime();
                const now = Date.now();
                if (now - created < 60000) { // 60 seconds grace
                    logDebug("🛡️ SAFETY: Account created < 60s ago. Grace period active.");
                    return; 
                }
            }

            // 3. KICKOUT
            logDebug("❌ FAIL: Ghost User. Signing Out.");
            
            if (auth.currentUser?.uid === u.uid) {
                await signOut(auth);
            }
            setUser(null);
            setUserRole(null);
            setLoading(false);

        }, (err) => {
            logDebug("🔥 Firestore Snapshot Error:", err);
            setLoading(false);
        });

      } else {
        logDebug("User Signed Out / No Session");
        const currentUnsub = profileUnsubRef.current;
        if (currentUnsub) {
            currentUnsub();
            profileUnsubRef.current = null;
        }
        setUser(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
        logDebug("RootRouter Unmounting - Cleaning up all listeners.");
        isMountedRef.current = false;
        unsubAuth();
        
        const currentUnsub = profileUnsubRef.current;
        if (currentUnsub) {
            currentUnsub();
            profileUnsubRef.current = null;
        }
    };
  }, []);

  // 2. INVITE LINK CHECKER
  useEffect(() => {
    if (!inviteCode) return;
    if ((inviteData && inviteData.id === inviteCode) || inviteError) return;

    const checkInvite = async () => {
      if (!isMountedRef.current) return;

      logDebug(`Checking Invite Code: ${inviteCode}`);
      setInviteLoading(true);
      try {
        const studentSnap = await getDoc(doc(db, "students", inviteCode));
        
        if (!isMountedRef.current) return;

        if (studentSnap.exists()) {
          const sData = studentSnap.data();
          
          if (sData.uid) {
               setInviteData({ 
                id: inviteCode, 
                student: sData, 
                teacherName: "Instructor", 
                isClaimed: true 
              });
              setInviteLoading(false);
              return;
          }

          if (sData.inviteExpiresAt) {
              const expires = sData.inviteExpiresAt.toMillis ? sData.inviteExpiresAt.toMillis() : sData.inviteExpiresAt;
              if (Date.now() > expires) { 
                  setInviteError('expired'); 
                  return; 
              }
          }

          const dbToken = sData.inviteToken;
          if (!dbToken || (dbToken && dbToken !== urlToken)) { 
              setInviteError('canceled'); 
              return; 
          }
          
          let tName = "Instructor";
          if (sData.teacherId) {
            try {
              const tSnap = await getDoc(doc(db, "instructors", sData.teacherId));
              if (tSnap.exists()) tName = tSnap.data().name;
            } catch (err) {}
          }
          
          setInviteData({ 
            id: inviteCode, 
            student: sData, 
            teacherName: tName,
            isClaimed: false 
          });
        } else {
          setInviteError('invalid');
        }
      } catch (e: any) {
        setInviteError('invalid');
      } finally {
        if (isMountedRef.current) setInviteLoading(false);
      }
    };
    checkInvite();
  }, [inviteCode, urlToken, inviteData, inviteError]);

  const handleClaimSuccess = () => {
      justClaimedRef.current = true;
      setUserRole('student');
      setInviteData(null); 
      window.history.replaceState({}, '', '/'); 
      showToast("Account Linked Successfully!", "success"); 
  };

  // --- RENDER ---

  if (loading || inviteLoading) {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-midnight space-y-4">
            <Loader2 className="animate-spin text-neutral" size={48} />
            {DEBUG && <p className="text-xs text-textGrey font-mono animate-pulse">Initializing App...</p>}
        </div>
    );
  }

  if (inviteError) {
    const isExpired = inviteError === 'expired';
    const isCanceled = inviteError === 'canceled';
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-midnight">
        <div className="w-full max-w-md p-8 border border-white/10 rounded-[2.5rem] bg-slate text-center space-y-6 shadow-2xl">
          <div className="flex justify-center">
            <div className={`p-4 rounded-full ${isExpired ? 'bg-orange-500/10 text-orange-500' : 'bg-statusRed/10 text-statusRed'} relative`}>
                {isExpired ? <Clock size={48} className="opacity-50" /> : <Ban size={48} className="opacity-50" />}
                <div className="absolute top-0 right-0 -mt-1 -mr-1 bg-slate rounded-full p-1">
                    <AlertCircle size={24} className={isExpired ? 'text-orange-500 fill-slate' : 'text-statusRed fill-slate'} />
                </div>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">
                {isExpired ? 'Link Expired' : (isCanceled ? 'Link Canceled' : 'Invalid Link')}
            </h2>
            <p className="text-textGrey text-sm mt-2 leading-relaxed">
                {isExpired 
                    ? "This invitation has passed its expiration date." 
                    : (isCanceled 
                        ? "This invitation was revoked by the instructor." 
                        : "This invitation link is invalid or does not exist.")}
            </p>
          </div>
          <button onClick={() => window.location.href = '/'} className="w-full p-4 rounded-2xl bg-white/5 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (user && !userRole) {
     if (inviteData) {
        // Invite Page
     } else {
        return <div className="h-screen flex items-center justify-center bg-midnight"><Loader2 className="animate-spin text-neutral" size={48} /></div>;
     }
  }

  if (inviteData) {
    return (
        <StudentClaimView 
            inviteCode={inviteData.id} 
            studentData={inviteData.student} 
            teacherName={inviteData.teacherName} 
            theme={theme} 
            toggleTheme={toggleTheme} 
            isAlreadyClaimed={inviteData.isClaimed} 
            onClaimSuccess={handleClaimSuccess} 
        />
    );
  }

  if (user && userRole) {
    if (userRole === 'student') {
        return (
            <StudentApp 
                userEmail={user.email} 
                theme={theme} 
                toggleTheme={toggleTheme} 
                showToast={showToast} // <--- ADD THIS LINE
            />
        );
    }
    return <TeacherDashboard user={user} theme={theme} toggleTheme={toggleTheme} showToast={showToast} />;
  }

  return <AuthView theme={theme} toggleTheme={toggleTheme} onLoginSuccess={() => showToast("Welcome back!")} />;
}
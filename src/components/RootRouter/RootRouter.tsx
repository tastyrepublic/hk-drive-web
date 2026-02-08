import { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, Link as LinkIcon, AlertCircle, ArrowRight } from 'lucide-react';

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

export function RootRouter({ theme, toggleTheme, showToast }: Props) {
  // --- AUTH STATES ---
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
  const [loading, setLoading] = useState(true);

  // --- INVITE STATES ---
  const [inviteData, setInviteData] = useState<any>(null);
  
  // FIX: Initialize to TRUE if there is a 'invite' param. 
  // This prevents the Dashboard from loading before we check the link.
  const [inviteLoading, setInviteLoading] = useState(
    !!new URLSearchParams(window.location.search).get('invite')
  );
  
  const [inviteError, setInviteError] = useState(false);

  // --- URL PARAMS ---
  const params = new URLSearchParams(window.location.search);
  const inviteCode = params.get('invite');
  const urlToken = params.get('token'); 

  // 1. ATOMIC AUTH LISTENER
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true); 

      if (u) {
        try {
          const teacherDoc = await getDoc(doc(db, "instructors", u.uid));
          if (teacherDoc.exists()) {
            setUserRole('teacher');
          } else {
            setUserRole('student');
          }
          setUser(u);
        } catch (error) {
          console.error("Auth routing error:", error);
          setUser(null);
          setUserRole(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }

      setLoading(false); 
    });

    return unsub;
  }, []);

  // 2. INVITE LINK SECURITY LOGIC
  useEffect(() => {
    if (!inviteCode) return;
    if ((inviteData && inviteData.id === inviteCode) || inviteError) return;

    const checkInvite = async () => {
      setInviteLoading(true);
      try {
        const studentSnap = await getDoc(doc(db, "students", inviteCode));
        
        if (studentSnap.exists()) {
          const sData = studentSnap.data();
          const dbToken = sData.inviteToken;

          if (dbToken && dbToken !== urlToken) { setInviteError(true); return; }
          if (!dbToken && urlToken) { setInviteError(true); return; }
          
          if (sData.inviteExpiresAt) {
              const expires = sData.inviteExpiresAt.toMillis ? sData.inviteExpiresAt.toMillis() : sData.inviteExpiresAt;
              if (Date.now() > expires) { setInviteError(true); return; }
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
            isClaimed: !!sData.uid // This flag triggers the warning
          });
        } else {
          setInviteError(true);
        }
      } catch (e) {
        setInviteError(true);
        showToast("Error verifying link", "error");
      } finally {
        setInviteLoading(false);
      }
    };
    
    checkInvite();
  }, [inviteCode, urlToken, inviteData, inviteError, showToast]);

  const clearInviteParams = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    url.searchParams.delete('token'); 
    window.history.replaceState({}, '', url);
    setInviteError(false);
    setInviteData(null);
  };

  // ---------------- RENDER LOGIC ----------------

  // A. AUTH/INVITE LOADING
  if (loading || inviteLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-midnight">
        <Loader2 className="animate-spin text-neutral" size={48} />
      </div>
    );
  }

  // B. INVITE ERROR DISPLAY
  if (inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-midnight">
        <div className="w-full max-w-md p-8 border border-white/10 rounded-[2.5rem] bg-slate text-center space-y-6 shadow-2xl">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-statusRed/10 text-statusRed">
                <LinkIcon size={48} className="opacity-50" />
                <div className="absolute mt-[-20px] ml-[28px] bg-slate rounded-full p-1">
                    <AlertCircle size={24} className="text-statusRed fill-slate" />
                </div>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Link Expired</h2>
            <p className="text-textGrey text-sm mt-2 leading-relaxed">
              This invitation is no longer valid.
            </p>
          </div>
          <button 
            onClick={clearInviteParams} 
            className="w-full p-4 rounded-2xl bg-white/5 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 group"
          >
            Go to Login <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  // C. INVITE CLAIM VIEW (Must check this BEFORE Dashboard)
  if (inviteData) {
    return (
      <StudentClaimView 
        inviteCode={inviteData.id} 
        studentData={inviteData.student} 
        teacherName={inviteData.teacherName} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        isAlreadyClaimed={inviteData.isClaimed} 
        onClaimSuccess={() => {
          setInviteData(null);
          clearInviteParams();
          showToast("Account Linked Successfully!", "success");
        }} 
      />
    );
  }

  // D. MAIN ROUTING
  if (user && userRole) {
    if (userRole === 'student') {
      return <StudentApp userEmail={user.email} theme={theme} toggleTheme={toggleTheme} />;
    }
    return <TeacherDashboard user={user} theme={theme} toggleTheme={toggleTheme} showToast={showToast} />;
  }

  // E. AUTH VIEW
  return <AuthView theme={theme} toggleTheme={toggleTheme} onLoginSuccess={() => showToast("Welcome back!")} />;
}
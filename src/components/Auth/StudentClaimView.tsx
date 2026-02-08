import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult
} from 'firebase/auth';
import { doc, runTransaction, getDoc } from 'firebase/firestore'; 
import { 
  Loader2, Mail, Lock, Phone, Link as LinkIcon,
  Sun, Moon, ArrowRight, ChevronLeft, ShieldCheck, Check,
  MessageSquare, Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  inviteCode: string;
  studentData: any;
  teacherName: string;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onClaimSuccess: () => void;
  isAlreadyClaimed: boolean;
}

const formatPhoneForFirebase = (phone: string) => {
    let clean = phone.replace(/\D/g, ''); 
    if (clean.length === 8) return `+852${clean}`;
    if (clean.startsWith('852') && clean.length === 11) return `+${clean}`;
    return `+${clean}`;
};

export function StudentClaimView({ 
  inviteCode, studentData, teacherName, theme, toggleTheme, onClaimSuccess, isAlreadyClaimed 
}: Props) {
  
  const [step, setStep] = useState<1 | 1.5 | 2>(1);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [validationPhone, setValidationPhone] = useState('');
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // --- 0. AUTO-RESTORE STEP 2 (Fixes the Loop) ---
  useEffect(() => {
    const checkCurrentAuth = async () => {
        const user = auth.currentUser;
        if (user) {
            // Check if user is logged in via Phone, but NOT via Email
            const isPhone = user.providerData.some(p => p.providerId === 'phone');
            const isEmail = user.providerData.some(p => p.providerId === 'password');

            // If we have phone but no email, we are mid-setup. Restore Step 2.
            if (isPhone && !isEmail) {
                setStep(2);
            }
        }
    };
    checkCurrentAuth();
  }, []);

  // --- 1. INITIALIZE RECAPTCHA ---
  useEffect(() => {
    auth.languageCode = 'zh-HK'; 
    if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': () => {}
        });
    }
  }, []);

  useEffect(() => {
    if (status !== 'idle' && status !== 'success') { 
      const timer = setTimeout(() => setStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // --- OTP AUTO SUBMIT ---
  useEffect(() => {
    const code = otpDigits.join('');
    if (code.length === 6 && step === 1.5 && status !== 'success' && !loading) {
        handleVerifyCode(code);
    }
  }, [otpDigits, step, status, loading]);

  // --- 2. SEND SMS ---
  const handleSendCode = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    setLoading(true);
    setError('');
    
    const inputClean = validationPhone.replace(/\D/g, '');
    const storedClean = studentData.phone ? studentData.phone.replace(/\D/g, '') : '';
    
    if (inputClean !== storedClean && !storedClean.includes(inputClean)) {
        setLoading(false);
        setStatus('error');
        setError("Phone number does not match our records.");
        return;
    }

    const formattedPhone = formatPhoneForFirebase(validationPhone);
    const appVerifier = recaptchaVerifierRef.current;

    try {
        if (!appVerifier) throw new Error("Recaptcha not initialized");
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        setConfirmationResult(confirmation);
        setStatus('success');
        setStep(1.5);
        setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
        console.error(err);
        setStatus('error');
        if (recaptchaVerifierRef.current) recaptchaVerifierRef.current.clear(); 
        if (err.code === 'auth/invalid-phone-number') setError("Invalid phone number format.");
        else if (err.code === 'auth/too-many-requests') setError("Too many attempts. Try again later.");
        else setError("Failed to send SMS. Check connection.");
    } finally {
        setLoading(false);
    }
  };

  // --- 3. VERIFY OTP ---
  const handleVerifyCode = async (code: string) => {
    setLoading(true);
    setError('');

    try {
        if (!confirmationResult) throw new Error("No session found");
        
        await confirmationResult.confirm(code);
        // Do NOT signOut here. Keep session active to prevent reset.

        setStatus('success');
        setTimeout(() => {
            setStep(2);
            setStatus('idle');
        }, 500); 

    } catch (err: any) {
        setStatus('error');
        setError("Incorrect code. Please try again.");
        setOtpDigits(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
    } finally {
        setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    if (status === 'success' || status === 'error') setStatus('idle');
    const newOtp = [...otpDigits];
    newOtp[index] = value.substring(value.length - 1);
    setOtpDigits(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (status === 'success' || status === 'error') setStatus('idle');
    const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
    if (pastedData) {
        const newOtp = [...otpDigits];
        pastedData.split('').forEach((char, i) => { if (i < 6) newOtp[i] = char; });
        setOtpDigits(newOtp);
        const nextIndex = Math.min(pastedData.length, 5);
        otpRefs.current[nextIndex]?.focus();
    }
  };

  // --- 4. FINAL CLAIM ---
  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        // --- CLEAN UP GHOST USER ---
        const currentUser = auth.currentUser;
        if (currentUser) {
            // If logged in via Phone, delete it to allow fresh email creation
            const isPhoneOnly = currentUser.providerData.length === 1 && currentUser.providerData[0].providerId === 'phone';
            if (isPhoneOnly) {
                await currentUser.delete(); 
            } else {
                await signOut(auth);
            }
        }

        let user;
        if (isLoginMode) {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            user = userCredential.user;
            const teacherDoc = await getDoc(doc(db, "instructors", user.uid));
            if (teacherDoc.exists()) {
                await signOut(auth); 
                throw new Error("Teacher accounts cannot claim student profiles.");
            }
        } else {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            user = userCredential.user;
        }

        const studentDocRef = doc(db, "students", inviteCode);
        const userDocRef = doc(db, "users", user.uid);

        await runTransaction(db, async (transaction) => {
            const studentSnap = await transaction.get(studentDocRef);
            if (!studentSnap.exists()) throw new Error("Invite invalid.");
            if (studentSnap.data().uid) throw new Error("Already claimed.");

            const userSnap = await transaction.get(userDocRef);
            if (!userSnap.exists()) {
                transaction.set(userDocRef, {
                    name: studentData.name,
                    phone: studentData.phone,
                    email: email,
                    role: 'student',
                    createdAt: new Date().toISOString()
                });
            }
            transaction.update(studentDocRef, {
                uid: user.uid,
                email: email,
                claimedAt: new Date().toISOString()
            });
        });

        setStatus('success');
        setTimeout(() => onClaimSuccess(), 800);
    } catch (err: any) {
        setStatus('error');
        if (err.code === 'auth/requires-recent-login') {
             setError("Session timed out. Please verify phone again.");
             setStep(1);
        } else {
             setError(err.message.replace('Firebase: ', '').replace('auth/', ''));
        }
    } finally {
        setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError("Please enter your email address first."); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError('');
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      setError("Failed to send reset email.");
    }
  };

  const isDark = theme === 'dark';
  const inputStyle = isDark 
    ? "bg-black/40 border-white/10 text-white placeholder:text-white/30 focus:bg-black/60" 
    : "bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/30";
  const otpBoxStyle = isDark
    ? "bg-black/50 border-white/10 text-white focus:border-white/50"
    : "bg-white/30 border-white/40 text-white focus:border-white";
  const getButtonClass = (disabled: boolean) => {
    const base = "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-white transition-all duration-300 ";
    if (!disabled || status === 'success') return base + "bg-white/20 hover:bg-white/30 scale-100 shadow-lg active:scale-95 cursor-pointer";
    return base + "bg-white/5 scale-90 opacity-20 grayscale cursor-not-allowed";
  };
  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
  };
  const shakeAnimation = { x: [0, -6, 6, -6, 6, 0], transition: { duration: 0.4 } };

  if (isAlreadyClaimed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-midnight">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md p-8 border border-gray-800 rounded-[2.5rem] bg-slate text-center space-y-6">
          <div className="flex justify-center"><div className="p-4 rounded-full bg-blue-500/10 text-blue-500"><ShieldCheck size={48} /></div></div>
          <h2 className="text-2xl font-black text-white">Already Linked</h2>
          <p className="text-textGrey text-sm">This invitation has already been claimed.</p>
          <button onClick={() => window.location.href = '/'} className="w-full p-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest hover:bg-blue-500 transition-all">Go to Login</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div data-portal="student" className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300 relative bg-midnight font-sans">
      <div id="recaptcha-container"></div>
      <div className="absolute top-6 right-6 z-50">
         <button type="button" onClick={toggleTheme} className="p-3 rounded-full border border-gray-800 bg-slate text-textGrey transition-all shadow-xl active:scale-90">{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
      </div>

      <div className="w-full max-w-md flex flex-col">
        <div className="min-h-[60px] flex items-end mb-4 px-2">
            <AnimatePresence mode="wait">
                {(error || resetSent) && (
                    <motion.div key={error ? 'err' : 'success'} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-full p-4 border text-[11px] font-black uppercase tracking-wider rounded-2xl text-center shadow-lg backdrop-blur-md ${error ? 'bg-statusRed/10 border-statusRed/20 text-statusRed' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                        {error || "Password reset link sent! Check your inbox."}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        <motion.div layout transition={{ duration: 0.45 }} className="w-full border border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative bg-slate">
            <div className="p-8">
                <header className="text-center mb-8">
                    <h1 className="text-2xl font-black tracking-tight text-white">HK Drive Portal</h1>
                    <p className="text-[10px] mt-1 uppercase tracking-[0.2em] font-black text-textGrey">Secure Connection Request</p>
                </header>
                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl shadow-blue-500/20 p-8">
                    <AnimatePresence mode="wait" custom={step}>
                        {step === 1 && (
                            <motion.div key="step1" custom={step} variants={slideVariants} initial="enter" animate="center" exit="exit" className="relative z-10 space-y-6">
                                <div className="space-y-4">
                                    <h2 className="text-xs font-black uppercase tracking-[0.15em] !text-white opacity-70 mb-2">Identity Verification</h2>
                                    <div className="flex items-center gap-3"><p className="text-xl font-black leading-tight !text-white">Verifying {studentData.name}</p><Fingerprint size={24} className="text-white opacity-90" /></div>
                                    <p className="text-[11px] font-medium !text-white opacity-80 leading-relaxed">We will send a 6-digit code to verify the number on file with Instructor {teacherName}.</p>
                                </div>
                                <motion.form animate={status === 'error' ? shakeAnimation : {}} onSubmit={handleSendCode} className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" size={18} />
                                    <input type="tel" required placeholder="Phone Number" value={validationPhone} onChange={e => { setValidationPhone(e.target.value); if(status !== 'idle') setStatus('idle'); }} className={`w-full pl-12 pr-14 p-4 rounded-2xl outline-none font-black text-lg transition-all border ${inputStyle}`} />
                                    <button type="submit" disabled={!validationPhone || loading || status === 'success'} className={getButtonClass(!validationPhone || loading)}>
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : (<AnimatePresence mode="wait">{status === 'success' ? <Check size={20} /> : <ArrowRight size={20} />}</AnimatePresence>)}
                                    </button>
                                </motion.form>
                            </motion.div>
                        )}
                        {step === 1.5 && (
                            <motion.div key="step1.5" custom={step} variants={slideVariants} initial="enter" animate="center" exit="exit" className="relative z-10 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                      <button onClick={() => { setStep(1); setStatus('idle'); setError(''); setConfirmationResult(null); }} className="p-2 -ml-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90 shadow-inner"><ChevronLeft size={18} /></button>
                                      <div className="flex items-center gap-3"><p className="text-xl font-black leading-tight !text-white">Enter 6-digit code</p><MessageSquare size={24} className="text-white opacity-90" /></div>
                                    </div>
                                    <p className="text-[11px] font-medium !text-white opacity-80 leading-relaxed ml-12">Sent to <span className="font-bold border-b border-white/30">{formatPhoneForFirebase(validationPhone)}</span></p>
                                </div>
                                <motion.div animate={status === 'error' ? shakeAnimation : {}} className="space-y-4">
                                    <div className="flex justify-between gap-2">
                                        {otpDigits.map((digit, index) => (
                                            <input key={index} ref={(el) => { otpRefs.current[index] = el }} type="text" maxLength={1} value={digit} onChange={e => handleOtpChange(index, e.target.value)} onKeyDown={e => handleOtpKeyDown(index, e)} onPaste={handleOtpPaste} disabled={loading} className={`w-full aspect-[4/5] rounded-xl text-center text-xl font-black outline-none border transition-all ${otpBoxStyle}`} />
                                        ))}
                                    </div>
                                    {loading && (<div className="flex justify-center py-2"><Loader2 className="animate-spin text-white" size={24} /></div>)}
                                    <button type="button" onClick={() => handleSendCode()} className="text-[10px] text-white opacity-60 hover:opacity-100 underline decoration-white/30 underline-offset-4 w-full text-center">Resend Code</button>
                                </motion.div>
                            </motion.div>
                        )}
                        {step === 2 && (
                            <motion.div key="step2" custom={step} variants={slideVariants} initial="enter" animate="center" exit="exit" className="relative z-10 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                      <button onClick={() => { setStep(1); setStatus('idle'); setError(''); setOtpDigits(['','','','','','']); setConfirmationResult(null); }} className="p-2 -ml-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90 shadow-inner"><ChevronLeft size={18} /></button>
                                      <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                          <div className="h-7 overflow-hidden relative flex-1"><AnimatePresence mode="wait"><motion.p key={isLoginMode ? 'welcome' : 'setup'} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.2 }} className="text-xl font-black leading-tight !text-white absolute inset-0 whitespace-nowrap">{isLoginMode ? 'Welcome back!' : 'Complete setup'}</motion.p></AnimatePresence></div>
                                          <Lock size={24} className="text-white opacity-90 shrink-0" />
                                      </div>
                                    </div>
                                    <div className="min-h-[44px] ml-12"><AnimatePresence mode="wait"><motion.p key={isLoginMode ? 'login-desc' : 'reg-desc'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] font-medium !text-white opacity-80 leading-relaxed pt-2">{isLoginMode ? `Sign in to your portal to manage your schedule and track your lesson progress.` : `Finalize your account to view your training record, book upcoming lesson slots, and manage credits.`}</motion.p></AnimatePresence></div>
                                </div>
                                <motion.form animate={status === 'error' ? shakeAnimation : {}} onSubmit={handleClaim} className="space-y-3">
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" size={18} />
                                        <input type="email" required placeholder="Email Address" value={email} onChange={e => { setEmail(e.target.value); setStatus('idle'); }} className={`w-full pl-12 p-4 rounded-2xl outline-none font-medium transition-all border ${inputStyle}`} />
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" size={18} />
                                        <input type="password" required placeholder="Password" value={password} onChange={e => { setPassword(e.target.value); setStatus('idle'); }} className={`w-full pl-12 pr-14 p-4 rounded-2xl outline-none font-medium transition-all border ${inputStyle}`} />
                                        <button disabled={!email || !password || loading || status === 'success'} type="submit" className={getButtonClass(!email || !password || loading)}>
                                            {loading ? <Loader2 className="animate-spin" size={20} /> : (<AnimatePresence mode="wait">{status === 'success' ? <Check size={20} /> : <ArrowRight size={20} />}</AnimatePresence>)}
                                        </button>
                                    </div>
                                    <AnimatePresence mode="popLayout">{isLoginMode && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0 }} className="flex justify-end pr-2 overflow-hidden"><button type="button" onClick={handleForgotPassword} className="text-[10px] font-bold !text-white opacity-80 hover:opacity-100 underline decoration-white/30 underline-offset-4">Forgot Password?</button></motion.div>)}</AnimatePresence>
                                    <div className="text-center pt-2"><button type="button" onClick={() => { setIsLoginMode(!isLoginMode); setError(''); setStatus('idle'); }} className="text-[11px] font-black uppercase tracking-tighter !text-white opacity-60 hover:text-white transition-all">{isLoginMode ? "Need a new account?" : "Already have an account?"}</button></div>
                                </motion.form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <footer className="mt-8 text-center px-4">
                    <div className="flex items-center justify-center gap-2.5 text-textGrey"><LinkIcon size={16} className="rotate-45 opacity-70 shrink-0" /><p className="text-[11px] font-medium leading-relaxed">Linking allows you to book slots with <span className="font-black text-white whitespace-nowrap">{teacherName}</span> instantly.</p></div>
                </footer>
            </div>
        </motion.div>

        {/* 👇 LEGAL TEXT & RECAPTCHA COMPLIANCE (Outside Card) */}
        <div className="mt-6 text-center">
            <p className={`text-[10px] leading-tight transition-colors ${isDark ? 'text-white/20' : 'text-black/50'}`}>
                This site is protected by reCAPTCHA and the Google <br/>
                <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className={`underline transition-colors ${isDark ? 'hover:text-white/50' : 'hover:text-black'}`}>Privacy Policy</a> and 
                <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className={`underline ml-1 transition-colors ${isDark ? 'hover:text-white/50' : 'hover:text-black'}`}>Terms of Service</a> apply.
            </p>
        </div>
        <style>{`.grecaptcha-badge { visibility: hidden; opacity: 0; pointer-events: none; }`}</style>
      </div>
    </div>
  );
}
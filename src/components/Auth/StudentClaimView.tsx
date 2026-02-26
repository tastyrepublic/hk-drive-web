import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../firebase';
import { 
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult
} from 'firebase/auth';
import { doc, runTransaction, updateDoc } from 'firebase/firestore'; 
import { 
  Loader2, Phone, Link as LinkIcon,
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
  
  const [step, setStep] = useState<1 | 1.5>(1);
  const [loading, setLoading] = useState(false);
  
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [validationPhone, setValidationPhone] = useState('');
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // --- HELPER: ROBUST RECAPTCHA INIT ---
  const ensureRecaptcha = () => {
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    const container = document.getElementById('recaptcha-container');
    if (container) {
        try {
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => {} 
            });
            return recaptchaVerifierRef.current;
        } catch (e) {
            console.error("Recaptcha init error:", e);
            return null;
        }
    }
    return null;
  };

  useEffect(() => {
    if (isAlreadyClaimed) return;
    auth.languageCode = 'zh-HK'; 
    ensureRecaptcha();
  }, [isAlreadyClaimed]);

  useEffect(() => { 
    const code = otpDigits.join(''); 
    if (code.length === 6 && step === 1.5 && status !== 'success' && !loading) {
        handleVerifyCode(code); 
    }
  }, [otpDigits, step, status, loading]);

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
    const appVerifier = ensureRecaptcha();

    if (!appVerifier) {
        setLoading(false);
        setError("Security check failed. Please refresh.");
        return;
    }

    try {
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        setConfirmationResult(confirmation); 
        setStatus('success'); 
        setStep(1.5); 
        setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
        console.error(err);
        setStatus('error');
        if (recaptchaVerifierRef.current) {
            try { recaptchaVerifierRef.current.clear(); } catch(e) {}
            recaptchaVerifierRef.current = null;
        }
        if (err.code === 'auth/invalid-phone-number') setError("Invalid phone number format.");
        else if (err.code === 'auth/too-many-requests') setError("Too many attempts. Try again later.");
        else setError("Failed to send SMS. Check connection.");
    } finally { 
        setLoading(false); 
    }
  };

  const handleVerifyCode = async (code: string) => {
    setLoading(true); 
    setError('');
    try {
        if (!confirmationResult) throw new Error("No session found");
        const credential = await confirmationResult.confirm(code);
        await handleClaim(credential.user);
    } catch (err: any) {
        console.error(err);
        setStatus('error'); 
        setError("Incorrect code. Please try again.");
        setOtpDigits(['', '', '', '', '', '']); 
        otpRefs.current[0]?.focus();
        setLoading(false);
    }
  };

  const handleClaim = async (user: any) => {
    try {
        const studentDocRef = doc(db, "students", inviteCode);
        const userDocRef = doc(db, "users", user.uid);

        // 1. Core linking transaction
        await runTransaction(db, async (transaction) => {
            const studentSnap = await transaction.get(studentDocRef);
            if (!studentSnap.exists()) throw new Error("Invite invalid.");
            
            if (studentSnap.data().uid && studentSnap.data().uid !== user.uid) {
                 throw new Error("Already claimed.");
            }

            const userSnap = await transaction.get(userDocRef);
            if (!userSnap.exists()) {
                transaction.set(userDocRef, {
                    name: studentData.name,
                    phone: studentData.phone,
                    role: 'student',
                    createdAt: new Date().toISOString()
                });
            }

            transaction.update(studentDocRef, {
                uid: user.uid,
                claimedAt: new Date().toISOString(),
                inviteToken: null, 
                inviteExpiresAt: null
            });
        });

        // --- NEW: FLIP THE PHONEBOOK FLAG TO CLAIMED ---
        // We do this immediately after the transaction succeeds, 
        // while the loading spinner is still active!
        const cleanPhone = studentData.phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.length === 8 ? `+852${cleanPhone}` : `+${cleanPhone}`;
        
        await updateDoc(doc(db, "phone_directory", formattedPhone), { 
            claimed: true 
        });

        // 2. Trigger Smooth UI Transition
        setStatus('success');
        
        // Wait 800ms so the user can register the visual success state 
        // before the RootRouter instantly switches the view.
        setTimeout(() => onClaimSuccess(), 800);

    } catch (err: any) {
        setStatus('error');
        setError(err.message);
        setStep(1); 
    } finally {
        setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    if (status === 'success' || status === 'error') setStatus('idle');
    const newOtp = [...otpDigits]; newOtp[index] = value.substring(value.length - 1); setOtpDigits(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Backspace' && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus(); };
  const handleOtpPaste = (e: React.ClipboardEvent) => { e.preventDefault(); if (status === 'success' || status === 'error') setStatus('idle'); const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, ''); if (pastedData) { const newOtp = [...otpDigits]; pastedData.split('').forEach((char, i) => { if (i < 6) newOtp[i] = char; }); setOtpDigits(newOtp); const nextIndex = Math.min(pastedData.length, 5); otpRefs.current[nextIndex]?.focus(); } };

  // --- STYLES ---
  const isDark = theme === 'dark';
  const inputStyle = isDark 
    ? "bg-black/20 border-white/10 text-white placeholder:text-white/40 focus:bg-black/30 focus:border-white/30" 
    : "bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:bg-white/30 focus:border-white";
  const otpBoxStyle = isDark 
    ? "bg-black/20 border-white/10 text-white focus:border-white/50" 
    : "bg-white/30 border-white/40 text-white focus:border-white";
  
  const getButtonClass = (disabled: boolean) => { 
    const base = "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-white transition-all duration-300 "; 
    if (!disabled || status === 'success') return base + "bg-white/20 hover:bg-white/30 scale-100 shadow-lg active:scale-95 cursor-pointer"; 
    return base + "bg-white/5 scale-90 opacity-20 grayscale"; 
  };
  
  const fadeVariants = { 
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05, transition: { duration: 0.2 } }
  };
  
  const shakeAnimation = { x: [0, -6, 6, -6, 6, 0], transition: { duration: 0.4 } };

  // NEW: HANDLE ALREADY CLAIMED CASE (For teachers testing or students already in)
  if (isAlreadyClaimed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-midnight">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md p-10 border border-gray-800 rounded-[2.5rem] bg-slate text-center space-y-6">
          <div className="flex justify-center"><div className="p-4 rounded-full bg-blue-500/10 text-blue-500"><ShieldCheck size={48} /></div></div>
          <h2 className="text-2xl font-black text-white">Already Linked</h2>
          <p className="text-textGrey text-sm px-4">This invitation has already been claimed. If you are the owner, please go to your dashboard.</p>
          <button 
            onClick={() => window.location.href = '/'} 
            className="w-full p-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg active:scale-95"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div data-portal="student" className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 relative bg-midnight font-sans">
      <div id="recaptcha-container"></div>
      
      <div className="absolute top-6 right-6 z-50">
         <button type="button" onClick={toggleTheme} className="p-3 rounded-full border border-gray-800 bg-slate text-textGrey transition-all shadow-xl active:scale-90">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
      </div>

      <div className="w-full max-w-md flex flex-col items-center space-y-6">
        
        <div className="text-center space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-white">HK Drive Portal</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-textGrey">Secure Connection Request</p>
        </div>

        <div className="h-[40px] w-full flex items-center justify-center">
            <AnimatePresence mode="wait">
                {error && ( <motion.div key='err' initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="px-4 py-2 border text-[11px] font-black uppercase tracking-wider rounded-xl text-center shadow-lg backdrop-blur-md bg-statusRed/10 border-statusRed/20 text-statusRed"> {error} </motion.div> )}
            </AnimatePresence>
        </div>

        {/* The Colorful Card (Pure Form) */}
        <motion.div 
            layout 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="w-full relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-500 to-purple-600 p-8 flex flex-col justify-between min-h-[420px]"
        >
            <div className="flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait" custom={step}>
                    {step === 1 && (
                        <motion.div key="step1" variants={fadeVariants} initial="initial" animate="animate" exit="exit" className="relative z-10 space-y-8">
                            <div className="space-y-4">
                                <h2 className="text-xs font-black uppercase tracking-[0.15em] !text-white opacity-70 mb-2">Identity Verification</h2>
                                <div className="flex items-center gap-3">
                                    <p className="text-xl font-black leading-tight !text-white">Verifying {studentData.name}</p>
                                    <Fingerprint size={24} className="text-white opacity-90" />
                                </div>
                                <p className="text-[11px] font-medium !text-white opacity-80 leading-relaxed">
                                    We will send a 6-digit code to verify the number on file with Instructor {teacherName}.
                                </p>
                            </div>
                            <motion.form animate={status === 'error' ? shakeAnimation : {}} onSubmit={handleSendCode} className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" size={18} />
                                <input 
                                    type="tel" 
                                    required 
                                    placeholder="Phone Number" 
                                    value={validationPhone} 
                                    onChange={e => { 
                                        setValidationPhone(e.target.value); 
                                        if(status !== 'idle') setStatus('idle');
                                        if(error) setError('');
                                    }} 
                                    className={`w-full pl-12 pr-14 p-4 rounded-2xl outline-none font-black text-lg transition-all border ${inputStyle}`} 
                                />
                                <button type="submit" disabled={!validationPhone || loading || status === 'success'} className={getButtonClass(!validationPhone || loading)}> {loading ? <Loader2 className="animate-spin" size={20} /> : (<AnimatePresence mode="wait">{status === 'success' ? <Check size={20} /> : <ArrowRight size={20} />}</AnimatePresence>)} </button>
                            </motion.form>
                        </motion.div>
                    )}
                    
                    {step === 1.5 && (
                        <motion.div key="step1.5" variants={fadeVariants} initial="initial" animate="animate" exit="exit" className="relative z-10 space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                <button onClick={() => { setStep(1); setStatus('idle'); setError(''); setConfirmationResult(null); }} className="p-2 -ml-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90 shadow-inner"><ChevronLeft size={18} /></button>
                                <div className="flex items-center gap-3"><p className="text-xl font-black leading-tight !text-white">Enter 6-digit code</p><MessageSquare size={24} className="text-white opacity-90" /></div>
                                </div>
                                <p className="text-[11px] font-medium !text-white opacity-80 leading-relaxed ml-12">Sent to <span className="font-bold border-b border-white/30">{formatPhoneForFirebase(validationPhone)}</span></p>
                            </div>
                            <motion.div animate={status === 'error' ? shakeAnimation : {}} className="space-y-4">
                                <div className="flex justify-between gap-2"> {otpDigits.map((digit, index) => ( <input key={index} ref={(el) => { otpRefs.current[index] = el }} type="text" maxLength={1} value={digit} onChange={e => handleOtpChange(index, e.target.value)} onKeyDown={e => handleOtpKeyDown(index, e)} onPaste={handleOtpPaste} disabled={loading} className={`w-full aspect-[4/5] rounded-xl text-center text-xl font-black outline-none border transition-all ${otpBoxStyle}`} /> ))} </div>
                                {loading && (<div className="flex justify-center py-2"><Loader2 className="animate-spin text-white" size={24} /></div>)}
                                <button type="button" onClick={() => handleSendCode()} className="text-[10px] text-white opacity-60 hover:opacity-100 underline decoration-white/30 underline-offset-4 w-full text-center">Resend Code</button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Text (Inside Card) */}
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
                <div className="flex items-center justify-center gap-2.5 text-white/70">
                    <LinkIcon size={14} className="rotate-45 shrink-0" />
                    <p className="text-[10px] font-medium leading-relaxed">
                        Verifying allows you to book slots with <span className="font-bold text-white">{teacherName}</span> instantly.
                    </p>
                </div>
            </div>

        </motion.div>

        {/* Legal Text (Outside Card) */}
        <div className="text-center px-4">
            <div className="text-[9px] text-textGrey/60 leading-tight">
                This site is protected by reCAPTCHA and the Google 
                <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline hover:text-textGrey mx-1">Privacy Policy</a> and 
                <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline hover:text-textGrey mx-1">Terms of Service</a> apply.
            </div>
        </div>

      </div>
    </div>
  );
}
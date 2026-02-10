import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult
} from 'firebase/auth';
import { setDoc, doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore'; 
import { 
  Loader2, Car, Check, User, Phone, Mail, Lock, Key, ArrowLeft, 
  ShieldCheck, ArrowRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CHANGE 1: Import the centralized list ---
import { VEHICLE_TYPES } from '../../constants/list';

// DELETE THIS HARDCODED LIST:
// const VEHICLE_OPTIONS = [ ... ];

interface Props {
  role: 'teacher' | 'student';
  onLoginSuccess: () => void;
  onBack: () => void;
  theme: 'dark' | 'light';
}

const formatPhoneForFirebase = (phone: string) => {
    let clean = phone.replace(/\D/g, ''); 
    if (clean.length === 8) return `+852${clean}`;
    if (clean.startsWith('852') && clean.length === 11) return `+${clean}`;
    return `+${clean}`;
};

export function AuthForm({ role, onLoginSuccess, onBack, theme }: Props) {
  // Common State
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Email Auth State (Teacher)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState(''); 
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  
  // Phone Auth State (Student)
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1 = Phone, 2 = OTP
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { if (error) setError(''); }, [email, password, inviteCode, name, phone]);

  // --- RECAPTCHA (Student Only) ---
  const ensureRecaptcha = () => {
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    if (!document.getElementById('login-recaptcha')) return null;
    try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'login-recaptcha', {
            'size': 'invisible',
            'callback': () => {} 
        });
        return recaptchaVerifierRef.current;
    } catch (e) { return null; }
  };
  
  useEffect(() => {
    return () => {
        if (recaptchaVerifierRef.current) {
            try { recaptchaVerifierRef.current.clear(); } catch (e) {}
            recaptchaVerifierRef.current = null;
        }
    };
  }, [role]);

  // --- HANDLERS: TEACHER ---
  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        if (isRegistering) {
            if (!name.trim() || !phone.trim()) throw new Error("Name and Phone are required.");
            if (!inviteCode.trim()) throw new Error("Invite Code is required.");
            if (selectedVehicles.length === 0) throw new Error("Select at least one vehicle.");
            
            const codeSnap = await getDoc(doc(db, "invites", inviteCode.trim()));
            if (!codeSnap.exists() || !codeSnap.data()?.valid) throw new Error("Invalid Invite Code.");

            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "instructors", user.uid), {
                name, phone, email, role: 'teacher', createdAt: new Date().toISOString(),
                inviteCode: inviteCode.trim(), vehicleTypes: selectedVehicles, lessonDuration: 45
            });
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
        onLoginSuccess();
    } catch (err: any) {
        let msg = err.message.replace('Firebase: ', '').replace('auth/', '');
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

  // --- HANDLERS: STUDENT (PHONE) ---
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. PRE-FLIGHT DB CHECK
    try {
        const rawPhone = phone.trim().replace(/\s+/g, '');
        const formattedPhone = formatPhoneForFirebase(rawPhone);
        
        const q1 = query(collection(db, "users"), where("phone", "==", formattedPhone), limit(1));
        const q2 = query(collection(db, "users"), where("phone", "==", rawPhone), limit(1));

        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const userExists = !snap1.empty || !snap2.empty;

        if (!userExists) {
            setLoading(false);
            setError("Number not registered. Please claim your Invite Link first.");
            return; 
        }

    } catch (err) {
        console.error("Pre-flight check failed:", err);
        setLoading(false);
        setError("Unable to verify account status.");
        return;
    }

    // 2. SEND SMS
    const appVerifier = ensureRecaptcha();
    if (!appVerifier) { setError("Security check failed. Refresh page."); setLoading(false); return; }

    try {
        const formatted = formatPhoneForFirebase(phone);
        const confirmation = await signInWithPhoneNumber(auth, formatted, appVerifier);
        setConfirmationResult(confirmation);
        setStep(2);
    } catch (err: any) {
        console.error(err);
        setError("Failed to send SMS. Check number.");
        if (recaptchaVerifierRef.current) {
             try { recaptchaVerifierRef.current.clear(); } catch(e) {}
             recaptchaVerifierRef.current = null;
        }
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    
    const code = otpDigits.join('');
    try {
        if (!confirmationResult) throw new Error("Session expired");
        
        await confirmationResult.confirm(code);
        onLoginSuccess();
    } catch (err: any) {
        console.error(err);
        setError("Invalid Code.");
    } finally {
        setLoading(false);
    }
  };

  // OTP Input Helpers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpDigits]; newOtp[index] = value.substring(value.length - 1); setOtpDigits(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (newOtp.join('').length === 6) setTimeout(() => { if (!loading) document.getElementById('otp-submit-btn')?.click(); }, 100);
  };
  
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => { 
      if (e.key === 'Backspace' && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus(); 
  };

  const isDark = theme === 'dark';
  const cardColor = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subTextColor = isDark ? 'text-textGrey' : 'text-gray-500';
  const inputBg = isDark ? 'bg-midnight border-gray-700 text-white focus:border-primary' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-primary';
  const tabActive = isDark ? 'bg-slate text-primary' : 'bg-white text-primary shadow-sm';
  const tabInactive = isDark ? 'bg-midnight text-textGrey hover:text-white' : 'bg-gray-100 text-textGrey hover:text-gray-900';

  return (
    <motion.div
        key="auth-container"
        data-portal={role === 'student' ? 'student' : 'teacher'}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md flex flex-col items-center"
    >
        <div id="login-recaptcha"></div>
        <motion.div layout transition={{ duration: 0.35, ease: "easeInOut" }} className={`w-full border rounded-2xl shadow-xl overflow-hidden relative ${cardColor}`}>
            {role === 'teacher' && (
                <div className={`flex border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                    <button type="button" onClick={() => setIsRegistering(false)} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${!isRegistering ? tabActive : tabInactive}`}>Log In</button>
                    <button type="button" onClick={() => setIsRegistering(true)} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${isRegistering ? tabActive : tabInactive}`}>Register</button>
                </div>
            )}
            <div className="p-6 sm:p-8">
                <div className="text-center mb-6">
                    <h1 className={`text-2xl font-black tracking-tight ${textColor}`}>{role === 'teacher' ? 'Instructor Portal' : 'Student Portal'}</h1>
                    <p className={`${subTextColor} text-xs mt-1 uppercase tracking-widest`}>{role === 'student' ? 'Mobile Login' : (isRegistering ? 'Create Account' : 'Welcome Back')}</p>
                </div>
                {error && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 mb-4 bg-statusRed/10 border border-statusRed/30 text-statusRed text-xs font-bold rounded-lg text-center">{error}</motion.div>)}

                {/* TEACHER FORM */}
                {role === 'teacher' && (
                    <form onSubmit={handleTeacherSubmit} className="flex flex-col space-y-4">
                        <div className="space-y-4">
                            <AnimatePresence initial={false}>
                                {isRegistering && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                                        <div className="relative"><Key className={`absolute left-3 top-3 ${subTextColor}`} size={18} /><input type="text" required placeholder="Invite Code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className={`w-full pl-10 p-3 border rounded-xl outline-none transition-colors font-medium placeholder:opacity-50 ${inputBg}`} /></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="relative"><User className={`absolute left-3 top-3 ${subTextColor}`} size={18} /><input type="text" required placeholder="Name" value={name} onChange={e => setName(e.target.value)} className={`w-full pl-10 p-3 border rounded-xl outline-none transition-colors font-medium placeholder:opacity-50 ${inputBg}`} /></div>
                                            <div className="relative"><Phone className={`absolute left-3 top-3 ${subTextColor}`} size={18} /><input type="text" required placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} className={`w-full pl-10 p-3 border rounded-xl outline-none transition-colors font-medium placeholder:opacity-50 ${inputBg}`} /></div>
                                        </div>
                                        <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-midnight/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                            <label className={`text-[10px] uppercase font-black ${subTextColor}`}>Teaching Categories</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {/* --- CHANGE 2: Use VEHICLE_TYPES here --- */}
                                                {VEHICLE_TYPES.map(v => (
    <button 
        key={v.id} 
        type="button" 
        onClick={() => setSelectedVehicles(prev => 
            prev.includes(v.id) ? prev.filter(i => i !== v.id) : [...prev, v.id]
        )} 
        className={`... ${selectedVehicles.includes(v.id) ? '...' : '...'}`}
    >
        <div className="flex items-center gap-3">
            <Car size={16} />
            <span>{v.label}</span>
        </div>
        {selectedVehicles.includes(v.id) && <Check size={16} />}
    </button>
))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="relative"><Mail className={`absolute left-3 top-3 ${subTextColor}`} size={18} /><input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className={`w-full pl-10 p-3 border rounded-xl outline-none transition-colors font-medium placeholder:opacity-50 ${inputBg}`} /></div>
                            <div className="relative"><Lock className={`absolute left-3 top-3 ${subTextColor}`} size={18} /><input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={`w-full pl-10 p-3 border rounded-xl outline-none transition-colors font-medium placeholder:opacity-50 ${inputBg}`} /></div>
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-lg active:scale-[0.98] bg-primary text-white">{loading ? <Loader2 className="animate-spin mx-auto" /> : (isRegistering ? "Create Account" : "Sign In")}</button>
                    </form>
                )}

                {/* STUDENT FORM */}
                {role === 'student' && (
                    <div className="flex flex-col space-y-4">
                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.form key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleSendCode} className="space-y-4">
                                    <div className="relative group"><Phone className={`absolute left-3 top-1/2 -translate-y-1/2 ${subTextColor}`} size={20} /><input type="tel" required placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} className={`w-full pl-10 p-4 border rounded-xl outline-none transition-colors font-bold text-lg placeholder:opacity-50 ${inputBg}`} /></div>
                                    <button type="submit" disabled={loading || phone.length < 8} className="w-full py-4 rounded-xl font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-lg active:scale-[0.98] bg-primary text-white flex items-center justify-center gap-2">{loading ? <Loader2 className="animate-spin" /> : <><span>Get Code</span> <ArrowRight size={18} /></>}</button>
                                </motion.form>
                            ) : (
                                <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleVerifyOtp} className="space-y-6">
                                    <div className="flex items-center gap-2 text-sm font-bold text-textGrey"><button type="button" onClick={() => setStep(1)} className="hover:text-white"><ArrowLeft size={16} /></button><span>Sent to {formatPhoneForFirebase(phone)}</span></div>
                                    <div className="flex justify-between gap-2">{otpDigits.map((digit, index) => (<input key={index} ref={(el) => { otpRefs.current[index] = el }} type="text" maxLength={1} value={digit} onChange={e => handleOtpChange(index, e.target.value)} onKeyDown={e => handleOtpKeyDown(index, e)} disabled={loading} className={`w-full aspect-[4/5] rounded-lg text-center text-xl font-black outline-none border transition-all ${isDark ? "bg-midnight border-gray-700 text-white focus:border-primary" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-primary"}`} />))}</div>
                                    <button id="otp-submit-btn" type="submit" disabled={loading} className="w-full py-4 rounded-xl font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-lg active:scale-[0.98] bg-primary text-white">{loading ? <Loader2 className="animate-spin mx-auto" /> : "Verify & Login"}</button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                         <div className={`p-4 rounded-xl border text-center space-y-2 ${isDark ? 'bg-midnight/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}><div className="flex justify-center text-primary mb-1"><ShieldCheck size={20} /></div><p className={`text-[10px] leading-relaxed ${subTextColor}`}>New Student? Use the <b>Invite Link</b> from your instructor to activate your account.</p></div>
                    </div>
                )}
            </div>
        </motion.div>
        <motion.button initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }} onClick={onBack} className={`mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${subTextColor} hover:${textColor} transition-all group`}><ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/><span>Choose a different role</span></motion.button>
    </motion.div>
  );
}
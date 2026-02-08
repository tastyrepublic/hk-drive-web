import { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
// 1. Import signOut
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { setDoc, doc, getDoc } from 'firebase/firestore'; 
import { 
  Loader2, Car, Check, User, Phone, Mail, Lock, Key, ArrowLeft, 
  ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VEHICLE_OPTIONS = [
  'Private Car (Auto) 1A', 'Private Car (Manual) 1',
  'Light Goods (Auto) 2A', 'Light Goods (Manual) 2'
];

interface Props {
  role: 'teacher' | 'student';
  onLoginSuccess: () => void;
  onBack: () => void;
  theme: 'dark' | 'light';
}

export function AuthForm({ role, onLoginSuccess, onBack, theme }: Props) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteCode, setInviteCode] = useState(''); 
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);

  useEffect(() => { if (error) setError(''); }, [email, password, inviteCode, name, phone]);

  const toggleVehicle = (v: string) => {
    setSelectedVehicles(prev => prev.includes(v) ? prev.filter(i => i !== v) : [...prev, v]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        if (isRegistering) {
            // --- REGISTRATION LOGIC (Unchanged) ---
            if (role === 'student') return; 

            if (!name.trim() || !phone.trim()) throw new Error("Name and Phone are required.");

            if (role === 'teacher') {
                if (!inviteCode.trim()) throw new Error("Invite Code is required.");
                if (selectedVehicles.length === 0) throw new Error("Select at least one vehicle.");
                
                const codeSnap = await getDoc(doc(db, "invites", inviteCode.trim()));
                if (!codeSnap.exists() || !codeSnap.data()?.valid) throw new Error("Invalid Invite Code.");
            }

            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            const baseData = { name, phone, email, role, createdAt: new Date().toISOString() };

            if (role === 'teacher') {
                await setDoc(doc(db, "instructors", user.uid), {
                    ...baseData, inviteCode: inviteCode.trim(), vehicleTypes: selectedVehicles, lessonDuration: 45,             
                });
            } else {
                await setDoc(doc(db, "users", user.uid), baseData);
            }
        } else {
            // --- LOGIN LOGIC (With Role Gate) ---
            
            // 1. Check Credentials
            const { user } = await signInWithEmailAndPassword(auth, email, password);
            
            // 2. 🛑 ROLE GATE: Check if user exists in the correct collection
            if (role === 'teacher') {
                const teacherDoc = await getDoc(doc(db, "instructors", user.uid));
                
                if (!teacherDoc.exists()) {
                    // Wrong Role! Kick them out.
                    await signOut(auth);
                    throw new Error("Access Denied: You are not an instructor. Please use the Student Portal.");
                }
            } else {
                // Role is Student
                const studentDoc = await getDoc(doc(db, "users", user.uid));
                
                if (!studentDoc.exists()) {
                    // Wrong Role! Kick them out.
                    // (Note: Teachers might be in 'instructors', so if they aren't in 'users', they are blocked here)
                    await signOut(auth);
                    throw new Error("Access Denied: Instructors cannot log in here. Please use the Instructor Portal.");
                }
            }
        }
        
        onLoginSuccess();

    } catch (err: any) {
        let msg = err.message.replace('Firebase: ', '').replace('auth/', '');
        if (msg.includes("missing or insufficient permissions")) msg = "Access Denied.";
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

  // --- STYLES ---
  const isDark = theme === 'dark';
  const cardColor = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subTextColor = isDark ? 'text-textGrey' : 'text-gray-500';
  const inputBg = isDark ? 'bg-midnight border-gray-700 text-white focus:border-primary' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-primary';
  const tabActive = isDark ? 'bg-slate text-primary' : 'bg-white text-primary shadow-sm';
  const tabInactive = isDark ? 'bg-midnight text-textGrey hover:text-white' : 'bg-gray-100 text-textGrey hover:text-gray-900';

  const isStudentInviteMode = isRegistering && role === 'student';

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
        <motion.div 
            layout 
            transition={{ duration: 0.35, ease: "easeInOut" }} 
            className={`w-full border rounded-2xl shadow-xl overflow-hidden relative ${cardColor}`}
        >
            
            <div className={`flex border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <button type="button" onClick={() => setIsRegistering(false)} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${!isRegistering ? tabActive : tabInactive}`}>Log In</button>
                <button type="button" onClick={() => setIsRegistering(true)} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${isRegistering ? tabActive : tabInactive}`}>Register</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                <div className="text-center mb-6">
                    <h1 className={`text-2xl font-black tracking-tight ${textColor}`}>{role === 'teacher' ? 'Instructor Portal' : 'Student Portal'}</h1>
                    <p className={`${subTextColor} text-xs mt-1 uppercase tracking-widest`}>{isRegistering ? 'Create Account' : 'Welcome Back'}</p>
                </div>

                {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 mb-4 bg-statusRed/10 border border-statusRed/30 text-statusRed text-xs font-bold rounded-lg text-center">
                        {error}
                    </motion.div>
                )}

                <div className="flex flex-col">
                    
                    {/* --- 1. LOGIN INPUTS (Collapsible) --- */}
                    <AnimatePresence initial={false}>
                        {!isStudentInviteMode && (
                            <motion.div 
                                key="login-inputs"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.35, ease: "easeInOut" }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-4 mb-4">
                                    <div className="relative">
                                        <Mail className={`absolute left-3 top-3 ${subTextColor}`} size={18} />
                                        <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className={`w-full pl-10 p-3 border rounded-xl outline-none transition-colors font-medium placeholder:opacity-50 ${inputBg}`} />
                                    </div>
                                    <div className="relative">
                                        <Lock className={`absolute left-3 top-3 ${subTextColor}`} size={18} />
                                        <input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={`w-full pl-10 p-3 border rounded-xl outline-none transition-colors font-medium placeholder:opacity-50 ${inputBg}`} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* --- 2. STUDENT INVITE MESSAGE (Expandable) --- */}
                    <AnimatePresence initial={false}>
                        {isStudentInviteMode && (
                            <motion.div 
                                key="invite-msg"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.35, ease: "easeInOut" }}
                                className="overflow-hidden"
                            >
                                <div className={`p-6 mb-4 rounded-2xl border text-center space-y-4 ${isDark ? 'bg-midnight/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <h3 className={`font-bold ${textColor}`}>Invite Only</h3>
                                        <p className={`text-sm mt-2 leading-relaxed ${subTextColor}`}>
                                            To ensure your account is correctly linked, please use the <b>Invite Link</b> sent by your instructor.
                                        </p>
                                    </div>
                                    
                                    {/* BACK BUTTON (With Border) */}
                                    <button 
                                        type="button"
                                        onClick={() => setIsRegistering(false)}
                                        className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest bg-transparent border transition-all text-xs mt-2 ${
                                            isDark 
                                            ? 'border-gray-700 text-textGrey hover:text-white hover:border-gray-500' 
                                            : 'border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400'
                                        }`}
                                    >
                                        Back to Login
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* --- 3. TEACHER EXTRA FIELDS (Accordion) --- */}
                    <AnimatePresence initial={false}>
                        {isRegistering && role === 'teacher' && (
                            <motion.div key="teacher-fields" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease: "easeInOut" }} className="overflow-hidden">
                                <div className="pt-2 pb-4 space-y-4">
                                    <div className="relative">
                                        <Key className={`absolute left-3 top-3 ${subTextColor}`} size={18} />
                                        <input type="text" required placeholder="Invite Code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className={`w-full pl-10 p-3 border rounded-xl outline-none transition-colors font-medium placeholder:opacity-50 ${inputBg}`} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <User className={`absolute left-3 top-3 ${subTextColor}`} size={18} />
                                            <input type="text" required placeholder="Name" value={name} onChange={e => setName(e.target.value)} className={`w-full pl-10 p-3 border rounded-xl outline-none transition-colors font-medium placeholder:opacity-50 ${inputBg}`} />
                                        </div>
                                        <div className="relative">
                                            <Phone className={`absolute left-3 top-3 ${subTextColor}`} size={18} />
                                            <input type="text" required placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} className={`w-full pl-10 p-3 border rounded-xl outline-none transition-colors font-medium placeholder:opacity-50 ${inputBg}`} />
                                        </div>
                                    </div>
                                    <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-midnight/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                        <label className={`text-[10px] uppercase font-black ${subTextColor}`}>Select Teaching Categories <span className="text-statusRed">*</span></label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {VEHICLE_OPTIONS.map(v => {
                                                const isSelected = selectedVehicles.includes(v);
                                                return (
                                                    <button key={v} type="button" onClick={() => toggleVehicle(v)} className={`p-3 rounded-lg border flex items-center justify-between transition-all text-xs font-bold ${isSelected ? 'bg-primary text-white border-primary' : `${isDark ? 'bg-transparent text-textGrey border-gray-700 hover:border-gray-500' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}`}>
                                                        <div className="flex items-center gap-3"><Car size={16} /><span>{v}</span></div>{isSelected && <Check size={16} />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* --- 4. SUBMIT BUTTON (Collapsible) --- */}
                    <AnimatePresence initial={false}>
                        {!isStudentInviteMode && (
                            <motion.div
                                key="submit-btn"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.35, ease: "easeInOut" }}
                                className="overflow-hidden"
                            >
                                <button 
                                    type="submit" 
                                    disabled={loading} 
                                    className="w-full py-4 rounded-xl font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-lg active:scale-[0.98] bg-primary text-white mb-2"
                                >
                                    {loading ? <Loader2 className="animate-spin mx-auto" /> : (isRegistering ? "Create Account" : "Sign In")}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </form>
        </motion.div>

        <motion.button initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }} onClick={onBack} className={`mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${subTextColor} hover:${textColor} transition-all group`}>
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/><span>Choose a different role</span>
        </motion.button>
    </motion.div>
  );
}
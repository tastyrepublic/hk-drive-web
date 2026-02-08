import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../firebase';
import { 
  updateProfile, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  PhoneAuthProvider, 
  linkWithCredential, 
  updatePhoneNumber,
  type ConfirmationResult
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  User as UserIcon, Save, Loader2, 
  ShieldCheck, AlertCircle, Check, Smartphone 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  userProfile: any;
  theme: 'dark' | 'light';
}

const formatPhoneForFirebase = (phone: string) => {
    let clean = phone.replace(/\D/g, ''); 
    if (clean.length === 8) return `+852${clean}`;
    if (clean.startsWith('852') && clean.length === 11) return `+${clean}`;
    return `+${clean}`;
};

export function StudentSettings({ userProfile, theme }: Props) {
  const [name, setName] = useState(userProfile?.name || '');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const [isLinkingPhone, setIsLinkingPhone] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'input' | 'verify'>('input');
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';
  const inputClass = isDark ? 'bg-midnight border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900';

  // --- ACTIONS ---
  const handleSaveProfile = async () => {
    setLoading(true); setError(''); setSuccessMsg('');
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("No user found");
        await updateDoc(doc(db, "users", user.uid), { name: name });
        await updateProfile(user, { displayName: name });
        setSuccessMsg("Profile updated successfully!");
        setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
        setError("Failed to update profile: " + err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!isLinkingPhone) return;
    const container = document.getElementById('recaptcha-settings');
    if (container && !recaptchaVerifierRef.current) {
        try {
            auth.languageCode = 'zh-HK';
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-settings', {
                'size': 'invisible', 'callback': () => {} 
            });
        } catch (e) { console.error("Recaptcha init error:", e); }
    }
  }, [isLinkingPhone]);

  const handleSendCode = async () => {
    setLoading(true); setError('');
    try {
        const formatted = formatPhoneForFirebase(newPhone);
        if (!recaptchaVerifierRef.current) throw new Error("Security check not ready.");
        const confirmation = await signInWithPhoneNumber(auth, formatted, recaptchaVerifierRef.current);
        setConfirmationResult(confirmation);
        setPhoneStep('verify');
    } catch (err: any) {
        setError(err.message.replace('Firebase: ', ''));
        if (recaptchaVerifierRef.current) {
            try { recaptchaVerifierRef.current.clear(); } catch(e) {}
            recaptchaVerifierRef.current = null;
        }
    } finally { setLoading(false); }
  };

  const handleVerifyCode = async () => {
    setLoading(true); setError('');
    try {
        if (!confirmationResult) throw new Error("Session expired.");
        const user = auth.currentUser;
        if (!user) throw new Error("Not logged in.");
        const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otp);
        const isPhoneProvider = user.providerData.some(p => p.providerId === 'phone');
        if (isPhoneProvider) await updatePhoneNumber(user, credential);
        else await linkWithCredential(user, credential);
        await updateDoc(doc(db, "users", user.uid), { phone: formatPhoneForFirebase(newPhone) });
        setSuccessMsg("Phone linked successfully!");
        setIsLinkingPhone(false); setPhoneStep('input'); setNewPhone(''); setOtp('');
    } catch (err: any) {
        setError(err.code === 'auth/credential-already-in-use' ? "Number already in use." : "Verification failed.");
    } finally { setLoading(false); }
  };

  const currentPhone = auth.currentUser?.phoneNumber || userProfile?.phone;

  return (
    <div className="pb-20">
      <AnimatePresence>
        {successMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-500 font-bold mb-6">
                <Check size={20} /> {successMsg}
            </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* COLUMN 1: PROFILE INFO (50% Width) */}
        <div className="space-y-6">
          <div className={`p-8 rounded-3xl border shadow-lg sticky top-24 ${cardClass}`}>
            <h2 className="text-xl font-black flex items-center gap-2 mb-8">
                <UserIcon size={24} className="text-primary" /> Profile Info
            </h2>
            <div className="space-y-6">
                <div>
                    <label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Full Name</label>
                    <input 
                        type="text" value={name} onChange={e => setName(e.target.value)} 
                        className={`w-full mt-2 p-4 rounded-2xl outline-none border transition-all focus:border-primary text-base font-bold ${inputClass}`}
                        placeholder="Your Name"
                    />
                </div>
                <div className="opacity-60 cursor-not-allowed">
                    <label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Email Address</label>
                    <input 
                        type="text" value={userProfile?.email || auth.currentUser?.email || ''} disabled 
                        className={`w-full mt-2 p-4 rounded-2xl border bg-black/5 dark:bg-white/5 border-transparent text-base font-bold ${isDark ? 'text-white/50' : 'text-black/50'}`}
                    />
                </div>
                <button 
                    onClick={handleSaveProfile} disabled={loading || name === userProfile?.name}
                    className="w-full mt-4 py-4 rounded-2xl bg-primary text-white font-black hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Save Changes
                </button>
            </div>
          </div>
        </div>

        {/* COLUMN 2: SECURITY (50% Width) */}
        <div className="space-y-6">
          <div className={`p-8 rounded-3xl border shadow-lg ${cardClass}`}>
            <h2 className="text-xl font-black flex items-center gap-2 mb-8">
                <ShieldCheck size={24} className="text-primary" /> Login Methods
            </h2>
            
            <div className={`p-6 rounded-3xl border ${isDark ? 'bg-midnight/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${currentPhone ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                            <Smartphone size={28} />
                        </div>
                        <div>
                            <div className="font-black text-lg leading-tight">Phone Auth</div>
                            <div className="text-sm font-bold opacity-50">{currentPhone || "Not linked"}</div>
                        </div>
                    </div>
                    {!isLinkingPhone && (
                        <button 
                            onClick={() => setIsLinkingPhone(true)} 
                            className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black hover:brightness-110 transition-all shadow-md shadow-primary/20"
                        >
                            {currentPhone ? 'Update' : 'Link'}
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {isLinkingPhone && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-8 pt-8 border-t border-gray-800/20 space-y-6">
                                <div id="recaptcha-settings"></div>
                                
                                {phoneStep === 'input' ? (
                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase tracking-widest opacity-50">New Phone Number</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="e.g. 9123 4567"
                                                className={`flex-1 p-4 rounded-2xl outline-none border focus:border-primary text-base font-bold ${inputClass}`}
                                            />
                                            <button 
                                                onClick={handleSendCode} disabled={!newPhone || loading}
                                                className="px-6 bg-primary text-white rounded-2xl font-black disabled:opacity-50"
                                            >
                                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Send'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-widest opacity-50">SMS Code</label>
                                            <button onClick={() => setPhoneStep('input')} className="text-xs font-black text-primary hover:underline">Change</button>
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="000000" maxLength={6}
                                                className={`flex-1 p-4 rounded-2xl outline-none border focus:border-primary text-center tracking-[0.5em] font-black text-2xl ${inputClass}`}
                                            />
                                            <button 
                                                onClick={handleVerifyCode} disabled={otp.length !== 6 || loading}
                                                className="px-6 bg-green-500 text-white rounded-2xl font-black disabled:opacity-50"
                                            >
                                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Link'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="p-4 rounded-2xl bg-statusRed/10 border border-statusRed/20 text-xs text-statusRed flex items-center gap-3 font-bold">
                                        <AlertCircle size={18} /> {error}
                                    </div>
                                )}

                                <button onClick={() => setIsLinkingPhone(false)} className="text-xs font-black text-textGrey hover:text-white transition-colors w-full text-center mt-2 uppercase tracking-widest">
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { auth, db } from '../../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  User, Mail, Shield, Edit2, Save, X, Loader2, 
  Phone, Check, Smartphone 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  userProfile: any;
  userEmail: string | null;
  profiles: any[];
  instructors: Record<string, any>;
  theme: 'dark' | 'light';
}

export function ProfileView({ 
  userProfile, userEmail, profiles, instructors, theme 
}: Props) {
  
  // State for Editing
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(userProfile?.name || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-midnight border-gray-700 focus:border-white' : 'bg-gray-50 border-gray-200 focus:border-gray-400';

  // SAVE HANDLER
  const handleSave = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
        const user = auth.currentUser;
        if (user) {
            // Update Auth & DB
            await updateProfile(user, { displayName: newName });
            await updateDoc(doc(db, "users", user.uid), { name: newName });
            setSuccess("Updated!");
            setTimeout(() => setSuccess(''), 2000);
            setIsEditing(false);
        }
    } catch (error) {
        console.error("Update failed", error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="pb-20 grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* COLUMN 1: IDENTITY CARD (Now with Edit & Phone) */}
      <div className="space-y-6">
        <div className={`p-8 rounded-3xl border shadow-lg overflow-hidden sticky top-24 ${cardClass}`}>
            
            {/* Header / Avatar */}
            <div className="relative z-10 flex flex-col items-center text-center gap-6">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl text-white relative group">
                    <User size={48} />
                    {/* Success Badge */}
                    <AnimatePresence>
                        {success && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -top-2 -right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg">
                                <Check size={14} strokeWidth={4} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* EDIT FORM */}
                <div className="w-full space-y-4">
                    {isEditing ? (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                            <input 
                                value={newName} 
                                onChange={(e) => setNewName(e.target.value)} 
                                className={`w-full p-3 text-center rounded-xl border outline-none font-bold text-lg ${inputBg}`}
                                autoFocus
                            />
                            <div className="flex gap-2 justify-center">
                                <button onClick={() => setIsEditing(false)} className={`p-3 rounded-xl ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                    <X size={20} />
                                </button>
                                <button onClick={handleSave} disabled={loading} className="px-6 py-3 rounded-xl bg-primary text-white font-bold flex items-center gap-2 hover:brightness-110">
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
                                    Save
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black tracking-tight">{userProfile?.name || 'Student'}</h2>
                            <button onClick={() => { setNewName(userProfile?.name); setIsEditing(true); }} className={`text-xs font-bold text-primary hover:underline flex items-center justify-center gap-1 w-full opacity-0 group-hover:opacity-100 transition-opacity`}>
                                Edit Name <Edit2 size={10} />
                            </button>
                        </div>
                    )}
                </div>

                {/* DETAILS LIST (Email & Phone) */}
                <div className={`w-full space-y-3 pt-6 border-t ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    
                    {/* Email */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
                        <div className="flex items-center gap-3">
                            <Mail size={16} className={textMuted} />
                            <span className="text-sm font-bold opacity-80 truncate max-w-[160px]">{userEmail}</span>
                        </div>
                    </div>

                    {/* Phone (Read-Only) */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 relative overflow-hidden">
                        <div className="flex items-center gap-3">
                            <Phone size={16} className={textMuted} />
                            <span className="text-sm font-bold opacity-80">{userProfile?.phone || 'Not Linked'}</span>
                        </div>
                        <div className="px-2 py-1 rounded-md bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Smartphone size={10} /> Linked
                        </div>
                    </div>
                    
                    {/* Helper Text */}
                    <p className="text-[10px] text-center opacity-40 px-4 leading-relaxed">
                        To update your phone number, please contact your instructor to verify and re-invite you.
                    </p>
                </div>
                
                {/* Trigger Edit (If not editing) */}
                {!isEditing && (
                     <button 
                        onClick={() => { setNewName(userProfile?.name); setIsEditing(true); }}
                        className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-black/5 text-black/30 hover:text-black'}`}
                    >
                        <Edit2 size={16} />
                    </button>
                )}
            </div>

            {/* Background Decor */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>

      {/* COLUMN 2: INSTRUCTORS (Same as before) */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold px-1 flex items-center gap-2">
            <Shield size={20} className="text-primary" /> Linked Instructors
        </h3>
        
        <div className="grid gap-4">
            {profiles.map((profile, index) => {
                const instructor = instructors[profile.teacherId];
                return (
                    <div key={index} className={`p-6 rounded-3xl border ${cardClass} flex items-center justify-between group hover:border-primary/50 transition-colors shadow-sm`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                                <Shield size={24} className="text-primary opacity-80" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg leading-tight">{instructor?.name || 'Unknown Instructor'}</h4>
                                <p className={`text-xs uppercase tracking-wider font-bold mt-1 ${textMuted}`}>
                                    {profile.vehicle || 'Vehicle Not Set'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-black text-primary">{profile.balance}</div>
                            <div className={`text-[10px] uppercase font-bold ${textMuted}`}>Credits</div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}
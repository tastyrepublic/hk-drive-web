import { User, Mail, Shield, Edit } from 'lucide-react';

interface Props {
  userProfile: any;
  userEmail: string | null;
  profiles: any[];
  instructors: Record<string, any>;
  theme: 'dark' | 'light';
  onEdit: () => void;
}

export function ProfileView({ 
  userProfile, userEmail, profiles, instructors, theme, onEdit 
}: Props) {
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="pb-20 grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* COLUMN 1: IDENTITY CARD (50% Width) */}
      <div className="space-y-6">
        <div className={`p-8 rounded-3xl border shadow-lg overflow-hidden sticky top-24 ${cardClass}`}>
            <div className="relative z-10 flex flex-col items-center text-center gap-6">
                {/* Avatar */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl text-white">
                    <User size={48} />
                </div>
                
                {/* Info */}
                <div>
                    <h2 className="text-2xl font-black tracking-tight">{userProfile?.name || 'Student'}</h2>
                    <div className={`flex items-center justify-center gap-2 text-sm font-medium mt-2 ${textMuted}`}>
                        <Mail size={16} />
                        {userEmail}
                    </div>
                </div>
                
                {/* Edit Button */}
                <button 
                    onClick={onEdit}
                    className={`w-full px-4 py-4 rounded-2xl border font-bold text-sm transition-all flex items-center justify-center gap-2 ${isDark ? 'border-gray-700 hover:bg-white/10' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                    <Edit size={18} /> Edit Profile
                </button>
            </div>

            {/* Background Decor */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>

      {/* COLUMN 2: INSTRUCTORS (50% Width) */}
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
            
            {profiles.length === 0 && (
                <div className={`p-10 rounded-3xl border border-dashed text-center flex flex-col items-center justify-center gap-3 ${isDark ? 'border-gray-800 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
                    <Shield size={32} className="opacity-20" />
                    <p className="font-medium">No instructors linked yet.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
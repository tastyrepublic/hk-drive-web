import { 
  LogOut, Sun, Moon, User, Phone, Mail, Car 
} from 'lucide-react';

interface Props {
  userProfile: any;
  userEmail: string | null;
  profiles: any[];
  instructors: Record<string, any>; // Updated from single instructor to Map
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onLogout: () => void;
}

export function ProfileView({ 
  userProfile, 
  userEmail, 
  profiles, 
  instructors, 
  theme, 
  toggleTheme, 
  onLogout 
}: Props) {
  const isDark = theme === 'dark';
  const cardColor = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';

  return (
    <div className="space-y-6">
        {/* USER CARD */}
        <div className={`p-6 rounded-2xl border text-center shadow-sm ${cardColor}`}>
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold !text-white shadow-lg shadow-primary/20">
                {userProfile?.name?.[0] || 'S'}
            </div>
            
            <h2 className="text-xl font-bold">{userProfile?.name || 'Student'}</h2>
            <div className="flex items-center justify-center gap-2 text-sm opacity-60 mt-1">
                <Phone size={14} className="text-primary" /> <span>{userProfile?.phone || 'No Phone'}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm opacity-60 mt-1 mb-2">
                <Mail size={14} className="text-primary" /> <span>{userProfile?.email || userEmail}</span>
            </div>
        </div>

        {/* APP PREFERENCES */}
        <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest opacity-60 px-1">Preferences</label>
            <div className={`rounded-xl border overflow-hidden shadow-sm ${cardColor}`}>
                <button onClick={toggleTheme} className={`w-full p-4 flex items-center justify-between ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden text-primary">
                            <div className="absolute inset-0 bg-primary opacity-15"></div>
                            {isDark ? <Moon size={20} className="relative z-10" /> : <Sun size={20} className="relative z-10" />}
                        </div>
                        <span className="font-medium">App Theme</span>
                    </div>
                    <span className="text-xs font-bold text-primary uppercase">{theme} Mode</span>
                </button>
            </div>
        </div>

        {/* LINKED ACCOUNTS */}
        <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest opacity-60 px-1">Linked Instructors</label>
            <div className="space-y-2">
                {profiles.length > 0 ? profiles.map(p => {
                    // Look up the specific instructor name using the teacherId from THIS profile
                    const instructorData = instructors[p.teacherId];
                    
                    return (
                        <div key={p.id} className={`p-4 rounded-xl border flex items-center justify-between shadow-sm ${cardColor}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden text-primary">
                                    <div className="absolute inset-0 bg-primary opacity-15"></div>
                                    <User size={18} className="relative z-10" />
                                </div>
                                <div>
                                    {/* Displays the unique instructor name for this specific account */}
                                    <div className="font-bold text-sm">
                                        {instructorData?.name || "Driving Instructor"}
                                    </div>
                                    <div className="text-xs opacity-50 flex items-center gap-1.5 mt-0.5">
                                         <Car size={14} className="opacity-70" /> 
                                         <span>{p.vehicle || 'Standard'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-black text-primary text-lg">{p.balance}</div>
                                <div className="text-[10px] opacity-50 uppercase font-bold tracking-tighter">Credits</div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className={`p-6 rounded-xl border border-dashed text-center opacity-50 text-sm ${isDark ? 'border-gray-800' : 'border-gray-300'}`}>
                        No instructors linked yet.
                    </div>
                )}
            </div>
        </div>

        {/* ACTIONS */}
        <button 
            onClick={onLogout} 
            className="w-full py-4 rounded-xl border border-red-500/30 text-red-500 font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
            <LogOut size={18} /> Log Out
        </button>
    </div>
  );
}
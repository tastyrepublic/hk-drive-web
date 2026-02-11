import { useState, useEffect } from 'react';
import { SettingsSidebar } from './SettingsSidebar';
import { User as UserIcon, Clock, Landmark, ShieldCheck, Save, Loader2, Car, Check, Layers } from 'lucide-react';
import { VEHICLE_TYPES, LESSON_DURATIONS } from '../../constants/list'; 

interface Props {
  profile: any;
  setProfile: (p: any) => void;
  onSave: (updatedProfile?: any) => Promise<void>; 
  isLoading: boolean;
}

export function SettingsView({ profile, setProfile, onSave, isLoading }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'payouts' | 'subscription'>('general');
  
  // --- LOCAL DRAFT STATE ---
  const [draftProfile, setDraftProfile] = useState(profile);

  // Sync draft if the global profile changes
  useEffect(() => {
    setDraftProfile(profile);
  }, [profile]);

  // --- CALCULATE MODIFIED STATE LOCALLY ---
  const isModified = JSON.stringify(draftProfile) !== JSON.stringify(profile);

  // --- VALIDATION CHECK ---
  const hasVehicleTypes = draftProfile.vehicleTypes && draftProfile.vehicleTypes.length > 0;

  // --- TOGGLE VEHICLE HELPER ---
  const toggleVehicle = (vehicleId: string) => {
    const currentList = draftProfile.vehicleTypes || []; 
    if (currentList.includes(vehicleId)) {
      setDraftProfile({ ...draftProfile, vehicleTypes: currentList.filter((id: string) => id !== vehicleId) });
    } else {
      setDraftProfile({ ...draftProfile, vehicleTypes: [...currentList, vehicleId] });
    }
  };

  // --- HANDLE SAVE ---
  const handleSave = async () => {
    if (!hasVehicleTypes) return; 
    setProfile(draftProfile);
    await onSave(draftProfile);
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 transition-all duration-300">
      <SettingsSidebar activeTab={activeSubTab} onTabChange={setActiveSubTab} />

      <div className="flex-1 space-y-6">
        {activeSubTab === 'general' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* INSTRUCTOR DETAILS */}
            <div className="bg-slate p-6 rounded-xl border border-gray-800 shadow-sm transition-colors duration-300">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <UserIcon className="text-orange" /> Instructor Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-textGrey uppercase font-bold tracking-wider px-1">Display Name</label>
                  <input 
                    type="text" 
                    value={draftProfile.name || ''} 
                    onChange={e => setDraftProfile({ ...draftProfile, name: e.target.value })} 
                    className="w-full mt-1 p-3 bg-midnight border border-gray-700 rounded-lg text-white focus:border-orange outline-none transition-all duration-300" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-textGrey uppercase font-bold tracking-wider px-1">Phone</label>
                  <input 
                    type="text" 
                    value={draftProfile.phone || ''} 
                    onChange={e => setDraftProfile({ ...draftProfile, phone: e.target.value })} 
                    className="w-full mt-1 p-3 bg-midnight border border-gray-700 rounded-lg text-white focus:border-orange outline-none transition-all duration-300" 
                  />
                </div>
              </div>
            </div>

            {/* --- TEACHING CATEGORIES --- */}
            <div className={`p-6 rounded-xl border shadow-sm transition-colors duration-300 ${!hasVehicleTypes ? 'bg-statusRed/5 border-statusRed' : 'bg-slate border-gray-800'}`}>
                <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${!hasVehicleTypes ? 'text-statusRed' : 'text-white'}`}>
                    <Car className={!hasVehicleTypes ? 'text-statusRed' : 'text-orange'} /> Teaching Categories
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VEHICLE_TYPES.map(v => {
                    const isSelected = (draftProfile.vehicleTypes || []).includes(v.id);
                    return (
                    <button
                        key={v.id}
                        onClick={() => toggleVehicle(v.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isSelected 
                            ? 'bg-orange/10 border-orange text-white' 
                            : 'bg-midnight border-gray-700 text-textGrey hover:bg-gray-800'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                        <Car size={18} className={isSelected ? 'text-orange' : 'opacity-50'} />
                        <span className="font-bold text-sm">{v.label}</span>
                        </div>
                        {isSelected && <Check size={18} className="text-orange" />}
                    </button>
                    );
                })}
                </div>
                {!hasVehicleTypes && (
                    <p className="text-xs text-statusRed font-bold px-1 mt-3 flex items-center gap-1 animate-pulse">
                       * You must select at least one vehicle category.
                    </p>
                )}
            </div>

            {/* STANDARD DURATION */}
            <div className="bg-slate p-6 rounded-xl border border-gray-800 shadow-sm transition-colors duration-300">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="text-orange" /> Standard Duration
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                {LESSON_DURATIONS.map(dur => (
                  <button 
                    key={dur} 
                    onClick={() => setDraftProfile({ ...draftProfile, lessonDuration: dur })} 
                    className={`p-4 rounded-xl border font-bold text-lg transition-all duration-300 ${
                      draftProfile.lessonDuration === dur 
                        ? 'bg-orange border-orange text-white shadow-lg' 
                        : 'bg-midnight border-gray-700 text-textGrey hover:border-gray-500'
                    }`}
                  >
                    {dur} min
                  </button>
                ))}
              </div>
            </div>

            {/* UPDATED: DEFAULT DOUBLE SESSION SETTING */}
            <div className="bg-slate p-6 rounded-xl border border-gray-800 shadow-sm transition-colors duration-300">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Layers className="text-orange" /> Lesson Defaults
              </h2>
              
              <div className="flex items-center justify-between p-4 bg-midnight rounded-xl border border-gray-700">
                 <div className="space-y-1">
                    <div className="font-bold text-white">Default to Double Session</div>
                    <div className="text-xs text-textGrey">
                        Automatically enable "Double Session" when creating a new lesson.
                    </div>
                 </div>
                 
                 <button 
                    onClick={() => setDraftProfile({ 
                        ...draftProfile, 
                        defaultDoubleLesson: !draftProfile.defaultDoubleLesson 
                    })}
                    className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ease-in-out relative ${
                        draftProfile.defaultDoubleLesson 
                        ? 'bg-orange' 
                        : 'bg-gray-700'
                    }`}
                 >
                     <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                         draftProfile.defaultDoubleLesson ? 'translate-x-6' : 'translate-x-0'
                     }`} />
                 </button>
              </div>
            </div>

          </div>
        )}

        {activeSubTab === 'payouts' && (
          <div className="bg-slate p-6 rounded-xl border border-gray-800 shadow-sm animate-in fade-in duration-300 transition-colors">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Landmark className="text-orange" /> Bank Account
            </h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-textGrey uppercase font-bold tracking-wider px-1">Bank Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. HSBC" 
                  value={draftProfile.bankName || ''} 
                  onChange={e => setDraftProfile({ ...draftProfile, bankName: e.target.value })} 
                  className="w-full mt-1 p-3 bg-midnight border border-gray-700 rounded-lg text-white focus:border-orange outline-none transition-all duration-300" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-textGrey uppercase font-bold tracking-wider px-1">Account Number</label>
                <input 
                  type="text" 
                  placeholder="xxx-xxxxxx-xxx" 
                  value={draftProfile.accountNo || ''} 
                  onChange={e => setDraftProfile({ ...draftProfile, accountNo: e.target.value })} 
                  className="w-full mt-1 p-3 bg-midnight border border-gray-700 rounded-lg text-white focus:border-orange outline-none transition-all duration-300" 
                />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'subscription' && (
          <div className="bg-slate p-6 rounded-xl border border-gray-800 shadow-sm animate-in fade-in duration-300 transition-colors">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="text-orange" /> Current Plan
            </h2>
            <div className="p-6 bg-midnight rounded-xl border border-gray-800 mb-6 transition-colors duration-300">
              <div className="text-orange font-bold text-lg uppercase tracking-wider">PRO LICENSE</div>
              <div className="text-textGrey text-sm mt-1">Status: <span className="text-statusGreen font-bold">Active</span></div>
            </div>
            <button disabled className="w-full py-3 bg-gray-700 text-gray-400 rounded-xl font-bold cursor-default opacity-50 transition-all duration-300">
              Manage Subscription (Coming Soon)
            </button>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave} 
            disabled={isLoading || !isModified || !hasVehicleTypes}
            className="w-full md:w-auto h-[52px] min-w-[180px] px-10 bg-statusGreen text-black rounded-xl font-bold text-lg transition-all duration-300 shadow-lg flex justify-center items-center gap-2 hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : <><Save size={20} /><span>Save Profile</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}
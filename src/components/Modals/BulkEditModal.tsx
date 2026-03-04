import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Loader2, Check, ChevronDown, MapPin, Edit2, AlertTriangle, Coffee } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
    LESSON_LOCATIONS, EXAM_CENTER_PICKUPS, getExamCenterLabel, getVehicleLabel, BLOCK_REASONS
} from '../../constants/list';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  slots: any[]; // <--- NEW: Pass the full slots array so we can analyze it!
  onApply: (updates: any) => Promise<void>;
  isSaving: boolean;
  teacherVehicles: string[];
  teacherExamCenters: string[];
}

export function BulkEditModal({ isOpen, onClose, selectedIds, slots, onApply, isSaving, teacherVehicles, teacherExamCenters }: Props) {
  const { t } = useTranslation();

  // --- SMART CONTEXT ANALYSIS ---
  const selectedSlots = slots.filter(s => selectedIds.includes(s.id));
  const allBlocked = selectedSlots.length > 0 && selectedSlots.every(s => s.status === 'Blocked');
  const allLessons = selectedSlots.length > 0 && selectedSlots.every(s => s.status !== 'Blocked');
  const isMixed = selectedSlots.length > 0 && !allBlocked && !allLessons;

  // Toggles for Lesson fields
  const [updateStatus, setUpdateStatus] = useState(false);
  const [updateVehicle, setUpdateVehicle] = useState(false);
  const [updateLocation, setUpdateLocation] = useState(false);

  // Toggle for Blocked fields
  const [updateReason, setUpdateReason] = useState(false);

  // Field Values
  const [status, setStatus] = useState<'Draft' | 'Open'>('Draft');
  const [vehicle, setVehicle] = useState(teacherVehicles[0] || '1a');
  const [examCenter, setExamCenter] = useState('');
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('block_reason.lunch');

  // Dropdown States
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showCenterDropdown, setShowCenterDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setUpdateStatus(false); setUpdateVehicle(false); setUpdateLocation(false); setUpdateReason(false);
      setShowVehicleDropdown(false); setShowCenterDropdown(false); setShowLocationDropdown(false);
    } else {
        setVehicle(teacherVehicles[0] || '1a');
        if (teacherExamCenters.length > 0) {
            const firstCenter = teacherExamCenters[0];
            setExamCenter(firstCenter);
            const allowed = (EXAM_CENTER_PICKUPS as any)[firstCenter] || [];
            setLocation(allowed.length > 0 ? LESSON_LOCATIONS.find(l => allowed.includes(l.id))?.label || '' : '');
        }
    }
  }, [isOpen, teacherVehicles, teacherExamCenters]);

  const allowedLocationIds = examCenter ? (EXAM_CENTER_PICKUPS as any)[examCenter] : null;
  const availableLocations = allowedLocationIds ? LESSON_LOCATIONS.filter(loc => allowedLocationIds.includes(loc.id)) : LESSON_LOCATIONS;
  const filteredLocations = availableLocations.filter(loc => loc.label.toLowerCase().includes((location || '').toLowerCase()));

  const handleApply = async () => {
      let updates: any = {};
      
      if (allLessons) {
          if (updateStatus) updates.status = status;
          if (updateVehicle) updates.type = vehicle;
          if (updateLocation) {
              updates.examCenter = examCenter;
              updates.location = location;
          }
      } else if (allBlocked) {
          if (updateReason) updates.type = reason; // Block reasons are saved in the 'type' field
      }

      await onApply(updates);
  };

  const hasChanges = allLessons ? (updateStatus || updateVehicle || updateLocation) : (allBlocked && updateReason);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Edit Slots" maxWidth="max-w-md">
      <div className="space-y-4">
        
        {/* --- DYNAMIC HEADER --- */}
        {isMixed ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-3">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span className="text-sm font-bold leading-snug">
                    You have selected a mix of Lessons and Blocked time. Please select ONLY Lessons OR ONLY Blocks to edit them.
                </span>
            </div>
        ) : (
            <div className={`border p-3 rounded-lg flex items-center gap-3 ${allBlocked ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-orange/10 border-orange/20 text-orange'}`}>
                {allBlocked ? <Coffee size={18} /> : <Edit2 size={18} />}
                <span className="text-sm font-bold">You are editing {selectedIds.length} {allBlocked ? 'Blocked slots' : 'Lessons'}.</span>
            </div>
        )}

        {/* --- MIXED STATE (NO TOOLS) --- */}
        {isMixed && (
            <button onClick={onClose} className="w-full mt-2 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg font-bold transition-colors">
                Cancel & Reselect
            </button>
        )}

        {/* --- ALL BLOCKS TOOLS --- */}
        {allBlocked && !isMixed && (
            <div className={`p-3 rounded-xl border transition-colors relative z-[50] ${updateReason ? 'bg-midnight border-red-500/50' : 'bg-transparent border-gray-800'}`}>
                <div className="flex items-center justify-between cursor-pointer mb-2" onClick={() => setUpdateReason(!updateReason)}>
                    <span className={`text-sm font-bold ${updateReason ? 'text-white' : 'text-textGrey'}`}>Change Block Reason</span>
                    <button type="button" className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${updateReason ? 'bg-red-500' : 'bg-gray-700'}`}>
                        <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${updateReason ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                </div>
                
                {updateReason && (
                    <div className="mt-3 pt-3 border-t border-gray-800 animate-in fade-in zoom-in-95 duration-200 flex flex-wrap gap-2">
                        {BLOCK_REASONS.map(r => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => setReason(r.id)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                                    reason === r.id ? 'bg-red-500 text-white border-red-500' : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                                }`}
                            >
                                {t(r.label)}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* --- ALL LESSONS TOOLS --- */}
        {allLessons && !isMixed && (
            <>
                {/* 1. STATUS */}
                <div className={`p-3 rounded-xl border transition-colors ${updateStatus ? 'bg-midnight border-orange/50' : 'bg-transparent border-gray-800'}`}>
                    <div className="flex items-center justify-between cursor-pointer mb-2" onClick={() => setUpdateStatus(!updateStatus)}>
                        <span className={`text-sm font-bold ${updateStatus ? 'text-white' : 'text-textGrey'}`}>Change Status</span>
                        <button type="button" className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${updateStatus ? 'bg-orange' : 'bg-gray-700'}`}>
                            <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${updateStatus ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    {updateStatus && (
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                            <button onClick={() => setStatus('Draft')} className={`py-2 rounded-lg text-xs font-bold transition-all border ${status === 'Draft' ? 'bg-purple-500 text-white border-purple-500' : 'bg-transparent text-textGrey border-gray-700 hover:border-gray-500'}`}>Draft</button>
                            <button onClick={() => setStatus('Open')} className={`py-2 rounded-lg text-xs font-bold transition-all border ${status === 'Open' ? 'bg-orange text-white border-orange' : 'bg-transparent text-textGrey border-gray-700 hover:border-gray-500'}`}>Open</button>
                        </div>
                    )}
                </div>

                {/* 2. VEHICLE CATEGORY */}
                <div className={`p-3 rounded-xl border transition-colors relative ${showVehicleDropdown ? 'z-[70]' : 'z-[50]'} ${updateVehicle ? 'bg-midnight border-orange/50' : 'bg-transparent border-gray-800'}`}>
                    <div className="flex items-center justify-between cursor-pointer mb-2 select-none" onClick={() => setUpdateVehicle(!updateVehicle)}>
                        <span className={`text-sm font-bold ${updateVehicle ? 'text-white' : 'text-textGrey'}`}>Change Vehicle Category</span>
                        <button type="button" className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${updateVehicle ? 'bg-orange' : 'bg-gray-700'}`}>
                            <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${updateVehicle ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    {updateVehicle && (
                        <div className="mt-3 pt-3 border-t border-gray-800 animate-in fade-in zoom-in-95 duration-200 relative">
                            <div onClick={() => setShowVehicleDropdown(!showVehicleDropdown)} className={`w-full pl-4 pr-3 p-3 bg-slate border rounded-lg text-white cursor-pointer select-none flex items-center justify-between transition-colors ${showVehicleDropdown ? 'border-orange' : 'border-gray-700 hover:border-gray-500'}`}>
                                <span className="text-sm font-bold truncate mr-2">{t(getVehicleLabel(vehicle)).replace('Private Car', 'Car').replace('Light Goods', 'Van')}</span>
                                <ChevronDown size={16} className={`text-textGrey shrink-0 transition-transform ${showVehicleDropdown ? 'rotate-180' : ''}`} />
                            </div>
                            {showVehicleDropdown && (
                                <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate border border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col z-50 select-none origin-bottom animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    {teacherVehicles.map((vId) => (
                                        <div key={vId} onClick={() => { setVehicle(vId); setShowVehicleDropdown(false); }} className={`p-3 text-sm font-bold cursor-pointer transition-colors border-b border-gray-800 last:border-0 flex items-center justify-between ${vehicle === vId ? 'bg-orange/10 text-orange' : 'text-white hover:bg-midnight'}`}>
                                            <span>{t(getVehicleLabel(vId)).replace('Private Car', 'Car').replace('Light Goods', 'Van')}</span>
                                            {vehicle === vId && <Check size={16} />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. EXAM CENTER & LOCATION */}
                <div className={`p-3 rounded-xl border transition-colors relative ${showCenterDropdown || showLocationDropdown ? 'z-[60]' : 'z-[40]'} ${updateLocation ? 'bg-midnight border-orange/50' : 'bg-transparent border-gray-800'}`}>
                    <div className="flex items-center justify-between cursor-pointer mb-2 select-none" onClick={() => setUpdateLocation(!updateLocation)}>
                        <span className={`text-sm font-bold ${updateLocation ? 'text-white' : 'text-textGrey'}`}>Change Route & Pickup</span>
                        <button type="button" className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${updateLocation ? 'bg-orange' : 'bg-gray-700'}`}>
                            <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${updateLocation ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    {updateLocation && (
                        <div className="mt-3 pt-3 border-t border-gray-800 animate-in fade-in zoom-in-95 duration-200 space-y-3">
                            <div className="relative z-30">
                                <div onClick={() => setShowCenterDropdown(!showCenterDropdown)} className={`w-full pl-4 pr-3 p-3 bg-slate border rounded-lg text-white cursor-pointer select-none flex items-center justify-between transition-colors ${showCenterDropdown ? 'border-orange' : 'border-gray-700 hover:border-gray-500'}`}>
                                    <span className={`text-sm font-bold truncate mr-2 ${!examCenter ? 'text-gray-500' : ''}`}>{examCenter ? t(getExamCenterLabel(examCenter)) : t("Select Exam Center...")}</span>
                                    <ChevronDown size={16} className={`text-textGrey shrink-0 transition-transform ${showCenterDropdown ? 'rotate-180' : ''}`} />
                                </div>
                                {showCenterDropdown && (
                                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate border border-gray-700 rounded-lg shadow-xl z-50 select-none overflow-hidden flex flex-col max-h-40 overflow-y-auto custom-scrollbar origin-bottom animate-in fade-in slide-in-from-bottom-2 duration-200">
                                        {teacherExamCenters.map((centerId) => (
                                            <div key={centerId} onClick={() => {
                                                    const allowedIds = (EXAM_CENTER_PICKUPS as any)[centerId] || [];
                                                    setExamCenter(centerId); 
                                                    setLocation(allowedIds.length > 0 ? LESSON_LOCATIONS.find(l => allowedIds.includes(l.id))?.label || '' : ''); 
                                                    setShowCenterDropdown(false);
                                                }}
                                                className={`p-3 text-sm font-bold cursor-pointer transition-colors border-b border-gray-800 last:border-0 flex items-center justify-between ${examCenter === centerId ? 'bg-orange/10 text-orange' : 'text-white hover:bg-midnight'}`}
                                            >
                                                <span>{t(getExamCenterLabel(centerId))}</span>
                                                {examCenter === centerId && <Check size={16} />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative z-20">
                                <MapPin className="absolute left-3 top-3 text-textGrey z-10" size={18} />
                                <input type="text" disabled={!examCenter} placeholder={!examCenter ? t("Select Exam Center first...") : t("Select valid pickup point...")} value={t(location)} onChange={e => { setLocation(e.target.value); setShowLocationDropdown(true); }} onFocus={() => setShowLocationDropdown(true)} onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)} className={`w-full pl-10 p-3 bg-slate border rounded-lg text-white focus:border-orange outline-none transition-colors ${!examCenter ? 'border-gray-800 opacity-50 cursor-not-allowed' : 'border-gray-700'}`} />
                                {showLocationDropdown && filteredLocations.length > 0 && examCenter && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate border border-gray-700 rounded-lg shadow-xl select-none overflow-hidden max-h-48 overflow-y-auto custom-scrollbar origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                                        {filteredLocations.map(loc => (
                                            <div key={loc.id} onMouseDown={(e) => e.preventDefault()} onClick={() => { setLocation(loc.label); setShowLocationDropdown(false); }} className="p-3 hover:bg-midnight cursor-pointer transition-colors border-b border-gray-800 last:border-0">
                                                <span className="font-bold text-white text-sm">{t(loc.label)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* --- LOCATION SHORTCUT BUTTONS --- */}
                            {examCenter && availableLocations.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {availableLocations.map(loc => (
                                        <button
                                            key={loc.id}
                                            type="button"
                                            onClick={() => setLocation(loc.label)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold select-none transition-all border ${
                                                location === loc.label
                                                    ? 'bg-orange text-white border-orange'
                                                    : 'bg-transparent text-textGrey border-gray-700 hover:border-gray-500 hover:text-white'
                                            }`}
                                        >
                                            {t(loc.label)}
                                        </button>
                                    ))}
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </>
        )}
        
        {/* --- DYNAMIC BUTTON --- */}
        {!isMixed && (
            <button 
                onClick={handleApply} 
                disabled={isSaving || !hasChanges || (allLessons && updateLocation && (!examCenter || !location))} 
                className={`w-full mt-2 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${allBlocked ? 'bg-red-500 hover:bg-red-600' : 'bg-orange hover:bg-orange/80'}`}
            >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Edit2 size={18} />}
                {hasChanges ? `Apply Updates to ${selectedIds.length} ${allBlocked ? 'Blocks' : 'Slots'}` : 'Select a field to update'}
            </button>
        )}

      </div>
    </Modal>
  );
}
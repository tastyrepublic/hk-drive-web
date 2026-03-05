import { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { Loader2, Calendar, ChevronDown, Check, MapPin } from 'lucide-react';
import { TimeSelect } from '../Shared/TimeSelect';
import { useTranslation } from 'react-i18next';

import { 
    LESSON_LOCATIONS, EXAM_CENTER_PICKUPS, getExamCenterLabel, getVehicleLabel
} from '../../constants/list';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: any) => void;
  isGenerating: boolean;
  teacherVehicles: string[];
  defaultDuration: number;
  defaultDouble: boolean;
  teacherExamCenters: string[];
  weekStartDate: Date;
  singleDayMode?: boolean;
}

export function AutoFillModal({ isOpen, onClose, onGenerate, isGenerating, teacherVehicles, defaultDuration, defaultDouble, teacherExamCenters, weekStartDate, singleDayMode }: Props) {
  const { t } = useTranslation();

  // [NEW] Calculate which days are in the past efficiently
  const disabledDays = useMemo(() => {
    if (!weekStartDate) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastDayIds: number[] = [];
    
    // Check all 7 days of the target week (assuming weekStartDate is a Monday)
    for (let i = 0; i < 7; i++) {
        const checkDate = new Date(weekStartDate);
        checkDate.setDate(checkDate.getDate() + i);
        
        if (checkDate < today) {
            // Map our loop index (0-6) to your day IDs (1-6 for Mon-Sat, 0 for Sun)
            const dayId = i === 6 ? 0 : i + 1;
            pastDayIds.push(dayId);
        }
    }
    return pastDayIds;
  }, [weekStartDate]);
  
  const defaultVehicle = teacherVehicles.length > 0 ? teacherVehicles[0] : '1a';
  
  const [config, setConfig] = useState({
    workingDays: [1, 2, 3, 4, 5], 
    startTime: '08:00',
    endTime: '18:00',
    lessonDuration: defaultDuration, 
    isDouble: defaultDouble,         
    vehicleType: defaultVehicle,
    hasLunch: true,          // <-- NEW: Clearer boolean
    lunchStart: '12:30',     // <-- NEW: Selectable start
    lunchEnd: '13:30',       // <-- NEW: Selectable end
    examCenter: '', 
    location: ''    
  });

  useEffect(() => {
    if (isOpen) {
        const defaultCenter = teacherExamCenters && teacherExamCenters.length > 0 ? teacherExamCenters[0] : '';
        const allowedIds = defaultCenter ? (EXAM_CENTER_PICKUPS as any)[defaultCenter] || [] : [];
        const defaultLocation = allowedIds.length > 0 ? LESSON_LOCATIONS.find(l => allowedIds.includes(l.id))?.label || '' : '';

        // --- NEW: Smart Working Days Default ---
        let defaultWorkingDays: number[] = [];
        if (singleDayMode && weekStartDate) {
            defaultWorkingDays = [weekStartDate.getDay()];
        } else {
            defaultWorkingDays = [1, 2, 3, 4, 5].filter(day => !disabledDays.includes(day));
        }

        setConfig({
            workingDays: defaultWorkingDays, 
            startTime: '08:00',
            endTime: '18:00',
            lessonDuration: Number(defaultDuration) || 45,
            isDouble: !!defaultDouble,
            vehicleType: teacherVehicles && teacherVehicles.length > 0 ? teacherVehicles[0] : '1a',
            hasLunch: true,
            lunchStart: '12:30',
            lunchEnd: '13:30',
            examCenter: defaultCenter,
            location: defaultLocation 
        });
    } else {
        // --- NEW: Reset all dropdowns when the modal closes ---
        setShowCenterDropdown(false);
        setShowVehicleDropdown(false);
        setShowLocationDropdown(false); // (Make sure you added this state in the previous step!)
    }
  }, [isOpen, defaultDuration, defaultDouble, teacherVehicles, teacherExamCenters, singleDayMode, weekStartDate, disabledDays]);

  const [showCenterDropdown, setShowCenterDropdown] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const allowedLocationIds = config.examCenter ? EXAM_CENTER_PICKUPS[config.examCenter] : null;
  const availableLocations = allowedLocationIds
    ? LESSON_LOCATIONS.filter(loc => allowedLocationIds.includes(loc.id))
    : LESSON_LOCATIONS;
  const filteredLocations = availableLocations.filter(loc => loc.label.toLowerCase().includes((config.location || '').toLowerCase()));

  const days = [
    { id: 1, label: 'Mon' }, { id: 2, label: 'Tue' }, { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' }, { id: 5, label: 'Fri' }, { id: 6, label: 'Sat' }, { id: 0, label: 'Sun' }
  ];

  const toggleDay = (dayId: number) => {
    setConfig(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(dayId) ? prev.workingDays.filter(d => d !== dayId) : [...prev.workingDays, dayId]
    }));
  };

  // --- THE FIX: Calculate if the user has tweaked the default settings! ---
  const hasChanges = useMemo(() => {
      // Re-calculate what the baseline *should* be
      let expectedWorkingDays: number[] = [];
      if (singleDayMode && weekStartDate) {
          expectedWorkingDays = [weekStartDate.getDay()];
      } else {
          expectedWorkingDays = [1, 2, 3, 4, 5].filter(day => !disabledDays.includes(day));
      }
      
      const expectedCenter = teacherExamCenters && teacherExamCenters.length > 0 ? teacherExamCenters[0] : '';
      const allowedIds = expectedCenter ? (EXAM_CENTER_PICKUPS as any)[expectedCenter] || [] : [];
      const expectedLocation = allowedIds.length > 0 ? LESSON_LOCATIONS.find(l => allowedIds.includes(l.id))?.label || '' : '';
      const expectedVehicle = teacherVehicles && teacherVehicles.length > 0 ? teacherVehicles[0] : '1a';

      // Compare the current config against the baseline
      return config.workingDays.join(',') !== expectedWorkingDays.join(',') ||
             config.startTime !== '08:00' ||
             config.endTime !== '18:00' ||
             config.lessonDuration !== (Number(defaultDuration) || 45) ||
             config.isDouble !== !!defaultDouble ||
             config.vehicleType !== expectedVehicle ||
             config.hasLunch !== true ||
             config.lunchStart !== '12:30' ||
             config.lunchEnd !== '13:30' ||
             config.examCenter !== expectedCenter ||
             config.location !== expectedLocation;
  }, [config, singleDayMode, weekStartDate, disabledDays, defaultDuration, defaultDouble, teacherVehicles, teacherExamCenters]);

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={singleDayMode ? "Auto-Fill Day" : "Auto-Fill Settings"} 
        maxWidth="max-w-md"
        // --- Activate the Unsaved Changes banner! ---
        isModified={hasChanges}
    >
      <div className="space-y-4">
        <p className="text-xs text-textGrey">
            Generate a {singleDayMode ? 'day' : 'week'} of purple drafts. You can review and edit them before publishing to your students.
        </p>

        {/* Working Days or Single Day Display */}
        {!singleDayMode ? (
            <div className="space-y-1.5">
              <label className="text-[10px] text-textGrey uppercase font-black">Working Days</label>
              <div className="grid grid-cols-7 gap-1.5">
                {days.map(d => {
                  const isPastDay = disabledDays.includes(d.id); 

                  return (
                    <button
                      key={d.id} 
                      disabled={isPastDay}
                      onClick={() => toggleDay(d.id)}
                      className={`w-full py-1.5 rounded text-[11px] sm:text-xs font-bold border transition-colors text-center ${
                        config.workingDays.includes(d.id) 
                          ? 'bg-purple-500 text-white border-purple-500 shadow-sm' 
                          : isPastDay
                              ? 'bg-transparent text-gray-700 border-gray-800 opacity-30 cursor-not-allowed' 
                              : 'bg-transparent text-textGrey border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      {t(d.label)}
                    </button>
                  );
                })}
              </div>
            </div>
        ) : (
            <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                <label className="text-[10px] text-textGrey uppercase font-black">Selected Day</label>
                <div className="w-full py-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-center flex items-center justify-center gap-2">
                    <Calendar size={16} className="text-purple-400" />
                    <span className="text-sm font-bold text-purple-400">
                        {weekStartDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                </div>
            </div>
        )}
        {/* --- DYNAMIC TIME WHEELS --- */}
        <div className="grid grid-cols-2 gap-4">
    <TimeSelect 
        label="Start Time" 
        value={config.startTime} 
        onChange={(v) => setConfig({...config, startTime: v})} 
    />
    <TimeSelect 
        label="End Time" 
        value={config.endTime} 
        minTime={config.startTime} 
        align="right" 
        onChange={(v) => setConfig({...config, endTime: v})} 
    />
</div>

        {/* Vehicle Category (Custom Menu) */}
        <div className="space-y-1.5 relative z-[45]">
          <label className="text-[10px] text-textGrey uppercase font-black px-1">{t('Vehicle Category')}</label>
          
          {/* Custom Dropdown Trigger */}
          <div 
            onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
            className={`w-full pl-4 pr-3 p-3 bg-midnight border rounded-lg text-white cursor-pointer flex items-center justify-between transition-colors ${showVehicleDropdown ? 'border-purple-500' : 'border-gray-700 hover:border-gray-500'}`}
          >
            <span className="text-sm font-bold truncate mr-2">
              {/* [FIXED] Uses getVehicleLabel to find the key for the current selection */}
              {t(getVehicleLabel(config.vehicleType)).replace('Private Car', 'Car').replace('Light Goods', 'Van')}
            </span>
            <ChevronDown size={16} className={`text-textGrey shrink-0 transition-transform ${showVehicleDropdown ? 'rotate-180' : ''}`} />
          </div>

          {/* Custom Dropdown List (Opens Upward) */}
          {showVehicleDropdown && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200 select-none">
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {/* [FIXED] Map directly over teacherVehicles instead of filtering the master list */}
                {teacherVehicles.map((vId) => {
                  const labelKey = getVehicleLabel(vId); // Gets the translation key from list.ts
                  
                  return (
                    <div 
                      key={vId}
                      onClick={() => {
                        setConfig({...config, vehicleType: vId});
                        setShowVehicleDropdown(false);
                      }}
                      className={`p-3 text-sm font-bold cursor-pointer transition-colors border-b border-gray-800 last:border-0 flex items-center justify-between ${
                        config.vehicleType === vId ? 'bg-purple-500/10 text-purple-400' : 'text-white hover:bg-midnight'
                      }`}
                    >
                      {/* [FIXED] Uses i18n and formatting consistent with EditLessonModal */}
                      <span>{t(labelKey).replace('Private Car', 'Car').replace('Light Goods', 'Van')}</span>
                      {config.vehicleType === vId && <Check size={16} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Session Toggle */}
        <div 
            className="flex items-center justify-between bg-midnight border border-gray-800 p-3 rounded-xl cursor-pointer hover:border-gray-700 transition-colors" 
            onClick={() => setConfig({...config, isDouble: !config.isDouble})}
        >
            <div className="flex flex-col">
                <span className="text-sm font-bold text-white">{config.isDouble ? 'Double Session' : 'Single Session'}</span>
                <span className="text-xs text-textGrey">Generates <span className="text-white font-medium">{config.isDouble ? defaultDuration * 2 : defaultDuration} min</span> drafts</span>
            </div>
            <button type="button" className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${config.isDouble ? 'bg-purple-500' : 'bg-gray-700'}`}>
                <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${config.isDouble ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
        </div>
        
        {/* --- UPGRADED PURPLE LUNCH TOGGLE AND SMART PICKERS --- */}
        <div className="space-y-2 p-3 bg-midnight border border-gray-800 rounded-xl">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setConfig({...config, hasLunch: !config.hasLunch})}>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">Schedule Lunch Break</span>
                    <span className="text-xs text-textGrey">Blocks out time for you to eat</span>
                </div>
                <button type="button" className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${config.hasLunch ? 'bg-purple-500' : 'bg-gray-700'}`}>
                    <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${config.hasLunch ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
            </div>
            
            {/* --- LUNCH PICKERS --- */}
{config.hasLunch && (
    <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-gray-800">
        <TimeSelect 
            label="Lunch Start" 
            value={config.lunchStart} 
            minTime={config.startTime} 
            onChange={(v) => setConfig({...config, lunchStart: v})} 
        />
        <TimeSelect 
            label="Lunch End" 
            value={config.lunchEnd} 
            minTime={config.lunchStart} 
            align="right" 
            onChange={(v) => setConfig({...config, lunchEnd: v})} 
        />
    </div>
)}
        </div>

        <div className="h-[1px] bg-gray-800 my-2" />

        {/* Exam Center Selector */}
        <div className="space-y-2 relative z-40">
            <label className="text-[10px] text-textGrey uppercase font-black">{t('Exam Center')}</label>
            <div onClick={() => setShowCenterDropdown(!showCenterDropdown)} className={`w-full pl-4 pr-3 p-3 bg-midnight border rounded-lg text-white cursor-pointer flex items-center justify-between transition-colors ${showCenterDropdown ? 'border-purple-500' : 'border-gray-700 hover:border-gray-500'}`}>
                {/* [FIXED] Wrap the label in t() */}
                <span className={`text-sm font-bold truncate mr-2 ${!config.examCenter ? 'text-gray-500' : ''}`}>
                    {config.examCenter ? t(getExamCenterLabel(config.examCenter)) : t("Select Exam Center...")}
                </span>
                <ChevronDown size={16} className={`text-textGrey shrink-0 transition-transform ${showCenterDropdown ? 'rotate-180' : ''}`} />
            </div>
            {showCenterDropdown && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200 select-none">
                    <div className="max-h-40 overflow-y-auto custom-scrollbar">
                        {teacherExamCenters.length > 0 ? (
                            teacherExamCenters.map((centerId) => (
                                <div key={centerId} onClick={() => {
                                        const allowedIds = (EXAM_CENTER_PICKUPS as any)[centerId] || [];
                                        const firstLocation = allowedIds.length > 0 ? LESSON_LOCATIONS.find(l => allowedIds.includes(l.id))?.label || '' : '';
                                        setConfig({...config, examCenter: centerId, location: firstLocation}); 
                                        setShowCenterDropdown(false);
                                    }}
                                    className={`p-3 text-sm font-bold cursor-pointer transition-colors border-b border-gray-800 last:border-0 flex items-center justify-between ${config.examCenter === centerId ? 'bg-purple-500/10 text-purple-400' : 'text-white hover:bg-midnight'}`}
                                >
                                    {/* [FIXED] Wrap the center label in t() */}
                                    <span>{t(getExamCenterLabel(centerId))}</span>
                                    {config.examCenter === centerId && <Check size={16} />}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-xs text-gray-500 italic">{t('Please select Exam Centers in Settings.')}</div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Pickup Location Selector */}
        <div className={`space-y-2 relative animate-in fade-in slide-in-from-top-1 duration-200 ${showLocationDropdown ? 'z-[60]' : 'z-30'}`}>
            <div className="space-y-1">
                <label className="text-[10px] text-textGrey uppercase font-black flex justify-between">
                    <span>{t('Pickup Location')}</span>
                    {config.examCenter && <span className="text-purple-400">{availableLocations.length} {t('options')}</span>}
                </label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-textGrey z-10" size={18} />
                    <input 
                        type="text" disabled={!config.examCenter}
                        placeholder={!config.examCenter ? t("Select Exam Center first...") : t("Select valid pickup point...")}
                        value={t(config.location)} 
                        onChange={e => { setConfig({...config, location: e.target.value}); setShowLocationDropdown(true); }}
                        onFocus={() => setShowLocationDropdown(true)} onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
                        className={`w-full pl-10 p-3 bg-midnight border rounded-lg text-white focus:border-purple-500 outline-none transition-colors ${!config.examCenter ? 'border-gray-800 opacity-50 cursor-not-allowed' : 'border-gray-700'}`}
                    />
                    {showLocationDropdown && filteredLocations.length > 0 && config.examCenter && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                {filteredLocations.map(loc => (
                                    <div key={loc.id} onMouseDown={(e) => e.preventDefault()} onClick={() => { setConfig({...config, location: loc.label}); setShowLocationDropdown(false); }} className="p-3 hover:bg-midnight cursor-pointer transition-colors border-b border-gray-800 last:border-0">
                                        <span className="font-bold text-white text-sm">{t(loc.label)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {config.examCenter && (
                <div className="flex flex-wrap gap-2">
                    {availableLocations.map(loc => (
                        <button key={loc.id} type="button" onClick={() => setConfig({...config, location: loc.label})}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${config.location === loc.label ? 'bg-purple-500 text-white border-purple-500' : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'}`}
                        >
                            {t(loc.label)}
                        </button>
                    ))}
                </div>
            )}
        </div>
        
        <button onClick={() => onGenerate(config)} disabled={isGenerating || config.workingDays.length === 0 || !config.examCenter || !config.location} className="w-full mt-2 bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
            Generate Drafts
        </button>
      </div>
    </Modal>
  );
}
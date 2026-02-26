import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Loader2, Calendar, MapPin, ChevronDown, Check } from 'lucide-react';
import { 
    VEHICLE_TYPES, EXAM_CENTERS, EXAM_REGIONS, 
    LESSON_LOCATIONS, EXAM_CENTER_PICKUPS, getExamCenterLabel 
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
}

export function AutoFillModal({ isOpen, onClose, onGenerate, isGenerating, teacherVehicles, defaultDuration, defaultDouble, teacherExamCenters }: Props) {
  const defaultVehicle = teacherVehicles.length > 0 ? teacherVehicles[0] : '1a';
  
  const [config, setConfig] = useState({
    workingDays: [1, 2, 3, 4, 5], 
    startTime: '08:00',
    endTime: '18:00',
    lessonDuration: defaultDuration, 
    isDouble: defaultDouble,         
    vehicleType: defaultVehicle,
    skipLunch: true,
    examCenter: '', // <-- ADDED
    location: ''    // <-- ADDED
  });

  // --- FORCE SYNC WITH PROFILE SETTINGS ---
  useEffect(() => {
    if (isOpen) {
        setConfig(prev => ({
            ...prev,
            lessonDuration: Number(defaultDuration) || 45,
            isDouble: !!defaultDouble,
            vehicleType: teacherVehicles && teacherVehicles.length > 0 ? teacherVehicles[0] : '1a',
            examCenter: teacherExamCenters && teacherExamCenters.length > 0 ? teacherExamCenters[0] : '', // Default to first chosen center
            location: '' 
        }));
    }
  }, [isOpen, defaultDuration, defaultDouble, teacherVehicles, teacherExamCenters]);

  const [showCenterDropdown, setShowCenterDropdown] = useState(false);

  // --- FILTERED CENTERS ---
  // If they selected defaults, ONLY show those. Otherwise, show all.
  const filteredExamCenters = teacherExamCenters.length > 0 
    ? EXAM_CENTERS.filter(center => teacherExamCenters.includes(center.id))
    : EXAM_CENTERS;

  const allowedLocationIds = config.examCenter ? EXAM_CENTER_PICKUPS[config.examCenter] : null;
  const availableLocations = allowedLocationIds
    ? LESSON_LOCATIONS.filter(loc => allowedLocationIds.includes(loc.id))
    : LESSON_LOCATIONS;

  const days = [
    { id: 1, label: 'Mon' }, { id: 2, label: 'Tue' }, { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' }, { id: 5, label: 'Fri' }, { id: 6, label: 'Sat' }, { id: 0, label: 'Sun' }
  ];

  const toggleDay = (dayId: number) => {
    setConfig(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(dayId) 
        ? prev.workingDays.filter(d => d !== dayId)
        : [...prev.workingDays, dayId]
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Auto-Fill Settings" maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-xs text-textGrey">Generate a week of purple drafts. You can review and edit them before publishing to your students.</p>

        {/* Working Days */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-textGrey uppercase font-black">Working Days</label>
          <div className="flex flex-wrap gap-1.5">
            {days.map(d => (
              <button
                key={d.id} 
                onClick={() => toggleDay(d.id)}
                className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${config.workingDays.includes(d.id) ? 'bg-purple-500 text-white border-purple-500' : 'bg-transparent text-textGrey border-gray-700 hover:border-gray-500'}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-textGrey uppercase font-black">Start Time</label>
            <input type="time" value={config.startTime} onChange={e => setConfig({...config, startTime: e.target.value})} className="w-full p-2.5 bg-midnight border border-gray-700 rounded-lg text-white outline-none focus:border-purple-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-textGrey uppercase font-black">End Time</label>
            <input type="time" value={config.endTime} onChange={e => setConfig({...config, endTime: e.target.value})} className="w-full p-2.5 bg-midnight border border-gray-700 rounded-lg text-white outline-none focus:border-purple-500" />
          </div>
        </div>

        {/* Vehicle Category (Full Width) */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-textGrey uppercase font-black">Vehicle Category</label>
          <select 
              value={String(config.vehicleType)} 
              onChange={e => setConfig({...config, vehicleType: e.target.value})} 
              className="w-full p-2.5 bg-midnight border border-gray-700 rounded-lg text-white outline-none focus:border-purple-500 appearance-none"
          >
              {VEHICLE_TYPES.filter(v => teacherVehicles.includes(v.id)).map(v => (
                  <option key={v.id} value={v.id}>
                      {v.label.replace('Private Car', 'Car').replace('Light Goods', 'Van')}
                  </option>
              ))}
          </select>
        </div>

        {/* Dynamic Session Toggle */}
        <div 
            className="flex items-center justify-between bg-midnight border border-gray-800 p-3 rounded-xl cursor-pointer hover:border-gray-700 transition-colors" 
            onClick={() => setConfig({...config, isDouble: !config.isDouble})}
        >
            <div className="flex flex-col">
                <span className="text-sm font-bold text-white">
                    {config.isDouble ? 'Double Session' : 'Single Session'}
                </span>
                <span className="text-xs text-textGrey">
                    Generates <span className="text-white font-medium">{config.isDouble ? defaultDuration * 2 : defaultDuration} min</span> drafts
                </span>
            </div>
            <button type="button" className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${config.isDouble ? 'bg-purple-500' : 'bg-gray-700'}`}>
                <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${config.isDouble ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
        </div>
        
        {/* Lunch Toggle */}
        <div className="flex items-center gap-2 pt-1">
            <input 
                type="checkbox" 
                id="skipLunch" 
                checked={config.skipLunch} 
                onChange={e => setConfig({...config, skipLunch: e.target.checked})}
                className="w-4 h-4 accent-purple-500"
            />
            <label htmlFor="skipLunch" className="text-sm font-bold text-white cursor-pointer">Skip Lunch (12:30 - 13:30)</label>
        </div>

        <div className="h-[1px] bg-gray-800 my-2" />

        {/* --- EXAM CENTER SELECTOR (Locked to Profile) --- */}
        <div className="space-y-2 relative z-40">
            <label className="text-[10px] text-textGrey uppercase font-black">Exam Center</label>
            <div 
                onClick={() => setShowCenterDropdown(!showCenterDropdown)}
                className={`w-full pl-4 pr-3 p-3 bg-midnight border rounded-lg text-white cursor-pointer flex items-center justify-between transition-colors ${showCenterDropdown ? 'border-orange' : 'border-gray-700 hover:border-gray-500'}`}
            >
                <span className={`text-sm font-bold truncate mr-2 ${!config.examCenter ? 'text-gray-500' : ''}`}>
                    {getExamCenterLabel(config.examCenter) || "Select Exam Center..."}
                </span>
                <ChevronDown size={16} className={`text-textGrey shrink-0 transition-transform ${showCenterDropdown ? 'rotate-180' : ''}`} />
            </div>

            {showCenterDropdown && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
                    <div className="max-h-40 overflow-y-auto custom-scrollbar">
                        {filteredExamCenters.length > 0 ? (
                            filteredExamCenters.map((center) => (
                                <div 
                                    key={center.id}
                                    onClick={() => {
                                        setConfig({...config, examCenter: center.id, location: ''}); 
                                        setShowCenterDropdown(false);
                                    }}
                                    className={`p-3 text-sm font-bold cursor-pointer transition-colors border-b border-gray-800 last:border-0 flex items-center justify-between ${
                                        config.examCenter === center.id ? 'bg-orange/10 text-orange' : 'text-white hover:bg-midnight'
                                    }`}
                                >
                                    <span>{center.label}</span>
                                    {config.examCenter === center.id && <Check size={16} />}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-xs text-gray-500 italic">
                                Please select Exam Centers in Settings.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* --- PICKUP LOCATION SELECTOR --- */}
        <div className="space-y-2 relative z-30">
            <label className="text-[10px] text-textGrey uppercase font-black flex justify-between">
                <span>Pickup Location</span>
                {config.examCenter && <span className="text-orange">{availableLocations.length} options</span>}
            </label>
            {config.examCenter ? (
                <div className="flex flex-wrap gap-2">
                {availableLocations.map(loc => (
                    <button 
                    key={loc.id} type="button" 
                    onClick={() => setConfig({...config, location: loc.label})}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                        config.location === loc.label ? 'bg-orange text-white border-orange' : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                    }`}
                    >
                    {loc.label}
                    </button>
                ))}
                </div>
            ) : (
                <div className="p-3 bg-midnight border border-gray-800 rounded-lg text-xs text-gray-500 italic text-center">
                    Select an Exam Center to see valid pickup points.
                </div>
            )}
        </div>
        
        <button 
            onClick={() => onGenerate(config)} 
            disabled={isGenerating || config.workingDays.length === 0}
            className="w-full mt-2 bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
            Generate Drafts
        </button>
      </div>
    </Modal>
  );
}
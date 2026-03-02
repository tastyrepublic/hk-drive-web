import { AlertTriangle, Trash2, Loader2, MapPin, Search, Car, Coffee, ChevronDown, Check } from 'lucide-react';
import { Modal } from './Modal';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TimeSelect } from '../Shared/TimeSelect';
import { DateSelect } from '../Shared/DateSelect';
import { useTranslation } from 'react-i18next';


// --- Import Constants & Helpers ---
import { 
  LESSON_LOCATIONS, 
  BLOCK_REASONS, 
  getVehicleLabel,
  EXAM_CENTER_PICKUPS,
  getExamCenterLabel,
  getBlockReasonLabel
} from '../../constants/list';

// --- Import Animation Helpers ---
import { ERROR_ALERT_VARIANTS, smoothScrollTo } from '../../constants/animations'; 

interface Props {
  editingSlot: any; 
  setEditingSlot: (slot: any) => void;
  editForm: any;
  setEditForm: (form: any) => void;
  validationMsg: string;
  setValidationMsg: (msg: string) => void;
  saveSlotLoading: boolean;
  isSlotModified: boolean;
  onSave: () => Promise<void>;
  onDelete: () => void;
  lessonDuration: number;
  defaultDoubleLesson?: boolean; 
  students: any[]; 
  vehicleTypes: string[];
  teacherExamCenters: string[];
}

export function EditLessonModal({
  editingSlot, setEditingSlot, 
  editForm, setEditForm, 
  validationMsg, setValidationMsg, 
  saveSlotLoading, isSlotModified, 
  onSave, onDelete,
  lessonDuration = 45,
  defaultDoubleLesson = false, 
  students = [],
  vehicleTypes = [],
  teacherExamCenters = []
}: Props) {

  const { t } = useTranslation();

  const isOpen = !!editingSlot; 
  const isEditing = editingSlot && editingSlot.id;

  // [NEW] Calculate today's date strictly as YYYY-MM-DD
  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  // [NEW] Calculate dynamic minimum time to prevent booking past hours today
  let dynamicMinTime: string | undefined = undefined;
  // Only restrict past times if we are creating a NEW slot for TODAY
  if (!isEditing && editForm.date === todayStr) {
      dynamicMinTime = `${String(todayDate.getHours()).padStart(2, '0')}:${String(todayDate.getMinutes()).padStart(2, '0')}`;
  }

  const errorRef = useRef<HTMLDivElement>(null);
  const centerDropdownRef = useRef<HTMLDivElement>(null);

  // Scroll to error when validationMsg appears
  useEffect(() => {
    if (validationMsg) {
        smoothScrollTo(errorRef);
    }
  }, [validationMsg]);

  const [studentQuery, setStudentQuery] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showCenterDropdown, setShowCenterDropdown] = useState(false);
    
  // --- 1. SMART DEFAULT LOGIC ---
  const primaryVehicle = vehicleTypes.length > 0 ? vehicleTypes[0] : '1a';

  // --- 2. CALCULATE EFFECTIVE TYPE ---
  const isCurrentTypeValid = vehicleTypes.includes(editForm.type);
  const effectiveType = (isCurrentTypeValid || editForm.status === 'Blocked') 
      ? editForm.type 
      : primaryVehicle;

  // --- CLICK OUTSIDE LISTENER ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (centerDropdownRef.current && !centerDropdownRef.current.contains(event.target as Node)) {
        setShowCenterDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // =========================================================================
  // SNAPSHOT STRATEGY
  // =========================================================================
  
  const [lessonSnapshot, setLessonSnapshot] = useState<any>(null);
  const [blockSnapshot, setBlockSnapshot] = useState<any>(null);

  // --- A. INITIALIZATION ---
  useEffect(() => {
    if (isOpen) {
        // [NEW] SMART DEFAULTS FROM PROFILE
        let initialCenter = editingSlot?.examCenter || '';
        let initialLocation = editingSlot?.location || '';
        
        // 1. Lesson Defaults
        const initialLessonState = (editingSlot?.status !== 'Blocked') 
            ? { ...editingSlot, isDouble: editingSlot.isDouble ?? defaultDoubleLesson, examCenter: initialCenter, location: initialLocation } 
            : {
                ...editingSlot, 
                status: 'Open',
                type: primaryVehicle, 
                studentId: '',
                isDouble: defaultDoubleLesson, 
                customDuration: undefined,
                examCenter: initialCenter,
                location: initialLocation
            };

        // ... (Keep the rest of the initialization the same, such as isRealVehicle and initialBlockState)

        const isRealVehicle = vehicleTypes.includes(initialLessonState?.type);
        if (!isRealVehicle) {
            initialLessonState.type = primaryVehicle;
        }

        // 2. Block Defaults
        const initialBlockState = (editingSlot?.status === 'Blocked')
            ? editingSlot
            : {
                ...editingSlot,
                status: 'Blocked',
                type: '', 
                studentId: '', 
                customDuration: 60,
                isDouble: false,
                location: '',
                examCenter: ''
            };

        setLessonSnapshot(initialLessonState);
        setBlockSnapshot(initialBlockState);
    }
  }, [isOpen, editingSlot, primaryVehicle, vehicleTypes, defaultDoubleLesson]);

  // --- B. ACTIVE MIRROR ---
  useEffect(() => {
    if (!isOpen) return;
    if (editForm.status === 'Blocked') {
        setBlockSnapshot(editForm);
    } else {
        setLessonSnapshot(editForm);
    }
  }, [editForm, isOpen]);

  // --- C. AUTO-CORRECT TYPE ---
  useEffect(() => {
    if (isOpen && !isBlockMode && editForm.type !== effectiveType && effectiveType) {
        setEditForm((prev: any) => ({ ...prev, type: effectiveType }));
    }
  }, [isOpen, editForm.status, effectiveType]);

  const isBlockMode = editForm.status === 'Blocked';
  
  // Validation (Around line 143)
  // [CHANGED] Now requires editForm.date as well
  const isFormValid = !!editForm.time && !!editForm.date && (isBlockMode || (editForm.examCenter && editForm.examCenter !== ''));

  const blockDurations = [15, 30, 45, 60, 90, 120]; 
  const singleTime = lessonDuration;
  const doubleTime = lessonDuration * 2; 
  const currentDuration = isBlockMode 
    ? (editForm.customDuration || singleTime) 
    : (editForm.isDouble ? doubleTime : singleTime);

  const calculateEndTime = (start: string, duration: number) => {
    if (!start) return '';
    const [h, m] = start.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + duration);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };
  const currentEndTime = calculateEndTime(editForm.time, currentDuration);

  // Sync Student Name
  useEffect(() => {
    if (isOpen && editForm.studentId) {
      const match = students.find(s => s.id === editForm.studentId);
      if (match) setStudentQuery(match.name);
      else setStudentQuery(''); 
    } else if (isOpen && !editForm.studentId) {
      setStudentQuery(''); 
    }
  }, [isOpen, editForm.studentId, students]);

  const handleChange = (field: string, value: any) => {
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
    if (validationMsg) setValidationMsg(''); 
  };

  // --- [NEW] BULLETPROOF BLOCKED MODE HANDLER ---
  const handleBlockUpdate = (newTime: string, targetDuration: number) => {
      const [h, m] = newTime.split(':').map(Number);
      
      // 1. Calculate the absolute maximum minutes allowed until 23:30
      const maxAllowed = (23 * 60 + 30) - (h * 60 + m); 
      
      // 2. Clamp the duration: take the requested duration, but never exceed maxAllowed
      // (Also ensures duration never drops below 15 mins if they pick exactly 23:30)
      const safeDuration = Math.max(15, Math.min(targetDuration, maxAllowed));

      setEditForm((prev: any) => ({
          ...prev,
          time: newTime,
          customDuration: safeDuration
      }));
      if (validationMsg) setValidationMsg('');
  };

  const handleFullDay = () => {
      // Sets the start time to 06:00 and the duration to 1050 minutes (which ends exactly at 23:30)
      setEditForm((prev: any) => ({
          ...prev,
          time: '06:00',
          customDuration: 1050
      }));
  };

  const filteredStudents = students.filter(s => {
    const matchesName = s.name.toLowerCase().includes(studentQuery.toLowerCase());
    const matchesVehicle = isBlockMode || !editForm.type || s.vehicle === editForm.type;
    return matchesName && matchesVehicle;
  });

  // --- FILTER LOCATIONS ---
  const allowedLocationIds = editForm.examCenter ? EXAM_CENTER_PICKUPS[editForm.examCenter] : null;
  const availableLocations = allowedLocationIds
    ? LESSON_LOCATIONS.filter(loc => allowedLocationIds.includes(loc.id))
    : LESSON_LOCATIONS;

  const filteredLocations = availableLocations.filter(loc => 
    loc.label.toLowerCase().includes((editForm.location || '').toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setEditingSlot(null)}
      title={isEditing ? (isBlockMode ? "Edit Block" : "Edit Lesson") : "Add New Slot"} 
      maxWidth="max-w-md"
      isSaving={saveSlotLoading}
      isModified={isSlotModified}
      footer={
        <div className="flex justify-between items-center gap-4">
           {isEditing ? (
            <button 
                onClick={onDelete} 
                className="h-[48px] w-[48px] shrink-0 flex items-center justify-center bg-midnight border border-gray-800 text-statusRed hover:bg-statusRed/10 hover:border-statusRed rounded-xl transition-all"
            >
                <Trash2 size={20} />
            </button>
          ) : <div />} 
          
          <button 
  onClick={onSave} 
  disabled={saveSlotLoading || !isSlotModified || !isFormValid} 
  className={`h-[48px] min-w-[140px] flex items-center justify-center gap-2 px-6 rounded-xl font-bold text-white transition-all active:scale-[0.98] ${
      isBlockMode 
       ? 'bg-red-500 hover:bg-red-600' // [CHANGED] From statusRed to red-500 to match DiaryCard
       : 'bg-orange hover:brightness-110'
  } disabled:opacity-50 disabled:cursor-default disabled:active:scale-100 ml-auto`}
>
            {saveSlotLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <span>{isEditing ? 'Save Changes' : (isBlockMode ? 'Add Block' : 'Create Lesson')}</span>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-5"> 
        
        {/* ANIMATED ERROR MESSAGE */}
        <AnimatePresence>
            {validationMsg && (
              <motion.div
                ref={errorRef}
                variants={ERROR_ALERT_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                className="bg-statusRed/20 border border-statusRed/50 text-statusRed p-3 rounded-lg flex items-center gap-2 text-sm font-bold overflow-hidden"
              >
                <AlertTriangle size={16} className="shrink-0" /> 
                <span>{validationMsg}</span>
              </motion.div>
            )}
        </AnimatePresence>

        {/* --- MODE SWITCHER --- */}
        <div className="flex p-1 bg-midnight border border-gray-800 rounded-lg">
           <button 
             onClick={() => {
                if (lessonSnapshot) {
                    const safeStatus = lessonSnapshot.studentId ? 'Booked' : 'Open';
                    setEditForm({
                        ...lessonSnapshot,
                        status: safeStatus,
                        type: lessonSnapshot.type || primaryVehicle,
                        date: editForm.date,
                        time: editForm.time,
                    });
                }
             }}
             className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${!isBlockMode ? 'bg-orange text-white shadow-md' : 'text-textGrey hover:text-white'}`}
           >
             <Car size={14} /> Lesson
           </button>
           
           <button 
  onClick={() => {
     if (blockSnapshot) {
         setEditForm({ ...blockSnapshot, date: editForm.date, time: editForm.time, location: '', examCenter: '' });
     }
  }}
  className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${
    isBlockMode ? 'bg-red-500 text-white shadow-md' : 'text-textGrey hover:text-white' // [CHANGED] to red-500
  }`}
>
  <Coffee size={14} /> Block Time
</button>
        </div>

        {!isBlockMode && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
               <label className="text-[10px] text-textGrey uppercase font-black px-1">{t('Vehicle Category')}</label>
               <div className="flex flex-wrap gap-2">
                  {/* [FIXED] Map directly over teacher's selected vehicleTypes instead of filtering the master list */}
                  {vehicleTypes.map(vId => {
                      const labelKey = getVehicleLabel(vId); // Gets 'vehicle.private_auto', etc.
                      const isSelected = effectiveType === vId;

                      return (
                        <button
                          key={vId}
                          onClick={() => handleChange('type', vId)}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                             isSelected
                               ? 'bg-orange text-white border-orange'
                               : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                          }`}
                        >
                          {/* Translate the label and keep your formatting preference */}
                          {t(labelKey).replace('Private Car', 'Car').replace('Light Goods', 'Van')}
                        </button>
                      );
                  })}
               </div>
            </div>
         )}

        <div className="grid grid-cols-2 gap-4">
             {/* [NEW] UPGRADED DATE SELECTOR */}
             <div className="space-y-1">
              <DateSelect 
                label="Date" 
                value={editForm.date || ''}
                minDate={todayStr} // Locks out passed days!
                variant={isBlockMode ? 'blocked' : 'orange'} // Adapts color perfectly
                onChange={(newDate) => handleChange('date', newDate)} 
              />
            </div>

            <div className="space-y-1">
              <TimeSelect 
                label={t("Time")} 
                value={editForm.time || ''} 
                align="right" 
                variant={isBlockMode ? 'blocked' : 'orange'} 
                minTime={dynamicMinTime} 
                onChange={(newTime) => {
                    if (isBlockMode) {
                        // [FIXED] Send the new time and current duration through the checkpoint
                        handleBlockUpdate(newTime, editForm.customDuration || singleTime);
                    } else {
                        handleChange('time', newTime);
                    }
                }} 
              />
            </div>
        </div>
        
        {isBlockMode ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-2">
                    <label className="text-[10px] text-textGrey uppercase font-black px-1 flex items-center gap-2">
                        <span>{t('Duration')}</span>
                        <span className="text-red-500">{t('Ends at')} {currentEndTime}</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {/* [NEW] Calculate the remaining minutes until 23:30 from the currently selected time */}
                        {(() => {
                            const [h, m] = (editForm.time || '08:00').split(':').map(Number);
                            const maxAllowed = (23 * 60 + 30) - (h * 60 + m);

                            return (
                                <>
                                    {blockDurations.map(mins => {
                                        const isTooLong = mins > maxAllowed; // Check if the button exceeds legal limit

                                        return (
                                            <button
                                                key={mins}
                                                disabled={isTooLong} // [NEW] Disable the button natively
                                                onClick={() => handleBlockUpdate(editForm.time || '08:00', mins)}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                                    (editForm.customDuration || singleTime) === mins
                                                    ? 'bg-red-500 text-white border-red-500' 
                                                    : isTooLong
                                                        ? 'bg-transparent text-gray-700 border-gray-800 opacity-30 cursor-not-allowed' // [NEW] Faded out styling for disabled buttons
                                                        : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                                                }`}
                                            >
                                                {mins}{t('common.min')}
                                            </button>
                                        );
                                    })}
                                    
                                    <button
                                        onClick={handleFullDay}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                            (editForm.customDuration) === 1050
                                            ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                            : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                                        }`}
                                    >
                                        {t('Full Day')}
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] text-textGrey uppercase font-black px-1">{t('Reason')}</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {BLOCK_REASONS.map(reason => (
                            <button
                                key={reason.id}
                                onClick={() => handleChange('type', reason.id)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                                    editForm.type === reason.id
                                    ? 'bg-white text-black border-white'
                                    : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                                }`}
                            >
                                {/* [KEPT] Translated reason labels from list.ts */}
                                {t(reason.label)}
                            </button>
                        ))}
                    </div>
                    <input 
                      type="text" 
                      placeholder={t("Select a reason or type here...")}
                      
                      // [KEPT] Smart translation for the input value
                      value={editForm.type ? t(getBlockReasonLabel(editForm.type)) : ''}
                      
                      onChange={(e) => handleChange('type', e.target.value)}
                      className={`w-full p-3 bg-midnight border border-gray-700 rounded-lg text-white outline-none transition-colors placeholder:text-gray-600 ${
                        isBlockMode ? 'focus:border-red-500' : 'focus:border-orange'
                      }`}
                    />
                </div>
            </div>
        ) : (
            <>
                <div className="flex items-center justify-between bg-midnight border border-gray-800 p-4 rounded-xl cursor-pointer" onClick={() => handleChange('isDouble', !editForm.isDouble)}>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">
                        {editForm.isDouble ? 'Double Session' : 'Single Session'}
                        </span>
                        <span className="text-xs text-textGrey">
                            <span className="text-white font-medium">{currentDuration} min</span> 
                            <span className="mx-1.5 text-gray-600">•</span>
                            Ends at <span className="text-orange font-bold">{currentEndTime}</span>
                        </span>
                    </div>
                    <button 
                        type="button"
                        className={`relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                            editForm.isDouble ? 'bg-orange' : 'bg-gray-700'
                        }`}
                    >
                        <span 
                            className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                editForm.isDouble ? 'translate-x-5' : 'translate-x-0'
                            }`} 
                        />
                    </button>
                </div>

                {/* --- 1. STUDENT FIELD (Z-Index 50) --- */}
                <div className={`space-y-1 relative animate-in fade-in slide-in-from-top-1 duration-200 ${showStudentDropdown ? 'z-[60]' : 'z-30'}`}> 
                  <label className="text-[10px] text-textGrey uppercase font-black px-1">Student</label>
                  <div className="relative">
                      <Search className="absolute left-3 top-3 text-textGrey" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search Student..."
                        value={studentQuery}
                        onChange={(e) => {
                          setStudentQuery(e.target.value);
                          setShowStudentDropdown(true);
                          handleChange('studentId', ''); 
                        }}
                        onFocus={() => setShowStudentDropdown(true)}
                        onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                        className="w-full pl-10 p-3 bg-midnight border border-gray-700 rounded-lg text-white focus:border-orange outline-none transition-colors"
                      />
                      {showStudentDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                          <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {filteredStudents.length > 0 ? (
                              filteredStudents.map(student => (
                                <div 
                                  key={student.id}
                                  className="p-3 hover:bg-midnight cursor-pointer transition-colors border-b border-gray-800 last:border-0 flex items-center justify-between"
                                  onMouseDown={(e) => e.preventDefault()} 
                                  onClick={() => {
                                    handleChange('studentId', student.id);
                                    setStudentQuery(student.name);
                                    setShowStudentDropdown(false);
                                  }}
                                >
                                  <span className="font-bold text-white text-sm">{student.name}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-textGrey">
                                      {student.vehicle} 
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-textGrey text-xs text-center flex flex-col gap-1">
                                 <span>No students found.</span>
                                 <span className="opacity-50">Filter is active: {editForm.type}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
                
                {/* --- 2. EXAM CENTER FIELD --- */}
                <div className={`space-y-2 relative animate-in fade-in slide-in-from-top-1 duration-200 ${showCenterDropdown ? 'z-[60]' : 'z-20'}`} ref={centerDropdownRef}>
                   <label className="text-[10px] text-textGrey uppercase font-black px-1">Exam Center (Required)</label>
                   
                   {/* DROPDOWN TRIGGER */}
                   <div 
                        onClick={() => setShowCenterDropdown(!showCenterDropdown)}
                        className={`w-full pl-4 pr-3 p-3 bg-midnight border rounded-lg text-white cursor-pointer flex items-center justify-between transition-colors ${showCenterDropdown ? 'border-orange' : 'border-gray-700 hover:border-gray-500'}`}
                    >
                        <span className={`text-sm font-bold truncate mr-2 ${!editForm.examCenter ? 'text-gray-500' : ''}`}>
                            {/* [FIXED] Get the label key first, THEN translate it! */}
                            {editForm.examCenter ? t(getExamCenterLabel(editForm.examCenter)) : t('Select Exam Center...')}
                        </span>
                        <ChevronDown size={16} className={`text-textGrey shrink-0 transition-transform ${showCenterDropdown ? 'rotate-180' : ''}`} />
                   </div>

                   {/* DROPDOWN LIST */}
                   {showCenterDropdown && (
                        <div className="absolute bottom-full mb-1 left-0 right-0 bg-slate border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200 select-none">
                            <div className="max-h-56 overflow-y-auto custom-scrollbar">
                                {teacherExamCenters.length > 0 ? (
                                    teacherExamCenters.map((centerId) => (
                                        <div 
                                            // ... onClick logic remains exactly the same
                                            key={centerId}
                                            onClick={() => {
                                                handleChange('examCenter', centerId);
                                                setShowCenterDropdown(false);
                                                
                                                const allowed = EXAM_CENTER_PICKUPS[centerId] || [];
                                                const currentLabel = editForm.location;
                                                const isValid = LESSON_LOCATIONS.some(l => 
                                                    allowed.includes(l.id) && l.label === currentLabel
                                                );
                                                if (currentLabel && !isValid) {
                                                    handleChange('location', '');
                                                }
                                            }}
                                            className={`p-3 text-sm font-bold cursor-pointer transition-colors border-b border-gray-800 last:border-0 flex items-center justify-between ${
                                                editForm.examCenter === centerId
                                                ? 'bg-orange/10 text-orange' 
                                                : 'text-white hover:bg-midnight'
                                            }`}
                                        >
                                            {/* [FIXED] Same here, get the key then translate */}
                                            <span>{t(getExamCenterLabel(centerId))}</span>
                                            {editForm.examCenter === centerId && <Check size={16} />}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-xs text-gray-500 italic">
                                        {t('No centers selected in profile.')}
                                    </div>
                                )}
                            </div>
                        </div>
                   )}
                </div>

                {/* --- 3. PICKUP LOCATION FIELD --- */}
                <div className={`space-y-2 relative animate-in fade-in slide-in-from-top-1 duration-200 ${showLocationDropdown ? 'z-[60]' : 'z-10'}`}>
                  <div className="space-y-1">
                    <label className="text-[10px] text-textGrey uppercase font-black px-1">
                        Pickup Location {editForm.examCenter ? `(${availableLocations.length} options)` : ''}
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 text-textGrey z-10" size={18} />
                      <input 
                        type="text" 
                        placeholder={!editForm.examCenter ? t("Select Exam Center first...") : t("Select valid pickup point...")}
                        disabled={!editForm.examCenter}
                        
                        // [FIXED] Wrap the input value in t() so the selected key displays properly
                        value={t(editForm.location)} 
                        
                        onChange={e => {
                            handleChange('location', e.target.value);
                            setShowLocationDropdown(true);
                        }}
                        onFocus={() => setShowLocationDropdown(true)}
                        onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
                        className={`w-full pl-10 p-3 bg-midnight border rounded-lg text-white focus:border-orange outline-none transition-colors ${!editForm.examCenter ? 'border-gray-800 opacity-50 cursor-not-allowed' : 'border-gray-700'}`}
                      />
                      {showLocationDropdown && filteredLocations.length > 0 && editForm.examCenter && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                {filteredLocations.map(loc => (
                                    <div 
                                        key={loc.id}
                                        className="p-3 hover:bg-midnight cursor-pointer transition-colors border-b border-gray-800 last:border-0"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            handleChange('location', loc.label); 
                                            setShowLocationDropdown(false);
                                        }}
                                    >
                                        {/* [FIXED] Translate the list items */}
                                        <span className="font-bold text-white text-sm">{t(loc.label)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {editForm.examCenter && (
                      <div className="flex flex-wrap gap-2">
                        {availableLocations.map(loc => (
                          <button 
                            key={loc.id}
                            type="button" 
                            onClick={() => handleChange('location', loc.label)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                              editForm.location === loc.label 
                                ? 'bg-orange text-white border-orange' 
                                : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                            }`}
                          >
                            {/* [FIXED] Translate the quick-pick buttons */}
                            {t(loc.label)}
                          </button>
                        ))}
                      </div>
                  )}
                </div>
            </>
        )}
      </div>
    </Modal>
  );
}
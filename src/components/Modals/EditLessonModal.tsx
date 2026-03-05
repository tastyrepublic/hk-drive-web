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
  isPlanningMode: boolean;
}

// --- NEW UNIVERSAL TIME MATH HELPERS ---
const calculateEndTime = (start: string, duration: number) => {
    if (!start) return '';
    const [h, m] = start.split(':').map(Number);
    let totalMins = h * 60 + m + duration;
    if (totalMins > 23 * 60 + 45) totalMins = 23 * 60 + 45; // Cap at end of day
    return `${String(Math.floor(totalMins / 60)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
};

const getDurationMins = (start: string, end: string) => {
    if (!start || !end) return 60;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : 0;
};

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
  teacherExamCenters = [],
  isPlanningMode
}: Props) {

  const { t } = useTranslation();

  const isOpen = !!editingSlot; 
  const isEditing = editingSlot && editingSlot.id;

  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  let dynamicMinTime: string | undefined = undefined;
  if (!isEditing && editForm.date === todayStr) {
      dynamicMinTime = `${String(todayDate.getHours()).padStart(2, '0')}:${String(todayDate.getMinutes()).padStart(2, '0')}`;
  }

  const errorRef = useRef<HTMLDivElement>(null);
  const centerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (validationMsg) smoothScrollTo(errorRef);
  }, [validationMsg]);

  const [studentQuery, setStudentQuery] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showCenterDropdown, setShowCenterDropdown] = useState(false);
    
  const primaryVehicle = vehicleTypes.length > 0 ? vehicleTypes[0] : '1a';
  const isCurrentTypeValid = vehicleTypes.includes(editForm.type);
  const effectiveType = (isCurrentTypeValid || editForm.status === 'Blocked') ? editForm.type : primaryVehicle;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (centerDropdownRef.current && !centerDropdownRef.current.contains(event.target as Node)) {
        setShowCenterDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [lessonSnapshot, setLessonSnapshot] = useState<any>(null);
  const [blockSnapshot, setBlockSnapshot] = useState<any>(null);

  // Add this right before your useEffect
  const initRef = useRef<any>(null);

  useEffect(() => {
    // 1. Reset the tracker when the modal closes
    if (!isOpen) {
        initRef.current = null;
        return;
    }

    if (isOpen && editingSlot) {
        // --- THE PERFECT MEMORY FIX ---
        // If we already built the snapshots for this exact slot, stop React from overwriting them!
        if (initRef.current === editingSlot) return; 
        initRef.current = editingSlot;

        let initialCenter = editingSlot.examCenter || '';
        let initialLocation = editingSlot.location || '';
        let initialType = editingSlot.type || '';
        
        const isBlock = editingSlot.status === 'Blocked';

        if (!isBlock && vehicleTypes.length > 0 && !vehicleTypes.includes(initialType)) {
            initialType = primaryVehicle;
        }

        if (!editingSlot.id && teacherExamCenters?.length > 0) {
            if (!initialCenter) initialCenter = teacherExamCenters[0];
            if (!initialLocation && initialCenter) {
                const allowedIds = EXAM_CENTER_PICKUPS[initialCenter] || [];
                const firstLoc = LESSON_LOCATIONS.find(loc => allowedIds.includes(loc.id));
                if (firstLoc) initialLocation = firstLoc.label;
            }
        }

        const lessonIsDouble = isBlock ? !!defaultDoubleLesson : (editingSlot.isDouble ?? !!defaultDoubleLesson);

        const lessonBaseDuration = (!isBlock && editingSlot.duration) 
            ? editingSlot.duration 
            : (lessonIsDouble ? lessonDuration * 2 : lessonDuration);
            
        const blockBaseDuration = (isBlock && editingSlot.duration) 
            ? editingSlot.duration 
            : 60;

        const lessonBaseEndTime = (!isBlock && editingSlot.endTime) 
            ? editingSlot.endTime 
            : calculateEndTime(editingSlot.time || '08:00', lessonBaseDuration);
            
        const blockBaseEndTime = (isBlock && editingSlot.endTime) 
            ? editingSlot.endTime 
            : calculateEndTime(editingSlot.time || '08:00', blockBaseDuration);

        const enrichedLesson = {
            ...editingSlot,
            status: editingSlot.status !== 'Blocked' 
                ? (editingSlot.status || 'Open') 
                : (isPlanningMode ? 'Draft' : 'Open'),
            type: initialType || primaryVehicle, 
            examCenter: initialCenter, 
            location: initialLocation, 
            isDouble: lessonIsDouble, 
            duration: lessonBaseDuration,
            endTime: lessonBaseEndTime,
            studentId: editingSlot.studentId || ''
        };

        const enrichedBlock = {
            ...editingSlot,
            status: 'Blocked',
            type: '', 
            blockReason: editingSlot.blockReason || '',
            studentId: '',
            isDouble: false, 
            examCenter: initialCenter, 
            location: initialLocation, 
            duration: blockBaseDuration,
            endTime: blockBaseEndTime
        };

        const finalState = isBlock ? enrichedBlock : enrichedLesson;

        if (!editingSlot.id) {
            const needsSync = Object.keys(finalState).some(key => editingSlot[key] !== (finalState as any)[key]);
            if (needsSync) {
                setEditingSlot(finalState);
                setEditForm(finalState);
                return; 
            }
        }

        setLessonSnapshot(enrichedLesson);
        setBlockSnapshot(enrichedBlock);
    }
  }, [isOpen, editingSlot, primaryVehicle, vehicleTypes, defaultDoubleLesson, teacherExamCenters, lessonDuration, setEditingSlot, setEditForm]);

  useEffect(() => {
    if (!isOpen) return;
    if (editForm.status === 'Blocked') setBlockSnapshot(editForm);
    else setLessonSnapshot(editForm);
  }, [editForm, isOpen]);

  // --- UPDATED: Live form auto-fill effect ---
  useEffect(() => {
    if (isOpen && editForm.status !== 'Blocked') {
        setEditForm((prev: any) => {
            let updates: any = {};
            let modified = false;

            // Auto-select valid vehicle type
            if (prev.type !== effectiveType && effectiveType) {
                updates.type = effectiveType;
                modified = true;
            }

            // Auto-select first exam center and location for NEW lessons
            if (!prev.id && !prev.examCenter && teacherExamCenters?.length > 0) {
                updates.examCenter = teacherExamCenters[0];
                modified = true;
                
                if (!prev.location) {
                    const allowedIds = EXAM_CENTER_PICKUPS[updates.examCenter] || [];
                    const firstLoc = LESSON_LOCATIONS.find(loc => allowedIds.includes(loc.id));
                    if (firstLoc) updates.location = firstLoc.label;
                }
            }

            // Only trigger a state update if we actually changed something
            return modified ? { ...prev, ...updates } : prev;
        });
    }
  }, [isOpen, editForm.status, effectiveType, teacherExamCenters, setEditForm]);

  // --- [NEW] OPTION 1: HISTORICAL DURATION LOGIC ---
  const isStandardLessonEdit = isEditing && editingSlot?.status !== 'Blocked';
  let effectiveBaseDuration = lessonDuration; // Default to the current profile setting
  
  if (isStandardLessonEdit && editingSlot?.duration) {
      // If it's an old lesson, extract the historical base duration
      effectiveBaseDuration = editingSlot.isDouble 
          ? editingSlot.duration / 2 
          : editingSlot.duration;
  }

  const isLegacyDuration = isStandardLessonEdit && effectiveBaseDuration !== lessonDuration;
  const isBlockMode = editForm.status === 'Blocked';
    
  const isFormValid = isBlockMode 
      ? (!!editForm.time && !!editForm.date && !!editForm.endTime && !!editForm.blockReason) // <--- CHANGED TO blockReason
      : (!!editForm.time && !!editForm.date && !!editForm.location && !!editForm.type && !!editForm.examCenter); 

  // [FIXED] Use the historical base for calculations
  const singleTime = effectiveBaseDuration;
  const doubleTime = effectiveBaseDuration * 2; 
  const currentDuration = editForm.isDouble ? doubleTime : singleTime;
  const currentEndTime = calculateEndTime(editForm.time, currentDuration);

  useEffect(() => {
    if (isOpen && editForm.studentId) {
      const match = students.find(s => s.id === editForm.studentId);
      if (match) setStudentQuery(match.name);
      else setStudentQuery(''); 
    } else if (isOpen && !editForm.studentId) {
      setStudentQuery(''); 
    }
  }, [isOpen, editForm.studentId, students]);

  // [FIXED] The master handler that manages universal time math for ALL slot types!
  const handleChange = (field: string, value: any) => {
    setEditForm((prev: any) => {
        const next = { ...prev, [field]: value };
        
        if (next.status === 'Blocked') {
            if (field === 'time') {
                const currentDur = getDurationMins(prev.time, prev.endTime);
                next.endTime = calculateEndTime(value, currentDur > 0 ? currentDur : 60);
            }
            next.duration = getDurationMins(next.time, next.endTime);
        } else {
            // --- NEW: Handle Standard Lessons ---
            if (field === 'time' || field === 'isDouble') {
                // [FIXED] Use effectiveBaseDuration so old lessons stay old, and new lessons use the profile default
                const calculatedDuration = next.isDouble ? effectiveBaseDuration * 2 : effectiveBaseDuration;
                next.duration = calculatedDuration;
                next.endTime = calculateEndTime(next.time || '00:00', calculatedDuration);
            }
        }
        
        return next;
    });
    if (validationMsg) setValidationMsg(''); 
  };

  const filteredStudents = students.filter(s => {
    const matchesName = s.name.toLowerCase().includes(studentQuery.toLowerCase());
    const matchesVehicle = isBlockMode || !editForm.type || s.vehicle === editForm.type;
    return matchesName && matchesVehicle;
  });

  const allowedLocationIds = editForm.examCenter ? EXAM_CENTER_PICKUPS[editForm.examCenter] : null;
  const availableLocations = allowedLocationIds ? LESSON_LOCATIONS.filter(loc => allowedLocationIds.includes(loc.id)) : LESSON_LOCATIONS;
  const filteredLocations = availableLocations.filter(loc => loc.label.toLowerCase().includes((editForm.location || '').toLowerCase()));

  // --- NEW: DYNAMIC THEME COLORS ---
  const isDraft = editForm.status === 'Draft';
  const primaryBg = isDraft ? 'bg-purple-500' : 'bg-orange';
  const primaryText = isDraft ? 'text-purple-400' : 'text-orange';
  const primaryBorder = isDraft ? 'border-purple-500' : 'border-orange';
  const primaryHover = isDraft ? 'hover:bg-purple-600' : 'hover:brightness-110';
  const primaryLightBg = isDraft ? 'bg-purple-500/10' : 'bg-orange/10';
  const focusBorder = isDraft ? 'focus:border-purple-500' : 'focus:border-orange';
  const themeVariant = isDraft ? 'purple' : (isBlockMode ? 'blocked' : 'orange');

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
            // --- THE FIX: Only require 'isSlotModified' if we are editing an EXISTING slot ---
            disabled={saveSlotLoading || (isEditing && !isSlotModified) || !isFormValid} 
            className={`h-[48px] min-w-[140px] flex items-center justify-center gap-2 px-6 rounded-xl font-bold text-white transition-all active:scale-[0.98] ${
                isBlockMode ? 'bg-red-500 hover:bg-red-600' : `${primaryBg} ${primaryHover}`
            } disabled:opacity-50 disabled:cursor-default disabled:active:scale-100 ml-auto`}
          >
            {saveSlotLoading ? <Loader2 className="animate-spin" size={20} /> : <span>{isEditing ? 'Save Changes' : (isBlockMode ? 'Add Block' : 'Create Lesson')}</span>}
          </button>
        </div>
      }
    >
      <div className="space-y-5"> 
        
        <AnimatePresence>
            {validationMsg && (
              <motion.div
                ref={errorRef}
                variants={ERROR_ALERT_VARIANTS}
                initial="initial" animate="animate" exit="exit"
                className="bg-statusRed/20 border border-statusRed/50 text-statusRed p-3 rounded-lg flex items-center gap-2 text-sm font-bold overflow-hidden"
              >
                <AlertTriangle size={16} className="shrink-0" /> 
                <span>{validationMsg}</span>
              </motion.div>
            )}
        </AnimatePresence>

        <div className="flex p-1 bg-midnight border border-gray-800 rounded-lg">
           <button 
             onClick={() => {
                // Only trigger if we are actually switching from Block -> Lesson
                if (isBlockMode && lessonSnapshot) {
                    // 1. Save the current edits into the Block memory
                    setBlockSnapshot(editForm);
                    
                    // 2. Restore the Lesson memory (but keep the shared date/time)
                    setEditForm({ 
                        ...lessonSnapshot, 
                        date: editForm.date, 
                        time: editForm.time 
                    });
                }
             }}
             className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${!isBlockMode ? `${primaryBg} text-white shadow-md` : 'text-textGrey hover:text-white'}`}
           >
             <Car size={14} /> Lesson
           </button>
           
           <button 
            onClick={() => {
               // Only trigger if we are actually switching from Lesson -> Block
               if (!isBlockMode && blockSnapshot) {
                   // 1. Save the current edits into the Lesson memory
                   setLessonSnapshot(editForm);
                   
                   // 2. Restore the Block memory (but keep the shared date/time)
                   setEditForm({ 
                       ...blockSnapshot, 
                       date: editForm.date, 
                       time: editForm.time 
                   });
               }
            }}
            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${isBlockMode ? 'bg-red-500 text-white shadow-md' : 'text-textGrey hover:text-white'}`}
          >
            <Coffee size={14} /> Block Time
          </button>
        </div>

        {!isBlockMode && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
               <label className="text-[10px] text-textGrey uppercase font-black px-1">{t('Vehicle Category')}</label>
               <div className="flex flex-wrap gap-2">
                  {vehicleTypes.map(vId => {
                      const labelKey = getVehicleLabel(vId);
                      return (
                        <button key={vId} onClick={() => handleChange('type', vId)}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                             effectiveType === vId ? `${primaryBg} text-white ${primaryBorder}` : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                          }`}
                        >
                          {t(labelKey).replace('Private Car', 'Car').replace('Light Goods', 'Van')}
                        </button>
                      );
                  })}
               </div>
            </div>
         )}

        {/* --- [FIXED] DYNAMIC GRID LAYOUT --- */}
        <div className="grid grid-cols-2 gap-4">
             {/* Date takes the full row in Block Mode, or half the row in Lesson Mode */}
             <div className={`space-y-1 ${isBlockMode ? 'col-span-2' : 'col-span-1'}`}>
              <DateSelect 
                label="Date" 
                value={editForm.date || ''}
                minDate={todayStr} 
                variant={themeVariant} // <--- UPDATED
                onChange={(newDate) => handleChange('date', newDate)} 
              />
            </div>

            <div className="space-y-1">
              <TimeSelect 
                label={isBlockMode ? t("Start Time") : t("Time")} 
                value={editForm.time || ''} 
                align={isBlockMode ? "left" : "right"} 
                variant={themeVariant} // <--- UPDATED
                minTime={dynamicMinTime} 
                onChange={(newTime) => handleChange('time', newTime)} 
              />
            </div>

            {/* ONLY VISIBLE IN BLOCK MODE (Sits perfectly next to Start Time) */}
            {isBlockMode && (
                <div className="space-y-1 animate-in fade-in zoom-in-95 duration-200">
                    <TimeSelect 
                        label={t("End Time")} 
                        value={editForm.endTime || ''} 
                        align="right" 
                        variant="blocked" // <--- Blocks always stay red, leave this one!
                        minTime={editForm.time} 
                        onChange={(newEndTime) => handleChange('endTime', newEndTime)} 
                    />
                </div>
            )}
        </div>
        
        {isBlockMode ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                {/* --- [NEW] FAST SELECT BUTTONS --- */}
                <div className="space-y-2">
                    <label className="text-[10px] text-textGrey uppercase font-black px-1 flex items-center justify-between">
                        <span>{t('Quick Select')}</span>
                        <span className="text-red-500 font-black">{getDurationMins(editForm.time, editForm.endTime)} {t('mins total')}</span>
                    </label>
                    
                    {/* [FIXED] Changed to grid-cols-3 so all 6 buttons are perfectly equal width! */}
                    <div className="grid grid-cols-3 gap-2">
                        {[30, 45, 60, 90, 120].map(mins => {
                            const [h, m] = (editForm.time || '08:00').split(':').map(Number);
                            const maxAllowed = (23 * 60 + 45) - (h * 60 + m);
                            const isTooLong = mins > maxAllowed;

                            return (
                                <button
                                    key={mins}
                                    disabled={isTooLong}
                                    type="button"
                                    onClick={() => handleChange('endTime', calculateEndTime(editForm.time, mins))}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                        getDurationMins(editForm.time, editForm.endTime) === mins
                                        ? 'bg-red-500 text-white border-red-500' 
                                        : isTooLong
                                            ? 'bg-transparent text-gray-700 border-gray-800 opacity-30 cursor-not-allowed'
                                            : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                                    }`}
                                >
                                    {mins >= 60 ? (mins % 60 === 0 ? `${mins/60}h` : `${Math.floor(mins/60)}h ${mins%60}m`) : `${mins}m`}
                                </button>
                            );
                        })}
                        
                        <button
                            type="button"
                            onClick={() => {
                                const [h, m] = (editForm.time || '08:00').split(':').map(Number);
                                const maxAllowed = (23 * 60 + 45) - (h * 60 + m);
                                handleChange('endTime', calculateEndTime(editForm.time, maxAllowed));
                            }}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                editForm.endTime === '23:45'
                                ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                            }`}
                        >
                            {t('Full Day')}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] text-textGrey uppercase font-black px-1">{t('Reason')}</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {BLOCK_REASONS.map(reason => (
                            <button
                                key={reason.id}
                                type="button"
                                onClick={() => handleChange('blockReason', reason.id)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                                    editForm.blockReason === reason.id ? 'bg-white text-black border-white' : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                                }`}
                            >
                                {t(reason.label)}
                            </button>
                        ))}
                    </div>
                    <input 
                      type="text" 
                      placeholder={t("Select a reason or type here...")}
                      value={editForm.blockReason && BLOCK_REASONS.find(r => r.id === editForm.blockReason) ? t(getBlockReasonLabel(editForm.blockReason)) : (editForm.blockReason || '')}
                      onChange={(e) => handleChange('blockReason', e.target.value)}
                      className={`w-full p-3 bg-midnight border border-gray-700 rounded-lg text-white outline-none transition-colors placeholder:text-gray-600 focus:border-red-500`}
                    />
                </div>
            </div>
        ) : (
            <>
                <div className="flex items-center justify-between bg-midnight border border-gray-800 p-4 rounded-xl cursor-pointer" onClick={() => handleChange('isDouble', !editForm.isDouble)}>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{editForm.isDouble ? 'Double Session' : 'Single Session'}</span>
                    
                    {/* --- [NEW] LEGACY BADGE --- */}
                    {isLegacyDuration && (
                        <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/30">
                            Legacy {effectiveBaseDuration}m
                        </span>
                    )}
                </div>
                
                <span className="text-xs text-textGrey">
                    <span className="text-white font-medium">{currentDuration} min</span> 
                    <span className="mx-1.5 text-gray-600">•</span>
                    Ends at <span className={`${primaryText} font-bold`}>{currentEndTime}</span>
                </span>
            </div>
            <button type="button" className={`relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${editForm.isDouble ? primaryBg : 'bg-gray-700'}`}>
                <span className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${editForm.isDouble ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>

                <div className={`space-y-1 relative animate-in fade-in slide-in-from-top-1 duration-200 ${showStudentDropdown ? 'z-[60]' : 'z-30'}`}> 
                  <label className="text-[10px] text-textGrey uppercase font-black px-1">Student</label>
                  <div className="relative">
                      <Search className="absolute left-3 top-3 text-textGrey" size={18} />
                      <input 
                        type="text" placeholder="Search Student..." value={studentQuery}
                        onChange={(e) => { setStudentQuery(e.target.value); setShowStudentDropdown(true); handleChange('studentId', ''); }}
                        onFocus={() => setShowStudentDropdown(true)} onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                        className={`w-full pl-10 p-3 bg-midnight border border-gray-700 rounded-lg text-white ${focusBorder} outline-none transition-colors`}
                      />
                      {showStudentDropdown && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {filteredStudents.length > 0 ? (
                              filteredStudents.map(student => (
                                <div key={student.id} onMouseDown={(e) => e.preventDefault()} onClick={() => { handleChange('studentId', student.id); setStudentQuery(student.name); setShowStudentDropdown(false); }} className="p-3 hover:bg-midnight cursor-pointer transition-colors border-b border-gray-800 last:border-0 flex items-center justify-between">
                                  <span className="font-bold text-white text-sm">{student.name}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-textGrey">{student.vehicle}</span>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-textGrey text-xs text-center flex flex-col gap-1"><span>No students found.</span><span className="opacity-50">Filter is active: {editForm.type}</span></div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
                
                <div className={`space-y-2 relative animate-in fade-in slide-in-from-top-1 duration-200 ${showCenterDropdown ? 'z-[60]' : 'z-20'}`} ref={centerDropdownRef}>
                   <label className="text-[10px] text-textGrey uppercase font-black px-1">Exam Center (Required)</label>
                   <div onClick={() => setShowCenterDropdown(!showCenterDropdown)} className={`w-full pl-4 pr-3 p-3 bg-midnight border rounded-lg text-white cursor-pointer flex items-center justify-between transition-colors ${showCenterDropdown ? primaryBorder : 'border-gray-700 hover:border-gray-500'}`}>
                        <span className={`text-sm font-bold truncate mr-2 ${!editForm.examCenter ? 'text-gray-500' : ''}`}>
                            {editForm.examCenter ? t(getExamCenterLabel(editForm.examCenter)) : t('Select Exam Center...')}
                        </span>
                        <ChevronDown size={16} className={`text-textGrey shrink-0 transition-transform ${showCenterDropdown ? 'rotate-180' : ''}`} />
                   </div>
                   {showCenterDropdown && (
                        <div className="absolute bottom-full mb-1 left-0 right-0 bg-slate border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200 select-none">
                            <div className="max-h-56 overflow-y-auto custom-scrollbar">
                                {teacherExamCenters.length > 0 ? (
                                    teacherExamCenters.map((centerId) => (
                                        <div key={centerId}
                                            onClick={() => {
                                                handleChange('examCenter', centerId); setShowCenterDropdown(false);
                                                const allowed = EXAM_CENTER_PICKUPS[centerId] || [];
                                                const currentLabel = editForm.location;
                                                if (currentLabel && !LESSON_LOCATIONS.some(l => allowed.includes(l.id) && l.label === currentLabel)) { handleChange('location', ''); }
                                            }}
                                            className={`p-3 text-sm font-bold cursor-pointer transition-colors border-b border-gray-800 last:border-0 flex items-center justify-between ${editForm.examCenter === centerId ? `${primaryLightBg} ${primaryText}` : 'text-white hover:bg-midnight'}`}
                                        >
                                            <span>{t(getExamCenterLabel(centerId))}</span>
                                            {editForm.examCenter === centerId && <Check size={16} />}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-xs text-gray-500 italic">{t('No centers selected in profile.')}</div>
                                )}
                            </div>
                        </div>
                   )}
                </div>

                <div className={`space-y-2 relative animate-in fade-in slide-in-from-top-1 duration-200 ${showLocationDropdown ? 'z-[60]' : 'z-10'}`}>
                  <div className="space-y-1">
                    <label className="text-[10px] text-textGrey uppercase font-black px-1 flex justify-between">
                        <span>Pickup Location</span>
                        {editForm.examCenter && <span className={`${primaryText}`}>{availableLocations.length} options</span>}
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 text-textGrey z-10" size={18} />
                      <input 
                        type="text" disabled={!editForm.examCenter}
                        placeholder={!editForm.examCenter ? t("Select Exam Center first...") : t("Select valid pickup point...")}
                        value={t(editForm.location)} 
                        onChange={e => { handleChange('location', e.target.value); setShowLocationDropdown(true); }}
                        onFocus={() => setShowLocationDropdown(true)} onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
                        className={`w-full pl-10 p-3 bg-midnight border rounded-lg text-white ${focusBorder} outline-none transition-colors ${!editForm.examCenter ? 'border-gray-800 opacity-50 cursor-not-allowed' : 'border-gray-700'}`}
                      />
                      {showLocationDropdown && filteredLocations.length > 0 && editForm.examCenter && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                {filteredLocations.map(loc => (
                                    <div key={loc.id} onMouseDown={(e) => e.preventDefault()} onClick={() => { handleChange('location', loc.label); setShowLocationDropdown(false); }} className="p-3 hover:bg-midnight cursor-pointer transition-colors border-b border-gray-800 last:border-0">
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
                          <button key={loc.id} type="button" onClick={() => handleChange('location', loc.label)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${editForm.location === loc.label ? `${primaryBg} text-white ${primaryBorder}` : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'}`}
                          >
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
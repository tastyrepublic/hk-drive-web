import { AlertTriangle, Trash2, Loader2, Calendar, Clock, MapPin, Search, Car, Coffee } from 'lucide-react';
import { Modal } from './Modal';
import { useState, useEffect } from 'react';

// --- Import Constants & Helpers ---
import { 
  LESSON_LOCATIONS, 
  BLOCK_REASONS, 
  VEHICLE_TYPES 
} from '../../constants/list';

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
  students: any[]; 
  vehicleTypes: string[]; 
}

export function EditLessonModal({
  editingSlot, setEditingSlot, 
  editForm, setEditForm, 
  validationMsg, setValidationMsg, 
  saveSlotLoading, isSlotModified, 
  onSave, onDelete,
  lessonDuration = 45,
  students = [],
  vehicleTypes = ['1a'] // Default to ID '1a'
}: Props) {

  const isOpen = !!editingSlot; 
  const isEditing = editingSlot && editingSlot.id;

  const [studentQuery, setStudentQuery] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  
  const blockDurations = [15, 30, 45, 60, 90, 120];

  const singleTime = lessonDuration;
  const doubleTime = lessonDuration * 2;
  const isBlockMode = editForm.status === 'Blocked';

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

  const handleFullDay = () => {
      handleChange('time', '09:00'); 
      handleChange('customDuration', 540); 
  };

  // --- FILTER: Compare IDs (editForm.type is ID, s.vehicle is ID) ---
  const filteredStudents = students.filter(s => {
    const matchesName = s.name.toLowerCase().includes(studentQuery.toLowerCase());
    const matchesVehicle = isBlockMode || !editForm.type || s.vehicle === editForm.type;
    return matchesName && matchesVehicle;
  });

  const filteredLocations = LESSON_LOCATIONS.filter(loc => 
    loc.label.toLowerCase().includes((editForm.location || '').toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setEditingSlot(null)}
      title={isEditing ? (isBlockMode ? "Edit Block" : "Edit Lesson") : "Add New Slot"} 
      maxWidth="max-w-md"
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
            disabled={saveSlotLoading || !isSlotModified} 
            className={`h-[48px] min-w-[140px] flex items-center justify-center gap-2 px-6 rounded-xl font-bold text-white transition-all active:scale-[0.98] ${
                isBlockMode 
                 ? 'bg-statusRed hover:brightness-110' 
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
        
        {validationMsg && (
          <div className="bg-statusRed/20 border border-statusRed/50 text-statusRed p-3 rounded-lg flex items-center gap-2 text-sm font-bold animate-in shake-in-1">
            <AlertTriangle size={16} /> {validationMsg}
          </div>
        )}

        <div className="flex p-1 bg-midnight border border-gray-800 rounded-lg">
           <button 
             onClick={() => {
                const originalWasLesson = editingSlot?.status === 'Booked' || !editingSlot?.status;
                setEditForm({ 
                    ...editForm, 
                    status: 'Booked', 
                    type: originalWasLesson ? (editingSlot?.type || '1a') : '1a',
                    studentId: editingSlot?.studentId || '',
                    customDuration: editingSlot?.customDuration || undefined
                });
             }}
             className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${!isBlockMode ? 'bg-orange text-white shadow-md' : 'text-textGrey hover:text-white'}`}
           >
             <Car size={14} /> Lesson
           </button>
           
           <button 
             onClick={() => {
                setEditForm({ 
                    ...editForm, 
                    status: 'Blocked', 
                    studentId: '', 
                    type: (editingSlot?.status === 'Blocked' && editingSlot?.type) ? editingSlot.type : '',
                    customDuration: (editingSlot?.status === 'Blocked' && editingSlot?.customDuration) 
                        ? editingSlot.customDuration 
                        : 60 
                });
             }}
             className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${isBlockMode ? 'bg-statusRed text-white shadow-md' : 'text-textGrey hover:text-white'}`}
           >
             <Coffee size={14} /> Block Time
           </button>
        </div>

        {!isBlockMode && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
               <label className="text-[10px] text-textGrey uppercase font-black px-1">Vehicle Category</label>
               <div className="flex flex-wrap gap-2">
                  {/* Filter and Map Objects */}
                  {VEHICLE_TYPES.filter(vObj => vehicleTypes.includes(vObj.id)).map(v => {
                      const label = v.label.replace('Private Car', 'Car').replace('Light Goods', 'Van');
                      return (
                        <button
                          key={v.id}
                          onClick={() => handleChange('type', v.id)}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                             editForm.type === v.id
                               ? 'bg-orange text-white border-orange'
                               : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                          }`}
                        >
                          {label}
                        </button>
                      );
                  })}
               </div>
            </div>
         )}

        <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
              <label className="text-[10px] text-textGrey uppercase font-black px-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 text-textGrey" size={18} />
                <input 
                  type="date"
                  value={editForm.date || ''}
                  onChange={e => handleChange('date', e.target.value)}
                  className="w-full pl-10 p-3 bg-midnight border border-gray-700 rounded-lg text-white focus:border-orange outline-none transition-colors appearance-none" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-textGrey uppercase font-black px-1">Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 text-textGrey" size={18} />
                <input 
                  type="time" 
                  value={editForm.time || ''} 
                  onChange={e => handleChange('time', e.target.value)} 
                  className="w-full pl-10 p-3 bg-midnight border border-gray-700 rounded-lg text-white focus:border-orange outline-none transition-colors appearance-none" 
                />
              </div>
            </div>
        </div>
        
        {isBlockMode ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-2">
                    <label className="text-[10px] text-textGrey uppercase font-black px-1 flex justify-between">
                        <span>Duration</span>
                        <span className="text-orange">Ends at {currentEndTime}</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {blockDurations.map(mins => (
                             <button
                                key={mins}
                                onClick={() => handleChange('customDuration', mins)}
                                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                    (editForm.customDuration || singleTime) === mins
                                    ? 'bg-statusRed text-white border-statusRed'
                                    : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                                }`}
                             >
                                {mins}m
                             </button>
                        ))}
                        <button
                            onClick={handleFullDay}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                (editForm.customDuration) === 540
                                ? 'bg-statusRed text-white border-statusRed'
                                : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                            }`}
                        >
                            Full Day
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] text-textGrey uppercase font-black px-1">Reason</label>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                        {/* Map Block Reasons by ID */}
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
                                {reason.label}
                            </button>
                        ))}
                    </div>

                    <input 
                      type="text" 
                      placeholder="Select a reason or type here..."
                      value={editForm.type || ''}
                      onChange={(e) => handleChange('type', e.target.value)}
                      className="w-full p-3 bg-midnight border border-gray-700 rounded-lg text-white focus:border-statusRed outline-none transition-colors placeholder:text-gray-600"
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

                <div className="space-y-1 relative z-50 animate-in fade-in slide-in-from-top-1 duration-200"> 
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
                                      {/* Just ID is shown here, might want to find label if critical, but simplified for now */}
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

                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 relative z-40">
                  <div className="space-y-1">
                    <label className="text-[10px] text-textGrey uppercase font-black px-1">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 text-textGrey z-10" size={18} />
                      <input 
                        type="text" 
                        placeholder="Enter location..."
                        value={editForm.location} 
                        onChange={e => {
                            handleChange('location', e.target.value);
                            setShowLocationDropdown(true);
                        }}
                        onFocus={() => setShowLocationDropdown(true)}
                        onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
                        className="w-full pl-10 p-3 bg-midnight border border-gray-700 rounded-lg text-white focus:border-orange outline-none transition-colors"
                      />
                      {showLocationDropdown && filteredLocations.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                {filteredLocations.map(loc => (
                                    <div 
                                        key={loc.id}
                                        className="p-3 hover:bg-midnight cursor-pointer transition-colors border-b border-gray-800 last:border-0"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            handleChange('location', loc.label); // Save LABEL for locations
                                            setShowLocationDropdown(false);
                                        }}
                                    >
                                        <span className="font-bold text-white text-sm">{loc.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {LESSON_LOCATIONS.map(loc => (
                      <button 
                        key={loc.id}
                        type="button" 
                        onClick={() => handleChange('location', loc.label)} // Save LABEL
                        className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                          editForm.location === loc.label 
                            ? 'bg-orange text-white border-orange' 
                            : 'bg-transparent text-textGrey border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        {loc.label}
                      </button>
                    ))}
                  </div>
                </div>
            </>
        )}
      </div>
    </Modal>
  );
}
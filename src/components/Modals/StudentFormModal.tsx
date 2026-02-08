import { useMemo } from 'react';
import { 
  AlertTriangle, ChevronDown, Loader2, Trash2, 
  Share2, AlertCircle, CheckCircle2, Link, Link2Off, Ban 
} from 'lucide-react';
import { Modal } from './Modal'; 

interface Props {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isEditing: boolean;
  studentForm: any;
  setStudentForm: (form: any) => void;
  studentError: string;
  saveStudentLoading: boolean;
  isStudentModified: boolean;
  onSave: () => Promise<void>;
  onDelete: () => void;
  onSendInvite: (student: any) => void;      // <--- NEW
  onCancelInvite: (id: string) => void;     // <--- NEW
  vehicleTypes: string[];
  students: any[]; 
}

export function StudentFormModal({
  isOpen, setIsOpen, isEditing, studentForm, setStudentForm,
  studentError, saveStudentLoading, isStudentModified, onSave, onDelete, 
  onSendInvite, onCancelInvite, // Destructure new props
  vehicleTypes = ['Private Car (Auto) 1A'],
  students = [] 
}: Props) {

  // 1. Logic to check for duplicate phone numbers
  const duplicateStudent = useMemo(() => {
    if (saveStudentLoading) return null;
    const currentInput = (studentForm.phone || '').toString().trim();
    if (currentInput.length < 4) return null;

    return students.find(s => {
      const existingPhone = (s.phone || '').toString().trim();
      const isDifferentStudent = isEditing ? s.id !== studentForm.id : true;
      return isDifferentStudent && existingPhone === currentInput;
    });
  }, [studentForm.phone, students, isEditing, saveStudentLoading, studentForm.id]);

  // 2. Status Checks
  const isAlreadyLinked = !!studentForm.uid;
  // An invite is active if they aren't linked yet BUT have a token in the DB
  const hasActiveInvite = !isAlreadyLinked && !!studentForm.inviteToken; 

  // 3. Handlers
  const handleInviteClick = () => {
     const studentData = {
         id: studentForm.id,
         name: studentForm.name,
         phone: studentForm.phone,
         inviteToken: studentForm.inviteToken,
         inviteExpiresAt: studentForm.inviteExpiresAt
     };
     onSendInvite(studentData);
  };

  const handleRevokeClick = () => {
    if (studentForm.id) {
        onCancelInvite(studentForm.id);
        // Optimistically clear form state so UI updates instantly
        setStudentForm((prev: any) => ({ ...prev, inviteToken: null, inviteExpiresAt: null }));
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title={isEditing ? 'Edit Student' : 'Add Student'}
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-between items-center gap-4">
           {/* DELETE BUTTON (Only if editing) */}
           {isEditing ? (
            <button 
                onClick={onDelete} 
                disabled={saveStudentLoading}
                className="h-[48px] w-[48px] shrink-0 flex items-center justify-center bg-midnight border border-gray-800 text-statusRed hover:bg-statusRed/10 hover:border-statusRed rounded-xl transition-all disabled:opacity-30"
            >
                <Trash2 size={20} />
            </button>
          ) : <div />}
          
          {/* SAVE BUTTON */}
          <button 
            onClick={onSave} 
            disabled={saveStudentLoading || !isStudentModified || !!duplicateStudent}
            className="h-[48px] min-w-[140px] flex items-center justify-center gap-2 px-6 bg-orange hover:brightness-110 text-white rounded-xl transition-all font-bold active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ml-auto"
          >
            {saveStudentLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <span>{isEditing ? 'Update Student' : 'Save Student'}</span>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-5 min-h-[300px]">
        
        {/* Error Banner */}
        {studentError && (
          <div className="bg-statusRed/20 border border-statusRed/50 text-statusRed p-3 rounded-lg flex items-center gap-2 text-sm font-bold animate-in shake-in-1">
            <AlertTriangle size={16} /> {studentError}
          </div>
        )}

        {/* Name Input */}
        <div className="space-y-1">
          <label className="text-[10px] text-textGrey uppercase font-black px-1">Full Name</label>
          <input 
            type="text" 
            placeholder="Enter name" 
            value={studentForm.name} 
            onChange={e => setStudentForm({...studentForm, name: e.target.value})} 
            className="w-full p-3 bg-midnight border border-gray-800 rounded-lg text-white focus:border-orange outline-none transition-colors" 
          />
        </div>

        {/* Phone Input */}
        <div className="space-y-1">
          <label className="text-[10px] text-textGrey uppercase font-black px-1">Phone Number</label>
          <input 
            type="text" 
            placeholder="WhatsApp / Mobile" 
            maxLength={12}
            value={studentForm.phone} 
            onChange={e => {
              const onlyNums = e.target.value.replace(/\D/g, '');
              setStudentForm({...studentForm, phone: onlyNums});
            }} 
            className={`w-full p-3 bg-midnight border rounded-lg text-white outline-none transition-colors ${
              duplicateStudent ? 'border-statusRed' : 'border-gray-800 focus:border-orange'
            }`} 
          />
          {duplicateStudent && (
            <div className="flex items-center gap-1.5 mt-1 text-statusRed text-[11px] font-bold animate-in fade-in slide-in-from-top-1">
                <AlertCircle size={14} />
                <span>Already exists as "{duplicateStudent.name}"</span>
            </div>
          )}
        </div>

        {/* Vehicle & Route Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] text-textGrey uppercase font-black px-1">Vehicle Type</label>
            <div className="relative">
              <select 
                value={studentForm.vehicle} 
                onChange={e => setStudentForm({...studentForm, vehicle: e.target.value})} 
                className="w-full p-3 bg-midnight border border-gray-800 rounded-lg text-white focus:border-orange outline-none appearance-none text-sm transition-colors"
              >
                {vehicleTypes.map(v => (
                    <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-textGrey pointer-events-none" size={14} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-textGrey uppercase font-black px-1">Exam Route</label>
            <div className="relative">
              <select 
                value={studentForm.examRoute} 
                onChange={e => setStudentForm({...studentForm, examRoute: e.target.value})} 
                className="w-full p-3 bg-midnight border border-gray-800 rounded-lg text-white focus:border-orange outline-none appearance-none text-sm transition-colors"
              >
                <option>Not Assigned</option>
                <option>Tin Kwong Road</option>
                <option>Happy Valley</option>
                <option>Pui Ching Road</option>
                <option>Loyal Street</option>
                <option>Wing Hau Street</option>
                <option>Chung Yee Street</option>
                <option>Shek Yam</option>
                <option>Shatin</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-textGrey pointer-events-none" size={14} />
            </div>
          </div>
        </div>

        {/* --- STUDENT ACCESS SECTION --- */}
        {/* Only show this section if the student is saved (has an ID) */}
        {isEditing && studentForm.id && (
            <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between px-1 mb-3">
                    <label className="text-[10px] uppercase font-black text-textGrey tracking-wider">
                        Account Access
                    </label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAlreadyLinked ? 'bg-statusGreen/20 text-statusGreen' : 'bg-gray-800 text-textGrey'}`}>
                        {isAlreadyLinked ? 'CONNECTED' : hasActiveInvite ? 'INVITE SENT' : 'NOT LINKED'}
                    </span>
                </div>
                
                {isAlreadyLinked ? (
                  /* STATE A: ALREADY LINKED */
                  <div className="w-full flex items-center justify-between p-4 rounded-xl bg-statusGreen text-white shadow-lg shadow-statusGreen/10">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold leading-tight">Student Linked</p>
                            <p className="text-[10px] opacity-80 font-medium">Access is active</p>
                        </div>
                      </div>
                      <Link size={18} className="opacity-40" />
                  </div>
                ) : (
                  /* STATE B: NOT LINKED (Can Invite or Cancel) */
                  <div className="space-y-3">
                      {/* Main Action Button */}
                      <button
                          onClick={handleInviteClick}
                          disabled={saveStudentLoading}
                          className="group w-full flex items-center justify-between p-4 rounded-xl bg-midnight border-2 border-dashed border-statusGreen/30 text-statusGreen hover:bg-statusGreen/5 hover:border-statusGreen/50 transition-all disabled:opacity-50"
                      >
                          <div className="flex items-center gap-3">
                            <div className="bg-statusGreen/10 p-2 rounded-lg group-hover:bg-statusGreen/20 transition-colors">
                                <Share2 size={20} />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-black leading-tight">
                                    {hasActiveInvite ? 'Resend Invite Link' : 'Send Invite'}
                                </p>
                                <p className="text-[10px] text-textGrey font-medium">
                                    {hasActiveInvite ? 'Copy the existing WhatsApp link' : 'Link this profile via WhatsApp'}
                                </p>
                            </div>
                          </div>
                          <Link2Off size={18} className="text-textGrey opacity-30" />
                      </button>

                      {/* Cancel Button (Only if invite is pending) */}
                      {hasActiveInvite && (
    <button 
      type="button" // <--- 1. ADD THIS (Prevents form submit)
      onClick={(e) => {
          e.preventDefault();  // <--- 2. ADD THIS (Safety)
          e.stopPropagation(); // <--- 3. ADD THIS (Safety)
          handleRevokeClick();
      }}
      className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-statusRed/10 text-statusRed text-xs font-bold hover:bg-statusRed/20 transition-all border border-transparent hover:border-statusRed/30"
    >
       <Ban size={14} /> Cancel Invite Link
    </button>
)}
                  </div>
                )}
            </div>
        )}
      </div>
    </Modal>
  );
}
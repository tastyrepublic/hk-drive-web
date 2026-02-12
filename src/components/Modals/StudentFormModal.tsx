import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  AlertTriangle, ChevronDown, Loader2, Trash2, 
  Share2, AlertCircle, Link2Off, Ban, Unlink,
  Pencil, Send, Check, Smartphone, Copy, Lock,
  User, Phone, Car, MapPin, 
  Route as RouteIcon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; //
import { Modal } from './Modal'; 
import { ConfirmModal } from './ConfirmModal';

// --- Import Helpers & Lists ---
import { 
  VEHICLE_TYPES, 
  EXAM_CENTERS, 
  EXAM_ROUTES, 
  getVehicleLabel, 
  getExamCenterLabel 
} from '../../constants/list';

// Import the new global animations
import { ERROR_ALERT_VARIANTS, smoothScrollTo } from '../../constants/animations'; 

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
  onSendInvite: (student: any) => Promise<void>;
  onCancelInvite: (id: string) => Promise<void>;
  onUnlink: (id: string) => Promise<void>;
  students: any[];
  showToast: (msg: string, type: 'success' | 'error') => void;
  teacherVehicles?: string[];
}

export function StudentFormModal({
  isOpen, setIsOpen, isEditing, studentForm, setStudentForm,
  studentError, saveStudentLoading, isStudentModified, onSave, onDelete, 
  onSendInvite, onCancelInvite, onUnlink,
  students = [],
  showToast,
  teacherVehicles = [] 
}: Props) {

  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const resetTimerRef = useRef<any>(null);
  
  // Ref for the error message container
  const errorRef = useRef<HTMLDivElement>(null);

  const [cancelLoading, setCancelLoading] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  
  const [isLocked, setIsLocked] = useState(isEditing);
  const [initialSnapshot, setInitialSnapshot] = useState<any>(null);

  // Dropdown States
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showRouteDropdown, setShowRouteDropdown] = useState(false);
  const vehicleRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<HTMLDivElement>(null);

  // --- FILTER OBJECTS BY ID ---
  const activeVehicleOptions = useMemo(() => {
    if (teacherVehicles.length === 0) return VEHICLE_TYPES;
    return VEHICLE_TYPES.filter(v => teacherVehicles.includes(v.id));
  }, [teacherVehicles]);

  // --- Calculate Routes for the View Mode ---
  const relevantRoutes = useMemo(() => {
    if (!studentForm.examRoute || studentForm.examRoute === 'Not Assigned') return [];
    return EXAM_ROUTES.filter(r => r.centerId === studentForm.examRoute);
  }, [studentForm.examRoute]);

  useEffect(() => {
    if (isOpen) {
      setIsLocked(isEditing);
      setInitialSnapshot({ ...studentForm });
      setInviteStatus('idle');
      setCopyStatus('idle');
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    }
    return () => {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [isOpen, isEditing]);

  // --- NEW: Scroll to error when it appears ---
  useEffect(() => {
    if (studentError) {
        smoothScrollTo(errorRef);
    }
  }, [studentError]);

  // Close Dropdowns on Click Outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (vehicleRef.current && !vehicleRef.current.contains(event.target as Node)) {
        setShowVehicleDropdown(false);
      }
      if (routeRef.current && !routeRef.current.contains(event.target as Node)) {
        setShowRouteDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [confirmConfig, setConfirmConfig] = useState<{
      isOpen: boolean;
      title: string;
      msg: string;
      action: () => Promise<void> | void;
  } | null>(null);

  // Live Data Logic
  const liveStudent = useMemo(() => {
    if (!isEditing || !studentForm.id) return studentForm;
    return students.find(s => s.id === studentForm.id) || studentForm;
  }, [students, studentForm, isEditing]);

  const isAlreadyLinked = !!liveStudent.uid;
  const hasActiveInvite = !isAlreadyLinked && !!liveStudent.inviteToken;
  const isPhoneLocked = isLocked || isAlreadyLinked || hasActiveInvite;
  const showPendingUI = hasActiveInvite || cancelLoading || inviteStatus !== 'idle';

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

  const handleEnterEditMode = () => {
    setInitialSnapshot({ ...studentForm });
    setIsLocked(false);
  };

  const handleCancelEdit = () => {
    if (initialSnapshot) {
        setStudentForm({ ...initialSnapshot });
    }
    setIsLocked(true);
  };

  const handleInviteClick = async () => {
     if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
     setInviteStatus('sending');
     const minWait = new Promise(resolve => setTimeout(resolve, 800));
     try {
        const payload = {
            ...studentForm, 
            inviteToken: liveStudent?.inviteToken || null, 
            inviteExpiresAt: liveStudent?.inviteExpiresAt || null 
        };
        await Promise.all([onSendInvite(payload), minWait]);
        setInviteStatus('sent');
        resetTimerRef.current = setTimeout(() => {
            setInviteStatus('idle');
        }, 2500);
     } catch (error) { 
         console.error(error); 
         showToast('Failed to send invite', 'error');
         setInviteStatus('idle');
     }
  };

  const handleCopyLink = () => {
    const tokenToUse = liveStudent.inviteToken; 
    if (!tokenToUse) return;
    const inviteLink = `${window.location.origin}?invite=${liveStudent.id}&token=${tokenToUse}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
        setCopyStatus('copied');
        showToast('Link copied to clipboard!', 'success');
        setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  const handleRevokeClick = async () => {
    if (!studentForm.id) return;
    setCancelLoading(true);
    const minWait = new Promise(resolve => setTimeout(resolve, 800));
    try {
        await Promise.all([onCancelInvite(studentForm.id), minWait]);
        showToast('Invite link revoked', 'success');
    } catch (e) { 
        console.error(e);
        showToast('Failed to revoke link', 'error');
    } finally { 
        setCancelLoading(false); 
    }
  };

  const handleUnlinkClick = () => {
      setConfirmConfig({
          isOpen: true,
          title: "Unlink Device",
          msg: "Are you sure? This will disconnect the student's device.",
          action: async () => {
              setUnlinkLoading(true);
              try {
                  await onUnlink(studentForm.id);
                  showToast('Device unlinked successfully', 'success');
                  setConfirmConfig(null);
              } catch (e) { 
                  console.error(e); 
                  showToast('Failed to unlink device', 'error');
              } finally { 
                  setUnlinkLoading(false); 
              }
          }
      });
  };

  const inputBase = "w-full p-3 rounded-lg text-white transition-all outline-none pl-10"; 
  const inputView = "bg-transparent border border-transparent font-bold opacity-100 cursor-default";
  const inputEdit = "bg-midnight border border-gray-800 focus:border-orange";

  return (
    <>
      <ConfirmModal 
        isOpen={!!confirmConfig?.isOpen}
        title={confirmConfig?.title || ''}
        msg={confirmConfig?.msg || ''}
        isLoading={unlinkLoading}
        onConfirm={async () => { if (confirmConfig?.action) await confirmConfig.action(); }}
        onCancel={() => setConfirmConfig(null)}
      />

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={isEditing ? 'Student Details' : 'Add Student'}
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-between items-center gap-3 w-full">
             {isEditing ? (
                <button 
                  onClick={onDelete}
                  className="p-3 rounded-xl bg-midnight border border-gray-800 text-statusRed hover:bg-statusRed/10 hover:border-statusRed transition-colors"
                >
                  <Trash2 size={20} />
                </button>
             ) : <div />}

             <div className="flex gap-3 ml-auto">
                {!isLocked && isEditing && (
                    <button 
                        onClick={handleCancelEdit}
                        disabled={saveStudentLoading}
                        className="px-6 py-3 rounded-xl font-bold text-textGrey hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                )}

                {(!isLocked || !isEditing) && (
                    <button 
                        onClick={async () => { await onSave(); setIsLocked(true); }} 
                        disabled={saveStudentLoading || !isStudentModified || !!duplicateStudent}
                        className="px-6 py-3 rounded-xl font-bold bg-orange text-white hover:brightness-110 shadow-lg disabled:opacity-50 disabled:bg-gray-800 disabled:text-gray-500 disabled:shadow-none flex items-center gap-2"
                    >
                        {saveStudentLoading ? <Loader2 className="animate-spin" size={20} /> : 'Save'}
                    </button>
                )}
                
                {isLocked && isEditing && (
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="px-6 py-3 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        Close
                    </button>
                )}
             </div>
          </div>
        }
      >
        <div className="space-y-6 min-h-[100px] relative transition-all duration-300">
            
            {isEditing && isLocked && (
                <button 
                    onClick={handleEnterEditMode}
                    className="absolute -top-1 right-0 text-orange hover:text-white flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-orange/10 hover:bg-orange transition-all"
                >
                    <Pencil size={12} /> Edit Details
                </button>
            )}

            {/* ANIMATED ERROR MESSAGE WITH SCROLL REF */}
            <AnimatePresence>
                {studentError && (
                    <motion.div 
                        ref={errorRef}
                        variants={ERROR_ALERT_VARIANTS}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="bg-statusRed/20 border border-statusRed/50 text-statusRed p-3 rounded-lg flex items-center gap-2 text-sm font-bold overflow-hidden"
                    >
                        <AlertTriangle size={16} className="shrink-0" /> 
                        <span>{studentError}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FORM */}
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[10px] text-textGrey uppercase font-black px-1">Full Name</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-textGrey" size={18} />
                        <input 
                            type="text" 
                            disabled={isLocked}
                            value={studentForm.name} 
                            onChange={e => setStudentForm({...studentForm, name: e.target.value})} 
                            className={`${inputBase} ${isLocked ? inputView : inputEdit}`} 
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] text-textGrey uppercase font-black">Phone Number</label>
                        {(!isLocked && isPhoneLocked) && (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-orange uppercase tracking-wider animate-pulse">
                                <Lock size={10} /> {isAlreadyLinked ? 'Device Linked' : 'Invite Pending'}
                            </span>
                        )}
                    </div>
                    
                    <div className="relative">
                        <Phone className="absolute left-3 top-3 text-textGrey" size={18} />
                        <input 
                            type="text" 
                            disabled={isPhoneLocked}
                            maxLength={12}
                            value={studentForm.phone} 
                            onChange={e => {
                                const onlyNums = e.target.value.replace(/\D/g, '');
                                setStudentForm({...studentForm, phone: onlyNums});
                            }} 
                            className={`${inputBase} ${isLocked ? inputView : inputEdit} 
                                ${duplicateStudent && !isLocked ? 'border-statusRed' : ''} 
                                ${(!isLocked && isPhoneLocked) ? 'opacity-50 cursor-not-allowed bg-gray-900/50 text-gray-400' : ''}`} 
                        />
                        {(!isLocked && isPhoneLocked) && (
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-textGrey" size={14} />
                        )}
                    </div>

                    {duplicateStudent && !isLocked && (
                        <div className="flex items-center gap-1.5 mt-1 text-statusRed text-[11px] font-bold">
                            <AlertCircle size={14} /> <span>Exists as "{duplicateStudent.name}"</span>
                        </div>
                    )}
                </div>

                {/* ... Rest of the form inputs (Vehicle, Exam Center) ... */}
                {/* (I am keeping the rest of your form logic identical, just hiding it for brevity in this response block, 
                    but in your actual file, you keep the code below exactly as it was) */}
                <div className="grid grid-cols-2 gap-4">
                    {/* CUSTOM VEHICLE DROPDOWN */}
                    <div className="space-y-1" ref={vehicleRef}>
                        <label className="text-[10px] text-textGrey uppercase font-black px-1">Vehicle</label>
                        <div className="relative">
                            {isLocked ? (
                                <div className="relative">
                                    <Car className="absolute left-3 top-3 text-textGrey" size={18} />
                                    <div className={`${inputBase} ${inputView} flex items-center h-[46px]`}>
                                        {getVehicleLabel(studentForm.vehicle)}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div 
                                        onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
                                        className={`w-full pl-10 pr-10 p-3 bg-midnight border rounded-lg text-white cursor-pointer flex items-center transition-colors ${showVehicleDropdown ? 'border-orange' : 'border-gray-800 hover:border-gray-500'}`}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Car className="absolute left-3 top-3 text-textGrey" size={18} />
                                            <span className="truncate">{getVehicleLabel(studentForm.vehicle) || "Select Vehicle..."}</span>
                                        </div>
                                        <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 text-textGrey transition-transform ${showVehicleDropdown ? 'rotate-180' : ''}`} />
                                    </div>

                                    {showVehicleDropdown && (
                                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                            <div className="max-h-56 overflow-y-auto custom-scrollbar">
                                                {activeVehicleOptions.map((v) => (
                                                    <div 
                                                        key={v.id}
                                                        onClick={() => {
                                                            setStudentForm({...studentForm, vehicle: v.id});
                                                            setShowVehicleDropdown(false);
                                                        }}
                                                        className={`p-3 text-sm font-bold cursor-pointer transition-colors border-b border-gray-800 last:border-0 flex items-center justify-between ${
                                                            studentForm.vehicle === v.id
                                                            ? 'bg-orange/10 text-orange' 
                                                            : 'text-white hover:bg-midnight'
                                                        }`}
                                                    >
                                                        <span>{v.label}</span>
                                                        {studentForm.vehicle === v.id && <Check size={16} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* CUSTOM EXAM CENTER DROPDOWN */}
                    <div className="space-y-1" ref={routeRef}>
                        <label className="text-[10px] text-textGrey uppercase font-black px-1">Exam Center</label>
                        <div className="relative">
                            {isLocked ? (
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-textGrey" size={18} />
                                    <div className={`${inputBase} ${inputView} flex items-center h-[46px]`}>
                                        <span className="truncate">
                                            {getExamCenterLabel(studentForm.examRoute) || 'Not Assigned'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div 
                                        onClick={() => setShowRouteDropdown(!showRouteDropdown)}
                                        className={`w-full pl-10 pr-10 p-3 bg-midnight border rounded-lg text-white cursor-pointer flex items-center transition-colors ${showRouteDropdown ? 'border-orange' : 'border-gray-800 hover:border-gray-500'}`}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <MapPin className="absolute left-3 top-3 text-textGrey" size={18} />
                                            <span className="truncate">{getExamCenterLabel(studentForm.examRoute) || "Not Assigned"}</span>
                                        </div>
                                        <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 text-textGrey transition-transform ${showRouteDropdown ? 'rotate-180' : ''}`} />
                                    </div>

                                    {showRouteDropdown && (
                                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                            <div className="max-h-56 overflow-y-auto custom-scrollbar">
                                                <div 
                                                    onClick={() => {
                                                        setStudentForm({...studentForm, examRoute: 'Not Assigned'});
                                                        setShowRouteDropdown(false);
                                                    }}
                                                    className={`p-3 text-sm font-bold cursor-pointer transition-colors border-b border-gray-800 flex items-center justify-between ${
                                                        !studentForm.examRoute || studentForm.examRoute === 'Not Assigned'
                                                        ? 'bg-orange/10 text-orange' 
                                                        : 'text-textGrey hover:bg-midnight hover:text-white'
                                                    }`}
                                                >
                                                    <span>Not Assigned</span>
                                                    {(!studentForm.examRoute || studentForm.examRoute === 'Not Assigned') && <Check size={16} />}
                                                </div>

                                                {EXAM_CENTERS.map((c) => (
                                                    <div 
                                                        key={c.id}
                                                        onClick={() => {
                                                            setStudentForm({...studentForm, examRoute: c.id});
                                                            setShowRouteDropdown(false);
                                                        }}
                                                        className={`p-3 text-sm font-bold cursor-pointer transition-colors border-b border-gray-800 last:border-0 flex items-center justify-between ${
                                                            studentForm.examRoute === c.id 
                                                            ? 'bg-orange/10 text-orange' 
                                                            : 'text-white hover:bg-midnight'
                                                        }`}
                                                    >
                                                        <span>{c.label}</span>
                                                        {studentForm.examRoute === c.id && <Check size={16} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* The rest of your sections (Exam Routes Display, Connection Section) remain unchanged */}
            {isLocked && studentForm.examRoute && studentForm.examRoute !== 'Not Assigned' && relevantRoutes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-800/50 animate-in fade-in slide-in-from-top-1">
                     <label className="text-[10px] text-textGrey uppercase font-black px-1 mb-2 flex items-center gap-1">
                        <RouteIcon size={12} /> Available Routes
                    </label>
                    
                    <div className="bg-midnight/50 rounded-lg p-3 border border-gray-800">
                        <div className="space-y-2">
                            {relevantRoutes.map((route, index) => (
                                <div key={route.id} className="flex items-center gap-3 text-sm text-gray-300">
                                    <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-bold text-textGrey border border-gray-700">
                                        {index + 1}
                                    </div>
                                    <span className="font-medium">{route.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {isEditing && studentForm.id && isLocked && (
                <div className="mt-6 pt-6 border-t border-gray-800/50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <label className="text-[10px] uppercase font-black text-textGrey tracking-wider">Student App Access</label>
                    </div>

                    {isAlreadyLinked ? (
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-statusGreen/10 to-transparent border border-statusGreen/20 p-5">
                             <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-statusGreen/20 flex items-center justify-center text-statusGreen shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                                        <Smartphone size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-base">Device Active</h4>
                                        <p className="text-xs text-textGrey mt-1">App is linked and ready</p>
                                    </div>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-statusGreen animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]"></div>
                             </div>

                             <div className="mt-5 pt-4 border-t border-statusGreen/10 flex justify-end">
                                 <button 
                                    onClick={handleUnlinkClick} 
                                    disabled={unlinkLoading} 
                                    className="text-xs font-bold text-statusGreen hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-statusGreen/20"
                                 >
                                    {unlinkLoading ? <Loader2 className="animate-spin" size={14} /> : <Unlink size={14} />}
                                    Unlink Device
                                 </button>
                             </div>
                        </div>
                    ) : (
                        <div className={`relative overflow-hidden rounded-2xl border transition-all duration-500 ${
                            showPendingUI 
                            ? 'bg-gradient-to-br from-orange/20 via-red-500/10 to-transparent border-orange/30' 
                            : 'bg-gray-900/40 border-gray-800'
                        } p-1`}>
                            
                            {showPendingUI && (
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange/20 blur-3xl rounded-full pointer-events-none"></div>
                            )}

                            <div className="p-5 flex flex-col items-center text-center space-y-4 relative z-10">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                                    showPendingUI 
                                    ? 'bg-orange/20 text-orange shadow-[0_0_20px_rgba(249,115,22,0.2)] scale-110' 
                                    : 'bg-gray-800 text-gray-500'
                                }`}>
                                    {showPendingUI ? <Share2 size={28} /> : <Link2Off size={28} />}
                                </div>

                                <div>
                                    <h4 className={`font-black text-lg ${showPendingUI ? 'text-white' : 'text-gray-400'}`}>
                                        {showPendingUI ? 'Invitation Sent' : 'Connect Student App'}
                                    </h4>
                                    <p className="text-xs text-textGrey mt-2 max-w-[240px] mx-auto leading-relaxed">
                                        {showPendingUI 
                                            ? "Waiting for student to click the link on WhatsApp." 
                                            : "Send a magic link to let the student track lessons and packages."}
                                    </p>
                                </div>

                                <div className="w-full space-y-3">
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleInviteClick}
                                            disabled={inviteStatus === 'sending' || cancelLoading}
                                            className={`flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                                                inviteStatus === 'sent' 
                                                    ? 'bg-orange text-white shadow-orange/20 shadow-lg' 
                                                    : showPendingUI
                                                        ? 'bg-midnight text-orange border border-orange/30 hover:bg-orange/10' 
                                                        : 'w-full bg-gradient-to-r from-orange to-red-500 text-white hover:brightness-110 shadow-lg shadow-orange/20' 
                                            }`}
                                        >
                                            {inviteStatus === 'sending' ? (
                                                <Loader2 className="animate-spin" size={18} />
                                            ) : inviteStatus === 'sent' ? (
                                                <> <Check size={18} /> Sent! </>
                                            ) : (
                                                <> <Send size={18} /> {showPendingUI ? 'Resend' : 'Send Invite'} </>
                                            )}
                                        </button>

                                        {showPendingUI && (
                                            <button
                                                onClick={handleCopyLink}
                                                disabled={!liveStudent.inviteToken}
                                                className={`px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] border ${
                                                    copyStatus === 'copied'
                                                    ? 'bg-orange text-white border-orange' 
                                                    : 'bg-midnight text-orange border-orange/30 hover:bg-orange/10 disabled:opacity-30 disabled:cursor-not-allowed'
                                                }`}
                                            >
                                                {copyStatus === 'copied' ? (
                                                    <> <Check size={16} /> Copied! </>
                                                ) : (
                                                    <Copy size={18} />
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {showPendingUI && (
                                        <button 
                                            onClick={handleRevokeClick} 
                                            disabled={cancelLoading} 
                                            className="w-full py-3 rounded-xl border border-statusRed/30 text-statusRed hover:bg-statusRed/10 transition-all text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
                                        >
                                            {cancelLoading ? <Loader2 className="animate-spin" size={14} /> : <Ban size={14} />}
                                            {cancelLoading ? 'Canceling...' : 'Cancel Invite'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </Modal>
    </>
  );
}
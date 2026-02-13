import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { checkSlotValidity } from '../scheduler';

interface LessonForm {
  id?: string;
  studentId?: string;
  date: string;
  time: string;
  location: string;
  type: string;
  endTime?: string;
  isDouble?: boolean; 
  status?: 'Booked' | 'Blocked' | 'Open'; 
  customDuration?: number; 
  examCenter?: string; 
}

export function useLessonManager(user: any, slots: any[], profile: any) {
  const [saveLoading, setSaveLoading] = useState(false);
  const [validationMsg, setValidationMsg] = useState('');

  // --- SAVE ACTION ---
  const saveLesson = async (
    form: LessonForm, 
    editingSlot: any, 
    onSuccess: (msg: string) => void, 
    onError: (msg: string) => void
  ) => {
    if (!user) return;
    setSaveLoading(true);
    setValidationMsg('');

    try {
      // --- 1. CALCULATE "FROZEN" DURATION ---
      let finalDuration = 0;
      const isBlockMode = form.status === 'Blocked';

      if (isBlockMode) {
        finalDuration = Number(form.customDuration) || 60;
      } else {
        const baseDuration = Number(profile?.lessonDuration) || 45; 
        finalDuration = form.isDouble ? baseDuration * 2 : baseDuration;
      }

      // --- 2. CALCULATE END TIME ---
      const [h, m] = form.time.split(':').map(Number);
      const totalMins = h * 60 + m + finalDuration;
      // [NOTE] This `newEndTime` is critical for your "Happening Now" logic
      const newEndTime = `${Math.floor(totalMins / 60).toString().padStart(2, '0')}:${(totalMins % 60).toString().padStart(2, '0')}`;

      // --- 3. VALIDATION ---
      if (!isBlockMode) {
          if (!form.location) {
             setValidationMsg("Please select a location!");
             setSaveLoading(false);
             return;
          }
          if (!form.type) {
             setValidationMsg("Please select a vehicle category!");
             setSaveLoading(false);
             return;
          }
          if (!form.examCenter) {
             setValidationMsg("Please select an Exam Center!");
             setSaveLoading(false);
             return;
          }
      }

      if (isBlockMode && !form.type) {
         setValidationMsg("Please select or type a reason!");
         setSaveLoading(false);
         return;
      }

      const check = checkSlotValidity(form.date, form.time, finalDuration, slots, editingSlot?.id || null);
      if (!check.valid) {
        setValidationMsg(check.error || "Time slot overlap!");
        setSaveLoading(false);
        return; 
      }

      // --- 4. DETERMINE STATUS & BOOKED BY ---
      let finalStatus = 'Open'; 
      // [NEW] Determine who booked it. If status is Open, nobody booked it.
      // If it is Blocked or Booked via this manager (Teacher Portal), it is 'teacher'.
      let bookedBy = null; 

      if (isBlockMode) {
          finalStatus = 'Blocked';
          bookedBy = 'teacher';
      } else if (form.studentId && form.studentId !== 'Unknown' && form.studentId !== '') {
          finalStatus = 'Booked';
          bookedBy = 'teacher'; // Teacher manually assigned a student
      } else {
          finalStatus = 'Open'; 
          bookedBy = null;
      }

      // --- 5. PREPARE DATA ---
      const lessonData = {
        date: form.date,
        time: form.time,
        endTime: newEndTime, // Saved for exact duration calc
        location: form.location || '', 
        studentId: form.studentId || '', 
        isDouble: !!form.isDouble,
        
        type: form.type, 
        
        status: finalStatus,
        bookedBy: bookedBy, // [NEW] Save source
        
        customDuration: form.customDuration || null,
        duration: finalDuration, 
        examCenter: form.examCenter || '' 
      };

      // --- 6. DATABASE OPERATION ---
      if (editingSlot?.id) {
        await updateDoc(doc(db, "slots", editingSlot.id), lessonData);
        onSuccess("Slot updated successfully"); 
      } else {
        await addDoc(collection(db, "slots"), {
          ...lessonData,
          teacherId: user.uid,
          createdAt: new Date().toISOString()
        });
        onSuccess("Slot created successfully");
      }

    } catch (e) {
      console.error(e);
      onError("Error saving slot"); 
    } finally {
      setSaveLoading(false);
    }
  };

  // --- DELETE ACTION ---
  const deleteLesson = async (id: string, onSuccess: () => void, onError: (msg: string) => void) => {
    setSaveLoading(true);
    try {
      await deleteDoc(doc(db, "slots", id));
      onSuccess(); 
    } catch (e) {
      onError("Error deleting");
    } finally {
      setSaveLoading(false);
    }
  };

  return { 
    saveLesson, 
    deleteLesson, 
    saveLoading, 
    validationMsg, 
    setValidationMsg 
  };
}
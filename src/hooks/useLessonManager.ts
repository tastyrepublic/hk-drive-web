import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
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
  status?: 'Booked' | 'Blocked' | 'Open' | 'Draft'; 
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
      let finalStatus = form.status || 'Open'; // <-- Respect the incoming status!
      let bookedBy = null; 

      if (isBlockMode) {
          finalStatus = 'Blocked';
          bookedBy = 'teacher';
      } else if (form.studentId && form.studentId !== 'Unknown' && form.studentId !== '') {
          // If it came in as Draft, keep it Draft. Otherwise, it's Booked.
          finalStatus = form.status === 'Draft' ? 'Draft' : 'Booked';
          bookedBy = 'teacher'; 
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

  // --- AUTO-SCHEDULE ACTIONS ---
  const autoScheduleWeek = async (
    weekStartDate: Date, 
    config: any, // <-- NEW: Accepts the modal settings!
    onSuccess: (msg: string) => void, 
    onError: (msg: string) => void
  ) => {
    if (!user) return;
    setSaveLoading(true);

    try {
      const batch = writeBatch(db);
      let count = 0;
      const now = new Date();

      // Convert start/end times to minutes for math
      const [sh, sm] = config.startTime.split(':').map(Number);
      const startOfDayMins = sh * 60 + sm;
      const [eh, em] = config.endTime.split(':').map(Number);
      const endOfDayMins = eh * 60 + em;

      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStartDate);
        currentDate.setDate(currentDate.getDate() + i);
        const dayOfWeek = currentDate.getDay(); 
        
        // Skip if not a selected working day
        if (!config.workingDays.includes(dayOfWeek)) continue;

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        let currentMins = startOfDayMins; 
        // --- [NEW] Calculate the actual block size ---
        const effectiveDuration = config.isDouble ? config.lessonDuration * 2 : config.lessonDuration;

        while (currentMins + effectiveDuration <= endOfDayMins) {
            const slotStartMins = currentMins;
            const slotEndMins = currentMins + effectiveDuration;

            // RULE A: SKIP LUNCH (12:30 - 13:30)
            if (config.skipLunch && slotStartMins < 810 && slotEndMins > 750) {
                currentMins = 810; 
                continue;
            }

            // RULE B: RESTRICTED ZONES 
            if (dayOfWeek !== 0) { 
                const hitsMorning = slotStartMins < 570 && slotEndMins > 450;
                const hitsEvening = dayOfWeek !== 6 && (slotStartMins < 1170 && slotEndMins > 990); 
                if (hitsMorning || hitsEvening) {
                    currentMins += 15; 
                    continue;
                }
            }

            // RULE C: NO PAST SCHEDULING 
            const slotHour = Math.floor(slotStartMins / 60);
            const slotMinute = slotStartMins % 60;
            const slotDateTime = new Date(year, currentDate.getMonth(), currentDate.getDate(), slotHour, slotMinute);
            
            if (slotDateTime < now) {
                currentMins += effectiveDuration; 
                continue;
            }

            const timeStr = `${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`;

            // RULE D: PREVENT DUPLICATES & OVERLAPS 
            const overlapCheck = checkSlotValidity(dateStr, timeStr, effectiveDuration, slots, undefined);
            if (!overlapCheck.valid) {
                currentMins += 15; 
                continue;
            }

            const newSlotRef = doc(collection(db, "slots"));
            
            batch.set(newSlotRef, {
                teacherId: user.uid,
                date: dateStr,
                time: timeStr,
                duration: effectiveDuration, // <-- Save the total math duration
                type: config.vehicleType,
                status: 'Draft',
                studentId: '', 
                location: config.location || '',      // <-- NOW USES CONFIG
                examCenter: config.examCenter || '',  // <-- NOW USES CONFIG
                isDouble: config.isDouble,   // <-- Save the toggle status
                createdAt: new Date().toISOString()
            });
            count++;
            currentMins += effectiveDuration; // No 15 min gap!
        }
      }
      await batch.commit();
      onSuccess(`Auto-generated ${count} draft lessons!`);
    } catch (error) {
      onError("Error generating schedule");
    } finally {
      setSaveLoading(false);
    }
  };

  return { 
    saveLesson, 
    deleteLesson,
    autoScheduleWeek,
    saveLoading, 
    validationMsg, 
    setValidationMsg 
  };
}
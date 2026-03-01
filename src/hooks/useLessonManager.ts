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

export function useLessonManager(user: any, slots: any[], profile: any, holidays: Record<string, string> = {}) {
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
             onError("Please select a location!");
             setSaveLoading(false);
             return;
          }
          if (!form.type) {
             onError("Please select a vehicle category!");
             setSaveLoading(false);
             return;
          }
          if (!form.examCenter) {
             onError("Please select an Exam Center!");
             setSaveLoading(false);
             return;
          }
      }

      if (isBlockMode && !form.type) {
         onError("Please select or type a reason!");
         setSaveLoading(false);
         return;
      }

      const check = checkSlotValidity(form.date, form.time, finalDuration, slots, editingSlot?.id || null, holidays);
      if (!check.valid) {
        onError(check.error || "Time slot overlap!");
        setSaveLoading(false);
        return; 
      }

      // --- 4. DETERMINE STATUS & BOOKED BY ---
      let finalStatus = form.status || 'Open'; 
      let bookedBy = null; 

      if (isBlockMode) {
          finalStatus = 'Blocked';
          bookedBy = 'teacher';
      } else if (form.status === 'Draft') {
          // [FIX] Explicitly handle Drafts first so they don't get lost
          finalStatus = 'Draft';
          bookedBy = 'teacher';
          
          // Auto-convert to Booked if they open a Draft and assign a student
          if (form.studentId && form.studentId !== 'Unknown' && form.studentId !== '') {
              finalStatus = 'Booked'; 
          }
      } else if (form.studentId && form.studentId !== 'Unknown' && form.studentId !== '') {
          finalStatus = 'Booked';
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

            // --- UPDATED RULE B: RESTRICTED ZONES ---
            const isHoliday = !!holidays[dateStr]; // Check our new dictionary

            // Only apply restrictions if it's NOT a Sunday (0) AND NOT a Holiday
            if (dayOfWeek !== 0 && !isHoliday) { 
                // Morning Restriction (07:30 - 09:30)
                const hitsMorning = slotStartMins < 570 && slotEndMins > 450;
                if (hitsMorning) {
                    currentMins = 570; // Snap to 09:30 AM
                    continue;
                }
                
                // Evening Restriction (16:30 - 19:30)
                const hitsEvening = dayOfWeek !== 6 && (slotStartMins < 1170 && slotEndMins > 990); 
                if (hitsEvening) {
                    currentMins = 1170; // Snap to 19:30 PM
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

            // --- UPDATED RULE D: SMART SNAPPING FOR OVERLAPS ---
            const daySlots = slots.filter(s => s.date === dateStr);
            let collisionEndMins = 0;

            // 1. Scan the day to see exactly what we are colliding with
            for (const s of daySlots) {
                const [sh, sm] = s.time.split(':').map(Number);
                const sStart = sh * 60 + sm;
                
                // Safely calculate the duration of the obstacle
                let sDuration = s.duration;
                if (!sDuration) {
                    sDuration = s.customDuration || (s.isDouble ? effectiveDuration * 2 : effectiveDuration);
                }
                const sEnd = sStart + sDuration;

                // Strict Overlap Check
                if (slotStartMins < sEnd && slotEndMins > sStart) {
                    // Find the absolute latest end time if multiple slots overlap
                    if (sEnd > collisionEndMins) {
                        collisionEndMins = sEnd; 
                    }
                }
            }

            // 2. If we hit a block, SNAP perfectly to the end of it!
            if (collisionEndMins > 0) {
                currentMins = collisionEndMins; 
                continue;
            }

            // 3. Fallback gatekeeper check for generic restrictions
            const overlapCheck = checkSlotValidity(dateStr, timeStr, effectiveDuration, slots, undefined, holidays);
            if (!overlapCheck.valid) {
                currentMins += 15; 
                continue;
            }

            // --- [NEW] CALCULATE THE END TIME STRING ---
            const endHour = Math.floor(slotEndMins / 60);
            const endMinute = slotEndMins % 60;
            const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

            const newSlotRef = doc(collection(db, "slots"));
            
            batch.set(newSlotRef, {
                teacherId: user.uid,
                date: dateStr,
                time: timeStr,
                endTime: endTimeStr,
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

  // --- SMART COPY WEEK ---
  const copyWeekToNext = async (
    slotsToCopy: any[], 
    onSuccess: (msg: string) => void, 
    onError: (msg: string) => void
  ) => {
    if (!user || slotsToCopy.length === 0) return;
    setSaveLoading(true);

    try {
      const batch = writeBatch(db);
      let copiedCount = 0;
      
      // [NEW] Track exactly WHY slots were skipped
      let skipReasons = { collisions: 0, restrictions: 0, other: 0 };

      slotsToCopy.forEach(slot => {
         // 1. Safely calculate the date + 7 days
         const [y, m, d] = slot.date.split('-').map(Number);
         const dateObj = new Date(y, m - 1, d);
         dateObj.setDate(dateObj.getDate() + 7);
         
         const newDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

         // 2. Safe fallback for older slots that might be missing the duration field
         const effectiveDuration = slot.duration || (slot.isDouble ? Number(profile?.lessonDuration) * 2 : Number(profile?.lessonDuration)) || 45;

         // 3. Ask the Gatekeeper if this time is legal on the NEW date!
         const check = checkSlotValidity(
             newDateStr, 
             slot.time, 
             effectiveDuration, 
             slots, 
             undefined, 
             holidays
         );

         // 4. Only copy it if it's strictly legal
         if (check.valid) {
             const newSlotRef = doc(collection(db, "slots"));
             
             // [FIREBASE FIX] Create a clean copy and explicitly delete the ID
             const cleanSlot = { ...slot };
             delete cleanSlot.id; 

             // Preserve 'Blocked' status, turn all other lessons into 'Draft'
             const newStatus = cleanSlot.status === 'Blocked' ? 'Blocked' : 'Draft';

             batch.set(newSlotRef, {
                 ...cleanSlot,
                 date: newDateStr,         
                 status: newStatus,          
                 duration: effectiveDuration, 
                 createdAt: new Date().toISOString()
             });
             copiedCount++;
         } else {
             // [NEW] Categorize the error message
             const errorMsg = check.error || '';
             if (errorMsg.includes('Collision')) {
                 skipReasons.collisions++;
             } else if (errorMsg.includes('Restricted') || errorMsg.includes('Too Early') || errorMsg.includes('Too Late')) {
                 skipReasons.restrictions++;
             } else {
                 skipReasons.other++;
             }
         }
      });

      if (copiedCount > 0) {
          await batch.commit();
          
          // [NEW] Build a detailed toast message
          let skippedMsg = '';
          const totalSkipped = skipReasons.collisions + skipReasons.restrictions + skipReasons.other;
          
          if (totalSkipped > 0) {
              let details = [];
              if (skipReasons.collisions > 0) details.push(`${skipReasons.collisions} overlaps`);
              if (skipReasons.restrictions > 0) details.push(`${skipReasons.restrictions} restricted/holidays`);
              if (skipReasons.other > 0) details.push(`${skipReasons.other} other errors`);
              
              skippedMsg = `\n(Skipped ${totalSkipped}: ${details.join(', ')})`;
          }
          
          onSuccess(`Copied ${copiedCount} lessons!${skippedMsg}`);
      } else {
          onError("Could not copy. All slots hit restricted zones or overlaps on the new week.");
      }
    } catch (error) {
      console.error("Copy Error:", error); 
      onError("Error copying week");
    } finally {
      setSaveLoading(false);
    }
  };

  return { 
    saveLesson, 
    deleteLesson,
    autoScheduleWeek,
    copyWeekToNext,
    saveLoading, 
    validationMsg, 
    setValidationMsg 
  };
}
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
  duration?: number;
  isDouble?: boolean; 
  status?: 'Booked' | 'Blocked' | 'Open' | 'Draft'; 
  examCenter?: string;
  blockReason?: string; 
}

// Helper to calculate end time string for the database
const calculateEndTimeString = (start: string, duration: number) => {
  if (!start) return '';
  const [h, m] = start.split(':').map(Number);
  let totalMins = h * 60 + m + duration;
  if (totalMins > 1425) totalMins = 1425; // Cap at 23:45
  return `${String(Math.floor(totalMins / 60)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
};

export function useLessonManager(user: any, slots: any[], profile: any, holidays: Record<string, string> = {}) {
  const [saveLoading, setSaveLoading] = useState(false);
  const [validationMsg, setValidationMsg] = useState('');

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
      // [FIXED] Define isBlockMode so it can be used throughout the validation
      const isBlockMode = form.status === 'Blocked';

      // [FIXED] Define h and m at the top so they are available for all validation checks
      const [h, m] = (form.time || "00:00").split(':').map(Number);

      // --- 1. CALCULATE DURATION ---
      // [FIXED] Strictly type as number and restructure logic so TypeScript knows it is never undefined
      let finalDuration: number;

      if (form.duration) {
        finalDuration = form.duration;
      } else if (isBlockMode) {
        finalDuration = editingSlot?.duration || 60;
      } else {
        const baseDuration = Number(profile?.lessonDuration) || 45; 
        finalDuration = form.isDouble ? baseDuration * 2 : baseDuration;
      }

      // --- 2. CALCULATE END TIME ---
      const newEndTime = isBlockMode 
          ? (form.endTime || calculateEndTimeString(form.time, finalDuration))
          : calculateEndTimeString(form.time, finalDuration);

      // --- 3. VALIDATION ---
      const [y, month, d] = form.date.split('-').map(Number);
      const targetDate = new Date(y, month - 1, d, h, m);
      
      const isNewOrMoved = !editingSlot?.id || editingSlot.date !== form.date || editingSlot.time !== form.time;

      if (isNewOrMoved && targetDate < new Date()) {
          onError("Cannot schedule in the past!");
          setSaveLoading(false);
          return;
      }

      if (!isBlockMode) {
          // Lesson Validation
          if (!form.location || !form.type || !form.examCenter) {
             onError("Please complete all required fields!");
             setSaveLoading(false);
             return;
          }

          const check = checkSlotValidity(form.date, form.time, finalDuration, slots, editingSlot?.id || null, holidays);
          if (!check.valid) {
            onError(check.error || "Time slot overlap!");
            setSaveLoading(false);
            return; 
          }
      } else {
          // Blocked Slot Validation (Ignores Restricted Zones)
          if (!form.blockReason) { // <--- STRICT CHECK
             onError("Please select or type a reason!");
             setSaveLoading(false);
             return;
          }

          const startMins = h * 60 + m;
          const endMins = startMins + finalDuration;

          const isOverlapping = slots.some(s => {
              if (s.date !== form.date || (editingSlot?.id && s.id === editingSlot.id)) return false;
              
              const [sh, sm] = (s.time || "00:00").split(':').map(Number);
              const sStart = sh * 60 + sm;
              const sEnd = sStart + (s.duration || (s.isDouble ? 90 : 45));
              return startMins < sEnd && endMins > sStart;
          });

          if (isOverlapping) {
              onError("Cannot place a block over an existing lesson!");
              setSaveLoading(false);
              return;
          }
      }

      // --- 4. DETERMINE STATUS ---
      let finalStatus = form.status || 'Open'; 
      let bookedBy = isBlockMode || form.status === 'Draft' || form.studentId ? 'teacher' : null;

      if (isBlockMode) {
          finalStatus = 'Blocked';
      } else if (finalStatus !== 'Draft') {
          // --- NEW: Strictly enforce Booked vs Open based on the student! ---
          // If a student is removed, this forces it back to 'Open'.
          if (form.studentId && form.studentId !== 'Unknown' && form.studentId !== '') {
              finalStatus = 'Booked';
          } else {
              finalStatus = 'Open'; 
          }
      }

      // --- 5. PREPARE DATA ---
      const lessonData = {
        date: form.date,
        time: form.time,
        endTime: newEndTime,
        // --- THE FIX: Erase location if converting to a Block ---
        location: isBlockMode ? '' : (form.location || ''), 
        studentId: form.studentId || '', 
        isDouble: !!form.isDouble,
        type: isBlockMode ? '' : form.type,
        blockReason: isBlockMode ? form.blockReason || '' : '',
        status: finalStatus,
        bookedBy: bookedBy,
        duration: finalDuration, 
        // --- THE FIX: Erase examCenter if converting to a Block ---
        examCenter: isBlockMode ? '' : (form.examCenter || '') 
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
        const effectiveDuration = config.isDouble ? config.lessonDuration * 2 : config.lessonDuration;

        while (currentMins + effectiveDuration <= endOfDayMins) {
            const slotStartMins = currentMins;
            const slotEndMins = currentMins + effectiveDuration;

            // --- RULE A: SCHEDULED LUNCH BREAK (Creates a Blocked Slot) ---
            if (config.hasLunch) {
                const [lh, lm] = config.lunchStart.split(':').map(Number);
                const [leh, lem] = config.lunchEnd.split(':').map(Number);
                const lunchStartMins = lh * 60 + lm;
                const lunchEndMins = leh * 60 + lem;

                // If the current generation time hits your lunch window
                if (slotStartMins < lunchEndMins && slotEndMins > lunchStartMins) {
                    
                    // [FIXED] 1. Past Check: Ensure the lunch block itself isn't in the past
                    const lunchDateTime = new Date(year, currentDate.getMonth(), currentDate.getDate(), lh, lm);
                    
                    // [FIXED] 2. Overlap Check: Ensure no existing slots overlap with this lunch window
                    const daySlots = slots.filter(s => s.date === dateStr);
                    const isOverlap = daySlots.some(s => {
                        const [sh, sm] = (s.time || "00:00").split(':').map(Number);
                        const sStart = sh * 60 + sm;
                        const sDuration = s.duration || s.customDuration || (s.isDouble ? effectiveDuration * 2 : effectiveDuration);
                        const sEnd = sStart + sDuration;
                        return (lunchStartMins < sEnd && lunchEndMins > sStart);
                    });

                    // Only generate the lunch block if it's in the future AND there are no overlaps
                    if (lunchDateTime >= now && !isOverlap) {
                        const newSlotRef = doc(collection(db, "slots"));
                        batch.set(newSlotRef, {
                            teacherId: user.uid,
                            date: dateStr,
                            time: config.lunchStart,
                            endTime: config.lunchEnd,
                            duration: lunchEndMins - lunchStartMins,
                            status: 'Blocked',
                            type: '', 
                            blockReason: 'block_reason.lunch',
                            createdAt: new Date().toISOString()
                        });
                    }
                    
                    // ALWAYS push the clock forward past lunch, whether we generated the block or skipped it!
                    currentMins = lunchEndMins; 
                    continue;
                }
            }

            // --- RULE B: RESTRICTED ZONES ---
            const isHoliday = !!holidays[dateStr];
            if (dayOfWeek !== 0 && !isHoliday) { 
                // Morning (07:30 - 09:30)
                if (slotStartMins < 570 && slotEndMins > 450) {
                    currentMins = 570; 
                    continue;
                }
                // Evening (16:30 - 19:30)
                if (dayOfWeek !== 6 && (slotStartMins < 1170 && slotEndMins > 990)) { 
                    currentMins = 1170; 
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

  // --- Bulk Delete ---
  const bulkDeleteLessons = async (
    slotIds: string[], 
    onSuccess: (msg: string) => void, 
    onError: (msg: string) => void
  ) => {
    if (!user || slotIds.length === 0) return;
    
    setSaveLoading(true); // This will trigger your ConfirmModal spinner!
    try {
      const batch = writeBatch(db);
      
      slotIds.forEach(id => {
        const slotRef = doc(db, "slots", id);
        batch.delete(slotRef);
      });
      
      await batch.commit();
      onSuccess(`Successfully deleted ${slotIds.length} slots`);
    } catch (error) {
      console.error("Error in bulk delete:", error);
      onError("Failed to clear slots. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  // --- BULK UPDATE ACTION ---
  const bulkUpdateLessons = async (
    slotIds: string[], 
    updates: Partial<LessonForm>, 
    onSuccess: (msg: string) => void, 
    onError: (msg: string) => void
  ) => {
    if (!user || slotIds.length === 0) return;
    
    setSaveLoading(true); 
    try {
      const batch = writeBatch(db);
      let updatedCount = 0;
      
      slotIds.forEach(id => {
        const slotRef = doc(db, "slots", id);
        const existingSlot = slots.find((s: any) => s.id === id);
        let safeUpdates = { ...updates };

        if (!existingSlot) return;

        // --- 1. SMART BLOCKED SLOT LOGIC ---
        if (existingSlot.status === 'Blocked') {
            // If it's a block, ONLY allow the 'type' (reason) to be updated. Strip everything else!
            safeUpdates = {};
            if (updates.type) safeUpdates.type = updates.type;
            
            // If there's no valid update for the block, skip it
            if (Object.keys(safeUpdates).length === 0) return;
        } 
        // --- 2. SMART LESSON LOGIC ---
        else {
            if (safeUpdates.status === 'Open' || safeUpdates.status === 'Draft') {
                const hasStudent = existingSlot.studentId && existingSlot.studentId !== 'Unknown' && existingSlot.studentId !== '';
                if (hasStudent) {
                    delete safeUpdates.status; // Protect the booking
                }
            }
        }

        // --- 3. APPLY UPDATES ---
        if (Object.keys(safeUpdates).length > 0) {
            batch.update(slotRef, safeUpdates);
            updatedCount++;
        }
      });
      
      await batch.commit();
      onSuccess(`Successfully updated ${updatedCount} slots`);
      
    } catch (error) {
      console.error("Error in bulk update:", error);
      onError("Failed to update slots.");
    } finally {
      setSaveLoading(false);
    }
  };

  // --- SMART COPY WEEK ---
  const copyWeekToNext = async (
    slotsToCopy: any[], 
    onSuccess: (msg: string) => void, 
    onError: (msg: string) => void,
    onInfo?: (msg: string) => void // <-- [NEW] Add the gentle callback
  ) => {
    if (!user) return;
    
    // [NEW] Centralized empty check using the gentle toast
    if (slotsToCopy.length === 0) {
        if (onInfo) onInfo("No lessons found in this week to copy.");
        return;
    }

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
         let isValid = true;
         let errorMsg = '';

         if (slot.status === 'Blocked') {
             // --- BLOCKED SLOTS: Ignore Restricted Zones, check only for overlaps ---
             const [h, m] = slot.time.split(':').map(Number);
             const startMins = h * 60 + m;
             const endMins = startMins + effectiveDuration;
             
             const isOverlapping = slots.some(s => {
                 if (s.date !== newDateStr) return false;
                 const [sh, sm] = (s.time || "00:00").split(':').map(Number);
                 const sStart = sh * 60 + sm;
                 const sEnd = sStart + (s.duration || (s.isDouble ? 90 : 45));
                 return startMins < sEnd && endMins > sStart;
             });

             if (isOverlapping) {
                 isValid = false;
                 errorMsg = 'Collision';
             }
         } else {
             // --- STANDARD LESSONS: Use the strict Gatekeeper ---
             const check = checkSlotValidity(
                 newDateStr, 
                 slot.time, 
                 effectiveDuration, 
                 slots, 
                 undefined, 
                 holidays
             );
             isValid = check.valid;
             errorMsg = check.error || '';
         }

         // 4. Only copy it if it's strictly legal
         if (isValid) {
             const newSlotRef = doc(collection(db, "slots"));
             
             // Create a clean copy and explicitly delete the ID
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
             // Categorize the error message
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

  // --- Copy Day ---
  const copyDay = async (
    sourceDate: Date, 
    targetDate: Date, 
    onSuccess: (msg: string) => void, 
    onError: (msg: string) => void,
    onInfo?: (msg: string) => void
  ) => {
    if (!user) return;

    const sourceDateStr = `${sourceDate.getFullYear()}-${String(sourceDate.getMonth() + 1).padStart(2, '0')}-${String(sourceDate.getDate()).padStart(2, '0')}`;
    const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

    const slotsToCopy = slots.filter(s => s.date === sourceDateStr);

    if (slotsToCopy.length === 0) {
        if (onInfo) onInfo("No lessons to copy on this day.");
        return;
    }

    // Past Day Check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDayStart = new Date(targetDate);
    targetDayStart.setHours(0, 0, 0, 0);

    if (targetDayStart < today) {
        onError("Cannot copy lessons to a past date.");
        return;
    }

    setSaveLoading(true);

    try {
        const batch = writeBatch(db);
        let copiedCount = 0;
        let skipReasons = { collisions: 0, restrictions: 0, past: 0, other: 0 };

        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const isToday = targetDayStart.getTime() === today.getTime();

        slotsToCopy.forEach(slot => {
            const effectiveDuration = slot.duration || (slot.isDouble ? Number(profile?.lessonDuration) * 2 : Number(profile?.lessonDuration)) || 45;
            let isValid = true;
            let errorMsg = '';

            const [h, m] = (slot.time || "00:00").split(':').map(Number);
            const startMins = h * 60 + m;

            // 1. Check for past times if copying to TODAY
            if (isToday && startMins < currentMins) {
                isValid = false;
                errorMsg = 'Past';
            } 
            // 2. Blocked Slots (Only check for physical collisions)
            else if (slot.status === 'Blocked') {
                const endMins = startMins + effectiveDuration;
                const isOverlapping = slots.some(s => {
                    if (s.date !== targetDateStr) return false;
                    const [sh, sm] = (s.time || "00:00").split(':').map(Number);
                    const sStart = sh * 60 + sm;
                    const sEnd = sStart + (s.duration || (s.isDouble ? 90 : 45));
                    return startMins < sEnd && endMins > sStart;
                });
                if (isOverlapping) {
                    isValid = false;
                    errorMsg = 'Collision';
                }
            } 
            // 3. Normal Lessons (Reuse your robust Gatekeeper!)
            else {
                const check = checkSlotValidity(
                    targetDateStr, 
                    slot.time, 
                    effectiveDuration, 
                    slots, 
                    undefined, 
                    holidays
                );
                isValid = check.valid;
                errorMsg = check.error || '';
            }

            if (isValid) {
                const newSlotRef = doc(collection(db, "slots"));
                const cleanSlot = { ...slot };
                delete cleanSlot.id;

                const newStatus = cleanSlot.status === 'Blocked' ? 'Blocked' : 'Draft';

                batch.set(newSlotRef, {
                    ...cleanSlot,
                    studentId: '', 
                    date: targetDateStr,
                    status: newStatus,
                    duration: effectiveDuration,
                    createdAt: now.toISOString()
                });
                copiedCount++;
            } else {
                if (errorMsg.includes('Collision')) skipReasons.collisions++;
                else if (errorMsg.includes('Past')) skipReasons.past++;
                else if (errorMsg.includes('Restricted') || errorMsg.includes('Too Early') || errorMsg.includes('Too Late')) skipReasons.restrictions++;
                else skipReasons.other++;
            }
        });

        if (copiedCount > 0) {
            await batch.commit();
            
            let skippedMsg = '';
            const totalSkipped = skipReasons.collisions + skipReasons.restrictions + skipReasons.past + skipReasons.other;
            
            if (totalSkipped > 0) {
                let details = [];
                if (skipReasons.collisions > 0) details.push(`${skipReasons.collisions} overlaps`);
                if (skipReasons.restrictions > 0) details.push(`${skipReasons.restrictions} restricted/holidays`);
                if (skipReasons.past > 0) details.push(`${skipReasons.past} past times`);
                if (skipReasons.other > 0) details.push(`${skipReasons.other} other errors`);
                
                skippedMsg = ` (Skipped ${totalSkipped}: ${details.join(', ')})`;
            }
            
            if (totalSkipped > 0 && onInfo) {
                onInfo(`Copied ${copiedCount} lessons!${skippedMsg}`);
            } else {
                onSuccess(`Copied ${copiedCount} lessons!`);
            }
        } else {
            onError("Could not copy. All slots hit restricted zones, past times, or overlaps.");
        }
    } catch (error) {
        console.error("Copy Day Error:", error);
        onError("Error copying day");
    } finally {
        setSaveLoading(false);
    }
  };

  return { 
    saveLesson, 
    deleteLesson,
    autoScheduleWeek,
    copyWeekToNext,
    bulkDeleteLessons,
    bulkUpdateLessons,
    saveLoading, 
    validationMsg, 
    setValidationMsg,
    copyDay 
  };
}
import { parse, isSaturday, isSunday } from 'date-fns';

// 1. CONFIGURATION
const RESTRICTED_ZONES = {
  MORNING: { start: 450, end: 570 },  // 07:30 - 09:30
  EVENING: { start: 990, end: 1170 }, // 16:30 - 19:30
};

// --- HELPERS ---
export const toMins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const fromMins = (totalMinutes: number) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// --- SMART START TIME LOGIC ---
export function getSmartStartTime(clickedHour: number, daySlots: any[], duration: number) {
    const hourStartMins = clickedHour * 60;
    const hourEndMins = hourStartMins + 60;
    
    // 1. Gather all potential start times in this hour block
    // We always want to check the absolute top of the hour first
    const candidates = [hourStartMins];
    
    for (const slot of daySlots) {
        const [sh, sm] = slot.time.split(':').map(Number);
        const startMins = sh * 60 + sm;
        const endMins = startMins + (slot.duration || duration);
        
        // If an existing slot ends exactly inside this hour block, 
        // add its exact end time to our list of candidates to check!
        if (endMins >= hourStartMins && endMins < hourEndMins) {
            candidates.push(endMins);
        }
    }
    
    // Sort them from earliest to latest so it checks the top of the hour first
    candidates.sort((a, b) => a - b);
    
    // 2. Find the first candidate that doesn't overlap with anything
    for (const proposedStart of candidates) {
        const proposedEnd = proposedStart + duration;
        let hasOverlap = false;
        
        for (const slot of daySlots) {
            const [sh, sm] = slot.time.split(':').map(Number);
            const slotStart = sh * 60 + sm;
            const slotEnd = slotStart + (slot.duration || duration);
            
            // Strict Overlap Check
            if (proposedStart < slotEnd && proposedEnd > slotStart) {
                hasOverlap = true;
                break;
            }
        }
        
        // If this exact minute is completely free, use it!
        if (!hasOverlap) {
            const h = Math.floor(proposedStart / 60);
            const m = proposedStart % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
    }
    
    // Fallback: If the entire hour is completely jammed, default to the top of the hour
    return `${String(clickedHour).padStart(2, '0')}:00`;
}

// --- EXISTING VALIDATOR ---
export const checkSlotValidity = (
  dateStr: string,
  timeStr: string,
  duration: number,
  existingSlots: any[],
  currentSlotId?: string,
  holidays: Record<string, string> = {} // [NEW] Accept holidays dictionary
): { valid: boolean; error?: string } => {
  if (!dateStr || !timeStr) return { valid: false, error: "Invalid Date/Time" };

  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  const startMins = toMins(timeStr);
  const endMins = startMins + duration;

  if (startMins < 360) return { valid: false, error: "Too Early (Before 06:00)" };
  if (endMins > 1410) return { valid: false, error: "Too Late (After 23:30)" };

  const isHoliday = !!holidays[dateStr]; // [NEW] Check if it's a holiday
  const isSat = isSaturday(date);
  
  // [NEW] It's only restricted if it's NOT Sunday AND NOT a holiday!
  const isRestrictedDay = !isSunday(date) && !isHoliday; 

  if (isRestrictedDay) {
    const hitsMorning = startMins < RESTRICTED_ZONES.MORNING.end && endMins > RESTRICTED_ZONES.MORNING.start;
    const hitsEvening = !isSat && (startMins < RESTRICTED_ZONES.EVENING.end && endMins > RESTRICTED_ZONES.EVENING.start);

    if (hitsMorning) return { valid: false, error: "⚠️ Restricted: Morning Zone (07:30-09:30)" };
    if (hitsEvening) return { valid: false, error: "⚠️ Restricted: Evening Zone (16:30-19:30)" };
  }

  const daySlots = existingSlots.filter(s => s.date === dateStr && s.id !== currentSlotId);
  const hasCollision = daySlots.some(s => {
    const sStart = toMins(s.time);
    const sEnd = toMins(s.endTime);
    return startMins < sEnd && endMins > sStart;
  });

  if (hasCollision) return { valid: false, error: "Time Collision detected" };
  return { valid: true };
};
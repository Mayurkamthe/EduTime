/**
 * Slot Engine - generates time slots for a day based on settings
 */

/**
 * Convert "HH:MM" to total minutes from midnight
 */
const toMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Convert minutes to "HH:MM"
 */
const toTimeStr = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};

/**
 * Generate slots for a day
 * @param {object} settings - Settings document
 * @returns {Array} array of slot objects { index, startTime, endTime, isBreak }
 */
const generateDaySlots = (settings) => {
  const {
    startTime, endTime, breakStart, breakEnd,
    lectureDuration
  } = settings;

  const dayStart = toMinutes(startTime);
  const dayEnd = toMinutes(endTime);
  const brkStart = toMinutes(breakStart);
  const brkEnd = toMinutes(breakEnd);

  const slots = [];
  let current = dayStart;
  let index = 0;

  while (current < dayEnd) {
    // Insert break slot
    if (current === brkStart) {
      slots.push({
        index: index++,
        startTime: toTimeStr(current),
        endTime: toTimeStr(brkEnd),
        isBreak: true,
        label: 'Break'
      });
      current = brkEnd;
      continue;
    }

    // Skip if we'd enter break mid-lecture
    if (current < brkStart && current + lectureDuration > brkStart) {
      // Gap before break - skip to break
      current = brkStart;
      continue;
    }

    if (current + lectureDuration <= dayEnd) {
      slots.push({
        index: index++,
        startTime: toTimeStr(current),
        endTime: toTimeStr(current + lectureDuration),
        isBreak: false,
        label: `${toTimeStr(current)} - ${toTimeStr(current + lectureDuration)}`
      });
      current += lectureDuration;
    } else {
      break;
    }
  }

  return slots;
};

/**
 * Get non-break slot indices
 */
const getTeachingSlots = (slots) => slots.filter(s => !s.isBreak);

/**
 * Get consecutive teaching slot groups of given size
 * Used for lab scheduling
 */
const getConsecutiveGroups = (slots, size) => {
  const teaching = getTeachingSlots(slots);
  const groups = [];

  for (let i = 0; i <= teaching.length - size; i++) {
    // Check they are actually consecutive (no break in between)
    let consecutive = true;
    for (let j = 0; j < size - 1; j++) {
      const curr = teaching[i + j];
      const next = teaching[i + j + 1];
      // Find original indices
      const currIdx = slots.findIndex(s => s.index === curr.index);
      const nextIdx = slots.findIndex(s => s.index === next.index);
      // If there's a break slot between them, not consecutive
      for (let k = currIdx + 1; k < nextIdx; k++) {
        if (slots[k].isBreak) { consecutive = false; break; }
      }
      if (!consecutive) break;
    }
    if (consecutive) {
      groups.push(teaching.slice(i, i + size));
    }
  }
  return groups;
};

module.exports = { generateDaySlots, getTeachingSlots, getConsecutiveGroups, toMinutes, toTimeStr };

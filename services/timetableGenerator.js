/**
 * Smart Timetable Generator
 * Algorithm: Greedy + Backtracking with constraint checking
 *
 * Phase 1: Schedule LABS (highest priority, need continuous slots)
 * Phase 2: Schedule THEORY subjects
 * Phase 3: Fill remaining free slots
 */

const { generateDaySlots, getTeachingSlots, getConsecutiveGroups } = require('./slotEngine');
const { v4: uuidv4 } = require('crypto');

class TimetableGenerator {
  constructor(settings, classDoc, subjects, professors, rooms, existingTimetables = []) {
    this.settings = settings;
    this.classDoc = classDoc;
    this.subjects = subjects; // subjects for this class
    this.professors = professors; // all active professors
    this.rooms = rooms; // all active rooms
    this.existingTimetables = existingTimetables; // other class timetables (for room/prof clash)

    this.days = settings.workingDays;
    this.daySlots = generateDaySlots(settings);
    this.teachingSlots = getTeachingSlots(this.daySlots);

    // Track allocations
    // Key: `${day}-${slotIndex}` → { professorId, roomId }
    this.profOccupancy = {}; // profId → Set of `day-slotIndex`
    this.roomOccupancy = {}; // roomId → Set of `day-slotIndex`
    this.classOccupancy = {}; // `day-slotIndex` → true
    this.batchOccupancy = {}; // `batchName-day-slotIndex` → true

    // Pre-fill from existing timetables (other classes)
    this._preloadExisting();

    // Result slots array
    this.result = [];
  }

  _preloadExisting() {
    for (const tt of this.existingTimetables) {
      for (const slot of tt.slots) {
        if (slot.type === 'free' || slot.type === 'break') continue;
        const key = `${slot.day}-${slot.slotIndex}`;
        if (slot.professor) {
          const pid = slot.professor.toString();
          if (!this.profOccupancy[pid]) this.profOccupancy[pid] = new Set();
          this.profOccupancy[pid].add(key);
        }
        if (slot.room) {
          const rid = slot.room.toString();
          if (!this.roomOccupancy[rid]) this.roomOccupancy[rid] = new Set();
          this.roomOccupancy[rid].add(key);
        }
      }
    }
  }

  _isProfAvailable(profId, day, slotIndex) {
    const key = `${day}-${slotIndex}`;
    const set = this.profOccupancy[profId];
    return !set || !set.has(key);
  }

  _isRoomAvailable(roomId, day, slotIndex) {
    const key = `${day}-${slotIndex}`;
    const set = this.roomOccupancy[roomId];
    return !set || !set.has(key);
  }

  _isClassSlotFree(day, slotIndex) {
    return !this.classOccupancy[`${day}-${slotIndex}`];
  }

  _isBatchSlotFree(batchName, day, slotIndex) {
    return !this.batchOccupancy[`${batchName}-${day}-${slotIndex}`];
  }

  _getProfDailyCount(profId, day) {
    const set = this.profOccupancy[profId];
    if (!set) return 0;
    return [...set].filter(k => k.startsWith(`${day}-`)).length;
  }

  _markProfSlot(profId, day, slotIndex) {
    if (!this.profOccupancy[profId]) this.profOccupancy[profId] = new Set();
    this.profOccupancy[profId].add(`${day}-${slotIndex}`);
  }

  _markRoomSlot(roomId, day, slotIndex) {
    if (!this.roomOccupancy[roomId]) this.roomOccupancy[roomId] = new Set();
    this.roomOccupancy[roomId].add(`${day}-${slotIndex}`);
  }

  _markClassSlot(day, slotIndex) {
    this.classOccupancy[`${day}-${slotIndex}`] = true;
  }

  _markBatchSlot(batchName, day, slotIndex) {
    this.batchOccupancy[`${batchName}-${day}-${slotIndex}`] = true;
  }

  /**
   * Find professors that can teach a subject
   */
  _getProfessorsForSubject(subjectId) {
    return this.professors.filter(p =>
      p.subjects.some(s => s.toString() === subjectId.toString()) && p.isActive
    );
  }

  /**
   * Find suitable room for slot type and batch size
   */
  _getRoomsForType(type, studentCount) {
    return this.rooms.filter(r =>
      r.type === (type === 'lab' ? 'lab' : 'classroom') &&
      r.capacity >= studentCount &&
      r.isActive
    );
  }

  /**
   * Schedule lab subject for all batches
   * Each batch gets lab in a different time slot (parallel or sequential)
   */
  _scheduleLab(subject, labSlotsNeeded) {
    const batches = this.classDoc.batches;
    const labRooms = this._getRoomsForType('lab', Math.max(...batches.map(b => b.studentCount)));
    if (!labRooms.length) return false;

    const profs = this._getProfessorsForSubject(subject._id);
    if (!profs.length) return false;

    let scheduledSessions = 0;
    const sessionsNeeded = subject.weeklyHours / (subject.continuousSlots || 2);

    // Try to schedule one session per batch per week
    for (const batch of batches) {
      let placed = false;
      // Try each day
      for (const day of this.days) {
        if (placed) break;
        if (this.classDoc.batches.length > labRooms.length) break;

        // Get consecutive slot groups
        const neededSlots = subject.continuousSlots || 2;
        const groups = getConsecutiveGroups(this.daySlots, neededSlots);

        for (const group of groups) {
          if (placed) break;
          const firstSlot = group[0];
          const lastSlot = group[group.length - 1];

          // Check batch slot is free
          let batchFree = group.every(s => this._isBatchSlotFree(batch.name, day, s.index));
          if (!batchFree) continue;

          // Find available prof
          const prof = profs.find(p => {
            if (!p.availability.days.includes(day)) return false;
            if (this._getProfDailyCount(p._id.toString(), day) >= p.maxLecturesPerDay) return false;
            return group.every(s => this._isProfAvailable(p._id.toString(), day, s.index));
          });
          if (!prof) continue;

          // Find available room
          const room = labRooms.find(r =>
            r.capacity >= batch.studentCount &&
            group.every(s => this._isRoomAvailable(r._id.toString(), day, s.index))
          );
          if (!room) continue;

          // Schedule all slots in the group
          const labGroupId = `lab-${Date.now()}-${batch.name}`;
          group.forEach((s, idx) => {
            this.result.push({
              day,
              slotIndex: s.index,
              startTime: s.startTime,
              endTime: s.endTime,
              subject: subject._id,
              professor: prof._id,
              room: room._id,
              class: this.classDoc._id,
              batch: batch.name,
              type: 'lab',
              isLocked: false,
              isLabContinuation: idx > 0,
              labGroupId
            });
            this._markProfSlot(prof._id.toString(), day, s.index);
            this._markRoomSlot(room._id.toString(), day, s.index);
            this._markBatchSlot(batch.name, day, s.index);
          });
          placed = true;
          scheduledSessions++;
        }
      }
    }

    return scheduledSessions > 0;
  }

  /**
   * Schedule theory subject
   */
  _scheduleTheory(subject, remainingHours) {
    const profs = this._getProfessorsForSubject(subject._id);
    if (!profs.length) return 0;

    const rooms = this._getRoomsForType('theory', this.classDoc.totalStudents);
    if (!rooms.length) return 0;

    let placed = 0;

    // Distribute across days - avoid bunching same subject
    const daysOrder = [...this.days].sort(() => Math.random() - 0.5);

    for (const day of daysOrder) {
      if (placed >= remainingHours) break;

      for (const slot of this.teachingSlots) {
        if (placed >= remainingHours) break;
        if (!this._isClassSlotFree(day, slot.index)) continue;

        // Find available prof
        const prof = profs.find(p => {
          if (!p.availability.days.includes(day)) return false;
          if (this._getProfDailyCount(p._id.toString(), day) >= p.maxLecturesPerDay) return false;
          return this._isProfAvailable(p._id.toString(), day, slot.index);
        });
        if (!prof) continue;

        // Find available room
        const room = rooms.find(r => this._isRoomAvailable(r._id.toString(), day, slot.index));
        if (!room) continue;

        this.result.push({
          day,
          slotIndex: slot.index,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subject: subject._id,
          professor: prof._id,
          room: room._id,
          class: this.classDoc._id,
          batch: null,
          type: subject.type,
          isLocked: false,
          isLabContinuation: false,
          labGroupId: null
        });

        this._markProfSlot(prof._id.toString(), day, slot.index);
        this._markRoomSlot(room._id.toString(), day, slot.index);
        this._markClassSlot(day, slot.index);
        placed++;
      }
    }
    return placed;
  }

  /**
   * Main generate function
   */
  generate() {
    // Separate lab and theory subjects
    const labSubjects = this.subjects.filter(s => s.type === 'lab');
    const theorySubjects = this.subjects.filter(s => s.type !== 'lab');

    // PHASE 1: Schedule labs first
    for (const subject of labSubjects) {
      this._scheduleLab(subject, subject.weeklyHours);
    }

    // PHASE 2: Schedule theory/tutorial
    for (const subject of theorySubjects) {
      const placed = this._scheduleTheory(subject, subject.weeklyHours);
      if (placed < subject.weeklyHours) {
        console.warn(`Warning: Could only schedule ${placed}/${subject.weeklyHours} hours for ${subject.name}`);
      }
    }

    // PHASE 3: Add break slots
    for (const day of this.days) {
      for (const slot of this.daySlots) {
        if (slot.isBreak) {
          this.result.push({
            day,
            slotIndex: slot.index,
            startTime: slot.startTime,
            endTime: slot.endTime,
            subject: null,
            professor: null,
            room: null,
            class: this.classDoc._id,
            batch: null,
            type: 'break',
            isLocked: false,
            isLabContinuation: false,
            labGroupId: null
          });
        }
      }
    }

    return this.result;
  }

  /**
   * Validate result for conflicts
   */
  validateResult() {
    const conflicts = [];
    const profMap = {};
    const roomMap = {};
    const classMap = {};

    for (const slot of this.result) {
      if (slot.type === 'break' || slot.type === 'free') continue;
      const key = `${slot.day}-${slot.slotIndex}`;

      if (slot.professor) {
        const pk = `${slot.professor}-${key}`;
        if (profMap[pk]) conflicts.push(`Professor clash at ${slot.day} slot ${slot.slotIndex}`);
        profMap[pk] = true;
      }

      if (slot.room) {
        const rk = `${slot.room}-${key}`;
        if (roomMap[rk]) conflicts.push(`Room clash at ${slot.day} slot ${slot.slotIndex}`);
        roomMap[rk] = true;
      }

      if (!slot.batch) {
        const ck = `${slot.class}-${key}`;
        if (classMap[ck]) conflicts.push(`Class clash at ${slot.day} slot ${slot.slotIndex}`);
        classMap[ck] = true;
      }
    }

    return conflicts;
  }
}

module.exports = TimetableGenerator;

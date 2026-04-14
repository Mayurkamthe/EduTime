/**
 * Smart Timetable Generator
 * Fixed version - no external uuid dependency, robust error handling
 */

const { generateDaySlots, getTeachingSlots, getConsecutiveGroups } = require('./slotEngine');

let _idCounter = 0;
const makeId = () => `slot-${Date.now()}-${++_idCounter}`;

class TimetableGenerator {
  constructor(settings, classDoc, subjects, professors, rooms, existingTimetables = []) {
    this.settings   = settings;
    this.classDoc   = classDoc;
    this.subjects   = subjects;
    this.professors = professors;
    this.rooms      = rooms;
    this.existingTimetables = existingTimetables;

    // Validate settings have required fields
    const s = settings;
    if (!s.workingDays || !s.workingDays.length) throw new Error('No working days configured in Settings.');
    if (!s.startTime || !s.endTime)              throw new Error('Start/end time not configured in Settings.');
    if (!s.breakStart || !s.breakEnd)            throw new Error('Break time not configured in Settings.');

    this.days        = s.workingDays;
    this.daySlots    = generateDaySlots(s);
    this.teachingSlots = getTeachingSlots(this.daySlots);

    if (!this.teachingSlots.length) throw new Error('No teaching slots generated. Check time settings.');

    // Occupancy maps
    this.profOccupancy  = {}; // profId  → Set<"day-slotIndex">
    this.roomOccupancy  = {}; // roomId  → Set<"day-slotIndex">
    this.classOccupancy = {}; // "day-slotIndex" → true  (whole-class slots)
    this.batchOccupancy = {}; // "batchName-day-slotIndex" → true

    this._preloadExisting();
    this.result = [];
    this.warnings = [];
  }

  /* ─── Pre-load other classes' timetables ─── */
  _preloadExisting() {
    for (const tt of this.existingTimetables) {
      for (const slot of tt.slots || []) {
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

  /* ─── Availability checks ─── */
  _profFree(profId, day, idx)  { const s = this.profOccupancy[profId];  return !s || !s.has(`${day}-${idx}`); }
  _roomFree(roomId, day, idx)  { const s = this.roomOccupancy[roomId];  return !s || !s.has(`${day}-${idx}`); }
  _classFree(day, idx)          { return !this.classOccupancy[`${day}-${idx}`]; }
  _batchFree(batch, day, idx)   { return !this.batchOccupancy[`${batch}-${day}-${idx}`]; }

  _profDailyCount(profId, day) {
    const s = this.profOccupancy[profId];
    if (!s) return 0;
    return [...s].filter(k => k.startsWith(`${day}-`)).length;
  }

  /* ─── Mark slots occupied ─── */
  _markProf(profId, day, idx)  { if (!this.profOccupancy[profId])  this.profOccupancy[profId]  = new Set(); this.profOccupancy[profId].add(`${day}-${idx}`); }
  _markRoom(roomId, day, idx)  { if (!this.roomOccupancy[roomId])  this.roomOccupancy[roomId]  = new Set(); this.roomOccupancy[roomId].add(`${day}-${idx}`); }
  _markClass(day, idx)          { this.classOccupancy[`${day}-${idx}`] = true; }
  _markBatch(batch, day, idx)   { this.batchOccupancy[`${batch}-${day}-${idx}`] = true; }

  /* ─── Find professors/rooms ─── */
  _profsFor(subjectId) {
    const sid = subjectId.toString();
    return this.professors.filter(p =>
      p.isActive !== false &&
      p.subjects.some(s => s._id ? s._id.toString() === sid : s.toString() === sid)
    );
  }

  _classroomsFor(studentCount) {
    return this.rooms.filter(r => r.isActive !== false && r.type === 'classroom' && r.capacity >= studentCount);
  }

  _labRoomsFor(studentCount) {
    return this.rooms.filter(r => r.isActive !== false && r.type === 'lab' && r.capacity >= (studentCount || 1));
  }

  /* ─── Schedule a LAB subject ─── */
  _scheduleLab(subject) {
    const batches = this.classDoc.batches || [];
    if (!batches.length) {
      this.warnings.push(`Lab "${subject.name}": class has no batches.`);
      return;
    }

    const profs = this._profsFor(subject._id);
    if (!profs.length) {
      this.warnings.push(`Lab "${subject.name}": no professor assigned.`);
      return;
    }

    const neededSlots = Math.max(2, subject.continuousSlots || 2);
    const groups = getConsecutiveGroups(this.daySlots, neededSlots);
    if (!groups.length) {
      this.warnings.push(`Lab "${subject.name}": no consecutive slot groups of size ${neededSlots}.`);
      return;
    }

    for (const batch of batches) {
      const labRooms = this._labRoomsFor(batch.studentCount);
      if (!labRooms.length) {
        this.warnings.push(`Lab "${subject.name}" batch ${batch.name}: no lab room with capacity >= ${batch.studentCount}.`);
        continue;
      }

      let placed = false;
      for (const day of this.days) {
        if (placed) break;
        for (const group of groups) {
          if (placed) break;

          // All slots in group must be free for this batch
          if (!group.every(s => this._batchFree(batch.name, day, s.index))) continue;

          // Find available prof for all slots in group
          const prof = profs.find(p => {
            const pid = p._id.toString();
            const avDays = p.availability?.days || this.days;
            if (!avDays.includes(day)) return false;
            if (this._profDailyCount(pid, day) >= (p.maxLecturesPerDay || 4)) return false;
            return group.every(s => this._profFree(pid, day, s.index));
          });
          if (!prof) continue;

          // Find available lab room for all slots in group
          const room = labRooms.find(r =>
            group.every(s => this._roomFree(r._id.toString(), day, s.index))
          );
          if (!room) continue;

          // Schedule
          const labGroupId = makeId();
          group.forEach((s, idx) => {
            this.result.push({
              day, slotIndex: s.index, startTime: s.startTime, endTime: s.endTime,
              subject: subject._id, professor: prof._id, room: room._id,
              class: this.classDoc._id, batch: batch.name,
              type: 'lab', isLocked: false,
              isLabContinuation: idx > 0, labGroupId
            });
            this._markProf(prof._id.toString(), day, s.index);
            this._markRoom(room._id.toString(), day, s.index);
            this._markBatch(batch.name, day, s.index);
            // Also block the whole-class slot so theory doesn't overlap
            this._markClass(day, s.index);
          });
          placed = true;
        }
      }

      if (!placed) {
        this.warnings.push(`Lab "${subject.name}" batch ${batch.name}: could not find a free slot.`);
      }
    }
  }

  /* ─── Schedule a THEORY / TUTORIAL subject ─── */
  _scheduleTheory(subject) {
    const profs = this._profsFor(subject._id);
    if (!profs.length) {
      this.warnings.push(`Theory "${subject.name}": no professor assigned.`);
      return 0;
    }

    const rooms = this._classroomsFor(this.classDoc.totalStudents);
    if (!rooms.length) {
      this.warnings.push(`Theory "${subject.name}": no classroom with capacity >= ${this.classDoc.totalStudents}.`);
      return 0;
    }

    const needed = subject.weeklyHours || 1;
    let placed = 0;

    // Shuffle days for better distribution
    const days = [...this.days].sort(() => Math.random() - 0.5);

    outer:
    for (const day of days) {
      for (const slot of this.teachingSlots) {
        if (placed >= needed) break outer;
        if (!this._classFree(day, slot.index)) continue;

        const prof = profs.find(p => {
          const pid = p._id.toString();
          const avDays = p.availability?.days || this.days;
          if (!avDays.includes(day)) return false;
          if (this._profDailyCount(pid, day) >= (p.maxLecturesPerDay || 4)) return false;
          return this._profFree(pid, day, slot.index);
        });
        if (!prof) continue;

        const room = rooms.find(r => this._roomFree(r._id.toString(), day, slot.index));
        if (!room) continue;

        this.result.push({
          day, slotIndex: slot.index, startTime: slot.startTime, endTime: slot.endTime,
          subject: subject._id, professor: prof._id, room: room._id,
          class: this.classDoc._id, batch: null,
          type: subject.type || 'theory', isLocked: false,
          isLabContinuation: false, labGroupId: null
        });

        this._markProf(prof._id.toString(), day, slot.index);
        this._markRoom(room._id.toString(), day, slot.index);
        this._markClass(day, slot.index);
        placed++;
      }
    }

    if (placed < needed) {
      this.warnings.push(`"${subject.name}": scheduled ${placed}/${needed} hours (insufficient slots/professors/rooms).`);
    }
    return placed;
  }

  /* ─── Main generate ─── */
  generate() {
    const labSubjects    = this.subjects.filter(s => s.type === 'lab');
    const theorySubjects = this.subjects.filter(s => s.type !== 'lab');

    console.log(`[GEN] Class: ${this.classDoc.year}-${this.classDoc.division}`);
    console.log(`[GEN] Labs: ${labSubjects.length}, Theory/Tutorial: ${theorySubjects.length}`);
    console.log(`[GEN] Days: ${this.days.join(', ')}, Slots/day: ${this.teachingSlots.length}`);
    console.log(`[GEN] Professors: ${this.professors.length}, Rooms: ${this.rooms.length}`);

    // Phase 1: Labs first
    for (const sub of labSubjects) {
      console.log(`[GEN] Scheduling lab: ${sub.name}`);
      this._scheduleLab(sub);
    }

    // Phase 2: Theory / Tutorial
    for (const sub of theorySubjects) {
      console.log(`[GEN] Scheduling theory: ${sub.name}`);
      this._scheduleTheory(sub);
    }

    // Phase 3: Add break slots for every working day
    for (const day of this.days) {
      for (const slot of this.daySlots) {
        if (slot.isBreak) {
          this.result.push({
            day, slotIndex: slot.index, startTime: slot.startTime, endTime: slot.endTime,
            subject: null, professor: null, room: null,
            class: this.classDoc._id, batch: null,
            type: 'break', isLocked: false,
            isLabContinuation: false, labGroupId: null
          });
        }
      }
    }

    if (this.warnings.length) {
      console.warn(`[GEN] Warnings (${this.warnings.length}):`);
      this.warnings.forEach(w => console.warn('  -', w));
    }

    console.log(`[GEN] Total slots generated: ${this.result.length}`);
    return this.result;
  }

  /* ─── Validate for conflicts ─── */
  validateResult() {
    const conflicts = [];
    const seen = { prof: {}, room: {}, cls: {} };

    for (const slot of this.result) {
      if (slot.type === 'break' || slot.type === 'free') continue;
      const key = `${slot.day}-${slot.slotIndex}`;

      if (slot.professor) {
        const pk = `${slot.professor}-${key}`;
        if (seen.prof[pk]) conflicts.push(`Professor clash: ${slot.day} slot ${slot.slotIndex}`);
        seen.prof[pk] = true;
      }
      if (slot.room) {
        const rk = `${slot.room}-${key}`;
        if (seen.room[rk]) conflicts.push(`Room clash: ${slot.day} slot ${slot.slotIndex}`);
        seen.room[rk] = true;
      }
      if (!slot.batch) {
        const ck = `${slot.class}-${key}`;
        if (seen.cls[ck]) conflicts.push(`Class clash: ${slot.day} slot ${slot.slotIndex}`);
        seen.cls[ck] = true;
      }
    }
    return conflicts;
  }

  getWarnings() { return this.warnings; }
}

module.exports = TimetableGenerator;

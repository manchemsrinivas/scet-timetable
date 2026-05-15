'use strict';

const {
  DEFAULT_DAYS,
  DEFAULT_SLOTS_PER_DAY,
  LAB_BLOCK_SLOT_INDICES,
  PENALTY,
  PHANTOM_SECTION_ID,
} = require('./constants');

function randInt(n) {
  return Math.floor(Math.random() * n);
}

function cloneIndividual(ind) {
  return {
    labPlacements: ind.labPlacements.map((p) => ({ ...p })),
    lecturePlacements: ind.lecturePlacements.map((p) => ({ ...p })),
  };
}

function randomIndividual(problem) {
  const { days, slotsPerDay, labs, lectures } = problem;
  const labPlacements = labs.map(() => ({
    day: randInt(days),
    block: randInt(LAB_BLOCK_SLOT_INDICES.length),
  }));
  const lecturePlacements = lectures.map(() => ({
    day: randInt(days),
    slot: randInt(slotsPerDay),
  }));
  return { labPlacements, lecturePlacements };
}

function expandEvents(problem, individual) {
  const events = [];
  const { labs, lectures } = problem;
  const { labPlacements, lecturePlacements } = individual;

  for (let i = 0; i < labs.length; i++) {
    const lab = labs[i];
    const { day, block } = labPlacements[i];
    const slots = LAB_BLOCK_SLOT_INDICES[block];
    if (!slots) continue;
    for (const slot of slots) {
      events.push({
        kind: 'lab',
        day,
        slot,
        sectionId: lab.sectionId,
        facultyId: lab.facultyId,
        roomId: lab.roomId,
        subjectId: lab.subjectId,
        labId: lab.id,
        phantom: false,
      });
    }
  }

  for (let j = 0; j < lectures.length; j++) {
    const lec = lectures[j];
    const { day, slot } = lecturePlacements[j];
    events.push({
      kind: 'lecture',
      day,
      slot,
      sectionId: lec.sectionId,
      facultyId: lec.facultyId,
      roomId: lec.roomId,
      subjectId: lec.subjectId,
      lectureId: lec.id,
      phantom: !!lec.phantom,
    });
  }

  return events;
}

function evaluate(problem, individual) {
  const breakdown = {
    overlap: 0,
    labBlockInvalid: 0,
    subjectCap: 0,
    emptyDay: 0,
    noFirstSlot: 0,
    preference: 0,
    consecutiveLectureSameSubject: 0,
    sameSubjectSameDay: 0,
    facultyConsecutiveClasses: 0,
    moreThanOneLabPerDay: 0,
  };

  let penalty = 0;
  const { days, slotsPerDay, labs, lectures, faculty, subjectCapByKey } = problem;

  for (let i = 0; i < labs.length; i++) {
    const b = individual.labPlacements[i].block;
    if (b < 0 || b >= LAB_BLOCK_SLOT_INDICES.length) {
      const p = PENALTY.LAB_BLOCK_INVALID;
      breakdown.labBlockInvalid += p;
      penalty += p;
    }
  }

  const events = expandEvents(problem, individual);

  const facultyKey = (f, d, s) => `${f}\0${d}\0${s}`;
  const sectionKey = (sec, d, s) => `${sec}\0${d}\0${s}`;
  const roomKey = (r, d, s) => `${r}\0${d}\0${s}`;

  const facCount = new Map();
  const secCount = new Map();
  const roomCount = new Map();

  for (const e of events) {
    const fk = facultyKey(e.facultyId, e.day, e.slot);
    facCount.set(fk, (facCount.get(fk) || 0) + 1);
    if (!e.phantom) {
      const sk = sectionKey(e.sectionId, e.day, e.slot);
      secCount.set(sk, (secCount.get(sk) || 0) + 1);
    }
    if (e.roomId != null && e.roomId !== '') {
      const rk = roomKey(e.roomId, e.day, e.slot);
      roomCount.set(rk, (roomCount.get(rk) || 0) + 1);
    }
  }

  function addOverlap(map) {
    for (const c of map.values()) {
      if (c > 1) {
        const extra = c - 1;
        const p = extra * PENALTY.OVERLAP;
        breakdown.overlap += p;
        penalty += p;
      }
    }
  }
  addOverlap(facCount);
  addOverlap(secCount);
  addOverlap(roomCount);

  const pairCounts = new Map();
  for (const e of events) {
    const k = `${e.sectionId}\0${e.subjectId}`;
    pairCounts.set(k, (pairCounts.get(k) || 0) + 1);
  }
  for (const [k, cnt] of pairCounts) {
    const max = subjectCapByKey.has(k) ? subjectCapByKey.get(k) : 5;
    if (cnt > max) {
      const p = (cnt - max) * PENALTY.SUBJECT_CAP;
      breakdown.subjectCap += p;
      penalty += p;
    }
  }

  const sectionIds = problem.sectionIds;
  for (const sec of sectionIds) {
    for (let d = 0; d < days; d++) {
      const slotToEvent = new Map();
      for (const e of events) {
        if (e.sectionId !== sec || e.day !== d) continue;
        slotToEvent.set(e.slot, e);
      }
      for (let s = 0; s < slotsPerDay - 1; s++) {
        const e1 = slotToEvent.get(s);
        const e2 = slotToEvent.get(s + 1);
        if (!e1 || !e2) continue;
        if (e1.phantom || e2.phantom) continue;
        if (e1.kind !== 'lecture' || e2.kind !== 'lecture') continue;
        if (e1.subjectId === e2.subjectId) {
          const p = PENALTY.CONSECUTIVE_LECTURE_SAME_SUBJECT;
          breakdown.consecutiveLectureSameSubject += p;
          penalty += p;
        }
      }
    }
  }

  /** At most one lecture period per (section, subject, day). Labs use multiple slots intentionally. */
  const lectureDaySubject = new Map();
  for (const e of events) {
    if (e.phantom || e.sectionId === PHANTOM_SECTION_ID) continue;
    if (e.kind !== 'lecture') continue;
    const k = `${e.sectionId}\0${e.subjectId}\0${e.day}`;
    lectureDaySubject.set(k, (lectureDaySubject.get(k) || 0) + 1);
  }
  for (const cnt of lectureDaySubject.values()) {
    if (cnt > 1) {
      const extra = cnt - 1;
      const p = extra * PENALTY.SAME_SUBJECT_SAME_DAY;
      breakdown.sameSubjectSameDay += p;
      penalty += p;
    }
  }

  for (const sec of sectionIds) {
    for (let d = 0; d < days; d++) {
      const dayEvents = events.filter((e) => e.sectionId === sec && e.day === d && !e.phantom);
      if (dayEvents.length === 0) {
        const p = PENALTY.EMPTY_DAY;
        breakdown.emptyDay += p;
        penalty += p;
      } else {
        // Check if period 1 is empty for this section on this day
        const hasPeriod1 = dayEvents.some(e => e.slot === 0);
        if (!hasPeriod1) {
          const p = PENALTY.SECTION_PERIOD1_EMPTY;
          breakdown.sectionPeriod1Empty = (breakdown.sectionPeriod1Empty || 0) + p;
          penalty += p;
        }
      }
    }
  }

  const facultyFirstSlot = new Set();
  for (const e of events) {
    if (e.slot === 0) facultyFirstSlot.add(e.facultyId);
  }
  for (const f of faculty) {
    if (!facultyFirstSlot.has(f.id)) {
      const p = PENALTY.NO_FIRST_SLOT;
      breakdown.noFirstSlot += p;
      penalty += p;
    }
  }

  // NEW CONSTRAINT: Faculty consecutive classes across all sections
  for (const f of faculty) {
    for (let d = 0; d < days; d++) {
      const fEvents = events.filter((e) => e.facultyId === f.id && e.day === d && !e.phantom);
      const slotToEvent = new Map();
      for (const e of fEvents) {
        slotToEvent.set(e.slot, e);
      }
      for (let s = 0; s < slotsPerDay - 1; s++) {
        const e1 = slotToEvent.get(s);
        const e2 = slotToEvent.get(s + 1);
        if (e1 && e2) {
          // If both are the same lab block, it is naturally continuous, so skip penalty
          if (e1.kind === 'lab' && e2.kind === 'lab' && e1.labId === e2.labId) {
            continue;
          }
          // Otherwise, penalize for consecutive teaching
          const p = PENALTY.FACULTY_CONSECUTIVE_CLASSES;
          breakdown.facultyConsecutiveClasses += p;
          penalty += p;
        }
      }
    }
  }
  // NEW CONSTRAINT: At most one lab session per (section, day)
  const sectionDayLabs = new Map();
  for (let i = 0; i < labs.length; i++) {
    const lab = labs[i];
    const { day } = individual.labPlacements[i];
    if (lab.sectionId === PHANTOM_SECTION_ID) continue;
    const k = `${lab.sectionId}\0${day}`;
    sectionDayLabs.set(k, (sectionDayLabs.get(k) || 0) + 1);
  }
  for (const cnt of sectionDayLabs.values()) {
    if (cnt > 1) {
      const extra = cnt - 1;
      const p = extra * PENALTY.MORE_THAN_ONE_LAB_PER_DAY;
      breakdown.moreThanOneLabPerDay += p;
      penalty += p;
    }
  }

  const prefMap = new Map(faculty.map((f) => [f.id, new Set(f.preferenceSubjectIds || [])]));
  for (const e of events) {
    if (e.phantom) continue;
    const prefs = prefMap.get(e.facultyId);
    if (!prefs || prefs.size === 0) continue;
    if (!prefs.has(e.subjectId)) {
      const p = PENALTY.PREFERENCE;
      breakdown.preference += p;
      penalty += p;
    }
  }

  return { penalty, breakdown, events };
}

function tournamentSelect(pop, fitness, k) {
  let best = randInt(pop.length);
  for (let i = 1; i < k; i++) {
    const j = randInt(pop.length);
    if (fitness[j] < fitness[best]) best = j;
  }
  return best;
}

function crossover(p1, p2, problem) {
  const child = {
    labPlacements: p1.labPlacements.map((g, i) =>
      Math.random() < 0.5 ? { ...g } : { ...p2.labPlacements[i] }
    ),
    lecturePlacements: [],
  };
  const L = problem.lectures.length;
  if (L === 0) return child;
  const pt = randInt(L);
  for (let i = 0; i < L; i++) {
    child.lecturePlacements.push(
      i < pt
        ? { ...p1.lecturePlacements[i] }
        : { ...p2.lecturePlacements[i] }
    );
  }
  return child;
}

/**
 * Smart lab mutation: move the entire 3-slot block to another valid (day, block).
 * Lecture mutation: single-period move (or swap optional).
 */
function mutate(problem, individual, rate) {
  const { days, slotsPerDay, labs, lectures } = problem;
  const ind = cloneIndividual(individual);

  if (labs.length > 0 && Math.random() < rate) {
    const idx = randInt(labs.length);
    ind.labPlacements[idx] = {
      day: randInt(days),
      block: randInt(LAB_BLOCK_SLOT_INDICES.length),
    };
  }

  if (lectures.length > 0 && Math.random() < rate) {
    const idx = randInt(lectures.length);
    ind.lecturePlacements[idx] = {
      day: randInt(days),
      slot: randInt(slotsPerDay),
    };
  }

  if (lectures.length > 1 && Math.random() < rate * 0.5) {
    const a = randInt(lectures.length);
    let b = randInt(lectures.length);
    if (b === a) b = (b + 1) % lectures.length;
    const tmp = { ...ind.lecturePlacements[a] };
    ind.lecturePlacements[a] = { ...ind.lecturePlacements[b] };
    ind.lecturePlacements[b] = tmp;
  }

  return ind;
}

function cellForSlot(problem, events, sectionId, d, s) {
  const { periodLabels } = problem;
  const hit = events.find((e) => e.sectionId === sectionId && e.day === d && e.slot === s);
  if (!hit) {
    return {
      kind: 'empty',
      dayIndex: d,
      slotIndex: s,
      period: periodLabels[s],
      subjectId: null,
      facultyId: null,
      roomId: null,
    };
  }
  return {
    kind: hit.kind,
    dayIndex: d,
    slotIndex: s,
    period: periodLabels[s],
    subjectId: hit.subjectId,
    facultyId: hit.facultyId,
    roomId: hit.roomId,
  };
}

function buildWeekGridForSection(problem, events, sectionId) {
  const { days, slotsPerDay, dayLabels } = problem;
  const grid = [];
  for (let d = 0; d < days; d++) {
    const row = [];
    for (let s = 0; s < slotsPerDay; s++) {
      row.push(cellForSlot(problem, events, sectionId, d, s));
    }
    grid.push({ dayIndex: d, dayLabel: dayLabels[d], slots: row });
  }
  return grid;
}

/** Plain 5×8 matrix: matrix[day][period] — easy for React table mapping. */
function buildMatrix5x8(problem, events, sectionId) {
  const { days, slotsPerDay } = problem;
  const matrix = [];
  for (let d = 0; d < days; d++) {
    const row = [];
    for (let s = 0; s < slotsPerDay; s++) {
      row.push(cellForSlot(problem, events, sectionId, d, s));
    }
    matrix.push(row);
  }
  return matrix;
}

function normalizeProblem(raw) {
  const days = raw.days ?? DEFAULT_DAYS;
  const slotsPerDay = raw.slotsPerDay ?? DEFAULT_SLOTS_PER_DAY;
  const dayLabels = raw.dayLabels ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periodLabels = raw.periodLabels ?? Array.from({ length: slotsPerDay }, (_, i) => i + 1);

  const labs = raw.labs ?? [];
  const lectures = raw.lectures ?? [];
  const faculty = raw.faculty ?? [];
  const subjects = raw.subjects ?? [];

  const sectionIdSet = new Set();
  for (const l of labs) {
    if (l.sectionId !== PHANTOM_SECTION_ID) sectionIdSet.add(l.sectionId);
  }
  for (const le of lectures) {
    if (le.sectionId !== PHANTOM_SECTION_ID) sectionIdSet.add(le.sectionId);
  }
  let sectionIds = raw.sectionIds?.length
    ? raw.sectionIds.filter((id) => id !== PHANTOM_SECTION_ID)
    : [...sectionIdSet];

  const subjectCapByKey = new Map();
  for (const sub of subjects) {
    const key = `${sub.sectionId}\0${sub.id}`;
    const cap = sub.maxSlotsPerWeek ?? 5;
    subjectCapByKey.set(key, cap);
  }

  return {
    days,
    slotsPerDay,
    dayLabels,
    periodLabels,
    labs,
    lectures,
    faculty,
    subjects,
    sectionIds,
    subjectCapByKey,
  };
}

/**
 * Synchronous GA. Returns best schedule, penalty, and grid-friendly output.
 *
 * @param {object} rawProblem — see README in index.js / sample payload
 * @param {object} [options]
 * @param {number} [options.populationSize=40]
 * @param {number} [options.generations=400]
 * @param {number} [options.tournamentSize=3]
 * @param {number} [options.mutationRate=0.25]
 * @param {number} [options.elite=2]
 */
function runGA(rawProblem, options = {}) {
  const problem = normalizeProblem(rawProblem);
  const populationSize = options.populationSize ?? 40;
  const generations = options.generations ?? 400;
  const tournamentSize = options.tournamentSize ?? 3;
  const mutationRate = options.mutationRate ?? 0.25;
  const elite = options.elite ?? 2;

  const pop = [];
  const fitness = [];
  for (let i = 0; i < populationSize; i++) {
    const ind = randomIndividual(problem);
    pop.push(ind);
    fitness.push(evaluate(problem, ind).penalty);
  }

  let bestIdx = 0;
  for (let i = 1; i < populationSize; i++) {
    if (fitness[i] < fitness[bestIdx]) bestIdx = i;
  }

  for (let g = 0; g < generations; g++) {
    const next = [];

    const order = pop.map((_, i) => i).sort((a, b) => fitness[a] - fitness[b]);
    for (let e = 0; e < elite; e++) {
      next.push(cloneIndividual(pop[order[e]]));
    }

    while (next.length < populationSize) {
      const i1 = tournamentSelect(pop, fitness, tournamentSize);
      const i2 = tournamentSelect(pop, fitness, tournamentSize);
      let child = crossover(pop[i1], pop[i2], problem);
      child = mutate(problem, child, mutationRate);
      next.push(child);
    }

    for (let i = 0; i < populationSize; i++) {
      pop[i] = next[i];
      fitness[i] = evaluate(problem, pop[i]).penalty;
    }

    for (let i = 0; i < populationSize; i++) {
      if (fitness[i] < fitness[bestIdx]) bestIdx = i;
    }
  }

  const best = pop[bestIdx];
  const { penalty, breakdown, events } = evaluate(problem, best);

  const sections = problem.sectionIds.map((sectionId) => ({
    sectionId,
    weekGrid: buildWeekGridForSection(problem, events, sectionId),
    matrix5x8: buildMatrix5x8(problem, events, sectionId),
  }));

  const facultyHasFirstSlot = {};
  for (const f of problem.faculty) {
    facultyHasFirstSlot[f.id] = events.some((e) => e.facultyId === f.id && e.slot === 0);
  }

  return {
    fitness: { totalPenalty: penalty, breakdown },
    genome: best,
    events,
    sections,
    facultyHasFirstSlot,
    meta: {
      days: problem.days,
      slotsPerDay: problem.slotsPerDay,
      dayLabels: problem.dayLabels,
      periodLabels: problem.periodLabels,
    },
  };
}

module.exports = {
  runGA,
  evaluate,
  normalizeProblem,
  expandEvents,
  LAB_BLOCK_SLOT_INDICES,
  PENALTY,
};

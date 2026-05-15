'use strict';

/** Week length and periods per day (5×8 grid: Mon–Fri, 8 periods). */
const DEFAULT_DAYS = 6;
const DEFAULT_SLOTS_PER_DAY = 7;

/**
 * Lab blocks (0-based slot indices): 
 * Slots 2,3,4 -> indices 1, 2, 3
 * Slots 5,6,7 -> indices 4, 5, 6
 */
const LAB_BLOCK_SLOT_INDICES = [
  [1, 2, 3],
  [4, 5, 6],
];

/** Penalty weights (minimize total penalty). */
const PENALTY = {
  /** Faculty / section / room double-booking (per extra conflicting event). */
  OVERLAP: 2_000_000,
  /** Lab not using an allowed 3-slot block. */
  LAB_BLOCK_INVALID: 1_000_000,
  /** Subject exceeds maxSlotsPerWeek for that section. */
  SUBJECT_CAP: 500_000,
  /** Section has no class on a weekday. */
  EMPTY_DAY: 10_000,
  /** Faculty never teaches period 1 in the week. */
  NO_FIRST_SLOT: 10_000,
  /** Teaching a subject not in preference list (soft). */
  PREFERENCE: 50,
  /**
   * Same section: more than one lecture slot for the same subject on one calendar day.
   * Labs are exempt (multi-slot lab block is one session). Phantom obligations exempt.
   */
  SAME_SUBJECT_SAME_DAY: 100_000,
  /** Consecutive lecture same subject penalty (softened or kept for flow). */
  CONSECUTIVE_LECTURE_SAME_SUBJECT: 8_000,
  /** Section does not have a subject/lab in period 1. */
  SECTION_PERIOD1_EMPTY: 50_000,
  /** Faculty has continuous classes across any sections (except within the same lab block). */
  FACULTY_CONSECUTIVE_CLASSES: 50_000,
  /** Section has more than one lab session in a single day. */
  MORE_THAN_ONE_LAB_PER_DAY: 800_000,
};

/** Not a real section: holds synthetic periods so non-teaching faculty still participate in slot-1 fairness. */
const PHANTOM_SECTION_ID = '__phantom__';

module.exports = {
  DEFAULT_DAYS,
  DEFAULT_SLOTS_PER_DAY,
  LAB_BLOCK_SLOT_INDICES,
  PENALTY,
  PHANTOM_SECTION_ID,
};

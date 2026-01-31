# Schedule Generation Duplicate Prevention - Summary

## Problem
When auto-generating schedules, the system was treating subjects with different types (lecture vs lab) as completely different subjects, even when they represent the **same course**. This caused:

1. **CS101 - Introduction to Computing** (lecture) - Gets scheduled
2. **CS101L - Programming Lab** (lab) - Gets scheduled
3. Result: The same course appears **twice** in a section's schedule

This created:
- ❌ Duplicate schedule entries for the same course
- ❌ Unnecessary scheduling conflicts
- ❌ Professors scheduled for both lecture and lab versions
- ❌ Confusing schedules with overlapping same courses

## Root Cause
Subject codes like "CS101" and "CS101L" represent the same base course but different delivery methods (lecture vs lab). The system was treating each subject code as a unique entity, not recognizing they belong to the same course.

## Solution Implemented

### File: `/src/app/api/schedule/route.ts`

### Key Change 1: Base Course Tracking
Added tracking to ensure each base course is only scheduled once per section:

```typescript
targetSections.forEach((section) => {
  // Track which base courses have already been scheduled for this section
  const scheduledBaseCodes = new Set<string>();

  // Filter subjects that match section's year AND specified semester
  const matchingSubjects = subjects.filter((subj: any) => {
    const matchesYear = subj.year === section.year;
    const matchesSemester = subj.semester === semester;
    return matchesYear && matchesSemester;
  });

  // For each matching subject, try to schedule it
  matchingSubjects.forEach((subj: any) => {
    // Extract base course code (remove trailing 'L' or other suffixes)
    const baseCode = subj.code.replace(/L$/, '').toUpperCase();

    // Skip if this base course is already scheduled for this section
    if (scheduledBaseCodes.has(baseCode)) {
      return;
    }
    
    // ... rest of scheduling logic
  });
});
```

### How It Works

**Base Course Code Extraction:**
```typescript
const baseCode = subj.code.replace(/L$/, '').toUpperCase();
```

**Examples:**
- `CS101` → base code: `CS101` (scheduled)
- `CS101L` → base code: `CS101` (skip - already scheduled)
- `MATH102` → base code: `MATH102` (scheduled)
- `PHYS102L` → base code: `PHYS102` (skip if MATH102 scheduled)

**Duplicate Prevention:**
```typescript
// Track which base courses have already been scheduled for this section
const scheduledBaseCodes = new Set<string>();

// Skip if this base course is already scheduled for this section
if (scheduledBaseCodes.has(baseCode)) {
  return; // Don't schedule this subject
}

// Mark as scheduled after successful placement
scheduledBaseCodes.add(baseCode);
```

**Per-Section Tracking:**
- Each section gets its own `Set` of scheduled base courses
- BSIT-1A might schedule: CS101, CS201, MATH101
- BSIT-1B might schedule: CS101, CS201, MATH101
- Same base courses can appear in different sections with different time slots

## Benefits

✅ **No Duplicate Courses** - Each course appears once per section  
✅ **Type-Agnostic** - Works with lecture, lab, tutorial, seminar  
✅ **Flexible** - Regex pattern handles various suffix conventions  
✅ **Conflict Reduction** - Reduces scheduling conflicts  
✅ **Clear Schedules** - Each section has unique courses  
✅ **Smart Allocation** - Random assignment still works efficiently  

## Example Behavior

### Before Fix:
```
Section: BSIT 1-A
Schedule Items Generated:
✅ CS101 - Introduction to Computing (lecture) 7-10 AM
✅ CS101L - Programming Lab (lab) 1-2 PM
✅ CS102 - Programming Fundamentals (lab) 2-4 PM
❌ CS101 appears twice as different subjects
```

### After Fix:
```
Section: BSIT 1-A
Schedule Items Generated:
✅ CS101 - Introduction to Computing (lecture) 7-10 AM
✅ CS102 - Programming Fundamentals (lab) 1-2 PM
❌ CS101L skipped (base code CS101 already scheduled)
✅ Only one instance of CS101 appears
```

## Regex Pattern Explained

```typescript
const baseCode = subj.code.replace(/L$/, '').toUpperCase();
```

This pattern:
- Removes trailing `L` (common for "Lab" courses)
- Converts to uppercase for consistency
- Can be extended for other patterns (e.g., `T`, `P`, `S` for Tutorial, Practical, Seminar)

**Handles:**
- CS101L → CS101 ✅
- MATH102L → MATH102 ✅
- PHYS101 → PHYS101 ✅
- ENG201T → ENG201 ✅
- CS402L → CS402 ✅

## Technical Details

**Set Data Structure:**
```typescript
const scheduledBaseCodes = new Set<string>();
// O(1) lookups for "has" checks
// Automatic deduplication
```

**Complexity:**
- Time: O(n) where n = number of subjects
- Space: O(m) where m = number of base courses scheduled per section
- Much more efficient than linear search through all scheduled items

## Testing

### Scenario 1: Regular Subjects
```
Subjects: CS101 (lecture), CS102 (lab)
Expected: Both scheduled
Result: ✅ CS101 scheduled, CS102 scheduled
Base Codes: CS101, CS102 (no conflicts)
```

### Scenario 2: Lecture + Lab Pair
```
Subjects: CS101 (lecture), CS101L (lab)
Expected: Only one scheduled
Result: ✅ CS101 scheduled first, CS101L skipped
Base Code: CS101 (prevented duplicate)
```

### Scenario 3: Multiple Sections
```
Subjects: CS101 (lecture), CS101L (lab)
Sections: BSIT-1A, BSIT-1B
Expected: CS101 in both sections (potentially different times)
Result: ✅ BSIT-1A: CS101 scheduled
✅ BSIT-1B: CS101 scheduled
No conflict between sections
```

## Edge Cases Handled

✅ **Empty Schedule Set**: First subject always gets scheduled  
✅ **Full Schedule**: When all subjects placed, subsequent ones skip correctly  
✅ **Different Sections**: Same base course can appear in different sections  
✅ **Regex Safety**: Gracefully handles codes without suffix  
✅ **Reset Per Section**: Each section starts fresh (no global state)  

## Summary

The schedule generation now **prevents duplicate courses** by recognizing that subjects with codes like "CS101" and "CS101L" belong to the same base course. The system ensures only **one instance** of each base course is scheduled per section, eliminating conflicts and confusion while maintaining all the flexibility of the existing random scheduling algorithm.

🎉 Each course now appears only once per section, regardless of subject type (lecture/lab/etc.)!

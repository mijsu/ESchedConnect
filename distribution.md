# Schedule Distribution Algorithm

This document explains how the ESchedConnect system automatically generates and distributes class schedules to professors.

---

## Table of Contents

1. [Overview](#overview)
2. [System Structure & Computation Logic](#system-structure--computation-logic)
3. [Distribution Constraints](#distribution-constraints)
4. [Prerequisites](#prerequisites)
5. [Data Model](#data-model)
6. [Distribution Algorithm](#distribution-algorithm)
7. [Phase 1: Initial Distribution](#phase-1-initial-distribution)
8. [Phase 2: Balanced Stacking](#phase-2-balanced-stacking)
9. [Conflict Resolution](#conflict-resolution)
10. [Professor Workload Balancing](#professor-workload-balancing)
11. [Unassigned Subjects](#unassigned-subjects)
12. [Edge Cases and Limitations](#edge-cases-and-limitations)
13. [Best Practices](#best-practices)

---

## Overview

The schedule distribution system automatically assigns subjects to professors based on department qualifications, with strict constraints to ensure fair workload distribution and conflict-free schedules.

---

## System Structure & Computation Logic

### Sections and Year Levels

| Metric | Value | Description |
|--------|-------|-------------|
| Sections per year level | 15 | Each year level has 15 sections |
| Year levels | 4 | 1st year through 4th year |
| Sections per program | 60 | 15 sections × 4 year levels |
| Programs | 4 | BSIT, BSCS, BSOA, BSBA |
| **Total sections** | **240** | 60 sections × 4 programs |

### Subjects

| Metric | Value | Description |
|--------|-------|-------------|
| Subjects per section | 9 | Each section has 9 subjects |
| **Total subject schedules** | **2,160** | 240 sections × 9 subjects |

### Professors

| Metric | Value | Description |
|--------|-------|-------------|
| Total professors | 60 | Teaching staff |
| Schedules per professor | 36 | 2,160 ÷ 60 professors |

### Weekly Distribution

| Metric | Value | Description |
|--------|-------|-------------|
| Teaching days | 6 | Monday through Saturday |
| Schedules per professor per day | 6 | 36 schedules ÷ 6 days |

### Daily Time Distribution

| Metric | Value | Description |
|--------|-------|-------------|
| School hours | 7:00 AM - 9:00 PM | 15 hours total |
| Time slots | 15 | 1-hour increments |
| Schedule duration | 3 hours | Fixed slot duration |
| Maximum schedules per day | 5 | Per section (5 × 3 = 15 hours) |

---

## Distribution Constraints

The system enforces the following hard constraints:

| Constraint | Value | Description |
|------------|-------|-------------|
| **Fixed Slot Duration** | 3 hours | Every subject occupies exactly one 3-hour time slot |
| **Max Subjects Per Professor** | 36 | 6 subjects per day × 6 days = 36 total |
| **Max Subjects Per Day** | 6 | A professor can have up to 6 subjects on any single day |
| **Max Hours Per Day** | 18 | Maximum 18 teaching hours per professor per day (6 × 3 hours) |
| **No Time Overlaps** | - | Professors must never have overlapping time slots |
| **Section Conflicts** | - | A section must never have overlapping subjects |
| **Department Qualification** | - | Professors may only teach subjects within their department |

### Workload Balancing Priority

When multiple professors can teach a subject, the system prioritizes:
1. **Fewer total assigned subjects** - Professors with less overall load are selected first
2. **Fewer subjects on that day** - Professors with less load on the specific day are preferred
3. **Fewer total hours** - As a tie-breaker

---

## Prerequisites

Before generating a schedule, ensure the following data exists in the system:

### Required Data

| Entity | Requirement | Description |
|--------|-------------|-------------|
| **Departments** | Must be created | Organizational units (IICT, IBOA) |
| **Programs** | Must be assigned to a Department | Degree programs (BSIT, BSCS, BSOA, BSBA) |
| **Professors** | Must be assigned to one or more Departments | 60 teaching staff with department affiliations |
| **Subjects** | Must be assigned to a Program | Courses with year and semester information |
| **Sections** | Must be created under Programs | 60 sections per program (15 per year level) |

### Data Flow

```
Department
    └── Program(s)
            ├── Subject(s) - for each Year & Semester
            └── Section(s) - for each Year (15 per year level)

Professor
    └── Department Assignment(s) - determines what they can teach
```

---

## Data Model

### Key Entities

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SCHEDULE DISTRIBUTION                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  Department  │       │   Professor  │       │    Subject   │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id           │◄──────│ departmentIds│       │ id           │
│ name         │       │ id           │       │ code         │
│ code         │       │ name         │       │ name         │
└──────────────┘       │ email        │       │ year         │
       ▲               │ role         │       │ semester     │
       │               └──────────────┘       │ programId    │◄──┐
       │                      │               └──────────────┘   │
       │                      │                      │           │
       │                      │                      ▼           │
┌──────────────┐       ┌──────────────┐       ┌──────────────┐   │
│   Program    │◄──────│   Schedule   │──────►│   Section    │   │
├──────────────┤       ├──────────────┤       ├──────────────┤   │
│ id           │       │ subjectId    │       │ id           │   │
│ name         │       │ professorId  │       │ programId    │───┘
│ code         │       │ sectionId    │       │ sectionName  │
│ departmentId │       │ day          │       │ year         │
└──────────────┘       │ startSlot    │       └──────────────┘
                       │ duration (3) │
                       │ semester     │
                       │ academicYear │
                       └──────────────┘
```

### Time Slots

The system uses a 15-slot time grid from 7:00 AM to 9:00 PM:

| Slot | Time | Slot | Time |
|------|------|------|------|
| 1 | 7:00 AM | 9 | 3:00 PM |
| 2 | 8:00 AM | 10 | 4:00 PM |
| 3 | 9:00 AM | 11 | 5:00 PM |
| 4 | 10:00 AM | 12 | 6:00 PM |
| 5 | 11:00 AM | 13 | 7:00 PM |
| 6 | 12:00 PM | 14 | 8:00 PM |
| 7 | 1:00 PM | 15 | 9:00 PM |
| 8 | 2:00 PM | | |

**Note**: With a fixed 3-hour duration, valid start slots are 1-13 (7:00 AM to 7:00 PM).

### Days of the Week

```
DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
```

---

## Distribution Algorithm

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SCHEDULE GENERATION FLOW                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Fetch All Data │
                    │  - Subjects     │
                    │  - Sections     │
                    │  - Professors   │
                    │  - Departments  │
                    │  - Programs     │
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Clear Existing  │
                    │    Schedule     │
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Build Subject-  │
                    │ Section Pairs   │
                    │ (All subjects   │
                    │  for each       │
                    │  section)       │
                    └────────┬────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │     PHASE 1: Initial            │
            │     Distribution                │
            │                                 │
            │  For each subject-section pair: │
            │  1. Find qualified professors   │
            │  2. Sort by workload            │
            │  3. Find available day & slot   │
            │  4. Check all constraints       │
            │  5. Assign if valid             │
            └────────────────┬────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │     PHASE 2: Balanced           │
            │     Stacking                    │
            │                                 │
            │  Retry unassigned pairs with    │
            │  updated workload priorities    │
            └────────────────┬────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Save to       │
                    │   Firestore     │
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Return Stats   │
                    │  & Unassigned   │
                    └─────────────────┘
```

---

## Phase 1: Initial Distribution

### Goal
Assign every subject-section pair to exactly one professor, one day, and one time slot.

### Algorithm

```python
for each subject-section pair (shuffled for randomness):
    # Step 1: Find qualified professors
    qualified_professors = filter professors where:
        professor.departmentIds contains subject.program.departmentId

    if no qualified professors:
        mark as unassigned with reason
        continue

    # Step 2: Try each day
    for each day (Mon-Sat):
        # Find available slot for the section on this day
        section_slot = find_available_slot_for_section(day, section)
        if section_slot is None:
            continue  # No available slot for section on this day

        # Step 3: Sort professors by workload
        sorted_professors = sort by:
            1. totalSubjects (ascending)
            2. subjectsPerDay[day] (ascending)
            3. totalHours (ascending)

        # Step 4: Try each professor in sorted order
        for professor in sorted_professors:
            # Check all constraints
            if professor.totalSubjects >= 36:
                continue  # Max subjects reached
            if professor.subjectsPerDay[day] >= 6:
                continue  # Max subjects per day reached
            if professor.hoursPerDay[day] + 3 > 18:
                continue  # Would exceed max hours per day
            if professor has time overlap on this slot:
                continue  # Time conflict
            if schedule has conflict (prof or section):
                continue  # Schedule conflict

            # All checks passed - assign subject
            assign_subject(professor, day, section_slot)
            mark as assigned
            break  # Move to next subject-section pair

    if not assigned:
        mark as unassigned with reason
```

### Constraint Checking Order

The system checks constraints in this order (fail-fast approach):

1. **Total subjects limit** (max 36)
2. **Daily subjects limit** (max 6 per day)
3. **Daily hours limit** (max 18 per day)
4. **Professor time overlap** (no overlapping slots)
5. **Schedule conflicts** (no section overlap, no professor overlap)

---

## Phase 2: Balanced Stacking

### Goal
Attempt to assign any remaining unassigned subject-section pairs after Phase 1.

### When Does Phase 2 Run?
Phase 2 runs when:
- Phase 1 couldn't assign all subjects
- Some pairs were skipped due to temporary conflicts that may have been resolved

### Algorithm

```python
while unassigned_pairs exist and attempts < max_attempts:
    for each unassigned pair:
        if already assigned:
            continue

        qualified_professors = get_qualified_professors(subject)

        for each day (Mon-Sat):
            section_slot = find_available_slot_for_section(day, section)
            if section_slot is None:
                continue

            # Re-sort with updated workload data
            sorted_professors = sort by workload priority

            for professor in sorted_professors:
                if all constraints satisfied:
                    assign_subject(professor, day, section_slot)
                    mark as assigned
                    break

    if no progress made in this iteration:
        break  # Avoid infinite loop
```

---

## Conflict Resolution

### Types of Conflicts

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CONFLICT DETECTION                            │
└─────────────────────────────────────────────────────────────────────┘

1. PROFESSOR TIME OVERLAP
   ┌─────────┬─────────────────┐
   │  Time   │   Professor A   │
   ├─────────┼─────────────────┤
   │ 8:00 AM │ CS 101 (BSIT-A) │ ←─┐
   │ 9:00 AM │ CS 101 (BSIT-A) │   │ Overlapping
   │10:00 AM │ CS 102 (BSIT-B) │ ←─┘ NOT ALLOWED!
   └─────────┴─────────────────┘

2. SECTION TIME OVERLAP
   ┌─────────┬─────────────────┐
   │  Time   │   BSIT 1-A      │
   ├─────────┼─────────────────┤
   │ 8:00 AM │ CS 101 (Prof A) │ ←─┐
   │ 9:00 AM │ CS 101 (Prof A) │   │ Overlapping
   │10:00 AM │ CS 102 (Prof B) │ ←─┘ NOT ALLOWED!
   └─────────┴─────────────────┘

3. PROFESSOR DAILY LIMIT EXCEEDED
   ┌─────────┬─────────────────┐
   │   Day   │   Professor A   │
   ├─────────┼─────────────────┤
   │ Mon     │ 7 subjects      │ ← Max is 6, NOT ALLOWED!
   └─────────┴─────────────────┘

4. VALID ASSIGNMENT (6 subjects per day)
   ┌─────────┬─────────────────────────────────┐
   │   Day   │   Professor A                   │
   ├─────────┼─────────────────────────────────┤
   │ Mon     │ CS 101 (7-10), CS 102 (10-1),   │
   │         │ CS 103 (1-4), CS 104 (4-7),     │
   │         │ CS 105 (7-10), CS 106 (10-1)    │
   ├─────────┼─────────────────────────────────┤
   │ Tue     │ Same pattern                    │
   │ Wed     │ Same pattern                    │
   │ Thu     │ Same pattern                    │
   │ Fri     │ Same pattern                    │
   │ Sat     │ Same pattern                    │
   └─────────┴─────────────────────────────────┘
   Total: 36 subjects, 108 hours per week
```

### Conflict Detection Logic

```typescript
const hasTimeConflict = (
  existingSchedule: ScheduleAssignment[],
  professorId: string,
  sectionId: string,
  day: string,
  startSlot: number
): boolean => {
  const endSlot = startSlot + FIXED_SLOT_DURATION; // startSlot + 3

  return existingSchedule.some((item) => {
    // Must be same day
    if (item.day !== day) return false;

    // Calculate time boundaries
    const itemEnd = item.startSlot + item.duration;
    const timeOverlap = startSlot < itemEnd && endSlot > item.startSlot;

    if (!timeOverlap) return false;

    // Conflict if same professor OR same section
    return item.professorId === professorId || item.sectionId === sectionId;
  });
};
```

---

## Professor Workload Balancing

### Tracking Metrics

The system tracks the following for each professor:

| Metric | Type | Description |
|--------|------|-------------|
| `totalSubjects` | number | Total subjects assigned (max: 36) |
| `totalHours` | number | Total teaching hours assigned |
| `subjectsPerDay` | Map<string, number> | Count of subjects per day (max: 6) |
| `hoursPerDay` | Map<string, number> | Count of hours per day (max: 18) |
| `slotsPerDay` | Map<string, Set<string>> | Time slots used per day |

### Professor Schedule State

```typescript
interface ProfessorSchedule {
  id: string;
  name: string;
  email: string;
  departmentIds: string[];
  teachingDays: string[];            // ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  totalSubjects: number;             // Max: 36
  totalHours: number;
  subjectsPerDay: Map<string, number>;  // Max: 6 per day
  hoursPerDay: Map<string, number>;     // Max: 18 per day
  slotsPerDay: Map<string, Set<string>>; // For overlap detection
}
```

### Sorting Algorithm

When selecting among valid professors, priority is given to those with:

```typescript
const sortProfessorsByWorkload = (
  profs: ProfessorSchedule[],
  day: string
): ProfessorSchedule[] => {
  return [...profs].sort((a, b) => {
    // Priority 1: Fewer total subjects
    if (a.totalSubjects !== b.totalSubjects) {
      return a.totalSubjects - b.totalSubjects;
    }

    // Priority 2: Fewer subjects on this specific day
    const aDaySubjects = a.subjectsPerDay.get(day) || 0;
    const bDaySubjects = b.subjectsPerDay.get(day) || 0;
    if (aDaySubjects !== bDaySubjects) {
      return aDaySubjects - bDaySubjects;
    }

    // Priority 3: Fewer total hours (tie-breaker)
    return a.totalHours - b.totalHours;
  });
};
```

---

## Unassigned Subjects

### Why Subjects Go Unassigned

A subject may remain unassigned due to:

| Reason | Description |
|--------|-------------|
| **No qualified professors** | No professors assigned to the subject's department |
| **All professors at capacity** | All qualified professors have reached 36 subjects |
| **Daily limit conflicts** | All qualified professors have 6 subjects on all available days |
| **Time slot conflicts** | No available time slots for the section |
| **Combination of constraints** | Multiple constraints prevent assignment |

### Unassigned Subject Information

```typescript
interface UnassignedSubject {
  subjectCode: string;
  subjectName: string;
  sectionName: string;
  programName: string;
  year: number;
  reason: string;  // Detailed explanation
}
```

---

## Edge Cases and Limitations

### Maximum Capacity

The system has theoretical limits based on constraints:

| Resource | Limit | Calculation |
|----------|-------|-------------|
| **Subjects per professor** | 36 | Hard limit (6 per day × 6 days) |
| **Subjects per professor per day** | 6 | Hard limit |
| **Hours per professor per day** | 18 | Hard limit (6 subjects × 3 hours) |
| **Total professor capacity** | 60 × 36 = 2,160 | Matches total schedules needed |
| **Maximum section slots per day** | 5 | With 3-hour slots in a 15-hour day |
| **Maximum subjects per section** | 30 | 6 days × 5 slots per day |

### When to Add More Professors

If many subjects remain unassigned:
1. Check the unassigned subjects report
2. If "at capacity" is the common reason, add more professors
3. If "no qualified professors" is the reason, assign professors to departments

### Section Time Availability

Each section has limited time slots:
- 6 days × 5 possible 3-hour slots = 30 maximum subjects per section
- Slots: 7-10, 8-11, 9-12, 10-1, 11-2, 12-3, 1-4, 2-5, 3-6, 4-7, 5-8, 6-9, 7-10

---

## Best Practices

### 1. Department Setup

```
✓ Create departments before programs
✓ Assign programs to departments immediately
✓ Use clear department codes (IICT, IBOA)
```

### 2. Professor Assignment

```
✓ Assign professors to all relevant departments
✓ A professor can teach in multiple departments
✓ Ensure enough professors per department for workload
✓ Rule of thumb: 1 professor can handle 36 subjects
```

### 3. Subject Configuration

```
✓ Always assign subjects to programs
✓ Ensure year and semester are correct
✓ Duration is automatically set to 3 hours
```

### 4. Section Management

```
✓ Create 15 sections per year level (60 total per program)
✓ Use consistent naming conventions (BSIT 1-A, BSIT 1-B)
✓ Ensure program assignment is correct
✓ Limit subjects per section to ~30 (5 per day max)
```

### 5. Schedule Generation

```
✓ Verify all data is complete before generating
✓ Check the unassigned subjects report
✓ Review professor workload distribution
✓ Add professors if many subjects are unassigned
✓ Make manual adjustments if needed
```

---

## Generation Summary Example

After running schedule generation, the system outputs:

```
======================================================================
SCHEDULE GENERATION SUMMARY
======================================================================

Total sections processed: 240
Total subject-section pairs: 2,160
Phase 1 assigned: 2,100
Phase 2 assigned: 60
Total assigned: 2,160
Unassigned: 0

--- Professor Workload Distribution ---

Dr. Smith (smith@university.edu):
  Total Subjects: 36/36
  Total Hours: 108
  Mon: 6 subjects, 18 hours
  Tue: 6 subjects, 18 hours
  Wed: 6 subjects, 18 hours
  Thu: 6 subjects, 18 hours
  Fri: 6 subjects, 18 hours
  Sat: 6 subjects, 18 hours

Prof. Johnson (johnson@university.edu):
  Total Subjects: 36/36
  Total Hours: 108
  Mon: 6 subjects, 18 hours
  ... (same pattern)

======================================================================
```

---

## API Endpoint

### Generate Schedule

```http
POST /api/schedule
Content-Type: application/json

{
  "academicYear": "2024-2025",
  "semester": 1
}
```

### Response

```json
{
  "schedule": [
    {
      "id": "abc123",
      "subjectId": "subj001",
      "subjectCode": "IT 101",
      "subjectName": "Introduction to Computing",
      "sectionId": "sec001",
      "sectionName": "BSIT 1-A",
      "professorId": "prof001",
      "professorName": "Dr. Smith",
      "day": "Mon",
      "startSlot": 2,
      "duration": 3,
      "semester": 1,
      "academicYear": "2024-2025"
    }
  ]
}
```

---

## Conclusion

The ESchedConnect distribution algorithm ensures:

1. **Complete Coverage** - Every subject in every section is scheduled (2,160 total)
2. **Fair Distribution** - Workload is balanced across all 60 professors
3. **Constraint Compliance** - All hard constraints are enforced
4. **Conflict-Free** - No overlapping schedules for professors or sections
5. **Optimized Schedule** - 6 schedules per professor per day, evenly distributed

For questions or issues with schedule generation, check:
- Department-program assignments
- Professor-department assignments
- Subject-program assignments
- Professor workload distribution
- Unassigned subjects report

---

*Last Updated: January 2025*
*ESchedConnect - University Schedule Management System*

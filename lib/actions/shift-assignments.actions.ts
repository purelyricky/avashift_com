// lib/actions/shift-assignments.actions.ts

"use server";

import { ID, Query, Models } from "node-appwrite";
import { sendProjectAssignmentEmail } from '@/lib/emails';
import { createAdminClient } from "@/lib/actions/appwrite";
import {
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  endOfDay,
  isSameDay,
} from "date-fns";

interface ShiftDocument extends Models.Document {
  $id: string; // Add this if not already present
  shiftId: string;
  projectId: string;
  shiftLeaderId: string;
  gatemanId: string;
  dayOfWeek: string;
  date: string;
  timeType: "day" | "night";
  startTime: string;
  stopTime: string;
  requiredStudents: number;
  assignedCount: number;
  shiftType: "normal" | "filler";
  status: "draft" | "published" | "inProgress" | "completed" | "cancelled";
  createdBy: string;
  createdAt: string;
  dateOfUpdate: string;
}

//===============================================
interface DateRange {
  from: Date;
  to: Date;
}

interface OptionalDateRange {
  from?: Date;
  to?: Date;
}
//===============================================


// Add new interfaces for the return types
interface AvailabilityDate {
  date: string;
  dayOfWeek: string;
  timeType: "day" | "night";
}

interface ProjectShift {
  date: string;
  dayOfWeek: string;
  timeType: "day" | "night";
  shiftId: string;
  startTime: string;
  stopTime: string;
  requiredStudents: number;
  assignedCount: number;
  status: "draft" | "published" | "inProgress" | "completed" | "cancelled";
}

// Helper function to check if a date is within range (inclusive)
function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const targetDate = startOfDay(date);
  const rangeStart = startOfDay(start);
  const rangeEnd = endOfDay(end);

  return (
    isWithinInterval(targetDate, { start: rangeStart, end: rangeEnd }) ||
    isSameDay(targetDate, rangeStart) ||
    isSameDay(targetDate, rangeEnd)
  );
}



// Helper function to normalize day names for comparison
function normalizeDayName(day?: string): string {
  if (!day) return '';
  
  // First, convert to lowercase
  const lowercaseDay = day.toLowerCase();
  
  // Map of possible day variations to standardized format
  const dayMap: Record<string, string> = {
    'mon': 'Mon',
    'monday': 'Mon',
    'tue': 'Tue',
    'tuesday': 'Tue',
    'wed': 'Wed',
    'wednesday': 'Wed',
    'thu': 'Thu',
    'thursday': 'Thu',
    'fri': 'Fri',
    'friday': 'Fri',
    'sat': 'Sat',
    'saturday': 'Sat',
    'sun': 'Sun',
    'sunday': 'Sun'
  };

  return dayMap[lowercaseDay] || day.charAt(0).toUpperCase() + day.slice(1, 3);
}

// Add new interface for assignment validation result
interface AssignmentValidationResult {
  isValid: boolean;
  error?: string;
}

// Add new interface for assignment creation result
interface AssignmentCreationResult {
  success: boolean;
  error?: string;
  isExtra?: boolean;
  assignmentDetails?: ShiftAssignmentDocument;
}

interface ShiftDay {
  date: string;
  dayOfWeek: string;
  timeType: "day" | "night";
  shiftId: string;
  startTime: string;
  stopTime: string;
  requiredStudents: number;
  assignedCount: number;
}

// New function to get available shift days
export async function getAvailableShiftDays(
  projectId: string,
  userId: string,
  dateRange?: OptionalDateRange
): Promise<ShiftDay[]> {
  const { database } = await createAdminClient();

  try {
    // 1. Get user's availability
    const userAvailability = await database.listDocuments<UserAvailabilityDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
      [
        Query.equal("userId", [userId]),
        Query.equal("status", ["active"]),
        Query.equal("age", ["new"]),
      ]
    );

    // 2. Get shifts for the project within date range
    let shiftQueries = [
      Query.equal("projectId", [projectId]),
      Query.equal("status", ["published", "inProgress"]),
    ];

    if (dateRange?.from && dateRange?.to) {
      shiftQueries.push(
        Query.greaterThanEqual("date", dateRange.from.toISOString()),
        Query.lessThanEqual("date", dateRange.to.toISOString())
      );
    }

    const shifts = await database.listDocuments<ShiftDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftQueries
    );

    console.log("Retrieved shifts:", shifts.documents);

    // 3. Get existing assignments for the user
    const assignments = await database.listDocuments<ShiftAssignmentDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [
        Query.equal("studentId", [userId]),
        Query.equal("status", ["assigned", "confirmed"]),
      ]
    );

    // 4. Filter shifts based on availability and existing assignments
    const availableShifts = shifts.documents
      .filter((shift) => {
        // Check if shift is already assigned
        const isAssigned = assignments.documents.some(
          (assign) => assign.shiftId === shift.shiftId
        );
        if (isAssigned) return false;

        // Check if user is available for this shift
        const isAvailable = userAvailability.documents.some((avail) => {
          const shiftDate = new Date(shift.date);
          const availFromDate = new Date(avail.fromDate);
          const availToDate = new Date(avail.toDate);
          
          // Convert both to lowercase for comparison
          const shiftDay = shift.dayOfWeek.toLowerCase();
          const availDay = avail.dayOfWeek.toLowerCase();

          return (
            shiftDay === availDay &&
            avail.timeType === shift.timeType &&
            shiftDate >= availFromDate &&
            shiftDate <= availToDate
          );
        });

        return isAvailable;
      })
      .map((shift) => ({
        date: shift.date,
        dayOfWeek: shift.dayOfWeek,
        timeType: shift.timeType,
        shiftId: shift.shiftId,
        startTime: shift.startTime,
        stopTime: shift.stopTime,
        requiredStudents: shift.requiredStudents,
        assignedCount: shift.assignedCount,
      }));

    console.log("Available shift days:", availableShifts);
    return availableShifts;

  } catch (error) {
    console.error("Error getting available shift days:", error);
    return [];
  }
}

// New function to get available dates for a user
export async function getUserAvailableDates(
  userId: string,
  dateRange: OptionalDateRange
): Promise<AvailabilityDate[]> {
  const { database } = await createAdminClient();

  try {
    if (!dateRange.from || !dateRange.to) {
      return [];
    }

    // Get user's availability records with age 'new'
    const availability = await database.listDocuments<UserAvailabilityDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
      [
        Query.equal("userId", [userId]),
        Query.equal("status", ["active"]),
        Query.equal("age", ["new"]),
      ]
    );

    // Log the availability data received
    console.log("User Availability Data:", availability.documents);

    if (availability.documents.length === 0) {
      return [];
    }

    const availableDates: AvailabilityDate[] = [];
    const startDate = startOfDay(new Date(dateRange.from));
    const endDate = endOfDay(new Date(dateRange.to));

    // For each availability record
    for (const record of availability.documents) {
      const recordStart = startOfDay(new Date(record.fromDate));
      const recordEnd = endOfDay(new Date(record.toDate));

      // Iterate through the date range
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        // Check if current date falls within the availability record's range (inclusive)
        const isAvailable =
          isDateInRange(currentDate, recordStart, recordEnd) &&
          format(currentDate, "EEE") === record.dayOfWeek;

        if (isAvailable) {
          availableDates.push({
            date: format(currentDate, "yyyy-MM-dd"),
            dayOfWeek: record.dayOfWeek,
            timeType: record.timeType,
          });
        }
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Sort dates chronologically and remove duplicates
    return availableDates
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter(
        (date, index, self) =>
          index ===
          self.findIndex(
            (d) => d.date === date.date && d.timeType === date.timeType
          )
      );
  } catch (error) {
    console.error("Error getting user available dates:", error);
    return [];
  }
}

// Updated function to get project shifts
export async function getProjectShifts(
  projectId: string,
  dateRange: OptionalDateRange
): Promise<ProjectShift[]> {
  const { database } = await createAdminClient();

  try {
    if (!dateRange?.from || !dateRange?.to) {
      return [];
    }

    const startDate = startOfDay(new Date(dateRange.from));
    const endDate = endOfDay(new Date(dateRange.to));

    // Base queries for shifts
    const shiftQueries = [
      Query.equal("projectId", [projectId]),
      Query.equal("status", ["published", "inProgress"]),
      Query.greaterThanEqual("date", startDate.toISOString()),
      Query.lessThanEqual("date", endDate.toISOString()),
    ];

    // Get shifts
    const shifts = await database.listDocuments<ShiftDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftQueries
    );

    // Log the project shifts data received
    console.log("Project Shifts Data:", shifts.documents);

    // Transform and sort shifts
    const projectShifts: ProjectShift[] = shifts.documents
      .filter((shift) => {
        const shiftDate = startOfDay(parseISO(shift.date));
        return isDateInRange(shiftDate, startDate, endDate);
      })
      .map((shift) => ({
        date: format(parseISO(shift.date), "yyyy-MM-dd"),
        dayOfWeek: format(parseISO(shift.date), "EEE"),
        timeType: shift.timeType,
        shiftId: shift.shiftId,
        startTime: shift.startTime,
        stopTime: shift.stopTime,
        requiredStudents: shift.requiredStudents,
        assignedCount: shift.assignedCount,
        status: shift.status,
      }));

    // Sort shifts chronologically and remove any duplicates
    return projectShifts
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter(
        (shift, index, self) =>
          index ===
          self.findIndex(
            (s) => s.date === shift.date && s.timeType === shift.timeType
          )
      );
  } catch (error) {
    console.error("Error getting project shifts:", error);
    return [];
  }
}

interface UserAvailabilityDocument extends Models.Document {
  $id: string;
  userId: string;
  dayOfWeek: string;
  timeType: "day" | "night";
  status: "active" | "inactive";
  fromDate: string;
  toDate: string;
}

// Add this interface with the existing ones at the top
interface ProjectMemberDocument extends Models.Document {
  $id: string;
  memberId: string;
  projectId: string;
  userId: string;
  membershipType:
    | "owner"
    | "student"
    | "shiftLeader"
    | "client"
    | "manager"
    | "member";
  status: "active" | "inactive";
}

interface StudentDocument extends Models.Document {
  $id: string;
  userId: string;
  firstName: string;
  lastName: string;
  punctualityScore: number;
  rating: number;
  email: string;
}

interface ShiftAssignmentDocument extends Models.Document {
  $id: string;
  assignmentId: string;
  shiftId: string;
  studentId: string;
  status: "pending" | "assigned" | "confirmed" | "completed" | "cancelled";
}

// Response interfaces (same as before)
export interface ShiftAssignmentStats {
  totalRequests: number;
  assignedCount: {
    day: number;
    night: number;
  };
  demand: {
    day: number;
    night: number;
  };
}

export interface UserAvailability {
  userId: string;
  name: string;
  punctualityScore: number;
  rating: number;
  requestedDays: {
    day: string[];
    night: string[];
  };
  bookedDays: {
    day: string[];
    night: string[];
  };
  availableShifts: Array<{
    date: string;
    dayOfWeek: string;
    timeType: "day" | "night";
    shiftId: string;
    startTime: string;
    stopTime: string;
    requiredStudents: number;
    assignedCount: number;
  }>;
}

export type { DateRange, OptionalDateRange };

function hasAdequateRest(
  proposedShift: ShiftDocument,
  existingShifts: ShiftDocument[]
): boolean {
  const proposedStart = new Date(proposedShift.startTime);
  const proposedEnd = new Date(proposedShift.stopTime);

  return !existingShifts.some((existingShift) => {
    const existingStart = new Date(existingShift.startTime);
    const existingEnd = new Date(existingShift.stopTime);

    // Check both forward and backward 10-hour gaps
    const hoursAfterExisting =
      (proposedStart.getTime() - existingEnd.getTime()) / (1000 * 60 * 60);
    const hoursBeforeExisting =
      (existingStart.getTime() - proposedEnd.getTime()) / (1000 * 60 * 60);

    return (
      Math.abs(hoursAfterExisting) < 10 || Math.abs(hoursBeforeExisting) < 10
    );
  });
}

export async function getShiftAssignmentStats(
  projectId: string,
  dateRange?: OptionalDateRange
): Promise<ShiftAssignmentStats> {
  const { database } = await createAdminClient();

  try {
    // Get project members (students)
    const members = await database.listDocuments<ProjectMemberDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal("projectId", [projectId]),
        Query.equal("membershipType", ["student"]),
        Query.equal("status", ["active"]),
      ]
    );

    // Get shifts within date range
    let shiftQueries = [
      Query.equal("projectId", [projectId]),
      Query.equal("status", ["published", "inProgress"]),
    ];

    if (dateRange) {
      shiftQueries.push(
        Query.greaterThanEqual("date", dateRange.from!.toISOString()),
        Query.lessThanEqual("date", dateRange.to!.toISOString())
      );
    }

    const shifts = await database.listDocuments<ShiftDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftQueries
    );

    // Calculate stats
    const stats = shifts.documents.reduce(
      (acc, shift) => {
        if (shift.timeType === "day") {
          acc.demand.day += shift.requiredStudents;
          acc.assignedCount.day += shift.assignedCount;
        } else {
          acc.demand.night += shift.requiredStudents;
          acc.assignedCount.night += shift.assignedCount;
        }
        return acc;
      },
      {
        totalRequests: members.documents.length,
        assignedCount: { day: 0, night: 0 },
        demand: { day: 0, night: 0 },
      }
    );

    return stats;
  } catch (error) {
    console.error("Error getting shift assignment stats:", error);
    return {
      totalRequests: 0,
      assignedCount: { day: 0, night: 0 },
      demand: { day: 0, night: 0 },
    };
  }
}

// Add this helper function at the top
function isDateInFuture(date: Date): boolean {
  return startOfDay(date) >= startOfDay(new Date());
}

// Add this helper function to check if date range includes future dates
function dateRangeIncludesFuture(range?: OptionalDateRange): boolean {
  if (!range?.to) return true; // Default to true if no range specified
  return isDateInFuture(range.to);
}

// Add this helper to get current week range
function getCurrentWeekRange(): OptionalDateRange {
  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(new Date(today.setDate(today.getDate() + 6)));
  return { from: start, to: end };
}

// Add these interfaces at the top with your other interfaces
export interface RequestedDayStatus {
  day: string;
  hasShift: boolean;
  isBooked: boolean;
}

export interface UserAvailabilityWithStatus {
  userId: string;
  name: string;
  punctualityScore: number;
  rating: number;
  requestedDays: {
    day: RequestedDayStatus[];
    night: RequestedDayStatus[];
  };
  bookedDays: {
    day: string[];
    night: string[];
  };
  availableShifts: ShiftDay[];
}

// Modified getUserAvailabilities function
export async function getUserAvailabilities(
  projectId: string,
  dateRange?: OptionalDateRange
): Promise<UserAvailabilityWithStatus[]> {
  const { database } = await createAdminClient();

  try {
    const effectiveDateRange = dateRange || getCurrentWeekRange();
    const includesFuture = dateRangeIncludesFuture(effectiveDateRange);
    
    console.log("Date range:", effectiveDateRange);
    console.log("Includes future:", includesFuture);

    // First get project shifts to get their IDs
    const projectShifts = await database.listDocuments<ShiftDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal("projectId", [projectId]),
        Query.equal("status", ["published", "inProgress"]),
        Query.greaterThanEqual("date", effectiveDateRange.from!.toISOString()),
        Query.lessThanEqual("date", effectiveDateRange.to!.toISOString())
      ]
    );

    // Get the shift IDs for this project
    const projectShiftIds = projectShifts.documents.map(shift => shift.shiftId);
    console.log("Project shifts found:", projectShifts.documents.length);

    // Get active project members
    const members = await database.listDocuments<ProjectMemberDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal("projectId", [projectId]),
        Query.equal("membershipType", ["student"]),
        Query.equal("status", ["active"]),
      ]
    );

    console.log("Active members found:", members.documents.length);

    const availabilities: UserAvailabilityWithStatus[] = [];

    for (const member of members.documents) {
      try {
        // Get project-specific assignments using shift IDs
        const projectAssignments = await database.listDocuments<ShiftAssignmentDocument>(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
          [
            Query.equal("studentId", [member.userId]),
            Query.equal("status", ["assigned", "confirmed"]),
            Query.equal("shiftId", projectShiftIds) // Use shift IDs to filter project assignments
          ]
        );

        // Get all assignments (for checking conflicts)
        const allAssignments = await database.listDocuments<ShiftAssignmentDocument>(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
          [
            Query.equal("studentId", [member.userId]),
            Query.equal("status", ["assigned", "confirmed"])
          ]
        );

        console.log(`Member ${member.userId} assignments:`, {
          projectAssignments: projectAssignments.documents.length,
          allAssignments: allAssignments.documents.length
        });

        // If looking at past dates only and no project assignments, skip
        if (!includesFuture && projectAssignments.documents.length === 0) {
          console.log(`Skipping member ${member.userId} - no project assignments and past dates only`);
          continue;
        }

        // Get student details
        const studentDetails = await database.listDocuments<StudentDocument>(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
          [Query.equal("userId", [member.userId])]
        );

        if (studentDetails.documents.length === 0) {
          console.log(`No student details found for member ${member.userId}`);
          continue;
        }

        // Get user's availability records
        const availability = await database.listDocuments<UserAvailabilityDocument>(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
          [
            Query.equal("userId", [member.userId]),
            Query.equal("status", ["active"]),
            Query.equal("age", ["new"]),
          ]
        );

        // Process available shifts
        const availableShifts = projectShifts.documents
          .filter(shift => {
            // Check if shift is already assigned
            const isAssigned = projectAssignments.documents.some(
              assign => assign.shiftId === shift.shiftId
            );
            if (isAssigned) return false;

            // Check availability match
            return availability.documents.some(avail => 
              normalizeDayName(avail.dayOfWeek) === normalizeDayName(shift.dayOfWeek) &&
              avail.timeType === shift.timeType &&
              isDateInRange(new Date(shift.date), new Date(avail.fromDate), new Date(avail.toDate))
            );
          })
          .map(shift => ({
            date: shift.date,
            dayOfWeek: normalizeDayName(shift.dayOfWeek),
            timeType: shift.timeType,
            shiftId: shift.shiftId,
            startTime: shift.startTime,
            stopTime: shift.stopTime,
            requiredStudents: shift.requiredStudents,
            assignedCount: shift.assignedCount
          }));

        availabilities.push({
          userId: member.userId,
          name: `${studentDetails.documents[0].firstName} ${studentDetails.documents[0].lastName}`,
          punctualityScore: studentDetails.documents[0].punctualityScore,
          rating: studentDetails.documents[0].rating,
          requestedDays: {
            day: processRequestedDays(availability.documents, "day", availableShifts, projectAssignments.documents),
            night: processRequestedDays(availability.documents, "night", availableShifts, projectAssignments.documents)
          },
          bookedDays: {
            day: getBookedDays(allAssignments.documents, "day"),
            night: getBookedDays(allAssignments.documents, "night")
          },
          availableShifts
        });

        console.log(`Added availability for member ${member.userId}`);

      } catch (error) {
        console.error(`Error processing member ${member.userId}:`, error);
        continue;
      }
    }

    console.log(`Processed ${availabilities.length} total availabilities`);
    return availabilities;

  } catch (error) {
    console.error("Error getting user availabilities:", error);
    return [];
  }
}


function processRequestedDays(
  availabilityDocs: UserAvailabilityDocument[],
  timeType: "day" | "night",
  availableShifts: ShiftDay[],
  assignments: ShiftAssignmentDocument[]
): RequestedDayStatus[] {
  // Filter out any invalid documents
  const validDocs = availabilityDocs.filter(doc => doc && doc.dayOfWeek);
  
  // Get unique normalized days
  const uniqueDays = Array.from(new Set(
    validDocs
      .filter(a => a.timeType === timeType)
      .map(a => normalizeDayName(a.dayOfWeek))
      .filter(day => day) // Remove any empty strings
  ));

  return uniqueDays.map(day => ({
    day,
    hasShift: availableShifts.some(s => 
      normalizeDayName(s.dayOfWeek) === day && s.timeType === timeType
    ),
    isBooked: assignments.some(a => 
      normalizeDayName(a.dayOfWeek) === day && a.timeType === timeType
    )
  }));
}

// Add this helper function at the top with your other helper functions
function formatDateTime(dateTimeString: string): string {
  const date = new Date(dateTimeString);
  
  // Format date as DD-MM-YYYY
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  // Format time as HH:MM with AM/PM
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  
  // Convert to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // Convert 0 to 12
  
  return `${day}-${month}-${year} (${hours}:${minutes} ${ampm})`;
}

export async function createShiftAssignment(
  projectId: string,
  userId: string,
  shiftId: string,
  workerData?: UserAvailabilityWithStatus
): Promise<AssignmentCreationResult> {
  const { database } = await createAdminClient();

  try {
    // Get the shift details
    const shift = await database.getDocument<ShiftDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftId
    );

    // Get student details for email
    const studentDetails = await database.listDocuments<StudentDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      [Query.equal("userId", [userId])]
    );

    if (studentDetails.documents.length === 0) {
      return {
        success: false,
        error: "Student details not found"
      };
    }

    // Get project details for email
    const project = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      projectId
    );

    // Normalize the shift day (which is in lowercase) to match our format (Mon, Tue, etc)
    const normalizedShiftDay = normalizeDayName(shift.dayOfWeek);

    // If worker data was passed, use it for validation
    if (workerData) {
      // 1. Check if user requested/is available for this day and shift type
      const isRequested = shift.timeType === 'day'
        ? workerData.requestedDays.day.some(day => day.day === normalizedShiftDay)
        : workerData.requestedDays.night.some(day => day.day === normalizedShiftDay);

      if (!isRequested) {
        return {
          success: false,
          error: `Student is not available for ${normalizedShiftDay} ${shift.timeType} shifts`
        };
      }

      // 2. Check if user already has a booking on this day
      const hasBooking = shift.timeType === 'day'
        ? workerData.bookedDays.day.includes(normalizedShiftDay)
        : workerData.bookedDays.night.includes(normalizedShiftDay);

      if (hasBooking) {
        return {
          success: false,
          error: `Student already has a ${shift.timeType} shift booked on ${normalizedShiftDay}`
        };
      }
    }

    // 3. Get project member ID for the assignment
    const projectMember = await database.listDocuments<ProjectMemberDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal("projectId", [projectId]),
        Query.equal("userId", [userId]),
        Query.equal("status", ["active"]),
      ]
    );

    if (projectMember.documents.length === 0) {
      return {
        success: false,
        error: "Student is not an active member of this project"
      };
    }

    // 4. Create the assignment with all required fields
    const assignmentId = ID.unique();
    const now = new Date().toISOString();
    
    const assignmentData = {
      assignmentId,
      shiftId: shift.shiftId,
      studentId: userId,
      projectMemberId: projectMember.documents[0].memberId,
      status: "assigned" as const,
      assignedBy: "system", 
      assignedAt: now,
      confirmedAt: null,
      createdAt: now,
      updatedAt: now
    };

    const assignment = await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      assignmentId,
      assignmentData
    );

    // 5. Update shift assigned count
    await database.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shift.$id,
      {
        assignedCount: shift.assignedCount + 1,
        updatedAt: now
      }
    );

    // Send email notification with formatted dates
    try {
      await sendProjectAssignmentEmail({
        studentName: `${studentDetails.documents[0].firstName} ${studentDetails.documents[0].lastName}`,
        studentEmail: studentDetails.documents[0].email,
        projectName: project.name,
        startTime: formatDateTime(shift.startTime),
        endTime: formatDateTime(shift.stopTime),
      });
    } catch (emailError) {
      console.error("Failed to send assignment email:", emailError);
      // Don't fail the assignment creation if email fails
    }

    return {
      success: true,
      isExtra: shift.assignedCount >= shift.requiredStudents,
      assignmentDetails: assignment as ShiftAssignmentDocument
    };

  } catch (error) {
    console.error("Error creating shift assignment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create assignment"
    };
  }
}




//===========================================================================
// POTENTIALLY USELESS FUNCTIONS
//===========================================================================

// Helper function to validate availability
async function validateAvailability(
  studentId: string,
  shift: ShiftDocument
): Promise<AssignmentValidationResult> {
  const { database } = await createAdminClient();

  try {
    const shiftDate = parseISO(shift.date);
    const dayOfWeek = format(shiftDate, "EEE");

    // Get user's availability
    const availability = await database.listDocuments<UserAvailabilityDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
      [
        Query.equal("userId", [studentId]),
        Query.equal("status", ["active"]),
        Query.equal("age", ["new"]),
        Query.equal("dayOfWeek", [dayOfWeek]),
        Query.equal("timeType", [shift.timeType]),
      ]
    );

    if (availability.documents.length === 0) {
      return {
        isValid: false,
        error: `Student is not available for ${dayOfWeek} ${shift.timeType} shifts`,
      };
    }

    // Check if the shift date falls within the availability period
    const hasValidAvailability = availability.documents.some((avail) => {
      const availStart = parseISO(avail.fromDate);
      const availEnd = parseISO(avail.toDate);
      return shiftDate >= availStart && shiftDate <= availEnd;
    });

    if (!hasValidAvailability) {
      return {
        isValid: false,
        error: `Student's availability does not cover the shift date`,
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error("Error validating availability:", error);
    return {
      isValid: false,
      error: "Failed to validate availability",
    };
  }
}

// Helper function to validate no booking conflicts
async function validateNoBookingConflicts(
  studentId: string,
  shift: ShiftDocument
): Promise<AssignmentValidationResult> {
  const { database } = await createAdminClient();

  try {
    // Get existing assignments for the student
    const existingAssignments =
      await database.listDocuments<ShiftAssignmentDocument>(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
        [
          Query.equal("studentId", [studentId]),
          Query.equal("status", ["assigned", "confirmed"]),
        ]
      );

    if (existingAssignments.documents.length === 0) {
      return { isValid: true };
    }

    // Get shifts for these assignments
    const assignedShiftIds = existingAssignments.documents.map(
      (a) => a.shiftId
    );
    const assignedShifts = await database.listDocuments<ShiftDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [Query.equal("shiftId", assignedShiftIds)]
    );

    // Check for same-day conflicts
    const shiftDate = parseISO(shift.date);
    const hasConflict = assignedShifts.documents.some((existingShift) => {
      return isSameDay(parseISO(existingShift.date), shiftDate);
    });

    if (hasConflict) {
      return {
        isValid: false,
        error: "Student already has a shift assigned for this day",
      };
    }

    // Check for adequate rest period (10 hours)
    const shiftStart = parseISO(shift.startTime);
    const shiftEnd = parseISO(shift.stopTime);

    const restViolation = assignedShifts.documents.some((existingShift) => {
      const existingStart = parseISO(existingShift.startTime);
      const existingEnd = parseISO(existingShift.stopTime);

      const hoursBetween =
        Math.abs(shiftStart.getTime() - existingEnd.getTime()) /
        (1000 * 60 * 60);
      const hoursBeforeExisting =
        Math.abs(existingStart.getTime() - shiftEnd.getTime()) /
        (1000 * 60 * 60);

      return hoursBetween < 10 || hoursBeforeExisting < 10;
    });

    if (restViolation) {
      return {
        isValid: false,
        error: "Assignment violates 10-hour rest period requirement",
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error("Error validating booking conflicts:", error);
    return {
      isValid: false,
      error: "Failed to validate booking conflicts",
    };
  }
}

export interface SelectedDaysStats {
  totalRequests: number;
  assignedCount: {
    day: number;
    night: number;
  };
  demand: {
    day: number;
    night: number;
  };
}


export async function getSelectedDaysStats(
  projectId: string,
  selectedDays: string[],
  dateRange?: OptionalDateRange
): Promise<SelectedDaysStats> {
  const { database } = await createAdminClient();

  try {
    // Get active project members (for total requests)
    const members = await database.listDocuments<ProjectMemberDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal("projectId", [projectId]),
        Query.equal("membershipType", ["student"]),
        Query.equal("status", ["active"]),
      ]
    );

    // Get all shifts within date range
    let shiftQueries = [
      Query.equal("projectId", [projectId]),
      Query.equal("status", ["published", "inProgress"]),
    ];

    if (dateRange?.from && dateRange?.to) {
      shiftQueries.push(
        Query.greaterThanEqual("date", startOfDay(dateRange.from).toISOString()),
        Query.lessThanEqual("date", endOfDay(dateRange.to).toISOString())
      );
    }

    const shifts = await database.listDocuments<ShiftDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftQueries
    );

    console.log("Total shifts fetched:", shifts.documents.length);

    // Helper function to normalize day names for comparison
    const normalizeDayForComparison = (day: string): string => {
      return day.toLowerCase().charAt(0).toUpperCase() + day.toLowerCase().slice(1, 3);
    };

    // Group shifts by day of week and type
    const shiftsByDay = shifts.documents.reduce((acc, shift) => {
      const normalizedDay = normalizeDayForComparison(shift.dayOfWeek);
      
      if (!acc[normalizedDay]) {
        acc[normalizedDay] = {
          day: { required: 0, assigned: 0 },
          night: { required: 0, assigned: 0 }
        };
      }

      if (shift.timeType === "day") {
        acc[normalizedDay].day.required += shift.requiredStudents;
        acc[normalizedDay].day.assigned += shift.assignedCount;
      } else {
        acc[normalizedDay].night.required += shift.requiredStudents;
        acc[normalizedDay].night.assigned += shift.assignedCount;
      }

      return acc;
    }, {} as Record<string, {
      day: { required: number; assigned: number; };
      night: { required: number; assigned: number; };
    }>);

    console.log("Shifts grouped by day:", shiftsByDay);

    // Calculate totals for selected days only
    const selectedDaysStats = selectedDays.reduce(
      (acc, day) => {
        if (shiftsByDay[day]) {
          acc.demand.day += shiftsByDay[day].day.required;
          acc.demand.night += shiftsByDay[day].night.required;
          acc.assignedCount.day += shiftsByDay[day].day.assigned;
          acc.assignedCount.night += shiftsByDay[day].night.assigned;
        }
        return acc;
      },
      {
        totalRequests: members.documents.length,
        assignedCount: { day: 0, night: 0 },
        demand: { day: 0, night: 0 },
      }
    );

    console.log("Final stats for selected days:", selectedDaysStats);
    return selectedDaysStats;

  } catch (error) {
    console.error("Error getting selected days stats:", error);
    return {
      totalRequests: 0,
      assignedCount: { day: 0, night: 0 },
      demand: { day: 0, night: 0 },
    };
  }
}

// Helper function to get booked days
function getBookedDays(
  assignments: ShiftAssignmentDocument[],
  timeType: "day" | "night"
): string[] {
  return Array.from(new Set(
    assignments
      .filter(a => a.timeType === timeType)
      .map(a => normalizeDayName(a.dayOfWeek))
  ));
}
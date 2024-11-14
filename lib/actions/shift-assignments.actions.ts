// lib/actions/shift-assignments.actions.ts

"use server";

import { ID, Query, Models } from "node-appwrite";
import { sendProjectAssignmentEmail } from "@/lib/emails";
import { startOfWeek, endOfWeek, addDays, subDays } from "date-fns";
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

interface NoShiftMarkingResult {
  success: boolean;
  error?: string;
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
function normalizeDayName(day: string): string {
  return (
    day.toLowerCase().charAt(0).toUpperCase() + day.toLowerCase().slice(1, 3)
  );
}

// Helper function to get available dates for a specific day within a date range
export async function getAvailableDatesForDay(
  dayOfWeek: string,
  startDate: Date,
  endDate: Date,
  timeType: "day" | "night"
): Promise<string[]> {
  const dates: string[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (format(currentDate, "EEE") === dayOfWeek) {
      dates.push(format(currentDate, "yyyy-MM-dd"));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

// Helper function to get default date range (current week)
function getDefaultDateRange(): DateRange {
  const now = new Date();
  return {
    from: startOfWeek(now, { weekStartsOn: 1 }), // Start from Monday
    to: endOfWeek(now, { weekStartsOn: 1 }), // End on Sunday
  };
}

// New function to mark no-shift dates
export async function markNoShiftDates(
  projectId: string,
  studentId: string,
  dates: string[]
): Promise<NoShiftMarkingResult> {
  const { database } = await createAdminClient();

  try {
    // Get project member ID for the student
    const projectMember = await database.listDocuments<ProjectMemberDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal("projectId", [projectId]),
        Query.equal("userId", [studentId]),
        Query.equal("status", ["active"]),
      ]
    );

    if (projectMember.documents.length === 0) {
      return {
        success: false,
        error: "Student is not an active member of this project",
      };
    }

    // Get user's availability records
    const userAvailability =
      await database.listDocuments<UserAvailabilityDocument>(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
        [
          Query.equal("userId", [studentId]),
          Query.equal("status", ["active"]),
          Query.equal("age", ["new"]),
        ]
      );

    // Create batch of no-shift date records
    const noShiftRecords = [];
    const now = new Date().toISOString();

    for (const date of dates) {
      // Find matching availability record for this date
      const dateObj = new Date(date);
      const dayOfWeek = format(dateObj, "EEEE"); // Get full day name

      // Create records for both day and night if available
      for (const avail of userAvailability.documents) {
        if (avail.dayOfWeek === dayOfWeek) {
          const noShiftDateId = ID.unique();
          noShiftRecords.push({
            noShiftDateId,
            projectId,
            studentId,
            membershipId: projectMember.documents[0].memberId,
            date,
            dayOfWeek,
            timeType: avail.timeType,
            createdBy: studentId, // Using studentId as logged-in user ID
            createdAt: now,
          });
        }
      }
    }

    // Create all no-shift date records
    await Promise.all(
      noShiftRecords.map((record) =>
        database.createDocument(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_NO_SHIFT_DATES_COLLECTION_ID!,
          record.noShiftDateId,
          record
        )
      )
    );

    return { success: true };
  } catch (error) {
    console.error("Error marking no-shift dates:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark no-shift dates",
    };
  }
}

// Add helper function to get no-shift dates with buffer
export async function getNoShiftDatesInRange(
  studentId: string,
  dateRange: OptionalDateRange,
  createdBy: string
): Promise<string[]> {
  const { database } = await createAdminClient();

  try {
    // Use current week if no date range provided
    const effectiveRange = dateRange?.from && dateRange?.to
      ? { from: dateRange.from, to: dateRange.to }
      : getDefaultDateRange();

    // Now we know effectiveRange has both from and to as Dates
    const bufferStart = subDays(effectiveRange.from, 2);
    const bufferEnd = addDays(effectiveRange.to, 2);

    // Query no-shift dates
    const noShiftDates = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_NO_SHIFT_DATES_COLLECTION_ID!,
      [
        Query.equal("studentId", [studentId]),
        Query.equal("createdBy", [createdBy]),
        Query.greaterThanEqual("createdAt", bufferStart.toISOString()),
        Query.lessThanEqual("createdAt", bufferEnd.toISOString()),
      ]
    );

    return Array.from(new Set(noShiftDates.documents.map((doc) => doc.date)));
  } catch (error) {
    console.error("Error getting no-shift dates:", error);
    return [];
  }
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
    const userAvailability =
      await database.listDocuments<UserAvailabilityDocument>(
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
      Query.equal("shiftType", ["normal"]),
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
}

interface ShiftAssignmentDocument extends Models.Document {
  $id: string;
  assignmentId: string;
  shiftId: string;
  studentId: string;
  status: "pending" | "assigned" | "confirmed" | "completed" | "cancelled";
  noshiftDates?: string[];
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
    // Use current week if no date range provided and ensure proper typing
    const effectiveRange: DateRange = dateRange?.from && dateRange?.to
      ? { from: dateRange.from, to: dateRange.to }
      : getDefaultDateRange();

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

    // Get shifts within effective range
    const shiftQueries = [
      Query.equal("projectId", [projectId]),
      Query.equal("status", ["published", "inProgress"]),
      Query.greaterThanEqual("date", effectiveRange.from.toISOString()),
      Query.lessThanEqual("date", effectiveRange.to.toISOString())
    ];

    const shifts = await database.listDocuments<ShiftDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftQueries
    );

    // Calculate stats
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

// Modified getUserAvailabilities function to ensure consistent data formatting
export async function getUserAvailabilities(
  projectId: string,
  dateRange?: OptionalDateRange
): Promise<UserAvailability[]> {
  const { database } = await createAdminClient();

  try {
    console.log("Fetching availabilities with range:", dateRange);

    // Use current week if no date range provided
    const effectiveRange: DateRange = dateRange?.from && dateRange?.to
      ? { from: dateRange.from, to: dateRange.to }
      : getDefaultDateRange();

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

    if (members.documents.length === 0) return [];

    const availabilities = [];

    for (const member of members.documents) {
      // Get student details
      const studentDetails = await database.listDocuments<StudentDocument>(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
        [Query.equal("userId", [member.userId])]
      );

      if (studentDetails.documents.length === 0) continue;

      const student = studentDetails.documents[0];

      // Get user's availability
      const userAvailability = await database.listDocuments<UserAvailabilityDocument>(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
        [
          Query.equal("userId", [member.userId]),
          Query.equal("status", ["active"]),
          Query.equal("age", ["new"]),
        ]
      );

      // If no availability records, skip user
      if (userAvailability.documents.length === 0) continue;

      // Get no-shift dates for this user
      const noShiftDates = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_NO_SHIFT_DATES_COLLECTION_ID!,
        [
          Query.equal("studentId", [member.userId]),
          Query.equal("projectId", [projectId])
        ]
      );

      // Create a map of day and timeType for no-shift dates
      const noShiftDayTypeMap = new Map<string, Set<string>>();
      noShiftDates.documents.forEach(doc => {
        const key = `${doc.dayOfWeek}-${doc.timeType}`;
        if (!noShiftDayTypeMap.has(key)) {
          noShiftDayTypeMap.set(key, new Set());
        }
        noShiftDayTypeMap.get(key)?.add(doc.date);
      });

      // Check user's available days against no-shift dates
      const userAvailableDays = userAvailability.documents.map(avail => 
        `${avail.dayOfWeek}-${avail.timeType}`
      );

      // Check if ALL available day-timeType combinations are marked as no-shift
      const hasAllDaysMarkedNoShift = userAvailableDays.every(dayType => 
        noShiftDayTypeMap.has(dayType)
      );

      // If all available days are marked as no-shift, skip this user
      if (hasAllDaysMarkedNoShift) {
        console.log(`Skipping user ${student.firstName} - all availability marked as no-shift`);
        continue;
      }

      // Get available shifts
      const availableShifts = await getAvailableShiftDays(
        projectId,
        member.userId,
        effectiveRange
      );

      // Filter out shifts that fall on no-shift dates
      const filteredShifts = availableShifts.filter(shift => {
        const key = `${shift.dayOfWeek}-${shift.timeType}`;
        const noShiftDates = noShiftDayTypeMap.get(key);
        return !noShiftDates?.has(format(new Date(shift.date), "yyyy-MM-dd"));
      });

      // Process requested days (only include days not marked as no-shift)
      const requestedDays = {
        day: Array.from(
          new Set(
            userAvailability.documents
              .filter((a) => {
                const key = `${a.dayOfWeek}-day`;
                return a.timeType === "day" && !noShiftDayTypeMap.has(key);
              })
              .map((a) => normalizeDayName(a.dayOfWeek))
          )
        ),
        night: Array.from(
          new Set(
            userAvailability.documents
              .filter((a) => {
                const key = `${a.dayOfWeek}-night`;
                return a.timeType === "night" && !noShiftDayTypeMap.has(key);
              })
              .map((a) => normalizeDayName(a.dayOfWeek))
          )
        ),
      };

      // Get assignments and process booked days
      let bookedDays: { day: string[]; night: string[] } = {
        day: [],
        night: []
      };
      
      const assignments = await database.listDocuments<ShiftAssignmentDocument>(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
        [
          Query.equal("studentId", [member.userId]),
          Query.equal("status", ["assigned", "confirmed"]),
        ]
      );

      if (assignments.documents.length > 0) {
        const assignedShiftIds = assignments.documents.map((a) => a.shiftId);
        const assignedShifts = await database.listDocuments<ShiftDocument>(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
          [
            Query.equal("shiftId", assignedShiftIds),
            Query.greaterThanEqual("date", startOfDay(effectiveRange.from).toISOString()),
            Query.lessThanEqual("date", endOfDay(effectiveRange.to).toISOString()),
          ]
        );

        bookedDays = {
          day: Array.from(
            new Set(
              assignedShifts.documents
                .filter((s) => s.timeType === "day")
                .map((s) => normalizeDayName(s.dayOfWeek))
            )
          ),
          night: Array.from(
            new Set(
              assignedShifts.documents
                .filter((s) => s.timeType === "night")
                .map((s) => normalizeDayName(s.dayOfWeek))
            )
          ),
        };
      }

      // Always include user in availabilities, even if they have no shifts currently available
      availabilities.push({
        userId: member.userId,
        name: `${student.firstName} ${student.lastName}`,
        punctualityScore: student.punctualityScore || 100,
        rating: student.rating || 5.0,
        requestedDays,
        bookedDays,
        availableShifts: filteredShifts.map((shift) => ({
          ...shift,
          dayOfWeek: normalizeDayName(shift.dayOfWeek),
        })),
      });
    }

    console.log("Final processed availabilities:", availabilities);
    return availabilities;
  } catch (error) {
    console.error("Error getting user availabilities:", error);
    return [];
  }
}

// Add this helper function for date formatting
function formatDateTime(dateTimeString: string): string {
  const date = new Date(dateTimeString);
  
  // Format date as DD-MM-YYYY
  const dateStr = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Format time as HH:MM with AM/PM
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return `${dateStr} (${timeStr})`;
}

// Update the createShiftAssignment function
export async function createShiftAssignment(
  projectId: string,
  studentId: string,
  shiftId: string,
  workerData?: UserAvailability
): Promise<AssignmentCreationResult> {
  const { database } = await createAdminClient();

  try {
    // Get the shift details
    const shift = await database.getDocument<ShiftDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftId
    );

    // Normalize the shift day (which is in lowercase) to match our format (Mon, Tue, etc)
    const normalizedShiftDay = normalizeDayName(shift.dayOfWeek);

    // If worker data was passed, use it for validation
    if (workerData) {
      // 1. Check if user requested/is available for this day and shift type
      const isRequested =
        shift.timeType === "day"
          ? workerData.requestedDays.day.includes(normalizedShiftDay)
          : workerData.requestedDays.night.includes(normalizedShiftDay);

      if (!isRequested) {
        return {
          success: false,
          error: `Student is not available for ${normalizedShiftDay} ${shift.timeType} shifts`,
        };
      }

      // 2. Check if user already has a booking on this day
      const hasBooking =
        shift.timeType === "day"
          ? workerData.bookedDays.day.includes(normalizedShiftDay)
          : workerData.bookedDays.night.includes(normalizedShiftDay);

      if (hasBooking) {
        return {
          success: false,
          error: `Student already has a ${shift.timeType} shift booked on ${normalizedShiftDay}`,
        };
      }
    }

    // 3. Get project member ID for the assignment
    const projectMember = await database.listDocuments<ProjectMemberDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal("projectId", [projectId]),
        Query.equal("userId", [studentId]),
        Query.equal("status", ["active"]),
      ]
    );

    if (projectMember.documents.length === 0) {
      return {
        success: false,
        error: "Student is not an active member of this project",
      };
    }

    // Get student details for email
    const studentDetails = await database.listDocuments<StudentDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      [Query.equal("userId", [studentId])]
    );

    if (studentDetails.documents.length === 0) {
      return {
        success: false,
        error: "Student details not found",
      };
    }

    const student = studentDetails.documents[0];

    // Get project details for email
    const project = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      projectId
    );

    // Create the assignment
    const assignmentId = ID.unique();
    const now = new Date().toISOString();

    const assignmentData = {
      assignmentId,
      shiftId: shift.shiftId,
      studentId,
      projectMemberId: projectMember.documents[0].memberId,
      status: "assigned" as const,
      assignedBy: "system",
      assignedAt: now,
      confirmedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const assignment = await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      assignmentId,
      assignmentData
    );

    // Update shift assigned count
    await database.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shift.$id,
      {
        assignedCount: shift.assignedCount + 1,
        updatedAt: now,
      }
    );

    // Send email notification
    try {
      await sendProjectAssignmentEmail({
        studentName: `${student.firstName} ${student.lastName}`,
        studentEmail: student.email, // Make sure this field exists in StudentDocument
        projectName: project.name,
        startTime: formatDateTime(shift.startTime),
        endTime: formatDateTime(shift.stopTime),
      });
    } catch (emailError) {
      console.error("Failed to send assignment email:", emailError);
      // Continue with the assignment creation even if email fails
    }

    return {
      success: true,
      isExtra: shift.assignedCount >= shift.requiredStudents,
      assignmentDetails: assignment as ShiftAssignmentDocument,
    };
  } catch (error) {
    console.error("Error creating shift assignment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create assignment",
    };
  }
}

//===========================================================================
// POTENTIALLY USELESS FUNCTIONS
//===========================================================================

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
    // Use current week if no date range provided and ensure proper typing
    const effectiveRange: DateRange = dateRange?.from && dateRange?.to
      ? { from: dateRange.from, to: dateRange.to }
      : getDefaultDateRange();

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
     const shiftQueries = [
      Query.equal("projectId", [projectId]),
      Query.equal("status", ["published", "inProgress"]),
      Query.greaterThanEqual("date", effectiveRange.from.toISOString()),
      Query.lessThanEqual("date", effectiveRange.to.toISOString())
    ];

    const shifts = await database.listDocuments<ShiftDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftQueries
    );

    console.log("Total shifts fetched:", shifts.documents.length);

    // Helper function to normalize day names for comparison
    const normalizeDayForComparison = (day: string): string => {
      return (
        day.toLowerCase().charAt(0).toUpperCase() +
        day.toLowerCase().slice(1, 3)
      );
    };

    // Group shifts by day of week and type
    const shiftsByDay = shifts.documents.reduce(
      (acc, shift) => {
        const normalizedDay = normalizeDayForComparison(shift.dayOfWeek);

        if (!acc[normalizedDay]) {
          acc[normalizedDay] = {
            day: { required: 0, assigned: 0 },
            night: { required: 0, assigned: 0 },
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
      },
      {} as Record<
        string,
        {
          day: { required: number; assigned: number };
          night: { required: number; assigned: number };
        }
      >
    );

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

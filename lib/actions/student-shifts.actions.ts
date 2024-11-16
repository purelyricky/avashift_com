// lib/actions/student-shifts.actions.ts

"use server";

import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/actions/appwrite";
import { ID } from "node-appwrite";
import { sendCancellationRequestEmail, sendFillerShiftApplicationEmail } from "../emails";

// Type Definitions
interface ShiftWithDetails {
  shiftId: string;
  projectId: string;
  projectName: string;
  date: string;
  startTime: string;
  stopTime: string;
  status: "notStarted" | "clockedIn" | "completed";
  actualStart: string | null;
  actualStop: string | null;
  leaderName: string;
  attendanceId?: string;
  verificationCode?: string;
  isVerified?: boolean;
}

// Helper function to format datetime
function formatTime(dateTimeStr: string): string {
  return new Date(dateTimeStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
// Helper function to format date to YYYY-MM-DD
function formatDate(dateStr: string): string {
  return new Date(dateStr).toISOString().split("T")[0];
}

// Generate a unique 4-character code
function generateQRCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Get today's shifts for the logged-in student
export async function getTodayShifts(
  studentId: string
): Promise<ShiftWithDetails[]> {
  const { database } = await createAdminClient();

  try {
    // Get today's start and end in ISO format with time
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get student's assignments first
    const assignments = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [
        Query.equal("studentId", [studentId]),
        Query.equal("status", ["assigned", "confirmed"]),
      ]
    );

    if (assignments.documents.length === 0) return [];
    const shiftIds = assignments.documents.map((a) => a.shiftId);

    // Get shifts that are assigned to the student and are today
    const shifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal("shiftId", shiftIds),
        Query.equal("status", "published"),
        Query.greaterThanEqual("date", todayStart.toISOString()),
        Query.lessThanEqual("date", todayEnd.toISOString()),
      ]
    );

    if (shifts.documents.length === 0) return [];

    // Get attendance records to check clock in/out status
    const attendance = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      [Query.equal("shiftId", shiftIds), Query.equal("studentId", studentId)]
    );

    // Filter shifts based on attendance status only (date filtering is now done at DB level)
    const relevantShifts = shifts.documents.filter((shift) => {
      const attendanceRecord = attendance.documents.find(
        (a) => a.shiftId === shift.shiftId
      );

      return (
        // Include today's shifts without clock out
        !attendanceRecord?.clockOutTime ||
        // Include any shift with clock in but no clock out (regardless of date)
        (attendanceRecord?.clockInTime && !attendanceRecord?.clockOutTime)
      );
    });

    if (relevantShifts.length === 0) return [];

    // Get additional data needed for display
    const projects = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      [
        Query.equal(
          "projectId",
          relevantShifts.map((s) => s.projectId)
        ),
      ]
    );

    const leaderIds = relevantShifts.map((s) => s.shiftLeaderId);
    const leaders =
      leaderIds.length > 0
        ? await database.listDocuments(
            process.env.APPWRITE_DATABASE_ID!,
            process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
            [Query.equal("userId", leaderIds)]
          )
        : { documents: [] };

    // Process and return the filtered shifts
    return relevantShifts.map((shift) => {
      const project = projects.documents.find(
        (p) => p.projectId === shift.projectId
      );
      const leader = leaders.documents.find(
        (l) => l.userId === shift.shiftLeaderId
      );
      const attendanceRecord = attendance.documents.find(
        (a) => a.shiftId === shift.shiftId
      );

      let status: "notStarted" | "clockedIn" | "completed" = "notStarted";
      if (attendanceRecord?.clockInTime && !attendanceRecord?.clockOutTime) {
        status = "clockedIn";
      } else if (attendanceRecord?.clockOutTime) {
        status = "completed";
      }

      return {
        shiftId: shift.shiftId,
        projectId: shift.projectId,
        projectName: project?.name || "Unknown Project",
        date: shift.date.split("T")[0],
        startTime: formatTime(shift.startTime),
        stopTime: formatTime(shift.stopTime),
        status,
        actualStart: attendanceRecord?.clockInTime
          ? formatTime(attendanceRecord.clockInTime)
          : null,
        actualStop: attendanceRecord?.clockOutTime
          ? formatTime(attendanceRecord.clockOutTime)
          : null,
        leaderName: leader
          ? `${leader.firstName} ${leader.lastName}`
          : "Unknown Leader",
        attendanceId: attendanceRecord?.$id,
        verificationCode: attendanceRecord?.verificationCode,
        isVerified: attendanceRecord?.isVerified,
      };
    });
  } catch (error) {
    console.error("Error fetching today's shifts:", error);
    return [];
  }
}

// Get upcoming shifts
export async function getUpcomingShifts(
  studentId: string
): Promise<ShiftWithDetails[]> {
  const { database } = await createAdminClient();

  try {
    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    // Get assignments for the student
    const assignments = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [
        Query.equal("studentId", [studentId]),
        Query.equal("status", ["assigned", "confirmed"]),
      ]
    );

    if (assignments.documents.length === 0) return [];

    // Get shifts with proper timestamp handling
    const shiftIds = assignments.documents.map((a) => a.shiftId);
    const shifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal("shiftId", shiftIds),
        Query.greaterThanEqual("date", tomorrowStart.toISOString()),
      ]
    );

    // Get projects and leaders data
    const projectIds = Array.from(
      new Set(shifts.documents.map((s) => s.projectId))
    );
    const projects = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      [Query.equal("projectId", projectIds)]
    );

    const leaderIds = Array.from(
      new Set(shifts.documents.map((s) => s.shiftLeaderId))
    );
    const leaders = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
      [Query.equal("userId", leaderIds)]
    );

    return shifts.documents.map((shift) => ({
      shiftId: shift.shiftId,
      projectId: shift.projectId,
      projectName:
        projects.documents.find((p) => p.projectId === shift.projectId)?.name ||
        "Unknown Project",
      date: formatDate(shift.date),
      startTime: formatTime(shift.startTime),
      stopTime: formatTime(shift.stopTime),
      status: "notStarted",
      actualStart: null,
      actualStop: null,
      leaderName: (() => {
        const leader = leaders.documents.find(
          (l) => l.userId === shift.shiftLeaderId
        );
        return leader
          ? `${leader.firstName} ${leader.lastName}`
          : "Unknown Leader";
      })(),
    }));
  } catch (error) {
    console.error("Error fetching upcoming shifts:", error);
    return [];
  }
}

// Get completed shifts
export async function getCompletedShifts(
  studentId: string
): Promise<ShiftWithDetails[]> {
  const { database } = await createAdminClient();

  try {
    // Use proper timestamp for date comparisons
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get completed assignments
    const assignments = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [
        Query.equal("studentId", [studentId]),
        Query.equal("status", ["completed"]),
      ]
    );

    if (assignments.documents.length === 0) return [];

    // Get corresponding shifts and other data
    const shiftIds = assignments.documents.map((a) => a.shiftId);

    const [shifts, attendance] = await Promise.all([
      database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
        [
          Query.equal("shiftId", shiftIds),
          Query.greaterThanEqual("date", sevenDaysAgo.toISOString()),
          Query.lessThanEqual("date", todayEnd.toISOString()),
        ]
      ),
      database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
        [
          Query.equal("shiftId", shiftIds),
          Query.equal("studentId", [studentId]),
        ]
      ),
    ]);

    // Get projects and leaders data
    const projectIds = Array.from(
      new Set(shifts.documents.map((s) => s.projectId))
    );
    const leaderIds = Array.from(
      new Set(shifts.documents.map((s) => s.shiftLeaderId))
    );

    const [projects, leaders] = await Promise.all([
      database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
        [Query.equal("projectId", projectIds)]
      ),
      database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
        [Query.equal("userId", leaderIds)]
      ),
    ]);

    return shifts.documents.map((shift) => {
      const attendanceRecord = attendance.documents.find(
        (a) => a.shiftId === shift.shiftId
      );
      const project = projects.documents.find(
        (p) => p.projectId === shift.projectId
      );
      const leader = leaders.documents.find(
        (l) => l.userId === shift.shiftLeaderId
      );

      return {
        shiftId: shift.shiftId,
        projectId: shift.projectId,
        projectName: project?.name || "Unknown Project",
        date: formatDate(shift.date),
        startTime: formatTime(shift.startTime),
        stopTime: formatTime(shift.stopTime),
        status: "completed",
        actualStart: attendanceRecord?.clockInTime
          ? formatTime(attendanceRecord.clockInTime)
          : null,
        actualStop: attendanceRecord?.clockOutTime
          ? formatTime(attendanceRecord.clockOutTime)
          : null,
        leaderName: leader
          ? `${leader.firstName} ${leader.lastName}`
          : "Unknown Leader",
      };
    });
  } catch (error) {
    console.error("Error fetching completed shifts:", error);
    return [];
  }
}

// Get available filler shifts
export async function getFillerShifts(
  studentId: string
): Promise<ShiftWithDetails[]> {
  const { database } = await createAdminClient();

  try {
    // 1. Get student's project memberships
    const memberships = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal("userId", [studentId]),
        Query.equal("membershipType", ["student"]),
        Query.equal("status", ["active"]),
      ]
    );

    if (memberships.documents.length === 0) return [];

    const projectIds = memberships.documents.map((m) => m.projectId);

    // 2. Get all filler shifts from student's projects
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // First get all published filler shifts
    const shifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal("projectId", projectIds),
        Query.equal("shiftType", ["filler"]),
        Query.equal("status", ["published"]),
        Query.greaterThanEqual("date", today.toISOString()),
      ]
    );

    if (shifts.documents.length === 0) return [];

    // Filter shifts where assignedCount < requiredStudents in memory
    const availableShifts = shifts.documents.filter(
      (shift) =>
        parseInt(shift.assignedCount) < parseInt(shift.requiredStudents)
    );

    if (availableShifts.length === 0) return [];

    // 3. Filter out shifts that student has already applied for
    const existingApplications = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      [
        Query.equal("requestType", ["fillerShiftApplication"]),
        Query.equal("requesterId", [studentId]),
        Query.equal("status", ["pending", "approved"]),
        Query.equal(
          "shiftId",
          availableShifts.map((s) => s.shiftId)
        ),
      ]
    );

    const appliedShiftIds = new Set(
      existingApplications.documents.map((a) => a.shiftId)
    );
    const finalShifts = availableShifts.filter(
      (shift) => !appliedShiftIds.has(shift.shiftId)
    );

    if (finalShifts.length === 0) return [];

    // 4. Get additional data for display
    const [projects, leaders] = await Promise.all([
      database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
        [
          Query.equal(
            "projectId",
            finalShifts.map((s) => s.projectId)
          ),
        ]
      ),
      database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
        [
          Query.equal(
            "userId",
            finalShifts.map((s) => s.shiftLeaderId)
          ),
        ]
      ),
    ]);

    // 5. Format and return the shifts
    return finalShifts.map((shift) => ({
      shiftId: shift.shiftId,
      projectId: shift.projectId,
      projectName:
        projects.documents.find((p) => p.projectId === shift.projectId)?.name ||
        "Unknown Project",
      date: formatDate(shift.date),
      startTime: formatTime(shift.startTime),
      stopTime: formatTime(shift.stopTime),
      status: "notStarted" as const,
      actualStart: null,
      actualStop: null,
      leaderName: (() => {
        const leader = leaders.documents.find(
          (l) => l.userId === shift.shiftLeaderId
        );
        return leader
          ? `${leader.firstName} ${leader.lastName}`
          : "Unknown Leader";
      })(),
    }));
  } catch (error) {
    console.error("Error fetching filler shifts:", error);
    return [];
  }
}

// Helper function to generate a unique 4-character code
function generateVerificationCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Handle clock in
// Handle clock in
export async function handleClockIn(
  studentId: string,
  shiftId: string
): Promise<{
  success: boolean;
  verificationCode?: string;
  message?: string;
}> {
  const { database } = await createAdminClient();

  try {
    // Check for any existing unverified codes
    const existingCodes = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_VERIFICATION_CODES_COLLECTION_ID!,
      [
        Query.equal("studentId", [studentId]),
        Query.equal("shiftId", [shiftId]),
        Query.equal("status", "active"),
        Query.equal("isRead", false),
      ]
    );

    // If there's an existing unverified code, return it
    if (existingCodes.documents.length > 0) {
      return {
        success: true,
        verificationCode: existingCodes.documents[0].code,
      };
    }

    // If no existing code, create new one
    const code = generateVerificationCode();
    const codeId = ID.unique();

    await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_VERIFICATION_CODES_COLLECTION_ID!,
      codeId,
      {
        codeId,
        code,
        studentId,
        shiftId,
        isRead: false,
        status: "active",
        createdAt: new Date().toISOString(),
        verifiedAt: null,
        verifiedBy: null,
      }
    );

    return {
      success: true,
      verificationCode: code,
    };
  } catch (error) {
    console.error("Error handling clock in:", error);
    return {
      success: false,
      message: "Failed to initiate clock in process",
    };
  }
}
// Check if verification code has been verified
export async function checkVerificationStatus(
  studentId: string,
  shiftId: string
): Promise<{
  isVerified: boolean;
  message?: string;
}> {
  const { database } = await createAdminClient();

  try {
    const verificationCodes = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_VERIFICATION_CODES_COLLECTION_ID!,
      [
        Query.equal("studentId", [studentId]),
        Query.equal("shiftId", [shiftId]),
        Query.equal("status", ["active", "used"]),
        Query.orderDesc("createdAt"),
        Query.limit(1),
      ]
    );

    if (verificationCodes.documents.length === 0) {
      return {
        isVerified: false,
        message: "No active verification code found",
      };
    }

    const isRead = verificationCodes.documents[0].isRead;

    return {
      isVerified: isRead,
      message: isRead
        ? "Verification code has been verified"
        : "Waiting for verification",
    };
  } catch (error) {
    console.error("Error checking verification status:", error);
    return {
      isVerified: false,
      message: "Failed to check verification status",
    };
  }
}

// Handle clock out
export async function handleClockOut(
  studentId: string,
  shiftId: string
): Promise<{
  success: boolean;
  message?: string;
}> {
  const { database } = await createAdminClient();

  try {
    // Update attendance with clock out time
    const attendance = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      [Query.equal("studentId", [studentId]), Query.equal("shiftId", [shiftId])]
    );

    if (attendance.documents.length > 0) {
      await database.updateDocument(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
        attendance.documents[0].$id,
        {
          clockOutTime: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
    }

    // Update shift assignment status to completed
    const assignment = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [Query.equal("studentId", [studentId]), Query.equal("shiftId", [shiftId])]
    );

    if (assignment.documents.length > 0) {
      await database.updateDocument(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
        assignment.documents[0].$id,
        {
          status: "completed",
          updatedAt: new Date().toISOString(),
        }
      );
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error handling clock out:", error);
    return {
      success: false,
      message: "Failed to process clock out",
    };
  }
}

//==============================================================
// Cancel shift
//==============================================================

interface CancellationRequest {
  shiftId: string;
  studentId: string;
  reason: string;
  replacementEmail?: string;
}

// Helper function to get shift assignment
async function getShiftAssignment(shiftId: string, studentId: string) {
  const { database } = await createAdminClient();

  const assignments = await database.listDocuments(
    process.env.APPWRITE_DATABASE_ID!,
    process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
    [
      Query.equal("shiftId", [shiftId]),
      Query.equal("studentId", [studentId]),
      Query.equal("status", ["assigned", "confirmed"]),
    ]
  );

  return assignments.documents[0] || null;
}

// Helper function to validate shift cancellation
async function validateCancellationRequest(
  shiftId: string,
  studentId: string
): Promise<{
  valid: boolean;
  message?: string;
}> {
  const { database } = await createAdminClient();

  try {
    // Check if shift exists and is in the future
    const shift = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftId
    );

    const shiftDate = new Date(shift.date);
    const now = new Date();

    if (shiftDate < now) {
      return {
        valid: false,
        message: "Cannot cancel past shifts",
      };
    }

    // Check if student is assigned to this shift
    const assignment = await getShiftAssignment(shiftId, studentId);
    if (!assignment) {
      return {
        valid: false,
        message: "You are not assigned to this shift",
      };
    }

    // Check if there's already a pending cancellation request
    const existingRequests = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      [
        Query.equal("requestType", ["shiftCancellation"]),
        Query.equal("shiftId", [shiftId]),
        Query.equal("requesterId", [studentId]),
        Query.equal("status", ["pending"]),
      ]
    );

    if (existingRequests.documents.length > 0) {
      return {
        valid: false,
        message:
          "You already have a pending cancellation request for this shift",
      };
    }

    return {
      valid: true,
    };
  } catch (error) {
    console.error("Error validating cancellation request:", error);
    return {
      valid: false,
      message: "Failed to validate cancellation request",
    };
  }
}

// Helper function to get shift assigning admin
async function getShiftAssigningAdmin(shiftId: string, studentId: string) {
  const { database } = await createAdminClient();
  
  try {
    console.log("Fetching shift assignment...");
    // Get the most recent assignment by sorting by createdAt in descending order
    const assignments = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [
        Query.equal("shiftId", [shiftId]),
        Query.equal("studentId", [studentId]),
        Query.equal("status", ["assigned", "confirmed"]),
        Query.orderDesc("createdAt"), // Get most recent first
        Query.limit(1) // Only get the most recent
      ]
    );

    console.log("Found assignment:", assignments.documents[0]);

    if (assignments.documents.length === 0) {
      console.log("No assignment found");
      return null;
    }

    const assignment = assignments.documents[0];
    
    // If assigned by system, get the project owner
    if (assignment.assignedBy === 'system') {
      console.log("System assignment, fetching project owner...");
      
      // First get the shift to get the projectId
      const shift = await database.getDocument(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
        shiftId
      );
      
      // Then get the project to get the ownerId
      const project = await database.getDocument(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
        shift.projectId
      );
      
      console.log("Project owner ID:", project.ownerId);
      
      // Check if owner is admin
      const admins = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_ADMINS_COLLECTION_ID!,
        [Query.equal("userId", [project.ownerId])]
      );
      
      if (admins.documents.length > 0) {
        console.log("Found admin owner:", admins.documents[0]);
        return admins.documents[0];
      }
      
      // If not admin, check if owner is client
      const clients = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_CLIENTS_COLLECTION_ID!,
        [Query.equal("userId", [project.ownerId])]
      );
      
      console.log("Found client owner:", clients.documents[0]);
      return clients.documents[0] || null;
    }
    
    // If not system, check regular assignedBy
    console.log("Checking assignedBy user:", assignment.assignedBy);
    
    // Check admins first
    const admins = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMINS_COLLECTION_ID!,
      [Query.equal("userId", [assignment.assignedBy])]
    );

    if (admins.documents.length > 0) {
      console.log("Found admin assignee:", admins.documents[0]);
      return admins.documents[0];
    }

    // If not admin, check clients
    const clients = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_CLIENTS_COLLECTION_ID!,
      [Query.equal("userId", [assignment.assignedBy])]
    );

    console.log("Found client assignee:", clients.documents[0]);
    return clients.documents[0] || null;

  } catch (error) {
    console.error("Error getting assigning admin:", error);
    return null;
  }
}

// Modify the createShiftCancellationRequest function to include email sending
export async function createShiftCancellationRequest({
  shiftId,
  studentId,
  reason,
  replacementEmail,
}: CancellationRequest): Promise<{
  success: boolean;
  message?: string;
  requestId?: string;
}> {
  const { database } = await createAdminClient();

  try {
    console.log("Starting cancellation request creation...");
    
    // Get shift details first
    console.log("Fetching shift details...");
    const shift = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftId
    );

    // Get project details
    console.log("Fetching project details...");
    const project = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      shift.projectId
    );

    // Get student details
    console.log("Fetching student details...");
    const students = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      [Query.equal("userId", [studentId])]
    );

    if (students.documents.length === 0) {
      throw new Error("Student not found");
    }

    const student = students.documents[0];
    
    // Get shift assignment
    console.log("Fetching shift assignment...");
    const assignment = await getShiftAssignment(shiftId, studentId);
    if (!assignment) {
      return {
        success: false,
        message: "No active assignment found for this shift",
      };
    }
    
    // Get assigning admin or client
    const assigningUser = await getShiftAssigningAdmin(shiftId, studentId);
    console.log("Retrieved assigning user:", assigningUser);

    if (assigningUser) {
      try {
        console.log("Sending cancellation request email...");
        await sendCancellationRequestEmail({
          adminName: `${assigningUser.firstName} ${assigningUser.lastName}`,
          adminEmail: assigningUser.email,
          requesterName: `${student.firstName} ${student.lastName}`,
          requesterRole: "student",
          projectName: project.name,
          shiftDate: formatDate(shift.date),
          shiftTime: shift.timeType === "day" ? "Day Shift" : "Night Shift",
          reason: reason
        });
        console.log("Cancellation request email sent successfully");
      } catch (emailError) {
        console.error("Error sending cancellation email:", emailError, {
          adminEmail: assigningUser.email,
          studentName: `${student.firstName} ${student.lastName}`,
          projectName: project.name,
          shiftDate: shift.date
        });
        // Continue with request creation even if email fails
      }
    } else {
      console.log("No assigning user (admin/client) found for shift assignment");
    }

    // Create the cancellation request
    const requestId = ID.unique();
    await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      requestId,
      {
        requestId,
        requestType: "shiftCancellation",
        requesterId: studentId,
        shiftId,
        assignmentId: assignment.assignmentId,
        reason,
        replacementEmail: replacementEmail || null,
        status: "pending",
        createdAt: new Date().toISOString(),
      }
    );

    return {
      success: true,
      requestId,
      message: "Cancellation request submitted successfully",
    };
  } catch (error) {
    console.error("Error creating shift cancellation request:", error);
    return {
      success: false,
      message: "Failed to submit cancellation request",
    };
  }
}

// Get student's cancellation requests
export async function getStudentCancellationRequests(
  studentId: string,
  status?: "pending" | "approved" | "rejected"
): Promise<
  Array<{
    requestId: string;
    shiftId: string;
    reason: string;
    status: string;
    createdAt: string;
    replacementEmail?: string;
  }>
> {
  const { database } = await createAdminClient();

  try {
    const queries = [
      Query.equal("requestType", ["shiftCancellation"]),
      Query.equal("requesterId", [studentId]),
    ];

    if (status) {
      queries.push(Query.equal("status", [status]));
    }

    const requests = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      queries
    );

    return requests.documents.map((doc) => ({
      requestId: doc.requestId,
      shiftId: doc.shiftId,
      reason: doc.reason,
      status: doc.status,
      createdAt: doc.createdAt,
      replacementEmail: doc.replacementEmail,
    }));
  } catch (error) {
    console.error("Error fetching cancellation requests:", error);
    return [];
  }
}

// Check cancellation request status
export async function checkCancellationRequestStatus(
  requestId: string,
  studentId: string
): Promise<{
  status: "pending" | "approved" | "rejected";
  message?: string;
}> {
  const { database } = await createAdminClient();

  try {
    const request = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      requestId
    );

    if (request.requesterId !== studentId) {
      throw new Error("Unauthorized access to request");
    }

    return {
      status: request.status,
      message:
        request.status === "rejected"
          ? "Your cancellation request was rejected"
          : request.status === "approved"
          ? "Your cancellation request was approved"
          : "Your cancellation request is pending review",
    };
  } catch (error) {
    console.error("Error checking cancellation request status:", error);
    return {
      status: "pending",
      message: "Failed to check request status",
    };
  }
}

//==============================================================
// Take filler shift
//==============================================================

// Helper function to check if student is already assigned to a shift at this time
async function checkShiftConflict(
  studentId: string,
  shiftDate: string,
  startTime: string,
  stopTime: string
) {
  const { database } = await createAdminClient();

  try {
    // Get all assignments for the student on the same date
    const assignments = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [
        Query.equal("studentId", [studentId]),
        Query.equal("status", ["assigned", "confirmed", "pending"]),
      ]
    );

    if (assignments.documents.length === 0) return false;

    // Get shifts for these assignments
    const assignedShifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal(
          "shiftId",
          assignments.documents.map((a) => a.shiftId)
        ),
        Query.equal("date", [shiftDate]),
      ]
    );

    // Check for time conflicts
    const newShiftStart = new Date(startTime);
    const newShiftEnd = new Date(stopTime);

    return assignedShifts.documents.some((shift) => {
      const existingStart = new Date(shift.startTime);
      const existingEnd = new Date(shift.stopTime);

      return (
        (newShiftStart >= existingStart && newShiftStart < existingEnd) ||
        (newShiftEnd > existingStart && newShiftEnd <= existingEnd) ||
        (newShiftStart <= existingStart && newShiftEnd >= existingEnd)
      );
    });
  } catch (error) {
    console.error("Error checking shift conflicts:", error);
    return true; // Return true on error to prevent assignment
  }
}

// Helper function to validate filler shift application
async function validateFillerShiftApplication(
  shiftId: string,
  studentId: string
): Promise<{
  valid: boolean;
  message?: string;
  shift?: any;
}> {
  const { database } = await createAdminClient();

  try {
    // Get shift details
    const shift = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftId
    );

    // Verify it's a filler shift
    if (shift.shiftType !== "filler") {
      return {
        valid: false,
        message: "This is not a filler shift",
      };
    }

    // Check if shift is in the future
    const shiftDate = new Date(shift.date);
    const now = new Date();
    if (shiftDate < now) {
      return {
        valid: false,
        message: "Cannot apply for past shifts",
      };
    }

    // Check if student is a member of the project
    const projectMembership = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal("projectId", [shift.projectId]),
        Query.equal("userId", [studentId]),
        Query.equal("membershipType", ["student"]),
        Query.equal("status", ["active"]),
      ]
    );

    if (projectMembership.documents.length === 0) {
      return {
        valid: false,
        message: "You are not a member of this project",
      };
    }

    // Check for time conflicts
    const hasConflict = await checkShiftConflict(
      studentId,
      shift.date,
      shift.startTime,
      shift.stopTime
    );

    if (hasConflict) {
      return {
        valid: false,
        message: "You already have a shift scheduled during this time",
      };
    }

    // Check if there's already a pending application
    const existingRequests = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      [
        Query.equal("requestType", ["fillerShiftApplication"]),
        Query.equal("shiftId", [shiftId]),
        Query.equal("requesterId", [studentId]),
        Query.equal("status", ["pending"]),
      ]
    );

    if (existingRequests.documents.length > 0) {
      return {
        valid: false,
        message: "You already have a pending application for this shift",
      };
    }

    return {
      valid: true,
      shift,
    };
  } catch (error) {
    console.error("Error validating filler shift application:", error);
    return {
      valid: false,
      message: "Failed to validate shift application",
    };
  }
}

// Helper function to get shift creator (admin/client)
async function getShiftCreator(shiftId: string) {
  const { database } = await createAdminClient();
  
  try {
    // Get shift details to get createdBy
    const shift = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftId
    );
    
    console.log("Shift creator ID:", shift.createdBy);
    
    // Check admins first
    const admins = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMINS_COLLECTION_ID!,
      [Query.equal("userId", [shift.createdBy])]
    );
    
    if (admins.documents.length > 0) {
      console.log("Found admin creator:", admins.documents[0]);
      return admins.documents[0];
    }
    
    // If not admin, check clients
    const clients = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_CLIENTS_COLLECTION_ID!,
      [Query.equal("userId", [shift.createdBy])]
    );
    
    console.log("Found client creator:", clients.documents[0]);
    return clients.documents[0] || null;
  } catch (error) {
    console.error("Error getting shift creator:", error);
    return null;
  }
}

// Modified applyForFillerShift function
export async function applyForFillerShift(
  shiftId: string,
  studentId: string
): Promise<{
  success: boolean;
  message?: string;
}> {
  const { database } = await createAdminClient();

  try {
    // First validate the application
    const validation = await validateFillerShiftApplication(shiftId, studentId);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message,
      };
    }

    const shift = validation.shift;

    // Get student details
    const students = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      [Query.equal("userId", [studentId])]
    );

    if (students.documents.length === 0) {
      throw new Error("Student not found");
    }
    const student = students.documents[0];

    // Get project details
    const project = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      shift.projectId
    );

    // Get shift creator (admin/client)
    const creator = await getShiftCreator(shiftId);
    console.log("Retrieved shift creator:", creator);

    if (creator) {
      try {
        console.log("Sending filler shift application email...");
        await sendFillerShiftApplicationEmail({
          adminName: `${creator.firstName} ${creator.lastName}`,
          adminEmail: creator.email,
          requesterName: `${student.firstName} ${student.lastName}`,
          requesterRole: "student",
          projectName: project.name,
          shiftDate: formatDate(shift.date),
          shiftTime: shift.timeType === "day" ? "Day Shift" : "Night Shift",
        });
        console.log("Filler shift application email sent successfully");
      } catch (emailError) {
        console.error("Error sending filler shift application email:", emailError);
        // Continue with request creation even if email fails
      }
    }

    // Create the application request
    const requestId = ID.unique();
    await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      requestId,
      {
        requestId,
        requestType: "fillerShiftApplication",
        requesterId: studentId,
        shiftId,
        status: "pending",
        createdAt: new Date().toISOString(),
      }
    );

    return {
      success: true,
      message: "Application submitted successfully",
    };
  } catch (error) {
    console.error("Error submitting filler shift application:", error);
    return {
      success: false,
      message: "Failed to submit application",
    };
  }
}

// Get student's filler shift applications
export async function getStudentFillerApplications(
  studentId: string,
  status?: "pending" | "approved" | "rejected"
): Promise<
  Array<{
    requestId: string;
    shiftId: string;
    status: string;
    createdAt: string;
    reason?: string;
  }>
> {
  const { database } = await createAdminClient();

  try {
    const queries = [
      Query.equal("requestType", ["fillerShiftApplication"]),
      Query.equal("requesterId", [studentId]),
    ];

    if (status) {
      queries.push(Query.equal("status", [status]));
    }

    const requests = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      queries
    );

    return requests.documents.map((doc) => ({
      requestId: doc.requestId,
      shiftId: doc.shiftId,
      status: doc.status,
      createdAt: doc.createdAt,
      reason: doc.reason,
    }));
  } catch (error) {
    console.error("Error fetching filler shift applications:", error);
    return [];
  }
}

// Check filler shift application status
export async function checkFillerApplicationStatus(
  requestId: string,
  studentId: string
): Promise<{
  status: "pending" | "approved" | "rejected";
  message?: string;
}> {
  const { database } = await createAdminClient();

  try {
    const request = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      requestId
    );

    if (request.requesterId !== studentId) {
      throw new Error("Unauthorized access to request");
    }

    return {
      status: request.status,
      message:
        request.status === "rejected"
          ? "Your application was rejected"
          : request.status === "approved"
          ? "Your application was approved"
          : "Your application is pending review",
    };
  } catch (error) {
    console.error("Error checking filler application status:", error);
    return {
      status: "pending",
      message: "Failed to check application status",
    };
  }
}

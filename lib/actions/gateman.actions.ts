// lib/actions/gateman.actions.ts
'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/actions/appwrite";

// Type definitions
interface VerificationResponse {
  success: boolean;
  studentInfo?: {
    name: string;
    id: string;
    project: string;
    time: string;
  };
  message?: string;
}

interface ShiftDetails {
  date: string;
  time: string;
  expectedStudents: number;
  reportedStudents: number;
}

interface GatemanShift {
  id: string;
  date: string;
  time: string;
  status: 'upcoming' | 'completed' | 'pendingCancel';
  expectedStudents: number;
  reportedStudents: number;
}

// Interface for today's active shift
interface TodayActiveShift {
    studentName: string;
    projectName: string;
    time: string;
  endTime: Date; // Store the actual Date object for comparison
}

// Helper function to format date to YYYY-MM-DD
function formatDate(dateStr: string): string {
    return new Date(dateStr).toISOString().split("T")[0];
  }

// Verify student code
export async function verifyStudentCode(code: string, gatemanId: string): Promise<VerificationResponse> {
  const { database } = await createAdminClient();
  
  try {
    // Find the verification code
    const verificationCodes = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_VERIFICATION_CODES_COLLECTION_ID!,
      [
        Query.equal('code', [code]),
        Query.equal('status', ['active']),
        Query.equal('isRead', [false])
      ]
    );

    if (verificationCodes.documents.length === 0) {
      return {
        success: false,
        message: 'Invalid or expired code'
      };
    }

    const verificationDoc = verificationCodes.documents[0];
    
    // Get student info
    const student = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      [Query.equal('userId', [verificationDoc.studentId])]
    );

    // Get shift info
    const shift = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [Query.equal('shiftId', [verificationDoc.shiftId])]
    );

    // Get project info
    const project = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      [Query.equal('projectId', [shift.documents[0].projectId])]
    );

    return {
      success: true,
      studentInfo: {
        name: `${student.documents[0].firstName} ${student.documents[0].lastName}`,
        id: student.documents[0].userId,
        project: project.documents[0].name,
        time: `${new Date(shift.documents[0].startTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })} - ${new Date(shift.documents[0].stopTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })}`
      }
    };
  } catch (error) {
    console.error('Error verifying code:', error);
    return {
      success: false,
      message: 'Error verifying code'
    };
  }
}

// Mark student as present
export async function markStudentPresent(code: string, gatemanId: string): Promise<boolean> {
  const { database } = await createAdminClient();
  
  try {
    // Get verification code document
    const verificationCodes = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_VERIFICATION_CODES_COLLECTION_ID!,
      [
        Query.equal('code', [code]),
        Query.equal('status', ['active'])
      ]
    );

    if (verificationCodes.documents.length === 0) return false;
    
    const verificationDoc = verificationCodes.documents[0];
    const now = new Date().toISOString();

    // Update verification code
    await database.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_VERIFICATION_CODES_COLLECTION_ID!,
      verificationDoc.$id,
      {
        status: 'used',
        isRead: true,
        verifiedAt: now,
        verifiedBy: gatemanId
      }
    );

    // Create or update attendance record
    const attendanceId = ID.unique();
    await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      attendanceId,
      {
        attendanceId,
        shiftId: verificationDoc.shiftId,
        studentId: verificationDoc.studentId,
        clockInTime: now,
        clockOutTime: null,
        attendanceStatus: 'pending',
        clockInVerifiedBy: gatemanId,
        markedByLeader: null,
        createdAt: now,
        updatedAt: now
      }
    );

    return true;
  } catch (error) {
    console.error('Error marking student present:', error);
    return false;
  }
}

// Get upcoming shifts for gateman
export async function getUpcomingShifts(gatemanId: string): Promise<GatemanShift[]> {
  const { database } = await createAdminClient();
  
  try {
    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    // First get the shift assignments for this gateman
    const assignments = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [
        Query.equal('gatemanId', [gatemanId]),
        Query.equal('status', ['assigned', 'confirmed'])
      ]
    );

    const assignedShiftIds = assignments.documents.map(assignment => assignment.shiftId);
    if (assignedShiftIds.length === 0) return [];

    // Then get the shifts that match these assignments
    const shifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal('shiftId', assignedShiftIds),
        Query.greaterThanEqual('date', tomorrowStart.toISOString()),
        Query.equal('status', ['published'])
      ]
    );

    // Get assignments for each shift
    const result: GatemanShift[] = await Promise.all(
      shifts.documents.map(async (shift) => {
        const [assignments, cancelRequests] = await Promise.all([
          database.listDocuments(
            process.env.APPWRITE_DATABASE_ID!,
            process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
            [
              Query.equal('shiftId', [shift.shiftId]),
              Query.equal('status', ['assigned', 'confirmed'])
            ]
          ),
          database.listDocuments(
            process.env.APPWRITE_DATABASE_ID!,
            process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
            [
              Query.equal('requestType', ['shiftCancellation']),
              Query.equal('shiftId', [shift.shiftId]),
              Query.equal('requesterId', [gatemanId]),
              Query.equal('status', ['pending'])
            ]
          )
        ]);

        return {
          id: shift.shiftId,
          date: formatDate(shift.date),
          time: `${new Date(shift.startTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })} - ${new Date(shift.stopTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}`,
          status: cancelRequests.documents.length > 0 ? 'pendingCancel' : 'upcoming',
          expectedStudents: assignments.documents.length,
          reportedStudents: 0
        };
      })
    );

    return result;
  } catch (error) {
    console.error('Error getting upcoming shifts:', error);
    return [];
  }
}

// Get completed shifts
export async function getCompletedShifts(gatemanId: string): Promise<GatemanShift[]> {
  const { database } = await createAdminClient();
  
  try {
    const sevenDaysAgoStart = new Date();
    sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 7);
    sevenDaysAgoStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    // First get the shift assignments for this gateman
    const assignments = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [
        Query.equal('gatemanId', [gatemanId]),
        Query.equal('status', ['assigned', 'confirmed'])
      ]
    );

    const assignedShiftIds = assignments.documents.map(assignment => assignment.shiftId);
    if (assignedShiftIds.length === 0) return [];

    // Then get the completed shifts that match these assignments
    const shifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal('shiftId', assignedShiftIds),
        Query.greaterThanEqual('date', sevenDaysAgoStart.toISOString()),
        Query.lessThanEqual('date', todayEnd.toISOString()),
        Query.equal('status', ['completed'])
      ]
    );

    // Get assignments and attendance for each shift
    const result: GatemanShift[] = await Promise.all(
      shifts.documents.map(async (shift) => {
        const [assignments, attendance] = await Promise.all([
          database.listDocuments(
            process.env.APPWRITE_DATABASE_ID!,
            process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
            [
              Query.equal('shiftId', [shift.shiftId]),
              Query.equal('status', ['assigned', 'confirmed'])
            ]
          ),
          database.listDocuments(
            process.env.APPWRITE_DATABASE_ID!,
            process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
            [
              Query.equal('shiftId', [shift.shiftId]),
              Query.isNotNull('clockInTime')
            ]
          )
        ]);

        return {
          id: shift.shiftId,
          date: formatDate(shift.date),
          time: `${new Date(shift.startTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })} - ${new Date(shift.stopTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}`,
          status: 'completed',
          expectedStudents: assignments.documents.length,
          reportedStudents: attendance.documents.length
        };
      })
    );

    return result;
  } catch (error) {
    console.error('Error getting completed shifts:', error);
    return [];
  }
}

// Get shift details
export async function getShiftDetails(shiftId: string): Promise<ShiftDetails | null> {
  const { database } = await createAdminClient();
  
  try {
    const [shift, assignments, attendance] = await Promise.all([
      database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
        [Query.equal('shiftId', [shiftId])]
      ),
      database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
        [
          Query.equal('shiftId', [shiftId]),
          Query.equal('status', ['assigned', 'confirmed'])
        ]
      ),
      database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
        [
          Query.equal('shiftId', [shiftId]),
          Query.isNotNull('clockInTime')
        ]
      )
    ]);

    if (shift.documents.length === 0) return null;

    return {
      date: formatDate(shift.documents[0].date),
      time: `${new Date(shift.documents[0].startTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })} - ${new Date(shift.documents[0].stopTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`,
      expectedStudents: assignments.documents.length,
      reportedStudents: attendance.documents.length
    };
  } catch (error) {
    console.error('Error getting shift details:', error);
    return null;
  }
}

// Submit shift cancellation request
export async function submitShiftCancellation(
  shiftId: string,
  gatemanId: string,
  reason: string
): Promise<boolean> {
  const { database } = await createAdminClient();
  
  try {
    const requestId = ID.unique();
    await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      requestId,
      {
        requestId,
        requestType: 'shiftCancellation',
        requesterId: gatemanId,
        shiftId,
        reason,
        status: 'pending',
        reviewedBy: null,
        createdAt: new Date().toISOString()
      }
    );

    return true;
  } catch (error) {
    console.error('Error submitting cancellation request:', error);
    return false;
  }
}

// Get today's active shifts for the gateman
export async function getTodayActiveShifts(gatemanId: string): Promise<TodayActiveShift[]> {
  const { database } = await createAdminClient();
  const now = new Date();
  
  try {
    // Set up proper timestamp range for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    // Get all shifts for today where gateman is assigned
    const shifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal('gatemanId', [gatemanId]),
        Query.greaterThanEqual('date', todayStart.toISOString()),
        Query.lessThanEqual('date', todayEnd.toISOString()),
        Query.equal('status', ['published'])
      ]
    );

    // For each shift, get attendance records that are marked present
    const activeShifts = await Promise.all(
      shifts.documents.map(async (shift) => {
        const attendance = await database.listDocuments(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
          [
            Query.equal('shiftId', [shift.shiftId]),
            Query.equal('clockInVerifiedBy', [gatemanId]),
            Query.equal('attendanceStatus', ['pending']),
            Query.isNotNull('clockInTime'),
            Query.isNull('clockOutTime')
          ]
        );

        // Only process shifts with active attendance
        return Promise.all(
          attendance.documents.map(async (record) => {
            const [student, project] = await Promise.all([
              database.listDocuments(
                process.env.APPWRITE_DATABASE_ID!,
                process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
                [Query.equal('userId', [record.studentId])]
              ),
              database.listDocuments(
                process.env.APPWRITE_DATABASE_ID!,
                process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
                [Query.equal('projectId', [shift.projectId])]
              )
            ]);

            const endTime = new Date(shift.stopTime);
            
            // Only include if shift hasn't ended yet
            if (endTime > now) {
              return {
                studentName: `${student.documents[0].firstName} ${student.documents[0].lastName}`,
                projectName: project.documents[0].name,
                time: `${new Date(shift.startTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })} - ${new Date(shift.stopTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}`,
                endTime
              };
            }
            return null;
          })
        );
      })
    );

    return activeShifts.flat().filter((shift): shift is TodayActiveShift => shift !== null);
  } catch (error) {
    console.error('Error getting today\'s active shifts:', error);
    return [];
  }
}


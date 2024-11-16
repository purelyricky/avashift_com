// lib/actions/shiftLeader.actions.ts
'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/actions/appwrite";
import { sendCancellationRequestEmail, sendStudentNoteEmail } from '@/lib/emails';
// Type definitions
interface StudentShiftInfo {
  id: string;
  name: string;
  clockedIn: boolean;
  rating: number;
  attendance: 'present' | 'late' | 'absent' | null;
  shiftId: string;
  projectId: string;
}

interface ShiftDetails {
  date: string;
  time: string;
  expectedStudents: number;
  reportedStudents: number;
}

interface LeaderShift {
  id: string;
  date: string;
  time: string;
  status: 'upcoming' | 'completed';
  expectedStudents: number;
  reportedStudents: number;
}

// Helper function to format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toISOString().split("T")[0];
}

// Calculate new student rating
function calculateNewRating(currentRating: number, leaderRating: number): number {
  // Weight factors
  const historicalWeight = 0.7; // 70% weight to historical rating
  const newRatingWeight = 0.3;  // 30% weight to new rating
  
  // Calculate weighted average
  const newRating = (currentRating * historicalWeight) + (leaderRating * newRatingWeight);
  
  // Round to 1 decimal place
  return Math.round(newRating * 10) / 10;
}

// Get today's students
export async function getTodayStudents(leaderId: string): Promise<StudentShiftInfo[]> {
  const { database } = await createAdminClient();
  
  try {
    // Get today's start and end in ISO format with time
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get leader's shifts for today
    const shifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal('shiftLeaderId', [leaderId]),
        Query.greaterThanEqual('date', todayStart.toISOString()),
        Query.lessThanEqual('date', todayEnd.toISOString())
      ]
    );

    const shiftIds = shifts.documents.map(shift => shift.shiftId);

    // Get assignments for these shifts
    const assignments = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [
        Query.equal('shiftId', shiftIds),
        Query.equal('status', ['assigned', 'confirmed'])
      ]
    );

    // Rest of the function remains the same...
    const students = await Promise.all(
      assignments.documents.map(async (assignment) => {
        const student = await database.listDocuments(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
          [Query.equal('userId', [assignment.studentId])]
        );

        const shift = shifts.documents.find(s => s.shiftId === assignment.shiftId);

        const attendance = await database.listDocuments(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
          [
            Query.equal('shiftId', [assignment.shiftId]),
            Query.equal('studentId', [assignment.studentId])
          ]
        );

        return {
          id: student.documents[0].userId,
          name: `${student.documents[0].firstName} ${student.documents[0].lastName}`,
          clockedIn: attendance.documents.some(a => a.clockInTime !== null),
          rating: student.documents[0].rating,
          attendance: attendance.documents[0]?.attendanceStatus || null,
          shiftId: shift?.shiftId || '',
          projectId: shift?.projectId || ''
        };
      })
    );

    return students;
  } catch (error) {
    console.error('Error getting today\'s students:', error);
    return [];
  }
}

// Update student attendance
export async function updateStudentAttendance(
    studentId: string,
    shiftId: string,
    status: 'present' | 'late' | 'absent',
    leaderId: string
  ): Promise<boolean> {
    const { database } = await createAdminClient();
    
    try {
      // First try to find existing attendance record
      const attendance = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
        [
          Query.equal('studentId', [studentId])
        ]
      );
  
      const now = new Date().toISOString();
  
      if (attendance.documents.length > 0) {
        // Update existing record
        await database.updateDocument(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
          attendance.documents[0].$id,
          {
            attendanceStatus: status,
            markedByLeader: leaderId,
            updatedAt: now
          }
        );
      } else {
        // Create new record
        const attendanceId = ID.unique();
        await database.createDocument(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
          attendanceId,
          {
            attendanceId,
            studentId,
            shiftId,
            attendanceStatus: status,
            markedByLeader: leaderId,
            createdAt: now,
            updatedAt: now
          }
        );
      }
  
      return true;
    } catch (error) {
      console.error('Error updating attendance:', error);
      return false;
    }
  }


// Add student comment
export async function addStudentComment(
    studentId: string,
    shiftId: string,
    projectId: string,
    comment: string,
    leaderId: string
): Promise<boolean> {
    const { database } = await createAdminClient();
    
    try {
        // Create the feedback document
        const feedbackId = ID.unique();
        await database.createDocument(
            process.env.APPWRITE_DATABASE_ID!,
            process.env.APPWRITE_FEEDBACK_COLLECTION_ID!,
            feedbackId,
            {
                feedbackId,
                studentId,
                shiftId,
                projectId,
                comments: comment,
                submittedBy: leaderId,
                createdAt: new Date().toISOString(),
                isRead: false
            }
        );

        // Get all the necessary information for the email
        const [student, project, leader, shift] = await Promise.all([
            // Get student details
            database.listDocuments(
                process.env.APPWRITE_DATABASE_ID!,
                process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
                [Query.equal('userId', [studentId])]
            ),
            // Get project details
            database.listDocuments(
                process.env.APPWRITE_DATABASE_ID!,
                process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
                [Query.equal('projectId', [projectId])]
            ),
            // Get leader details - Changed from USERS to SHIFT_LEADERS collection
            database.listDocuments(
                process.env.APPWRITE_DATABASE_ID!,
                process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
                [Query.equal('userId', [leaderId])]
            ),
            // Get shift details
            database.listDocuments(
                process.env.APPWRITE_DATABASE_ID!,
                process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
                [Query.equal('shiftId', [shiftId])]
            )
        ]);

        // Get the admin who created the shift or project owner
        const admins = await database.listDocuments(
            process.env.APPWRITE_DATABASE_ID!,
            process.env.APPWRITE_ADMINS_COLLECTION_ID!,
            [Query.equal('userId', [
                shift.documents[0].createdBy, // Try shift creator first
                project.documents[0].ownerId  // Or project owner as fallback
            ])]
        );

        if (admins.documents.length > 0) {
            console.log("Sending student note email to admin:", admins.documents[0].email);
            
            // Format the date properly from the shift data
            const shiftDate = new Date(shift.documents[0].date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Send email to admin
            await sendStudentNoteEmail({
                adminName: admins.documents[0].firstName + ' ' + admins.documents[0].lastName,
                adminEmail: admins.documents[0].email,
                studentName: `${student.documents[0].firstName} ${student.documents[0].lastName}`,
                projectName: project.documents[0].name,
                leaderName: leader.documents[0].firstName + ' ' + leader.documents[0].lastName,
                note: comment,
                shiftDate: shiftDate,  // Now properly formatted
            });

            console.log("Student note email sent successfully");
        } else {
            console.log("No admin found for shift/project");
        }

        return true;
    } catch (error) {
        console.error('Error adding comment:', error);
        return false;
    }
}
  
  // Separate function for updating student rating
export async function updateStudentRating(
    studentId: string,
    newRating: number,
    shiftId: string,
    projectId: string,
    leaderId: string
  ): Promise<boolean> {
    const { database } = await createAdminClient();
    
    try {
      // Get current student rating
      const student = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
        [Query.equal('userId', [studentId])]
      );
  
      if (student.documents.length === 0) return false;
  
      const currentRating = student.documents[0].rating;
      
      // Calculate new overall rating for student
      const updatedStudentRating = calculateNewRating(currentRating, newRating);
  
      // Update student's rating in students table only
      await database.updateDocument(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
        student.documents[0].$id,
        {
          rating: updatedStudentRating
        }
      );
  
      return true;
    } catch (error) {
      console.error('Error updating rating:', error);
      return false;
    }
  }
  
// Get upcoming shifts for leader
export async function getUpcomingShifts(leaderId: string): Promise<LeaderShift[]> {
  const { database } = await createAdminClient();
  
  try {
    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    // First get all shifts where this leader is assigned
    const shifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal('shiftLeaderId', [leaderId]),
        Query.greaterThanEqual('date', tomorrowStart.toISOString()),
        Query.equal('status', ['published'])
      ]
    );

    // Get assignments for these shifts
    const result = await Promise.all(
      shifts.documents.map(async (shift) => {
        const assignments = await database.listDocuments(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
          [
            Query.equal('shiftId', [shift.shiftId]),
            Query.equal('status', ['assigned', 'confirmed'])
          ]
        );

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
          status: 'upcoming',
          expectedStudents: assignments.documents.length,
          reportedStudents: 0
        };
      })
    );

    return result as LeaderShift[];
  } catch (error) {
    console.error('Error getting upcoming shifts:', error);
    return [];
  }
}

// Get completed shifts
export async function getCompletedShifts(leaderId: string): Promise<LeaderShift[]> {
  const { database } = await createAdminClient();
  
  try {
    const sevenDaysAgoStart = new Date();
    sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 7);
    sevenDaysAgoStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    // Get completed shifts where this leader was assigned
    const shifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal('shiftLeaderId', [leaderId]),
        Query.greaterThanEqual('date', sevenDaysAgoStart.toISOString()),
        Query.lessThanEqual('date', todayEnd.toISOString()),
        Query.equal('status', ['completed'])
      ]
    );

    // Rest of the function remains the same...
    const result = await Promise.all(
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

    return result as LeaderShift[];
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

// Helper function to get shift assigning admin
async function getShiftAssigningAdmin(shiftId: string, leaderId: string) {
  const { database } = await createAdminClient();
  
  try {
    // Get shift details first
    const shift = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftId
    );

    // Get project details to get owner ID
    const project = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      shift.projectId
    );

    // Check admins collection for shift creator or project owner
    // Note: Query.equal with array values must be passed as an array of possible values
    const admins = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMINS_COLLECTION_ID!,
      [
        Query.equal('userId', [shift.createdBy, project.ownerId])
      ]
    );

    return admins.documents[0] || null;
  } catch (error) {
    console.error('Error getting assigning admin:', error);
    return null;
  }
}

// Modified submitShiftCancellation function
export async function submitShiftCancellation(
    shiftId: string,
    leaderId: string,
    reason: string
  ): Promise<boolean> {
    const { database } = await createAdminClient();
    
    try {
      // Get shift details
      const shift = await database.getDocument(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
        shiftId
      );

      // Get project details
      const project = await database.getDocument(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
        shift.projectId
      );

      // Get leader details
      const leaders = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
        [Query.equal('userId', [leaderId])]
      );

      if (leaders.documents.length === 0) {
        throw new Error('Leader not found');
      }
      const leader = leaders.documents[0];

      // Get assigning admin
      const admin = await getShiftAssigningAdmin(shiftId, leaderId);

      if (admin) {
        try {
          // Format the date properly
          const shiftDate = new Date(shift.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          await sendCancellationRequestEmail({
            adminName: `${admin.firstName} ${admin.lastName}`,
            adminEmail: admin.email,
            requesterName: `${leader.firstName} ${leader.lastName}`,
            requesterRole: 'shift leader',
            projectName: project.name,
            shiftDate: shiftDate,
            shiftTime: shift.timeType === 'day' ? 'Day Shift' : 'Night Shift',
            reason: reason
          });

          console.log('Cancellation request email sent successfully');
        } catch (emailError) {
          console.error('Error sending cancellation email:', emailError);
          // Continue with request creation even if email fails
        }
      }

      // Create the cancellation request
      const requestId = ID.unique();
      await database.createDocument(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
        requestId,
        {
          requestId,
          requestType: 'shiftCancellation',
          requesterId: leaderId,
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
  
  // Check if shift has pending cancellation request
  export async function checkPendingCancellation(
    shiftId: string,
    leaderId: string
  ): Promise<boolean> {
    const { database } = await createAdminClient();
    
    try {
      const requests = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
        [
          Query.equal('requestType', ['shiftCancellation']),
          Query.equal('shiftId', [shiftId]),
          Query.equal('requesterId', [leaderId]),
          Query.equal('status', ['pending'])
        ]
      );
  
      return requests.documents.length > 0;
    } catch (error) {
      console.error('Error checking pending cancellation:', error);
      return false;
    }
  }


// New function to get attendance status
export async function getStudentAttendanceStatus(
    studentId: string,
    shiftId: string
  ): Promise<'pending' | 'present' | 'late' | 'absent' | null> {
    const { database } = await createAdminClient();
    
    try {
      const attendance = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
        [
          Query.equal('studentId', [studentId]),
          Query.equal('shiftId', [shiftId])
        ]
      );
  
      if (attendance.documents.length > 0) {
        return attendance.documents[0].attendanceStatus;
      }
  
      return null;
    } catch (error) {
      console.error('Error getting attendance status:', error);
      return null;
    }
  }
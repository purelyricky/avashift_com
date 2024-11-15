// lib/actions/admin-requests.actions.ts

"use server";

import { ID, Query, Models } from "node-appwrite";
import { createAdminClient } from "@/lib/actions/appwrite";
import { sendRequestStatusUpdateEmail, sendProjectAssignmentEmail } from '@/lib/emails';

// Types and Interfaces
interface AdminRequestDocument extends Models.Document {
  $id: string;
  requestId: string; // Primary Key
  requestType: "shiftCancellation" | "fillerShiftApplication" | "availabilityChange";
  requesterId: string;
  shiftId: string; // Foreign Key -> shifts.shiftId
  assignmentId: string; // Foreign Key -> shiftAssignments.assignmentId
  reason: string | null;
  replacementEmail: string | null;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null; // Foreign Key -> admins.userId
  createdAt: string;
}

interface ShiftAssignmentDocument extends Models.Document {
  assignmentId: string;
  shiftId: string;
  studentId: string;
  projectMemberId: string;
  status: "pending" | "assigned" | "confirmed" | "completed" | "cancelled";
  assignedBy: string;
  assignedAt: string;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRequestStats {
  totalRequests: number;
  reviewedRequests: number;
  progressPercentage: number;
}

export interface RequesterInfo {
  name: string;
  role: "student" | "shiftLeader" | "gateman";
  punctualityScore?: number;
  rating?: number;
}


export interface AdminRequestWithDetails {
  requestId: string;
  requestType: "shiftCancellation" | "fillerShiftApplication" | "availabilityChange";
  requester: RequesterInfo;
  reason: string | null;  // Made nullable to match actual data
  replacementEmail: string | null;
  shiftDetails?: {
    date: string;
    timeType: "day" | "night";
    startTime: string;
    stopTime: string;
  };
  createdAt: string;
}

interface DateRange {
  from?: Date;
  to?: Date;
}

// Helper function to update student metrics when penalized
async function penalizeStudent(studentId: string): Promise<{ newRating: number; newPunctuality: number }> {
  const { database } = await createAdminClient();
  
  try {
    const student = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      [Query.equal("userId", [studentId])]
    );

    if (student.documents.length === 0) {
      throw new Error("Student not found");
    }

    const currentRating = student.documents[0].rating;
    const currentPunctuality = student.documents[0].punctualityScore;

    // Calculate new values (deduct 0.3 from rating and 2 from punctuality)
    const newRating = Math.max(1, currentRating - 0.3);
    const newPunctuality = Math.max(0, currentPunctuality - 2);

    // Update student document
    await database.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      student.documents[0].$id,
      {
        rating: newRating,
        punctualityScore: newPunctuality
      }
    );

    return { newRating, newPunctuality };
  } catch (error) {
    console.error("Error penalizing student:", error);
    throw error;
  }
}

// Helper function to format date and time
function formatDateTime(date: string, time: string): string {
  const dateObj = new Date(`${date}T${time}`);
  return dateObj.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(',', '');
}

// Main functions
export async function getAdminRequestStats(
  projectId: string,
  adminId: string,
  dateRange?: DateRange
): Promise<AdminRequestStats> {
  console.log('Getting admin request stats:', { projectId, adminId, dateRange });
  const { database } = await createAdminClient();

  try {
    let queries = [];

    if (dateRange?.from) {
      queries.push(Query.greaterThanEqual("createdAt", dateRange.from.toISOString()));
    }
    if (dateRange?.to) {
      queries.push(Query.lessThanEqual("createdAt", dateRange.to.toISOString()));
    }

    const requests = await database.listDocuments<AdminRequestDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      queries
    );

    const totalRequests = requests.total;
    const reviewedRequests = requests.documents.filter(
      req => req.status !== "pending"
    ).length;
    const progressPercentage = totalRequests > 0 
      ? Math.round((reviewedRequests / totalRequests) * 100) 
      : 0;

    console.log('Admin request stats result:', {
      totalRequests,
      reviewedRequests,
      progressPercentage
    });
    return {
      totalRequests,
      reviewedRequests,
      progressPercentage
    };
  } catch (error) {
    console.error("Error getting admin request stats:", error);
    return {
      totalRequests: 0,
      reviewedRequests: 0,
      progressPercentage: 0
    };
  }
}

export async function getAdminRequests(
  projectId: string,
  searchTerm: string = "",
  dateRange?: DateRange
): Promise<AdminRequestWithDetails[]> {
  console.log('Getting admin requests:', { projectId, searchTerm, dateRange });
  const { database } = await createAdminClient();

  try {
    // First, get all shifts for this project
    const shifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [Query.equal("projectId", [projectId])]
    );

    const projectShiftIds = shifts.documents.map(shift => shift.shiftId);
    console.log('Project shift IDs:', projectShiftIds);

    // If there are no shifts, return empty array instead of making invalid query
    if (projectShiftIds.length === 0) {
      return [];
    }

    // Then query requests based on these shift IDs
    let queries = [
      Query.equal("status", ["pending"]),
      Query.equal("shiftId", projectShiftIds)
    ];

    if (dateRange?.from) {
      queries.push(Query.greaterThanEqual("createdAt", dateRange.from.toISOString()));
    }
    if (dateRange?.to) {
      queries.push(Query.lessThanEqual("createdAt", dateRange.to.toISOString()));
    }

    const requests = await database.listDocuments<AdminRequestDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      queries
    );

    console.log('Initial requests found:', requests.total);

    const detailedRequests: (AdminRequestWithDetails | null)[] = await Promise.all(
      requests.documents.map(async (request) => {
        let requesterInfo: RequesterInfo;

        try {
          // Try to find requester in students collection first
          let studentInfo = await database.listDocuments(
            process.env.APPWRITE_DATABASE_ID!,
            process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
            [Query.equal("userId", [request.requesterId])]
          );

          if (studentInfo.documents.length > 0) {
            requesterInfo = {
              name: `${studentInfo.documents[0].firstName} ${studentInfo.documents[0].lastName}`,
              role: "student",
              punctualityScore: studentInfo.documents[0].punctualityScore,
              rating: studentInfo.documents[0].rating
            };
          } else {
            // Check shift leaders
            let leaderInfo = await database.listDocuments(
              process.env.APPWRITE_DATABASE_ID!,
              process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
              [Query.equal("userId", [request.requesterId])]
            );

            if (leaderInfo.documents.length > 0) {
              requesterInfo = {
                name: `${leaderInfo.documents[0].firstName} ${leaderInfo.documents[0].lastName}`,
                role: "shiftLeader"
              };
            } else {
              // Check gatemen
              let gatemanInfo = await database.listDocuments(
                process.env.APPWRITE_DATABASE_ID!,
                process.env.APPWRITE_GATEMEN_COLLECTION_ID!,
                [Query.equal("userId", [request.requesterId])]
              );

              if (gatemanInfo.documents.length === 0) {
                throw new Error(`Requester not found for ID: ${request.requesterId}`);
              }

              requesterInfo = {
                name: `${gatemanInfo.documents[0].firstName} ${gatemanInfo.documents[0].lastName}`,
                role: "gateman"
              };
            }
          }

          // Get shift details if shiftId exists
          let shiftDetails = undefined;
          if (request.shiftId) {
            const shift = await database.getDocument(
              process.env.APPWRITE_DATABASE_ID!,
              process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
              request.shiftId
            );
            
            shiftDetails = {
              date: shift.date,
              timeType: shift.timeType,
              startTime: shift.startTime,
              stopTime: shift.stopTime
            };
          }

          // Filter by search term if provided
          if (searchTerm && !requesterInfo.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return null;
          }

          return {
            requestId: request.requestId,
            requestType: request.requestType,
            requester: requesterInfo,
            reason: request.reason,
            replacementEmail: request.replacementEmail,
            shiftDetails,
            createdAt: request.createdAt
          };
        } catch (error) {
          console.error(`Error processing request ${request.requestId}:`, error);
          return null;
        }
      })
    );

    const filteredRequests = detailedRequests.filter((request): request is AdminRequestWithDetails => request !== null);
    console.log('Final processed requests:', filteredRequests.length);
    return filteredRequests;
  } catch (error) {
    console.error("Error getting admin requests:", error);
    throw error;
  }
}


export async function handleCancellationRequest(
  requestId: string,
  replacementEmail: string,
  shouldPenalize: boolean,
  adminId: string
): Promise<{ success: boolean; message: string; penaltyDetails?: { newRating: number; newPunctuality: number; }; }> {
  const { database } = await createAdminClient();

  try {
    // Get request details
    const request = await database.getDocument<AdminRequestDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      requestId
    );

    if (!request) {
      throw new Error("Request not found");
    }

    // Get replacement user details
    const replacementUser = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      [Query.equal("email", [replacementEmail])]
    );

    if (replacementUser.documents.length === 0) {
      throw new Error("Replacement user not found");
    }

    const replacementStudent = replacementUser.documents[0];
    const replacementName = `${replacementStudent.firstName} ${replacementStudent.lastName}`;

    // Get shift details
    const shift = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      request.shiftId
    );

    // Get project membership for replacement user
    const projectMember = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal("projectId", [shift.projectId]),
        Query.equal("userId", [replacementStudent.userId]),
        Query.equal("status", ["active"])
      ]
    );

    if (projectMember.documents.length === 0) {
      throw new Error("Replacement user is not an active member of this project");
    }

    // Cancel original assignment
    await database.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      request.assignmentId,
      { 
        status: "cancelled",
        updatedAt: new Date().toISOString()
      }
    );

    // Create new assignment for replacement
    const now = new Date().toISOString();
    const newAssignmentId = ID.unique();
    await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      newAssignmentId,
      {
        assignmentId: newAssignmentId,
        shiftId: request.shiftId,
        studentId: replacementStudent.userId,
        projectMemberId: projectMember.documents[0].memberId,
        status: "assigned",
        assignedBy: adminId,
        assignedAt: now,
        confirmedAt: null,
        createdAt: now,
        updatedAt: now
      }
    );

    let penaltyDetails = undefined;

    // Apply penalty if requested
    if (shouldPenalize) {
      penaltyDetails = await penalizeStudent(request.requesterId);
    }

    // Update request status
    await database.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      request.$id,
      {
        status: "approved",
        reviewedBy: adminId,
        replacementEmail
      }
    );

    // Get requester details to send email
    let requesterEmail: string;
    let requesterName: string;

    // Try to find requester in different collections
    const studentInfo = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      [Query.equal("userId", [request.requesterId])]
    );

    if (studentInfo.documents.length > 0) {
      requesterEmail = studentInfo.documents[0].email;
      requesterName = `${studentInfo.documents[0].firstName} ${studentInfo.documents[0].lastName}`;
    } else {
      // Check shift leaders
      const leaderInfo = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
        [Query.equal("userId", [request.requesterId])]
      );

      if (leaderInfo.documents.length > 0) {
        requesterEmail = leaderInfo.documents[0].email;
        requesterName = `${leaderInfo.documents[0].firstName} ${leaderInfo.documents[0].lastName}`;
      } else {
        // Check gatemen
        const gatemanInfo = await database.listDocuments(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_GATEMEN_COLLECTION_ID!,
          [Query.equal("userId", [request.requesterId])]
        );

        if (gatemanInfo.documents.length === 0) {
          throw new Error(`Requester not found for ID: ${request.requesterId}`);
        }

        requesterEmail = gatemanInfo.documents[0].email;
        requesterName = `${gatemanInfo.documents[0].firstName} ${gatemanInfo.documents[0].lastName}`;
      }
    }

    // Format the date and time for email
    const formattedDateTime = formatDateTime(shift.date, shift.startTime);

    // Send assignment email to replacement student
    await sendProjectAssignmentEmail({
      studentName: replacementName,
      studentEmail: replacementEmail,
      projectName: shift.projectName,
      startTime: formatDateTime(shift.date, shift.startTime),
      endTime: formatDateTime(shift.date, shift.stopTime)
    });

    // Send email notification
    await sendRequestStatusUpdateEmail({
      userName: requesterName,
      userEmail: requesterEmail,
      requestType: 'Shift Cancellation',
      newStatus: 'approved',
      projectName: shift.projectName,
      shiftDetails: {
        date: formattedDateTime,
        time: shift.timeType === 'day' ? 'Day Shift' : 'Night Shift',
      },
    });

    return {
      success: true,
      message: "Cancellation request processed successfully",
      penaltyDetails
    };
  } catch (error) {
    console.error("Error handling cancellation request:", error);
    throw error;
  }
}

export async function handleFillerRequest(
  requestId: string,
  action: "approve" | "reject",
  adminId: string
): Promise<{ success: boolean; message: string }> {
  const { database } = await createAdminClient();

  try {
    // Get request details
    const request = await database.getDocument<AdminRequestDocument>(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      requestId
    );

    if (!request) {
      throw new Error("Request not found");
    }

    // Get requester details to send email
    let requesterEmail: string;
    let requesterName: string;
    const studentInfo = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      [Query.equal("userId", [request.requesterId])]
    );

    if (studentInfo.documents.length === 0) {
      throw new Error("Requester not found");
    }

    requesterEmail = studentInfo.documents[0].email;
    requesterName = `${studentInfo.documents[0].firstName} ${studentInfo.documents[0].lastName}`;

    const shift = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      request.shiftId
    );

    if (action === "approve") {
      const projectMember = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
        [
          Query.equal("projectId", [shift.projectId]),
          Query.equal("userId", [request.requesterId]),
          Query.equal("status", ["active"])
        ]
      );

      if (projectMember.documents.length === 0) {
        throw new Error("Requester is not an active member of this project");
      }

      // Create new assignment for requester
      const now = new Date().toISOString();
      const newAssignmentId = ID.unique();
      await database.createDocument(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
        newAssignmentId,
        {
          assignmentId: newAssignmentId,
          shiftId: request.shiftId,
          studentId: request.requesterId,
          projectMemberId: projectMember.documents[0].memberId,
          status: "assigned",
          assignedBy: adminId,
          assignedAt: now,
          confirmedAt: null,
          createdAt: now,
          updatedAt: now
        }
      );
    }

    // Update request status
    await database.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      request.$id,
      {
        status: action === "approve" ? "approved" : "rejected",
        reviewedBy: adminId
      }
    );

    // Format the date and time for email
    const formattedDateTime = formatDateTime(shift.date, shift.startTime);

    // Send email notification
    await sendRequestStatusUpdateEmail({
      userName: requesterName,
      userEmail: requesterEmail,
      requestType: 'Filler Shift Application',
      newStatus: action === 'approve' ? 'approved' : 'rejected',
      projectName: shift.projectName,
      shiftDetails: {
        date: formattedDateTime,
        time: shift.timeType === 'day' ? 'Day Shift' : 'Night Shift',
      },
    });

    return {
      success: true,
      message: `Filler request ${action}d successfully`
    };
  } catch (error) {
    console.error("Error handling filler request:", error);
    throw error;
  }
}
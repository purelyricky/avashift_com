// lib/actions/request-management.actions.ts

"use server";

import { ID, Query, Models } from "node-appwrite";
import { createAdminClient } from "@/lib/actions/appwrite";
import { startOfDay, endOfDay, isWithinInterval, isSameDay, parseISO, format } from "date-fns";

// Base interfaces
interface DateRange {
  from: Date;
  to: Date;
}

export interface OptionalDateRange {
  from?: Date;
  to?: Date;
}

// Document interfaces remain the same, just adding projectId where needed
interface AdminRequestDocument extends Models.Document {
    requestId: string;
    projectId: string; // Added to track which project the request belongs to
    requestType: 'shiftCancellation' | 'fillerShiftApplication';
    requesterId: string;
    shiftId: string | null;
    assignmentId: string | null;
    reason: string | null;
    replacementEmail: string | null;
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy: string | null;
    createdAt: string;
    penalized?: boolean;
  }

interface ProjectMemberDocument extends Models.Document {
  memberId: string;
  projectId: string;
  userId: string;
  membershipType: 'student' | 'shiftLeader' | 'gateman' | 'admin' | 'client';
  status: 'active' | 'inactive';
}

interface StudentDocument extends Models.Document {
  userId: string;
  firstName: string;
  lastName: string;
  punctualityScore: number;
}

interface ShiftAssignmentDocument extends Models.Document {
  assignmentId: string;
  shiftId: string;
  studentId: string;
  status: 'pending' | 'assigned' | 'confirmed' | 'completed' | 'cancelled';
}

// Response interfaces
export interface RequestManagementStats {
  totalRequests: number;
  reviewedRequests: number;
}


export interface RequestData {
  requestId: string;
  requesterName: string;
  requesterRole: 'student' | 'shiftLeader' | 'gateman';
  requestType: 'shiftCancellation' | 'fillerShiftApplication';
  reason: string | null;
  replacementEmail: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  penalized?: boolean;
}

// Helper function to check if date is within range
function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const targetDate = startOfDay(date);
  const rangeStart = startOfDay(start);
  const rangeEnd = endOfDay(end);

  return isWithinInterval(targetDate, { start: rangeStart, end: rangeEnd }) ||
    isSameDay(targetDate, rangeStart) ||
    isSameDay(targetDate, rangeEnd);
}

// Main functions
export async function getRequestManagementStats(
    projectId: string,
    dateRange?: OptionalDateRange
  ): Promise<RequestManagementStats> {
    const { database } = await createAdminClient();
  
    try {
      // Base queries for counting requests
      let requestQueries = [
        Query.equal("projectId", [projectId]),
        Query.equal("requestType", ["shiftCancellation", "fillerShiftApplication"])
      ];
  
      if (dateRange?.from && dateRange?.to) {
        requestQueries.push(
          Query.greaterThanEqual("createdAt", dateRange.from.toISOString()),
          Query.lessThanEqual("createdAt", dateRange.to.toISOString())
        );
      }
  
      // Get all requests for this project
      const requests = await database.listDocuments<AdminRequestDocument>(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
        requestQueries
      );
  
      // Count reviewed requests
      const reviewedRequests = requests.documents.filter(
        request => request.status === 'approved' || request.status === 'rejected'
      ).length;
  
      return {
        totalRequests: requests.documents.length,
        reviewedRequests
      };
    } catch (error) {
      console.error("Error getting request management stats:", error);
      return {
        totalRequests: 0,
        reviewedRequests: 0
      };
    }
  }

  export async function getRequests(
    projectId: string,
    dateRange?: OptionalDateRange,
    selectedDays?: string[]
  ): Promise<RequestData[]> {
    const { database } = await createAdminClient();
  
    try {
      // Get requests within date range for this project
      let requestQueries = [
        Query.equal("projectId", [projectId]),
        Query.equal("requestType", ["shiftCancellation", "fillerShiftApplication"])
      ];
  
      if (dateRange?.from && dateRange?.to) {
        requestQueries.push(
          Query.greaterThanEqual("createdAt", dateRange.from.toISOString()),
          Query.lessThanEqual("createdAt", dateRange.to.toISOString())
        );
      }
  
      const requests = await database.listDocuments<AdminRequestDocument>(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
        requestQueries
      );
  
      // Get all unique requester IDs
      const requesterIds = Array.from(new Set(requests.documents.map(r => r.requesterId)));
  
      // Get project members
      const members = await database.listDocuments<ProjectMemberDocument>(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
        [
          Query.equal("userId", requesterIds),
          Query.equal("projectId", [projectId]),
          Query.equal("status", ["active"])
        ]
      );
  
      // Get student details for names
      const students = await database.listDocuments<StudentDocument>(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
        [Query.equal("userId", requesterIds)]
      );
  
      // Process requests
      const processedRequests = requests.documents
        .filter(request => {
          if (!selectedDays || selectedDays.length === 0) return true;
          
          const requestDate = new Date(request.createdAt);
          const dayOfWeek = format(requestDate, "EEE");
          return selectedDays.includes(dayOfWeek);
        })
        .map(request => {
          const member = members.documents.find(m => m.userId === request.requesterId);
          const student = students.documents.find(s => s.userId === request.requesterId);
  
          return {
            requestId: request.requestId,
            requesterName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
            requesterRole: member?.membershipType || 'student',
            requestType: request.requestType,
            reason: request.reason,
            replacementEmail: request.replacementEmail,
            status: request.status,
            createdAt: request.createdAt,
            penalized: request.penalized
          };
        });
  
      return processedRequests as RequestData[];
    } catch (error) {
      console.error("Error getting requests:", error);
      return [];
    }
  }

  export async function reviewRequest(
    projectId: string, // Added projectId parameter
    requestId: string,
    action: 'approve' | 'reject',
    shouldPenalize: boolean = false,
    reviewerId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { database } = await createAdminClient();
  
    try {
      // Get request details and verify it belongs to the project
      const request = await database.getDocument<AdminRequestDocument>(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
        requestId
      );
  
      if (request.projectId !== projectId) {
        return {
          success: false,
          error: "Request does not belong to this project"
        };
      }
  
      // Handle shift cancellation
      if (request.requestType === 'shiftCancellation' && request.assignmentId) {
        // Update assignment status
        await database.updateDocument(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
          request.assignmentId,
          {
            status: 'cancelled',
            updatedAt: new Date().toISOString()
          }
        );
  
        // If it's a student and should be penalized, update punctuality score
        if (shouldPenalize) {
          const member = await database.listDocuments<ProjectMemberDocument>(
            process.env.APPWRITE_DATABASE_ID!,
            process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
            [
              Query.equal("userId", [request.requesterId]),
              Query.equal("projectId", [projectId])
            ]
          );
  
          if (member.documents[0]?.membershipType === 'student') {
            const student = await database.getDocument<StudentDocument>(
              process.env.APPWRITE_DATABASE_ID!,
              process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
              request.requesterId
            );
  
            // Reduce punctuality score by 5%
            const newScore = Math.max(0, student.punctualityScore - 5);
            await database.updateDocument(
              process.env.APPWRITE_DATABASE_ID!,
              process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
              request.requesterId,
              {
                punctualityScore: newScore
              }
            );
          }
        }
      }
  
      // Update request status
      await database.updateDocument(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
        requestId,
        {
          status: action,
          reviewedBy: reviewerId,
          penalized: shouldPenalize,
          updatedAt: new Date().toISOString()
        }
      );
  
      return { success: true };
    } catch (error) {
      console.error("Error reviewing request:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to review request"
      };
    }
  }
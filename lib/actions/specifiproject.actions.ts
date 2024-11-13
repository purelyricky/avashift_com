'use server';

import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/actions/appwrite";


export async function getProjectStats(projectId: string) {
    try {
      const { database } = await createAdminClient();
      
      // Get project members
      const members = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
        [
          Query.equal('projectId', [projectId]),
          Query.equal('status', ['active'])
        ]
      );
  
      // Count students and shift leaders
      const students = members.documents.filter(m => m.membershipType === 'student');
      const shiftLeaders = members.documents.filter(m => m.membershipType === 'shiftLeader');
  
      // Get all student details for punctuality calculation
      const studentIds = students.map(m => m.userId);
      const studentDetails = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
        [Query.equal('userId', studentIds)]
      );
  
      // Calculate average punctuality
      const totalPunctuality = studentDetails.documents.reduce((sum, student) => 
        sum + (student.punctualityScore || 100), 0);
      const averagePunctuality = studentDetails.documents.length > 0 
        ? Math.round(totalPunctuality / studentDetails.documents.length) 
        : 100;
  
      return {
        totalStudents: students.length,
        totalShiftLeaders: shiftLeaders.length,
        averagePunctuality
      };
    } catch (error) {
      console.error('Error fetching project stats:', error);
      return {
        totalStudents: 0,
        totalShiftLeaders: 0,
        averagePunctuality: 100
      };
    }
  }

// Fetch project members with stats
export async function getProjectMembersWithStats(projectId: string) {
    try {
      const { database } = await createAdminClient();
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      // Get project members
      const members = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
        [
          Query.equal('projectId', [projectId]),
          Query.equal('membershipType', ['student'])
        ]
      );
  
      if (members.documents.length === 0) return [];
  
      // Get all student details
      const studentIds = members.documents.map(m => m.userId);
      const students = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
        [Query.equal('userId', studentIds)]
      );
  
      // Get all shifts for the project
      const shifts = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
        [
          Query.equal('projectId', [projectId]),
          Query.greaterThanEqual('date', startOfMonth.toISOString())
        ]
      );
  
      // Get attendance records only if there are shifts
      const shiftIds = shifts.documents.map(s => s.shiftId);
      const attendance = shiftIds.length > 0 ? await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
        [
          Query.equal('shiftId', shiftIds),
          Query.equal('attendanceStatus', ['present'])
        ]
      ) : { documents: [] };
  
       // Get feedback records for notes only if there are students
       const feedback = studentIds.length > 0 ? await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_FEEDBACK_COLLECTION_ID!,
        [
          Query.equal('projectId', [projectId]),
          Query.equal('studentId', studentIds)
        ]
      ) : { documents: [] };
  
       // Get unique leader IDs from feedback
    const leaderIds = Array.from(new Set(feedback.documents.map(f => f.submittedBy)));

    // Fetch leader details only if there are leaders
    const leaders = leaderIds.length > 0 ? await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
        [Query.equal('userId', leaderIds)]
      ) : { documents: [] };


    // Create a map of leader IDs to names
    const leaderMap = leaders.documents.reduce((acc, leader) => ({
      ...acc,
      [leader.userId]: `${leader.firstName} ${leader.lastName}`
    }), {} as Record<string, string>);

    // Combine all data
    const membersWithStats = members.documents.map(member => {
      const student = students.documents.find(s => s.userId === member.userId);
      const studentAttendance = attendance.documents.filter(a => a.studentId === member.userId);
      const studentFeedback = feedback.documents.filter(f => f.studentId === member.userId);

      return {
        memberId: member.memberId,
        documentId: member.$id,
        userId: member.userId,
        name: `${student?.firstName} ${student?.lastName}`,
        status: member.status,
        shiftsCompleted: studentAttendance.length,
        punctualityScore: student?.punctualityScore || 100,
        rating: student?.rating || 5.0,
        notes: studentFeedback.map(f => ({
          id: f.$id,
          leader: leaderMap[f.submittedBy] || 'Unknown Leader',
          leaderId: f.submittedBy,
          date: f.createdAt,
          content: f.comments,
          isRead: f.isRead || false // Include read status
        })),
        // Only count unread notes with content
        totalNotes: studentFeedback.filter(f => 
          f.comments && 
          f.comments.trim() !== '' && 
          !f.isRead
        ).length
      };
    });

    return membersWithStats;
  } catch (error) {
    console.error('Error fetching project members:', error);
    return [];
  }
}

// Add new function to mark feedback as read
export async function markFeedbackAsRead(feedbackId: string) {
  try {
    const { database } = await createAdminClient();
    
    const result = await database.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_FEEDBACK_COLLECTION_ID!,
      feedbackId,
      { 
        isRead: true,
        updatedAt: new Date().toISOString()
      }
    );

    if (result.$id) {
      return { 
        success: true,
        data: {
          id: result.$id,
          isRead: true
        }
      };
    }

    return { 
      success: false,
      error: 'Failed to update document'
    };
  } catch (error) {
    console.error('Error marking feedback as read:', error);
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}


// Update member status using document ID
export async function updateMemberStatus(documentId: string, status: 'active' | 'inactive') {
  try {
    const { database } = await createAdminClient();
    
    await database.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      documentId,
      { status }
    );

    return { success: true };
  } catch (error) {
    console.error('Error updating member status:', error);
    return { success: false };
  }
}

// Remove member using document ID
export async function removeMemberFromProject(documentId: string) {
  try {
    const { database } = await createAdminClient();
    
    await database.deleteDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      documentId
    );

    return { success: true };
  } catch (error) {
    console.error('Error removing member:', error);
    return { success: false };
  }
}


export async function getProjectDetails(projectId: string) {
    try {
      const { database } = await createAdminClient();
      
      const project = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
        [Query.equal('projectId', [projectId])]
      );
  
      if (project.documents.length === 0) {
        return null;
      }
  
      return {
        name: project.documents[0].name,
        description: project.documents[0].description || null,
        status: project.documents[0].status
      };
    } catch (error) {
      console.error('Error fetching project details:', error);
      return null;
    }
  }
// lib/actions/notification.actions.ts
'use server';

import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/actions/appwrite";

// Types
export type NotificationType = 'cancellation' | 'filler' | 'comment' | 'attendance';
export type NotificationSource = 'client' | 'student' | 'shift_leader';

export interface DatabaseNotification {
  requestId?: string;
  feedbackId?: string;
  attendanceId?: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  source: NotificationSource;
  sourceName: string;
}

// Function to get notifications from admin requests
async function getRequestNotifications(adminId: string): Promise<DatabaseNotification[]> {
  const { database } = await createAdminClient();
  
  try {
    // Get recent pending admin requests
    const requests = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ADMIN_REQUESTS_COLLECTION_ID!,
      [
        Query.equal('status', ['pending']),
        Query.orderDesc('createdAt'),
        Query.limit(10)
      ]
    );

    const notifications: DatabaseNotification[] = [];

    for (const request of requests.documents) {
      let requesterInfo;
      
      // Get requester info based on requesterId
      const collections = [
        { id: process.env.APPWRITE_STUDENTS_COLLECTION_ID!, type: 'student' as NotificationSource },
        { id: process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!, type: 'shift_leader' as NotificationSource },
        { id: process.env.APPWRITE_CLIENTS_COLLECTION_ID!, type: 'client' as NotificationSource }
      ];

      for (const collection of collections) {
        const response = await database.listDocuments(
          process.env.APPWRITE_DATABASE_ID!,
          collection.id,
          [Query.equal('userId', [request.requesterId])]
        );

        if (response.documents.length > 0) {
          requesterInfo = {
            name: `${response.documents[0].firstName} ${response.documents[0].lastName}`,
            type: collection.type
          };
          break;
        }
      }

      if (requesterInfo) {
        let message = '';
        switch (request.requestType) {
          case 'shiftCancellation':
            message = `${requesterInfo.name} requested shift cancellation`;
            break;
          case 'fillerShiftApplication':
            message = `${requesterInfo.name} applied for filler shift`;
            break;
          case 'availabilityChange':
            message = `${requesterInfo.name} requested availability change`;
            break;
        }

        notifications.push({
          requestId: request.requestId,
          type: request.requestType === 'shiftCancellation' ? 'cancellation' : 'filler',
          message,
          timestamp: request.createdAt,
          source: requesterInfo.type,
          sourceName: requesterInfo.name
        });
      }
    }

    return notifications;
  } catch (error) {
    console.error('Error getting request notifications:', error);
    return [];
  }
}

// Function to get notifications from feedback
async function getFeedbackNotifications(adminId: string): Promise<DatabaseNotification[]> {
  const { database } = await createAdminClient();
  
  try {
    // Get recent unread feedback
    const feedback = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_FEEDBACK_COLLECTION_ID!,
      [
        Query.equal('isRead', [false]),
        Query.orderDesc('createdAt'),
        Query.limit(10)
      ]
    );

    const notifications: DatabaseNotification[] = [];

    for (const fb of feedback.documents) {
      // Get shift leader info
      const leaderInfo = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
        [Query.equal('userId', [fb.submittedBy])]
      );

      if (leaderInfo.documents.length > 0) {
        const leaderName = `${leaderInfo.documents[0].firstName} ${leaderInfo.documents[0].lastName}`;
        
        notifications.push({
          feedbackId: fb.feedbackId,
          type: 'comment',
          message: `New feedback from ${leaderName}`,
          timestamp: fb.createdAt,
          source: 'shift_leader',
          sourceName: leaderName
        });
      }
    }

    return notifications;
  } catch (error) {
    console.error('Error getting feedback notifications:', error);
    return [];
  }
}

// Function to get notifications from attendance
async function getAttendanceNotifications(adminId: string): Promise<DatabaseNotification[]> {
  const { database } = await createAdminClient();
  
  try {
    // Get recent attendance records marked as late or absent
    const attendance = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      [
        Query.equal('attendanceStatus', ['late', 'absent']),
        Query.orderDesc('createdAt'),
        Query.limit(10)
      ]
    );

    const notifications: DatabaseNotification[] = [];

    for (const record of attendance.documents) {
      // Get student info
      const studentInfo = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
        [Query.equal('userId', [record.studentId])]
      );

      if (studentInfo.documents.length > 0) {
        const studentName = `${studentInfo.documents[0].firstName} ${studentInfo.documents[0].lastName}`;
        
        notifications.push({
          attendanceId: record.attendanceId,
          type: 'attendance',
          message: `${studentName} marked as ${record.attendanceStatus}`,
          timestamp: record.createdAt,
          source: 'student',
          sourceName: studentName
        });
      }
    }

    return notifications;
  } catch (error) {
    console.error('Error getting attendance notifications:', error);
    return [];
  }
}

// Main function to get all notifications
export async function getAllNotifications(adminId: string): Promise<DatabaseNotification[]> {
  try {
    const [requestNotifs, feedbackNotifs, attendanceNotifs] = await Promise.all([
      getRequestNotifications(adminId),
      getFeedbackNotifications(adminId),
      getAttendanceNotifications(adminId)
    ]);

    // Combine all notifications and sort by timestamp
    const allNotifications = [...requestNotifs, ...feedbackNotifs, ...attendanceNotifs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return allNotifications;
  } catch (error) {
    console.error('Error getting all notifications:', error);
    return [];
  }
}
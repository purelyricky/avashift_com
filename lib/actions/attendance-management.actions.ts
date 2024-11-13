// lib/actions/attendance-management.actions.ts

"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/actions/appwrite";
import { 
    format, 
    startOfDay, 
    endOfDay, 
    startOfWeek,
    endOfWeek,
    parseISO 
  } from "date-fns";

  // Function to get current week date range
function getCurrentWeekRange() {
    const now = new Date();
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }), // Start from Monday
      to: endOfWeek(now, { weekStartsOn: 1 }) // End on Sunday
    };
  }

// Types for attendance management
interface AttendanceRecord {
  id: number;
  studentId: string;
  name: string;
  avatar?: string;
  scheduledCheckIn: string;
  scheduledCheckOut: string;
  actualCheckIn: string | null;
  actualCheckOut: string | null;
  project: string;
  status: 'present' | 'absent' | 'late' | 'pending';
  shiftId: string;
  date: Date;
}

interface AttendanceStats {
  presentWorkers: number;
  absentWorkers: number;
  timelyArrivals: number;
  lateArrivals: number;
}

// Function to format time to AM/PM format
function formatTime(dateString: string | null): string {
  if (!dateString) return "--";
  return format(new Date(dateString), "hh:mm a");
}

// Function to get attendance records
export async function getAttendanceRecords(params: {
    userId: string;
    dateRange?: { from: Date; to: Date };
    searchTerm?: string;
    page: number;
    limit: number;
  }): Promise<{
    records: AttendanceRecord[];
    stats: AttendanceStats;
    total: number;
  }> {
    const { database } = await createAdminClient();
    
    try {
      // If no date range is provided, use current week
      const effectiveDateRange = params.dateRange || getCurrentWeekRange();
  
      // Get projects where user is member or owner
      const userProjects = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
        [Query.equal("userId", [params.userId])]
      );
  
      const projectIds = userProjects.documents.map(p => p.projectId);
      
      if (projectIds.length === 0) {
        return { 
          records: [], 
          stats: { presentWorkers: 0, absentWorkers: 0, timelyArrivals: 0, lateArrivals: 0 }, 
          total: 0 
        };
      }
  
      // Get shifts for these projects with date filter
      const fromDate = startOfDay(effectiveDateRange.from).toISOString();
      const toDate = endOfDay(effectiveDateRange.to).toISOString();
      
      const shifts = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
        [
          Query.equal("projectId", projectIds),
          Query.greaterThanEqual("date", fromDate),
          Query.lessThanEqual("date", toDate)
        ]
      );
  
      if (shifts.documents.length === 0) {
        return { 
          records: [], 
          stats: { presentWorkers: 0, absentWorkers: 0, timelyArrivals: 0, lateArrivals: 0 }, 
          total: 0 
        };
      }
  
      // Get attendance records for these shifts
      const shiftIds = shifts.documents.map(s => s.shiftId);
      
      const attendance = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
        [Query.equal("shiftId", shiftIds)]
      );
  
      // Get all students involved
      const studentIds = Array.from(new Set(attendance.documents.map(a => a.studentId)));
      
      if (studentIds.length === 0) {
        return { 
          records: [], 
          stats: { presentWorkers: 0, absentWorkers: 0, timelyArrivals: 0, lateArrivals: 0 }, 
          total: 0 
        };
      }
  
      const students = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
        [Query.equal("userId", studentIds)]
      );
  
      // Get project details
      const projects = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
        [Query.equal("projectId", projectIds)]
      );
  
      // Calculate stats
      const stats = calculateAttendanceStats(attendance.documents, shifts.documents);
  
      // Process and format records
      let records = attendance.documents.map(record => {
        const shift = shifts.documents.find(s => s.shiftId === record.shiftId);
        const student = students.documents.find(s => s.userId === record.studentId);
        const project = projects.documents.find(p => p.projectId === shift?.projectId);
  
        // Format date for display
        const shiftDate = shift?.date ? parseISO(shift.date) : new Date(record.createdAt);
  
        return {
          id: parseInt(record.$id),
          studentId: record.studentId,
          name: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
          scheduledCheckIn: formatTime(shift?.startTime),
          scheduledCheckOut: formatTime(shift?.stopTime),
          actualCheckIn: formatTime(record.clockInTime),
          actualCheckOut: formatTime(record.clockOutTime),
          project: project?.name || 'Unknown Project',
          status: record.attendanceStatus,
          shiftId: record.shiftId,
          date: shiftDate,
          // Add formatted date for display if needed
          formattedDate: format(shiftDate, 'MMM dd, yyyy')
        };
      });
  
      // Apply search filter if provided
      if (params.searchTerm) {
        records = records.filter(record => 
          record.name.toLowerCase().includes(params.searchTerm!.toLowerCase())
        );
      }
  
      // Sort records by date, most recent first
      records.sort((a, b) => b.date.getTime() - a.date.getTime());
  
      // Calculate pagination
      const total = records.length;
      const start = (params.page - 1) * params.limit;
      const end = start + params.limit;
      records = records.slice(start, end);
  
      return {
        records,
        stats,
        total
      };
  
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      throw error;
    }
  }

  function calculateAttendanceStats(
    attendanceRecords: any[],
    shifts: any[]
  ): AttendanceStats {
    const stats = {
      presentWorkers: 0,
      absentWorkers: 0,
      timelyArrivals: 0,
      lateArrivals: 0
    };
  
    attendanceRecords.forEach(record => {
      const shift = shifts.find(s => s.shiftId === record.shiftId);
      
      if (record.attendanceStatus === 'present') {
        stats.presentWorkers++;
        
        if (shift && record.clockInTime) {
          const scheduledStart = parseISO(shift.startTime);
          const actualStart = parseISO(record.clockInTime);
          
          // Check if arrival is within 30 minutes of scheduled time
          const timeDiff = Math.abs(actualStart.getTime() - scheduledStart.getTime()) / (1000 * 60);
          if (timeDiff <= 30) {
            stats.timelyArrivals++;
          } else {
            stats.lateArrivals++;
          }
        }
      } else if (record.attendanceStatus === 'absent') {
        stats.absentWorkers++;
      }
    });
  
    return stats;
  }

// Messages table schema and types (for future implementation)
/*
APPWRITE_MESSAGES_COLLECTION_ID: MESSAGES_COLLECTION_ID,
table: messages
- messageId (string, 36) [Primary Key, Required]
- senderId (string, 36) [Required]
- receiverId (string, 36) [Required]
- senderRole (string[enum: 'admin', 'client', 'student', 'shiftLeader', 'gateman']) [Required]
- receiverRole (string[enum: 'admin', 'client', 'student', 'shiftLeader', 'gateman']) [Required]
- content (string, 1000) [Required]
- status (string[enum: 'sent', 'delivered', 'read']) [Required]
- relatedEntityType (string[enum: 'shift', 'attendance', 'project']) [Required]
- relatedEntityId (string, 36) [Required]
- createdAt (datetime) [Required]
- updatedAt (datetime) [Required]
*/

// Message-related functions for future implementation
export async function sendMessage(data: {
  senderId: string;
  receiverId: string;
  senderRole: string;
  receiverRole: string;
  content: string;
  relatedEntityType: string;
  relatedEntityId: string;
}): Promise<boolean> {
  // Implementation will be added when messaging feature is ready
  return true;
}
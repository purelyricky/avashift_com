'use server';

import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/actions/appwrite";
import { startOfWeek, endOfWeek } from 'date-fns';

// Types for the reports data
export type ReportData = {
  id: string;
  name: string;
  avatar?: string;
  shiftsCompleted: number;
  trackedHours: number;
  lostHours: number;
  datesWorked: number[];
  projects: string[];
};

export type DateRangeType = {
  from?: Date;
  to?: Date;
};

export type ReportSummary = {
  totalShifts: number;
  totalTrackedHours: number;
  totalLostHours: number;
};

// Helper function to calculate hours between dates
function calculateHours(
  scheduledStart: Date,
  scheduledEnd: Date,
  actualStart: Date,
  actualEnd: Date
): { trackedHours: number; lostHours: number } {
  // Convert all dates to timestamps for easier comparison
  const scheduled = {
    start: scheduledStart.getTime(),
    end: scheduledEnd.getTime()
  };
  const actual = {
    start: actualStart.getTime(),
    end: actualEnd.getTime()
  };

  // Calculate lost hours due to late start
  const lateStart = Math.max(0, actual.start - scheduled.start);
  
  // Calculate lost hours due to early end
  const earlyEnd = Math.max(0, scheduled.end - actual.end);
  
  // Total lost hours
  const totalLostMilliseconds = lateStart + earlyEnd;
  const lostHours = totalLostMilliseconds / (1000 * 60 * 60);

  // Calculate tracked hours (time between actual start and end, capped at scheduled times)
  const effectiveStart = Math.max(scheduled.start, actual.start);
  const effectiveEnd = Math.min(scheduled.end, actual.end);
  const trackedMilliseconds = Math.max(0, effectiveEnd - effectiveStart);
  const trackedHours = trackedMilliseconds / (1000 * 60 * 60);

  return {
    trackedHours: Math.round(trackedHours * 100) / 100,
    lostHours: Math.round(lostHours * 100) / 100
  };
}

export async function getReportsData(
  userId: string,
  dateRange?: DateRangeType,
  searchTerm?: string
): Promise<{ data: ReportData[]; summary: ReportSummary }> {
  try {
    const { database } = await createAdminClient();

    // Get current date range if none provided
    const currentDate = new Date();
    const from = dateRange?.from || startOfWeek(currentDate);
    const to = dateRange?.to || endOfWeek(currentDate);

    // Get all projects where the user is a member
    const projectMembers = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    );

    const projectIds = projectMembers.documents.map(pm => pm.projectId);

    if (projectIds.length === 0) {
      return { 
        data: [],
        summary: { totalShifts: 0, totalTrackedHours: 0, totalLostHours: 0 }
      };
    }

    // Get all shifts for these projects within date range
    const shifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal('projectId', projectIds),
        Query.greaterThanEqual('startTime', from.toISOString()),
        Query.lessThanEqual('startTime', to.toISOString())
      ]
    );

    // Get all projects
    const projects = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      [Query.equal('projectId', projectIds)]
    );

    // Get all students who are members of these projects
    const studentMembers = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal('projectId', projectIds),
        Query.equal('membershipType', ['student']),
        Query.equal('status', ['active'])
      ]
    );

    // Get all student details
    const studentIds = Array.from(new Set(studentMembers.documents.map(sm => sm.userId)));
    const students = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      [Query.equal('userId', studentIds)]
    );

    // Get attendance records
    const attendance = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      [
        Query.equal('studentId', studentIds),
        Query.equal('attendanceStatus', ['present', 'late']),
        Query.isNotNull('clockInTime'),
        Query.isNotNull('clockOutTime')
      ]
    );

    // Process data for each student
    const reportData: ReportData[] = [];
    let summaryData = { totalShifts: 0, totalTrackedHours: 0, totalLostHours: 0 };

    for (const student of students.documents) {
      // Skip if search term is provided and student name doesn't match
      if (searchTerm && !`${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())) {
        continue;
      }

      const studentAttendance = attendance.documents.filter(a => a.studentId === student.userId);
      
      let trackedHours = 0;
      let lostHours = 0;
      const datesWorked = new Set<number>();
      const studentProjects = new Set<string>();

      for (const record of studentAttendance) {
        const shift = shifts.documents.find(s => s.shiftId === record.shiftId);
        if (shift) {
          // Calculate hours
          const { trackedHours: tracked, lostHours: lost } = calculateHours(
            new Date(shift.startTime),
            new Date(shift.stopTime),
            new Date(record.clockInTime),
            new Date(record.clockOutTime)
          );
          
          trackedHours += tracked;
          lostHours += lost;

          // Add date to datesWorked (just the day of the month)
          datesWorked.add(new Date(shift.startTime).getDate());

          // Add project to student's projects
          const project = projects.documents.find(p => p.projectId === shift.projectId);
          if (project) {
            studentProjects.add(project.name);
          }
        }
      }

      reportData.push({
        id: student.userId,
        name: `${student.firstName} ${student.lastName}`,
        shiftsCompleted: studentAttendance.length,
        trackedHours: Math.round(trackedHours * 100) / 100,
        lostHours: Math.round(lostHours * 100) / 100,
        datesWorked: Array.from(datesWorked).sort((a, b) => a - b),
        projects: Array.from(studentProjects)
      });

      // Update summary
      summaryData.totalShifts += studentAttendance.length;
      summaryData.totalTrackedHours += trackedHours;
      summaryData.totalLostHours += lostHours;
    }

    // Round summary values
    summaryData.totalTrackedHours = Math.round(summaryData.totalTrackedHours * 100) / 100;
    summaryData.totalLostHours = Math.round(summaryData.totalLostHours * 100) / 100;

    return { 
      data: reportData,
      summary: summaryData
    };
  } catch (error) {
    console.error('Error fetching reports data:', error);
    return { 
      data: [],
      summary: { totalShifts: 0, totalTrackedHours: 0, totalLostHours: 0 }
    };
  }
}
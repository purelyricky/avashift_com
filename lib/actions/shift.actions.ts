'use server';

import { Query, ID } from 'node-appwrite';
import { createAdminClient } from '@/lib/actions/appwrite';

export async function getTodaysShifts(userId: string) {
  const { database } = await createAdminClient();
  
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  try {
    // Get shifts assigned to the user for today
    const assignments = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [
        Query.equal('studentId', [userId]),
        Query.equal('status', ['assigned', 'confirmed', 'completed'])
      ]
    );

    if (assignments.documents.length === 0) {
      return [];
    }

    const shiftIds = assignments.documents.map(assignment => assignment.shiftId);

    // Get shift details
    const shifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal('shiftId', shiftIds),
        Query.greaterThanEqual('startTime', startOfDay),
        Query.lessThanEqual('startTime', endOfDay)
      ]
    );

    // Get project details
    const projectIds = shifts.documents.map(shift => shift.projectId);
    const projects = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      [Query.equal('projectId', projectIds)]
    );

    // Get shift leader details
    const shiftLeaderIds = shifts.documents.map(shift => shift.shiftLeaderId);
    const shiftLeaders = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
      [Query.equal('userId', shiftLeaderIds)]
    );

    // Get attendance records
    const attendance = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      [
        Query.equal('shiftId', shiftIds),
        Query.equal('studentId', [userId])
      ]
    );

    // Combine all data
    return shifts.documents.map(shift => {
      const project = projects.documents.find(p => p.projectId === shift.projectId);
      const shiftLeader = shiftLeaders.documents.find(sl => sl.userId === shift.shiftLeaderId);
      const attendanceRecord = attendance.documents.find(a => a.shiftId === shift.shiftId);

      return {
        shiftId: shift.shiftId,
        projectId: shift.projectId,
        projectName: project?.name || 'Unknown Project',
        startTime: shift.startTime,
        stopTime: shift.stopTime,
        actualStartTime: attendanceRecord?.clockInTime,
        actualStopTime: attendanceRecord?.clockOutTime,
        shiftLeaderId: shift.shiftLeaderId,
        shiftLeaderName: `${shiftLeader?.firstName} ${shiftLeader?.lastName}` || 'Unknown Leader',
        status: attendanceRecord?.clockOutTime ? 'completed' : 
                attendanceRecord?.clockInTime ? 'inProgress' : 'pending',
        clockInVerifiedBy: attendanceRecord?.clockInVerifiedBy
      };
    });
  } catch (error) {
    console.error('Error fetching today\'s shifts:', error);
    throw error;
  }
}

export async function clockInStudent({
  shiftId,
  studentId,
  gatemanId,
  qrData
}: {
  shiftId: string;
  studentId: string;
  gatemanId: string;
  qrData: string;
}) {
  const { database } = await createAdminClient();

  try {
    // Verify QR data
    const parsedQrData = JSON.parse(qrData);
    if (parsedQrData.userId !== studentId || parsedQrData.shiftId !== shiftId) {
      throw new Error('Invalid QR code data');
    }

    // Create or update attendance record
    const attendance = await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      ID.unique(),
      {
        shiftId,
        studentId,
        clockInTime: new Date().toISOString(),
        clockInVerifiedBy: gatemanId,
        attendanceStatus: 'present',
        createdAt: new Date().toISOString()
      }
    );

    return attendance;
  } catch (error) {
    console.error('Error clocking in student:', error);
    throw error;
  }
}

export async function clockOutStudent({
  shiftId,
  studentId
}: {
  shiftId: string;
  studentId: string;
}) {
  const { database } = await createAdminClient();

  try {
    // Get existing attendance record
    const attendanceRecords = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      [
        Query.equal('shiftId', [shiftId]),
        Query.equal('studentId', [studentId])
      ]
    );

    if (attendanceRecords.documents.length === 0) {
      throw new Error('No attendance record found');
    }

    const attendance = attendanceRecords.documents[0];

    // Update attendance record with clock out time
    const updatedAttendance = await database.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      attendance.$id,
      {
        clockOutTime: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );

    return updatedAttendance;
  } catch (error) {
    console.error('Error clocking out student:', error);
    throw error;
  }
}
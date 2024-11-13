// attendance.actions.ts
'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/actions/appwrite';

interface VerificationData {
  userId: string;
  shiftId: string;
  projectId: string;
  timestamp: string;
}

interface AttendanceData {
  shiftId: string;
  studentId: string;
  gatemanId: string;
  projectId: string;
}

export async function verifyStudentShift(data: VerificationData) {
  const { database } = await createAdminClient();
  
  try {
    // 1. Verify the shift assignment exists and is valid
    const shiftAssignment = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [
        Query.equal('shiftId', [data.shiftId]),
        Query.equal('studentId', [data.userId]),
        Query.equal('status', ['assigned', 'confirmed'])
      ]
    );

    if (shiftAssignment.documents.length === 0) {
      throw new Error('No valid shift assignment found');
    }

    // 2. Get shift details
    const shift = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      data.shiftId
    );

    // 3. Verify shift timing
    const now = new Date();
    const shiftStart = new Date(shift.startTime);
    const shiftEnd = new Date(shift.stopTime);

    // Allow clock-in 30 minutes before shift start
    shiftStart.setMinutes(shiftStart.getMinutes() - 30);
    
    if (now < shiftStart || now > shiftEnd) {
      throw new Error('Outside valid clock-in window');
    }

    // 4. Get student details
    const student = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      data.userId
    );

    // 5. Get project details
    const project = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      data.projectId
    );

    // Return verified data
    return {
      userId: student.userId,
      firstName: student.firstName,
      lastName: student.lastName,
      shiftId: shift.shiftId,
      projectId: project.projectId,
      projectName: project.name,
      startTime: shift.startTime,
      stopTime: shift.stopTime
    };

  } catch (error) {
    console.error('Error verifying student shift:', error);
    throw error;
  }
}

export async function createAttendanceRecord(data: AttendanceData) {
  const { database } = await createAdminClient();
  
  try {
    // 1. Check for existing attendance record
    const existingAttendance = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      [
        Query.equal('shiftId', [data.shiftId]),
        Query.equal('studentId', [data.studentId]),
        Query.isNull('clockOutTime')
      ]
    );

    if (existingAttendance.documents.length > 0) {
      throw new Error('Student already clocked in');
    }

    // 2. Create new attendance record
    const attendance = await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      ID.unique(),
      {
        attendanceId: ID.unique(),
        shiftId: data.shiftId,
        studentId: data.studentId,
        qrCode: ID.unique(), // Generate unique QR code ID
        clockInTime: new Date().toISOString(),
        clockOutTime: null,
        attendanceStatus: 'pending',
        clockInVerifiedBy: data.gatemanId,
        markedByLeader: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );

    return attendance;

  } catch (error) {
    console.error('Error creating attendance record:', error);
    throw error;
  }
}

export async function updateShiftAssignment(data: { shiftId: string; studentId: string }) {
  const { database } = await createAdminClient();
  
  try {
    // 1. Get current assignment
    const assignments = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [
        Query.equal('shiftId', [data.shiftId]),
        Query.equal('studentId', [data.studentId])
      ]
    );

    if (assignments.documents.length === 0) {
      throw new Error('No assignment found');
    }

    const assignment = assignments.documents[0];

    // 2. Update assignment status
    const updatedAssignment = await database.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      assignment.$id,
      {
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );

    return updatedAssignment;

  } catch (error) {
    console.error('Error updating shift assignment:', error);
    throw error;
  }
}
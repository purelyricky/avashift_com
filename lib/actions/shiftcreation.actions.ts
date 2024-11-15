// app/actions/shift-management.actions.ts

'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/actions/appwrite";

// Helper function to combine date and time
function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

// Get user's accessible projects
export async function getUserProjects(userId: string) {
  try {
    const { database } = await createAdminClient();

    // Get user's project memberships
    const memberships = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal('userId', [userId]),
        Query.equal('status', ['active'])
      ]
    );

    const projectIds = memberships.documents.map(m => m.projectId);
    
    if (projectIds.length === 0) {
      return [];
    }

    // Get project details
    const projects = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      [
        Query.equal('projectId', projectIds),
        Query.equal('status', ['active'])
      ]
    );

    return projects.documents.map(project => ({
      id: project.projectId,
      name: project.name
    }));
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return [];
  }
}

// Get project members by role
export async function getProjectMembers(projectId: string, membershipType: 'shiftLeader' | 'gateman') {
  try {
    const { database } = await createAdminClient();

    // Get members of specified type
    const members = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal('projectId', [projectId]),
        Query.equal('membershipType', [membershipType]),
        Query.equal('status', ['active'])
      ]
    );

    // Get user details for each member
    const collectionId = membershipType === 'shiftLeader' 
      ? process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!
      : process.env.APPWRITE_GATEMEN_COLLECTION_ID!;

    const userIds = members.documents.map(m => m.userId);
    
    if (userIds.length === 0) {
      return [];
    }

    const userDetails = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      collectionId,
      [Query.equal('userId', userIds)]
    );

    return userDetails.documents.map(user => ({
      id: user.userId,
      name: `${user.firstName} ${user.lastName}`
    }));
  } catch (error) {
    console.error('Error fetching project members:', error);
    return [];
  }
}

// lib/actions/shiftcreation.actions.ts

export async function getProjectShifts(projectId: string) {
    try {
      const { database } = await createAdminClient();
  
      const shifts = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
        [
          Query.equal('projectId', [projectId]),
          Query.equal('status', ['draft', 'published', 'inProgress']), // Only get active shifts
          Query.orderDesc('$createdAt') // Order by creation date, newest first
        ]
      );
  
      if (shifts.total === 0) {
        return [];
      }
  
      return shifts.documents;
    } catch (error) {
      console.error('Error fetching project shifts:', error);
      return [];
    }
  }
  
  // Add a new function to get all shifts for the user's projects
  export async function getAllProjectsWithShifts(userId: string) {
    try {
      const { database } = await createAdminClient();
  
      // Get current date at start of day in ISO format
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      const isoCurrentDate = currentDate.toISOString();
  
      // Get user's project memberships
      const memberships = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
        [
          Query.equal('userId', [userId]),
          Query.equal('status', ['active'])
        ]
      );
  
      const projectIds = memberships.documents.map(m => m.projectId);
      
      if (projectIds.length === 0) {
        return [];
      }
  
      // Get projects
      const projects = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
        [Query.equal('projectId', projectIds)]
      );
  
      // Get shifts
      const shifts = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
        [
          Query.equal('projectId', projectIds),
          Query.equal('status', ['draft', 'published', 'inProgress']),
          Query.greaterThanEqual('startTime', isoCurrentDate),
          Query.orderAsc('startTime')
        ]
      );
  
      // Get all unique leader and gateman IDs from shifts
      const leaderIds = Array.from(new Set(shifts.documents.map(shift => shift.shiftLeaderId)));
      const gatemanIds = Array.from(new Set(shifts.documents.map(shift => shift.gatemanId)));
  
      // Fetch all leaders and gatemen in bulk
      const [leaders, gatemen] = await Promise.all([
        database.listDocuments(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
          [Query.equal('userId', leaderIds)]
        ),
        database.listDocuments(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_GATEMEN_COLLECTION_ID!,
          [Query.equal('userId', gatemanIds)]
        )
      ]);
  
      // Create lookup maps for quick access
      const leaderMap = new Map(leaders.documents.map(leader => 
        [leader.userId, `${leader.firstName} ${leader.lastName}`]
      ));
      const gatemanMap = new Map(gatemen.documents.map(gateman => 
        [gateman.userId, `${gateman.firstName} ${gateman.lastName}`]
      ));
  
      // Group shifts by project with resolved names
      const projectsWithShifts = projects.documents.map(project => {
        const projectShifts = shifts.documents
          .filter(shift => shift.projectId === project.projectId)
          .map(shift => ({
            startDate: new Date(shift.startTime).toISOString().split('T')[0],
            startTime: new Date(shift.startTime).toTimeString().slice(0, 5),
            endDate: new Date(shift.stopTime).toISOString().split('T')[0],
            endTime: new Date(shift.stopTime).toTimeString().slice(0, 5),
            day: shift.dayOfWeek,
            workers: shift.requiredStudents,
            type: shift.timeType,
            leader: shift.shiftLeaderId,
            leaderName: leaderMap.get(shift.shiftLeaderId) || shift.shiftLeaderId,
            securityGuard: shift.gatemanId,
            securityGuardName: gatemanMap.get(shift.gatemanId) || shift.gatemanId,
            shiftType: shift.shiftType,
            shiftId: shift.shiftId
          }));
  
        if (projectShifts.length === 0) return null;
  
        return {
          id: project.projectId,
          name: project.name,
          status: project.status,
          shifts: projectShifts
        };
      }).filter(Boolean);
  
      return projectsWithShifts;
    } catch (error) {
      console.error('Error fetching all projects with shifts:', error);
      return [];
    }
  }
  
// Create new shift
export async function createShift(shiftData: {
  projectId: string;
  shiftLeaderId: string;
  gatemanId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  dayOfWeek: string;
  requiredStudents: number;
  timeType: 'day' | 'night';
  shiftType: 'normal' | 'filler';
  createdBy: string;
}) {
  try {
    const { database } = await createAdminClient();
    const shiftId = ID.unique();
    const currentTime = new Date().toISOString();

    const startTime = combineDateAndTime(shiftData.startDate, shiftData.startTime);
    const stopTime = combineDateAndTime(shiftData.endDate, shiftData.endTime);

    await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftId,
      {
        shiftId,
        projectId: shiftData.projectId,
        shiftLeaderId: shiftData.shiftLeaderId,
        gatemanId: shiftData.gatemanId,
        date: shiftData.startDate,
        dayOfWeek: shiftData.dayOfWeek,
        timeType: shiftData.timeType,
        startTime,
        stopTime,
        requiredStudents: shiftData.requiredStudents,
        assignedCount: 0,
        shiftType: shiftData.shiftType,
        status: 'published',
        createdBy: shiftData.createdBy,
        createdAt: currentTime,
        updatedAt: currentTime
      }
    );

    return { status: 'success' };
  } catch (error) {
    console.error('Error creating shift:', error);
    return { status: 'error', message: 'Failed to create shift' };
  }
}

// Update existing shift
export async function updateShift(shiftId: string, shiftData: {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  dayOfWeek: string;
  requiredStudents: number;
  timeType: 'day' | 'night';
  shiftType: 'normal' | 'filler';
  shiftLeaderId: string;
  gatemanId: string;
}) {
  try {
    const { database } = await createAdminClient();
    const currentTime = new Date().toISOString();

    const startTime = combineDateAndTime(shiftData.startDate, shiftData.startTime);
    const stopTime = combineDateAndTime(shiftData.endDate, shiftData.endTime);

    await database.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      shiftId,
      {
        date: shiftData.startDate,
        dayOfWeek: shiftData.dayOfWeek,
        timeType: shiftData.timeType,
        startTime,
        stopTime,
        requiredStudents: shiftData.requiredStudents,
        shiftType: shiftData.shiftType,
        shiftLeaderId: shiftData.shiftLeaderId,
        gatemanId: shiftData.gatemanId,
        updatedAt: currentTime
      }
    );

    return { status: 'success' };
  } catch (error) {
    console.error('Error updating shift:', error);
    return { status: 'error', message: 'Failed to update shift' };
  }
}
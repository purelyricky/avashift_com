'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/actions/appwrite";
import { cookies } from "next/headers";
import { parseStringify } from "../utils";
import calculateHours from "../calculate";

const getCollectionIdForRole = (role: UserRole) => {
  switch (role) {
    case 'admin': return process.env.APPWRITE_ADMINS_COLLECTION_ID;
    case 'client': return process.env.APPWRITE_CLIENTS_COLLECTION_ID;
    case 'student': return process.env.APPWRITE_STUDENTS_COLLECTION_ID;
    case 'shiftLeader': return process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID;
    case 'gateman': return process.env.APPWRITE_GATEMEN_COLLECTION_ID;
    default: throw new Error('Invalid role');
  }
};

type AvailabilityAge = 'new' | 'old';
// Availability Time Types
type TimeType = 'day' | 'night';

// Day of Week Type (if not already defined)
type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

// Interface for Availability Response
interface AvailabilityResponse {
  status: 'success' | 'error';
  data?: Array<{
    dateRange: {
      fromDate: string;
      toDate: string;
    };
    availabilities: Array<{
      dayOfWeek: DayOfWeek;
      timeType: TimeType;
    }>;
  }> | null;
  message?: string;
}

const findUserInCollection = async (database: any, email: string) => {
  const collections = [
    { id: process.env.APPWRITE_ADMINS_COLLECTION_ID!, role: 'admin' as UserRole },
    { id: process.env.APPWRITE_CLIENTS_COLLECTION_ID!, role: 'client' as UserRole },
    { id: process.env.APPWRITE_STUDENTS_COLLECTION_ID!, role: 'student' as UserRole },
    { id: process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!, role: 'shiftLeader' as UserRole },
    { id: process.env.APPWRITE_GATEMEN_COLLECTION_ID!, role: 'gateman' as UserRole },
  ];

  for (const collection of collections) {
    try {
      const response = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        collection.id,
        [Query.equal('email', [email])]
      );

      if (response.documents.length > 0) {
        return {
          ...response.documents[0],
          role: collection.role
        };
      }
    } catch (error) {
      console.error(`Error checking collection ${collection.id}:`, error);
    }
  }

  return null;
};

export const signUp = async ({ role, ...userData }: SignUpWithRoleData) => {
  const { email, password, firstName, lastName, phone } = userData;
  
  try {
    const { account, database } = await createAdminClient();

    // Create Appwrite account
    const newAccount = await account.create(
      ID.unique(), 
      email, 
      password, 
      `${firstName} ${lastName}`
    );

    // Base user data that's common to all roles
    const baseUserData = {
      userId: newAccount.$id,
      role, // Direct role assignment
      firstName,
      lastName,
      email,
      phone: phone || null,
      createdAt: new Date().toISOString()
    };

    // Add role-specific fields
    const additionalFields: Record<UserRole, object> = {
      student: {
        dateOfBirth: null,
        availabilityStatus: 'active',
        punctualityScore: 100.0,
        rating: 5.0
      },
      admin: {},
      client: {},
      shiftLeader: {},
      gateman: {
        clientId: null
      }
    };

    // Create user document in appropriate collection
    const collectionId = getCollectionIdForRole(role);
    await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      collectionId!,
      ID.unique(),
      {
        ...baseUserData,
        ...additionalFields[role]
      }
    );

    return true;
  } catch (error) {
    console.error('Error in signUp:', error);
    throw error;
  }
};

export const signIn = async ({ email, password }: LoginUser) => {
  try {
    const { account, database } = await createAdminClient();
    
    // Create session
    const session = await account.createEmailPasswordSession(email, password);
    
    // Find user data in collections using email
    const userData = await findUserInCollection(database, email);
    
    if (!userData) {
      throw new Error('User not found');
    }

    // Set session cookie
    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    // Return user data including role
    return {
      ...userData,
      role: userData.role
    };
  } catch (error) {
    console.error('Error in signIn:', error);
    throw error;
  }
};

//Get Logged In user

export async function getUserInfo({ userId }: getUserInfoProps): Promise<UserResponse> {
    try {
      const { database } = await createAdminClient();
      
      const collections = [
        { id: process.env.APPWRITE_ADMINS_COLLECTION_ID!, role: 'admin' as UserRole },
        { id: process.env.APPWRITE_CLIENTS_COLLECTION_ID!, role: 'client' as UserRole },
        { id: process.env.APPWRITE_STUDENTS_COLLECTION_ID!, role: 'student' as UserRole },
        { id: process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!, role: 'shiftLeader' as UserRole },
        { id: process.env.APPWRITE_GATEMEN_COLLECTION_ID!, role: 'gateman' as UserRole },
      ];
  
      for (const collection of collections) {
        try {
          const response = await database.listDocuments(
            process.env.APPWRITE_DATABASE_ID!,
            collection.id,
            [Query.equal('userId', [userId])]
          );
  
          if (response.documents.length > 0) {
            const doc = response.documents[0];
            
            // Create base user data from document
            const baseUserData: BaseUser = {
              userId: doc.userId,
              role: collection.role,
              firstName: doc.firstName,
              lastName: doc.lastName,
              email: doc.email,
              phone: doc.phone || null,
              createdAt: doc.$createdAt
            };
  
            let userData: User;
            
            if (collection.role === 'student') {
              userData = {
                ...baseUserData,
                role: 'student',
                dateOfBirth: doc.dateOfBirth || null,
                availabilityStatus: doc.availabilityStatus || 'inactive',
                punctualityScore: Number(doc.punctualityScore) || 100,
                rating: Number(doc.rating) || 5.0
              } as StudentUser;
            } else if (collection.role === 'gateman') {
              userData = {
                ...baseUserData,
                role: 'gateman',
                clientId: doc.clientId || null
              } as GatemanUser;
            } else {
              userData = baseUserData;
            }
  
            return parseStringify({
              status: 'success',
              data: userData
            });
          }
        } catch (error) {
          console.error(`Error checking collection ${collection.id}:`, error);
          continue;
        }
      }
  
      return parseStringify({
        status: 'error',
        data: null,
        message: 'User not found'
      });
    } catch (error) {
      console.error('Error in getUserInfo:', error);
      return parseStringify({
        status: 'error',
        data: null,
        message: 'Internal server error'
      });
    }
  }
  
  export async function getLoggedInUser(): Promise<UserResponse> {
    try {
      const { account } = await createSessionClient();
      
      const currentUser = await account.get();
      
      if (!currentUser) {
        return parseStringify({
          status: 'error',
          data: null,
          message: 'No user session found'
        });
      }
  
      return await getUserInfo({ userId: currentUser.$id });
    } catch (error) {
      console.error('Error in getLoggedInUser:', error);
      return parseStringify({
        status: 'error',
        data: null,
        message: 'Failed to get logged in user'
      });
    }
  }

//Function for Getting Logged In User End

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();
    cookies().delete('appwrite-session');
    await account.deleteSession('current');
  } catch (error) {
    return null;
  }
};

// ========================================
// Calculation Actions
// ========================================

export async function getStudentProjectStats(userId: string): Promise<EnhancedStudentProjectStats> {
  const { database } = await createAdminClient();
  
  const currentDate = new Date();
  const firstDayOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1));

  try {
    // Get student info for punctuality score
    const studentInfo = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    );

    const punctualityScore = studentInfo.documents[0]?.punctualityScore || 100.0;

    // Get ALL project memberships regardless of status
    const projectMembers = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    );

    if (projectMembers.documents.length === 0) {
      return {
        totalProjects: 0,
        activeProjects: 0,
        projectHours: [],
        totalMonthlyHours: 0,
        totalLostHours: 0,
        completedShiftsCount: 0,
        upcomingShiftsCount: 0,
        punctualityScore
      };
    }

    // Get ALL projects without filtering
    const projectIds = Array.from(new Set(projectMembers.documents.map(pm => pm.projectId)));
    const projects = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      [Query.equal('projectId', projectIds)]
    );

    // Get only currently active projects count
    const activeProjects = projects.documents.filter(project => 
      project.status === 'active' && 
      projectMembers.documents.some(pm => 
        pm.projectId === project.projectId && 
        pm.status === 'active'
      )
    ).length;

    // Get ALL shifts for these projects
    const shifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [Query.equal('projectId', projectIds)]
    );

    // Get ALL assignments
    const shiftAssignments = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [Query.equal('studentId', [userId])]
    );

    // Get attendance records
    const attendance = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      [
        Query.equal('studentId', [userId]),
        Query.equal('attendanceStatus', ['present'])
      ]
    );

    // Count completed shifts for current month
    const completedShiftsCount = attendance.documents.filter(a => {
      const clockInDate = new Date(a.clockInTime);
      return clockInDate >= firstDayOfMonth && 
             clockInDate <= currentDate && 
             a.clockOutTime !== null;
    }).length;

    // Count upcoming shifts
    const upcomingShifts = shifts.documents.filter(shift => {
      const isAssigned = shiftAssignments.documents.some(
        sa => sa.shiftId === shift.shiftId && 
             sa.status === 'assigned'
      );
      const shiftDate = new Date(shift.startTime);
      return isAssigned && shiftDate > currentDate;
    });

    // Calculate project hours including all projects
    const projectHours: ProjectShiftStats[] = [];
    const colors = ['#0747b6', '#2265d8', '#2f91fa'];

    for (const project of projects.documents) {
      const projectShifts = shifts.documents.filter(s => s.projectId === project.projectId);
      let totalTrackedHours = 0;
      let totalLostHours = 0;
      let shiftsCompleted = 0;

      for (const shift of projectShifts) {
        const attendanceRecord = attendance.documents.find(a => a.shiftId === shift.shiftId);
        
        if (attendanceRecord?.clockInTime && attendanceRecord?.clockOutTime) {
          shiftsCompleted++;
          const { trackedHours, lostHours } = calculateHours(
            new Date(shift.startTime),
            new Date(shift.stopTime),
            new Date(attendanceRecord.clockInTime),
            new Date(attendanceRecord.clockOutTime)
          );
          totalTrackedHours += trackedHours;
          totalLostHours += lostHours;
        }
      }

      const membershipStatus = projectMembers.documents.find(
        pm => pm.projectId === project.projectId
      )?.status || 'inactive';

      projectHours.push({
        projectId: project.projectId,
        projectName: project.name,
        projectStatus: project.status,
        membershipStatus,
        trackedHours: Math.round(totalTrackedHours * 100) / 100,
        lostHours: Math.round(totalLostHours * 100) / 100,
        shiftsCompleted,
        color: colors[projectHours.length % colors.length]
      });
    }

    const totalMonthlyHours = projectHours.reduce((sum, p) => sum + p.trackedHours, 0);
    const totalLostHours = projectHours.reduce((sum, p) => sum + p.lostHours, 0);

    return {
      totalProjects: projects.documents.length,
      activeProjects,
      projectHours,
      totalMonthlyHours: Math.round(totalMonthlyHours * 100) / 100,
      totalLostHours: Math.round(totalLostHours * 100) / 100,
      completedShiftsCount,
      upcomingShiftsCount: upcomingShifts.length,
      punctualityScore
    };

  } catch (error) {
    console.error('Error calculating student project stats:', error);
    return {
      totalProjects: 0,
      activeProjects: 0,
      projectHours: [],
      totalMonthlyHours: 0,
      totalLostHours: 0,
      completedShiftsCount: 0,
      upcomingShiftsCount: 0,
      punctualityScore: 100.0
    };
  }
}


//==========================================================
// Quick Actions Functions
//==========================================================

export const updateAvailability = async (availabilityData: {
  userId: string;
  fromDate: string;
  toDate: string;
  dayOfWeek: string;
  timeType: 'day' | 'night';
  status: 'active' | 'inactive';
}) => {
  const { userId, fromDate, toDate, dayOfWeek, timeType, status } = availabilityData;
  const currentTimestamp = new Date().toISOString();

  try {
    const { database } = await createAdminClient();

    // Only update existing availabilities to 'old' on the first call
    const existingAvailabilities = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
      [
        Query.equal('userId', [userId]),
        Query.equal('status', ['active']),
        Query.equal('age', ['new'])
      ]
    );

    // Batch update all existing availabilities to 'old'
    if (existingAvailabilities.documents.length > 0) {
      await Promise.all(existingAvailabilities.documents.map(doc =>
        database.updateDocument(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
          doc.$id,
          {
            age: 'old',
            status: 'inactive'
          }
        )
      ));
    }

    // Create new availability record
    const availabilityId = ID.unique();
    const newAvailability = await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
      availabilityId,
      {
        availabilityId,
        userId,
        fromDate,
        toDate,
        dayOfWeek,
        timeType,
        status: 'active',
        age: 'new' as AvailabilityAge,
        createdAt: currentTimestamp
      }
    );

    return parseStringify(newAvailability);
  } catch (error) {
    console.error('Error updating availability:', error);
    throw error;
  }
};

// Update the form submission logic
export const bulkUpdateAvailability = async (data: {
  userId: string;
  fromDate: string;
  toDate: string;
  availabilities: Array<{
    dayOfWeek: string;
    timeType: 'day' | 'night';
  }>;
}) => {
  const { userId, fromDate, toDate, availabilities } = data;
  
  try {
    const { database } = await createAdminClient();

    // First, set all existing active availabilities to 'old' and inactive
    const existingAvailabilities = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
      [
        Query.equal('userId', [userId]),
        Query.equal('status', ['active']),
        Query.equal('age', ['new'])
      ]
    );

    // Batch update all existing availabilities to 'old'
    if (existingAvailabilities.documents.length > 0) {
      await Promise.all(existingAvailabilities.documents.map(doc =>
        database.updateDocument(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
          doc.$id,
          {
            age: 'old',
            status: 'inactive'
          }
        )
      ));
    }

    // Create all new availabilities in bulk
    const createPromises = availabilities.map(availability => {
      const availabilityId = ID.unique();
      return database.createDocument(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
        availabilityId,
        {
          availabilityId,
          userId,
          fromDate,
          toDate,
          dayOfWeek: availability.dayOfWeek,
          timeType: availability.timeType,
          status: 'active',
          age: 'new' as AvailabilityAge,
          createdAt: new Date().toISOString()
        }
      );
    });

    await Promise.all(createPromises);

    return { status: 'success' };
  } catch (error) {
    console.error('Error in bulk updating availability:', error);
    throw error;
  }
};


//==========================================================
//Getting stats for the logged in users avalability
//==========================================================

export const getUserCurrentAvailability = async (userId: string): Promise<AvailabilityResponse> => {
  try {
    const { database } = await createAdminClient();

    // Get all active availabilities with age 'new'
    const currentAvailabilities = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
      [
        Query.equal('userId', [userId]),
        Query.equal('status', ['active']),
        Query.equal('age', ['new'])
      ]
    );

    if (currentAvailabilities.documents.length === 0) {
      return {
        status: 'success',
        data: []
      };
    }

    // Group the availabilities
    const groupedAvailability = {
      dateRange: {
        fromDate: currentAvailabilities.documents[0].fromDate,
        toDate: currentAvailabilities.documents[0].toDate
      },
      availabilities: currentAvailabilities.documents.map(doc => ({
        dayOfWeek: doc.dayOfWeek as DayOfWeek,
        timeType: doc.timeType as TimeType
      }))
    };

    return {
      status: 'success',
      data: [groupedAvailability]
    };
  } catch (error) {
    console.error('Error getting user current availability:', error);
    return {
      status: 'error',
      data: null,
      message: 'Failed to fetch availability'
    };
  }
};

// End of Quick Actions Functions
//==========================================================


//==========================================================
//Shift Leader Functions
//==========================================================

export async function getLeaderStats(leaderId: string): Promise<LeaderStats> {
  const { database } = await createAdminClient();
  
  const currentDate = new Date();
  const startOfDay = new Date(currentDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(currentDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    // Get all shifts assigned to the leader for today
    const todayShifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal('shiftLeaderId', [leaderId]),
        Query.greaterThanEqual('startTime', startOfDay.toISOString()),
        Query.lessThanEqual('startTime', endOfDay.toISOString())
      ]
    );

    const shiftIds = todayShifts.documents.map(shift => shift.shiftId);

    // Get all student assignments for these shifts
    const assignments = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [Query.equal('shiftId', shiftIds)]
    );

    // Get attendance records for assigned students
    const attendance = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      [Query.equal('shiftId', shiftIds)]
    );

    const totalStudents = assignments.documents.length;
    const clockedInStudents = attendance.documents.filter(a => a.clockInTime).length;

    // Calculate historical attendance rate
    const allTimeAttendance = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      [Query.equal('markedByLeader', [leaderId])]
    );

    const attendanceRate = allTimeAttendance.documents.length > 0
      ? (allTimeAttendance.documents.filter(a => a.attendanceStatus === 'present').length / 
         allTimeAttendance.documents.length) * 100
      : 100;

    // Get feedback statistics
    const feedback = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_FEEDBACK_COLLECTION_ID!,
      [Query.equal('submittedBy', [leaderId])]
    );

    const averageRatings = feedback.documents.reduce(
      (acc, curr) => ({
        punctuality: acc.punctuality + curr.punctualityRating,
        overall: acc.overall + curr.overallRating
      }), 
      { punctuality: 0, overall: 0 }
    );

    const feedbackCount = feedback.documents.length;
    if (feedbackCount > 0) {
      averageRatings.punctuality /= feedbackCount;
      averageRatings.overall /= feedbackCount;
    }

    const totalComments = feedback.documents.filter(f => f.comments && f.comments.trim() !== '').length;

    return {
      totalStudents,
      clockedInStudents,
      notClockedInStudents: totalStudents - clockedInStudents,
      attendanceRate,
      averageRatings: {
        punctuality: averageRatings.punctuality,
        overall: averageRatings.overall
      },
      totalComments
    };
  } catch (error) {
    console.error('Error calculating leader stats:', error);
    return {
      totalStudents: 0,
      clockedInStudents: 0,
      notClockedInStudents: 0,
      attendanceRate: 100,
      averageRatings: {
        punctuality: 5,
        overall: 5
      },
      totalComments: 0
    };
  }
}

//==========================================================
//Gateman Functions
//==========================================================

export async function getGatemanStats(gatemanId: string): Promise<GatemanStats> {
  const { database } = await createAdminClient();
  
  const currentDate = new Date();
  const startOfDay = new Date(currentDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(currentDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    // Get all shifts assigned to the gateman for today
    const todayShifts = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFTS_COLLECTION_ID!,
      [
        Query.equal('gatemanId', [gatemanId]),
        Query.greaterThanEqual('startTime', startOfDay.toISOString()),
        Query.lessThanEqual('startTime', endOfDay.toISOString())
      ]
    );

    if (todayShifts.documents.length === 0) {
      return {
        totalExpectedStudents: 0,
        clockedInStudents: 0,
        notClockedInStudents: 0
      };
    }

    const shiftIds = todayShifts.documents.map(shift => shift.shiftId);

    // Get all student assignments for these shifts
    const assignments = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID!,
      [
        Query.equal('shiftId', shiftIds),
        Query.equal('status', ['assigned'])
      ]
    );

    // Get attendance records for assigned students
    const attendance = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_ATTENDANCE_COLLECTION_ID!,
      [
        Query.equal('shiftId', shiftIds),
        Query.isNotNull('clockInTime')
      ]
    );

    const totalExpectedStudents = assignments.documents.length;
    const clockedInStudents = attendance.documents.length;
    
    return {
      totalExpectedStudents,
      clockedInStudents,
      notClockedInStudents: totalExpectedStudents - clockedInStudents
    };

  } catch (error) {
    console.error('Error calculating gateman stats:', error);
    return {
      totalExpectedStudents: 0,
      clockedInStudents: 0,
      notClockedInStudents: 0
    };
  }
}

//==========================================================
//Admin Functions
//==========================================================

export async function getAdminStats(adminId: string): Promise<AdminStats> {
  const { database } = await createAdminClient();
  
  try {
    // Get projects where admin is owner or member
    const projectMembers = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal('userId', [adminId]),
        Query.equal('status', ['active']),
        Query.equal('membershipType', ['owner', 'manager', 'member'].map(type => type))
      ]
    );

    const projectIds = projectMembers.documents.map(pm => pm.projectId);

    if (projectIds.length === 0) {
      return {
        totalProjects: 0,
        totalStudents: 0,
        projectDistribution: []
      };
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

    // Get student members for each project
    const projectDistribution: ProjectStudentDistribution[] = [];
    const colors = ['#0747b6', '#2265d8', '#2f91fa', '#4aa7ff', '#66bdff'];
    const processedStudents = new Set<string>(); // To track unique students

    for (let i = 0; i < projects.documents.length; i++) {
      const project = projects.documents[i];
      
      // Get student members for this project
      const studentMembers = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
        [
          Query.equal('projectId', [project.projectId]),
          Query.equal('membershipType', ['student']),
          Query.equal('status', ['active'])
        ]
      );

      // Add students to processed set
      studentMembers.documents.forEach(member => {
        processedStudents.add(member.userId);
      });

      projectDistribution.push({
        projectId: project.projectId,
        projectName: project.name,
        studentCount: studentMembers.documents.length,
        color: colors[i % colors.length]
      });
    }

    return {
      totalProjects: projects.documents.length,
      totalStudents: processedStudents.size, // Count of unique students
      projectDistribution: projectDistribution.sort((a, b) => b.studentCount - a.studentCount)
    };

  } catch (error) {
    console.error('Error calculating admin stats:', error);
    return {
      totalProjects: 0,
      totalStudents: 0,
      projectDistribution: []
    };
  }
}

//==========================================================
//Client Functions
//==========================================================
export async function getClientStats(clientId: string): Promise<ClientStats> {
  const { database } = await createAdminClient();
  
  try {
    // Get projects where client is owner or member
    const projectMembers = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal('userId', [clientId]),
        Query.equal('status', ['active']),
        Query.equal('membershipType', ['owner', 'client', 'member'].map(type => type))
      ]
    );

    const projectIds = projectMembers.documents.map(pm => pm.projectId);

    if (projectIds.length === 0) {
      return {
        totalProjects: 0,
        totalStudents: 0,
        projectDistribution: []
      };
    }

    // Get project details - only active projects
    const projects = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      [
        Query.equal('projectId', projectIds),
        Query.equal('status', ['active'])
      ]
    );

    // Get student members for each project
    const projectDistribution: ClientProjectDistribution[] = [];
    const colors = ['#0747b6', '#2265d8', '#2f91fa', '#4aa7ff', '#66bdff'];
    const processedStudents = new Set<string>(); // To track unique students

    for (let i = 0; i < projects.documents.length; i++) {
      const project = projects.documents[i];
      
      // Get active student members for this project
      const studentMembers = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
        [
          Query.equal('projectId', [project.projectId]),
          Query.equal('membershipType', ['student']),
          Query.equal('status', ['active'])
        ]
      );

      // Add students to processed set
      studentMembers.documents.forEach(member => {
        processedStudents.add(member.userId);
      });

      // Only add projects that have students
      if (studentMembers.documents.length > 0) {
        projectDistribution.push({
          projectId: project.projectId,
          projectName: project.name,
          studentCount: studentMembers.documents.length,
          color: colors[i % colors.length]
        });
      }
    }

    // Sort projects by student count in descending order
    const sortedDistribution = projectDistribution.sort((a, b) => b.studentCount - a.studentCount);

    return {
      totalProjects: projects.documents.length,
      totalStudents: processedStudents.size, // Count of unique students
      projectDistribution: sortedDistribution
    };

  } catch (error) {
    console.error('Error calculating client stats:', error);
    return {
      totalProjects: 0,
      totalStudents: 0,
      projectDistribution: []
    };
  }
}

//==========================================================
//Project Creation Functions
//==========================================================

export async function createProject(data: { 
  name: string; 
  description?: string 
}, userId: string): Promise<{ status: 'success' | 'error'; message?: string }> {
  try {
    const { database } = await createAdminClient();
    
    // Get user info to determine their role
    const userResponse = await getUserInfo({ userId });
    if (userResponse.status === 'error' || !userResponse.data) {
      throw new Error('Could not verify user role');
    }
    
    // Generate unique IDs
    const projectId = ID.unique();
    const memberId = ID.unique();
    const currentTime = new Date().toISOString();

    // Create project document
    await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      projectId,
      {
        projectId,
        name: data.name,
        description: data.description || null,
        status: 'active',
        ownerId: userId,
        ownerRole: userResponse.data.role, // Adding the required ownerRole field
        createdAt: currentTime,
        updatedAt: currentTime,
      }
    );

    // Create project membership for the owner
    await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      memberId,
      {
        memberId,
        projectId,
        userId,
        membershipType: 'owner',
        addedBy: userId,
        status: 'active',
        createdAt: currentTime,
        updatedAt: currentTime,
      }
    );

    return {
      status: 'success'
    };
  } catch (error) {
    console.error('Error in createProject:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create project'
    };
  }
}
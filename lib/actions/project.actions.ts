// lib/actions/project.actions.ts

import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/actions/appwrite";




export async function getTopProject(userId: string): Promise<ProjectCardData | null> {
    try {
      const projects = await getAllProjects(userId);
      
      if (projects.length === 0) return null;
  
      const topProject = projects.reduce((prev, current) => {
        const prevTotal = prev.stats.studentsCount + prev.stats.shiftLeadersCount;
        const currentTotal = current.stats.studentsCount + current.stats.shiftLeadersCount;
        return (currentTotal > prevTotal) ? current : prev;
      });
  
      return topProject;
    } catch (error) {
      console.error('Error fetching top project:', error);
      return null;
    }
  }

async function getMemberDetails(database: any, userIds: string[]): Promise<ProjectMemberInfo[]> {
  if (userIds.length === 0) return [];

  const allMembers: ProjectMemberInfo[] = [];
  
  // Check in each user collection
  const collections = [
    process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
    process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
    process.env.APPWRITE_CLIENTS_COLLECTION_ID!,
    process.env.APPWRITE_ADMINS_COLLECTION_ID!
  ];

  for (const collectionId of collections) {
    try {
      const response = await database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        collectionId,
        [Query.equal('userId', userIds)]
      );

      const members = response.documents.map((doc: ProjectMemberInfo) => ({
        userId: doc.userId,
        firstName: doc.firstName,
        lastName: doc.lastName
      }));

      allMembers.push(...members);
    } catch (error) {
      console.error(`Error fetching members from collection ${collectionId}:`, error);
    }
  }

  return allMembers;
}

async function getProjectMembers(database: any, projectId: string) {
  try {
    const members = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal('projectId', [projectId]),
        Query.equal('status', ['active'])
      ]
    );

    const studentMembers = members.documents.filter((m: ProjectMemberInfo) => m.membershipType === 'student');
    const leaderMembers = members.documents.filter((m: ProjectMemberInfo) => m.membershipType === 'shiftLeader');

    // Get user details for students
    const studentDetails = await getMemberDetails(
      database,
      studentMembers.map((m: ProjectMemberInfo) => m.userId)
    );

    // Get user details for shift leaders
    const leaderDetails = await getMemberDetails(
      database,
      leaderMembers.map((m: ProjectMemberInfo) => m.userId)
    );

    return {
      students: studentDetails,
      shiftLeaders: leaderDetails,
      stats: {
        studentsCount: studentMembers.length,
        shiftLeadersCount: leaderMembers.length,
        totalMembers: members.documents.length
      }
    };
  } catch (error) {
    console.error('Error getting project members:', error);
    return {
      students: [],
      shiftLeaders: [],
      stats: {
        studentsCount: 0,
        shiftLeadersCount: 0,
        totalMembers: 0
      }
    };
  }
}

export async function getAllProjects(userId: string): Promise<ProjectCardData[]> {
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

    // Get projects
    const projects = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      [Query.equal('projectId', projectIds)]
    );

    // Get member data for each project
    const projectsWithData = await Promise.all(
      projects.documents.map(async (project) => {
        const memberData = await getProjectMembers(database, project.projectId);
        
        return {
          projectId: project.projectId,
          name: project.name,
          description: project.description,
          status: project.status,
          stats: memberData.stats,
          members: {
            students: memberData.students,
            shiftLeaders: memberData.shiftLeaders
          }
        };
      })
    );

    return projectsWithData;
  } catch (error) {
    console.error('Error fetching all projects:', error);
    return [];
  }
}

export async function getProjectWithStats(projectId: string): Promise<ProjectCardData | null> {
  try {
    const { database } = await createAdminClient();

    // Get project details
    const projectDoc = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      [Query.equal('projectId', [projectId])]
    );

    if (projectDoc.documents.length === 0) {
      return null;
    }

    const project = projectDoc.documents[0];
    const memberData = await getProjectMembers(database, projectId);

    return {
      projectId: project.projectId,
      name: project.name,
      description: project.description,
      status: project.status,
      stats: memberData.stats,
      members: {
        students: memberData.students,
        shiftLeaders: memberData.shiftLeaders
      }
    };
  } catch (error) {
    console.error('Error fetching project stats:', error);
    return null;
  }
}
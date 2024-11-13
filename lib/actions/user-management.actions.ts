// lib/actions/user-management.actions.ts

"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/actions/appwrite";

// Types
interface UserAvailability {
  dayOfWeek: string;
  timeType: "day" | "night";
}

interface UserBasicInfo {
  userId: string;
  name: string;
  availability: string[];
  status: "active" | "inactive";
}

interface StudentInfo extends UserBasicInfo {
  punctualityScore: number;
}

interface ClientInfo extends UserBasicInfo {
  projects: number;
  students: number;
}

interface LeaderInfo extends UserBasicInfo {
  projects: number;
  students: number;
}

interface GuardInfo extends UserBasicInfo {
  projects: number;
  students: number;
}

interface UsersResponse {
  students: StudentInfo[];
  clients: ClientInfo[];
  leaders: LeaderInfo[];
  guards: GuardInfo[];
}

// Helper function to get user availability
async function getUserAvailability(userId: string): Promise<string[]> {
  const { database } = await createAdminClient();

  try {
    const availability = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
      [
        Query.equal("userId", [userId]),
        Query.equal("status", ["active"]),
        Query.equal("age", ["new"]),
      ]
    );

    return availability.documents.map((doc) => doc.dayOfWeek);
  } catch (error) {
    console.error("Error fetching user availability:", error);
    return [];
  }
}

// Helper function to count project members
async function getProjectMembers(projectIds: string[]): Promise<{
  totalStudents: number;
  projects: number;
}> {
  const { database } = await createAdminClient();

  try {
    const members = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal("projectId", projectIds),
        Query.equal("membershipType", ["student"]),
        Query.equal("status", ["active"]),
      ]
    );

    return {
      totalStudents: members.documents.length,
      projects: projectIds.length,
    };
  } catch (error) {
    console.error("Error counting project members:", error);
    return { totalStudents: 0, projects: 0 };
  }
}

// Get all users for logged-in user's projects
export async function getAllUsers(
  loggedInUserId: string
): Promise<UsersResponse> {
  const { database } = await createAdminClient();

  try {
    // Validate loggedInUserId
    if (!loggedInUserId || loggedInUserId === "current-user-id") {
      throw new Error("Valid user ID is required");
    }

    // Get projects where logged-in user is a member
    const userProjects = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal("userId", loggedInUserId), // Changed from array to single value
        Query.equal("status", "active"), // Changed from array to single value
      ]
    );

    // If no projects found, return empty response
    if (userProjects.documents.length === 0) {
      return {
        students: [],
        clients: [],
        leaders: [],
        guards: [],
      };
    }

    const projectIds = userProjects.documents.map((doc) => doc.projectId);

    // Get all members of these projects
    const projectMembers = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [Query.equal("projectId", projectIds)] // This is correct as it expects an array
    );

    // If no members found, return empty response
    if (projectMembers.documents.length === 0) {
      return {
        students: [],
        clients: [],
        leaders: [],
        guards: [],
      };
    }

    const memberIds = projectMembers.documents.map((doc) => doc.userId);

    // Get user details from respective collections
    const [students, clients, leaders, guards] = await Promise.all([
      database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
        [Query.equal("userId", memberIds)] // This is correct as it expects an array
      ),
      database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_CLIENTS_COLLECTION_ID!,
        [Query.equal("userId", memberIds)]
      ),
      database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
        [Query.equal("userId", memberIds)]
      ),
      database.listDocuments(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_GATEMEN_COLLECTION_ID!,
        [Query.equal("userId", memberIds)]
      ),
    ]);

    // Process each user type (rest of the code remains the same)
    const processedStudents = await Promise.all(
      students.documents.map(async (student) => ({
        userId: student.userId,
        name: `${student.firstName} ${student.lastName}`,
        availability: await getUserAvailability(student.userId),
        punctualityScore: student.punctualityScore,
        status: student.availabilityStatus,
      }))
    );

    const processedClients = await Promise.all(
      clients.documents.map(async (client) => {
        const clientProjects = projectMembers.documents
          .filter((pm) => pm.userId === client.userId)
          .map((pm) => pm.projectId);
        const { projects, totalStudents } = await getProjectMembers(
          clientProjects
        );
        return {
          userId: client.userId,
          name: `${client.firstName} ${client.lastName}`,
          availability: [],
          projects,
          students: totalStudents,
          status: "active" as const,
        };
      })
    );

    const processedLeaders = await Promise.all(
      leaders.documents.map(async (leader) => {
        const availability = await getUserAvailability(leader.userId);
        const leaderProjects = projectMembers.documents
          .filter((pm) => pm.userId === leader.userId)
          .map((pm) => pm.projectId);
        const { projects, totalStudents } = await getProjectMembers(
          leaderProjects
        );
        return {
          userId: leader.userId,
          name: `${leader.firstName} ${leader.lastName}`,
          availability,
          projects,
          students: totalStudents,
          status: leader.availabilityStatus,
        };
      })
    );

    const processedGuards = await Promise.all(
      guards.documents.map(async (guard) => {
        const availability = await getUserAvailability(guard.userId);
        const guardProjects = projectMembers.documents
          .filter((pm) => pm.userId === guard.userId)
          .map((pm) => pm.projectId);
        const { projects, totalStudents } = await getProjectMembers(
          guardProjects
        );
        return {
          userId: guard.userId,
          name: `${guard.firstName} ${guard.lastName}`,
          availability,
          projects,
          students: totalStudents,
          status: guard.availabilityStatus,
        };
      })
    );

    return {
        students: processedStudents,
        clients: processedClients,
        leaders: processedLeaders,
        guards: processedGuards
      };
    } catch (error) {
      console.error("Error fetching users:", error);
      return {
        students: [],
        clients: [],
        leaders: [],
        guards: []
      };
    }
  }

// Toggle student suspension
export async function toggleStudentSuspension(
  studentId: string
): Promise<{ success: boolean; newStatus?: "active" | "inactive" }> {
  const { database } = await createAdminClient();

  try {
    // Get current student status
    const student = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      [Query.equal("userId", [studentId])]
    );

    if (student.documents.length === 0) {
      throw new Error("Student not found");
    }

    const newStatus =
      student.documents[0].availabilityStatus === "active"
        ? "inactive"
        : "active";

    // Update student status
    await database.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      student.documents[0].$id,
      {
        availabilityStatus: newStatus,
      }
    );

    return {
      success: true,
      newStatus,
    };
  } catch (error) {
    console.error("Error toggling student suspension:", error);
    return { success: false };
  }
}

// Delete user
export async function deleteUser(
  userId: string,
  userType: "student" | "client" | "leader" | "guard"
): Promise<{ success: boolean }> {
  const { database } = await createAdminClient();

  try {
    // Get collection ID based on user type
    const collectionMap = {
      student: process.env.APPWRITE_STUDENTS_COLLECTION_ID!,
      client: process.env.APPWRITE_CLIENTS_COLLECTION_ID!,
      leader: process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!,
      guard: process.env.APPWRITE_GATEMEN_COLLECTION_ID!,
    };

    // Get user document
    const user = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      collectionMap[userType],
      [Query.equal("userId", [userId])]
    );

    if (user.documents.length === 0) {
      throw new Error("User not found");
    }

    // Delete user document
    await database.deleteDocument(
      process.env.APPWRITE_DATABASE_ID!,
      collectionMap[userType],
      user.documents[0].$id
    );

    // Delete user availability records
    const availability = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
      [Query.equal("userId", [userId])]
    );

    await Promise.all(
      availability.documents.map((doc) =>
        database.deleteDocument(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_USER_AVAILABILITY_COLLECTION_ID!,
          doc.$id
        )
      )
    );

    // Delete project memberships
    const memberships = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [Query.equal("userId", [userId])]
    );

    await Promise.all(
      memberships.documents.map((doc) =>
        database.deleteDocument(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
          doc.$id
        )
      )
    );

    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false };
  }
}

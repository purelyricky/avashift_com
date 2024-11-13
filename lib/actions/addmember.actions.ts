// lib/actions/member.actions.ts
'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/actions/appwrite";

// Helper function to check if user exists
async function checkExistingUser(email: string): Promise<{
  exists: boolean;
  userId?: string;
  role?: UserRole;
}> {
  const { database } = await createAdminClient();
  
  const collections = [
    { id: process.env.APPWRITE_STUDENTS_COLLECTION_ID!, role: 'student' as UserRole },
    { id: process.env.APPWRITE_SHIFT_LEADERS_COLLECTION_ID!, role: 'shiftLeader' as UserRole },
    { id: process.env.APPWRITE_GATEMEN_COLLECTION_ID!, role: 'gateman' as UserRole },
    { id: process.env.APPWRITE_CLIENTS_COLLECTION_ID!, role: 'client' as UserRole },
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
          exists: true,
          userId: response.documents[0].userId,
          role: collection.role
        };
      }
    } catch (error) {
      console.error(`Error checking collection ${collection.id}:`, error);
    }
  }

  return { exists: false };
}

// Helper to check if user is already a member of the project
async function checkExistingMembership(userId: string, projectId: string): Promise<boolean> {
  const { database } = await createAdminClient();

  try {
    const memberships = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal('userId', [userId]),
        Query.equal('projectId', [projectId]),
        Query.equal('status', ['active'])
      ]
    );

    return memberships.documents.length > 0;
  } catch (error) {
    console.error('Error checking existing membership:', error);
    return false;
  }
}

export async function addProjectMember(data: {
  email: string;
  role: 'student' | 'shiftLeader' | 'gateman' | 'client';
  projectId: string;
}, currentUserId: string): Promise<{ status: 'success' | 'error'; message: string }> {
  try {
    const { database } = await createAdminClient();
    const { email, role, projectId } = data;

    // Check if user exists
    const userCheck = await checkExistingUser(email);

    if (!userCheck.exists) {
      // TODO: Add email sending feature
      /** 
       * TO DO: ADD EMAIL SENDING FEATURE
       * - Send invitation email to the provided email address
       * - Include registration link
       * - Include project details
       */
      
      return {
        status: 'error',
        message: 'User has not signed up. An invitation email has been sent.'
      };
    }

    // Verify the role matches
    if (userCheck.role !== role) {
      return {
        status: 'error',
        message: `User exists but with a different role: ${userCheck.role}`
      };
    }

    // Check if user is already a member of the project
    const isExistingMember = await checkExistingMembership(userCheck.userId!, projectId);
    if (isExistingMember) {
      return {
        status: 'error',
        message: 'User is already a member of this project'
      };
    }

    // Create project membership
    const memberId = ID.unique();
    const currentTime = new Date().toISOString();

    // Map roles to membership types
    const membershipTypeMap: Record<string, string> = {
      'student': 'student',
      'shiftLeader': 'shiftLeader',
      'client': 'client',
      'gateman': 'gateman', 
    };

    const membershipType = membershipTypeMap[role];

    // Create the project membership
    await database.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      memberId,
      {
        memberId,
        projectId,
        userId: userCheck.userId,
        membershipType,
        addedBy: currentUserId,
        status: 'active',
        createdAt: currentTime,
        updatedAt: currentTime,
      }
    );

    /**
     * TO DO: ADD EMAIL NOTIFICATION FEATURE
     * - Send email to the user about being added to the project
     * - Include project details
     * - Include any relevant links or next steps
     */

    return {
      status: 'success',
      message: 'Worker successfully added to project'
    };

  } catch (error) {
    console.error('Error in addProjectMember:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to add worker to project'
    };
  }
}
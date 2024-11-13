import HeaderBox from '@/components/HeaderBox';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import AddWorkerForm from "@/components/AddWorkerForm";
import { addProjectMember } from "@/lib/actions/addmember.actions";
import { createAdminClient } from "@/lib/actions/appwrite";
import { Query } from 'node-appwrite';

// Type for serializable user
interface SerializableUser {
  userId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
}

// Type for project data
interface ProjectData {
  projectId: string;
  name: string;
}

// Function to get projects for the logged-in user
async function getUserProjects(userId: string): Promise<ProjectData[]> {
  const { database } = await createAdminClient();
  
  try {
    // Get user's project memberships
    const memberships = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECT_MEMBERS_COLLECTION_ID!,
      [
        Query.equal('userId', [userId]),
        Query.equal('status', ['active'])
      ]
    );

    if (memberships.documents.length === 0) {
      return [];
    }

    const projectIds = memberships.documents.map(m => m.projectId);
    
    // Get project details
    const projects = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_PROJECTS_COLLECTION_ID!,
      [
        Query.equal('projectId', projectIds),
        Query.equal('status', ['active']) // Only get active projects
      ]
    );

    return projects.documents.map(project => ({
      projectId: project.projectId,
      name: project.name
    }));

  } catch (error) {
    console.error('Error fetching user projects:', error);
    return [];
  }
}

const AdminInvitationsPage = async () => {
  const response = await getLoggedInUser();
  
  if (!response || response.status === 'error' || !response.data) {
    redirect('/sign-in');
  }
  
  const userData = response.data;
  
  // Ensure user is an admin
  if (userData.role !== 'admin') {
    redirect('/');
  }

  // Get projects the admin is a member of
  const projects = await getUserProjects(userData.userId);

  // Create a serializable user object
  const serializableUser: SerializableUser = {
    userId: userData.userId,
    role: userData.role,
    firstName: userData.firstName,
    lastName: userData.lastName,
    email: userData.email,
    phone: userData.phone || '',
    createdAt: userData.createdAt
  };

  return (
    <section className="payment-transfer">
      <HeaderBox 
        title="Add Users to Project"
        subtext="Please provide the email address of the user you would like to add to the project"
      />
      <section className="size-full pt-5">
        <div className="max-w-3xl mx-auto">
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-16 text-gray-600">
                You are not a member of any active projects. Please join or create a project first.
              </p>
            </div>
          ) : (
            <AddWorkerForm 
              user={serializableUser}
              projects={projects}
              onSubmit={async (data) => {
                'use server';
                await addProjectMember(data, serializableUser.userId);
              }}
            />
          )}
        </div>
      </section>
    </section>
  );
};

export default AdminInvitationsPage;
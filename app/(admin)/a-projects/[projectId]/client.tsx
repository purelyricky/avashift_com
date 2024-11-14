'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import ProjectMembersTable from '@/components/projects-page'
import ShiftAssignmentTable from '@/components/shift-assignment-table'
import HeaderBox from '@/components/HeaderBox';
import { ShiftAssignmentStats, UserAvailability } from '@/lib/actions/shift-assignments.actions';
import AdminRequestsTable from "@/components/request-management-table-component";
import { AdminRequestStats, AdminRequestWithDetails } from "@/lib/actions/admin-requests.actions";

interface ProjectPageClientProps {
  projectId: string;
  projectDetails: {
    name: string;
    description: string | null;
    status: string;
  };
  initialStats: ShiftAssignmentStats;
  initialAvailabilities: UserAvailability[];
  // Updated props for request management
  adminRequestStats: AdminRequestStats;
  adminRequests: AdminRequestWithDetails[];
  adminId: string; // Changed from userId to be more specific
}

export default function ProjectPageClient({ 
  projectId, 
  projectDetails,
  initialStats,
  initialAvailabilities,
  adminRequestStats,
  adminRequests,
  adminId
}: ProjectPageClientProps) {
  const headerTitle = `${projectDetails.name} Project Management`;

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox 
            title={headerTitle}
            subtext="Manage your project members and their shift assignments."
          />
        </header>
        
        <Tabs defaultValue="members" className="w-full">
          <TabsList 
            className="mb-8 flex w-full border-b"
            style={{ backgroundColor: '#F7FAFC', borderColor: '#E2E8F0' }}
          >
            <TabsTrigger 
              value="members"
              className="custom-tab"
              style={{
                padding: '12px 24px',
                color: '#2D3748',
                backgroundColor: 'transparent',
                borderBottom: '2px solid transparent',
              }}
            >
              Members
            </TabsTrigger>
            <TabsTrigger 
              value="shifts"
              className="custom-tab"
              style={{
                padding: '12px 24px',
                color: '#2D3748',
                backgroundColor: 'transparent',
                borderBottom: '2px solid transparent',
              }}
            >
              Shift Assignments
            </TabsTrigger>
            <TabsTrigger 
              value="requests"
              className="custom-tab"
              style={{
                padding: '12px 24px',
                color: '#2D3748',
                backgroundColor: 'transparent',
                borderBottom: '2px solid transparent',
              }}
            >
              Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <ProjectMembersTable projectId={projectId} />
          </TabsContent>

          <TabsContent value="shifts">
            <ShiftAssignmentTable 
              projectId={projectId}
              initialStats={initialStats}
              initialAvailabilities={initialAvailabilities}
            />
          </TabsContent>

          <TabsContent value="requests">
            <AdminRequestsTable 
              projectId={projectId}
              adminId={adminId}
              initialStats={adminRequestStats}
              initialRequests={adminRequests}
            />
          </TabsContent>
        </Tabs>
      </div>

      <style jsx global>{`
        .custom-tab[data-state='active'] {
          color: #3182CE !important;
          border-bottom-color: #3182CE !important;
          background-color: #EBF8FF !important;
        }

        .custom-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          position: relative;
        }

        .custom-tab:hover {
          background-color: #F0F5FA;
        }

        .custom-tab:focus {
          outline: none;
          box-shadow: 0 0 0 2px #E2E8F0;
        }
      `}</style>
    </section>
  );
}
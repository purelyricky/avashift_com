// app/projects/[projectId]/page.tsx
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getProjectDetails } from '@/lib/actions/specifiproject.actions';
import { getShiftAssignmentStats, getUserAvailabilities } from '@/lib/actions/shift-assignments.actions';
import { getAdminRequestStats, getAdminRequests } from '@/lib/actions/admin-requests.actions';
import ProjectPageClient from './client';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface ProjectPageProps {
  params: {
    projectId: string;
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  // Get user first to ensure we have adminId for subsequent calls
  const userResponse = await getLoggedInUser();
  
  if (!userResponse || userResponse.status === 'error' || !userResponse.data) {
    redirect('/sign-in');
  }

  const adminId = userResponse.data.userId;

  // Then fetch all data in parallel
  const [
    projectDetails, 
    initialStats, 
    initialAvailabilities,
    adminRequestStats,
    adminRequests
  ] = await Promise.all([
    getProjectDetails(params.projectId),
    getShiftAssignmentStats(params.projectId),
    getUserAvailabilities(params.projectId),
    getAdminRequestStats(params.projectId, adminId),
    getAdminRequests(params.projectId)
  ]);

  if (!projectDetails) {
    notFound();
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProjectPageClient 
        projectId={params.projectId}
        projectDetails={projectDetails}
        initialStats={initialStats}
        initialAvailabilities={initialAvailabilities}
        adminRequestStats={adminRequestStats}
        adminRequests={adminRequests}
        adminId={adminId}
      />
    </Suspense>
  );
}
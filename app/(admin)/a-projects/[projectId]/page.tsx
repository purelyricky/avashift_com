// app/projects/[projectId]/page.tsx
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getProjectDetails } from '@/lib/actions/specifiproject.actions';
import { getShiftAssignmentStats, getUserAvailabilities } from '@/lib/actions/shift-assignments.actions';
import ProjectPageClient from './client';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface ProjectPageProps {
  params: {
    projectId: string;
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const [userResponse, projectDetails, initialStats, initialAvailabilities] = await Promise.all([
    getLoggedInUser(),
    getProjectDetails(params.projectId),
    getShiftAssignmentStats(params.projectId),
    getUserAvailabilities(params.projectId)
  ]);
  
  if (!userResponse || userResponse.status === 'error' || !userResponse.data) {
    redirect('/sign-in');
  }

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
      />
    </Suspense>
  );
}
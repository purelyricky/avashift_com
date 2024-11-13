// app/projects/[projectId]/page.tsx

import ProjectMembersTable from '@/components/clients-project-page'
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { notFound, redirect } from 'next/navigation';
import HeaderBox from '@/components/HeaderBox';
import { getProjectDetails } from '@/lib/actions/specifiproject.actions';

interface ProjectPageProps {
  params: {
    projectId: string;
  };
}

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const [userResponse, projectDetails] = await Promise.all([
    getLoggedInUser(),
    getProjectDetails(params.projectId)
  ]);
  
  if (!userResponse || userResponse.status === 'error' || !userResponse.data) {
    redirect('/sign-in');
  }

  if (!projectDetails) {
    notFound();
  }

  const headerTitle = `${projectDetails.name} Member Management`;

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">

        <HeaderBox 
          title= {headerTitle}
          subtext="Manage your project members and their attendance."
        />
        </header>
        <ProjectMembersTable projectId={params.projectId} />
      </div>
    </section>
  )
}
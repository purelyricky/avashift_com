import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getAllProjects } from '@/lib/actions/project.actions';
import HeaderBox from '@/components/HeaderBox';
import ProjectStatsCard from '@/components/BankCard';
import NewProjectCard from '@/components/NewProjectCard';
import { redirect } from 'next/navigation';

const ProjectsPage = async () => {
  const response = await getLoggedInUser();
  
  if (!response || response.status === 'error' || !response.data) {
    redirect('/sign-in');
  }

  const user = response.data;
  
  if (!['admin', 'client'].includes(user.role)) {
    redirect('/');
  }

  const projects = await getAllProjects(user.userId);

  return (
    <section className="flex">
      <div className="my-banks">
        <HeaderBox 
          title="Projects Overview"
          subtext="View and manage all your projects"
        />
        <div className="space-y-4">
          <h2 className="header-2">
            Your Projects ({projects.length})
          </h2>
          <div className="flex flex-wrap gap-6">
            {projects.map((project) => (
              <ProjectStatsCard 
                key={project.projectId} 
                project={project}
                userRole={user.role}
              />
            ))}
             <NewProjectCard userRole={user.role} />
            {projects.length === 0 && projects.length === 0 && (
              <p className="text-gray-500 w-full">Create your first project to get started.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectsPage;
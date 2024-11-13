import { getTopProject } from '@/lib/actions/project.actions';
import { TopProjectStatsCard } from './TopProjectStatsCard';
import Image from 'next/image';
import Link from 'next/link';
import AdminNotificationCenter from './admin-notification-center';

interface SidebarProps {
  user: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
  };
}

async function RightSidebar({ user }: SidebarProps) {
  // Fetch the top project server-side
  const topProject = await getTopProject(user.userId);

  return (
    <aside className="right-sidebar">
      <section className="flex flex-col pb-8">
        <div className="profile-banner" />
        <div className="profile">
          <div className="profile-img">
            <span className="text-5xl font-bold text-blue-500">{user.firstName[0]}</span>
          </div>

          <div className="profile-details">
            <h1 className="profile-name">
              {user.firstName} {user.lastName}
            </h1>
            <p className="profile-email">
              {user.email}
            </p>
          </div>
        </div>
      </section>

      <section className="banks">
        <div className="flex w-full justify-between">
          <h2 className="header-2">Projects</h2>
          <Link href="/c-projects/create" className="flex gap-2">
            <Image 
              src="/icons/plus.svg"
              width={20}
              height={20}
              alt="plus"
            />
            <h2 className="text-14 font-semibold text-gray-600">
              New Project
            </h2>
          </Link>
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center gap-5">
          <div className="relative">
            {topProject && (
              <TopProjectStatsCard 
                project={topProject} 
                userRole={user.role} 
              />
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-1 flex-col gap-6">
          <AdminNotificationCenter />
        </div>
      </section>
    </aside>
  );
}

export default RightSidebar;
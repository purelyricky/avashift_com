import HeaderBox from '@/components/HeaderBox'
import RightSidebarAdmin from '@/components/RightSidebarAdmin';
import StyledWorkerTable from '@/components/styled-worker-table';
import TotalBalanceBoxAdmin from '@/components/TotalBalanceBoxAdmin';
import { getAdminStats, getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

const AdminDashboard = async () => {
  const response = await getLoggedInUser();
  
  // Handle authentication and authorization
  if (!response || response.status === 'error' || !response.data) {
    redirect('/sign-in');
  }

  const user = response.data;
  
  // Ensure user is an admin
  if (user.role !== 'admin') {
    redirect('/'); // or to appropriate error page
  }

  const adminStats = await getAdminStats(user.userId);

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox 
            type="greeting"
            title="Welcome,"
            user={`${user.firstName}`}
            subtext="Access and manage your Clients, Projects, and Shifts Easily."
          />
        </header>
        <TotalBalanceBoxAdmin adminStats={adminStats} />
        <StyledWorkerTable userId={user.userId} />
      </div>
      <RightSidebarAdmin 
        user={user as BaseUser & { role: 'admin' }}
      />

    </section>
  )
}

export default AdminDashboard
import HeaderBox from '@/components/HeaderBox'
import ShiftLeaderDashboard from '@/components/shift-leader-dashboard';
import TotalBalanceBoxLeader from '@/components/TotalBalanceBoxLeader';
import { getLeaderStats, getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

const LeaderDashboard = async () => {
  const response = await getLoggedInUser();
  
  // Handle authentication and authorization
  if (!response || response.status === 'error' || !response.data) {
    redirect('/sign-in');
  }

  const user = response.data;
  
  // Ensure user is an admin
  if (user.role !== 'shiftLeader') {
    redirect('/'); // or to appropriate error page
  }

  const leaderStats = await getLeaderStats(user.userId);
  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox 
            type="greeting"
            title="Welcome,"
            user={`${user.firstName}`}
            subtext="Access and manage your Shifts and Attendance Records easily."
          />
          <TotalBalanceBoxLeader leaderStats={leaderStats} />
        </header>
        <ShiftLeaderDashboard leaderId={user.userId} />
      </div>
    </section>
  )
}

export default LeaderDashboard
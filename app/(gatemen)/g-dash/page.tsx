import HeaderBox from '@/components/HeaderBox'
import SecurityGuardDashboard from '@/components/security-guard-dashboard';
import TotalBalanceBoxGate from '@/components/TotalBalanceBoxGate';
import { getGatemanStats, getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

const GatemanDashboard = async () => {
  const response = await getLoggedInUser();
  
  // Handle authentication and authorization
  if (!response || response.status === 'error' || !response.data) {
    redirect('/sign-in');
  }

  const user = response.data;
  
  
  // Ensure user is an admin
  if (user.role !== 'gateman') {
    redirect('/'); // or to appropriate error page
  }

  const gatemanStats = await getGatemanStats(user.userId);

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

          <TotalBalanceBoxGate gatemanStats={gatemanStats} />
        </header>
        <div className="flex justify-center w-full">    
        </div>
        <SecurityGuardDashboard gatemanId={user.userId} />
      </div>
    </section>
  )
}

export default GatemanDashboard
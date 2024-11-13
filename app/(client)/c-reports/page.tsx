import HeaderBox from '@/components/HeaderBox'
import ReportsPage from '@/components/reports-page';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

const ClientShiftReports = async () => {
  const response = await getLoggedInUser();
  
  // Handle authentication and authorization
  if (!response || response.status === 'error' || !response.data) {
    redirect('/sign-in');
  }

  const user = response.data;
  
  // Ensure user is an admin
  if (user.role !== 'client') {
    redirect('/'); // or to appropriate error page
  }

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">

        <HeaderBox 
          title="Shift Reports"
          subtext="See your shift reports accurately across all your projects."
        />
        </header>
        <ReportsPage userId={user.userId} />
      </div>
    </section>
  )
}

export default ClientShiftReports
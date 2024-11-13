import HeaderBox from '@/components/HeaderBox'
import { ShiftManagementComponent } from '@/components/shift-creation';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

const AdminShiftCreation = async () => {
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

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">

        <HeaderBox 
          title="Shift Creation"
          subtext="Create shifts for the upcoming week with ease."
        />
        </header>
        <ShiftManagementComponent user={user} />
      </div>
    </section>
  )
}

export default AdminShiftCreation
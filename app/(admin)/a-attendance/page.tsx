import { AdminAttendanceTracking } from '@/components/admin-attendance-tracking';
import HeaderBox from '@/components/HeaderBox'
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

const AdminShiftAttendance = async () => {
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
          title="Track Shift Attendance"
          subtext="See how your shift attendance is going in real-time."
        />
        </header>
        <AdminAttendanceTracking userId={user.userId} />
      </div>
    </section>
  )
}

export default AdminShiftAttendance
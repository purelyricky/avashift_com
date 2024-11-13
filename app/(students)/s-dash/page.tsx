// page.tsx
import HeaderBox from '@/components/HeaderBox'
import { StudentTodayShiftComponent } from '@/components/studenttodayshift';
import TotalBalanceBoxStudent from '@/components/TotalBalanceBoxStudent';
import { getLoggedInUser, getStudentProjectStats } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

const StudentDashboard = async () => {
  const response = await getLoggedInUser();
  
  if (!response || response.status === 'error' || !response.data) {
    redirect('/sign-in');
  }

  const user = response.data;
  
  if (user.role !== 'student') {
    redirect('/');
  }

  const projectStats = await getStudentProjectStats(user.userId);

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox 
            type="greeting"
            title="Welcome,"
            user={user.firstName}
            subtext="Manage your shifts and track your earnings easily."
          />

          <TotalBalanceBoxStudent projectStats={projectStats} />

        </header>
        <StudentTodayShiftComponent userId={user.userId} />
         
      </div>
    </section>
  )
}

export default StudentDashboard
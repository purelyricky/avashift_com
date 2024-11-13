import { redirect } from 'next/navigation';
import { getLoggedInUser } from '@/lib/actions/user.actions';

const HomePage = async () => {
  const response = await getLoggedInUser();

  if (!response || response.status === 'error' || !response.data) {
    redirect('/sign-in');
    return null; // Ensure the function exits after redirect
  }

  const user = response.data;

  // Redirect based on user role
  switch (user.role) {
    case 'admin':
      redirect('/a-dash');
      break;
    case 'client':
      redirect('/c-dash');
      break;
    case 'shiftLeader':
      redirect('/l-dash');
      break;
    case 'gateman':
      redirect('/g-dash');
      break;
    case 'student':
      redirect('/s-dash');
      break;
    default:
      redirect('/sign-in'); // Fallback if no role matches
      break;
  }

  return null; // Ensure the function exits after redirect
};

export default HomePage;

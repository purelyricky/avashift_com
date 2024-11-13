import HeaderBox from '@/components/HeaderBox';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import ClientCreateProjectWrapper from '@/components/ClientCreateProjectWrapper';

const CreateProjectPage = async () => {
  const response = await getLoggedInUser();
  
  // Handle authentication and authorization
  if (!response || response.status === 'error' || !response.data) {
    redirect('/sign-in');
  }

  const user = response.data;
  
  // Ensure user is an admin or client
  if (!['admin', 'client'].includes(user.role)) {
    redirect('/');
  }

  return (
    <section className="payment-transfer">
      <HeaderBox 
        title="Create New Project"
        subtext="Please provide any specific details or notes related to the project"
      />

      <section className="size-full pt-5">
        <div className="max-w-3xl mx-auto">
            <ClientCreateProjectWrapper user={user} />
        </div>
      </section>
    </section>
  );
};

export default CreateProjectPage;
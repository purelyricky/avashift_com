// app/create-project/CreateProjectWrapper.tsx
'use client';

import { createProject } from '@/lib/actions/user.actions';
import CreateProjectForm from '@/components/createProjectForm';
import { useRouter } from 'next/navigation';

interface CreateProjectWrapperProps {
  user: User;
}

const CreateProjectWrapper = ({ user }: CreateProjectWrapperProps) => {
  const router = useRouter();

  const handleCreateProject = async (formData: { 
    name: string; 
    description?: string 
  }) => {
    try {
      const result = await createProject(formData, user.userId);
      if (result.status === 'error') {
        throw new Error(result.message || 'Failed to create project');
      }
      router.push('/a-projects');
      router.refresh();
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  return (
    <CreateProjectForm 
      user={user}
      onSubmit={handleCreateProject}
    />
  );
};

export default CreateProjectWrapper;
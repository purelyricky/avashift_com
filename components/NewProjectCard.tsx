'use client'

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NewProjectCardProps {
  userRole?: UserRole;
}

const NewProjectCard: React.FC<NewProjectCardProps> = ({ 
  userRole = 'admin' // Default to admin if no role provided
}) => {
  const router = useRouter();

  const getCreateProjectPath = (role: UserRole) => {
    const paths = {
      admin: '/a-projects/create',
      client: '/c-projects/create',
      shiftLeader: '/l-projects/create',
      student: '/s-projects/create',
      gateman: '/g-projects/create'
    };
    return paths[role] || '/a-projects/create';
  };

  const handleClick = () => {
    const createPath = getCreateProjectPath(userRole);
    router.push(createPath);
  };

  return (
    <div 
      onClick={handleClick}
      className="bank-card2 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 bg-transparent hover:border-gray-400 transition-colors group"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center group-hover:border-gray-400">
          <Plus className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
        </div>
        <p className="text-16 font-medium text-gray-500 group-hover:text-gray-700">
          Add New Project
        </p>
      </div>
    </div>
  );
};

export default NewProjectCard;
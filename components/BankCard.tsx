'use client'

import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

const defaultStats = {
  studentsCount: 0,
  shiftLeadersCount: 0,
  totalMembers: 0
};

const defaultProject: ProjectCardData = {
  projectId: '',
  name: 'Unnamed Project',
  description: null,
  status: 'active',
  stats: defaultStats
};

interface ExtendedProjectCardProps extends ProjectCardProps {
  userRole?: UserRole;
}

const ProjectStatsCard: React.FC<ExtendedProjectCardProps> = ({ 
  project = defaultProject,
  userRole = 'admin'  // Default to admin if no role provided
}) => {
  const router = useRouter();

  // Safely access stats with fallback to default
  const stats = project?.stats || defaultStats;

  const chartData = {
    labels: ['Students', 'Shift Leaders'],
    datasets: [
      {
        data: [stats.studentsCount, stats.shiftLeadersCount],
        backgroundColor: [
          '#E68C3A',  // Changed from black
          '#F4F2EF',  // Changed from white
        ],
        borderColor: [
          '#E68C3A',  // Changed from black
          '#F4F2EF',  // Changed from white
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: { label?: string; raw?: number }) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = stats.totalMembers || 1; // Prevent division by zero
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '65%',
  };

  const getProjectDetailPath = (projectId: string, role: UserRole) => {
    const paths = {
      admin: `/a-projects/${projectId}`,
      client: `/c-projects/${projectId}`,
      shiftLeader: `/l-projects/${projectId}`,
      student: `/s-projects/${projectId}`,
      gateman: `/g-projects/${projectId}`
    };
    return paths[role] || `/projects/${projectId}`;
  };

  const handleClick = () => {
    if (project?.projectId) {
      const detailPath = getProjectDetailPath(project.projectId, userRole);
      router.push(detailPath);
    }
  };

  return (
    <div 
      className="flex flex-col cursor-pointer" 
      onClick={handleClick}
    >
      <div className="bank-card">
        <div className="bank-card_content">
          <div>
            <h1 className="text-16 font-semibold text-white absolute top-1 left-4">
              {project?.name || 'Unnamed Project'}
            </h1>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <div className="w-[105px] h-[105px]">
                <Doughnut data={chartData} options={chartOptions as any} />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-[#E68C3A] mr-2"></div>
                  <div>
                    <p className="text-12 font-semibold text-white">
                      Students:
                      <br />
                      {stats.studentsCount}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-[#F4F2EF] mr-2"></div>
                  <div>
                    <p className="text-12 font-semibold text-white">
                      Leaders:
                      <br />
                      {stats.shiftLeadersCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bank-card_icon">
          <Image 
            src="/icons/Paypass.svg"
            width={20}
            height={24}
            alt="Paypass"
          />
          <Image 
            src="/icons/mastercard.svg"
            width={45}
            height={32}
            alt="View Details"
            className="ml-5"
          />
        </div>

        <Image 
          src="/icons/lines.png"
          width={316}
          height={190}
          alt="lines"
          className="absolute top-0 left-0"
        />
      </div>
    </div>
  );
};

export default ProjectStatsCard;
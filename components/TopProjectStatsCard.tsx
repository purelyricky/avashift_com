'use client';

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

interface ProjectCardProps {
  project: ProjectCardData;
  userRole: UserRole;
}

export function TopProjectStatsCard({ project, userRole }: ProjectCardProps) {
  const router = useRouter();

  const chartData = {
    labels: ['Students', 'Shift Leaders'],
    datasets: [{
      data: [project.stats.studentsCount, project.stats.shiftLeadersCount],
      backgroundColor: [
        '#E68C3A',
        '#F4F2EF',
      ],
      borderColor: [
        '#E68C3A',
        '#F4F2EF',
      ],
      borderWidth: 1,
    }],
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
            const total = project.stats.totalMembers || 1;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '65%',
  };

  const handleClick = () => {
    const paths = {
      admin: `/a-projects/${project.projectId}`,
      client: `/c-projects/${project.projectId}`,
      shiftLeader: `/l-projects/${project.projectId}`,
      student: `/s-projects/${project.projectId}`,
      gateman: `/g-projects/${project.projectId}`
    };
    router.push(paths[userRole] || `/projects/${project.projectId}`);
  };

  return (
    <div className="flex flex-col cursor-pointer" onClick={handleClick}>
      <div className="bank-card">
        <div className="bank-card_content">
          <div>
            <h1 className="text-16 font-semibold text-white absolute top-1 left-4">
              {project.name}
            </h1>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <div className="w-[105px] h-[105px]">
                <Doughnut data={chartData} options={chartOptions as any} />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-black mr-2"></div>
                  <div>
                    <p className="text-12 font-semibold text-white">
                      Students: 
                      <br />
                      {project.stats.studentsCount}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-black mr-2"></div>
                  <div>
                    <p className="text-12 font-semibold text-white">
                      Leaders: 
                      <br />
                      {project.stats.shiftLeadersCount}
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
}
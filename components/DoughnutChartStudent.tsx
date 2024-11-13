"use client"

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const DoughnutChartStudent = ({ projects }: { projects: ProjectTimeStats[] }) => {
  const projectNames = projects.map((p) => p.projectName);
  const hours = projects.map((p) => p.trackedHours);

  const data = {
    datasets: [
      {
        label: 'Projects',
        data: hours,
        backgroundColor: ['#0747b6', '#2265d8', '#2f91fa']
      }
    ],
    labels: projectNames
  }

  return <Doughnut 
    data={data} 
    options={{
      cutout: '60%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              const hours = Math.floor(context.raw);
              const minutes = Math.round((context.raw - hours) * 60);
              return `${hours}h ${minutes}m`;
            }
          }
        }
      }
    }}
  />
}

export default DoughnutChartStudent;
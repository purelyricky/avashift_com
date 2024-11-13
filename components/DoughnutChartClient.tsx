"use client"

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const DoughnutChartClient = ({ stats }: { stats: ClientProjectStats }) => {
  const data = {
    datasets: [
      {
        label: 'Students per Project',
        data: stats.projectSegments.map(segment => segment.studentCount),
        backgroundColor: stats.projectSegments.map(segment => segment.color)
      }
    ],
    labels: stats.projectSegments.map(segment => segment.projectName)
  }

  return <Doughnut 
    data={data} 
    options={{
      cutout: '60%',
      plugins: {
        legend: {
          display: false,
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              const projectName = context.label;
              const studentCount = context.raw;
              return `${projectName}: ${studentCount} students`;
            }
          }
        }
      }
    }}
  />
}

export default DoughnutChartClient;
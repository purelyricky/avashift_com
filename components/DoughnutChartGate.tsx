"use client"

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const DoughnutChartGateman = ({ stats }: { stats: GatemanShiftStats }) => {
  const data = {
    datasets: [
      {
        label: 'Students',
        data: stats.studentSegments.map(segment => segment.count),
        backgroundColor: stats.studentSegments.map(segment => segment.color)
      }
    ],
    labels: stats.studentSegments.map(segment => segment.label)
  }

  return <Doughnut 
    data={data} 
    options={{
      cutout: '60%',
      plugins: {
        legend: {
          display: false,
          position: 'bottom'
        }
      }
    }}
  />
}

export default DoughnutChartGateman;
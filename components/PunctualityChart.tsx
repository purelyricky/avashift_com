'use client';

import { Chart as ChartJS, ArcElement, Tooltip, TooltipItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip);

const PunctualityChart = ({ punctuality }: { punctuality: number }) => {
  const getColor = (score: number) => {
    if (score >= 75) return '#22c55e'; // Green
    if (score >= 60) return '#fbbf24'; // Yellow
    if (score >= 50) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const data = {
    datasets: [
      {
        data: [punctuality, 100 - punctuality],
        backgroundColor: [
          getColor(punctuality),
          '#e5e7eb'
        ]
      }
    ],
    labels: ['Punctuality', 'Remaining']
  };

  return (
    <Doughnut
      data={data}
      options={{
        cutout: '60%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context: TooltipItem<"doughnut">) => `${(context.raw as number).toFixed(1)}%`
            }
          }
        }
      }}
    />
  );
};

export default PunctualityChart;
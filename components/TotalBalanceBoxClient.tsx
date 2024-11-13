import React from 'react';
import AnimatedCounterClient from './AnimatedCounterClient';
import DoughnutChartClient from './DoughnutChartClient';

const TotalBalanceBoxClient = ({ clientStats }: { clientStats: ClientStats }) => {
  const projectStats: ClientProjectStats = {
    totalProjects: clientStats.totalProjects,
    totalStudents: clientStats.totalStudents,
    projectSegments: clientStats.projectDistribution
  };

  return (
    <section className="total-balance">
      <div className="total-balance-chart">
            <DoughnutChartClient stats={projectStats} />
          </div>

          <div className="flex flex-col gap-6">
            <h2 className="header-2">
              Total Projects: {clientStats.totalProjects}
            </h2>
            <div className="flex flex-col gap-2">
              <p className="total-balance-label">
                Total Students Available
              </p>

              <div className="total-balance-amount flex-center gap-2">
                <AnimatedCounterClient count={clientStats.totalStudents} />
              </div>
            </div>
          </div>
    </section>
  );
};

export default TotalBalanceBoxClient;
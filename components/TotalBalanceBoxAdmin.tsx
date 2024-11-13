import React from 'react';
import AnimatedCounterAdmin from './AnimatedCounterAdmin';
import DoughnutChartAdmin from './DoughnutChartAdmin';

const TotalBalanceBoxAdmin = ({ adminStats }: { adminStats: AdminStats }) => {
  const projectStats: AdminProjectStats = {
    totalProjects: adminStats.totalProjects,
    totalStudents: adminStats.totalStudents,
    projectSegments: adminStats.projectDistribution
  };

  return (
        <section className="total-balance">
          <div className="total-balance-chart">
            <DoughnutChartAdmin stats={projectStats} />
          </div>

          <div className="flex flex-col gap-6">
            <h2 className="header-2">
              Total Projects: {adminStats.totalProjects}
            </h2>
            <div className="flex flex-col gap-2">
              <p className="total-balance-label">
                All Available Students
              </p>

              <div className="total-balance-amount flex-center gap-2">
                <AnimatedCounterAdmin count={adminStats.totalStudents} />
              </div>
            </div>
          </div>
        </section>
  );
};

export default TotalBalanceBoxAdmin;

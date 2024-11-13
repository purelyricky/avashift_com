import React from 'react';
import AnimatedCounterLeader from './AnimatedCounterLeader';
import DoughnutChartLeader from './DoughnutChartLeader';
import { StatCardLeader } from './StatCardLeader';
import { QuickActionl } from '@/components/quick-actionl';

const TotalBalanceBoxLeader = ({ leaderStats }: { leaderStats: LeaderStats }) => {
  const shiftStats: LeaderShiftStats = {
    totalStudents: leaderStats.totalStudents,
    studentSegments: [
      {
        label: 'Clocked In',
        count: leaderStats.clockedInStudents,
        color: '#2265d8'
      },
      {
        label: 'Not Clocked In',
        count: leaderStats.notClockedInStudents,
        color: '#0747b6'
      }
    ]
  };

  return (
    <section className="w-full p-4">
      <div>
        <section className="total-balance">
          <div className="total-balance-chart">
            <DoughnutChartLeader stats={shiftStats} />
          </div>

          <div className="flex flex-col gap-6">
            <h2 className="header-2">
              Total Students: {leaderStats.totalStudents}
            </h2>
            <div className="flex flex-col gap-2">
              <p className="total-balance-label">
                Currently Clocked In
              </p>

              <div className="total-balance-amount flex-center gap-2">
                <AnimatedCounterLeader count={leaderStats.clockedInStudents} />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
        <StatCardLeader
          type="attendance"
          value={leaderStats.attendanceRate}
          label="Attendance Rate"
        />
        <StatCardLeader
          type="ratings"
          value={(leaderStats.averageRatings.punctuality + leaderStats.averageRatings.overall) / 2}
          label="Average Ratings"
        />
        <StatCardLeader
          type="comments"
          value={leaderStats.totalComments}
          label="Total Comments"
        />
      </div>

      <QuickActionl />
    </section>
  );
};

export default TotalBalanceBoxLeader;
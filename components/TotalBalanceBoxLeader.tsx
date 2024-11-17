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
        label: 'Bejelentkezve',
        count: leaderStats.clockedInStudents,
        color: '#2265d8'
      },
      {
        label: 'Nincs bejelentkezve',
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
              Összes diák: {leaderStats.totalStudents}
            </h2>
            <div className="flex flex-col gap-2">
              <p className="total-balance-label">
                Jelenleg bejelentkezve
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
          label="Részvételi arány"
        />
        <StatCardLeader
          type="ratings"
          value={5.0}
          label="Átlagos értékelés"
        />
        <StatCardLeader
          type="comments"
          value={leaderStats.totalComments}
          label="Összes hozzászólás"
        />
      </div>

      <QuickActionl />
    </section>
  );
};

export default TotalBalanceBoxLeader;
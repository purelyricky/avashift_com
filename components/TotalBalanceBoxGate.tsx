import React from 'react';
import AnimatedCounterGateman from '@/components/AnimatedCounterGateman';
import DoughnutChartGateman from '@/components/DoughnutChartGate';
import { QuickActiong } from '@/components/quick-actiong';

const TotalBalanceBoxGateman = ({ gatemanStats }: { gatemanStats: GatemanStats }) => {
  const shiftStats: GatemanShiftStats = {
    totalStudents: gatemanStats.totalExpectedStudents,
    studentSegments: [
      {
        label: 'Bejelentkezett',
        count: gatemanStats.clockedInStudents,
        color: '#2265d8'
      },
      {
        label: 'Nincs bejelentkezve',
        count: gatemanStats.notClockedInStudents,
        color: '#0747b6'
      }
    ]
  };

  return (
    <section className="w-full p-4">
    <section className="total-balance">
      <div className="total-balance-chart">
            <DoughnutChartGateman stats={shiftStats} />
          </div>

          <div className="flex flex-col gap-6">
            <h2 className="header-2">
              Várt diákok: {gatemanStats.totalExpectedStudents}
            </h2>
            <div className="flex flex-col gap-2">
              <p className="total-balance-label">
                Jelenleg bejelentkezve
              </p>

              <div className="total-balance-amount flex-center gap-2">
                <AnimatedCounterGateman count={gatemanStats.clockedInStudents} />
              </div>
            </div>
          </div>
    </section>
    <QuickActiong />
    </section>
  );
};

export default TotalBalanceBoxGateman;
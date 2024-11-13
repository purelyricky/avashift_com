import AnimatedCounterStudent from './AnimatedCounterStudent';
import DoughnutChartStudent from './DoughnutChartStudent';
import PunctualityChart from './PunctualityChart';
import PunctualityCounter from './PunctualityCounter';
import { ShiftStatCard } from './StatCard';
import {QuickActions} from '@/components/quick-actions';

const TotalBalanceBoxStudent = ({ projectStats }: { projectStats: EnhancedStudentProjectStats }) => {
  return (
    <section className="w-full p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="total-balance">
          <div className="total-balance-chart">
            <DoughnutChartStudent projects={projectStats.projectHours} />
          </div>

          <div className="flex flex-col gap-6">
            <h2 className="header-2">
              Projects: {projectStats.totalProjects}
            </h2>
            <div className="flex flex-col gap-2">
              <p className="total-balance-label">
                Total Monthly Hours
              </p>

              <div className="total-balance-amount flex-center gap-2">
                <AnimatedCounterStudent hours={projectStats.totalMonthlyHours} />
              </div>
            </div>
          </div>
        </section>

        <section className="total-balance">
          <div className="total-balance-chart">
            <PunctualityChart punctuality={projectStats.punctualityScore} />
          </div>

          <div className="flex flex-col gap-6">
            <h2 className="header-2">
              Punctuality Score
            </h2>
            <div className="flex flex-col gap-2">
              <p className="total-balance-label">
                Your percentage score
              </p>

              <div className="total-balance-amount flex-center gap-2">
                <PunctualityCounter score={projectStats.punctualityScore} />
              </div>
            </div>
          </div>
        </section>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
        <ShiftStatCard
          type="completed"
          count={projectStats.completedShiftsCount}
          label="Completed Shifts"
        />
        <ShiftStatCard
          type="upcoming"
          count={projectStats.upcomingShiftsCount}
          label="Upcoming Shifts"
        />
      </div>

      <QuickActions />
      
    </section>
  );
};

export default TotalBalanceBoxStudent;
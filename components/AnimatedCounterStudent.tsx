'use client';

import CountUp from 'react-countup';

const AnimatedCounterStudent = ({ hours }: { hours: number }) => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  return (
    <div className="w-full flex gap-1">
      <CountUp 
        end={wholeHours} 
        separator=" "
        suffix="h"
      />
      <CountUp 
        end={minutes} 
        separator=" "
        suffix="m"
      />
    </div>
  );
}

export default AnimatedCounterStudent;
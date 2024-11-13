'use client';

import CountUp from 'react-countup';

const AnimatedCounterClient = ({ count }: { count: number }) => {
  return (
    <div className="w-full">
      <CountUp 
        end={count} 
        separator=" "
      />
    </div>
  );
}

export default AnimatedCounterClient;

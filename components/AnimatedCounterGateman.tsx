'use client';

import CountUp from 'react-countup';

const AnimatedCounterGateman = ({ count }: { count: number }) => {
  return (
    <div className="w-full">
      <CountUp 
        end={count} 
        separator=" "
      />
    </div>
  );
}

export default AnimatedCounterGateman;
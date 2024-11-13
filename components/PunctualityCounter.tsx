'use client';

import CountUp from 'react-countup';

const PunctualityCounter = ({ score }: { score: number }) => {
  return (
    <div className="w-full flex gap-1">
      <CountUp
        decimals={1}
        decimal="."
        end={score}
        suffix="%"
      />
    </div>
  );
};

export default PunctualityCounter;
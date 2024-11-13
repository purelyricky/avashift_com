// components/shared/StarRating.tsx
"use client"

import { Star as StarIcon } from 'lucide-react';

interface StarRatingProps {
  value: number;
}

const StarRating = ({ value }: StarRatingProps) => {
  // Convert value to number and ensure it's between 0 and 5
  const numericRating = Math.min(Math.max(Number(value), 0), 5);
  
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((index) => {
        const difference = numericRating - index;
        
        // Full star
        if (difference >= 0) {
          return (
            <StarIcon
              key={index}
              className="h-4 w-4"
              style={{ 
                color: '#FFB800',
                fill: '#FFB800'
              }}
            />
          );
        }
        // Half star
        else if (difference > -1) {
          return (
            <div 
              key={index} 
              className="relative"
              style={{ width: '16px', height: '16px' }}
            >
              {/* Background star (empty) */}
              <StarIcon
                className="absolute h-4 w-4"
                style={{ 
                  color: '#1A202C',
                  fill: 'white',
                  strokeWidth: 1.5
                }}
              />
              {/* Foreground star (half) */}
              <div 
                className="absolute overflow-hidden"
                style={{ width: '50%', height: '16px' }}
              >
                <StarIcon
                  className="h-4 w-4"
                  style={{ 
                    color: '#FFB800',
                    fill: '#FFB800'
                  }}
                />
              </div>
            </div>
          );
        }
        // Empty star
        return (
          <StarIcon
            key={index}
            className="h-4 w-4"
            style={{ 
              color: '#1A202C',
              fill: 'white',
              strokeWidth: 1.5
            }}
          />
        );
      })}
    </div>
  );
};

export default StarRating;
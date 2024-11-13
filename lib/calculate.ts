function calculateHours(
    shiftStart: Date,
    shiftEnd: Date,
    clockIn: Date,
    clockOut: Date
  ): { trackedHours: number; lostHours: number } {
    // Convert all times to minutes since midnight for easier calculation
    const shiftStartMins = shiftStart.getTime();
    const shiftEndMins = shiftEnd.getTime();
    const clockInMins = clockIn.getTime();
    const clockOutMins = clockOut.getTime();
  
    // Calculate total scheduled shift duration in hours
    const scheduledDuration = (shiftEndMins - shiftStartMins) / (1000 * 60 * 60);
  
    // Calculate actual worked duration in hours
    const actualDuration = (clockOutMins - clockInMins) / (1000 * 60 * 60);
  
    // Calculate late arrival and early departure times in hours
    const lateArrival = Math.max(0, (clockInMins - shiftStartMins) / (1000 * 60 * 60));
    const earlyDeparture = Math.max(0, (shiftEndMins - clockOutMins) / (1000 * 60 * 60));
  
    // Calculate total lost hours (time not worked during scheduled shift)
    const lostHours = lateArrival + earlyDeparture;
  
    // Calculate tracked hours (actual time worked during scheduled shift)
    let trackedHours = actualDuration;
  
    // If clocked in before shift start, adjust tracked hours
    if (clockInMins < shiftStartMins) {
      trackedHours -= (shiftStartMins - clockInMins) / (1000 * 60 * 60);
    }
  
    // If clocked out after shift end, adjust tracked hours
    if (clockOutMins > shiftEndMins) {
      trackedHours -= (clockOutMins - shiftEndMins) / (1000 * 60 * 60);
    }
  
    // Ensure tracked hours doesn't exceed scheduled duration
    trackedHours = Math.min(trackedHours, scheduledDuration);
  
    // Ensure no negative values
    trackedHours = Math.max(0, trackedHours);
    
    return {
      trackedHours: Number(trackedHours.toFixed(2)),
      lostHours: Number(lostHours.toFixed(2))
    };
  }
  
  export default calculateHours;
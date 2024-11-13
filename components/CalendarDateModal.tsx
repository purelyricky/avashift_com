import React, { useCallback, useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

// Update the DateRangeType to make properties optional
export type DateRangeType = {
  from?: Date | undefined;
  to?: Date | undefined;
};

interface CalendarDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDateRange: DateRangeType;
  onApplyFilter: (range: DateRangeType) => void;
  allowUndefined?: boolean;
  className?: string;
  customStyles?: {
    content?: React.CSSProperties;
    container?: React.CSSProperties;
    button?: React.CSSProperties;
  };
}

export default function CalendarDateModal({
  isOpen,
  onClose,
  initialDateRange,
  onApplyFilter,
  allowUndefined = true,
  className = '',
  customStyles = {}
}: CalendarDateModalProps) {
  const [tempDateRange, setTempDateRange] = useState<DateRangeType>(initialDateRange);
  
  // Update type checking to handle optional properties
  const isDateRangeComplete = allowUndefined 
    ? true 
    : Boolean(tempDateRange.from && tempDateRange.to);

  const handleApplyFilter = useCallback(() => {
    if (allowUndefined || isDateRangeComplete) {
      onApplyFilter(tempDateRange);
      onClose();
    }
  }, [isDateRangeComplete, tempDateRange, onApplyFilter, onClose, allowUndefined]);

  React.useEffect(() => {
    if (isOpen) {
      setTempDateRange(initialDateRange);
    }
  }, [isOpen, initialDateRange]);

  const getDateRangeText = () => {
    if (!tempDateRange.from || !tempDateRange.to) {
      return 'Select start and end dates';
    }
    return `${format(tempDateRange.from, "MMMM d, yyyy")} - ${format(tempDateRange.to, "MMMM d, yyyy")}`;
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={onClose}
    >
      <DialogContent 
        className={className}
        style={{
          maxWidth: '800px',
          padding: '24px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          ...customStyles.content
        }}
      >
        <div style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          ...customStyles.container
        }}>
          <CalendarComponent
            initialFocus
            mode="range"
            defaultMonth={tempDateRange.from}
            selected={{
              from: tempDateRange.from,
              to: tempDateRange.to
            }}
            onSelect={(range) => {
              if (range) {
                setTempDateRange({
                  from: range.from,
                  to: range.to
                });
              }
            }}
            numberOfMonths={2}
            showOutsideDays
            className="calendar-custom"
            classNames={{
              months: "flex flex-row space-x-4",
              month: "space-y-4",
              caption: "flex justify-center items-center pt-1 relative",
              caption_label: "font-semibold text-lg text-gray-900",
              nav: "flex items-center",
              nav_button: "h-7 w-7 bg-transparent hover:bg-blue-50 rounded-full transition-colors duration-200",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse",
              head_row: "flex",
              head_cell: "w-9 h-9 font-normal text-gray-500 rounded-full",
              row: "flex w-full mt-2",
              cell: "w-9 h-9 text-center text-sm relative p-0 hover:bg-blue-50 rounded-full transition-colors duration-200",
              day: "w-9 h-9 p-0 font-normal",
              day_today: "text-blue-600 font-semibold",
              day_selected: "bg-blue-600 text-white hover:bg-blue-600 rounded-full",
              day_range_middle: "bg-blue-50 text-gray-900 hover:bg-blue-100",
              day_range_end: "bg-blue-600 text-white hover:bg-blue-600 rounded-full",
              day_range_start: "bg-blue-600 text-white hover:bg-blue-600 rounded-full",
              day_outside: "text-gray-400 opacity-50",
            }}
          />

          <div style={{
            marginTop: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#6B7280',
              textAlign: 'center'
            }}>
              <span style={{ 
                fontWeight: isDateRangeComplete ? '500' : '400',
                color: isDateRangeComplete ? '#1F2937' : '#6B7280'
              }}>
                {getDateRangeText()}
              </span>
            </div>
            <Button
              onClick={handleApplyFilter}
              disabled={!allowUndefined && !isDateRangeComplete}
              style={{
                backgroundColor: isDateRangeComplete ? '#2563eb' : '#E5E7EB',
                color: isDateRangeComplete ? '#FFFFFF' : '#9CA3AF',
                padding: '10px 24px',
                borderRadius: '6px',
                fontWeight: '500',
                cursor: isDateRangeComplete ? 'pointer' : 'not-allowed',
                border: 'none',
                width: '100%',
                maxWidth: '200px',
                transition: 'all 0.2s',
                fontSize: '14px',
                ...customStyles.button
              }}
            >
              Apply Filter
            </Button>
          </div>
        </div>
        
        <style jsx global>{`
          .calendar-custom .rdp-day_selected, 
          .calendar-custom .rdp-day_range_start,
          .calendar-custom .rdp-day_range_end {
            background-color: #2563eb !important;
            color: white !important;
          }
          
          .calendar-custom .rdp-day_range_middle {
            background-color: #e0e7ff !important;
            color: #2563eb !important;
          }
          
          .calendar-custom .rdp-day:hover:not([disabled]) {
            background-color: #f3f4f6 !important;
          }
          
          .calendar-custom .rdp-day_selected:hover {
            background-color: #1d4ed8 !important;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
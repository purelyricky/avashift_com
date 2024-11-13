"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sun, Moon, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, parseISO } from "date-fns";
import classNames from 'classnames';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateAvailability, getLoggedInUser, getUserCurrentAvailability, bulkUpdateAvailability } from "@/lib/actions/user.actions";

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
] as const;

type DayOfWeek = typeof DAYS_OF_WEEK[number];
type TimeType = 'day' | 'night';

interface AvailabilityPeriod {
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  availabilities: Array<{
    dayOfWeek: DayOfWeek;
    timeType: TimeType;
  }>;
}

const formSchema = z.object({
  fromDate: z.string().min(1, "Start date is required"),
  toDate: z.string().min(1, "End date is required"),
  availabilities: z.array(z.object({
    dayOfWeek: z.enum(DAYS_OF_WEEK),
    timeType: z.enum(['day', 'night'] as const)
  })).min(1, "At least one availability must be selected")
});

interface AvailabilityItem {
  dayOfWeek: DayOfWeek;
  timeType: TimeType;
}

const UpdateAvailabilityForms = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAvailabilities, setIsLoadingAvailabilities] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAvailabilities, setSelectedAvailabilities] = useState<AvailabilityItem[]>([]);
  const [currentAvailabilities, setCurrentAvailabilities] = useState<AvailabilityPeriod[]>([]);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>(
    DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: false }), {})
  );
  // Add a refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromDate: "",
      toDate: "",
      availabilities: []
    }
  });

  useEffect(() => {
    const fetchCurrentAvailabilities = async () => {
      setIsLoadingAvailabilities(true);
      try {
        const userResponse = await getLoggedInUser();
        if (userResponse.status === 'success' && userResponse.data) {
          const availabilityResponse = await getUserCurrentAvailability(userResponse.data.userId);
          if (availabilityResponse.status === 'success' && availabilityResponse.data) {
            setCurrentAvailabilities(availabilityResponse.data);
            if (availabilityResponse.data.length > 0) {
              const current = availabilityResponse.data[0];
              // Parse and format dates consistently
              const fromDate = formatDateForInput(current.dateRange.fromDate);
              const toDate = formatDateForInput(current.dateRange.toDate);
              form.setValue('fromDate', fromDate);
              form.setValue('toDate', toDate);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching current availabilities:', error);
      } finally {
        setIsLoadingAvailabilities(false);
      }
    };

    fetchCurrentAvailabilities();
  }, [form, refreshTrigger]);

  const toggleDay = (day: string) => {
    setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const isTimeSelected = (day: DayOfWeek, timeType: TimeType) => {
    return selectedAvailabilities.some(
      avail => avail.dayOfWeek === day && avail.timeType === timeType
    );
  };

  // Add new date formatting functions
  const formatDateForInput = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'dd-MM-yyyy');
    } catch (error) {
      console.error('Date parsing error:', error);
      return dateString;
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'dd-MM-yyyy');
    } catch (error) {
      console.error('Date parsing error:', error);
      return dateString;
    }
  };

  const addAvailability = (e: React.MouseEvent, day: DayOfWeek, timeType: TimeType) => {
    e.stopPropagation();
    const exists = selectedAvailabilities.some(
      avail => avail.dayOfWeek === day && avail.timeType === timeType
    );

    if (!exists) {
      const newAvailability: AvailabilityItem = { dayOfWeek: day, timeType };
      setSelectedAvailabilities(prev => {
        const newAvailabilities = [...prev, newAvailability];
        form.setValue('availabilities', newAvailabilities);
        return newAvailabilities;
      });
    }
  };

  // Add this helper function inside the component
  const groupAvailabilitiesByDay = (availabilities: Array<{ dayOfWeek: DayOfWeek; timeType: TimeType }>) => {
    return availabilities.reduce((acc, curr) => {
      if (!acc[curr.dayOfWeek]) {
        acc[curr.dayOfWeek] = { day: false, night: false };
      }
      acc[curr.dayOfWeek][curr.timeType] = true;
      return acc;
    }, {} as Record<DayOfWeek, { day: boolean; night: boolean }>);
  };


  const removeAvailability = (index: number) => {
    setSelectedAvailabilities(prev => {
      const newAvailabilities = prev.filter((_, i) => i !== index);
      form.setValue('availabilities', newAvailabilities);
      return newAvailabilities;
    });
  };

  // Modified onSubmit function
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);
  
    try {
      const userResponse = await getLoggedInUser();
      if (userResponse.status !== 'success' || !userResponse.data) {
        throw new Error("Failed to get user information");
      }
  
      const userId = userResponse.data.userId;
      
      // Use the new bulk update function
      await bulkUpdateAvailability({
        userId,
        fromDate: data.fromDate,
        toDate: data.toDate,
        availabilities: selectedAvailabilities,
      });
  
      // Reset form and state
      form.reset();
      setSelectedAvailabilities([]);
      
      // Trigger refresh of current availabilities
      setRefreshTrigger(prev => prev + 1);
      
      // Force router refresh
      router.refresh();
    } catch (error) {
      console.error("Submitting availability update failed:", error);
      setError(error instanceof Error ? error.message : "Failed to update availability");
    }
  
    setIsLoading(false);
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
        {error && (
          <div className="bg-red-50 text-red-500 p-3 mb-4 rounded-lg">
            {error}
          </div>
        )}

          {isLoadingAvailabilities ? (
          <div className="payment-transfer_form-details border-b border-gray-200 pb-6">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-gray-600">Loading current availability...</span>
            </div>
          </div>
        ) : currentAvailabilities.length > 0 && (
          <div className="payment-transfer_form-details border-b border-gray-200 pb-6">
            <h2 className="text-18 font-semibold text-gray-900">
              Current Active Availabilities
            </h2>
            <p className="text-16 font-normal text-gray-600 mb-4">
              Your most recently updated availability period
            </p>
            
            <div className="space-y-4">
              {currentAvailabilities.map((period, index) => {
                const groupedAvailabilities = groupAvailabilitiesByDay(period.availabilities);
                
                return (
                  <div 
                    key={index}
                    className="rounded-lg shadow-sm border border-gray-200 transition-shadow duration-200 hover:shadow-md"
                  >
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">
                          {formatDateForDisplay(period.dateRange.fromDate)} to {formatDateForDisplay(period.dateRange.toDate)}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 gap-3">
                      {DAYS_OF_WEEK.map((day) => {
                        const dayAvailability = groupedAvailabilities[day];
                        if (!dayAvailability) return null;

                        return (
                          <div
                            key={day}
                            className="flex items-center justify-between p-3 rounded-md border border-gray-100 bg-white"
                          >
                            <div className="flex items-center gap-4">
                              <span className="font-medium text-gray-900 min-w-[100px]">
                                {day}
                              </span>
                              <div className="flex items-center gap-4">
                                {dayAvailability.day && (
                                  <div className="flex items-center gap-2">
                                    <Sun className="h-4 w-4 text-yellow-500" />
                                    <span className="text-sm text-gray-600">
                                      Day Shift
                                    </span>
                                  </div>
                                )}
                                {dayAvailability.night && (
                                  <div className="flex items-center gap-2">
                                    <Moon className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm text-gray-600">
                                      Night Shift
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="fromDate"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">
                    From Date
                  </FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Enter the start date (DD-MM-YYYY)
                  </FormDescription>
                </div>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Input
                      placeholder="DD-MM-YYYY"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="toDate"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">
                    To Date
                  </FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Enter the end date (DD-MM-YYYY)
                  </FormDescription>
                </div>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Input
                      placeholder="DD-MM-YYYY"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <div className="payment-transfer_form-details">
          <h2 className="text-18 font-semibold text-gray-900">
            Weekly Availability
          </h2>
          <p className="text-16 font-normal text-gray-600">
            Select your available days and shifts
          </p>
        </div>

        {DAYS_OF_WEEK.map((day) => (
          <FormField
            key={day}
            control={form.control}
            name="availabilities"
            render={() => (
              <FormItem className="border-t border-gray-200">
                <div 
                  className="payment-transfer_form-item py-5 cursor-pointer transition-colors hover:bg-gray-50"
                  onClick={() => toggleDay(day)}
                >
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-14 font-medium text-gray-700 cursor-pointer">
                      {day}
                    </FormLabel>
                    {expandedDays[day] ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  
                  {expandedDays[day] && (
                    <div className="flex w-full gap-4 mt-4">
                      <Button
                        type="button"
                        variant={isTimeSelected(day, 'day') ? 'default' : 'outline'}
                        onClick={(e) => addAvailability(e, day, 'day')}
                        className={classNames(
                          "flex items-center gap-2 transition-colors",
                          isTimeSelected(day, 'day') ? "bg-gray-900 text-white hover:bg-gray-800" : "hover:bg-gray-100"
                        )}
                      >
                        <Sun className={classNames(
                          "h-4 w-4",
                          isTimeSelected(day, 'day') ? "text-white" : "text-yellow-500"
                        )} />
                        Day Shift
                      </Button>
                      <Button
                        type="button"
                        variant={isTimeSelected(day, 'night') ? 'default' : 'outline'}
                        onClick={(e) => addAvailability(e, day, 'night')}
                        className={classNames(
                          "flex items-center gap-2 transition-colors",
                          isTimeSelected(day, 'night') ? "bg-gray-900 text-white hover:bg-gray-800" : "hover:bg-gray-100"
                        )}
                      >
                        <Moon className={classNames(
                          "h-4 w-4",
                          isTimeSelected(day, 'night') ? "text-white" : "text-blue-500"
                        )} />
                        Night Shift
                      </Button>
                    </div>
                  )}
                </div>
              </FormItem>
            )}
          />
        ))}

        {selectedAvailabilities.length > 0 && (
          <FormItem className="border-y border-gray-200">
            <div className="payment-transfer_form-item py-5">
              <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                Selected Availabilities
              </FormLabel>
              <div className="flex w-full flex-col space-y-3">
                {selectedAvailabilities.map((item, index) => (
                  <div 
                    key={index} 
                    className="rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="flex flex-col">
                      <div className="p-4 flex items-center justify-between bg-gray-50">
                        <div className="flex items-center gap-2">
                          {item.timeType === 'day' ? (
                            <Sun className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <Moon className="h-5 w-5 text-blue-500" />
                          )}
                          <span className="font-medium text-gray-900">{item.dayOfWeek}</span>
                          <span className="text-sm text-gray-500 capitalize">
                            - {item.timeType} Shift
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeAvailability(index)}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="px-4 py-3 bg-white">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>From:</span>
                          <span className="font-medium text-gray-900">
                            {form.getValues('fromDate') || 'Date not set'}
                          </span>
                          <span className="mx-2">-</span>
                          <span>To:</span>
                          <span className="font-medium text-gray-900">
                            {form.getValues('toDate') || 'Date not set'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FormItem>
        )}

        <div className="payment-transfer_btn-box">
          <Button 
            type="submit" 
            className="payment-transfer_btn"
            disabled={isLoading || selectedAvailabilities.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" /> &nbsp; Updating...
              </>
            ) : (
              "Update Availability"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default UpdateAvailabilityForms;


"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  UserCheck,
  TrendingUp,
  Search,
  Calendar,
  Sun,
  Moon,
  CheckCircle,
  XCircle,
  Download,
  SlidersHorizontal,
  Bell,
  Hand,
  Dot,
  RectangleEllipsis,
  Ban,
} from "lucide-react";
import StarRating from "@/components/StarRating";
import { ErrorDialog } from "@/components/ErrorDialog";
import CalendarDateModal from "@/components/CalendarDateModal";
import {
  getShiftAssignmentStats,
  getUserAvailabilities,
  createShiftAssignment,
  getUserAvailableDates,
  getProjectShifts,
  type ShiftAssignmentStats,
  type UserAvailability,
  type OptionalDateRange,
  getSelectedDaysStats,
  SelectedDaysStats,
  markNoShiftDates,
  getAvailableDatesForDay,
} from "@/lib/actions/shift-assignments.actions";

// Constants
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Types
interface Filters {
  punctuality: {
    order: "none" | "asc" | "desc";
    minValue: number;
  };
  requestedDays: {
    days: string[];
    type: "all" | "day" | "night";
  };
  bookedDays: {
    days: string[];
    type: "all" | "day" | "night";
  };
}

// Types

export const COLORS = {
  background: {
    primary: "#FFFFFF",
    secondary: "#F3F4F6", // Light gray for backgrounds
  },
  border: {
    primary: "#E2E8F0",
    secondary: "#CBD5E1",
  },
  text: {
    primary: "#1A202C",
    secondary: "#2D3748",
    tertiary: "#718096",
  },
  progress: {
    uncovered: "#F3F4F6", // Light gray/white-ish for uncovered
    low: "#3B82F6", // Blue for low coverage
    medium: "#F59E0B", // Yellow for medium coverage
    high: "#10B981", // Green for high coverage
    over: "#EF4444", // Red for over-assignment
  },
  icon: {
    day: "#F6AD55", // Sun icon color
    night: "#4299E1", // Moon icon color
    muted: "#718096", // Muted icon color
  },
  button: {
    primary: "#3182CE",
    success: "#48BB78",
    danger: "#F56565",
  },
};

export interface ShiftAssignmentExport {
  studentName: string;
  requestedDayShifts: string;  // Will be comma-separated string of days
  requestedNightShifts: string;  // Will be comma-separated string of days
  bookedDayShifts: string;  // Will be comma-separated string of days
  bookedNightShifts: string;  // Will be comma-separated string of days
  punctualityScore: number;
  rating: number;
}

export interface ProgressStats {
  value: number;
  total: number;
  assigned: number;
  percentage: number;
  isOver: boolean;
}

//==============

interface ShiftAssignmentTableProps {
  projectId: string;
  initialStats: ShiftAssignmentStats;
  initialAvailabilities: UserAvailability[];
}

const InitialsAvatar = ({ name }: { name: string }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const colors = [
    "#FF4B55",
    "#4299E1",
    "#48BB78",
    "#ECC94B",
    "#9F7AEA",
    "#ED64A6",
    "#667EEA",
    "#38B2AC",
    "#ED8936",
    "#4FD1C5",
  ];
  const colorIndex =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;

  return (
    <div
      className="flex items-center justify-center size-10 rounded-full text-white font-semibold"
      style={{ backgroundColor: colors[colorIndex] }}
    >
      {initials}
    </div>
  );
};

export default function ShiftAssignmentTable({
  projectId,
  initialStats,
  initialAvailabilities,
}: ShiftAssignmentTableProps) {
  // States
  const [stats, setStats] = useState<ShiftAssignmentStats>(initialStats);
  const [workers, setWorkers] = useState<UserAvailability[]>(
    initialAvailabilities
  );
  const [filteredWorkers, setFilteredWorkers] = useState<UserAvailability[]>(
    initialAvailabilities
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "Mon",
    "Tue",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<OptionalDateRange>({
    from: undefined,
    to: undefined,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredWorkers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage);
  const [selectedShifts, setSelectedShifts] = useState<Record<string, string>>(
    {}
  );

  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    punctuality: {
      order: "none",
      minValue: 0,
    },
    requestedDays: {
      days: [],
      type: "all",
    },
    bookedDays: {
      days: [],
      type: "all",
    },
  });

  // Helper function to convert full day name to short form
  const getShortDay = (fullDay: string) => {
    return fullDay.substring(0, 3);
  };

  const [loadingNoShifts, setLoadingNoShifts] = useState<
    Record<string, boolean>
  >({});

  // Filter functions
  const applyFilters = (items: UserAvailability[]) => {
    let filteredItems = [...items];

    // Apply punctuality filters
    if (filters.punctuality.order !== "none") {
      filteredItems.sort((a, b) => {
        if (filters.punctuality.order === "asc") {
          return a.punctualityScore - b.punctualityScore;
        }
        return b.punctualityScore - a.punctualityScore;
      });
    }
    if (filters.punctuality.minValue > 0) {
      filteredItems = filteredItems.filter(
        (item) => item.punctualityScore >= filters.punctuality.minValue
      );
    }

    // Apply requested days filters
    if (filters.requestedDays.days.length > 0) {
      filteredItems = filteredItems.filter((item) => {
        const relevantDays =
          filters.requestedDays.type === "day"
            ? item.requestedDays.day
            : filters.requestedDays.type === "night"
            ? item.requestedDays.night
            : [...item.requestedDays.day, ...item.requestedDays.night];
        return filters.requestedDays.days.some((day) =>
          relevantDays.includes(day)
        );
      });
    }

    // Add these useEffect hooks to monitor data flow
    useEffect(() => {
      console.log("Date Range:", dateRange);
    }, [dateRange]);

    useEffect(() => {
      console.log("Workers:", workers);
    }, [workers]);

    useEffect(() => {
      console.log(
        "Available Shifts:",
        workers.map((w) => w.availableShifts)
      );
    }, [workers]);

    // Apply booked days filters
    if (filters.bookedDays.days.length > 0) {
      filteredItems = filteredItems.filter((item) => {
        const relevantDays =
          filters.bookedDays.type === "day"
            ? item.bookedDays.day
            : filters.bookedDays.type === "night"
            ? item.bookedDays.night
            : [...item.bookedDays.day, ...item.bookedDays.night];
        return filters.bookedDays.days.some((day) =>
          relevantDays.includes(day)
        );
      });
    }

    return filteredItems;
  };

  const handleApplyFilters = () => {
    const filteredItems = applyFilters(workers);
    setFilteredWorkers(filteredItems);
    setFilterDialogOpen(false);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      punctuality: {
        order: "none",
        minValue: 0,
      },
      requestedDays: {
        days: [],
        type: "all",
      },
      bookedDays: {
        days: [],
        type: "all",
      },
    });
    setFilteredWorkers(workers);
    setCurrentPage(1);
  };

  // Add these handler functions
  const handleApproveShift = async (userId: string) => {
    const shiftId = selectedShifts[userId];
    if (!shiftId) return;

    setLoadingAssignments((prev) => ({ ...prev, [userId]: true }));
    try {
      // Find the worker data
      const workerData = workers.find((w) => w.userId === userId);
      if (!workerData) {
        setErrorMessage("Worker data not found");
        setErrorDialogOpen(true);
        return;
      }

      const result = await createShiftAssignment(
        projectId,
        userId,
        shiftId,
        workerData
      );

      if (!result.success) {
        setErrorMessage(result.error || "Failed to create assignment");
        setErrorDialogOpen(true);
        return;
      }

      // Refresh data after successful assignment
      const [statsData, availabilityData] = await Promise.all([
        getShiftAssignmentStats(projectId, dateRange),
        getUserAvailabilities(projectId, dateRange),
      ]);

      setStats(statsData);
      setWorkers(availabilityData);
      setFilteredWorkers(availabilityData);

      // Clear the selection
      setSelectedShifts((prev) => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });
    } catch (error) {
      console.error("Error approving shift assignment:", error);
      setErrorMessage("An unexpected error occurred");
      setErrorDialogOpen(true);
    } finally {
      setLoadingAssignments((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    if (score >= 50) return "bg-blue-500";
    return "bg-red-500";
  };

  const toggleDaySelection = (day: string) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      } else {
        // Keep the days in order from Sunday to Saturday when adding
        const newDays = [...prev, day];
        return newDays.sort(
          (a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b)
        );
      }
    });
  };

  // Helper functions
  const calculateProgressStats = useCallback(
    (assigned: number, demand: number): ProgressStats => {
      const percentage =
        demand === 0 ? 0 : Math.round((assigned / demand) * 100);
      return {
        value: assigned,
        total: demand,
        assigned,
        percentage,
        isOver: percentage > 100,
      };
    },
    []
  );

  const getProgressColor = useCallback((stats: ProgressStats): string => {
    const { percentage } = stats;
    if (percentage > 100) return COLORS.progress.over;
    if (percentage >= 90) return COLORS.progress.high;
    if (percentage >= 70) return COLORS.progress.medium;
    if (percentage > 0) return COLORS.progress.low;
    return COLORS.progress.uncovered;
  }, []);

  // Event Handlers
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const filtered = workers.filter((worker) =>
        worker.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredWorkers(filtered);
      setCurrentPage(1);
    },
    [workers, searchTerm]
  );

  // Add these state declarations to your existing states
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingAssignments, setLoadingAssignments] = useState<
    Record<string, boolean>
  >({});

  // Update the handleDateRangeSelect function
  const handleDateRangeSelect = async (range: OptionalDateRange) => {
    setDateRange(range);
    try {
      const [statsData, availabilityData] = await Promise.all([
        getShiftAssignmentStats(projectId, range),
        getUserAvailabilities(projectId, range),
      ]);
      setStats(statsData);
      setWorkers(availabilityData);
      setFilteredWorkers(availabilityData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorMessage("Failed to fetch data. Please try again.");
      setErrorDialogOpen(true);
    }
  };

  const handleShiftAssignment = async (userId: string, shiftId: string) => {
    try {
      const result = await createShiftAssignment(projectId, userId, shiftId);

      if (result.success) {
        const [statsData, availabilityData] = await Promise.all([
          getShiftAssignmentStats(projectId, dateRange),
          getUserAvailabilities(projectId, dateRange),
        ]);
        setStats(statsData);
        setWorkers(availabilityData);
        setFilteredWorkers(availabilityData);
      }
    } catch (error) {
      console.error("Error assigning shift:", error);
    }
  };

  //================================

  // Add new handler for marking no-shift dates
  const handleMarkNoShift = async (userId: string) => {
    const worker = workers.find((w) => w.userId === userId);
    if (!worker || !dateRange.from || !dateRange.to) return;

    setLoadingNoShifts((prev) => ({ ...prev, [userId]: true }));
    try {
      // Use Promise.all to wait for all date calculations
      const dayDatesPromises = worker.requestedDays.day.map((day) =>
        getAvailableDatesForDay(day, dateRange.from!, dateRange.to!, "day")
      );

      const nightDatesPromises = worker.requestedDays.night.map((day) =>
        getAvailableDatesForDay(day, dateRange.from!, dateRange.to!, "night")
      );

      // Wait for all promises to resolve
      const [dayDates, nightDates] = await Promise.all([
        Promise.all(dayDatesPromises),
        Promise.all(nightDatesPromises),
      ]);

      // Flatten the arrays of dates
      const availableDates = [...dayDates.flat(), ...nightDates.flat()];

      const result = await markNoShiftDates(projectId, userId, availableDates);

      if (!result.success) {
        setErrorMessage(result.error || "Failed to mark no-shift dates");
        setErrorDialogOpen(true);
        return;
      }

      // Refresh the data
      const [statsData, availabilityData] = await Promise.all([
        getShiftAssignmentStats(projectId, dateRange),
        getUserAvailabilities(projectId, dateRange),
      ]);

      setStats(statsData);
      setWorkers(availabilityData);
      setFilteredWorkers(availabilityData);
    } catch (error) {
      console.error("Error marking no-shift dates:", error);
      setErrorMessage("An unexpected error occurred");
      setErrorDialogOpen(true);
    } finally {
      setLoadingNoShifts((prev) => ({ ...prev, [userId]: false }));
    }
  };

  //================================

  const handleExportData = async () => {
    try {
      const exportData: ShiftAssignmentExport[] = workers.map((worker) => ({
        studentName: worker.name,
        requestedDayShifts: worker.requestedDays.day.join(", "),
        requestedNightShifts: worker.requestedDays.night.join(", "),
        bookedDayShifts: worker.bookedDays.day.join(", "),
        bookedNightShifts: worker.bookedDays.night.join(", "),
        punctualityScore: worker.punctualityScore,
        rating: worker.rating
      }));
  
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
  
      // Customize column widths
      const columnWidths = [
        { wch: 20 },  // studentName
        { wch: 30 },  // requestedDayShifts
        { wch: 30 },  // requestedNightShifts
        { wch: 30 },  // bookedDayShifts
        { wch: 30 },  // bookedNightShifts
        { wch: 15 },  // punctualityScore
        { wch: 10 },  // rating
      ];
      ws["!cols"] = columnWidths;
  
      // Add headers with proper formatting
      XLSX.utils.sheet_add_aoa(ws, [[
        "Student Name",
        "Requested Day Shifts",
        "Requested Night Shifts",
        "Booked Day Shifts",
        "Booked Night Shifts",
        "Punctuality Score (%)",
        "Rating"
      ]], { origin: "A1" });
  
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Student Assignments");
  
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
  
      // Save the file
      saveAs(
        data,
        `student-assignments-${format(new Date(), "yyyy-MM-dd")}.xlsx`
      );
  
      console.log(
        "Export Successful:",
        "Student assignments have been exported to Excel"
      );
    } catch (error) {
      console.error("Export error:", error);
      console.error("Export Failed:", "Failed to export student assignments");
    }
  };

  const dayStats = calculateProgressStats(
    stats.assignedCount.day,
    stats.demand.day
  );
  const nightStats = calculateProgressStats(
    stats.assignedCount.night,
    stats.demand.night
  );

  // Add state for selected days stats
  const [selectedDaysStats, setSelectedDaysStats] = useState<SelectedDaysStats>(
    {
      totalRequests: 0,
      assignedCount: { day: 0, night: 0 },
      demand: { day: 0, night: 0 },
    }
  );

  // Update useEffect to fetch selected days stats when days selection changes
  useEffect(() => {
    const fetchSelectedDaysStats = async () => {
      if (selectedDays.length > 0) {
        try {
          const newStats = await getSelectedDaysStats(
            projectId,
            selectedDays,
            dateRange
          );
          setSelectedDaysStats(newStats);
        } catch (error) {
          console.error("Error fetching selected days stats:", error);
          setErrorMessage("Failed to fetch selected days stats");
          setErrorDialogOpen(true);
        }
      } else {
        setSelectedDaysStats({
          totalRequests: 0,
          assignedCount: { day: 0, night: 0 },
          demand: { day: 0, night: 0 },
        });
      }
    };

    fetchSelectedDaysStats();
  }, [selectedDays, dateRange, projectId]);

  // Update the progress calculations
  const selectedDayStats = calculateProgressStats(
    selectedDaysStats.assignedCount.day,
    selectedDaysStats.demand.day
  );

  const selectedNightStats = calculateProgressStats(
    selectedDaysStats.assignedCount.night,
    selectedDaysStats.demand.night
  );

  return (
    <div className="min-h-screen space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle
              className="text-sm font-medium"
              style={{ color: "#1A202C" }}
            >
              Total Requests
            </CardTitle>
            <Users className="h-4 w-4" style={{ color: "#718096" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "#2D3748" }}>
              {stats.totalRequests}
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle
              className="text-sm font-medium"
              style={{ color: "#1A202C" }}
            >
              Assigned Count
            </CardTitle>
            <UserCheck className="h-4 w-4" style={{ color: "#718096" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "#2D3748" }}>
              {stats.assignedCount.day + stats.assignedCount.night}
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle
              className="text-sm font-medium"
              style={{ color: "#1A202C" }}
            >
              Total Demand
            </CardTitle>
            <TrendingUp className="h-4 w-4" style={{ color: "#718096" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "#2D3748" }}>
              {stats.demand.day + stats.demand.night}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <div className="relative">
            <Search
              className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
              style={{ color: COLORS.icon.muted }}
            />
            <Input
              type="text"
              placeholder="Search workers"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-4 py-2 w-64 h-9 text-sm"
              style={{
                backgroundColor: COLORS.background.primary,
                borderColor: COLORS.border.primary,
              }}
            />
          </div>
          <Button type="submit" size="sm" className="bg-[#1B1B1B] text-white">
            Search
          </Button>
        </form>

        <div className="flex space-x-2">
          <div className="relative">
            <Button
              className="bg-[#1B1B1B] text-white"
              onClick={() => setIsCalendarOpen(true)}
            >
              <Calendar className="h-4 w-4 mr-2 text-white" />
              Calendar
            </Button>
          </div>

          <Button
            onClick={handleExportData}
            className="bg-[#1B1B1B] text-white"
          >
            <Download className="h-4 w-4 mr-2 text-white" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Coverage Progress */}
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-6 border-2 border-black rounded-lg">
        <h2 className="text-2xl font-semibold">Coverage Progress</h2>

        {/* Days filter above progress bars */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {DAYS_OF_WEEK.map((day) => (
            <Button
              key={day}
              variant={selectedDays.includes(day) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleDaySelection(day)}
              className={`
        ${
          selectedDays.includes(day)
            ? "bg-red-500 text-white"
            : "bg-[#1B1B1B] text-white"
        }
      `}
            >
              {selectedDays.includes(day) ? (
                <CheckCircle className="h-4 w-4 mr-1" />
              ) : (
                <XCircle className="h-4 w-4 mr-1" />
              )}
              {day}
            </Button>
          ))}
        </div>

        {/* Day Shift Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sun className="h-4 w-4" style={{ color: COLORS.icon.day }} />
              <span className="text-sm font-medium">Day Shift</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedDayStats.percentage}%
              </span>
              {selectedDayStats.isOver && (
                <Badge style={{ backgroundColor: COLORS.progress.over }}>
                  Over Assigned
                </Badge>
              )}
            </div>
          </div>
          <div
            className="h-2 w-full rounded-full"
            style={{ backgroundColor: COLORS.progress.uncovered }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(selectedDayStats.percentage, 100)}%`,
                backgroundColor: getProgressColor(selectedDayStats),
              }}
            />
          </div>
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: COLORS.text.tertiary }}
          >
            <span>
              {selectedDayStats.assigned} / {selectedDayStats.total} assigned
            </span>
            {selectedDayStats.isOver && (
              <span style={{ color: COLORS.progress.over }}>
                (+{selectedDayStats.assigned - selectedDayStats.total} extra)
              </span>
            )}
          </div>
        </div>

        {/* Night Shift Progress - Similar structure to Day Shift */}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Moon className="h-4 w-4" style={{ color: COLORS.icon.night }} />
              <span className="text-sm font-medium">Night Shift</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedNightStats.percentage}%
              </span>
              {selectedNightStats.isOver && (
                <Badge style={{ backgroundColor: COLORS.progress.over }}>
                  Over Assigned
                </Badge>
              )}
            </div>
          </div>
          <div
            className="h-2 w-full rounded-full"
            style={{ backgroundColor: COLORS.progress.uncovered }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(selectedNightStats.percentage, 100)}%`,
                backgroundColor: getProgressColor(selectedNightStats),
              }}
            />
          </div>
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: COLORS.text.tertiary }}
          >
            <span>
              {selectedNightStats.assigned} / {selectedNightStats.total}{" "}
              assigned
            </span>
            {selectedNightStats.isOver && (
              <span style={{ color: COLORS.progress.over }}>
                (+{selectedNightStats.assigned - selectedNightStats.total}{" "}
                extra)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table Component */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Worker</TableHead>
            <TableHead>Punctuality</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Requested Days</TableHead>
            <TableHead>Booked Days</TableHead>
            <TableHead>Assign Shift</TableHead>
            <TableHead>
              <div className="flex items-center space-x-2">
                <span>Actions</span>
                <Dialog
                  open={filterDialogOpen}
                  onOpenChange={setFilterDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      <span>Filters</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="max-w-4xl"
                    style={{ backgroundColor: "#FFFFFF" }}
                  >
                    <DialogHeader>
                      <DialogTitle>Filter Options</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-3 gap-4 py-4">
                      <div className="space-y-4">
                        <h4 className="font-medium">Punctuality</h4>
                        <RadioGroup
                          value={filters.punctuality.order}
                          onValueChange={(value) =>
                            setFilters((prev) => ({
                              ...prev,
                              punctuality: {
                                ...prev.punctuality,
                                order: value as "none" | "asc" | "desc",
                              },
                            }))
                          }
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="none" id="none" />
                            <Label htmlFor="none">No order</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="asc" id="asc" />
                            <Label htmlFor="asc">Ascending</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="desc" id="desc" />
                            <Label htmlFor="desc">Descending</Label>
                          </div>
                        </RadioGroup>
                        <div className="space-y-2">
                          <Label>Minimum Punctuality</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={filters.punctuality.minValue}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                punctuality: {
                                  ...prev.punctuality,
                                  minValue: Number(e.target.value),
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-medium">Requested Days</h4>
                        <Select
                          value={filters.requestedDays.type}
                          onValueChange={(value) =>
                            setFilters((prev) => ({
                              ...prev,
                              requestedDays: {
                                ...prev.requestedDays,
                                type: value as "all" | "day" | "night",
                              },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select shift type" />
                          </SelectTrigger>
                          <SelectContent style={{ backgroundColor: "#FFFFFF" }}>
                            <SelectItem value="all">All Shifts</SelectItem>
                            <SelectItem value="day">Day Shifts</SelectItem>
                            <SelectItem value="night">Night Shifts</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="space-y-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <div
                              key={day}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`requested-${day}`}
                                checked={filters.requestedDays.days.includes(
                                  day
                                )}
                                onCheckedChange={(checked) => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    requestedDays: {
                                      ...prev.requestedDays,
                                      days: checked
                                        ? [...prev.requestedDays.days, day]
                                        : prev.requestedDays.days.filter(
                                            (d) => d !== day
                                          ),
                                    },
                                  }));
                                }}
                              />
                              <Label htmlFor={`requested-${day}`}>{day}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-medium">Booked Days</h4>
                        <Select
                          value={filters.bookedDays.type}
                          onValueChange={(value) =>
                            setFilters((prev) => ({
                              ...prev,
                              bookedDays: {
                                ...prev.bookedDays,
                                type: value as "all" | "day" | "night",
                              },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select shift type" />
                          </SelectTrigger>
                          <SelectContent style={{ backgroundColor: "#FFFFFF" }}>
                            <SelectItem value="all">All Shifts</SelectItem>
                            <SelectItem value="day">Day Shifts</SelectItem>
                            <SelectItem value="night">Night Shifts</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="space-y-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <div
                              key={day}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`booked-${day}`}
                                checked={filters.bookedDays.days.includes(day)}
                                onCheckedChange={(checked) => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    bookedDays: {
                                      ...prev.bookedDays,
                                      days: checked
                                        ? [...prev.bookedDays.days, day]
                                        : prev.bookedDays.days.filter(
                                            (d) => d !== day
                                          ),
                                    },
                                  }));
                                }}
                              />
                              <Label htmlFor={`booked-${day}`}>{day}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="flex space-x-2">
                      <Button variant="outline" onClick={resetFilters}>
                        Reset
                      </Button>
                      <Button onClick={handleApplyFilters}>
                        Apply Filters
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentItems.map((worker) => (
            <TableRow key={worker.userId}>
              <TableCell className="flex items-center space-x-4">
                <InitialsAvatar name={worker.name} />
                <span className="font-medium">{worker.name}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-gray-300">
                    <div
                      className={`h-full ${getProgressBarColor(
                        worker.punctualityScore
                      )}`}
                      style={{ width: `${worker.punctualityScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {worker.punctualityScore}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <StarRating value={worker.rating} />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {/* Day shifts */}
                  <div className="flex flex-wrap gap-2">
                    {worker.requestedDays.day.map((day) => (
                      <span
                        key={`${day}-day`}
                        className="flex items-center gap-1 text-sm"
                      >
                        {day}
                        <Sun className="h-4 w-4 text-yellow-500" />
                      </span>
                    ))}
                  </div>
                  {/* Night shifts */}
                  <div className="flex flex-wrap gap-2">
                    {worker.requestedDays.night.map((day) => (
                      <span
                        key={`${day}-night`}
                        className="flex items-center gap-1 text-sm"
                      >
                        {day}
                        <Moon className="h-4 w-4 text-blue-500" />
                      </span>
                    ))}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <Sun className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">
                      {worker.bookedDays.day
                        .map((day) => day.substring(0, 3))
                        .join(", ")}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Moon className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">
                      {worker.bookedDays.night
                        .map((day) => day.substring(0, 3))
                        .join(", ")}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Select
                  onValueChange={(shiftId) => {
                    setSelectedShifts((prev) => ({
                      ...prev,
                      [worker.userId]: shiftId,
                    }));
                  }}
                  value={selectedShifts[worker.userId]}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: "#FFFFFF" }}>
                    {!worker.availableShifts ||
                    worker.availableShifts.length === 0 ? (
                      <SelectItem value="no-shifts" disabled>
                        No available shifts
                      </SelectItem>
                    ) : (
                      worker.availableShifts.map((shift) => (
                        <SelectItem key={shift.shiftId} value={shift.shiftId}>
                          <div className="flex items-center gap-2">
                            <span>
                              {format(new Date(shift.date), "MMM dd")} (
                              {shift.dayOfWeek})
                            </span>
                            {shift.timeType === "day" ? (
                              <Sun className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <Moon className="h-4 w-4 text-blue-500" />
                            )}
                            {shift.assignedCount >= shift.requiredStudents && (
                              <Badge variant="outline" className="text-red-500">
                                Extra
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleApproveShift(worker.userId)}
                    disabled={
                      !selectedShifts[worker.userId] ||
                      loadingAssignments[worker.userId]
                    }
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    {loadingAssignments[worker.userId] ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2">⏳</span>
                        Processing...
                      </span>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </>
                    )}
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleMarkNoShift(worker.userId)}
                    disabled={loadingNoShifts[worker.userId]}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    {loadingNoShifts[worker.userId] ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2">⏳</span>
                        Processing...
                      </span>
                    ) : (
                      <>
                        <Ban className="h-4 w-4 mr-2" />
                        No Shift
                      </>
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <Button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          variant="outline"
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          variant="outline"
        >
          Next
        </Button>
      </div>

      {/* Calendar Modal */}
      <CalendarDateModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        initialDateRange={dateRange}
        onApplyFilter={handleDateRangeSelect}
        allowUndefined={false}
      />
      <ErrorDialog
        isOpen={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        error={errorMessage}
        style={{ backgroundColor: "#FFFFFF" }}
      />
    </div>
  );
}

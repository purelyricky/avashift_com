"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  CheckCircle,
  Search,
  Calendar,
  Download,
  XCircle,
  Clock,
  UserCheck,
  TrendingUp,
} from "lucide-react";
import { ErrorDialog } from "@/components/ErrorDialog";
import CalendarDateModal from "@/components/CalendarDateModal";
import {
  getRequestManagementStats,
  getRequests,
  reviewRequest,
  type RequestManagementStats,
  type RequestData,
  type OptionalDateRange,
} from "@/lib/actions/request-management.actions";

// Constants
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Colors imported from shift assignment table
export const COLORS = {
  background: {
    primary: "#FFFFFF",
    secondary: "#F3F4F6",
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
    uncovered: "#F3F4F6",
    low: "#3B82F6",
    medium: "#F59E0B",
    high: "#10B981",
    over: "#EF4444",
  },
  icon: {
    muted: "#718096",
  },
  button: {
    primary: "#3182CE",
    success: "#48BB78",
    danger: "#F56565",
  },
};

interface InitialsAvatarProps {
  name: string;
}

const InitialsAvatar: React.FC<InitialsAvatarProps> = ({ name }) => {
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

interface RequestManagementTableProps {
  projectId: string;
  initialStats: RequestManagementStats;
  initialRequests: RequestData[];
  userId: string;
}

export default function RequestManagementTable({
  projectId,
  initialStats,
  initialRequests,
  userId,
}: RequestManagementTableProps) {
  // States
  const [stats, setStats] = useState<RequestManagementStats>(initialStats || {
    totalRequests: 0,
    reviewedRequests: 0,
  });
  const [requests, setRequests] = useState<RequestData[]>(initialRequests || []);
  const [filteredRequests, setFilteredRequests] = useState<RequestData[]>(
    initialRequests || []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>(DAYS_OF_WEEK);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<OptionalDateRange>({
    from: undefined,
    to: undefined,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  // Pagination calculations
  const safeFilteredRequests = filteredRequests || [];
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = safeFilteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(safeFilteredRequests.length / itemsPerPage);

  // Handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const filtered = requests.filter((request) =>
      request.requesterName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRequests(filtered);
    setCurrentPage(1);
  };

  const toggleDaySelection = (day: string) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day].sort(
          (a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b)
        );
      }
    });
  };

  const handleDateRangeSelect = async (range: OptionalDateRange) => {
    setDateRange(range);
    try {
      const [statsData, requestsData] = await Promise.all([
        getRequestManagementStats(projectId, range),
        getRequests(projectId, range, selectedDays),
      ]);
      setStats(statsData);
      setRequests(requestsData);
      setFilteredRequests(requestsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorMessage("Failed to fetch data. Please try again.");
      setErrorDialogOpen(true);
    }
  };

  const handleExportData = async () => {
    try {
      const exportData = requests.map((request) => ({
        requesterName: request.requesterName,
        requesterRole: request.requesterRole,
        requestType: request.requestType,
        reason: request.reason || "N/A",
        replacementEmail: request.replacementEmail || "N/A",
        status: request.status,
        createdAt: format(new Date(request.createdAt), "yyyy-MM-dd HH:mm:ss"),
        penalized: request.penalized ? "Yes" : "No",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Requests");

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(data, `requests-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    } catch (error) {
      console.error("Export error:", error);
      setErrorMessage("Failed to export data");
      setErrorDialogOpen(true);
    }
  };

  const handleReviewRequest = async (
    requestId: string,
    action: "approve" | "reject",
    penalize: boolean
  ) => {
    setIsLoadingAction(true);
    try {
      const result = await reviewRequest(
        projectId,
        requestId,
        action,
        penalize,
        userId
      );

      if (!result.success) {
        setErrorMessage(result.error || "Failed to review request");
        setErrorDialogOpen(true);
        return;
      }

      // Refresh data
      const [statsData, requestsData] = await Promise.all([
        getRequestManagementStats(projectId, dateRange),
        getRequests(projectId, dateRange, selectedDays),
      ]);
      setStats(statsData);
      setRequests(requestsData);
      setFilteredRequests(requestsData);
    } catch (error) {
      console.error("Error reviewing request:", error);
      setErrorMessage("An unexpected error occurred");
      setErrorDialogOpen(true);
    } finally {
      setIsLoadingAction(false);
    }
  };

  return (
    <div className="min-h-screen space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={{ backgroundColor: COLORS.background.primary, borderColor: COLORS.border.primary }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
              Total Requests
            </CardTitle>
            <Users className="h-4 w-4" style={{ color: COLORS.icon.muted }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: COLORS.text.secondary }}>
              {stats.totalRequests}
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: COLORS.background.primary, borderColor: COLORS.border.primary }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
              Reviewed Requests
            </CardTitle>
            <UserCheck className="h-4 w-4" style={{ color: COLORS.icon.muted }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: COLORS.text.secondary }}>
              {stats.reviewedRequests}
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: COLORS.background.primary, borderColor: COLORS.border.primary }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
              Progress
            </CardTitle>
            <TrendingUp className="h-4 w-4" style={{ color: COLORS.icon.muted }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: COLORS.text.secondary }}>
              {Math.round((stats.reviewedRequests / stats.totalRequests) * 100) || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: COLORS.icon.muted }} />
            <Input
              type="text"
              placeholder="Search requesters"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-4 py-2 w-64 h-9 text-sm"
              style={{
                backgroundColor: COLORS.background.primary,
                borderColor: COLORS.border.primary,
              }}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="bg-[#1B1B1B] text-white"
          >
            Search
          </Button>
        </form>

        <div className="flex space-x-2">
          <Button
            onClick={() => setIsCalendarOpen(true)}
            className="bg-[#1B1B1B] text-white"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>

          <Button
            onClick={handleExportData}
            className="bg-[#1B1B1B] text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Review Progress Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-6 border-2 border-black">
        <h2 className="text-2xl font-semibold">Review Progress</h2>

        {/* Days filter */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {DAYS_OF_WEEK.map((day) => (
            <Button
              key={day}
              variant={selectedDays.includes(day) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleDaySelection(day)}
              className={`
                ${selectedDays.includes(day)
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

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Review Progress</span>
            </div>
            <span className="text-sm font-medium">
              {stats.totalRequests > 0
                ? Math.round((stats.reviewedRequests / stats.totalRequests) * 100)
                : 0}
              %
            </span>
          </div>
          <Progress
            value={
              stats.totalRequests > 0
                ? (stats.reviewedRequests / stats.totalRequests) * 100
                : 0
            }
            className="h-2"
          />
          <div className="text-sm text-muted-foreground">
            {stats.reviewedRequests} / {stats.totalRequests} requests reviewed
          </div>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requester</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Replacement Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentItems.map((request) => (
            <TableRow
              key={request.requestId}
              className="bg-white hover:bg-gray-50"
            >
              <TableCell className="flex items-center space-x-4">
                <InitialsAvatar name={request.requesterName} />
                <span className="font-medium">{request.requesterName}</span>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="bg-blue-100 text-blue-800 border-blue-200"
                >
                  {request.requesterRole}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {request.requestType === "shiftCancellation"
                    ? "Shift Cancellation"
                    : "Filler Application"}
                </Badge>
              </TableCell>
              <TableCell>{request.reason || "N/A"}</TableCell>
              <TableCell>{request.replacementEmail || "N/A"}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    request.status === "pending"
                      ? "outline"
                      : request.status === "approved"
                      ? "default"
                      : "destructive"
                  }
                  className={
                    request.status === "pending"
                      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                      : request.status === "approved"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-red-100 text-red-800 border-red-200"
                  }
                >
                  {request.status}
                </Badge>
              </TableCell>
              <TableCell>
                {request.status === "pending" ? (
                  <div className="space-y-2">
                    {request.requestType === "shiftCancellation" &&
                      request.requesterRole === "student" && (
                        <div className="flex items-center space-x-2 mb-2">
                          <Switch
                            id={`penalize-${request.requestId}`}
                            onCheckedChange={(checked) => {
                              const requestItem = currentItems.find(
                                (item) => item.requestId === request.requestId
                              );
                              if (requestItem) {
                                requestItem.penalized = checked;
                                setRequests([...requests]);
                              }
                            }}
                          />
                          <Label htmlFor={`penalize-${request.requestId}`}>
                            Penalize
                          </Label>
                        </div>
                      )}
                    <div className="flex space-x-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() =>
                          handleReviewRequest(
                            request.requestId,
                            "approve",
                            request.penalized || false
                          )
                        }
                        disabled={isLoadingAction}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        {isLoadingAction ? (
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
                        onClick={() =>
                          handleReviewRequest(
                            request.requestId,
                            "reject",
                            request.penalized || false
                          )
                        }
                        disabled={isLoadingAction}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        {isLoadingAction ? (
                          <span className="flex items-center">
                            <span className="animate-spin mr-2">⏳</span>
                            Processing...
                          </span>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className="flex items-center justify-center bg-gray-100 text-gray-800 border-gray-200"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Reviewed
                  </Badge>
                )}
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
          className="border-[#1B1B1B] text-[#1B1B1B] hover:bg-[#1B1B1B] hover:text-white"
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
          className="border-[#1B1B1B] text-[#1B1B1B] hover:bg-[#1B1B1B] hover:text-white"
        >
          Next
        </Button>
      </div>

      {/* Modals and Dialogs */}
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
      />
    </div>
  );
}

      
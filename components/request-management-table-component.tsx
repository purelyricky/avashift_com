// components/admin-requests/AdminRequestsTable.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Calendar,
  Mail,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ErrorDialog } from "@/components/ErrorDialog";
import CalendarDateModal from "@/components/CalendarDateModal";
import {
  getAdminRequestStats,
  getAdminRequests,
  handleCancellationRequest,
  handleFillerRequest,
  type AdminRequestStats,
  type AdminRequestWithDetails,
} from "@/lib/actions/admin-requests.actions";

interface AdminRequestsTableProps {
  projectId: string;
  adminId: string;
  initialStats: AdminRequestStats;
  initialRequests: AdminRequestWithDetails[];
}

// Helper component for user initials avatar
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

// Role badge component
const RoleBadge = ({ role }: { role: string }) => {
  const roleColors = {
    student: "#4299E1", // Blue
    shiftLeader: "#48BB78", // Green
    gateman: "#ED8936", // Orange
  };

  return (
    <Badge
      style={{
        backgroundColor: roleColors[role as keyof typeof roleColors],
        color: "white",
      }}
    >
      {role}
    </Badge>
  );
};

// Request type badge component
const RequestTypeBadge = ({ type }: { type: string }) => {
  const typeColors = {
    shiftCancellation: "#EF4444", // Red
    fillerShiftApplication: "#8B5CF6", // Purple
  };

  return (
    <Badge
      style={{
        backgroundColor: typeColors[type as keyof typeof typeColors],
        color: "white",
      }}
    >
      {type === "shiftCancellation" ? "Cancellation" : "Application"}
    </Badge>
  );
};

// Add default stats object
const defaultStats: AdminRequestStats = {
  totalRequests: 0,
  reviewedRequests: 0,
  progressPercentage: 0,
};

export default function AdminRequestsTable({
  projectId,
  adminId,
  initialStats = defaultStats,
  initialRequests = [],
}: AdminRequestsTableProps) {
  // States
  const [stats, setStats] = useState<AdminRequestStats>(
    initialStats || defaultStats
  );
  const [requests, setRequests] = useState<AdminRequestWithDetails[]>(
    initialRequests || []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [replacementEmails, setReplacementEmails] = useState<
    Record<string, string>
  >({});
  const [penalties, setPenalties] = useState<Record<string, boolean>>({});

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = requests?.slice(indexOfFirstItem, indexOfLastItem) || [];
  const totalPages = Math.ceil((requests?.length || 0) / itemsPerPage);

  // Handlers
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const filteredRequests = await getAdminRequests(
        projectId,
        searchTerm,
        dateRange
      );
      setRequests(filteredRequests);
      setCurrentPage(1);
    } catch (error) {
      setErrorMessage("Failed to search requests");
      setErrorDialogOpen(true);
    }
  };

  const handleDateRangeSelect = async (range: { from?: Date; to?: Date }) => {
    setDateRange(range);
    try {
      const [newStats, newRequests] = await Promise.all([
        getAdminRequestStats(projectId, adminId, range),
        getAdminRequests(projectId, searchTerm, range),
      ]);
      setStats(newStats);
      setRequests(newRequests);
    } catch (error) {
      setErrorMessage("Failed to update date range");
      setErrorDialogOpen(true);
    }
  };

  const handleApproveRequest = async (request: AdminRequestWithDetails) => {
    setLoadingStates((prev) => ({ ...prev, [request.requestId]: true }));

    try {
      if (request.requestType === "shiftCancellation") {
        const replacementEmail = replacementEmails[request.requestId];
        if (!replacementEmail) {
          throw new Error("Replacement email is required");
        }

        const result = await handleCancellationRequest(
          request.requestId,
          replacementEmail,
          penalties[request.requestId] || false,
          adminId
        );

        let message = "Request approved successfully";
        if (result.penaltyDetails) {
          message += `. Student penalized: New rating ${result.penaltyDetails.newRating}, New punctuality ${result.penaltyDetails.newPunctuality}%`;
        }

        setSuccessMessage(message);
      } else {
        const result = await handleFillerRequest(
          request.requestId,
          "approve",
          adminId
        );
        setSuccessMessage(result.message);
      }

      // Refresh data
      const [newStats, newRequests] = await Promise.all([
        getAdminRequestStats(projectId, adminId, dateRange),
        getAdminRequests(projectId, searchTerm, dateRange),
      ]);

      setStats(newStats);
      setRequests(newRequests);
      setSuccessDialogOpen(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to approve request"
      );
      setErrorDialogOpen(true);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [request.requestId]: false }));
    }
  };

  const handleRejectRequest = async (request: AdminRequestWithDetails) => {
    setLoadingStates((prev) => ({ ...prev, [request.requestId]: true }));

    try {
      const result = await handleFillerRequest(
        request.requestId,
        "reject",
        adminId
      );

      setSuccessMessage(result.message);
      setSuccessDialogOpen(true);

      // Refresh data
      const [newStats, newRequests] = await Promise.all([
        getAdminRequestStats(projectId, adminId, dateRange),
        getAdminRequests(projectId, searchTerm, dateRange),
      ]);

      setStats(newStats);
      setRequests(newRequests);
    } catch (error) {
      setErrorMessage("Failed to reject request");
      setErrorDialogOpen(true);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [request.requestId]: false }));
    }
  };

  return (
    <div className="min-h-screen space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-[#E2E8F0]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#1A202C]">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2D3748]">
              {stats?.totalRequests ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#1A202C]">
              Reviewed Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2D3748]">
              {stats?.reviewedRequests ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#1A202C]">
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2D3748]">
              {stats?.progressPercentage ?? 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#718096]" />
            <Input
              type="text"
              placeholder="Search requests"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-4 py-2 w-64 h-9 text-sm"
            />
          </div>
          <Button type="submit" size="sm" className="bg-[#1B1B1B] text-white">
            Search
          </Button>
        </form>

        <Button
          className="bg-[#1B1B1B] text-white"
          onClick={() => setIsCalendarOpen(true)}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Calendar
        </Button>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requester</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Request Type</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Replacement Email</TableHead>
            <TableHead>Penalize</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentItems.map((request) => (
            <TableRow key={request.requestId}>
              <TableCell className="flex items-center space-x-4">
                <InitialsAvatar name={request.requester.name} />
                <span className="font-medium">{request.requester.name}</span>
              </TableCell>
              <TableCell>
                <RoleBadge role={request.requester.role} />
              </TableCell>
              <TableCell>
                <RequestTypeBadge type={request.requestType} />
              </TableCell>
              <TableCell>
                {request.requestType === "fillerShiftApplication" ? (
                  "--"
                ) : (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative inline-flex items-center gap-2 hover:bg-gray-100 rounded-full p-2 transition-colors"
                        onClick={() =>
                          setSelectedReason(
                            request.reason || "No message provided"
                          )
                        }
                      >
                        <div className="relative">
                          <MessageSquare size={20} className="text-gray-600" />
                          {request.reason && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-600">
                          View Message
                        </span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#FFFFFF] max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          <Mail size={20} className="text-[#718096]" />
                          <span>Request Message</span>
                        </DialogTitle>
                      </DialogHeader>
                      <div className="mt-4 p-4 rounded-md bg-[#F7FAFC] border border-[#E2E8F0]">
                        <div className="text-[#2D3748] whitespace-pre-wrap font-medium">
                          {request.reason || "No message provided"}
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button className="bg-[#1B1B1B] text-white">
                            Close
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </TableCell>
              <TableCell>
                {request.requestType === "fillerShiftApplication" ? (
                  "--"
                ) : (
                  <Input
                    type="email"
                    value={
                      replacementEmails[request.requestId] !== undefined
                        ? replacementEmails[request.requestId]
                        : request.replacementEmail || ""
                    }
                    onChange={(e) =>
                      setReplacementEmails((prev) => ({
                        ...prev,
                        [request.requestId]: e.target.value,
                      }))
                    }
                    placeholder="Enter replacement email"
                    className="max-w-[300px]"
                  />
                )}
              </TableCell>
              <TableCell>
                {request.requestType === "fillerShiftApplication" ? (
                  "--"
                ) : (
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={penalties[request.requestId] || false}
                      onCheckedChange={(checked) =>
                        setPenalties((prev) => ({
                          ...prev,
                          [request.requestId]: checked,
                        }))
                      }
                      className="bg-gray-200 border-2 border-gray-200 rounded-full w-11 h-6 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <span
                        className={`${
                          penalties[request.requestId]
                            ? "translate-x-5 bg-indigo-600"
                            : "translate-x-0 bg-white"
                        } inline-block w-5 h-5 transform rounded-full transition-transform duration-200 ease-in-out shadow-md border border-black`}
                      />
                    </Switch>
                    {penalties[request.requestId] && (
                      <span className="text-sm font-semibold text-red-500">
                        Penalized
                      </span>
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleApproveRequest(request)}
                    disabled={
                      loadingStates[request.requestId] ||
                      (request.requestType === "shiftCancellation" &&
                        !replacementEmails[request.requestId] &&
                        !request.replacementEmail)
                    }
                    className="bg-[#10B981] hover:bg-[#059669] text-white"
                  >
                    {loadingStates[request.requestId]
                      ? "Processing..."
                      : "Approve"}
                  </Button>
                  {request.requestType === "fillerShiftApplication" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRejectRequest(request)}
                      disabled={loadingStates[request.requestId]}
                      className="bg-[#EF4444] hover:bg-[#DC2626] text-white"
                    >
                      {loadingStates[request.requestId]
                        ? "Processing..."
                        : "Reject"}
                    </Button>
                  )}
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
          className="border-[#E2E8F0]"
        >
          Previous
        </Button>
        <span className="text-sm text-[#4A5568]">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          variant="outline"
          className="border-[#E2E8F0]"
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
        allowUndefined={true}
      />

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="bg-[#FFFFFF]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>Error</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-[#2D3748]">{errorMessage}</div>
          <DialogFooter>
            <Button
              onClick={() => setErrorDialogOpen(false)}
              className="bg-[#1B1B1B] text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="bg-[#FFFFFF]">
          <DialogHeader>
            <DialogTitle className="text-[#059669]">Success</DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-[#2D3748]">{successMessage}</div>
          <DialogFooter>
            <Button
              onClick={() => setSuccessDialogOpen(false)}
              className="bg-[#10B981] hover:bg-[#059669] text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {requests.length === 0 && (
        <div className="text-center py-8">
          <p className="text-[#4A5568] text-lg">No pending requests found</p>
        </div>
      )}
    </div>
  );
}

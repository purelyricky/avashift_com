"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import {
  getTodayShifts,
  getUpcomingShifts,
  getCompletedShifts,
  getFillerShifts,
  handleClockIn,
  handleClockOut,
  checkVerificationStatus,
  createShiftCancellationRequest,
  applyForFillerShift,
  getStudentFillerApplications,
  getStudentCancellationRequests,
} from "@/lib/actions/student-shifts.actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Updated interface to match new backend
interface ShiftDetails {
  shiftId: string;
  projectId: string;
  projectName: string;
  date: string;
  startTime: string;
  stopTime: string;
  status: "notStarted" | "clockedIn" | "completed";
  actualStart: string | null;
  actualStop: string | null;
  leaderName: string;
  attendanceId?: string;
  verificationCode?: string;
  isVerified?: boolean;
}

interface ApplicationStatus {
  [key: string]: boolean;
}

// New interfaces and states needed
interface CancelRequestStatus {
  [key: string]: boolean; // shiftId -> hasPendingRequest
}

interface FillerRequestStatus {
  [key: string]: boolean; // shiftId -> hasPendingRequest
}

export function StudentTodayShiftComponent({ userId }: { userId: string }) {
  // State management
  const [todayShifts, setTodayShifts] = useState<ShiftDetails[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<ShiftDetails[]>([]);
  const [completedShifts, setCompletedShifts] = useState<ShiftDetails[]>([]);
  const [fillerShifts, setFillerShifts] = useState<ShiftDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [cancelRequestStatus, setCancelRequestStatus] =
    useState<CancelRequestStatus>({});
  const [fillerRequestStatus, setFillerRequestStatus] =
    useState<FillerRequestStatus>({});

  // Modal states
  const [clockInOutModalOpen, setClockInOutModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftDetails | null>(null);
  const [clockInOutAction, setClockInOutAction] = useState<"in" | "out">("in");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [fillerShiftLoading, setFillerShiftLoading] = useState<{
    [key: string]: boolean;
  }>({});
  const [currentVerificationCode, setCurrentVerificationCode] = useState<
    string | null
  >(null);
  const [cancelReason, setCancelReason] = useState("");
  const [replacementEmail, setReplacementEmail] = useState("");
  const [fillerApplicationStatus, setFillerApplicationStatus] =
    useState<ApplicationStatus>({});

  // Load initial data
  useEffect(() => {
    loadAllShiftData();
  }, [userId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (
      clockInOutModalOpen &&
      clockInOutAction === "in" &&
      selectedShift &&
      !verificationSuccess
    ) {
      interval = setInterval(async () => {
        if (selectedShift.shiftId) {
          const result = await checkVerificationStatus(
            userId,
            selectedShift.shiftId
          );
          if (result.isVerified) {
            setVerificationSuccess(true);
            const updatedShifts = todayShifts.map((shift) =>
              shift.shiftId === selectedShift.shiftId
                ? {
                    ...shift,
                    status: "clockedIn" as const,
                    actualStart: new Date().toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    }),
                  }
                : shift
            );
            setTodayShifts(updatedShifts);
            
            setTimeout(() => {
              setClockInOutModalOpen(false);
            }, 1500);
          }
        }
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [clockInOutModalOpen, clockInOutAction, selectedShift, verificationSuccess, todayShifts]);

  // Load all shift data
  const loadAllShiftData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [today, upcoming, completed, filler] = await Promise.all([
        getTodayShifts(userId),
        getUpcomingShifts(userId),
        getCompletedShifts(userId),
        getFillerShifts(userId),
      ]);

      // Check for existing cancel requests
      const cancelRequests = await getStudentCancellationRequests(
        userId,
        "pending"
      );
      const cancelStatus: CancelRequestStatus = {};
      cancelRequests.forEach((request) => {
        cancelStatus[request.shiftId] = true;
      });
      setCancelRequestStatus(cancelStatus);

      // Check for existing filler requests
      const fillerRequests = await getStudentFillerApplications(
        userId,
        "pending"
      );
      const fillerStatus: FillerRequestStatus = {};
      fillerRequests.forEach((request) => {
        fillerStatus[request.shiftId] = true;
      });
      setFillerRequestStatus(fillerStatus);

      setTodayShifts(today);
      setUpcomingShifts(upcoming);
      setCompletedShifts(completed);
      setFillerShifts(filler);
    } catch (err) {
      setError("Failed to load shift data");
      console.error("Error loading shift data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle clock in/out button click
  const handleClockInOutClick = async (
    shift: ShiftDetails,
    action: "in" | "out"
  ) => {
    setSelectedShift(shift);
    setClockInOutAction(action);
    setVerificationSuccess(false);
    setCurrentVerificationCode(null);
    setModalError(null);

    if (action === "in") {
      try {
        const result = await handleClockIn(userId, shift.shiftId);
        if (result.success && result.verificationCode) {
          setCurrentVerificationCode(result.verificationCode);
          setClockInOutModalOpen(true);
        } else {
          setModalError(result.message || "Failed to initiate clock in");
        }
      } catch (err) {
        setModalError("Failed to initiate clock in");
      }
    } else {
      setClockInOutModalOpen(true);
    }
  };

  // Handle verification completion
  const handleVerifyClockInOut = async () => {
    if (!selectedShift) return;

    setVerificationLoading(true);
    setModalError(null);
    try {
      if (clockInOutAction === "out") {
        const result = await handleClockOut(userId, selectedShift.shiftId);
        if (result.success) {
          setVerificationSuccess(true);
          const updatedShifts = todayShifts.map((shift) =>
            shift.shiftId === selectedShift.shiftId
              ? {
                  ...shift,
                  status: "completed" as const,
                  actualStop: new Date().toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }),
                }
              : shift
          );
          setTodayShifts(updatedShifts);
        } else {
          setModalError(result.message || "Clock out failed");
        }
      }
    } catch (err) {
      setModalError("Operation failed");
    } finally {
      setVerificationLoading(false);
      if (verificationSuccess) {
        setTimeout(() => {
          setClockInOutModalOpen(false);
          loadAllShiftData();
        }, 1500);
      }
    }
  };

  const handleCancelShift = async () => {
    if (!selectedShift) return;
    setModalError(null);

    try {
      const result = await createShiftCancellationRequest({
        shiftId: selectedShift.shiftId,
        studentId: userId,
        reason: cancelReason,
        replacementEmail: replacementEmail || undefined,
      });

      if (result.success) {
        setCancelRequestStatus((prev) => ({
          ...prev,
          [selectedShift.shiftId]: true,
        }));
        setCancelModalOpen(false);
        setCancelReason("");
        setReplacementEmail("");
        await loadAllShiftData();
      } else {
        setModalError(
          result.message || "Failed to submit cancellation request"
        );
      }
    } catch (err) {
      setModalError("Failed to submit cancellation request");
    }
  };

  const handleTakeFillerShift = async (shiftId: string) => {
    try {
      const result = await applyForFillerShift(shiftId, userId);
      if (result.success) {
        setFillerRequestStatus(prev => ({
          ...prev,
          [shiftId]: true
        }));
      }
    } catch (err) {
      console.error("Failed to apply for filler shift:", err);
    }
  };

  // Render functions for shift status
  const renderShiftStatus = (status: ShiftDetails["status"]) => {
    switch (status) {
      case "notStarted":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            Not Started
          </Badge>
        );
      case "clockedIn":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            Clocked In
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Completed
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Today's Shifts Section */}
      <section className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">
          Today's Shifts
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {todayShifts.map((shift) => (
              <TableRow key={shift.shiftId}>
                <TableCell className="font-medium">
                  {shift.projectName}
                </TableCell>
                <TableCell>{`${shift.startTime} - ${shift.stopTime}`}</TableCell>
                <TableCell>{renderShiftStatus(shift.status)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedShift(shift);
                        setDetailsModalOpen(true);
                      }}
                      className="bg-[#191970] text-white hover:bg-[#191970]/90"
                    >
                      More Details
                    </Button>
                    {shift.status !== "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleClockInOutClick(
                            shift,
                            shift.status === "clockedIn" ? "out" : "in"
                          )
                        }
                        className="bg-[#191970] text-white hover:bg-[#191970]/90"
                      >
                        {shift.status === "clockedIn"
                          ? "Clock Out"
                          : "Clock In"}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {/* Upcoming and Completed Shifts Section */}
      <section className="bg-gray-100 p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">
          Upcoming and Completed Shifts
        </h2>
        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="upcoming"
              className="data-[state=active]:bg-[#100C08] data-[state=active]:text-white"
            >
              Upcoming
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="data-[state=active]:bg-[#100C08] data-[state=active]:text-white"
            >
              Completed
            </TabsTrigger>
          </TabsList>

          {/* Upcoming Shifts Tab */}
          <TabsContent value="upcoming">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingShifts.map((shift) => (
                  <TableRow key={shift.shiftId}>
                    <TableCell className="font-medium">
                      {shift.projectName}
                    </TableCell>
                    <TableCell>{shift.date}</TableCell>
                    <TableCell>{`${shift.startTime} - ${shift.stopTime}`}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedShift(shift);
                            setDetailsModalOpen(true);
                          }}
                          className="bg-[#191970] text-white hover:bg-[#191970]/90"
                        >
                          More Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedShift(shift);
                            setCancelModalOpen(true);
                          }}
                          disabled={cancelRequestStatus[shift.shiftId]}
                          className="bg-[#191970] text-white hover:bg-[#191970]/90"
                        >
                          {cancelRequestStatus[shift.shiftId]
                            ? "Pending Cancel Request"
                            : "Cancel Shift"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Completed Shifts Tab */}
          <TabsContent value="completed">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedShifts.map((shift) => (
                  <TableRow key={shift.shiftId}>
                    <TableCell className="font-medium">
                      {shift.projectName}
                    </TableCell>
                    <TableCell>{shift.date}</TableCell>
                    <TableCell>{`${shift.startTime} - ${shift.stopTime}`}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedShift(shift);
                          setDetailsModalOpen(true);
                        }}
                        className="bg-[#191970] text-white hover:bg-[#191970]/90"
                      >
                        More Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </section>

      {/* Available Filler Shifts Section */}
      <section className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">
          Available Filler Shifts
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fillerShifts.map((shift) => (
              <TableRow key={shift.shiftId}>
                <TableCell className="font-medium">
                  {shift.projectName}
                </TableCell>
                <TableCell>{shift.date}</TableCell>
                <TableCell>{`${shift.startTime} - ${shift.stopTime}`}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedShift(shift);
                        setDetailsModalOpen(true);
                      }}
                      className="bg-[#191970] text-white hover:bg-[#191970]/90"
                    >
                      More Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTakeFillerShift(shift.shiftId)}
                      disabled={fillerRequestStatus[shift.shiftId]}
                      className="bg-[#191970] text-white hover:bg-[#191970]/90"
                    >
                      {fillerRequestStatus[shift.shiftId]
                        ? "Pending Request"
                        : "Take Shift"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {/* Clock In/Out Modal */}
      {/* Clock In/Out Modal */}
      <Dialog open={clockInOutModalOpen} onOpenChange={setClockInOutModalOpen}>
        <DialogContent className="bg-[#ffffff]">
          <DialogHeader>
            <DialogTitle>
              Clock {clockInOutAction === "in" ? "In" : "Out"} Verification
            </DialogTitle>
          </DialogHeader>

          {modalError && (
            <div className="flex items-center justify-center text-red-500 mb-4">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{modalError}</span>
            </div>
          )}

          {!verificationLoading &&
            !verificationSuccess &&
            clockInOutAction === "in" &&
            currentVerificationCode && (
              <>
                <div className="flex justify-center space-x-2 my-4">
                  {currentVerificationCode.split("").map((char, index) => (
                    <div
                      key={index}
                      className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-lg"
                    >
                      <span className="text-2xl font-bold">{char}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center mb-4">
                  Please provide this code to the Security Guard to clock in.
                </p>
                <p className="text-sm text-gray-500 text-center">
                  Verification will happen automatically once the code is
                  confirmed.
                </p>
              </>
            )}

          {!verificationLoading &&
            !verificationSuccess &&
            clockInOutAction === "out" && (
              <>
                <p className="text-center mb-4">
                  Are you sure you want to clock out?
                </p>
                <Button
                  className="bg-[#191970] text-white hover:bg-[#191970]/90 w-full"
                  onClick={handleVerifyClockInOut}
                >
                  Confirm Clock Out
                </Button>
              </>
            )}

          {verificationLoading && (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="mt-2">Verifying...</p>
            </div>
          )}

          {verificationSuccess && (
            <div className="flex flex-col items-center justify-center py-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <p className="mt-2">Clock {clockInOutAction} successful!</p>
              <Button
                className="mt-4 bg-[#191970] text-white hover:bg-[#191970]/90"
                onClick={() => setClockInOutModalOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shift Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="bg-[#ffffff]">
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
          </DialogHeader>

          {selectedShift && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Project
                  </label>
                  <p className="font-medium">{selectedShift.projectName}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Date
                  </label>
                  <p>{selectedShift.date}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Expected Start Time
                  </label>
                  <p>{selectedShift.startTime}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Expected Stop Time
                  </label>
                  <p>{selectedShift.stopTime}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Actual Start Time
                  </label>
                  <p>{selectedShift.actualStart || "N/A"}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Actual Stop Time
                  </label>
                  <p>{selectedShift.actualStop || "N/A"}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Shift Leader
                </label>
                <p>{selectedShift.leaderName}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Status
                </label>
                <div className="mt-1">
                  {renderShiftStatus(selectedShift.status)}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setDetailsModalOpen(false)}
              className="bg-[#191970] text-white hover:bg-[#191970]/90"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Shift Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="bg-[#ffffff]">
          <DialogHeader>
            <DialogTitle>Cancel Shift</DialogTitle>
          </DialogHeader>
          {modalError && (
            <div className="flex items-center justify-center text-red-500 mb-4">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{modalError}</span>
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Reason
              </Label>
              <textarea
                id="reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="col-span-3 h-28 resize-none border rounded-md p-2"
                placeholder="Please provide your reason for cancellation..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="replacement" className="text-right">
                Replacement Email
              </Label>
              <Input
                id="replacement"
                type="email"
                value={replacementEmail}
                onChange={(e) => setReplacementEmail(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCancelShift} // Removed the parameter
              className="bg-[#191970] text-white hover:bg-[#191970]/90"
            >
              Submit Cancel Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
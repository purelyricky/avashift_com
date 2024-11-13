// app/components/shift-leader-dashboard.tsx
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  Star,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getTodayStudents,
  updateStudentAttendance,
  updateStudentRating,
  addStudentComment,
  getUpcomingShifts,
  getCompletedShifts,
  getShiftDetails,
  submitShiftCancellation,
  checkPendingCancellation,
  getStudentAttendanceStatus,
} from "@/lib/actions/shiftLeader.actions";

interface Student {
  id: string;
  name: string;
  clockedIn: boolean;
  rating: number;
  attendance: "present" | "late" | "absent" | null;
  shiftId: string;
  projectId: string;
}

interface Shift {
  id: string;
  date: string;
  time: string;
  status: string;
  expectedStudents: number;
  reportedStudents: number;
  hasPendingCancellation?: boolean;
}

const InitialsAvatar = ({ name }: { name: string }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500",
    "bg-cyan-500",
  ];
  const colorIndex =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div
      className={cn(
        "flex items-center justify-center w-10 h-10 rounded-full text-white font-semibold",
        bgColor
      )}
    >
      {initials}
    </div>
  );
};

const StarRating = ({
  rating,
  onRatingChange,
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
}) => {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-4 h-4 cursor-pointer",
            star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          )}
          onClick={() => onRatingChange(star)}
        />
      ))}
    </div>
  );
};

export default function ShiftLeaderDashboard({
  leaderId,
}: {
  leaderId: string;
}) {
  // State for students and shifts
  const [students, setStudents] = useState<Student[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);
  const [completedShifts, setCompletedShifts] = useState<Shift[]>([]);

  // State for modals and UI
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );

  // State for loading and saving
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSubmitted, setCommentSubmitted] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const [attendanceStatuses, setAttendanceStatuses] = useState<{
    [key: string]: "pending" | "present" | "late" | "absent" | null;
  }>({});

  // Track changes to be saved
  const [pendingChanges, setPendingChanges] = useState<{
    ratings: { [key: string]: number };
    attendance: { [key: string]: "present" | "late" | "absent" };
  }>({
    ratings: {},
    attendance: {},
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, [leaderId]); // Only loads when leaderId changes

  // Load initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [studentsData, upcomingData, completedData] = await Promise.all([
        getTodayStudents(leaderId),
        getUpcomingShifts(leaderId),
        getCompletedShifts(leaderId),
      ]);

      // Check for pending cancellations for each upcoming shift
      const upcomingWithCancellations = await Promise.all(
        upcomingData.map(async (shift) => ({
          ...shift,
          hasPendingCancellation: await checkPendingCancellation(
            shift.id,
            leaderId
          ),
        }))
      );

      setStudents(studentsData);
      setUpcomingShifts(upcomingWithCancellations);
      setCompletedShifts(completedData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadAttendanceStatuses = async () => {
      try {
        const statuses: { [key: string]: string | null } = {};

        // Load status for each student
        await Promise.all(
          students.map(async (student) => {
            const status = await getStudentAttendanceStatus(
              student.id,
              student.shiftId // You'll need to pass the actual shift ID
            );
            statuses[student.id] = status;
          })
        );

        setAttendanceStatuses(
          statuses as {
            [key: string]: "pending" | "present" | "late" | "absent" | null;
          }
        );
      } catch (error) {
        console.error("Error loading attendance statuses:", error);
      }
    };

    if (students.length > 0) {
      loadAttendanceStatuses();
    }
  }, [students]);

  // Add this new handler
  const handleCancelShift = async () => {
    if (!selectedShift || !cancelReason.trim()) return;

    setIsSubmittingCancel(true);
    try {
      const success = await submitShiftCancellation(
        selectedShift.id,
        leaderId,
        cancelReason
      );

      if (success) {
        // Update the local state to show pending cancellation
        setUpcomingShifts((shifts) =>
          shifts.map((shift) =>
            shift.id === selectedShift.id
              ? { ...shift, hasPendingCancellation: true }
              : shift
          )
        );
        setCancelModalOpen(false);
        setCancelReason("");
      }
    } catch (error) {
      console.error("Error cancelling shift:", error);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Handle attendance change
  const handleAttendance = (
    studentId: string,
    status: "present" | "late" | "absent"
  ) => {
    setPendingChanges((prev) => ({
      ...prev,
      attendance: {
        ...prev.attendance,
        [studentId]: status,
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Handle rating change
  const handleRatingChange = (studentId: string, rating: number) => {
    setPendingChanges((prev) => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [studentId]: rating,
      },
    }));
    setHasUnsavedChanges(true);
  };

  // In your component
  const handleCommentSubmit = async () => {
    if (!selectedStudentId || !commentText.trim()) return;

    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    setIsSubmittingComment(true);
    try {
      const success = await addStudentComment(
        selectedStudentId,
        student.shiftId,
        student.projectId,
        commentText,
        leaderId
      );

      if (success) {
        setCommentSubmitted(true);
        setTimeout(() => {
          setCommentSubmitted(false);
          setCommentModalOpen(false);
          setCommentText("");
          setSelectedStudentId(null);
        }, 2000);
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Save all pending changes
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Process attendance changes
      for (const [studentId, status] of Object.entries(
        pendingChanges.attendance
      )) {
        const student = students.find((s) => s.id === studentId);
        if (student) {
          await updateStudentAttendance(
            studentId,
            student.shiftId,
            status,
            leaderId
          );
        }
      }

      // Process rating changes - now only updates student table
      for (const [studentId, rating] of Object.entries(
        pendingChanges.ratings
      )) {
        const student = students.find((s) => s.id === studentId);
        if (student && rating !== student.rating) {
          await updateStudentRating(
            studentId,
            rating,
            student.shiftId,
            student.projectId,
            leaderId
          );
        }
      }

      // Reset pending changes
      setPendingChanges({ ratings: {}, attendance: {} });
      setHasUnsavedChanges(false);
      setShowSaveConfirmation(true);
      setTimeout(() => setShowSaveConfirmation(false), 3000);

      // Refresh student data
      const updatedStudents = await getTodayStudents(leaderId);
      setStudents(updatedStudents);
    } catch (error) {
      console.error("Error saving changes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-12 relative">
      <section className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 text-center">
          Students Expected Today
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <InitialsAvatar name={student.name} />
                    <div>
                      <div className="font-medium flex items-center space-x-2">
                        <span>{student.name}</span>
                        <StarRating
                          rating={
                            pendingChanges.ratings[student.id] ?? student.rating
                          }
                          onRatingChange={(rating) =>
                            handleRatingChange(student.id, rating)
                          }
                        />
                      </div>
                      <div className="flex space-x-2 mt-1">
                        {["present", "late", "absent"].map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleAttendance(
                                student.id,
                                status as "present" | "late" | "absent"
                              )
                            }
                            className={cn(
                              "text-xs py-1 h-6",
                              // If there are pending changes for this student, show those colors
                              pendingChanges.attendance[student.id] ===
                                "present" &&
                                status === "present" &&
                                "bg-green-500 hover:bg-green-600",
                              pendingChanges.attendance[student.id] ===
                                "late" &&
                                status === "late" &&
                                "bg-yellow-500 hover:bg-yellow-600",
                              pendingChanges.attendance[student.id] ===
                                "absent" &&
                                status === "absent" &&
                                "bg-red-500 hover:bg-red-600",
                              // If no pending changes, show colors based on database status
                              !pendingChanges.attendance[student.id] &&
                                student.attendance === "present" &&
                                status === "present" &&
                                "bg-green-500 hover:bg-green-600",
                              !pendingChanges.attendance[student.id] &&
                                student.attendance === "late" &&
                                status === "late" &&
                                "bg-yellow-500 hover:bg-yellow-600",
                              !pendingChanges.attendance[student.id] &&
                                student.attendance === "absent" &&
                                status === "absent" &&
                                "bg-red-500 hover:bg-red-600"
                            )}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      student.clockedIn
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    )}
                  >
                    {student.clockedIn ? "Clocked In" : "Not Clocked In"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedStudentId(student.id);
                      setCommentModalOpen(true);
                    }}
                    className="bg-[#191970] text-white hover:bg-[#191970]/90"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Comment
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {/* Shifts Section */}
      <section className="bg-gray-100 p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 text-center">
          Shifts
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

          {/* Upcoming Shifts */}
          <TabsContent value="upcoming">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingShifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>{shift.date}</TableCell>
                    <TableCell>{shift.time}</TableCell>
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
                          disabled={shift.hasPendingCancellation}
                          className={cn(
                            "bg-[#191970] text-white hover:bg-[#191970]/90",
                            shift.hasPendingCancellation &&
                              "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {shift.hasPendingCancellation
                            ? "Cancellation Pending"
                            : "Cancel Shift"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Add the Cancel Shift Modal */}
          <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
            <DialogContent style={{ backgroundColor: "#FFFFFF" }}>
              <DialogHeader>
                <DialogTitle>Cancel Shift</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <p>Are you sure you want to cancel this shift?</p>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reason" className="text-right">
                    Reason
                  </Label>
                  <Textarea
                    id="reason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="col-span-3"
                    placeholder="Please provide a reason for cancellation"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCancelShift}
                  disabled={isSubmittingCancel || !cancelReason.trim()}
                  className="bg-[#191970] text-white hover:bg-[#191970]/90"
                >
                  {isSubmittingCancel ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Cancellation Request"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Completed Shifts */}
          <TabsContent value="completed">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedShifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>{shift.date}</TableCell>
                    <TableCell>{shift.time}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800"
                      >
                        Completed
                      </Badge>
                    </TableCell>
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

      {/* Unsaved Changes Notification */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-md shadow-md flex items-center justify-between">
          <span>You have unsaved changes!</span>
          <Button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="ml-4 bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      )}

      {/* Save Confirmation Toast */}
      {showSaveConfirmation && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md shadow-md flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span>Changes saved successfully!</span>
        </div>
      )}

      {/* Shift Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent style={{ backgroundColor: "#FFFFFF" }}>
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <p className="font-medium">{selectedShift?.date}</p>
              </div>
              <div>
                <Label>Time</Label>
                <p className="font-medium">{selectedShift?.time}</p>
              </div>
              <div>
                <Label>Expected Students</Label>
                <p className="font-medium">{selectedShift?.expectedStudents}</p>
              </div>
              <div>
                <Label>Reported Students</Label>
                <p className="font-medium">{selectedShift?.reportedStudents}</p>
              </div>
            </div>
          </div>
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

      {/* Comment Modal */}
      <Dialog open={commentModalOpen} onOpenChange={setCommentModalOpen}>
        <DialogContent style={{ backgroundColor: "#FFFFFF" }}>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          {!commentSubmitted ? (
            <>
              <Textarea
                placeholder="Type your comment here."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={isSubmittingComment}
                className="min-h-[100px]"
              />
              <DialogFooter>
                <Button
                  onClick={handleCommentSubmit}
                  disabled={isSubmittingComment || !commentText.trim()}
                  className="bg-[#191970] text-white hover:bg-[#191970]/90"
                >
                  {isSubmittingComment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    "Send Comment"
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-lg font-semibold text-center">
                Comment Submitted!
              </p>
              <p className="text-center text-gray-600">
                Your comment has been successfully recorded.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Warning Dialog for Unsaved Changes */}
      <Dialog
        open={hasUnsavedChanges}
        onOpenChange={(open) => {
          if (!open) {
            // Show confirmation before discarding changes
            if (
              window.confirm(
                "Are you sure you want to discard your unsaved changes?"
              )
            ) {
              setPendingChanges({ ratings: {}, attendance: {} });
              setHasUnsavedChanges(false);
            }
          }
        }}
      >
        {/* This dialog will prevent accidental navigation */}
      </Dialog>

      {/* Add beforeunload event listener for unsaved changes */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.onbeforeunload = function() {
              return ${hasUnsavedChanges} ? "You have unsaved changes. Are you sure you want to leave?" : null;
            };
          `,
        }}
      />
    </div>
  );
}

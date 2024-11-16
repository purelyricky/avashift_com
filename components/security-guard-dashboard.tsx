"use client";

import React, { useState, useEffect } from "react";
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
import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  verifyStudentCode,
  markStudentPresent,
  getUpcomingShifts,
  getCompletedShifts,
  getShiftDetails,
  submitShiftCancellation,
  getTodayActiveShifts,
} from "@/lib/actions/gateman.actions";

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

interface TodayActiveShift {
    studentName: string;
    projectName: string;
    time: string;
  endTime: Date; // Store the actual Date object for comparison
}

export default function SecurityGuardDashboard({
  gatemanId,
}: {
  gatemanId: string;
}) {
  // State for verification code
  const [verificationCode, setVerificationCode] = useState(["", "", "", ""]);
  const [isSearching, setIsSearching] = useState(false);
  const [studentFound, setStudentFound] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [todayShifts, setTodayShifts] = useState<any[]>([]);

  // State for shifts
  const [upcomingShifts, setUpcomingShifts] = useState<any[]>([]);
  const [completedShifts, setCompletedShifts] = useState<any[]>([]);

  // Modal states
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [todayActiveShifts, setTodayActiveShifts] = useState<
    TodayActiveShift[]
  >([]);

  // Load shifts on component mount
  useEffect(() => {
    loadShifts();
    loadTodayActiveShifts();
    const interval = setInterval(loadTodayActiveShifts, 60000);
    return () => clearInterval(interval);
  }, [gatemanId]);

  const loadShifts = async () => {
    const upcoming = await getUpcomingShifts(gatemanId);
    const completed = await getCompletedShifts(gatemanId);
    setUpcomingShifts(upcoming);
    setCompletedShifts(completed);
  };

  // Add the loading function
  const loadTodayActiveShifts = async () => {
    const activeShifts = await getTodayActiveShifts(gatemanId);
    setTodayActiveShifts(activeShifts);
  };

  const handleVerificationSubmit = async () => {
    const code = verificationCode.join("");
    if (code.length === 4) {
      setIsSearching(true);
      try {
        const response = await verifyStudentCode(code, gatemanId);
        if (response.success && response.studentInfo) {
          setStudentFound(true);
          setCurrentStudent(response.studentInfo);
        } else {
          // Handle error (could add toast notification here)
          console.error(response.message);
        }
      } catch (error) {
        console.error("Error verifying code:", error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newCode = [...verificationCode];
      newCode[index] = value;
      setVerificationCode(newCode);
      if (value !== "" && index < 3) {
        document.getElementById(`code-${index + 1}`)?.focus();
      }
    }
  };

  const handleMarkAsPresent = async () => {
    const code = verificationCode.join("");
    const success = await markStudentPresent(code, gatemanId);
    if (success) {
      await loadTodayActiveShifts(); // Reload active shifts after marking present
      setCurrentStudent(null);
      setStudentFound(false);
      setVerificationCode(["", "", "", ""]);
    } else {
      console.error("Failed to mark student as present");
    }
  };

  const handleViewDetails = async (shiftId: string) => {
    const details = await getShiftDetails(shiftId);
    if (details) {
      setSelectedShift(details);
      setDetailsModalOpen(true);
    }
  };

  const handleCancelShift = async (shiftId: string) => {
    const success = await submitShiftCancellation(
      shiftId,
      gatemanId,
      cancelReason
    );
    if (success) {
      setUpcomingShifts(
        upcomingShifts.map((shift) =>
          shift.id === shiftId ? { ...shift, status: "pendingCancel" } : shift
        )
      );
      setCancelModalOpen(false);
      setCancelReason("");
    } else {
      // Handle error (could add toast notification here)
      console.error("Failed to submit cancellation request");
    }
  };

  return (
    <div className="space-y-12">
      <section className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-3xl font-semibold mb-4 text-gray-900 text-center">
          Mai Műszakok
        </h2>
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {verificationCode.map((digit, index) => (
              <Input
                key={index}
                id={`code-${index}`}
                type="text"
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                className="w-14 h-12 text-center text-2xl border border-[#100C08] font-medium text-black"
                maxLength={1}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-center mb-4">
          <Button
            onClick={handleVerificationSubmit}
            disabled={
              verificationCode.some((digit) => digit === "") || isSearching
            }
            className="bg-[#191970] text-white hover:bg-[#191970]/90 px-8 py-2 text-lg"
          >
            {isSearching ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              "Ellenőrzés"
            )}
          </Button>
        </div>

        {isSearching && (
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Diák keresése...</p>
          </div>
        )}

        {studentFound && currentStudent && (
          <Dialog open={true} onOpenChange={() => setStudentFound(false)}>
            <DialogContent style={{ backgroundColor: "#FFFFFF" }}>
              <DialogHeader>
                <DialogTitle>Diák Információ</DialogTitle>
              </DialogHeader>
              <div className="flex items-center space-x-4">
                <InitialsAvatar name={currentStudent.name} />
                <div>
                  <p className="font-semibold">{currentStudent.name}</p>
                  <p className="text-sm text-gray-500">
                    ID: {currentStudent.id}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <p>
                  <strong>Projekt:</strong> {currentStudent.project}
                </p>
                <p>
                  <strong>Idő:</strong> {currentStudent.time}
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleMarkAsPresent}
                  className="bg-[#191970] text-white hover:bg-[#191970]/90"
                >
                  Jelenlét Rögzítése
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Diák</TableHead>
              <TableHead>Projekt</TableHead>
              <TableHead>Idő</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {todayActiveShifts.map((shift, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-2">
                    <InitialsAvatar name={shift.studentName} />
                    <span>{shift.studentName}</span>
                  </div>
                </TableCell>
                <TableCell>{shift.projectName}</TableCell>
                <TableCell>{shift.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="bg-gray-100 p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 text-center">
          Műszakok
        </h2>
        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="upcoming"
              className="data-[state=active]:bg-[#100C08] data-[state=active]:text-white"
            >
              Következő
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="data-[state=active]:bg-[#100C08] data-[state=active]:text-white"
            >
              Befejezett
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dátum</TableHead>
                  <TableHead>Idő</TableHead>
                  <TableHead>Műveletek</TableHead>
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
                          onClick={() => handleViewDetails(shift.id)}
                          className="bg-[#191970] text-white hover:bg-[#191970]/90"
                        >
                          Részletek
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedShift(shift);
                            setCancelModalOpen(true);
                          }}
                          disabled={shift.status === "pendingCancel"}
                          className="bg-[#191970] text-white hover:bg-[#191970]/90"
                        >
                          {shift.status === "pendingCancel"
                            ? "Törlés Folyamatban"
                            : "Műszak Törlése"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="completed">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dátum</TableHead>
                  <TableHead>Idő</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Műveletek</TableHead>
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
                        Befejezett
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(shift.id)}
                        className="bg-[#191970] text-white hover:bg-[#191970]/90"
                      >
                        Részletek
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </section>

      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent style={{ backgroundColor: "#FFFFFF" }}>
          <DialogHeader>
            <DialogTitle>Műszak Részletei</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dátum</Label>
                <p className="font-medium">{selectedShift?.date}</p>
              </div>
              <div>
                <Label>Idő</Label>
                <p className="font-medium">{selectedShift?.time}</p>
              </div>
              <div>
                <Label>Várt Diákok</Label>
                <p className="font-medium">{selectedShift?.expectedStudents}</p>
              </div>
              <div>
                <Label>Megjelent Diákok</Label>
                <p className="font-medium">{selectedShift?.reportedStudents}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setDetailsModalOpen(false)}
              className="bg-[#191970] text-white hover:bg-[#191970]/90"
            >
              Bezárás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent style={{ backgroundColor: "#FFFFFF" }}>
          <DialogHeader>
            <DialogTitle>Műszak Törlése</DialogTitle>
          </DialogHeader>
          <p>Biztosan törölni szeretné ezt a műszakot?</p>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Indok
              </Label>
              <Input
                id="reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => handleCancelShift(selectedShift?.id)}
              className="bg-[#191970] text-white hover:bg-[#191970]/90"
            >
              Törlés Megerősítése
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

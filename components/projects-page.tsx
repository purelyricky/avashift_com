"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import StarRating from "@/components/StarRating";
import {
  Star,
  Mail,
  UserCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  UserPlus,
  Users,
  PieChart,
  Search,
  CheckCircle,
} from "lucide-react";
import {
  getProjectMembersWithStats,
  updateMemberStatus,
  removeMemberFromProject,
  getProjectStats,
  markFeedbackAsRead,
} from "@/lib/actions/specifiproject.actions";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface ProjectMemberTableProps {
  projectId: string;
}

interface Note {
  id: string;
  leader: string;
  leaderId: string;
  date: string;
  content: string;
  isRead: boolean;
}

interface ProjectMember {
  memberId: string;
  documentId: string;
  userId: string;
  name: string;
  status: "active" | "inactive";
  shiftsCompleted: number;
  punctualityScore: number;
  rating: number;
  notes: Note[];
  totalNotes: number;
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

export default function ProjectMembersTable({
  projectId,
}: ProjectMemberTableProps) {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage] = useState(5);

  // Add back search state
  const [searchTerm, setSearchTerm] = useState("");

  // Add back dialog state
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);

  // Notes modal state
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedMemberNotes, setSelectedMemberNotes] = useState<any | null>(
    null
  );

  // Remove member modal state
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(
    null
  );

  // Add new state for stats
  const [projectStats, setProjectStats] = useState({
    totalStudents: 0,
    totalShiftLeaders: 0,
    averagePunctuality: 100,
  });

  // Add back search handling function
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const filtered = members.filter(
      (member) =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.userId.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setMembers(filtered);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Update useEffect to preserve search results
  useEffect(() => {
    const loadData = async () => {
      const [membersData, statsData] = await Promise.all([
        getProjectMembersWithStats(projectId),
        getProjectStats(projectId),
      ]);

      // Only update members if there's no active search
      if (searchTerm === "") {
        setMembers(membersData);
      } else {
        // Apply current search filter to new data
        const filtered = membersData.filter(
          (member) =>
            member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.userId.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setMembers(filtered);
      }
      setProjectStats(statsData);
    };

    loadData();
  }, [projectId, searchTerm]);

  // Pagination logic
  const indexOfLastMember = currentPage * membersPerPage;
  const indexOfFirstMember = indexOfLastMember - membersPerPage;
  const currentMembers = members.slice(indexOfFirstMember, indexOfLastMember);
  const totalPages = Math.ceil(members.length / membersPerPage);

  const handleMarkAsRead = async (note: Note) => {
    if (note.isRead) return;

    try {
      const result = await markFeedbackAsRead(note.id);
      if (result.success) {
        // Update members state to remove the read note
        setMembers(
          members.map((member) => {
            if (member.documentId === selectedMemberNotes?.documentId) {
              return {
                ...member,
                // Filter out the read note
                notes: member.notes.filter((n: Note) => n.id !== note.id),
                totalNotes: member.notes.filter(
                  (n: Note) => !n.isRead && n.id !== note.id
                ).length,
              };
            }
            return member;
          })
        );

        // Update selectedMemberNotes to remove the read note
        if (selectedMemberNotes) {
          setSelectedMemberNotes({
            ...selectedMemberNotes,
            // Filter out the read note
            notes: selectedMemberNotes.notes.filter((n: Note) => n.id !== note.id),
            totalNotes: selectedMemberNotes.notes.filter(
              (n: Note) => !n.isRead && n.id !== note.id
            ).length,
          });
        }
      }
    } catch (error) {
      console.error("Error marking note as read:", error);
    }
  };

  const handleStatusChange = async (
    member: ProjectMember,
    newStatus: "active" | "inactive"
  ) => {
    try {
      console.log("Updating status for member:", member);
      console.log("Document ID:", member.documentId);

      const result = await updateMemberStatus(member.documentId, newStatus);
      if (result.success) {
        setMembers(
          members.map((m) =>
            m.documentId === member.documentId ? { ...m, status: newStatus } : m
          )
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleRemoveMember = async () => {
    if (memberToRemove) {
      try {
        console.log("Removing member:", memberToRemove);
        console.log("Document ID:", memberToRemove.documentId);

        const result = await removeMemberFromProject(memberToRemove.documentId);
        if (result.success) {
          setMembers(
            members.filter((m) => m.documentId !== memberToRemove.documentId)
          );
          setRemoveDialogOpen(false);
          setMemberToRemove(null);
        }
      } catch (error) {
        console.error("Error removing member:", error);
      }
    }
  };

  return (
    <div className="w-full">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle
              className="text-sm font-medium"
              style={{ color: "#1A202C" }}
            >
              Total Students
            </CardTitle>
            <Users className="h-4 w-4" style={{ color: "#718096" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "#2D3748" }}>
              {projectStats.totalStudents}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle
              className="text-sm font-medium"
              style={{ color: "#1A202C" }}
            >
              Total Shift Leaders
            </CardTitle>
            <UserCheck className="h-4 w-4" style={{ color: "#718096" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "#2D3748" }}>
              {projectStats.totalShiftLeaders}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle
              className="text-sm font-medium"
              style={{ color: "#1A202C" }}
            >
              Punctuality Stats
            </CardTitle>
            <PieChart className="h-4 w-4" style={{ color: "#718096" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "#2D3748" }}>
              {projectStats.averagePunctuality}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Add Worker Section */}
      <div className="flex items-center justify-between mb-4">
        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <div className="relative">
            <Search
              className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
              style={{ color: "#A0AEC0" }}
            />
            <Input
              type="text"
              placeholder="Search workers"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value === "") {
                  // Reset to original data if search is cleared
                  getProjectMembersWithStats(projectId).then((data) =>
                    setMembers(data)
                  );
                }
              }}
              className="pl-8 pr-4 py-2 w-64 h-9 text-sm"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "#E2E8F0",
                color: "#2D3748",
              }}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            style={{
              backgroundColor: "#3182CE",
              color: "#FFFFFF",
            }}
          >
            Search
          </Button>
        </form>
        <Link href={`/a-invitations`}>
          <Button
            onClick={() => setAddUserDialogOpen(true)}
          size="sm"
          style={{
            backgroundColor: "#3182CE",
            color: "#FFFFFF",
          }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add New Worker
          </Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ color: "#1A202C" }}>Worker</TableHead>
            <TableHead style={{ color: "#1A202C" }}>Shifts Completed</TableHead>
            <TableHead style={{ color: "#1A202C" }}>Punctuality</TableHead>
            <TableHead style={{ color: "#1A202C" }}>Performance</TableHead>
            <TableHead style={{ color: "#1A202C" }}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentMembers.map((member) => (
            <TableRow key={member.memberId}>
              <TableCell className="flex items-center space-x-4">
                <InitialsAvatar name={member.name} />
                <span style={{ color: "#2D3748" }} className="font-medium">
                  {member.name}
                </span>
              </TableCell>
              <TableCell>
                <span style={{ color: "#2D3748" }}>
                  {member.shiftsCompleted}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-full h-2 rounded-full overflow-hidden border"
                    style={{
                      borderColor: "#E2E8F0",
                      backgroundColor: "#F7FAFC",
                    }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${member.punctualityScore}%`,
                        backgroundColor:
                          member.punctualityScore >= 90
                            ? "#48BB78"
                            : member.punctualityScore >= 70
                            ? "#ECC94B"
                            : member.punctualityScore >= 50
                            ? "#2D3748"
                            : "#F56565",
                      }}
                    ></div>
                  </div>
                  <span
                    style={{ color: "#2D3748" }}
                    className="text-sm font-medium"
                  >
                    {member.punctualityScore}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <StarRating value={member.rating} />
                  <button
                    onClick={() => {
                      setSelectedMemberNotes(member);
                      setNotesDialogOpen(true);
                    }}
                    className="relative focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
                  >
                    <Mail
                      style={{ color: "#3182CE" }}
                      className="h-5 w-5 hover:text-blue-600"
                    />
                    {member.totalNotes > 0 && (
                      <span
                        className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 text-xs text-white rounded-full"
                        style={{ backgroundColor: "#E53E3E" }}
                      >
                        {member.totalNotes}
                      </span>
                    )}
                  </button>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  {member.status === "inactive" ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleStatusChange(member, "active")}
                      style={{ backgroundColor: "#48BB78", color: "#FFFFFF" }}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Unsuspend
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(member, "inactive")}
                      style={{ borderColor: "#E53E3E", color: "#E53E3E" }}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Suspend
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setMemberToRemove(member);
                      setRemoveDialogOpen(true);
                    }}
                    style={{ backgroundColor: "#E53E3E", color: "#FFFFFF" }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
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
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          style={{ borderColor: "#E2E8F0", color: "#2D3748" }}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <span style={{ color: "#718096" }} className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
          style={{ borderColor: "#E2E8F0", color: "#2D3748" }}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent
          className="sm:max-w-[500px] max-h-[80vh] flex flex-col"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <DialogHeader>
            <DialogTitle
              className="text-xl font-semibold"
              style={{ color: "#1A202C" }}
            >
              Notes for {selectedMemberNotes?.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea
            className="flex-grow mt-4 -mx-6 px-6"
            style={{ backgroundColor: "#FFFFFF" }}
          >
            <div className="space-y-4">
              {selectedMemberNotes?.notes.map((note: Note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-lg shadow-sm relative" // Added relative positioning
                  style={{
                    backgroundColor: note.isRead ? "#F7FAFC" : "#EBF8FF", // Different background for unread
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <InitialsAvatar name={note.leader} />
                      <div className="flex flex-col">
                        <span
                          className="text-sm font-medium"
                          style={{ color: "#2D3748" }}
                        >
                          {note.leader}
                        </span>
                        <span className="text-xs" style={{ color: "#718096" }}>
                          Shift Leader
                        </span>
                      </div>
                    </div>
                    <span className="text-xs" style={{ color: "#718096" }}>
                      {new Date(note.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p
                    className="text-sm mb-2 mt-3 pl-12"
                    style={{ color: "#4A5568" }}
                  >
                    {note.content}
                  </p>
                  {!note.isRead && (
                    <Button
                      onClick={() => handleMarkAsRead(note)}
                      size="sm"
                      className="absolute bottom-3 right-3"
                      style={{
                        backgroundColor: "#3182CE",
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark as Read
                    </Button>
                  )}
                </div>
              ))}
              {(!selectedMemberNotes?.notes ||
                selectedMemberNotes.notes.length === 0) && (
                <p className="text-center py-4" style={{ color: "#718096" }}>
                  No notes available for this worker.
                </p>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4" style={{ backgroundColor: "#FFFFFF" }}>
            <Button
              onClick={() => setNotesDialogOpen(false)}
              style={{ backgroundColor: "#3182CE", color: "#FFFFFF" }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle style={{ color: "#1A202C" }}>
              Remove Worker
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm" style={{ color: "#4A5568" }}>
              Are you sure you want to remove {memberToRemove?.name} from this
              project? This action will revoke their project membership and
              remove all historical data.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRemoveDialogOpen(false);
                setMemberToRemove(null);
              }}
              style={{ borderColor: "#E2E8F0", color: "#2D3748" }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              style={{ backgroundColor: "#E53E3E", color: "#FFFFFF" }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  AlertCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  getAllUsers,
  toggleStudentSuspension,
  deleteUser,
} from "@/lib/actions/user-management.actions";

const CategoryBadge = ({ category }: { category: string }) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return {
          borderColor: "border-green-200",
          backgroundColor: "bg-green-500",
          textColor: "text-green-700",
          chipBackgroundColor: "bg-green-50",
        };
      case "inactive":
        return {
          borderColor: "border-red-200",
          backgroundColor: "bg-red-500",
          textColor: "text-red-700",
          chipBackgroundColor: "bg-red-50",
        };
      default:
        return {
          borderColor: "border-gray-200",
          backgroundColor: "bg-gray-500",
          textColor: "text-gray-700",
          chipBackgroundColor: "bg-gray-50",
        };
    }
  };

  const { borderColor, backgroundColor, textColor, chipBackgroundColor } =
    getStatusStyle(category);

  return (
    <div className={cn("category-badge", borderColor, chipBackgroundColor)}>
      <div className={cn("size-2 rounded-full", backgroundColor)} />
      <p className={cn("text-[12px] font-medium", textColor)}>{category}</p>
    </div>
  );
};

interface StyledWorkerTableProps {
  userId: string;
}

interface User {
  userId: string;
  name: string;
  availability: string[];
  status: "active" | "inactive";
}

interface Student extends User {
  punctualityScore: number;
}

interface Client extends User {
  projects: number;
  students: number;
}

interface Leader extends User {
  projects: number;
  students: number;
}

interface Guard extends User {
  projects: number;
  students: number;
}

interface UsersState {
  students: Student[];
  clients: Client[];
  leaders: Leader[];
  guards: Guard[];
}

interface AvailabilityFormat {
  display: string[];
  remaining: number;
  full: string[];
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
        "flex items-center justify-center size-10 rounded-full text-white font-semibold",
        bgColor
      )}
    >
      {initials}
    </div>
  );
};

export default function StyledWorkerTable({ userId }: StyledWorkerTableProps) {
  const [users, setUsers] = useState<UsersState>({
    students: [],
    clients: [],
    leaders: [],
    guards: [],
  });
  const [currentPage, setCurrentPage] = useState({
    students: 1,
    clients: 1,
    leaders: 1,
    guards: 1,
  });
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const itemsPerPage = 5;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await getAllUsers(userId);
        setUsers(response);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchUsers();
    }
  }, [userId]);

  const handleSuspendStudent = async () => {
    if (selectedStudent) {
      try {
        const result = await toggleStudentSuspension(selectedStudent);
        if (result.success && result.newStatus) {
          setUsers((prev: UsersState) => ({
            ...prev,
            students: prev.students.map((student) =>
              student.userId === selectedStudent
                ? { ...student, status: result.newStatus! }
                : student
            ),
          }));
        }
      } catch (error) {
        console.error("Error toggling student suspension:", error);
      }
      setSuspendDialogOpen(false);
      setSelectedStudent(null);
    }
  };

  const handleDeleteUser = async (
    userId: string,
    type: "student" | "client" | "leader" | "guard"
  ) => {
    try {
      const result = await deleteUser(userId, type);
      if (result.success) {
        setUsers((prev) => ({
          ...prev,
          [type === "leader" ? "leaders" : `${type}s`]: (
            prev[
              type === "leader" ? "leaders" : (`${type}s` as keyof UsersState)
            ] as any[]
          ).filter((user) => user.userId !== userId),
        }));
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const paginateData = (data: any[], page: number) => {
    const startIndex = (page - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  const renderPagination = (
    type: "students" | "clients" | "leaders" | "guards",
    totalItems: number
  ) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-4">
        <Button
          onClick={() =>
            setCurrentPage((prev) => ({
              ...prev,
              [type]: Math.max(1, prev[type] - 1),
            }))
          }
          disabled={currentPage[type] === 1}
          variant="outline"
          size="sm"
          className="text-14"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage[type]} of {totalPages}
        </span>
        <Button
          onClick={() =>
            setCurrentPage((prev) => ({
              ...prev,
              [type]: Math.min(totalPages, prev[type] + 1),
            }))
          }
          disabled={currentPage[type] === totalPages}
          variant="outline"
          size="sm"
          className="text-14"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    );
  };

  const formatAvailability = (days: string[]): AvailabilityFormat => {
    if (!days.length)
      return {
        display: [],
        remaining: 0,
        full: [],
      };
    const shortDays = days.map((day) => day.slice(0, 2));
    return {
      display: shortDays.slice(0, 2),
      remaining: shortDays.length > 2 ? shortDays.length - 2 : 0,
      full: days,
    };
  };

  const TableEmptyState = ({ type }: { type: string }) => (
    <div className="py-8 text-center">
      <p className="text-muted-foreground">No {type} found</p>
      <p className="text-sm text-muted-foreground mt-1">
        {type === "students"
          ? "Add students to see them listed here"
          : type === "clients"
          ? "Add clients to see them listed here"
          : type === "leaders"
          ? "Add shift leaders to see them listed here"
          : "Add security guards to see them listed here"}
      </p>
    </div>
  );

  return (
    <section className="min-h-screen bg-background p-4">
      <div className="mb-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold text-[#344054]">All Users</h2>
          <Link href="/a-invitations">
            <Button className="w-full sm:w-auto bg-white text-blue-600 border border-blue-600 hover:bg-blue-50">
              <Plus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
          </Link>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : users.students.length === 0 && 
           users.clients.length === 0 && 
           users.leaders.length === 0 && 
           users.guards.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No users found</p>
          </div>
        ) : (
          <Tabs defaultValue="students" className="w-full">
            <TabsList className="w-full border-b mb-4 flex-wrap justify-start sm:space-x-8">
              <TabsTrigger
                value="students"
                className="flex-grow sm:flex-grow-0 pb-2 text-sm sm:text-base data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
              >
                Students
              </TabsTrigger>
              <TabsTrigger
                value="clients"
                className="flex-grow sm:flex-grow-0 pb-2 text-sm sm:text-base data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
              >
                Clients
              </TabsTrigger>
              <TabsTrigger
                value="leaders"
                className="flex-grow sm:flex-grow-0 pb-2 text-sm sm:text-base data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
              >
                Shift Leaders
              </TabsTrigger>
              <TabsTrigger
                value="guards"
                className="flex-grow sm:flex-grow-0 pb-2 text-sm sm:text-base data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
              >
                Security Guards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students">
              <div className="overflow-x-auto">
                {users.students.length === 0 ? (
                  <TableEmptyState type="students" />
                ) : (
                  <Table>
                    <TableHeader className="bg-[#f9fafb]">
                      <TableRow>
                        <TableHead className="w-[250px]">Student</TableHead>
                        <TableHead>Availability</TableHead>
                        <TableHead>Punctuality</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[140px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginateData(users.students, currentPage.students).map(
                        (student: any) => {
                          const availability = formatAvailability(
                            student.availability
                          );
                          return (
                            <TableRow key={student.userId}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <InitialsAvatar name={student.name} />
                                  <span className="font-medium">
                                    {student.name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className="flex space-x-1">
                                        {availability.display.map(
                                          (day: string, index: number) => (
                                            <span
                                              key={index}
                                              className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs"
                                            >
                                              {day}
                                            </span>
                                          )
                                        )}
                                        {availability.remaining > 0 && (
                                          <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs">
                                            +{availability.remaining}
                                          </span>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{student.availability.join(", ")}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-gray-300">
                                    <div
                                      className={cn(
                                        "h-full",
                                        student.punctualityScore >= 90
                                          ? "bg-green-500"
                                          : student.punctualityScore >= 70
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                      )}
                                      style={{
                                        width: `${student.punctualityScore}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium">
                                    {student.punctualityScore}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <CategoryBadge category={student.status} />
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedStudent(student.userId);
                                      setSuspendDialogOpen(true);
                                    }}
                                    className="text-14 border-red-300 text-red-500 hover:bg-red-50"
                                  >
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    {student.status === "active"
                                      ? "Suspend"
                                      : "Unsuspend"}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() =>
                                      handleDeleteUser(student.userId, "student")
                                    }
                                    className="text-14 bg-red-500 text-white hover:bg-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
              {renderPagination("students", users.students.length)}
            </TabsContent>

            <TabsContent value="clients">
              <div className="overflow-x-auto">
                {users.clients.length === 0 ? (
                  <TableEmptyState type="clients" />
                ) : (
                  <Table>
                    <TableHeader className="bg-[#f9fafb]">
                      <TableRow>
                        <TableHead className="w-[250px]">Client</TableHead>
                        <TableHead>Projects</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[140px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginateData(users.clients, currentPage.clients).map(
                        (client: any) => (
                          <TableRow key={client.userId}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <InitialsAvatar name={client.name} />
                                <span className="font-medium">{client.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{client.projects}</TableCell>
                            <TableCell>{client.students}</TableCell>
                            <TableCell>
                              <CategoryBadge category={client.status} />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDeleteUser(client.userId, "client")
                                }
                                className="text-14 bg-red-500 text-white hover:bg-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
              {renderPagination("clients", users.clients.length)}
            </TabsContent>

            <TabsContent value="leaders">
              <div className="overflow-x-auto">
                {users.leaders.length === 0 ? (
                  <TableEmptyState type="leaders" />
                ) : (
                  <Table>
                    <TableHeader className="bg-[#f9fafb]">
                    <TableRow>
                      <TableHead className="w-[250px]">Shift Leader</TableHead>
                      <TableHead>Availability</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginateData(users.leaders, currentPage.leaders).map(
                      (leader: any) => {
                        const availability = formatAvailability(
                          leader.availability
                        );
                        return (
                          <TableRow key={leader.userId}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <InitialsAvatar name={leader.name} />
                                <span className="font-medium">{leader.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="flex space-x-1">
                                      {availability.display.map(
                                        (day: string, index: number) => (
                                          <span
                                            key={index}
                                            className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs"
                                          >
                                            {day}
                                          </span>
                                        )
                                      )}
                                      {availability.remaining > 0 && (
                                        <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs">
                                          +{availability.remaining}
                                        </span>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{leader.availability.join(", ")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>{leader.projects}</TableCell>
                            <TableCell>{leader.students}</TableCell>
                            <TableCell>
                              <CategoryBadge category={leader.status} />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDeleteUser(leader.userId, "leader")
                                }
                                className="text-14 bg-red-500 text-white hover:bg-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      }
                    )}
                  </TableBody>
                  </Table>
                )}
              </div>
              {renderPagination("leaders", users.leaders.length)}
            </TabsContent>

            <TabsContent value="guards">
              <div className="overflow-x-auto">
                {users.guards.length === 0 ? (
                  <TableEmptyState type="guards" />
                ) : (
                  <Table>
                    <TableHeader className="bg-[#f9fafb]">
                    <TableRow>
                      <TableHead className="w-[250px]">Security Guard</TableHead>
                      <TableHead>Availability</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginateData(users.guards, currentPage.guards).map(
                      (guard: any) => {
                        const availability = formatAvailability(
                          guard.availability
                        );
                        return (
                          <TableRow key={guard.userId}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <InitialsAvatar name={guard.name} />
                                <span className="font-medium">{guard.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="flex space-x-1">
                                      {availability.display.map(
                                        (day: string, index: number) => (
                                          <span
                                            key={index}
                                            className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs"
                                          >
                                            {day}
                                          </span>
                                        )
                                      )}
                                      {availability.remaining > 0 && (
                                        <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs">
                                          +{availability.remaining}
                                        </span>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{guard.availability.join(", ")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>{guard.projects}</TableCell>
                            <TableCell>{guard.students}</TableCell>
                            <TableCell>
                              <CategoryBadge category={guard.status} />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDeleteUser(guard.userId, "guard")
                                }
                                className="text-14 bg-red-500 text-white hover:bg-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      }
                    )}
                  </TableBody>
                  </Table>
                )}
              </div>
              {renderPagination("guards", users.guards.length)}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Suspend Student Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>
              {users.students.find((s: any) => s.userId === selectedStudent)
                ?.status === "active"
                ? "Suspend Student"
                : "Unsuspend Student"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              {users.students.find((s: any) => s.userId === selectedStudent)
                ?.status === "active"
                ? "Are you sure you want to suspend this student? They will not be able to participate in any activities while suspended."
                : "Are you sure you want to unsuspend this student? They will be able to resume their activities."}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSuspendDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSuspendStudent}
              variant={
                users.students.find((s: any) => s.userId === selectedStudent)
                  ?.status === "active"
                  ? "destructive"
                  : "default"
              }
            >
              {users.students.find((s: any) => s.userId === selectedStudent)
                ?.status === "active"
                ? "Suspend"
                : "Unsuspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

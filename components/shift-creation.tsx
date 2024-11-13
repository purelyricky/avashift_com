"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import * as XLSX from 'xlsx'
import { getUserProjects, getProjectMembers, getAllProjectsWithShifts, createShift, updateShift } from "@/lib/actions/shiftcreation.actions"
import { Loader2 } from "lucide-react"

// Days of the week remain unchanged
const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

type ShiftManagementUser = {
  userId: string;
  role: string;
}

interface Shift {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  day: string
  workers: number
  type: "day" | "night"
  leader: string
  securityGuard: string
  shiftType: "normal" | "filler"
  shiftId: string
}

interface ProjectWithShifts {
  id: string
  name: string
  status: string
  shifts: Shift[]
}

export function ShiftManagementComponent({ user }: { user: ShiftManagementUser }) {
  // State declarations
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [shiftLeaders, setShiftLeaders] = useState<Array<{ id: string; name: string }>>([])
  const [securityGuards, setSecurityGuards] = useState<Array<{ id: string; name: string }>>([])
  const [selectedLeader, setSelectedLeader] = useState<string>("")
  const [selectedGuard, setSelectedGuard] = useState<string>("")
  const [projectsWithShifts, setProjectsWithShifts] = useState<ProjectWithShifts[]>([])
  const [currentShift, setCurrentShift] = useState<Shift>({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    day: "monday",
    workers: 1,
    type: "day",
    leader: "",
    securityGuard: "",
    shiftType: "normal",
    shiftId: "",
  })
  const [editingShift, setEditingShift] = useState<{ projectId: string; shiftIndex: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Add new state for loading and success messages
  const [isCreating, setIsCreating] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showEditSuccess, setShowEditSuccess] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Fetch user's projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsData = await getUserProjects(user.userId)
        setProjects(projectsData)
      } catch (error) {
        console.error('Error fetching projects:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProjects()
  }, [user.userId])

  // Fetch all projects with shifts
  useEffect(() => {
    const fetchProjectsWithShifts = async () => {
      try {
        const projectsData = await getAllProjectsWithShifts(user.userId);
        
        // Filter out any null values and ensure the structure matches ProjectWithShifts
        const validProjects = projectsData
          .filter((project): project is ProjectWithShifts => project !== null && 
            typeof project.id === 'string' &&
            typeof project.name === 'string' &&
            typeof project.status === 'string' &&
            Array.isArray(project.shifts) &&
            project.shifts.every(shift => 
              typeof shift.startDate === 'string' &&
              typeof shift.startTime === 'string' &&
              typeof shift.endDate === 'string' &&
              typeof shift.endTime === 'string' &&
              typeof shift.day === 'string' &&
              typeof shift.workers === 'number' &&
              (shift.type === 'day' || shift.type === 'night') &&
              typeof shift.leader === 'string' &&
              typeof shift.securityGuard === 'string' &&
              (shift.shiftType === 'normal' || shift.shiftType === 'filler') &&
              typeof shift.shiftId === 'string' // Ensure shiftId is a string
            )
          );

        setProjectsWithShifts(validProjects);
      } catch (error) {
        console.error('Error fetching projects with shifts:', error);
      }
    };
    fetchProjectsWithShifts();
  }, [user.userId]);

  // Refresh projects with shifts
  const refreshProjectsWithShifts = async () => {
    try {
      const projectsData = await getAllProjectsWithShifts(user.userId)
      const currentDate = new Date()
      
      // Filter out projects and remove shifts that have started
      const validProjects = projectsData
        .filter((project): project is ProjectWithShifts => project !== null)
        .map(project => ({
          ...project,
          shifts: project.shifts.filter(shift => {
            const shiftStartDate = new Date(`${shift.startDate}T${shift.startTime}`)
            return shiftStartDate > currentDate
          })
        }))
        // Remove projects that have no remaining shifts
        .filter(project => project.shifts.length > 0)

      setProjectsWithShifts(validProjects)
    } catch (error) {
      console.error('Error refreshing projects with shifts:', error)
    }
  }

  // Handle project selection
  const handleProjectSelect = async (projectId: string) => {
    setSelectedProject(projectId)
    setSelectedLeader("")
    setSelectedGuard("")

    try {
      // Fetch shift leaders and security guards for the selected project
      const [leaders, guards] = await Promise.all([
        getProjectMembers(projectId, 'shiftLeader'),
        getProjectMembers(projectId, 'gateman')
      ])
      
      setShiftLeaders(leaders)
      setSecurityGuards(guards)
    } catch (error) {
      console.error('Error fetching project members:', error)
    }
  }

  const handleLeaderSelect = (leaderId: string) => {
    setSelectedLeader(leaderId)
  }

  const handleGuardSelect = (guardId: string) => {
    setSelectedGuard(guardId)
  }

  const handleShiftChange = (field: keyof Shift, value: string | number) => {
    setCurrentShift(prev => ({ ...prev, [field]: value }))
  }

  const handleAddShift = async () => {
    if (selectedProject && selectedLeader && selectedGuard) {
      setIsCreating(true)
      try {
        const response = await createShift({
          projectId: selectedProject,
          shiftLeaderId: selectedLeader,
          gatemanId: selectedGuard,
          startDate: currentShift.startDate,
          startTime: currentShift.startTime,
          endDate: currentShift.endDate,
          endTime: currentShift.endTime,
          dayOfWeek: currentShift.day.toLowerCase(),
          requiredStudents: currentShift.workers,
          timeType: currentShift.type,
          shiftType: currentShift.shiftType,
          createdBy: user.userId
        })

        if (response.status === 'success') {
          await refreshProjectsWithShifts()
          setShowSuccess(true)
          setTimeout(() => {
            setShowSuccess(false)
            // Reset form
            setCurrentShift({
              startDate: "",
              startTime: "",
              endDate: "",
              endTime: "",
              day: "monday",
              workers: 1,
              type: "day",
              leader: "",
              securityGuard: "",
              shiftType: "normal",
              shiftId: "",
            })
          }, 2000)
        }
      } catch (error) {
        console.error('Error adding shift:', error)
      } finally {
        setIsCreating(false)
      }
    }
  }

  const handleEditShift = async () => {
    if (editingShift && currentShift.shiftId) {
      setIsSaving(true)
      try {
        const response = await updateShift(currentShift.shiftId, {
          startDate: currentShift.startDate,
          startTime: currentShift.startTime,
          endDate: currentShift.endDate,
          endTime: currentShift.endTime,
          dayOfWeek: currentShift.day.toLowerCase(),
          requiredStudents: currentShift.workers,
          timeType: currentShift.type,
          shiftType: currentShift.shiftType,
          shiftLeaderId: currentShift.leader,
          gatemanId: currentShift.securityGuard
        })

        if (response.status === 'success') {
          await refreshProjectsWithShifts()
          setShowEditSuccess(true)
          // Close dialog immediately
          setDialogOpen(false)
          // Reset edit state after a delay
          setTimeout(() => {
            setShowEditSuccess(false)
            setEditingShift(null)
          }, 2000)
        }
      } catch (error) {
        console.error('Error updating shift:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const openEditModal = (projectId: string, shiftIndex: number) => {
    const project = projectsWithShifts.find(p => p.id === projectId)
    if (project) {
      const shift = project.shifts[shiftIndex]
      setCurrentShift({
        ...shift,
        leader: shift.leader,
        securityGuard: shift.securityGuard
      })
      setEditingShift({ projectId, shiftIndex })

      // Also fetch the project's shift leaders and security guards
      handleProjectSelect(projectId)
    }
  }

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()
    const allShifts = projectsWithShifts.flatMap(project =>
      project.shifts.map(shift => ({
        Project: project.name,
        Status: project.status,
        'Start Date': shift.startDate,
        'Start Time': shift.startTime,
        'End Date': shift.endDate,
        'End Time': shift.endTime,
        Day: shift.day,
        'Number of Workers': shift.workers,
        'Shift Time': shift.type,
        'Shift Type': shift.shiftType,
        'Leader': shiftLeaders.find(l => l.id === shift.leader)?.name || shift.leader,
        'Security Guard': securityGuards.find(g => g.id === shift.securityGuard)?.name || shift.securityGuard
      }))
    )
    const worksheet = XLSX.utils.json_to_sheet(allShifts)
    XLSX.utils.book_append_sheet(workbook, worksheet, "All Shifts")
    XLSX.writeFile(workbook, "all_shifts.xlsx")
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-white shadow-creditCard">
          <CardContent className="p-4">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderEditForm = () => (
    <form className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-item">
          <Label htmlFor="edit-startDate" className="form-label">Start Date</Label>
          <Input
            id="edit-startDate"
            type="date"
            value={currentShift.startDate}
            onChange={e => handleShiftChange("startDate", e.target.value)}
            className="input-class"
          />
        </div>
        <div className="form-item">
          <Label htmlFor="edit-startTime" className="form-label">Start Time</Label>
          <Input
            id="edit-startTime"
            type="time"
            value={currentShift.startTime}
            onChange={e => handleShiftChange("startTime", e.target.value)}
            className="input-class"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="form-item">
          <Label htmlFor="edit-endDate" className="form-label">End Date</Label>
          <Input
            id="edit-endDate"
            type="date"
            value={currentShift.endDate}
            onChange={e => handleShiftChange("endDate", e.target.value)}
            className="input-class"
          />
        </div>
        <div className="form-item">
          <Label htmlFor="edit-endTime" className="form-label">End Time</Label>
          <Input
            id="edit-endTime"
            type="time"
            value={currentShift.endTime}
            onChange={e => handleShiftChange("endTime", e.target.value)}
            className="input-class"
          />
        </div>
      </div>
      <div className="form-item">
        <Label htmlFor="edit-day" className="form-label">Day</Label>
        <Select
          value={currentShift.day}
          onValueChange={value => handleShiftChange("day", value)}
        >
          <SelectTrigger id="edit-day" className="input-class">
            <SelectValue placeholder="Select a day" />
          </SelectTrigger>
          <SelectContent className="bg-[#FFFFFF]">
            {daysOfWeek.map(day => (
              <SelectItem key={day} value={day}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="form-item">
        <Label htmlFor="edit-workers" className="form-label">Number of Workers</Label>
        <Input
          id="edit-workers"
          type="number"
          min="1"
          value={currentShift.workers}
          onChange={e => handleShiftChange("workers", parseInt(e.target.value))}
          className="input-class"
        />
      </div>
      <div className="form-item">
        <Label className="form-label">Shift Time</Label>
        <RadioGroup
          value={currentShift.type}
          onValueChange={value => handleShiftChange("type", value as "day" | "night")}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="day" id="edit-day-shift" />
            <Label htmlFor="edit-day-shift">Day Shift</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="night" id="edit-night-shift" />
            <Label htmlFor="edit-night-shift">Night Shift</Label>
          </div>
        </RadioGroup>
      </div>
      <div className="form-item">
        <Label className="form-label">Shift Type</Label>
        <RadioGroup
          value={currentShift.shiftType}
          onValueChange={value => handleShiftChange("shiftType", value as "normal" | "filler")}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="normal" id="edit-normal-shift" />
            <Label htmlFor="edit-normal-shift">Normal Shift</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="filler" id="edit-filler-shift" />
            <Label htmlFor="edit-filler-shift">Filler Shift</Label>
          </div>
        </RadioGroup>
      </div>
      <div className="form-item">
        <Label htmlFor="edit-leader" className="form-label">Shift Leader</Label>
        <Select
          value={currentShift.leader}
          onValueChange={value => handleShiftChange("leader", value)}
        >
          <SelectTrigger id="edit-leader" className="input-class">
            <SelectValue placeholder="Select a shift leader" />
          </SelectTrigger>
          <SelectContent className="bg-[#FFFFFF]">
            {shiftLeaders.map(leader => (
              <SelectItem key={leader.id} value={leader.id}>
                {leader.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="form-item">
        <Label htmlFor="edit-guard" className="form-label">Security Guard</Label>
        <Select
          value={currentShift.securityGuard}
          onValueChange={value => handleShiftChange("securityGuard", value)}
        >
          <SelectTrigger id="edit-guard" className="input-class">
            <SelectValue placeholder="Select a security guard" />
          </SelectTrigger>
          <SelectContent className="bg-[#FFFFFF]">
            {securityGuards.map(guard => (
              <SelectItem key={guard.id} value={guard.id}>
                {guard.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button 
        type="button" 
        onClick={handleEditShift} 
        disabled={isSaving}
        className="w-full form-btn"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : showEditSuccess ? (
          "Congratulations! Changes Saved"
        ) : (
          "Save Changes"
        )}
      </Button>
    </form>
  )

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-white shadow-creditCard">
          <CardHeader>
            <CardTitle className="text-24 font-semibold text-gray-900">Project and Leader Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="form-item">
              <Label htmlFor="project-select" className="form-label">Select Project</Label>
              <Select onValueChange={handleProjectSelect}>
                <SelectTrigger id="project-select" className="input-class">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent className="bg-[#FFFFFF]">
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProject && (
              <>
                <div className="form-item">
                  <Label htmlFor="leader-select" className="form-label">Select Shift Leader</Label>
                  <Select onValueChange={handleLeaderSelect}>
                    <SelectTrigger id="leader-select" className="input-class">
                      <SelectValue placeholder="Select a shift leader" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#FFFFFF]">
                      {shiftLeaders.map(leader => (
                        <SelectItem key={leader.id} value={leader.id}>
                          {leader.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-item">
                  <Label htmlFor="guard-select" className="form-label">Select Security Guard</Label>
                  <Select onValueChange={handleGuardSelect}>
                    <SelectTrigger id="guard-select" className="input-class">
                      <SelectValue placeholder="Select a security guard" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#FFFFFF]">
                      {securityGuards.map(guard => (
                        <SelectItem key={guard.id} value={guard.id}>
                          {guard.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {selectedLeader && selectedGuard && (
              <div className="form-item">
                <Label className="form-label">Shift Type</Label>
                <RadioGroup
                  value={currentShift.shiftType}
                  onValueChange={(value) => handleShiftChange("shiftType", value as "normal" | "filler")}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal" id="normal-shift" />
                    <Label htmlFor="normal-shift">Normal Shift</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="filler" id="filler-shift" />
                    <Label htmlFor="filler-shift">Filler Shift</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-creditCard">
          <CardHeader>
            <CardTitle className="text-24 font-semibold text-gray-900">Create Shift</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-item">
                  <Label htmlFor="startDate" className="form-label">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={currentShift.startDate}
                    onChange={e => handleShiftChange("startDate", e.target.value)}
                    className="input-class"
                  />
                </div>
                <div className="form-item">
                  <Label htmlFor="startTime" className="form-label">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={currentShift.startTime}
                    onChange={e => handleShiftChange("startTime", e.target.value)}
                    className="input-class"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-item">
                  <Label htmlFor="endDate" className="form-label">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={currentShift.endDate}
                    onChange={e => handleShiftChange("endDate", e.target.value)}
                    className="input-class"
                  />
                </div>
                <div className="form-item">
                  <Label htmlFor="endTime" className="form-label">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={currentShift.endTime}
                    onChange={e => handleShiftChange("endTime", e.target.value)}
                    className="input-class"
                  />
                </div>
              </div>
              <div className="form-item">
                <Label htmlFor="day" className="form-label">Day</Label>
                <Select
                  value={currentShift.day}
                  onValueChange={value => handleShiftChange("day", value)}
                >
                  <SelectTrigger id="day" className="input-class">
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#FFFFFF]">
                    {daysOfWeek.map(day => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="form-item">
                <Label htmlFor="workers" className="form-label">Number of Workers</Label>
                <Input
                  id="workers"
                  type="number"
                  min="1"
                  value={currentShift.workers}
                  onChange={e => handleShiftChange("workers", parseInt(e.target.value))}
                  className="input-class"
                />
              </div>
              <div className="form-item">
                <Label className="form-label">Shift Time</Label>
                <RadioGroup
                  value={currentShift.type}
                  onValueChange={value => handleShiftChange("type", value as "day" | "night")}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="day" id="day" />
                    <Label htmlFor="day">Day Shift</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="night" id="night" />
                    <Label htmlFor="night">Night Shift</Label>
                  </div>
                </RadioGroup>
              </div>
              <Button
                type="button"
                onClick={handleAddShift}
                disabled={!selectedProject || !selectedLeader || !selectedGuard || !currentShift.startDate || !currentShift.endDate || !currentShift.shiftType || isCreating}
                className="w-full form-btn"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : showSuccess ? (
                  "Congratulations! Shift Created"
                ) : (
                  "Add Shift"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      <Card className="bg-white shadow-creditCard">
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <CardTitle className="text-24 font-semibold text-gray-900">Projects with Shifts</CardTitle>
            <Button onClick={exportToExcel} className="form-btn">
              Export to Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={projectsWithShifts.map(p => p.id.toString())}>
            {projectsWithShifts.map(project => (
              <AccordionItem key={project.id} value={project.id.toString()}>
                <AccordionTrigger className="text-16 font-semibold text-gray-900">
                  <div className="flex items-center justify-between w-full">
                    <span>{project.name}</span>
                    <Badge className="category-badge">{project.status}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-14 font-medium text-gray-700">Start Date</TableHead>
                        <TableHead className="text-14 font-medium text-gray-700">Start Time</TableHead>
                        <TableHead className="text-14 font-medium text-gray-700">End Date</TableHead>
                        <TableHead className="text-14 font-medium text-gray-700">End Time</TableHead>
                        <TableHead className="text-14 font-medium text-gray-700">Day</TableHead>
                        <TableHead className="text-14 font-medium text-gray-700">Workers</TableHead>
                        <TableHead className="text-14 font-medium text-gray-700">Shift Time</TableHead>
                        <TableHead className="text-14 font-medium text-gray-700">Shift Type</TableHead>
                        <TableHead className="text-14 font-medium text-gray-700">Leader</TableHead>
                        <TableHead className="text-14 font-medium text-gray-700">Security Guard</TableHead>
                        <TableHead className="text-14 font-medium text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {project.shifts.map((shift, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-14 text-gray-900">{shift.startDate}</TableCell>
                          <TableCell className="text-14 text-gray-900">{shift.startTime}</TableCell>
                          <TableCell className="text-14 text-gray-900">{shift.endDate}</TableCell>
                          <TableCell className="text-14 text-gray-900">{shift.endTime}</TableCell>
                          <TableCell className="text-14 text-gray-900">{shift.day}</TableCell>
                          <TableCell className="text-14 text-gray-900">{shift.workers}</TableCell>
                          <TableCell className="text-14 text-gray-900">{shift.type} shift</TableCell>
                          <TableCell className="text-14 text-gray-900">{shift.shiftType} shift</TableCell>
                          <TableCell className="text-14 text-gray-900">
                            {shiftLeaders.find(l => l.id === shift.leader)?.name || shift.leader}
                          </TableCell>
                          <TableCell className="text-14 text-gray-900">
                            {securityGuards.find(g => g.id === shift.securityGuard)?.name || shift.securityGuard}
                          </TableCell>
                          <TableCell>
                            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    openEditModal(project.id, index)
                                    setDialogOpen(true)
                                  }}
                                  className="text-14 font-semibold text-gray-700"
                                >
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white">
                                <DialogHeader>
                                  <DialogTitle className="text-24 font-semibold text-gray-900">Edit Shift</DialogTitle>
                                </DialogHeader>
                                {renderEditForm()}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}

      
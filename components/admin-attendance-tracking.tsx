"use client";
import { useState, FormEvent, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Users, Clock, AlertTriangle, CheckCircle, Search, 
  ChevronLeft, ChevronRight, Info, MessageSquare, Calendar 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import CalendarDateModal, { DateRangeType } from './CalendarDateModal'
import { getAttendanceRecords } from '@/lib/actions/attendance-management.actions'

const InitialsAvatar = ({ name }: { name: string }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase()
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
  ]
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  const bgColor = colors[colorIndex]

  return (
    <div className={`flex items-center justify-center size-10 rounded-full text-white font-semibold ${bgColor}`}>
      {initials}
    </div>
  )
}

export function AdminAttendanceTracking({ userId }: { userId: string }) {
  // State
  const [presentWorkers, setPresentWorkers] = useState(0)
  const [absentWorkers, setAbsentWorkers] = useState(0)
  const [timelyArrivals, setTimelyArrivals] = useState(0)
  const [lateArrivals, setLateArrivals] = useState(0)
  const [attendance, setAttendance] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [totalRecords, setTotalRecords] = useState(0)
  
  // Calendar state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRangeType>({})
  const [dateFilterActive, setDateFilterActive] = useState(false)

  // Contact modal state
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [contactType, setContactType] = useState<'leader' | 'student'>('leader')
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null)
  const [message, setMessage] = useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage] = useState(5)

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    try {
      const response = await getAttendanceRecords({
        userId,
        dateRange: dateRange.from && dateRange.to ? {
          from: dateRange.from,
          to: dateRange.to
        } : undefined,
        searchTerm,
        page: currentPage,
        limit: recordsPerPage
      });

      setAttendance(response.records);
      setTotalRecords(response.total);
      
      // Update stats
      setPresentWorkers(response.stats.presentWorkers);
      setAbsentWorkers(response.stats.absentWorkers);
      setTimelyArrivals(response.stats.timelyArrivals);
      setLateArrivals(response.stats.lateArrivals);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [currentPage, dateRange, searchTerm]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchAttendanceData()
  }

  const handleDateFilter = (range: DateRangeType) => {
    setDateRange(range)
    setDateFilterActive(true)
    setIsCalendarOpen(false)
    setCurrentPage(1)
  }

  const clearDateFilter = () => {
    setDateRange({})
    setDateFilterActive(false)
    setCurrentPage(1)
  }

  const handleContactLeader = (worker: any) => {
    setSelectedWorker(worker)
    setContactType('leader')
    setContactModalOpen(true)
  }

  const handleContactStudent = (worker: any) => {
    setSelectedWorker(worker)
    setContactType('student')
    setContactModalOpen(true)
  }

  // Calculate pagination values
  const totalPages = Math.ceil(totalRecords / recordsPerPage)

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Summary Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{presentWorkers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Workers</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{absentWorkers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timely Arrivals</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground"
            />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timelyArrivals}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lateArrivals}</div>
            </CardContent>
          </Card>
        </div>
  
        {/* Table Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <form onSubmit={handleSearch} className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search attendance"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-4 py-2 w-64 h-9 text-sm"
                  />
                </div>
                <Button type="submit" size="sm" className="bg-[#3D0C02] text-white hover:bg-[#3D0C02]/90">
                  Search
                </Button>
              </form>
  
              {/* Calendar Date Modal */}
              <Button 
                variant="outline" 
                size="sm" 
                className={dateFilterActive ? "bg-blue-500 text-white" : "bg-[#3D0C02] text-white hover:bg-[#3D0C02]/90"}
                onClick={() => dateFilterActive ? clearDateFilter() : setIsCalendarOpen(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {dateFilterActive ? "Clear Filter" : "Dates"}
              </Button>
  
              <CalendarDateModal
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                initialDateRange={dateRange}
                onApplyFilter={handleDateFilter}
                allowUndefined={true}
                className="bg-white"
              />
            </div>
          </div>
  
          {/* Attendance Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record, index) => (
                  <TableRow key={record.id}>
                    <TableCell>{(currentPage - 1) * recordsPerPage + index + 1}</TableCell>
                    <TableCell className="flex items-center space-x-4">
                      <InitialsAvatar name={record.name} />
                      <span className="font-medium text-gray-700">{record.name}</span>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center">
                            <span className="font-medium text-gray-800">
                              {record.actualCheckIn || "--"}
                            </span>
                            <Info className="h-4 w-4 ml-1 text-blue-500" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-white">
                            <p>Scheduled: {record.scheduledCheckIn}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center">
                            <span className="font-medium text-gray-800">
                              {record.actualCheckOut || "--"}
                            </span>
                            <Info className="h-4 w-4 ml-1 text-blue-500" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-white">
                            <p>Scheduled: {record.scheduledCheckOut}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="font-medium text-gray-700">
                              {record.project.length > 20 
                                ? `${record.project.substring(0, 20)}...` 
                                : record.project}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-white">
                            <p>{record.project}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        record.status === 'present' ? 'bg-green-100 text-green-800' :
                        record.status === 'absent' ? 'bg-red-100 text-red-800' :
                        record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {/* Message buttons - functionality to be implemented later */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                          onClick={() => handleContactLeader(record)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Leader
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700"
                          onClick={() => handleContactStudent(record)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Student
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
  
          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
  
        {/* Contact Modal - To be implemented with messaging functionality */}
        <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle>Contact {contactType === 'leader' ? 'Leader' : 'Student'}</DialogTitle>
              <DialogDescription>
                {/* Note: Messaging functionality to be implemented */}
                You are about to send a message to the {contactType} for {selectedWorker?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center space-x-4">
                <InitialsAvatar name={selectedWorker?.name || ''} />
                <div>
                  <p className="font-medium">{selectedWorker?.name}</p>
                  <p className="text-sm text-gray-500">{selectedWorker?.project}</p>
                </div>
              </div>
              <Textarea
                placeholder="Type your message here."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                className="bg-[#3D0C02] text-white hover:bg-[#3D0C02]/90"
                onClick={() => {
                  // Messaging functionality to be implemented
                  setContactModalOpen(false);
                  setMessage("");
                }}
              >
                Send Message
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
  
  export default AdminAttendanceTracking;
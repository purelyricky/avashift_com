"use client"

import { useState, FormEvent, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Users, Clock, AlertTriangle, Search, ChevronLeft, ChevronRight, FileDown, Briefcase, Calendar } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { cn } from "@/lib/utils"
import CalendarDateModal, { DateRangeType } from './CalendarDateModal'
import { getReportsData, ReportData, ReportSummary } from '@/lib/actions/reports.actions'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface ReportsPageProps {
  userId: string;
}

export default function ReportsPage({ userId }: ReportsPageProps) {
  // State for data
  const [reports, setReports] = useState<ReportData[]>([])
  const [summary, setSummary] = useState<ReportSummary>({
    totalShifts: 0,
    totalTrackedHours: 0,
    totalLostHours: 0
  })
  
  // UI state
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [reportsPerPage, setReportsPerPage] = useState(5)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf')
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const [selectedFields, setSelectedFields] = useState({
    name: true,
    shiftsCompleted: true,
    trackedHours: true,
    lostHours: true,
    datesWorked: true,
    projects: true
  })
  const [dateRange, setDateRange] = useState<DateRangeType>({})

  // Fetch data
  const fetchData = async () => {
    const result = await getReportsData(userId, dateRange, searchTerm)
    setReports(result.data)
    setSummary(result.summary)
    setCurrentPage(1) // Reset to first page when data changes
  }

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [userId, dateRange])

  // Handle search
  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    await fetchData()
  }

  // Pagination logic
  const indexOfLastReport = currentPage * reportsPerPage
  const indexOfFirstReport = indexOfLastReport - reportsPerPage
  const currentReports = reports.slice(indexOfFirstReport, indexOfLastReport)
  const totalPages = Math.ceil(reports.length / reportsPerPage)

  // Navigation
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages))
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1))

  // Export functions
  const handleExport = () => {
    if (exportFormat === 'pdf') {
      exportToPDF()
    } else {
      exportToExcel()
    }
    setExportDialogOpen(false)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    doc.setFontSize(16)
    doc.text('Reports', 14, 15)
    doc.setFontSize(10)

    const tableColumn = Object.keys(selectedFields)
      .filter(key => selectedFields[key as keyof typeof selectedFields])
      .map(key => key.charAt(0).toUpperCase() + key.slice(1))

    const tableRows = reports.map(report => 
      Object.entries(selectedFields)
        .filter(([key, value]) => value)
        .map(([key]) => {
          if (key === 'datesWorked') {
            return report.datesWorked.join(', ')
          }
          if (key === 'projects') {
            return report.projects.join(', ')
          }
          return report[key as keyof typeof report]
        })
    )

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 40 },
        5: { cellWidth: 40 }
      }
    })

    doc.save('reports.pdf')
  }

  const exportToExcel = () => {
    const formattedData = reports.map(report => {
      const filteredReport: any = {}
      Object.entries(selectedFields).forEach(([key, value]) => {
        if (value) {
          if (key === 'datesWorked') {
            filteredReport[key] = report.datesWorked.join(', ')
          } else if (key === 'projects') {
            filteredReport[key] = report.projects.join(', ')
          } else {
            filteredReport[key] = report[key as keyof typeof report]
          }
        }
      })
      return filteredReport
    })

    const worksheet = XLSX.utils.json_to_sheet(formattedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reports")
    XLSX.writeFile(workbook, 'reports.xlsx')
  }

  // Helper functions
  const toggleAllFields = (checked: boolean) => {
    setSelectedFields(Object.fromEntries(
      Object.keys(selectedFields).map(key => [key, checked])
    ) as typeof selectedFields)
  }

  const shortenProjectName = (name: string | undefined) => {
    if (!name) return 'No Project';
    return name.length > 7 ? name.slice(0, 7) + '...' : name;
  }

  const InitialsAvatar = ({ name }: { name: string }) => {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase()
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
      'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
    ]
    const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    const bgColor = colors[colorIndex]

    return (
      <div className={cn('flex items-center justify-center size-10 rounded-full text-white font-semibold', bgColor)}>
        {initials}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shifts Completed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalShifts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tracked Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTrackedHours}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lost Hours</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalLostHours}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search reports"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-4 py-2 w-64 h-9 text-sm"
              />
            </div>
            <Button type="submit" size="sm" className="bg-blue-500 text-white">Search</Button>
          </form>

          {/* Calendar Date Modal */}
          <CalendarDateModal
            isOpen={dateFilterOpen}
            onClose={() => setDateFilterOpen(false)}
            initialDateRange={dateRange}
            onApplyFilter={(range) => {
              setDateRange(range)
              setDateFilterOpen(false)
            }}
            allowUndefined={true}
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setDateFilterOpen(true)}
            className={dateRange.from ? "bg-blue-500 text-white" : ""}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Dates
          </Button>

          {/* Export Dialog */}
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white">
              <DialogHeader>
                <DialogTitle>Export Reports</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={Object.values(selectedFields).every(Boolean)}
                    onCheckedChange={(checked) => toggleAllFields(checked as boolean)}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium">
                    Select All
                  </label>
                </div>
                {Object.entries(selectedFields).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => 
                        setSelectedFields(prev => ({ ...prev, [key]: checked as boolean }))
                      }
                    />
                    <label htmlFor={key} className="text-sm font-medium">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </label>
                  </div>
                ))}
                <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as 'pdf' | 'excel')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">Export as PDF</SelectItem>
                    <SelectItem value="excel">Export as Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button className="bg-blue-500 text-white" onClick={handleExport}>Export</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Items per page selector */}
        <Select
          value={reportsPerPage.toString()}
          onValueChange={(value) => {
            setReportsPerPage(Number(value))
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Items per page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 per page</SelectItem>
            <SelectItem value="10">10 per page</SelectItem>
            <SelectItem value="20">20 per page</SelectItem>
            <SelectItem value="50">50 per page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Worker</TableHead>
            <TableHead>Shifts Completed</TableHead>
            <TableHead>Tracked Hours</TableHead>
            <TableHead>Lost Hours</TableHead>
            <TableHead>Dates Worked</TableHead>
            <TableHead>Projects</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentReports.map((report, index) => (
            <TableRow key={report.id}>
              <TableCell>{indexOfFirstReport + index + 1}</TableCell>
              <TableCell className="flex items-center space-x-4">
                <InitialsAvatar name={report.name} />
                <span className="font-medium">{report.name}</span>
              </TableCell>
              <TableCell>{report.shiftsCompleted}</TableCell>
              <TableCell>{report.trackedHours}</TableCell>
              <TableCell>{report.lostHours}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  {report.datesWorked.slice(0, 5).map((date, i) => (
                    <span key={i} className="inline-block bg-gray-200 rounded-full px-1.5 py-0.5 text-xs font-semibold text-gray-700">
                      {date}
                    </span>
                  ))}
                  {report.datesWorked.length > 5 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="inline-flex items-center justify-center bg-gray-200 rounded-full w-5 h-5 text-xs font-semibold text-gray-700">
                            +{report.datesWorked.length - 5}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{report.datesWorked.slice(5).join(', ')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-600">
                    {report.projects?.length > 0 
                      ? shortenProjectName(report.projects[0])
                      : 'No Projects'}
                  </span>
                  {report.projects?.length > 1 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="relative inline-flex items-center">
                            <Briefcase className="h-4 w-4 text-gray-400" />
                            <span className="absolute -top-1 -right-1 flex items-center justify-center bg-red-500 text-white text-xs rounded-full h-4 w-4 font-medium">
                              +{report.projects.length - 1}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{report.projects.slice(1).join(', ')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
          onClick={prevPage}
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
          onClick={nextPage}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
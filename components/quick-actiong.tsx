"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { AlertTriangle, InfoIcon, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function QuickActiong() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [payStubsModalOpen, setPayStubsModalOpen] = useState(false)
  const [timeOffModalOpen, setTimeOffModalOpen] = useState(false)
  const [timeOffStatus, setTimeOffStatus] = useState('active')

  const handleUpdateAvailability = () => {
    setIsLoading(true)
    router.push('/g-update')
  }

  const showToast = (title: string, description: string) => {
    toast({
      title: title,
      description: description,
      duration: 3000,
    })
  }

  return (
    <div className="flex flex-col gap-8 bg-gray-25 p-8 xl:py-12">
      <div className="header-box">
        <h2 className="header-box-title">Gyors Műveletek</h2>
        <p className="header-box-subtext">Kezelje elérhetőségét és kérelmeit</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button 
          onClick={handleUpdateAvailability} 
          disabled={isLoading}
          className="text14_padding10 bg-[#191970] text-white shadow-form"
        >
          {isLoading ? "Betöltés..." : "Elérhetőség Frissítése"}
        </Button>
        <Dialog open={payStubsModalOpen} onOpenChange={setPayStubsModalOpen}>
          <DialogTrigger asChild>
            <Button className="text14_padding10 bg-[#191970] text-white shadow-form">Fizetési Jegyzékek</Button>
          </DialogTrigger>
          <DialogContent className="bg-white/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-20 font-semibold text-gray-900">Fizetési Jegyzékek</DialogTitle>
              <DialogDescription className="text-14 text-gray-600">
                Kérjük, vegye fel a kapcsolatot az adminisztrátorral a fizetési jegyzékekért.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="text14_padding10 text-gray-700">
                  Bezárás
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={timeOffModalOpen} onOpenChange={setTimeOffModalOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={timeOffStatus === 'pending'}
              variant={timeOffStatus === 'pending' ? 'secondary' : 'default'}
              className="text14_padding10 bg-[#191970] text-white shadow-form"
            >
              {timeOffStatus === 'active' && "Szabadság Igénylése"}
              {timeOffStatus === 'pending' && "Függőben Lévő Szabadság Kérelem"}
              {timeOffStatus === 'inactive' && "Fiók Aktiválása"}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-20 font-semibold text-gray-900">
                {timeOffStatus === 'active' && "Szabadság Igénylése"}
                {timeOffStatus === 'inactive' && "Fiók Aktiválása"}
              </DialogTitle>
              <DialogDescription>
                {timeOffStatus === 'active' && (
                  <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-14 font-semibold text-yellow-800">Figyelmeztetés</AlertTitle>
                    <AlertDescription className="text-14 text-yellow-700">
                      Kérjük, vegye fel a kapcsolatot az adminisztrátorral a szabadság igényléséhez, de vegye figyelembe, hogy nem kap több műszakot, amíg nem változtatják meg újra az állapotát.
                    </AlertDescription>
                  </Alert>
                )}
                {timeOffStatus === 'inactive' && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <InfoIcon className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-14 font-semibold text-blue-800">Információ</AlertTitle>
                    <AlertDescription className="text-14 text-blue-700">
                      A fiók aktiválásának kérelmezésével jogosulttá válik a jövőbeni műszakokra.
                    </AlertDescription>
                  </Alert>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="text14_padding10 text-gray-700">
                  Bezárás
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
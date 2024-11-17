'use client'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { sidebarLinksLeader } from "@/constants"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Footer from "./Footer"

const MobileNavLeader = ({ user }: MobileNavProps) => {
  const pathname = usePathname();

  return (
    <section className="w-fulll max-w-[264px]">
      <Sheet>
        <SheetTrigger>
          <Image
            src="/icons/hamburger.svg"
            width={30}
            height={30}
            alt="menu"
            className="cursor-pointer"
          />
        </SheetTrigger>
        <SheetContent side="left" className="border-none bg-white flex flex-col p-0">
          <div className="flex-1 overflow-y-auto">
            <Link href="/" className="cursor-pointer flex items-center gap-1 p-6">
              <Image 
                src="/icons/logo.svg"
                width={34}
                height={34}
                alt="Ava Shift logo"
              />
              <h1 className="text-26 font-ibm-plex-serif font-bold text-black-1">Ava Shift</h1>
            </Link>
            <div className="mobilenav-sheet flex flex-col h-full">
              <SheetClose asChild>
                <nav className="flex flex-col gap-6 p-6 pt-16">
                  {sidebarLinksLeader.map((item) => {
                    const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`)

                    return (
                      <SheetClose asChild key={item.route}>
                        <Link href={item.route} key={item.label}
                          className={cn('mobilenav-sheet_close w-full', { 'bg-bank-gradient': isActive })}
                        >
                            <Image 
                              src={item.imgURL}
                              alt={item.label}
                              width={20}
                              height={20}
                              className={cn({
                                'brightness-[3] invert-0': isActive
                              })}
                            />
                          <p className={cn("text-16 font-semibold text-black-2", { "text-white": isActive })}>
                            {item.label}
                          </p>
                        </Link>
                      </SheetClose>
                    )
                  })}
                </nav>
              </SheetClose>
            </div>
          </div>
          
          <div className="mt-auto border-t">
            <Footer user={user} type="mobile" />
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}

export default MobileNavLeader
import MobileNavStudent from "@/components/MobileNavStudent";
import SidebarStudent from "@/components/SidebarStudent";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";

export default async function StudentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const response = await getLoggedInUser();

  if (!response || response.status === 'error' || !response.data) {
    redirect('/sign-in');
  }

  const user = response.data;
  
  // Ensure user is a student
  if (user.role !== 'student') {
    redirect('/'); // or to appropriate error page
  }

  return (
    <main className="flex h-screen w-full font-inter">
      <SidebarStudent user={user} />
      <div className="flex size-full flex-col">
        <div className="root-layout">
          <Image src="/icons/logo.svg" width={30} height={30} alt="logo" />
          <div>
            <MobileNavStudent user={user} />
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
import MobileNavGate from "@/components/MobileNavGate";
import SidebarGate from "@/components/SidebarGate";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function GatemanLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const response = await getLoggedInUser();

  if (!response || response.status === 'error' || !response.data) {
    redirect('/sign-in');
  }

  const user = response.data;
  
  // Ensure user is a gateman
  if (user.role !== 'gateman') {
    redirect('/'); // or to appropriate error page
  }

  return (
    <main className="flex h-screen w-full font-inter">
      <SidebarGate user={user} />
      <div className="flex size-full flex-col">
        <div className="root-layout">
          <Image src="/icons/logo.svg" width={30} height={30} alt="logo" />
          <div>
            <MobileNavGate user={user} />
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

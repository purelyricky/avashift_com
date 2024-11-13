import MobileNavAdmin from "@/components/MobileNavAdmin";
import SidebarAdmin from "@/components/SidebarAdmin";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const response = await getLoggedInUser();

  if (!response || response.status === 'error' || !response.data) {
    redirect('/sign-in');
  }

  const user = response.data;
  
  // Ensure user is an admin
  if (user.role !== 'admin') {
    redirect('/'); // or to appropriate error page
  }

  return (
    <main className="flex h-screen w-full font-inter">
      <SidebarAdmin user={user} />
      <div className="flex size-full flex-col">
        <div className="root-layout">
          <Image src="/icons/logo.svg" width={30} height={30} alt="logo" />
          <div>
            <MobileNavAdmin user={user} />
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
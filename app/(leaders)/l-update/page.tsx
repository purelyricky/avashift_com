import HeaderBox from '@/components/HeaderBox'
import UpdateAvailabilityForms from '@/components/UpdateAvailabilityForms'
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import React from 'react'

const LeaderUpdateAvailability = async () => {
    const response = await getLoggedInUser();
  
  if (!response || response.status === 'error' || !response.data) {
    redirect('/sign-in');
  }

  const user = response.data;
  
  if (user.role !== 'shiftLeader') {
    redirect('/');
  }

  return (
    <section className="payment-transfer">
      <HeaderBox 
        title="Elérhetőség Frissítése"
        subtext="Kérjük, válassza ki azokat a konkrét napokat és időpontokat, amikor dolgozni tud"
      />

      <section className="size-full pt-5">
        <UpdateAvailabilityForms />
      </section>
    </section>
  )
}

export default LeaderUpdateAvailability
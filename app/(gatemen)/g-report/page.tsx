import HeaderBox from '@/components/HeaderBox'
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import { AlertTriangle, Hammer, HardHat, Construction } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card"
import { useState } from 'react';

const GatemanReport = async () => {
  const response = await getLoggedInUser();
  
  // Handle authentication and authorization
  if (!response || response.status === 'error' || !response.data) {
    redirect('/sign-in');
  }
  const user = response.data;
  
  // Ensure user is an admin
  if (user.role !== 'gateman') {
    redirect('/');
  }

  return (
    <section className="home min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="home-content p-6">
        <header className="home-header mb-12">
        <HeaderBox 
            title="Shift Reports"
            subtext="See your shift reports accurately across all your projects."
          />
        </header>

        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-yellow-400 bg-white/80 backdrop-blur">
            <CardContent className="p-8">
              <div className="flex flex-col items-center space-y-6">
                {/* Animation container */}
                <div className="flex items-center justify-center space-x-4 animate-bounce">
                  <Construction className="h-8 w-8 text-yellow-500" />
                  <HardHat className="h-8 w-8 text-yellow-600" />
                  <Hammer className="h-8 w-8 text-yellow-700" />
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mt-4">
                  🚧 Under Construction 🚧
                </h2>

                <p className="text-center text-gray-600 max-w-md">
                  We're working hard to build something amazing! This feature will be available soon.
                </p>

                <div className="flex items-center justify-center p-4 bg-amber-50 rounded-lg border border-amber-200 mt-4">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                  <p className="text-amber-700 font-medium">
                    Expected completion: Coming Soon
                  </p>
                </div>

                {/* Progress bar with emoji */}
                <div className="w-full relative">
                  <div className="bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div className="bg-yellow-400 h-2.5 rounded-full w-1/3 animate-pulse"></div>
                  </div>
                  {/* Emoji positioned at end of progress */}
                  <div className="absolute -top-4 transition-all duration-300" style={{ left: 'calc(33.33% - 10px)' }}>
                    <span className="text-xl animate-bounce inline-block">😊</span>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mt-4">
                  Check back later for updates!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

export default GatemanReport
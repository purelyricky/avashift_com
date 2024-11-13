import Image from "next/image";
import clsx from "clsx";

// ... existing code ...
interface ShiftStatCardProps {
    type: 'completed' | 'upcoming';
    count: number;
    label: string;
    className?: string; // Add this line to accept className
  }


  export const ShiftStatCard = ({ count = 0, label, type }: ShiftStatCardProps) => {
    const bgImage = type === "completed" ? "/icons/completedbg.png" : "/icons/upcomingbg.png";
    const icon = type === "completed" ? "/icons/completedicon.svg" : "/icons/upcomingicon.svg";
  
    return (
        <section className="total-balance h-24 sm:h-24 relative overflow-hidden">
        <Image
          src={bgImage}
          alt="background"
          fill
          className="object-cover opacity-10 absolute inset-0"
        />
        <div className="flex items-center gap-2 sm:gap-4 relative z-10">
          <Image
            src={icon}
            height={30}
            width={30}
            alt={type}
            className="size-6 sm:size-8 w-fit max-w-full h-auto"
          />
          <div className="flex flex-col">
          <h2 className="text-22-bold sm:text-34-bold text-black">{count}</h2>
          <p className="text-13-regular sm:text-17-regular text-gray-500 whitespace-nowrap">{label}</p>
          </div>
        </div>
      </section>
    );
  };
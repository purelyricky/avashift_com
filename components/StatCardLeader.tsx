import Image from "next/image";

export const StatCardLeader = ({ type, value, label }: StatCardProps) => {
  const getIcon = () => {
    switch(type) {
      case 'attendance':
        return "/icons/attendance.svg";
      case 'ratings':
        return "/icons/ratings.svg";
      case 'comments':
        return "/icons/comments.svg";
      default:
        return "/icons/default.svg";
    }
  };

  const formatValue = () => {
    switch(type) {
      case 'attendance':
      case 'ratings':
        return `${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  return (
    <section className="total-balance h-24 sm:h-24 relative overflow-hidden">
      <Image
        src="/icons/statbg.png"
        alt="background"
        fill
        className="object-cover opacity-10 absolute inset-0"
      />
      <div className="flex items-center gap-2 sm:gap-4 relative z-10">
        <Image
          src={getIcon()}
          height={30}
          width={30}
          alt={type}
          className="size-6 sm:size-8 w-fit max-w-full h-auto"
        />
        <div className="flex flex-col">
          <h2 className="text-22-bold sm:text-34-bold text-black">
            {formatValue()}
          </h2>
          <p className="text-13-regular sm:text-17-regular text-gray-500 whitespace-nowrap">
            {label}
          </p>
        </div>
      </div>
    </section>
  );
};
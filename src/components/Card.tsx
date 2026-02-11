import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[#0f172a] 
        border border-white/10 
        rounded-2xl 
        shadow-lg 
        p-4 
        text-white
        ${onClick ? "cursor-pointer hover:border-white/20 transition-all" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

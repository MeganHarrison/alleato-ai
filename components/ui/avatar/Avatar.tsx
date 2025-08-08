import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src: string;
  alt?: string;
  size?: "xsmall" | "small" | "medium" | "large" | "xlarge" | "xxlarge";
  status?: "online" | "offline" | "busy";
  className?: string;
}

const sizeClasses = {
  xsmall: "w-6 h-6",
  small: "w-8 h-8",
  medium: "w-10 h-10",
  large: "w-12 h-12",
  xlarge: "w-16 h-16",
  xxlarge: "w-20 h-20",
};

const statusClasses = {
  online: "bg-success-500",
  offline: "bg-gray-400",
  busy: "bg-error-500",
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "Avatar",
  size = "medium",
  status,
  className,
}) => {
  const sizeClass = sizeClasses[size];
  const statusSize = {
    xsmall: "w-2 h-2",
    small: "w-2.5 h-2.5",
    medium: "w-3 h-3",
    large: "w-3.5 h-3.5",
    xlarge: "w-4 h-4",
    xxlarge: "w-5 h-5",
  }[size];

  return (
    <div className={cn("relative inline-block", className)}>
      <div className={cn("overflow-hidden rounded-full", sizeClass)}>
        <Image
          src={src}
          alt={alt}
          width={80}
          height={80}
          className="object-cover w-full h-full"
        />
      </div>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-gray-900",
            statusSize,
            statusClasses[status]
          )}
        />
      )}
    </div>
  );
};

export default Avatar;
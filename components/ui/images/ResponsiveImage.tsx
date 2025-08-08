import Image from "next/image";
import React from "react";

export default function ResponsiveImage() {
  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden">
      <Image
        src="/images/user/user-11.png"
        alt="Responsive image example"
        fill
        className="object-cover"
      />
    </div>
  );
}
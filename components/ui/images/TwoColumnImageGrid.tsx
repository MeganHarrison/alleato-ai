import Image from "next/image";
import React from "react";

export default function TwoColumnImageGrid() {
  const images = [
    { src: "/images/user/user-01.png", alt: "User 1" },
    { src: "/images/user/user-02.png", alt: "User 2" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {images.map((image, index) => (
        <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
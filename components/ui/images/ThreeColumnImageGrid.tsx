import Image from "next/image";
import React from "react";

export default function ThreeColumnImageGrid() {
  const images = [
    { src: "/images/user/user-03.png", alt: "User 3" },
    { src: "/images/user/user-04.png", alt: "User 4" },
    { src: "/images/user/user-05.png", alt: "User 5" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
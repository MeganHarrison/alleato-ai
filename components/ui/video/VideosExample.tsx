import React from "react";
import FourIsToThree from "@/components/videos/FourIsToThree";
import OneIsToOne from "@/components/videos/OneIsToOne";
import SixteenIsToNine from "@/components/videos/SixteenIsToNine";
import TwentyOneIsToNine from "@/components/videos/TwentyOneIsToNine";
import ComponentCard from "@/components/common/ComponentCard";

export default function VideosExample() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <ComponentCard title="Aspect Ratio 16:9">
        <SixteenIsToNine />
      </ComponentCard>
      <ComponentCard title="Aspect Ratio 21:9">
        <TwentyOneIsToNine />
      </ComponentCard>
      <ComponentCard title="Aspect Ratio 4:3">
        <FourIsToThree />
      </ComponentCard>
      <ComponentCard title="Aspect Ratio 1:1">
        <OneIsToOne />
      </ComponentCard>
    </div>
  );
}
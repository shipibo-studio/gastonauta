import React from "react";
import type { LucideIcon } from "lucide-react";

interface IconProps {
  as: LucideIcon;
  className?: string;
  color?: string;
  size?: number | string;
  // ...otros props opcionales
}

export function Icon({ as: Lucide, className = "", color, size = 20, ...props }: IconProps) {
  return (
    <Lucide
      className={className}
      color={color}
      size={size}
      strokeWidth={1}
      absoluteStrokeWidth={true}
      {...props}
    />
  );
}

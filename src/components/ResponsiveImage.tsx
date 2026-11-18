"use client";

import Image from "next/image";
import { useState } from "react";

interface ResponsiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
}

/**
 * Responsive image component using Next.js Image with srcset.
 *
 * Generates multiple image sizes and lets the browser pick the
 * best fit via the `sizes` attribute, reducing bandwidth on mobile.
 */
export function ResponsiveImage({
  src,
  alt,
  width = 800,
  height = 600,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  className,
  priority = false,
}: ResponsiveImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`bg-neutral-200 dark:bg-neutral-800 ${className ?? ""}`}
        style={{ width, height }}
        aria-label={alt}
        role="img"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      priority={priority}
      onError={() => setHasError(true)}
    />
  );
}

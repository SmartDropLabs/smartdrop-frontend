"use client";

import NextLink from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@chakra-ui/react";

export interface BreadcrumbSegment {
  label: string;
  /** When omitted the segment is rendered as the current (non-linked) page. */
  href?: string;
}

/**
 * Reusable breadcrumb trail. Always prefixes with "Home → /".
 *
 * Usage:
 *   <Breadcrumbs items={[{ label: "Farm", href: "/farm" }, { label: "XLM" }]} />
 *   → Home > Farm > XLM
 */
export default function Breadcrumbs({ items }: { items: BreadcrumbSegment[] }) {
  const ACCENT = "app.accent";

  return (
    <Breadcrumb
      fontSize="sm"
      color="app.muted"
      separator={
        <span style={{ margin: "0 2px", opacity: 0.5 }}>›</span>
      }
    >
      {/* Home — always present */}
      <BreadcrumbItem>
        <BreadcrumbLink
          as={NextLink}
          href="/"
          color="app.muted"
          _hover={{ color: ACCENT }}
          transition="color 0.15s ease"
        >
          Home
        </BreadcrumbLink>
      </BreadcrumbItem>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <BreadcrumbItem key={item.label + idx} isCurrentPage={isLast}>
            {isLast || !item.href ? (
              <BreadcrumbLink color={ACCENT} cursor="default">
                {item.label}
              </BreadcrumbLink>
            ) : (
              <BreadcrumbLink
                as={NextLink}
                href={item.href}
                color="app.muted"
                _hover={{ color: ACCENT }}
                transition="color 0.15s ease"
              >
                {item.label}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        );
      })}
    </Breadcrumb>
  );
}

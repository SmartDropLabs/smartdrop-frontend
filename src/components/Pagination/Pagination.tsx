"use client";

import React from "react";
import { Flex, Button, Text } from "@chakra-ui/react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

export function getPageWindow(
  current: number,
  total: number,
  siblingCount = 1
): (number | "ellipsis-left" | "ellipsis-right")[] {
  if (total <= 1) return [1];

  const totalPageNumbers = siblingCount * 2 + 5;

  if (total <= totalPageNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(current - siblingCount, 1);
  const rightSiblingIndex = Math.min(current + siblingCount, total);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < total - 1;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, "ellipsis-right", total];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => total - rightItemCount + 1 + i
    );
    return [1, "ellipsis-left", ...rightRange];
  }

  if (shouldShowLeftDots && shouldShowRightDots) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );
    return [1, "ellipsis-left", ...middleRange, "ellipsis-right", total];
  }

  return Array.from({ length: total }, (_, i) => i + 1);
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageWindow(currentPage, totalPages, siblingCount);

  return (
    <Flex
      gap={2}
      mt={6}
      align="center"
      wrap="wrap"
      justify="center"
      role="navigation"
      aria-label="Pagination Navigation"
    >
      <Button
        size="sm"
        borderRadius="2xl"
        variant="outline"
        borderColor="app.border"
        color="app.text"
        isDisabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Go to previous page"
        _hover={{ borderColor: "app.accent", color: "app.accent" }}
      >
        Prev
      </Button>

      {pages.map((p, index) => {
        if (typeof p === "string") {
          return (
            <Text
              key={`${p}-${index}`}
              px={2}
              py={1}
              fontSize="sm"
              color="app.muted"
              aria-hidden="true"
            >
              …
            </Text>
          );
        }

        const isCurrent = p === currentPage;
        return (
          <Button
            key={p}
            size="sm"
            borderRadius="2xl"
            variant={isCurrent ? "solid" : "outline"}
            bg={isCurrent ? "app.accent" : undefined}
            color={isCurrent ? "app.onAccent" : "app.text"}
            borderColor="app.border"
            onClick={() => onPageChange(p)}
            aria-current={isCurrent ? "page" : undefined}
            aria-label={isCurrent ? `Page ${p}, current page` : `Go to page ${p}`}
            _hover={{
              borderColor: "app.accent",
              color: isCurrent ? "app.onAccent" : "app.accent",
            }}
          >
            {p}
          </Button>
        );
      })}

      <Button
        size="sm"
        borderRadius="2xl"
        variant="outline"
        borderColor="app.border"
        color="app.text"
        isDisabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Go to next page"
        _hover={{ borderColor: "app.accent", color: "app.accent" }}
      >
        Next
      </Button>
    </Flex>
  );
}

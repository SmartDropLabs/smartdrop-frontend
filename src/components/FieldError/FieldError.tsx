"use client";

import { Box, Text, type TextProps } from "@chakra-ui/react";

type FieldErrorProps = Omit<TextProps, "id" | "children"> & {
  /** Referenced by the input's `aria-describedby`. */
  id: string;
  /** Validation message; falsy renders an empty (silent) region. */
  message?: string | null;
};

/**
 * Inline form validation error that screen readers announce as it appears
 * or changes. The aria-live wrapper stays mounted even with no error:
 * screen readers only announce changes inside a region that already exists,
 * so mounting the region together with its text (the previous
 * `{error && <Text>}` pattern) is silently skipped by most AT.
 *
 * Polite rather than assertive so validation-as-you-type doesn't cut off
 * the user's own keystroke echo. Pair with `isInvalid` (Chakra derives
 * `aria-invalid` from it and ignores a raw `aria-invalid` prop) and
 * `aria-describedby={id}` on the input so the error is also read on focus.
 */
export default function FieldError({ id, message, ...textProps }: FieldErrorProps) {
  return (
    <Box id={id} aria-live="polite" aria-atomic="true">
      {message && (
        <Text fontSize="xs" color="app.errorFg" {...textProps}>
          {message}
        </Text>
      )}
    </Box>
  );
}

"use client";

import RouteError from "@/components/RouteError/RouteError";

export default function FarmError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} routeName="Farm" />;
}

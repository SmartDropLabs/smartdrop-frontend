"use client";

import RouteError from "@/components/RouteError/RouteError";

export default function WebhooksError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} routeName="Webhooks" />;
}

import { getRequestConfig } from "next-intl/server";

export const locales = ["en"] as const;
export const defaultLocale = "en" as const;

export type Locale = (typeof locales)[number];

// Narrowing predicate instead of `locales.includes(locale as any)`: the cast
// silenced the type checker on a value that genuinely arrives from outside
// (the request), which is exactly the case where the fallback below matters.
export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !isLocale(locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});

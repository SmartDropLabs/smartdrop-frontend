# Internationalization (i18n) Setup

This project uses `next-intl` for multi-language support. Currently, English (en) and Spanish (es) are configured.

## Project Structure

- `src/i18n/routing.ts` - Locale routing configuration
- `src/i18n/messages/en.json` - English translations
- `src/i18n/messages/es.json` - Spanish translations
- `src/middleware.ts` - next-intl middleware for locale detection

## Installation

To complete the i18n setup, install next-intl:

```bash
npm install next-intl
```

## Configuration

After installing next-intl, update your `next.config.js` to enable i18n support if not already configured.

## Using Translations in Components

Import the `useTranslations` hook from `next-intl` to access translations:

```typescript
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('farm');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('deposit')}</p>
    </div>
  );
}
```

## Translation Keys

Translations are organized by namespace:

- `common.*` - Global UI labels (buttons, loading states, etc.)
- `farm.*` - Farm and pool-related strings
- `leaderboard.*` - Leaderboard page strings
- `wallet.*` - Wallet connection strings

## Adding New Translations

1. Add the key to both `src/i18n/messages/en.json` and `src/i18n/messages/es.json`
2. Use `useTranslations()` in your component with the namespace
3. Access the translation: `t('key')`

## Supported Languages

- English (`en`) - Default
- Spanish (`es`)

To add another language:

1. Create `src/i18n/messages/[locale].json`
2. Add locale to `routing.locales` in `src/i18n/routing.ts`
3. Add translation strings for all keys

## Locale Detection

The middleware automatically detects locale from the URL path. Routes are structured as:

- `/en/farm` - English version
- `/es/farm` - Spanish version
- `/farm` - Uses default locale (English)

## Language Switching

Use the Link component from `next-intl/navigation` to navigate between locales:

```typescript
import { Link } from '@/i18n/routing';

export function LanguageSwitcher() {
  return (
    <div>
      <Link href="/farm" locale="en">English</Link>
      <Link href="/farm" locale="es">Español</Link>
    </div>
  );
}
```

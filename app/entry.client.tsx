import * as React from "react";

import { RemixBrowser } from "@remix-run/react";
import { hydrateRoot } from "react-dom/client";
import type { Locales } from "remix-utils";

import { LocaleProvider } from "~/utils";

const locales = window.navigator.languages as Locales;
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
document.cookie = `timeZone=${timeZone}; path=/; max-age=${
  60 * 60 * 24 * 365
}; secure; samesite=lax`;

function hydrate() {
  React.startTransition(() => {
    hydrateRoot(
      document,
      <React.StrictMode>
        <LocaleProvider locales={locales} timeZone={timeZone}>
          <RemixBrowser />
        </LocaleProvider>
      </React.StrictMode>
    );
  });
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate);
} else {
  window.setTimeout(hydrate, 1);
}

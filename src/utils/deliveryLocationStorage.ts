import { canStorePreferences } from "./privacyPreferences";

const PREFERRED_LOCATION_KEY = "aca_preferred_dropoff_location";

export function getStoredDeliveryLocation() {
  try {
    const sessionValue = sessionStorage.getItem(PREFERRED_LOCATION_KEY);
    if (sessionValue) return sessionValue;
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }

  if (!canStorePreferences()) return null;

  try {
    return localStorage.getItem(PREFERRED_LOCATION_KEY);
  } catch {
    return null;
  }
}

export function storeDeliveryLocation(id: string) {
  const value = String(id || "").trim();
  if (!value) return;

  try {
    sessionStorage.setItem(PREFERRED_LOCATION_KEY, value);
  } catch {
    // The current page still keeps the selection in React state.
  }

  if (!canStorePreferences()) return;

  try {
    localStorage.setItem(PREFERRED_LOCATION_KEY, value);
  } catch {
    // The session value remains the fallback when persistent storage fails.
  }
}

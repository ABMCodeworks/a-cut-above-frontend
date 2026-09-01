export const PRIVACY_PREFERENCES_KEY = "aca_privacy_preferences";
export const PRIVACY_PREFERENCES_EVENT = "aca_privacy_preferences_changed";

export type PrivacyPreferences = {
  version: 1;
  preferences: boolean;
  decidedAt: string;
};

export function getPrivacyPreferences(): PrivacyPreferences | null {
  try {
    const raw = localStorage.getItem(PRIVACY_PREFERENCES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PrivacyPreferences>;
    if (parsed.version !== 1 || typeof parsed.preferences !== "boolean") {
      return null;
    }
    return parsed as PrivacyPreferences;
  } catch {
    return null;
  }
}

export function canStorePreferences() {
  return getPrivacyPreferences()?.preferences === true;
}

export function setPrivacyPreferences(preferences: boolean) {
  const value: PrivacyPreferences = {
    version: 1,
    preferences,
    decidedAt: new Date().toISOString(),
  };
  localStorage.setItem(PRIVACY_PREFERENCES_KEY, JSON.stringify(value));

  if (!preferences) {
    localStorage.removeItem("aca_theme");
    localStorage.removeItem("aca_theme_mode");
    localStorage.removeItem("aca_preferred_dropoff_location");
    document.documentElement.setAttribute("data-theme", "light");
  }

  window.dispatchEvent(
    new CustomEvent(PRIVACY_PREFERENCES_EVENT, { detail: value }),
  );
  return value;
}


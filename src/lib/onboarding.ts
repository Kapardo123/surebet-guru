const KEY = "gsb_onboarded";

/** First-run walkthrough not seen yet on this device. */
export const needsOnboarding = () => {
  try {
    return localStorage.getItem(KEY) !== "1";
  } catch {
    return false;
  }
};

export const markOnboarded = () => {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* storage unavailable */
  }
};

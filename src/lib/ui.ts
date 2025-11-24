export function ensureDialogClosed() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  try {
    // Dispatch Escape key as a courtesy; some dialog implementations
    // close on keyboard events.
    try {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    } catch (e) {
      // ignore
    }

    // Remove Radix Dialog overlays if still present
    const overlaySelectors = [
      "[data-radix-dialog-overlay]",
      ".chakra-modal__backdrop", // chakra/older class fallback
      ".react-aria-DialogBackdrop",
    ];

    overlaySelectors.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      els.forEach((el) => el.remove());
    });
  } catch (e) {
    // best-effort cleanup; do not throw
    // eslint-disable-next-line no-console
    console.warn("ensureDialogClosed failed:", e);
  }
}

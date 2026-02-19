import { type Variants } from 'framer-motion';

/**
 * GLOBAL_TRANSITION: "The Apple Spring"
 * The "Master Physics" for the whole app.
 */
export const GLOBAL_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 25,
} as const;

/**
 * MODAL_VARIANTS: Standard entrance for dialogs and popups.
 */
export const MODAL_VARIANTS: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: 20 },
};

/**
 * CARD_VARIANTS: Used for list items (Students, Lessons, etc.)
 */
export const CARD_VARIANTS: Variants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98 },
};

/**
 * TEXT_SWAP_VARIANTS: Used for smooth text transitions (e.g., Language Change)
 * Text flies in from bottom, flies out to top.
 */
export const TEXT_SWAP_VARIANTS: Variants = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -5, transition: { duration: 0.2 } },
};

/**
 * CONTENT_VARIANTS: For elements inside modals/cards (icons, inputs, text).
 * These use a smaller 'y' offset so they don't move too far.
 */
export const CONTENT_VARIANTS: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

/**
 * LIST_CONTAINER: Orchestrates staggered entrances.
 */
export const LIST_CONTAINER: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

/**
 * ERROR_ALERT_VARIANTS: Pop-in animation for validation errors
 */
export const ERROR_ALERT_VARIANTS: Variants = {
  initial: { opacity: 0, y: -10, height: 0, scale: 0.95 },
  animate: { opacity: 1, y: 0, height: "auto", scale: 1 },
  exit: { opacity: 0, y: -10, height: 0, scale: 0.95 }
};

/**
 * GLOBAL HELPER: Smoothly scrolls to a specific element.
 * Usage: Call this inside a useEffect when an error appears.
 */
export const smoothScrollTo = (ref: any) => {
  if (ref && ref.current) {
    // Small timeout ensures the DOM has expanded before scrolling
    setTimeout(() => {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
};
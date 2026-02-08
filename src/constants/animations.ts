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
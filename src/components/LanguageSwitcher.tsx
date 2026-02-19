import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface LanguageSwitcherProps {
  isMobile?: boolean;
}

export function LanguageSwitcher({ isMobile = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  const displayChar = i18n.language === 'en' ? '中' : 'A';

  if (isMobile) {
    return (
      <button 
        onClick={toggleLanguage} 
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold transition-colors text-textGrey hover:bg-white/10"
      >
        <span className="w-5 text-center text-lg font-bold">{displayChar}</span>
        <span>{i18n.language === 'en' ? '繁體中文' : 'English'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      /* [FIX] Removed 'w-9 h-9'. Now relies on padding + content size to match adjacent buttons. */
      className="p-1.5 sm:p-2 flex items-center justify-center rounded-lg text-textGrey hover:text-white hover:bg-white/10 transition-colors group relative overflow-hidden"
      title={i18n.language === 'en' ? 'Switch to Chinese' : '切換至英文'}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={displayChar}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 1.5, opacity: 1 }} 
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          /* [FIX] Added 'w-[18px]' to mimic the 18px width of Lucide icons exactly */
          className="inline-block text-[18px] font-semibold leading-none select-none w-[18px] text-center"
        >
          {displayChar}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
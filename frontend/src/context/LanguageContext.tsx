import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultText?: string) => string;
}

const resources = {
  en: {
    translation: {
      appName: 'PramaanSetu',
      appSubtitle: 'Border & Verification Screening Console',
      navDashboard: 'Dashboard',
      navNewScan: 'New Scan',
      navHistory: 'Scan History',
      lowRisk: 'Low risk',
      mediumRisk: 'Medium risk',
      highRisk: 'High risk',
      officerClear: 'Clear / Approve',
      officerReview: 'Flag for Review',
      officerEscalate: 'Escalate Incident',
      docTypePassport: 'Passport',
      docTypeAadhaar: 'Aadhaar',
      docTypePan: 'PAN Card',
      reportLabel: 'Audit Narrative Report',
      evidenceLabel: 'Forensic Evidence & Metadata',
      authenticityTitle: 'Document Authenticity & Integrity',
      identityRiskTitle: 'Identity & Registry Clearance',
    },
  },
  hi: {
    translation: {
      appName: 'प्रमाणसेतु',
      appSubtitle: 'सीमा एवं सत्यापन स्क्रीनिंग कंसोल',
      navDashboard: 'डैशबोर्ड',
      navNewScan: 'नया स्कैन',
      navHistory: 'स्कैन इतिहास',
      lowRisk: 'कम जोखिम',
      mediumRisk: 'मध्यम जोखिम',
      highRisk: 'उच्च जोखिम',
      officerClear: 'मंजूर करें (Clear)',
      officerReview: 'समीक्षा हेतु चिन्हित करें',
      officerEscalate: 'उच्च अधिकारी को अग्रेषित करें',
      docTypePassport: 'पासपोर्ट',
      docTypeAadhaar: 'आधार',
      docTypePan: 'पैन कार्ड',
      reportLabel: 'ऑडिट विवरण रिपोर्ट',
      evidenceLabel: 'फोरेंसिक साक्ष्य एवं मेटाडेटा',
      authenticityTitle: 'दस्तावेज़ प्रामाणिकता एवं अखंडता',
      identityRiskTitle: 'पहचान एवं डेटाबेस निकासी',
    },
  },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'hi' : 'en';
    setLanguage(nextLang);
  };

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  const t = (key: string, defaultText?: string) => {
    return i18n.t(key, defaultText || key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

import React from 'react';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { LandingHero } from '../components/landing/LandingHero';
import { InteractiveVerificationDemo } from '../components/landing/InteractiveVerificationDemo';
import { LandingFeatures } from '../components/landing/LandingFeatures';
import { ComplianceSection } from '../components/landing/ComplianceSection';
import { ApiSandboxSection } from '../components/landing/ApiSandboxSection';
import { LandingFooter } from '../components/landing/LandingFooter';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col selection:bg-stone-300 dark:selection:bg-stone-700">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <InteractiveVerificationDemo />
        <LandingFeatures />
        <ComplianceSection />
        <ApiSandboxSection />
      </main>
      <LandingFooter />
    </div>
  );
};

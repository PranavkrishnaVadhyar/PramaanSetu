import React from 'react';
import { Outlet } from 'react-router-dom';
import { ConsoleSidebar } from './ConsoleSidebar';
import { ConsoleTopBar } from './ConsoleTopBar';

export const ConsoleShell: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-bg text-text-primary">
      {/* Fixed/Sticky Navigation Sidebar */}
      <ConsoleSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ConsoleTopBar />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

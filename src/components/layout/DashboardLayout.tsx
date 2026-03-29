import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';
import NotificationBell from '@/components/NotificationBell';

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
            <SidebarTrigger className="ml-3" />
            <div className="mr-3 flex items-center gap-1">
              <NotificationBell />
              <PushNotificationPrompt />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;

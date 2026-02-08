import { ReactNode } from 'react';
import { AuthHeader } from './AuthHeader';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AuthHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-20 sm:py-24">
        <div className="w-full max-w-md animate-fade-in">
          {children}
        </div>
      </main>
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-accent/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-3xl" />
      </div>
    </div>
  );
}

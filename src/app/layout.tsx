import { Nunito_Sans } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/components/context/SidebarContext';
import { ThemeProvider } from '@/components/context/ThemeContext';
import { UserProvider } from '@/components/context/UserContext';
import { Toaster } from "@/components/ui/sonner";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: '--font-nunito-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata = {
  title: 'Alleato AI - Business Intelligence Platform',
  description: 'AI-powered business assistant with admin dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunitoSans.className} ${nunitoSans.variable} dark:bg-gray-900`}>
        <ThemeProvider>
          <UserProvider>
            <SidebarProvider>
              {children}
              <Toaster />
            </SidebarProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
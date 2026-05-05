import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell';
import { QueryProvider } from '@/components/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'আগুন রাইডার্স ট্যুর খরচ',
  description: 'ট্যুর খরচ, লোন, ফুয়েল এবং সেটেলমেন্ট ম্যানেজমেন্ট',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}

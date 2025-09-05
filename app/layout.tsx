import React from 'react';
// FIX: Changed from 'import type' to 'import' to resolve module resolution error.
import { Metadata } from 'next';
import { Inter, Source_Code_Pro } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  variable: '--font-source-code-pro',
});

export const metadata: Metadata = {
  title: 'Semantic Interlinker 25',
  description: 'Suggerimenti di Link Interni basati su AI per WordPress',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={`${inter.variable} ${sourceCodePro.variable}`}>
      <body>{children}</body>
    </html>
  );
}
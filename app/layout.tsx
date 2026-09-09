"use client"

import '@mantine/core/styles.css';
import { RDKitProvider } from "../context/RDKitContext";
import { PyodideProvider } from "../context/PyodideContext";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { TargetProvider } from "../context/TargetContext";
import { LigandProvider } from "../context/LigandContext";
import { NotificationContextProvider } from '../context/NotificationContext';
import { GAContextProvider } from '../context/GAContext';
import PwaInstallPrompt from '../components/ui-comps/PwaInstallPrompt';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <title>QSAR In The Browser</title>
        <link rel="shortcut icon" href="favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1a1b1e" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="QITB" />
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider defaultColorScheme="dark">
          <RDKitProvider>
            <PyodideProvider>
              <TargetProvider>
                <LigandProvider>
                  <NotificationContextProvider>
                  <GAContextProvider>
                  {children}
                  <PwaInstallPrompt />
                  </GAContextProvider>
                  </NotificationContextProvider>
                </LigandProvider>
              </TargetProvider>
            </PyodideProvider>
          </RDKitProvider>
        </MantineProvider>
      </body>
    </html>
  )
}

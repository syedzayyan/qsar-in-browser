"use client"

import '@mantine/core/styles.css';
import { RDKitProvider } from "../context/RDKitContext";
import { PyodideProvider } from "../context/PyodideContext";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';


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
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider defaultColorScheme="dark">
          <RDKitProvider>
            <PyodideProvider>
              {children}
            </PyodideProvider>
          </RDKitProvider>
        </MantineProvider>
      </body>
    </html>
  )
}

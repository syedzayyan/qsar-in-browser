'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

import {
  Container,
  Flex,
  Group,
  Text,
  Anchor,
  ActionIcon,
  Paper,
  Title,
  useMantineColorScheme,
  Divider,
  Box,
  TypographyStylesProvider,
  Code,
} from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import Link from 'next/link';

// your README import (as in your example)
import AboutSection from '../../README.md';

export default function AboutPage() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <>
      {/* Header */}
      <Container size="lg" py="md">
        <Flex align="center" justify="space-between">
          <Group>
            <Text size="lg" fw={700}>
              <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                QSAR IN THE BROWSER
              </Link>
            </Text>

            <Anchor component={Link} href="/" size="sm" c="dimmed" underline="hover">
              Home
            </Anchor>
          </Group>

          <ActionIcon
            onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
            variant="default"
            size="lg"
            radius="md"
            aria-label="Toggle color scheme"
            title="Toggle light / dark"
          >
            {isDark ? <IconSun stroke={1.5} /> : <IconMoon stroke={1.5} />}
          </ActionIcon>
        </Flex>
      </Container>

      {/* Body */}
      <Container size="lg" py="xl">
        <Paper shadow="sm" radius="md" p="lg" withBorder>
          <Flex direction="column" gap="md">
            <Title order={2}>About</Title>
            <Divider />

            <Box
              sx={(theme) => ({
                // small niceties for max width and comfortable reading
                maxWidth: 1000,
                margin: '0 auto',
                width: '100%',
              })}
            >
              {/* Keep typography styles so raw markdown HTML renders nicely */}
              <TypographyStylesProvider>
                <ReactMarkdown
                  // allow GitHub-flavored markdown (tables, task lists)
                  remarkPlugins={[remarkGfm]}
                  // allow raw HTML inside markdown
                  rehypePlugins={[rehypeRaw]}
                  // map common markdown nodes to Mantine-friendly elements
                  components={{
                    h1: ({ node, ...props }) => <Title order={1} {...props} />,
                    h2: ({ node, ...props }) => <Title order={2} {...props} />,
                    h3: ({ node, ...props }) => <Title order={3} {...props} />,
                    p: ({ node, ...props }) => <Text size="md" mb="sm" {...props} />,
                    a: ({ node, href, children, ...props }) => (
                      <Anchor href={href} target={href?.startsWith('#') ? undefined : '_blank'} rel="noopener noreferrer" {...props}>
                        {children}
                      </Anchor>
                    ),
                    ul: ({ node, ...props }) => <Box component="ul" style={{ paddingLeft: 20 }} {...props} />,
                    ol: ({ node, ...props }) => <Box component="ol" style={{ paddingLeft: 20 }} {...props} />,
                    li: ({ node, ...props }) => <Box component="li" style={{ marginBottom: 6 }} {...props} />,
                    blockquote: ({ node, ...props }) => (
                      <Paper radius="sm" p="sm" withBorder sx={{ backgroundColor: isDark ? undefined : '#f7fafc' }}>
                        <Text c="dimmed" italic {...props} />
                      </Paper>
                    ),
                    code({ inline, className, children, ...props }) {
                      // simple code styling: inline Code vs block Code
                      if (inline) {
                        return <Code {...props}>{children}</Code>;
                      }
                      return (
                        <Paper withBorder radius="sm" p="sm" sx={{ overflowX: 'auto' }}>
                          <Code block>{String(children).replace(/\n$/, '')}</Code>
                        </Paper>
                      );
                    },
                    img: ({ node, src, alt, ...props }) => (
                      // responsive images inside markdown
                      // use native img to keep things simple
                      // Mantine Image component is also an option
                      // ensure width doesn't overflow
                      // note: next/image could be used, but this is simple and reliable for README images
                      // keep alt text for accessibility
                      <img
                        src={String(src)}
                        alt={String(alt ?? '')}
                        style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '12px 0' }}
                        {...props}
                      />
                    ),
                  }}
                >
                  {String(AboutSection)}
                </ReactMarkdown>
              </TypographyStylesProvider>
            </Box>
          </Flex>
        </Paper>
      </Container>
    </>
  );
}

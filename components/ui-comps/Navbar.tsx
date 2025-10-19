'use client';

import { ActionIcon, Group, Text, useMantineColorScheme, Container, Anchor, Flex } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import Link from 'next/link';

export default function Navbar() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <Container size="lg" py="md">
      <Flex align="center" justify="space-between">
        {/* Left: Title and About link */}
        <Group gap="md">
          <Text size="lg" fw={600}>
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              QSAR IN THE BROWSER
            </Link>
          </Text>
        </Group>
        <Group gap="md">&nbsp;&nbsp;&nbsp;</Group>
        <ActionIcon
          onClick={() => setColorScheme(colorScheme === 'light' ? 'dark' : 'light')}
          variant="default"
          size="lg"
          radius="md"
          aria-label="Toggle color scheme"
        >
          {colorScheme === 'dark' ? <IconSun stroke={1.5} /> : <IconMoon stroke={1.5} />}
        </ActionIcon>
      </Flex>
    </Container>
  );
}

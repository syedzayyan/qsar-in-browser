"use client";

import {
  Button,
  Container,
  Stack,
  Title,
  Text,
  Image,
  Group,
  Center,
  Flex,
  Anchor,
  ActionIcon,
} from "@mantine/core";
import { useRouter } from "next/navigation";
import { IconMoon, IconSun } from "@tabler/icons-react";
import Link from "next/link";
import { useMantineColorScheme } from "@mantine/core";

export default function IndexPage() {
  const router = useRouter();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <>
      {/* Navbar */}
      <Container size="lg" py="md">
        <Flex align="center" justify="space-between">
          {/* Left: Title */}
          <Text size="lg" fw={600}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              QSAR IN THE BROWSER
            </Link>
          </Text>

          {/* Right: About link and theme button */}
          <Group gap="sm">
            <Anchor
              component={Link}
              href="/about"
              size="sm"
              underline="hover"
              c="dimmed"
            >
              About
            </Anchor>

            <Anchor
              component={Link}
              href="https://github.com/syedzayyan/qsar-in-browser"
              size="sm"
              underline="hover"
              c="dimmed"
            >
              GitHub
            </Anchor>
            <Anchor
              component={Link}
              href="/misc_tools"
              size="sm"
              underline="hover"
              c="dimmed"
            >
              Misc Tools
            </Anchor>
            <ActionIcon
              onClick={() =>
                setColorScheme(colorScheme === "light" ? "dark" : "light")
              }
              variant="default"
              size="lg"
              radius="md"
              aria-label="Toggle color scheme"
            >
              {colorScheme === "dark" ? (
                <IconSun stroke={1.5} />
              ) : (
                <IconMoon stroke={1.5} />
              )}
            </ActionIcon>
          </Group>
        </Flex>
      </Container>

      {/* Hero Section */}
      <Container size="lg" py="xl">
        <Stack align="center" mt="6rem">
          <Image src="/logo.svg" alt="Logo" maw={180} radius="md" />
          <Title ta="center" order={1} size="h2" fw={700}>
            Cheminformatics in Your Browser — Without Writing Code!
          </Title>

          <Text ta="center" size="lg" c="dimmed" maw={800}>
            QITB simplifies the world of chemistry and data analysis. Easily
            upload chemical data or fetch it from trusted resources. Explore
            molecular structures, analyze them, and run ML models directly in
            your browser — no setup, no coding.
            <br />
            <br />
            <Text span fw={600} c="blue">
              It’s open source, secure, and built for scientists who want speed
              and simplicity.
            </Text>
          </Text>

          <Button
            size="xl"
            radius="xl"
            variant="gradient"
            gradient={{ from: "blue", to: "teal" }}
            onClick={() => router.push("/tools/load_data")}
          >
            Start Here 🚀
          </Button>
        </Stack>

        {/* Preview Section */}
        <Center mt="5rem">
          <Image
            src="/layout.png"
            alt="App layout preview"
            radius="lg"
            fit="contain"
            w="100%"
            maw={1000}
          />
        </Center>
      </Container>
    </>
  );
}

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
            {/* <Anchor
              component={Link}
              href="/misc_tools"
              size="sm"
              underline="hover"
              c="dimmed"
            >
              Misc Tools
            </Anchor> */}
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
            QSAR in the browser
          </Title>

          <Text ta="center" size="lg" c="dimmed" maw={800}>
            QSAR in the Browser (QITB) is a browser-based platform that 
            makes small molecule data accessible to students, analysts and researchers. 
            <br />
            <br />
            You can get started quickly using small molecule data from the online, manually-curated 
            ChEMBL database. Alternatively, you can upload your own datasets completely privately, as all calculations remain local to your machine.
            
            <br />
            <br />
            <Text span fw={600} c="blue">
              Free, open-source, secure and simple.
            </Text>
          </Text>

          <Button
            size="xl"
            radius="xl"
            variant="gradient"
            gradient={{ from: "blue", to: "teal" }}
            onClick={() => router.push("/tools/load_data")}
          >
            Get Started 🚀
          </Button>
        </Stack>

        {/* Preview Section */}
        {/* <Center mt="5rem">
          <Image
            src="/layout.png"
            alt="App layout preview"
            radius="lg"
            fit="contain"
            w="100%"
            maw={1000}
          />
        </Center> */}
      </Container>
    </>
  );
}

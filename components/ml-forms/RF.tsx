"use client"

import { useForm } from "@mantine/form"
import { TextInput, Select, Button, Paper, Title, Text, Stack } from "@mantine/core"

type RFModelInputs = {
  n_estimators: number
  criterion: string
  max_features: string
  n_jobs: number
  model: number
}

export default function RF({ onSubmit }: { onSubmit: (data: RFModelInputs) => void }) {
  const form = useForm<RFModelInputs>({
    initialValues: {
      n_estimators: 120,
      criterion: "squared_error",
      max_features: "sqrt",
      n_jobs: 2,
      model: 1,
    },

    validate: {
      n_estimators: (value) => (value <= 0 ? "Must be > 0" : null),
      criterion: (value) => (value ? null : "Required"),
      max_features: (value) => (value ? null : "Required"),
      n_jobs: (value) => (value <= 0 ? "Must be > 0" : null),
    },
  })

  return (
    <Paper
      shadow="md"
      radius="lg"
      p="xl"
      withBorder
      style={{
        maxWidth: 480,
        margin: "2rem auto",
        backgroundColor: "var(--mantine-color-body)",
      }}
    >
      <Title order={3} ta="center" mb="sm">
        🌲 Random Forest Config
      </Title>

      <Text c="dimmed" size="sm" mb="lg" ta="center">
        Configure your <b>Scikit-Learn RandomForestRegressor</b> parameters below.
      </Text>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack>
          <TextInput
            label="Number of Estimators"
            placeholder="e.g. 120"
            type="number"
            {...form.getInputProps("n_estimators")}
          />

          <Select
            label="Criterion"
            placeholder="Select criterion"
            data={["squared_error", "absolute_error", "friedman_mse", "poisson"]}
            {...form.getInputProps("criterion")}
          />

          <Select
            label="Maximum Features"
            placeholder="Select feature limit"
            data={["sqrt", "log2", "None"]}
            {...form.getInputProps("max_features")}
          />

          <TextInput
            label="Number of CPUs"
            placeholder="e.g. 2"
            type="number"
            {...form.getInputProps("n_jobs")}
          />

          <Button
            type="submit"
            radius="xl"
            size="md"
            mt="md"
            fullWidth
            variant="gradient"
            gradient={{ from: "teal", to: "lime", deg: 105 }}
          >
            Train & Test RF Model
          </Button>
        </Stack>
      </form>
    </Paper>
  )
}

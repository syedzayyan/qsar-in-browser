"use client"

import { useForm } from "react-hook-form"
import { TextInput, Select, Button, Paper, Title, Text, Stack } from "@mantine/core"

type RFModelInputs = {
  n_estimators: number
  criterion: string
  max_features: string
  n_jobs: number
}

export default function RF({ onSubmit }: { onSubmit: (data: RFModelInputs) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RFModelInputs>()

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

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack>
          <TextInput
            label="Number of Estimators"
            placeholder="e.g. 120"
            type="number"
            defaultValue={120}
            error={errors.n_estimators && "Required"}
            {...register("n_estimators", { required: true })}
          />

          <Select
            label="Criterion"
            placeholder="Select criterion"
            data={[
              { value: "squared_error", label: "squared_error" },
              { value: "absolute_error", label: "absolute_error" },
              { value: "friedman_mse", label: "friedman_mse" },
              { value: "poisson", label: "poisson" },
            ]}
            defaultValue="squared_error"
            error={errors.criterion && "Required"}
            {...register("criterion", { required: true })}
          />

          <Select
            label="Maximum Features"
            placeholder="Select feature limit"
            data={[
              { value: "sqrt", label: "sqrt" },
              { value: "log2", label: "log2" },
              { value: "None", label: "None" },
            ]}
            defaultValue="sqrt"
            error={errors.max_features && "Required"}
            {...register("max_features", { required: true })}
          />

          <TextInput
            label="Number of CPUs"
            placeholder="e.g. 2"
            type="number"
            defaultValue={2}
            error={errors.n_jobs && "Required"}
            {...register("n_jobs", { required: true })}
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

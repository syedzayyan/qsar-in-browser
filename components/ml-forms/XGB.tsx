"use client"

import { useForm } from "react-hook-form"
import { TextInput, Button, Paper, Title, Text, Stack } from "@mantine/core"

type XGBoostModelInputs = {
  max_depth: number
  min_child_weight: number
  subsample: number
  colsample_bytree: number
  learning_rate: number
  n_jobs: number
  model: number
}

export default function XGB({ onSubmit }: { onSubmit: (data: XGBoostModelInputs) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<XGBoostModelInputs>({
    defaultValues: {
      model: 3,
      max_depth: 8,
      min_child_weight: 7,
      subsample: 1,
      colsample_bytree: 1,
      learning_rate: 0.15,
      n_jobs: 2,
    },
  })

  return (
    <Paper
      shadow="md"
      radius="lg"
      p="xl"
      withBorder
      style={{ maxWidth: 520, margin: "2rem auto", backgroundColor: "var(--mantine-color-body)" }}
    >
      <Title order={4} ta="center" mb="xs">
        ⚡ XGBoost Model Config
      </Title>

      <Text c="dimmed" size="sm" mb="lg" ta="center">
        This uses the Python <b>XGBoost</b> library. Tweak parameters below before training.
      </Text>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack>
          <TextInput
            label="Learning rate (eta)"
            placeholder="e.g. 0.15"
            type="number"
            step="0.01"
            defaultValue={0.15}
            error={errors.learning_rate && "Required"}
            {...register("learning_rate", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="Maximum depth"
            placeholder="e.g. 8"
            type="number"
            step="1"
            defaultValue={8}
            error={errors.max_depth && "Required"}
            {...register("max_depth", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="Minimum child weight"
            placeholder="e.g. 7"
            type="number"
            step="1"
            defaultValue={7}
            error={errors.min_child_weight && "Required"}
            {...register("min_child_weight", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="Subsample"
            description="Fraction of observations to sample (0-1)"
            placeholder="e.g. 1.0"
            type="number"
            step="0.01"
            defaultValue={1}
            error={errors.subsample && "Required"}
            {...register("subsample", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="colsample_bytree"
            description="Fraction of features to sample per tree (0-1)"
            placeholder="e.g. 1.0"
            type="number"
            step="0.01"
            defaultValue={1}
            error={errors.colsample_bytree && "Required"}
            {...register("colsample_bytree", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="Number of CPUs"
            placeholder="e.g. 2"
            type="number"
            step="1"
            defaultValue={2}
            error={errors.n_jobs && "Required"}
            {...register("n_jobs", { required: true, valueAsNumber: true })}
          />

          <Button
            type="submit"
            radius="xl"
            size="md"
            mt="sm"
            fullWidth
            variant="gradient"
            gradient={{ from: "violet", to: "indigo", deg: 105 }}
          >
            Train & Test XGBoost Model
          </Button>
        </Stack>
      </form>
    </Paper>
  )
}

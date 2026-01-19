"use client"

import { useForm } from "react-hook-form"
import { TextInput, Button, Paper, Title, Text, Stack } from "@mantine/core"
import { useEffect } from "react"

type XGBoostModelInputs = {
  max_depth: number
  min_child_weight: number
  subsample: number
  colsample_bytree: number
  learning_rate: number
  n_jobs: number
  model: number
}

export default function XGB({
  onSubmit,
  taskType
}: {
  onSubmit: (data: XGBoostModelInputs) => void
  taskType: "regression" | "classification"
}) {

  const isClassification = taskType === "classification"

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<XGBoostModelInputs>({
    defaultValues: {
      model: isClassification ? 4 : 3,
      max_depth: 8,
      min_child_weight: 7,
      subsample: 1,
      colsample_bytree: 1,
      learning_rate: 0.15,
      n_jobs: 2,
    },
  })
  useEffect(() => {
    reset({
      max_depth: 8,
      min_child_weight: 7,
      subsample: 1,
      colsample_bytree: 1,
      learning_rate: 0.15,
      n_jobs: 2,
      model: taskType === "classification" ? 4 : 3,
    });
  }, [taskType]);

  return (
    <Paper
      shadow="md"
      radius="lg"
      p="xl"
      withBorder
      style={{ maxWidth: 520, margin: "2rem auto" }}
    >
      <Title order={4} ta="center" mb="xs">
        ⚡ XGBoost {isClassification ? "Classifier" : "Regressor"}
      </Title>

      <Text c="dimmed" size="sm" mb="lg" ta="center">
        Uses the Python <b>XGBoost</b> library.
      </Text>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack>

          <TextInput
            label="Learning rate"
            type="number"
            step="0.01"
            {...register("learning_rate", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="Maximum depth"
            type="number"
            {...register("max_depth", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="Minimum child weight"
            type="number"
            {...register("min_child_weight", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="Subsample"
            type="number"
            step="0.01"
            {...register("subsample", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="colsample_bytree"
            type="number"
            step="0.01"
            {...register("colsample_bytree", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="Number of CPUs"
            type="number"
            {...register("n_jobs", { required: true, valueAsNumber: true })}
          />

          <Button
            type="submit"
            radius="xl"
            fullWidth
            variant="gradient"
            gradient={{ from: "violet", to: "indigo" }}
          >
            Train & Test XGBoost
          </Button>
        </Stack>
      </form>
    </Paper>
  )
}

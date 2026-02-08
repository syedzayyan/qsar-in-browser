"use client"

import { useForm } from "@mantine/form"
import { TextInput, Select, Button, Paper, Title, Text, Stack } from "@mantine/core"
import { useContext, useEffect } from "react"
import NotificationContext from "../../context/NotificationContext"

type RFModelInputs = {
  n_estimators: number
  criterion: string
  max_features: string
  n_jobs: number
  model: number
}

export default function RF({
  onSubmit,
  taskType
}: {
  onSubmit: (data: RFModelInputs) => void
  taskType: "regression" | "classification"
}) {

  const isClassification = taskType === "classification"

  const form = useForm<RFModelInputs>({
    initialValues: {
      n_estimators: 120,
      criterion: taskType === "classification" ? "gini" : "squared_error",
      max_features: "sqrt",
      n_jobs: 2,
      model: taskType === "classification" ? 2 : 1,
    },
  });
  useEffect(() => {
    form.setValues({
      n_estimators: 120,
      criterion: taskType === "classification" ? "gini" : "squared_error",
      max_features: "sqrt",
      n_jobs: 2,
      model: taskType === "classification" ? 2 : 1,
    });
  }, [taskType]);
  // -----------------------
  // Criterion options
  // -----------------------
  const regressionCriteria = [
    "squared_error",
    "absolute_error",
    "friedman_mse",
    "poisson",
  ]

  const classificationCriteria = [
    "gini",
    "entropy",
    "log_loss",
  ]

  const { notifications } = useContext(NotificationContext);
  const isRunning = notifications.some((n) => n.message.startsWith("machine_learning") && !n.done);

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
        🌲 Random Forest {isClassification ? "Classifier" : "Regressor"}
      </Title>

      <Text c="dimmed" size="sm" mb="lg" ta="center">
        Configure your{" "}
        <b>
          Scikit-Learn RandomForest
          {isClassification ? "Classifier" : "Regressor"}
        </b>{" "}
        parameters below.
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
            data={isClassification ? classificationCriteria : regressionCriteria}
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
            disabled={isRunning}
          >
            {isRunning ? "Training in Progress..." : "Train & Test RF"}
          </Button>
        </Stack>
      </form>
    </Paper>
  )
}

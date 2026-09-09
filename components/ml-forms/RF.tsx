"use client"

import { useForm } from "@mantine/form"
import { TextInput, Select, Button, Paper, Title, Text, Stack, Switch, NumberInput } from "@mantine/core"
import { useContext, useEffect } from "react"
import NotificationContext from "../../context/NotificationContext"

type RFModelInputs = {
  n_estimators: number
  criterion: string
  max_features: string
  n_jobs: number
  model: number
  use_random_search: boolean
  n_iter: number
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
      use_random_search: false,
      n_iter: 20,
    },
  });
  useEffect(() => {
    form.setValues({
      n_estimators: 120,
      criterion: taskType === "classification" ? "gini" : "squared_error",
      max_features: "sqrt",
      n_jobs: 2,
      model: taskType === "classification" ? 2 : 1,
      use_random_search: form.values.use_random_search,
      n_iter: form.values.n_iter,
    });
  }, [taskType]);

  const useRandomSearch = form.values.use_random_search;

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
          <Switch
            label="Use Randomized Search (auto-tune hyperparameters)"
            description="Instead of the fixed values below, samples random combinations of tree count, depth, feature limit etc. and keeps the best-scoring one. Slower, but usually finds a better model than guessing manually."
            {...form.getInputProps("use_random_search", { type: "checkbox" })}
          />

          {useRandomSearch && (
            <NumberInput
              label="Search Iterations"
              description="How many random parameter combinations to try. More iterations can find a better model but take longer - 15-30 is a reasonable range."
              min={5}
              max={100}
              {...form.getInputProps("n_iter")}
            />
          )}

          <TextInput
            label="Number of Trees"
            description="The total number of decision trees in the forest. More trees yield more reliable, consensus-based predictions but increase training time. 100–200 is a safe starting point."
            placeholder="e.g. 120"
            type="number"
            disabled={useRandomSearch}
            {...form.getInputProps("n_estimators")}
          />

          <Select
            label="Split Criterion"
            description={
              isClassification
                ? "The rule used to find the molecular property that best separates active from inactive compounds. 'Gini' is a reliable default."
                : "The rule used to find the molecular property that best explains the activity values. 'Squared error' is a reliable default."
            }
            placeholder="Select criterion"
            data={isClassification ? classificationCriteria : regressionCriteria}
            disabled={useRandomSearch}
            {...form.getInputProps("criterion")}
          />

          <Select
            label="Max Features per Split"
            description="The random subset of molecular features evaluated at each split. This forces trees to differ, making the overall model more robust. 'sqrt' is the recommended default."
            placeholder="Select feature limit"
            data={["sqrt", "log2", "None"]}
            disabled={useRandomSearch}
            {...form.getInputProps("max_features")}
          />

          <TextInput
            label="Number of CPUs"
            description="The number of processor cores used during training. A higher number speeds up the process."
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

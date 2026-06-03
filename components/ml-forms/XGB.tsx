"use client"

import { useForm } from "react-hook-form"
import { TextInput, Button, Paper, Title, Text, Stack } from "@mantine/core"
import { useContext, useEffect } from "react"
import NotificationContext from "../../context/NotificationContext"

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

  const { notifications } = useContext(NotificationContext);
  const isRunning = notifications.some((n) => n.message.startsWith("machine_learning") && !n.done);

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
        Configure your <b>XGBoost</b> model parameters below.
      </Text>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack>

          <TextInput
            label="Learning Rate"
            description="Controls how much the model adjusts itself after each round of learning. A smaller value (e.g. 0.05) means the model learns slowly and carefully — often more accurate but takes more rounds. A larger value (e.g. 0.3) learns faster but may miss the best answer. 0.1–0.2 is a good starting point."
            type="number"
            step="0.01"
            {...register("learning_rate", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="Maximum Tree Depth"
            description="How many levels deep each internal decision tree is allowed to grow. Deeper trees can capture more complex relationships between molecular features and activity, but risk memorising the training data (overfitting). Values between 4 and 10 are typical."
            type="number"
            {...register("max_depth", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="Minimum Child Weight"
            description="The minimum number of molecules that must land in a branch for it to be kept. Higher values make the model more conservative and less likely to overfit on small groups of molecules. Increase this if your dataset is small."
            type="number"
            {...register("min_child_weight", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="Subsample Ratio"
            description="The fraction of molecules randomly selected to train each tree (between 0 and 1). Using less than all molecules (e.g. 0.8) introduces healthy variety between trees and can prevent overfitting. Set to 1 to use the full dataset every time."
            type="number"
            step="0.01"
            {...register("subsample", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="Feature Sample per Tree"
            description="The fraction of molecular features (fingerprint bits) randomly chosen for each tree (between 0 and 1). Similar to subsample, using a subset (e.g. 0.8) encourages the trees to learn from different parts of the molecule, improving generalisation."
            type="number"
            step="0.01"
            {...register("colsample_bytree", { required: true, valueAsNumber: true })}
          />

          <TextInput
            label="Number of CPUs"
            description="How many processor cores your computer uses at once during training. A higher number speeds things up. Set to -1 to automatically use all available cores."
            type="number"
            {...register("n_jobs", { required: true, valueAsNumber: true })}
          />

          <Button
            type="submit"
            radius="xl"
            fullWidth
            variant="gradient"
            gradient={{ from: "violet", to: "indigo" }}
            disabled={isRunning}
          >
            {isRunning ? "Training in Progress..." : "Train & Test XGBoost"}
          </Button>
        </Stack>
      </form>
    </Paper>
  )
}

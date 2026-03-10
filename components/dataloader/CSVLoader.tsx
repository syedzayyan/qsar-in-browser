import { Dispatch, SetStateAction, useState } from "react";
import { useCSVReader, lightenDarkenColor, formatFileSize } from "react-papaparse";
import { useForm, SubmitHandler } from "react-hook-form";
import convertToJSON from "../utils/arrayToJson";
import {
  Button,
  Select,
  Stack,
  Text,
  Group,
  Paper,
  NumberInput,
  Radio,
  Modal,
  Badge,
  Divider,
  Alert,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconUpload, IconX, IconAlertCircle, IconFileTypeCsv } from "@tabler/icons-react";

const DEFAULT_REMOVE_HOVER_COLOR = "#A01919";
const REMOVE_HOVER_COLOR_LIGHT = lightenDarkenColor(DEFAULT_REMOVE_HOVER_COLOR, 40);

export type Inputs = {
  id_column: string;
  smi_column: string;
  act_column?: string;
};

interface Props {
  callofScreenFunction: SubmitHandler<Inputs>;
  csvSetter: Dispatch<SetStateAction<Record<string, any>[]>>;
  act_col?: boolean;
}

const CSVLoader: React.FC<Props> = ({ callofScreenFunction, csvSetter, act_col }) => {
  const { CSVReader } = useCSVReader();
  const [zoneHover, setZoneHover] = useState(false);
  const [removeHoverColor, setRemoveHoverColor] = useState(DEFAULT_REMOVE_HOVER_COLOR);
  const [headers, setHeader] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, any>[]>([]);

  // Null handling state
  const [nullModalOpened, { open: openNullModal, close: closeNullModal }] = useDisclosure(false);
  const [nullCount, setNullCount] = useState(0);
  const [nullStrategy, setNullStrategy] = useState<"remove" | "fill">("fill");
  const [fillValue, setFillValue] = useState<number>(0);
  const [pendingSubmitData, setPendingSubmitData] = useState<Inputs | null>(null);
  const [selectedActCol, setSelectedActCol] = useState<string>("");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Inputs>();

  const watchedId = watch("id_column");
  const watchedSmi = watch("smi_column");
  const watchedAct = watch("act_column");

  const headerOptions = headers.map((h) => ({ value: h, label: h }));

  const countNullsInColumn = (data: Record<string, any>[], col: string): number => {
    return data.filter((row) => {
      const val = row[col];
      return val === null || val === undefined || val === "" || val !== val; // NaN check
    }).length;
  };

  const applyNullStrategy = (
    data: Record<string, any>[],
    col: string,
    strategy: "remove" | "fill",
    fill: number
  ): Record<string, any>[] => {
    if (strategy === "remove") {
      return data.filter((row) => {
        const val = row[col];
        return val !== null && val !== undefined && val !== "" && val === val;
      });
    } else {
      return data.map((row) => {
        const val = row[col];
        if (val === null || val === undefined || val === "" || val !== val) {
          return { ...row, [col]: fill };
        }
        return row;
      });
    }
  };

  const onFormSubmit: SubmitHandler<Inputs> = (formData) => {
    // Only check nulls if act_col is enabled
    if (act_col !== false && formData.act_column) {
      const nulls = countNullsInColumn(csvData, formData.act_column);
      if (nulls > 0) {
        setNullCount(nulls);
        setSelectedActCol(formData.act_column);
        setPendingSubmitData(formData);
        openNullModal();
        return;
      }
    }
    callofScreenFunction(formData);
  };

  const handleNullConfirm = () => {
    if (!pendingSubmitData) return;
    const cleaned = applyNullStrategy(csvData, selectedActCol, nullStrategy, fillValue);
    csvSetter(cleaned);
    closeNullModal();
    callofScreenFunction(pendingSubmitData);
  };

  return (
    <>
      <CSVReader
        onUploadAccepted={(results: any) => {
          setZoneHover(false);
          setHeader(results.data[0] as string[]);
          const data = convertToJSON(results.data);
          csvSetter(data);
          setCsvData(data);
        }}
        onDragOver={(event: DragEvent) => { event.preventDefault(); setZoneHover(true); }}
        onDragLeave={(event: DragEvent) => { event.preventDefault(); setZoneHover(false); }}
      >
        {({ getRootProps, acceptedFile, ProgressBar, getRemoveFileProps, Remove }: any) => (
          <Stack gap="md">
            {/* Drop zone */}
            <Paper
              {...getRootProps()}
              withBorder
              radius="md"
              p="xl"
              style={{
                borderStyle: "dashed",
                borderWidth: 2,
                borderColor: zoneHover ? "var(--mantine-color-blue-5)" : "var(--mantine-color-default-border)",
                background: zoneHover ? "var(--mantine-color-blue-0)" : "var(--mantine-color-default)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                minHeight: 120,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {acceptedFile ? (
                <Group justify="space-between" w="100%">
                  <Group gap="sm">
                    <IconFileTypeCsv size={32} color="var(--mantine-color-blue-5)" />
                    <Stack gap={2}>
                      <Text fw={500} size="sm">{acceptedFile.name}</Text>
                      <Badge size="xs" variant="light">{formatFileSize(acceptedFile.size)}</Badge>
                    </Stack>
                  </Group>
                  <div style={{ width: "40%" }}>
                    <ProgressBar />
                  </div>
                  <Button
                    {...getRemoveFileProps()}
                    size="xs"
                    variant="subtle"
                    color="red"
                    leftSection={<IconX size={14} />}
                    onMouseOver={() => setRemoveHoverColor(REMOVE_HOVER_COLOR_LIGHT)}
                    onMouseOut={() => setRemoveHoverColor(DEFAULT_REMOVE_HOVER_COLOR)}
                    onClick={(e: React.MouseEvent) => {
                      getRemoveFileProps().onClick(e);
                      setHeader([]);
                      setCsvData([]);
                    }}
                  >
                    Remove
                  </Button>
                </Group>
              ) : (
                <Stack align="center" gap="xs">
                  <IconUpload size={32} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" fw={500}>Upload your CSV file</Text>
                  <Text size="xs" c="dimmed">Drag & drop or click to browse — must contain SMILES strings</Text>
                </Stack>
              )}
            </Paper>

            {/* Column selectors */}
            {acceptedFile && (
              <form onSubmit={handleSubmit(onFormSubmit)}>
                <Stack gap="sm">
                  <Divider label="Column Mapping" labelPosition="center" />

                  <Select
                    label="ID Column"
                    placeholder="Select column…"
                    data={headerOptions}
                    value={watchedId || null}
                    onChange={(val) => val && setValue("id_column", val)}
                    required
                    size="sm"
                  />

                  <Select
                    label="SMILES Column"
                    placeholder="Select column…"
                    data={headerOptions}
                    value={watchedSmi || null}
                    onChange={(val) => val && setValue("smi_column", val)}
                    required
                    size="sm"
                  />

                  {act_col !== false && (
                    <Select
                      label="Activity Column"
                      placeholder="Select column…"
                      data={headerOptions}
                      value={watchedAct || null}
                      onChange={(val) => val && setValue("act_column", val)}
                      size="sm"
                    />
                  )}

                  {errors.id_column && <Text c="red" size="xs">{errors.id_column.message}</Text>}
                  {errors.smi_column && <Text c="red" size="xs">{errors.smi_column.message}</Text>}
                  {errors.act_column && <Text c="red" size="xs">{errors.act_column.message}</Text>}

                  <Button type="submit" fullWidth mt="xs" leftSection={<IconFileTypeCsv size={16} />}>
                    Pre-Process Molecules
                  </Button>
                </Stack>
              </form>
            )}
          </Stack>
        )}
      </CSVReader>

      {/* Null value modal */}
      <Modal
        opened={nullModalOpened}
        onClose={closeNullModal}
        title="Null Values Detected"
        size="sm"
        centered
      >
        <Stack gap="md">
          <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light">
            Found <strong>{nullCount}</strong> null value{nullCount !== 1 ? "s" : ""} in the{" "}
            <strong>"{selectedActCol}"</strong> column. How would you like to handle them?
          </Alert>

          <Radio.Group
            value={nullStrategy}
            onChange={(val) => setNullStrategy(val as "remove" | "fill")}
            label="Strategy"
          >
            <Stack gap="xs" mt="xs">
              <Radio value="fill" label="Replace nulls with a fill value" />
              <Radio value="remove" label="Remove rows with null activity" />
            </Stack>
          </Radio.Group>

          {nullStrategy === "fill" && (
            <NumberInput
              label="Fill value"
              value={fillValue}
              onChange={(val) => setFillValue(typeof val === "number" ? val : 0)}
              decimalScale={4}
              size="sm"
            />
          )}

          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={closeNullModal}>Cancel</Button>
            <Button onClick={handleNullConfirm}>Apply & Continue</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default CSVLoader;
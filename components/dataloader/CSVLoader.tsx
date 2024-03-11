import { Dispatch, SetStateAction, useState } from "react";
import {
  useCSVReader,
  lightenDarkenColor,
  formatFileSize,
} from "react-papaparse";
import { useForm, SubmitHandler } from "react-hook-form";
import convertToJSON from "../utils/arrayToJson";

const DEFAULT_REMOVE_HOVER_COLOR = "#A01919";
const REMOVE_HOVER_COLOR_LIGHT = lightenDarkenColor(
  DEFAULT_REMOVE_HOVER_COLOR,
  40,
);

export type Inputs = {
  id_column: string;
  smi_column: string;
  act_column?: string;
};

interface Props {
  callofScreenFunction: SubmitHandler<Inputs>; // Adjusted to accept the SubmitHandler
  csvSetter: Dispatch<SetStateAction<Record<string, any>[]>>;
  act_col?: boolean;
}

const CSVLoader: React.FC<Props> = ({
  callofScreenFunction,
  csvSetter,
  act_col,
}) => {
  const { CSVReader } = useCSVReader();
  const [zoneHover, setZoneHover] = useState(false);
  const [headers, setHeader] = useState<any[]>([]);
  const [removeHoverColor, setRemoveHoverColor] = useState(
    DEFAULT_REMOVE_HOVER_COLOR,
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>();
  const [csvData, setCsvData] = useState<Record<string, any>[]>([{}]);

  return (
    <CSVReader
      onUploadAccepted={(results: any) => {
        setZoneHover(false);
        setHeader(results.data[0]);
        let data = convertToJSON(results.data);
        csvSetter(data);
        setCsvData(data);
        const mimi = headers.findIndex((head, i) => {
          data[0][head].toLowerCase().includes("smiles" || "smi") ? i : null;
        });
      }}
      onDragOver={(event: DragEvent) => {
        event.preventDefault();
        setZoneHover(true);
      }}
      onDragLeave={(event: DragEvent) => {
        event.preventDefault();
        setZoneHover(false);
      }}
    >
      {({
        getRootProps,
        acceptedFile,
        ProgressBar,
        getRemoveFileProps,
        Remove,
      }: any) => (
        <div className="data-loaders container" style={{ minHeight: "15vh" }}>
          <div
            {...getRootProps()}
            className={`zone ${zoneHover ? "zoneHover" : ""}`}
          >
            {acceptedFile ? (
              <div>
                <div className="file">
                  <div className="info">
                    <span className="size">
                      {formatFileSize(acceptedFile.size)}
                    </span>
                    <span className="name">{acceptedFile.name}</span>
                  </div>
                  <div className="progressBar">
                    <ProgressBar />
                  </div>
                  <div
                    {...getRemoveFileProps()}
                    className="remove"
                    onMouseOver={(event: Event) => {
                      event.preventDefault();
                      setRemoveHoverColor(REMOVE_HOVER_COLOR_LIGHT);
                    }}
                    onMouseOut={(event: Event) => {
                      event.preventDefault();
                      setRemoveHoverColor(DEFAULT_REMOVE_HOVER_COLOR);
                    }}
                  >
                    <Remove color={removeHoverColor} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p>Upload Your CSV File Here With SMILES Strings.</p>
                <p>
                  You could also drag and drop the file here or Click to browse.
                </p>
              </>
            )}
          </div>
          <br />
          {acceptedFile ? (
            <form
              onSubmit={handleSubmit(callofScreenFunction)}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <label htmlFor="id_column">ID Column: </label>
              <select
                id="id_column"
                className="input"
                defaultValue="test"
                {...register("id_column")}
              >
                {headers.map((head, key) => (
                  <option key={key}>{head}</option>
                ))}
              </select>
              <br />

              <label htmlFor="smi_column">SMILES Column: </label>
              <select
                id="smi_column"
                className="input"
                {...register("smi_column")}
              >
                {headers.map((head, key) => (
                  <option key={key}>{head}</option>
                ))}
              </select>
              <br />

              {act_col === false ? null : ( // Check if the function is provided
                <>
                  <label htmlFor="act_column">Activity Column: </label>
                  <select
                    id="act_column"
                    className="input"
                    {...register("act_column")}
                  >
                    {headers.map((head, key) => (
                      <option key={key}>{head}</option>
                    ))}
                  </select>
                </>
              )}

              <input
                type="submit"
                className="button"
                value={"Pre-Process Molecules"}
              />
              <br />
              <span>{errors.id_column?.message}</span>
              <span>{errors.smi_column?.message}</span>
              {callofScreenFunction && ( // Check if the function is provided
                <span>{errors.act_column?.message}</span>
              )}
            </form>
          ) : null}
        </div>
      )}
    </CSVReader>
  );
};

export default CSVLoader;

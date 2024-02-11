import { useContext, useState } from 'react';
import { useCSVReader, lightenDarkenColor, formatFileSize} from 'react-papaparse';
import LigandContext from '../../context/LigandContext';
import convertToJSON from '../utils/arrayToJson';
import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter } from 'next/navigation';

const DEFAULT_REMOVE_HOVER_COLOR = '#A01919';
const REMOVE_HOVER_COLOR_LIGHT = lightenDarkenColor(
  DEFAULT_REMOVE_HOVER_COLOR,
  40
);

type Inputs = {
    id_column: string,
    smi_column: string,
    act_column: string,
  };

export default function CSVReader() {
  const { CSVReader } = useCSVReader();
  const [zoneHover, setZoneHover] = useState(false);
  const [csvLoaded, setCSVLoaded] = useState(false);
  const {ligand, setLigand} = useContext(LigandContext);
  const [headers, setHeader] = useState<any[]>([]);
  const [removeHoverColor, setRemoveHoverColor] = useState(DEFAULT_REMOVE_HOVER_COLOR); 
  const { register, handleSubmit, formState: { errors } } = useForm<Inputs>();

  const router = useRouter();

  const onSubmit: SubmitHandler<Inputs> = data => {
      let while_process_var = ligand;
      while_process_var.map(x => {
        x["id"] = x[data.id_column];
        x["activity_column"] = x[data.act_column];
        x["canonical_smiles"] = x[data.smi_column];
        delete data.act_column;
        return x
      })
      setLigand(while_process_var);
      router.push('/tools/preprocess')
  };


  return (
    <CSVReader
      onUploadAccepted={(results: any) => {
        setZoneHover(false);
        let data = convertToJSON(results.data);
        setHeader(results.data[0])
        setCSVLoaded(true);
        setLigand(data);
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
        <div className='container data-loaders'>
          <div
            {...getRootProps()}
            className={`zone ${zoneHover ? 'zoneHover' : ''}`}
          >
            {acceptedFile ? (
              <div>
                <div className='file'>
                  <div className='info'>
                    <span className='size'>
                      {formatFileSize(acceptedFile.size)}
                    </span>
                    <span className='name'>{acceptedFile.name}</span>
                  </div>
                  <div className='progressBar'>
                    <ProgressBar />
                  </div>
                  <div
                    {...getRemoveFileProps()}
                    className='remove'
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
              'Drop CSV file here or click to upload'
            )}
          </div>
          <br />
          {csvLoaded ? 
                <form onSubmit={handleSubmit(onSubmit)} style = {{display : "flex", flexDirection : "column"}}>
                    <label htmlFor='id_column'>ID Column: </label>
                    <select id = 'id_column' className='input' defaultValue="test" {...register("id_column")}>
                        {headers.map((head, key) => <option key={key}>{head}</option>)}
                    </select>
                    <br />

                    <label htmlFor='smi_column'>SMILES Column: </label>
                    <select id = 'smi_column' className='input' {...register("smi_column")}>
                        {headers.map((head, key) => <option key={key}>{head}</option>)}
                    </select>
                    <br />

                    <label htmlFor='act_column'>Activity Column: </label>
                    <select id = 'act_column' className='input' {...register("act_column")}>
                        {headers.map((head, key) => <option key={key}>{head}</option>)}
                    </select>
                    <input type="submit" className='button' value={"Pre-Precess Molecules"}/>
                    <br />
                    <span>{errors.id_column?.message}</span>
                    <span>{errors.smi_column?.message}</span>
                    <span>{errors.act_column?.message}</span>
                </form> : null}
        </div>
      )}
    </CSVReader>
  );
}

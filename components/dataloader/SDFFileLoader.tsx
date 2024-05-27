import { useContext, useState } from "react";
import LigandContext from "../../context/LigandContext";
import TargetContext from "../../context/TargetContext";
import { useRouter } from "next/navigation";
import ErrorContext from "../../context/ErrorContext";
import sdfFileParser from "../utils/sdfFileParser";
import { useForm } from "react-hook-form";


export type Inputs = {
    id_column: string;
    act_column?: string;
};

export default function SDFFileLoader() {
  const { ligand, setLigand } = useContext(LigandContext);
  const { target, setTarget } = useContext(TargetContext);
  const { setErrors } = useContext(ErrorContext);
  const [stage, setStage] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>();

  const handleFileChange = (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (file && file.name.endsWith(".sdf")) {
      handleFile(file);
    } else {
      setErrors("Hey, please upload a valid SDF File");
    }
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file) => {
    console.log("File uploaded successfully:", file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const sdfContent = e.target?.result as string;
        const molecules = sdfContent.split('$$$$').filter(molecule => molecule.trim() !== '');
        const parsedMolecules = molecules.map(molecule => sdfFileParser(molecule));
        setLigand(parsedMolecules);
        setStage(true)
      } catch (error) {
        setErrors("Please upload a valid QITB JSON File");
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsHovered(true);
  };

  const handleDragExit = () => {
    setIsHovered(false);
  };

  function fileSubmitHandler(data){
    let while_process_var = ligand.map((x) => {
        x["id"] = x[data.id_column];
        x["canonical_smiles"] = x.molData;
        x[data.act_column] = parseFloat(x[data.act_column]);
        delete x[data.id_column], x[data.smi_column];
        return x;
      });
      console.log(while_process_var)
      setLigand(while_process_var);
      setTarget({...target, data_source: "sdf", activity_columns: [data.act_column]});
      router.push("/tools/preprocess/");
  }
  
  if (stage) {
    return (
        <div className="container" style={{ minHeight: "15vh" }}>
            <form
              onSubmit={handleSubmit(fileSubmitHandler)}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <label htmlFor="id_column">ID Column: </label>
              <select
                id="id_column"
                className="input"
                defaultValue="test"
                {...register("id_column")}
              >
                {Object.keys(ligand[0]).map((head, key) => (
                  <option key={key}>{head}</option>
                ))}
              </select>
              <br />

              <label htmlFor="act_column">Activity Column: </label>
              <select
                id="smi_column"
                className="input"
                {...register("act_column")}
              >
                {Object.keys(ligand[0]).map((head, key) => (
                  <option key={key}>{head}</option>
                ))}
              </select>
              <br />

              <input
                type="submit"
                className="button"
                value="Pre-Process Molecules"
              />
            </form>
        </div>
    )
  }

  return (
    <div className="container" style={{ minHeight: "15vh" }}>
      <div
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragExit}
        onClick={() => {
          const fileInput = document.getElementById("fileInput");
          if (fileInput) {
            fileInput.click();
          }
        }}
        className={`zone ${isHovered ? "zoneHover" : ""}`}
      >
        <p>Upload Your SDF File Here With Molecules.
            You could also drag and drop the file here or Click to browse.</p>
        <input
          type="file"
          id="fileInput"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
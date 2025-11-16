// FileUploadComponent.tsx
import React, { useContext, useState } from "react";
import LigandContext from "../../context/LigandContext";
import TargetContext from "../../context/TargetContext";
import { useRouter } from "next/navigation";
import ErrorContext from "../../context/ErrorContext";
import { Dropzone } from '@mantine/dropzone';
import { Group, Text, rem } from '@mantine/core';
import { IconFileCode, IconUpload, IconX } from '@tabler/icons-react';

const LoadFromWork: React.FC = () => {
  const { setLigand } = useContext(LigandContext);
  const { setTarget } = useContext(TargetContext);
  const { setErrors } = useContext(ErrorContext);
  const [isHovered, setIsHovered] = useState(false);

  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (file && file.name.endsWith(".json")) {
      handleFile(file);
    } else {
      setErrors("Hey, please upload a valid QITB JSON File");
    }
  };

  // keep this for backwards compatibility if some code still uses drag events
  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    console.log("File uploaded successfully:", file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const jsonContent = JSON.parse(e.target?.result as string);
        setLigand(jsonContent.ligand_data);
        setTarget(jsonContent.target_data);
        localStorage.setItem("dataSource", jsonContent.source);
        localStorage.setItem("path", jsonContent.fpPath);
        localStorage.setItem("nBits", jsonContent.nBits);
        localStorage.setItem("fingerprint", jsonContent.fp_type);
        router.push("/tools/preprocess/");
      } catch (error) {
        setErrors("Please upload a valid QITB JSON File");
      }
    };

    reader.readAsText(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsHovered(true);
  };

  return (
    <div className="container" style={{ minHeight: "15vh" }}>
      <Dropzone
        onDrop={(files) => {
          // Mantine passes an array of accepted files
          if (files && files.length > 0) {
            handleFile(files[0]);
          }
        }}
        onReject={() => {
          setErrors("Hey, please upload a valid QITB JSON File");
        }}
        maxFiles={1}
        radius="md"
        p="xl"
        onDragEnter={(e: React.DragEvent<HTMLDivElement>) => {
          // reuse your handler
          handleDragOver(e);
        }}
        onDragLeave={() => {
          setIsHovered(false);
        }}
        onClick={() => {
          const fileInput = document.getElementById("fileInput") as HTMLInputElement | null;
          if (fileInput) {
            fileInput.click();
          }
        }}

      >
        <Group style={{ minHeight: rem(120), pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload size={48} stroke={1.5} />
          </Dropzone.Accept>

          <Dropzone.Reject>
            <IconX size={48} stroke={1.5} />
          </Dropzone.Reject>

          <Dropzone.Idle>
            <IconFileCode size={48} stroke={1.5} />
          </Dropzone.Idle>

          <div>
            <Text size="lg">Upload Previous Work (A JSON file from QITB)</Text>
            <Text size="sm"  mt={7}>
              Drag & drop your JSON file here, or click to browse.
            </Text>
          </div>
        </Group>
      </Dropzone>

      {/* keep your original hidden input and wire it to your handler */}
      <input
        type="file"
        id="fileInput"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default LoadFromWork;

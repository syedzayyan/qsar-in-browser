// FileUploadComponent.tsx
import React, { useContext, useState } from 'react';
import LigandContext from '../../context/LigandContext';
import TargetContext from '../../context/TargetContext';
import { useRouter } from 'next/navigation';
import ErrorContext from '../../context/ErrorContext';

const LoadFromWork: React.FC = () => {
    const { setLigand } = useContext(LigandContext);
    const { setTarget } = useContext(TargetContext);
    const { setErrors } = useContext(ErrorContext);
    const [isHovered, setIsHovered] = useState(false); // Add state for hover

    const router = useRouter();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const input = event.target;
        const file = input.files?.[0];
        console.log(file);
        if (file.name.endsWith('.json')) {
            handleFile(file);
        } else {
            setErrors('Hey, please upload a valid QITB JSON File');
        }
    };

    const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];

        if (file) {
            handleFile(file);
        }
    };

    const handleFile = (file: File) => {
        console.log('File uploaded successfully:', file.name);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const jsonContent = JSON.parse(e.target?.result as string);
                setLigand(jsonContent.ligand_data);
                setTarget(jsonContent.target_data);
                localStorage.setItem("dataSource", jsonContent.source);
                localStorage.setItem("path", jsonContent.fpPath);
                localStorage.setItem("nBits", jsonContent.nBits);
                localStorage.setItem("fingerprint", jsonContent.fp_type)
                router.push("/tools/preprocess/")
            } catch (error) {
                setErrors('Please upload a valid QITB JSON File');
            }
        };

        reader.readAsText(file);
    };
    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsHovered(true);
    };

    return (
        <div className='container' style={{ minHeight: "15vh" }}>
            <div
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
                onDragExit={() => setIsHovered(false)}
                onClick={() => {
                    const fileInput = document.getElementById('fileInput');
                    if (fileInput) {
                        fileInput.click();
                    }
                }}
                className={`zone ${isHovered ? 'zoneHover' : ''}`}
            >
                <p>
                Upload Previous Work (A JSON file from QITB)
                </p>
                <p>
                  You could also drag and drop the file here or Click to browse.
                </p>
                <input
                    type="file"
                    id="fileInput"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </div>
        </div>
    );
};

export default LoadFromWork;

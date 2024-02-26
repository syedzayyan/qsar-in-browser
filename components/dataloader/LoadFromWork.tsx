// FileUploadComponent.tsx
import React, { useContext } from 'react';
import LigandContext from '../../context/LigandContext';
import TargetContext from '../../context/TargetContext';
import { useRouter } from 'next/navigation';

const LoadFromWork: React.FC = () => {
    const { setLigand } = useContext(LigandContext);
    const { setTarget } = useContext(TargetContext);
    const router = useRouter();
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const input = event.target;
        const file = input.files?.[0];

        if (file) {
            if (file.type === 'application/json') {
                console.log('File uploaded successfully:', file.name);

                // Read the content of the JSON file
                const reader = new FileReader();

                reader.onload = (e) => {
                    try {
                        const jsonContent = JSON.parse(e.target?.result as string);
                        setLigand(jsonContent.ligand_data);
                        setTarget(jsonContent.target_data);
                        localStorage.setItem("dataSource", jsonContent.source);
                        router.push("/tools/preprocess/")
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                    }
                };

                reader.readAsText(file);

            } else {
                alert('Please upload a valid QITB JSON File');
            }
        }
    };

    const handleButtonClick = () => {
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        fileInput.click();
    };

    return (
        <div>
            <button onClick={handleButtonClick} className='button'>Upload Previous Work</button>
            <input
                type="file"
                id="fileInput"
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleFileChange}
            />
        </div>
    );
};

export default LoadFromWork;

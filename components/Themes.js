
const DarkTheme = () => {
    return (
        <style jsx global>
            {`
:root {
    --background-color: #34495e; /* Slightly lighter dark background color */
    --secondary-color: #2c3e50; /* Dark secondary color, slightly darker than background */
    --text-color: #ecf0f1; /* Light text color */
    --accent-color: #3498db; /* Blue accent color */
    --box-shadow-color: rgba(0, 0, 0, 0.1);
    --border-color: #95a5a6; /* Light border color */

    --input-back: #555; /* Darker gray for input background */
    --input-color: #fbec48; /* Yellow for input text */
}

          }
        `}
        </style>
    );
};

const LightTheme = () => {
    return (
        <style jsx global>
            {`
         :root {
            --background-color: #f0f0f0;
            --secondary-color: #fff;
            --text-color: #333;
            --accent-color: #3498db;
            --box-shadow-color: rgba(0, 0, 0, 0.1);
            --border-color: #ccc;
        
            --input-back: #4b4a4a;
            --input-color: #294797;
        }
        `}
        </style>
    );
};

export default function Theme({ theme }) {
    if (theme == "dark") {
        return <DarkTheme />;
    }
    return <LightTheme />;
}

import { log10 } from "mathjs";
import dynamic from "next/dynamic";
const MoleculeStructure = dynamic(
  () => import("../toolComp/MoleculeStructure"),
  { ssr: false }
);

export const Tooltip = ({ interactionData }) => {  
  if (interactionData === null) {
    return null;
  }

  return (
    <div style={{ right: interactionData.xPos * 0.8, bottom: interactionData.yPos * 0.5}} className="tooltip">
      <MoleculeStructure
      structure={interactionData.name}
      id="smiles"
    />
    <span>Click to open</span>
      <style>{`
      .tooltip {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.8);
        border-radius: 4px;
        color: white;
        font-size: 12px;
        padding: 4px;
        margin-left: 15px;
        transform: translateY(-50%);
    }
    
    /* Add an arrow */
    .tooltip:after {
        content: "";
        position:absolute;
        border-width: 5px;  /* Arrow width */
        left: -10px;  /* Arrow width * 2 */
        top:50%;
        transform:translateY(-50%);
        border-color: transparent black transparent transparent;
    }
    
      `}</style>
    </div>
  );
};

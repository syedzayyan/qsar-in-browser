import { FC, ReactNode } from "react";

interface ModalComponentProps {
  isOpen: boolean;
  children: ReactNode;
  closeModal: () => void;
  width?: string;
  height?: string;
  card?: boolean;
}

const ModalComponent: FC<ModalComponentProps> = ({
  isOpen,
  children,
  closeModal,
  width = "80",
  height = "80",
  card = true
}) => {
  const handleOverlayClick = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    // Close the modal only if the click is on the overlay, not on the modal content
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div className="modal">
          {children}
          <button className="button close-button" onClick={closeModal}>
            ❌
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000000000000000000;
          cursor: pointer; /* Added cursor pointer */
        }

        .modal {
          ${card && 
            `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            `
          }
          height: ${height}vh;
          width: ${width}vw;
          margin: 10%;
          background: var(--secondary-color);
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          overflow: scroll;
          position: relative; /* Added position relative */
        }

        .close-button {
          position: absolute; /* Changed position to absolute */
          top: 10px;
          right: 10px; /* Changed left to right */
          background-color: #fff; /* Changed to white */
          color: #FFB6C1; /* Changed to pink */
          padding: 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          height: 40px;
          width: 40px;
        }

        @media screen and (max-width: 768px) {
          .modal {
            width: 90vw;
          }
        }
      `}</style>
    </>
  );
};

export default ModalComponent;

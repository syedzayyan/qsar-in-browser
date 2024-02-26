import { FC, ReactNode } from 'react';

interface ModalComponentProps {
  isOpen: boolean;
  children: ReactNode;
  closeModal: () => void;
  width?: string,
  height?: string
}

const ModalComponent: FC<ModalComponentProps> = ({ isOpen, children, closeModal, width = "80", height = "80" }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="modal-overlay">
        <div className="modal">
          {children}
          <br />
          <br />
        </div>
        <button className="button close-button" onClick={closeModal}>
          Close Overlay
        </button>
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
          z-index: 10000;
        }

        .modal {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          height: ${height}vh;
          width: ${width}vw;
          margin: 10%;
          background: var(--secondary-color);
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          overflow: scroll;
        }

        .close-button {
          position: absolute;
          top: 10px;
          right: 10px;
          background-color: #FFB6C1;
          color: #fff;
          padding: 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        @media screen and (max-width: 768px) {
          .modal{
            width: 90vw;
          }
        }
      `}</style>
    </>
  );
};

export default ModalComponent;

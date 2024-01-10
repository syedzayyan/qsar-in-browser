import React from 'react';

const ModalComponent = ({ isOpen, children, closeModal }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="modal-overlay">
        <div className="modal">
          {children}
          <br></br>
          <br></br>
        </div>
        <button className="button close-button" onClick={closeModal}>
            Close Overlay
          </button>
      </div>

      <style>
        {`
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
            z-index: 1000;
          }

          .modal {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            height: 80%;
            width: 80%;
            margin: 10%;
            background: white;
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
        `}
      </style>
    </>
  );
};

export default ModalComponent;

"use client"

import { useState } from "react";
import DataLoader from "../components/dataloader/DataLoader";
import ModalComponent from "../components/ui-comps/ModalComponent";

export default function IndexPage() {
  const [isModalOpen, setModalOpen] = useState(false);
  const openModal = () => {
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
  };

  return (
    <>
        <div className="content-wrapper">
          <div className="image-container">
            <img src="logo.svg" alt="Logo" />
          </div>
          <div className="text-container">
            <h1>Cheminformatics in Your Browser Without Writing Code!</h1>
            <br></br>
            <p className="larger-text">
              QITB simplifies the world of chemistry and data analysis. Easily
              upload chemical data or fetch it from trusted resources, and the
              user-friendly interface lets you explore molecular structures,
              analyze them, and run ML models to explore newer chemical
              structures. With everything running securely in your browser, it's
              a hassle-free way to uncover insights into molecules without any coding required.
              Also....the code behind this app is open source.
            </p>
            <br></br>
            <button className="button" onClick={openModal}>
              <h1>Start Here!</h1>
            </button>
          </div>
        </div>
        <ModalComponent isOpen={isModalOpen} closeModal={closeModal}>
          <DataLoader />
        </ModalComponent>
    </>
  );
}

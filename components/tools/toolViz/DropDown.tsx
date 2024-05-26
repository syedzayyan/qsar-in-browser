import React, { useState } from 'react';

const Dropdown = ({ buttonText, children }) => {
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = () => {
        setIsVisible(!isVisible);
    };

    return (
        <div className="dropdown-container">
            <button className="button" onClick={toggleVisibility}>
                {buttonText}
            </button>
            <div className={`dropdown-content ${isVisible ? 'visible' : ''}`}>
                {children}
            </div>
            <style>
              {
                `
                .dropdown-container {
                  position: relative;
                  display: inline-block;
              }
              
              .dropdown-icon {
                  background-color: var(--accent-color);
                  border: none;
                  color: white;
                  padding: 12px;
                  margin:5px;
                  font-size: 16px;
                  cursor: pointer;
              }
              
              .dropdown-icon:hover {
                  background-color: #3e8e41;
              }
              
              .dropdown-content {
                  display: none;
                  position: absolute;
                  z-index: 1;
                  top: 100%; /* Position it below the button */
                  left: 50%;
                  transform: translateX(-50%); /* Center it horizontally */
              }
              
              .dropdown-content.visible {
                  display: block;
              }
              
              // .dropdown-content div {
              //     padding: 12px 16px;
              //     text-decoration: none;
              //     display: block;
              // }
                `
              }
            </style>
        </div>
    );
};

export default Dropdown;

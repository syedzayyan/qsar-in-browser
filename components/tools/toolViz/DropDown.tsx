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
        </div>
    );
};

export default Dropdown;

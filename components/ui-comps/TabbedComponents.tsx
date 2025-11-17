// TabWrapper.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const TabWrapper = ({ children, defaultTab = 0 }) => {
    const [activeTab, setActiveTab] = useState(defaultTab);

    const handleTabChange = (index) => {
        setActiveTab(index);
    };

    return (
        <div className="tab-wrapper">
            <div className="tab-header">
                {React.Children.map(children, (child, index) =>
                    React.cloneElement(child as React.ReactElement<any>, {
                        isActive: index === activeTab,
                        onTabClick: () => handleTabChange(index),
                    })
                )}
            </div>
            <div className="tab-content">
                {(React.Children.toArray(children)[activeTab] as React.ReactElement<any>).props.children}
            </div>
        </div>
    );
};

export default TabWrapper;

export const Tabs = ({ title, isActive, onTabClick, children }) => {
    return (
        <div className={`tab ${isActive ? 'active' : ''}`} onClick={onTabClick}>
            {title}
        </div>
    );
};

Tabs.propTypes = {
    title: PropTypes.string.isRequired,
    isActive: PropTypes.bool,
    onTabClick: PropTypes.func,
    content: PropTypes.node,
};
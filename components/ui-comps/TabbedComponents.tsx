import React, { useState } from 'react';
import PropTypes from 'prop-types';

const TabWrapper = ({ children }) => {
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (index) => {
        setActiveTab(index);
    };

    return (
        <div className="tab-wrapper">
            <div className="tab-header">
                {React.Children.map(children, (child, index) =>
                    React.cloneElement(child, {
                        isActive: index === activeTab,
                        onTabClick: () => handleTabChange(index),
                    })
                )}
            </div>
            <div className="tab-content">
                {React.Children.map(children, (child, index) =>
                    index === activeTab ? child.props.children : null
                )}
            </div>
        </div>
    );
};

TabWrapper.propTypes = {
    children: PropTypes.node.isRequired,
};

export default TabWrapper;

export const Tabs = ({ title, isActive, onTabClick }) => {
    return (
        <div className={`tab ${isActive ? 'active' : ''}`} onClick={onTabClick}>
            {title}
        </div>
    );
};

Tabs.propTypes = {
    title: PropTypes.string.isRequired,
    isActive: PropTypes.bool.isRequired,
    onTabClick: PropTypes.func.isRequired,
};
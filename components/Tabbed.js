// components/TabbedComponent.js
import { useState } from 'react';
import Link from 'next/link';

const containerStyle = {
  margin: 0,
  display: 'flex',
  width: '100%', // Take the full width
  fontSize: '1.5em',
  justifyContent: 'center', // Center horizontally
  backgroundColor: 'var(--background-color)',
};

const tabStyle = {
  all: 'unset',
  flexGrow: 1,
  zIndex: 100,
  display: 'flex',
  cursor: 'pointer',
  position: 'relative',
  borderRadius: '6pt 6pt 0 0', // Adjusted border-radius
  alignItems: 'center',
  willChange: 'transform',
  justifyContent: 'center',
  padding: '10px 20px', // Adjusted padding
  transition: 'color var(--timeOut, var(--duration))',
  color: 'hsl(232deg 18% 8%)', // Use your custom color here
  position: 'relative', // Added position relative
};

const activeTabStyle = {
  color: 'hsl(232deg 16% 15%)', // Adjusted color for active tab
};

const tabBeforeStyle = {
  content: '""',
  zIndex: -1,
  width: '100%', // Adjusted width to cover the whole tab
  height: '5px', // Adjusted height
  borderRadius: '6pt 6pt 0 0', // Adjusted border-radius
  position: 'absolute',
  transform: 'scale(0)',
  transition: 'background-color var(--duration), transform var(--duration)',
  bottom: 0, // Align to the bottom
  left: 0, // Align to the left
};

const activeTabBeforeStyle = {
  transform: 'scale(1)',
  backgroundColor: 'var(--accent-color)',
};

const TabbedComponent = ({ activeTab }) => {
  const [activeIndex, setActiveIndex] = useState(activeTab);
  const tabs = ['Data Distribution', 'PCA', 'tSNE', 'Random Forest'];
  const tabLinks = ['data-distribution', 
  'dimension-reduction/pca', 
  'dimension-reduction/tsne', 'ml/rf'];
  const handleTabClick = (index) => {
    setActiveIndex(index);
  };

  return (
    <div style={containerStyle}>
      {tabs.map((tab, index) => (
        <Link style={{ textDecoration: 'none' }} href={`/tools/${tabLinks[index]}`} key={index} passHref>
          <div
            onClick={() => handleTabClick(index)}
            style={{
              ...tabStyle,
              ...(index === activeIndex ? activeTabStyle : {}),
            }}
          >
            {tab}
            <div
              style={{
                ...tabBeforeStyle,
                ...(index === activeIndex ? activeTabBeforeStyle : {}),
              }}
            ></div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default TabbedComponent;

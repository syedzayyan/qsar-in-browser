import React from 'react';

// Define the ColorLegend component
const ColorLegend = ({ colors }) => {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
      {colors.map((item, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', marginRight: '20px' }}>
          <div 
            style={{
              width: '20px',
              height: '20px',
              backgroundColor: item.color,
              marginRight: '5px'
            }} 
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// Example usage of the ColorLegend component
const ScaffEdgeLegend = () => {
  const colorArray = [
    { color: '#99ccff', label: 'Fragment' },         // Muted Blue
    { color: '#ff9999', label: 'Generic' },          // Muted Red
    { color: '#99ff99', label: 'GenericBond' },      // Muted Green
    { color: '#666666', label: 'RemoveAttachment' }, // Dark Gray
    { color: '#cccc66', label: 'Other' }             // Muted Yellow
  ];

  return (
    <div>
      <ColorLegend colors={colorArray} />
    </div>
  );
};

export default ScaffEdgeLegend;

import React from 'react';

export default function Screenshotter({ svgRef }) {
  const handleConvertAndDownload = (type) => {
    if (svgRef.current) {
      const svgNode = svgRef.current;

      if (type === 'png') {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        const bbox = svgNode.getBBox();

        canvas.width = bbox.width + 100;
        canvas.height = bbox.height + 100;

        const data = new XMLSerializer().serializeToString(svgNode);
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));

        img.onload = () => {
          if (context) {
            context.drawImage(img, 0, 0);

            const pngDataUrl = canvas.toDataURL('image/png');

            const downloadLink = document.createElement('a');
            downloadLink.download = 'image.png';
            downloadLink.href = pngDataUrl;
            downloadLink.style.display = 'none';

            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
          }
        };
      } else if (type === 'svg') {
        const svgData = new XMLSerializer().serializeToString(svgNode);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const downloadLink = document.createElement('a');
        downloadLink.download = 'image.svg';
        downloadLink.href = url;
        downloadLink.style.display = 'none';

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <details open = {false}>
      <summary>Download chart as image</summary>
      <button className='button' onClick={() => handleConvertAndDownload('png')}>
        Download PNG
      </button>
      &nbsp;
      <button className='button' onClick={() => handleConvertAndDownload('svg')}>
        Download SVG
      </button>
    </details>
  );
}

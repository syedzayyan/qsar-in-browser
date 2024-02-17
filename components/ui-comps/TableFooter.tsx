import React, { useEffect, useState } from "react";

const TableFooter = ({ range, setPage, page, slice }) => {
  const [visiblePages, setVisiblePages] = useState([]);

  useEffect(() => {
    if (slice.length < 1 && page !== 1) {
      setPage(page - 1);
    }
  }, [slice, page, setPage]);

  useEffect(() => {
    const visiblePageCount = 5;
    const startIndex = Math.max(0, page - Math.floor(visiblePageCount / 2));
    const endIndex = Math.min(range.length, startIndex + visiblePageCount);

    setVisiblePages(range.slice(startIndex, endIndex));
  }, [range, page]);

  return (
    <div className="tableFooter">
      <div className="tableButtonContainer">
        {page > 1 && (
          <>
            <button className="tableButton" onClick={() => setPage(1)}>
              1
            </button>
            {page > 2 && <span>...</span>}
          </>
        )}
        {visiblePages.map((el, index) => (
          <button
            key={index}
            className={`tableButton ${
              page === el ? "activeButton" : "inactiveButton"
            }`}
            onClick={() => setPage(el)}
          >
            {el}
          </button>
        ))}
        {page + visiblePages.length < range.length && <span>...</span>}
        {page + visiblePages.length < range.length && (
          <>
            {page + visiblePages.length < range.length - 1 && (
              <span>...</span>
            )}
            <button
              className="tableButton"
              onClick={() => setPage(range.length)}
            >
              {range.length}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TableFooter;

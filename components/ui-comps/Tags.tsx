import { useState } from "react";

const TagComponent = ({ tags, onClick }) => {
  const [selectedTag, setSelectedTag] = useState(null);

  const toggleTag = (tag) => {
    setSelectedTag(tag === selectedTag ? null : tag);
    onClick(tag === selectedTag ? null : tag);
  };

  return (
    <div className="tag-container">
      {tags.map((tag, index) => (
        <span
          key={index}
          className={`tag ${tag === selectedTag ? 'selected' : ''}`}
          onClick={() => toggleTag(tag)}
        >
          {tag}
        </span>
      ))}
    </div>
  );
};

export default TagComponent;

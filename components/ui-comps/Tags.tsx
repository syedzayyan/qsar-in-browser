import { useState } from "react";
import { Group, Chip } from "@mantine/core";

const TagComponent = ({ tags, onClick }) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    const next = tag === selectedTag ? null : tag;
    setSelectedTag(next);
    onClick(next);
  };

  return (
    <Group gap="xs">
      {tags.map((tag, index) => (
        <Chip
          key={index}
          checked={tag === selectedTag}
          onChange={() => toggleTag(tag)}
          variant="filled"
        >
          {tag}
        </Chip>
      ))}
    </Group>
  );
};

export default TagComponent;

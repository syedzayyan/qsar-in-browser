import { Popover, Button } from '@mantine/core';

const Dropdown = ({ buttonText, children }) => {
  return (
    <Popover width={200} position="bottom" shadow="md">
      <Popover.Target>
        <Button>
          {buttonText}
        </Button>
      </Popover.Target>

      <Popover.Dropdown>
        {children}
      </Popover.Dropdown>
    </Popover>
  );
};

export default Dropdown;

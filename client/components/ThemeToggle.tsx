import { ActionIcon, Tooltip, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';

const ThemeToggle = () => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const nextScheme = colorScheme === 'dark' ? 'light' : 'dark';

  return (
    <Tooltip label={`Switch to ${nextScheme} mode`} withArrow>
      <ActionIcon
        variant="subtle"
        color={colorScheme === 'dark' ? 'yellow' : 'blue'}
        onClick={() => setColorScheme(nextScheme)}
      >
        {colorScheme === 'dark' ? (
          <IconSun size={18} />
        ) : (
          <IconMoon size={18} />
        )}
      </ActionIcon>
    </Tooltip>
  );
};

export default ThemeToggle;

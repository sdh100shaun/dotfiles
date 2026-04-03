import type { UIConfig } from '../types';

export const defaultTheme: UIConfig = {
  colors: {
    primary: 'blue',
    secondary: 'cyan',
    accent: 'green',
    error: 'red',
    success: 'green',
    background: 'black',
    foreground: 'white',
  },
};

export const styles = {
  box: {
    border: {
      type: 'line' as const,
    },
    style: {
      border: {
        fg: defaultTheme.colors.primary,
      },
    },
  },
  list: {
    style: {
      selected: {
        bg: defaultTheme.colors.primary,
        fg: defaultTheme.colors.foreground,
        bold: true,
      },
      item: {
        fg: defaultTheme.colors.foreground,
      },
    },
    scrollbar: {
      ch: '│',
      fg: defaultTheme.colors.secondary,
    },
  },
  input: {
    style: {
      fg: defaultTheme.colors.foreground,
      bg: 'black',
      focus: {
        fg: defaultTheme.colors.foreground,
        bg: 'black',
      },
      border: {
        fg: defaultTheme.colors.secondary,
      },
    },
  },
  statusBar: {
    style: {
      fg: 'black',
      bg: defaultTheme.colors.primary,
    },
  },
  header: {
    style: {
      fg: defaultTheme.colors.accent,
      bold: true,
    },
  },
};

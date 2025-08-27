import { extendTheme } from '@chakra-ui/react'

// Football-themed color palette
const colors = {
  football: {
    50: '#f0fdf4',   // Light green (field)
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',  // Main green
    600: '#16a34a',
    700: '#15803d',  // Darker field green
    800: '#166534',
    900: '#14532d',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',   // Game day orange
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  navy: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',   // Team navy
    800: '#1e293b',
    900: '#0f172a',   // Deep navy
  }
}

// Custom component styles
const components = {
  Button: {
    variants: {
      solid: {
        bg: 'football.600',
        color: 'white',
        _hover: {
          bg: 'football.700',
          transform: 'translateY(-1px)',
          boxShadow: 'lg',
        },
        _active: {
          bg: 'football.800',
          transform: 'translateY(0)',
        },
      },
      ghost: {
        color: 'football.600',
        _hover: {
          bg: 'football.50',
        },
      },
      outline: {
        borderColor: 'football.600',
        color: 'football.600',
        _hover: {
          bg: 'football.50',
        },
      },
    },
  },
  Card: {
    baseStyle: {
      container: {
        bg: 'white',
        boxShadow: 'lg',
        border: '1px solid',
        borderColor: 'gray.200',
        borderRadius: 'xl',
        overflow: 'hidden',
        transition: 'all 0.2s',
        _hover: {
          transform: 'translateY(-2px)',
          boxShadow: 'xl',
        },
      },
    },
  },
  Badge: {
    variants: {
      win: {
        bg: 'football.500',
        color: 'white',
      },
      loss: {
        bg: 'red.500',
        color: 'white',
      },
      tie: {
        bg: 'orange.500',
        color: 'white',
      },
    },
  },
}

// Typography
const fonts = {
  heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
}

// Global styles
const styles = {
  global: {
    body: {
      bg: 'gray.50',
      color: 'gray.900',
    },
    '*::placeholder': {
      color: 'gray.400',
    },
    '*, *::before, &::after': {
      borderColor: 'gray.200',
    },
  },
}

// Semantic tokens for consistent theming
const semanticTokens = {
  colors: {
    primary: 'football.600',
    secondary: 'orange.500',
    accent: 'navy.700',
    success: 'football.500',
    warning: 'orange.400',
    error: 'red.500',
  },
}

const config = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

export const theme = extendTheme({
  colors,
  components,
  fonts,
  styles,
  semanticTokens,
  config,
})
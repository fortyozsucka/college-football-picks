import { extendTheme } from '@chakra-ui/react'

// Minimalist black/grey/white/green color palette
const colors = {
  brand: {
    50: '#f8fdfb',   // Very light mint
    100: '#e6faf2',  // Light mint tint
    200: '#d4f5e6',  // Soft mint
    300: '#93E9BE',  // Your custom mint green (medium)
    400: '#7ee3b0',  // Vibrant mint
    500: '#6ade9c',  // Primary mint accent
    600: '#4fbb7a',  // Darker mint
    700: '#3a9860',  // Deep mint
    800: '#2f7a4e',  // Forest mint
    900: '#1f5233',  // Very dark mint
  },
  neutral: {
    50: '#ffffff',   // Pure white
    100: '#fafafa',  // Off white
    200: '#f5f5f5',  // Very light grey
    300: '#e5e5e5',  // Light grey
    400: '#a3a3a3',  // Medium grey
    500: '#737373',  // Dark grey
    600: '#525252',  // Darker grey
    700: '#404040',  // Very dark grey
    800: '#262626',  // Almost black
    900: '#171717',  // Pure black
  },
  // Alias for backward compatibility
  football: {
    50: '#f8fdfb',
    100: '#e6faf2',
    200: '#d4f5e6',
    300: '#93E9BE',
    400: '#7ee3b0',
    500: '#6ade9c',
    600: '#4fbb7a',
    700: '#3a9860',
    800: '#2f7a4e',
    900: '#1f5233',
  }
}

// Custom component styles
const components = {
  Button: {
    variants: {
      solid: {
        bg: 'neutral.900',
        color: 'white',
        fontWeight: '500',
        _hover: {
          bg: 'neutral.800',
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        _active: {
          bg: 'neutral.700',
          transform: 'translateY(0)',
        },
      },
      ghost: {
        color: 'neutral.700',
        fontWeight: '500',
        _hover: {
          bg: 'neutral.100',
          color: 'neutral.900',
        },
      },
      outline: {
        borderColor: 'neutral.300',
        color: 'neutral.700',
        fontWeight: '500',
        _hover: {
          bg: 'neutral.50',
          borderColor: 'neutral.400',
        },
      },
    },
  },
  Card: {
    baseStyle: {
      container: {
        bg: 'white',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid',
        borderColor: 'neutral.200',
        borderRadius: 'lg',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        _hover: {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderColor: 'neutral.300',
        },
      },
    },
  },
  Badge: {
    variants: {
      win: {
        bg: 'brand.500',
        color: 'white',
        fontWeight: '600',
      },
      loss: {
        bg: 'neutral.600',
        color: 'white',
        fontWeight: '600',
      },
      tie: {
        bg: 'neutral.400',
        color: 'white',
        fontWeight: '600',
      },
    },
  },
}

// Typography - Modern, clean fonts
const fonts = {
  heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
}

// Global styles - Minimalist aesthetic
const styles = {
  global: {
    body: {
      bg: 'neutral.50',
      color: 'neutral.900',
      fontSize: '16px',
      lineHeight: '1.6',
    },
    '*::placeholder': {
      color: 'neutral.400',
    },
    '*, *::before, &::after': {
      borderColor: 'neutral.200',
    },
    // Smooth scrolling
    html: {
      scrollBehavior: 'smooth',
    },
  },
}

// Semantic tokens for consistent theming
const semanticTokens = {
  colors: {
    primary: 'brand.500',
    secondary: 'neutral.700',
    accent: 'brand.600',
    success: 'brand.500',
    warning: 'neutral.500',
    error: 'neutral.600',
    muted: 'neutral.400',
    background: 'neutral.50',
    surface: 'white',
    border: 'neutral.200',
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
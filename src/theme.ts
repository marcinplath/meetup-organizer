import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

// Konfiguracja trybu kolorów
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
}

// Rozszerzenie domyślnego motywu
const theme = extendTheme({ 
  config,
  colors: {
    brand: {
      50: '#e0f2ff',
      100: '#b8dcff',
      200: '#8fc5ff',
      300: '#65aeff',
      400: '#3c97ff',
      500: '#1280ff', // podstawowy kolor marki
      600: '#0066e0',
      700: '#004db2',
      800: '#003585',
      900: '#001c57',
    },
  },
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
        color: props.colorMode === 'dark' ? 'white' : 'gray.800',
      },
    }),
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
    },
  },
})

export default theme 
import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;

  return {
    width,
    isDesktop,
    isTablet,
    isMobile,
    containerWidth: isDesktop ? 1200 : '100%',
    contentMaxWidth: isDesktop ? 800 : '100%',
  };
}

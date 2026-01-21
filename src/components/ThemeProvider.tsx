import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ComponentProps } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      attribute="class" 
      enableSystem 
      disableTransitionOnChange 
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

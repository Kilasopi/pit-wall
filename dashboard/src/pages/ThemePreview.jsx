import { ThemePalette } from '@/components/ThemePalette';

function ThemePreview() {
  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <h1 className="mb-4 font-heading text-xl font-medium">Theme Preview</h1>
      <div className="flex flex-col gap-6 lg:flex-row">
        <ThemePalette label="Light" themeClassName="light" />
        <ThemePalette label="Dark" themeClassName="dark" />
      </div>
    </div>
  );
}

export default ThemePreview;

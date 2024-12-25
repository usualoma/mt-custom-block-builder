declare global {
  var MTBlockEditorSetCompiledHtml: (html: string) => void;
  var MTBlockEditorAddDroppable: (callback: (event: DragEvent) => void) => void;
}

export interface PluginConfig {
  devServer?: {
    port?: number;
    host?: string;
  };
  blocks: {
    /**
     * JSON file include base block data
     */
    input: string;
    /**
     * Output file path
     */
    output: string;
    /**
     * Script file to be embedded in preview header
     */
    script: string;
    /**
     * template html file path
     */
    html: string;
    /**
     * Icon file path
     */
    icon?: string;
  }[];
}

export const defineConfig = (config: PluginConfig): PluginConfig => {
  return config;
};

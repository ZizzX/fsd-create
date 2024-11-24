import path from 'path';
import { FSDConfig, GeneratorOptions, SegmentType } from '../types';
import { FileSystem, Logger, Templates, Validation } from '../utils';

export class FSDGenerator {
  private config: FSDConfig;

  constructor(config: FSDConfig) {
    this.config = config;
  }

  async generateLayer(options: GeneratorOptions): Promise<void> {
    const { path: basePath, layer, name, segments } = options;

    if (!layer || !Validation.isValidLayerType(layer)) {
      throw new Error(`Invalid layer type: ${layer}`);
    }

    const layerPath = path.join(basePath, layer, name);
    await FileSystem.createDirectory(layerPath);
    Logger.info(`Creating ${layer} layer: ${name}`);

    // Use default segments from config if not provided
    const layerSegments = segments || this.config.layers[layer]?.segments || [];

    for (const segment of layerSegments) {
      if (!Validation.isValidSegmentType(segment)) {
        Logger.warn(`Skipping invalid segment type: ${segment}`);
        continue;
      }

      await this.generateSegment(layerPath, segment, name);
    }

    // Create index file
    await this.createIndexFile(layerPath, name);
    Logger.success(`Successfully created ${layer} layer: ${name}`);
  }

  private async generateSegment(basePath: string, segment: SegmentType, name: string): Promise<void> {
    const segmentPath = path.join(basePath, segment);
    await FileSystem.createDirectory(segmentPath);

    const templates = this.getTemplatesForSegment(segment);
    for (const [fileName, template] of Object.entries(templates)) {
      const filePath = path.join(segmentPath, `${fileName}.ts`);
      const content = Templates.processTemplate(template, { name });
      await FileSystem.createFile(filePath, content);
    }
  }

  private getTemplatesForSegment(segment: SegmentType): Record<string, string> {
    const defaultTemplates: Record<string, Record<string, string>> = {
      ui: {
        index: Templates.getDefaultTemplate('index'),
        component: Templates.getDefaultTemplate('component'),
      },
      model: {
        index: Templates.getDefaultTemplate('index'),
        model: Templates.getDefaultTemplate('model'),
      },
      api: {
        index: Templates.getDefaultTemplate('index'),
        api: `export const {{name}}Api = {
  // API methods
};`,
      },
      lib: {
        index: Templates.getDefaultTemplate('index'),
      },
      config: {
        index: Templates.getDefaultTemplate('index'),
        config: `export const {{name}}Config = {
  // Configuration
};`,
      },
    };

    return defaultTemplates[segment] || {};
  }

  private async createIndexFile(layerPath: string, name: string): Promise<void> {
    const indexPath = path.join(layerPath, 'index.ts');
    const content = Templates.processTemplate(Templates.getDefaultTemplate('index'), { name });
    await FileSystem.createFile(indexPath, content);
  }
}

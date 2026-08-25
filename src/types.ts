export type ItemStatus = 'idle' | 'processing' | 'done' | 'error';

export interface ImageMetadata {
  bitDepth?: number;
  colorType?: string;
  colorTypeCode?: number;
  hasAlpha?: boolean;
  colorSpace?: string;
  interlace?: string;
  aspectRatio?: string;
  megapixels?: string;
  mimeType?: string;
  dpi?: number;
}

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  customName?: string;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  originalUrl: string;
  metadata?: ImageMetadata;
  
  // Converted result
  status: ItemStatus;
  progress: number; // 0 - 100
  convertedBlob?: Blob;
  convertedUrl?: string;
  convertedSize?: number;
  convertedWidth?: number;
  convertedHeight?: number;
  error?: string;
  durationMs?: number;
}

export interface ConversionConfig {
  quality: number; // 0.1 to 1.0 (default 1.0 for maximum lossless visual fidelity)
  backgroundColor: string; // Hex color for transparent PNG pixels, default '#FFFFFF'
  extension: 'jpg' | 'jpeg';
  namePrefix: string;
  nameSuffix: string;
  autoStart: boolean;
}

export interface ConfigPreset {
  id: string;
  name: string;
  isBuiltin?: boolean;
  config: ConversionConfig;
}

export interface DirectoryConfig {
  mode: 'download' | 'zip' | 'directory';
  directoryHandle?: FileSystemDirectoryHandle | null;
  directoryName?: string;
}

export type TableFilterType = 'all' | 'done' | 'idle' | 'processing' | 'error';
export type TableSortField = 'index' | 'name' | 'size' | 'resolution' | 'status' | 'duration';
export type TableSortOrder = 'asc' | 'desc';


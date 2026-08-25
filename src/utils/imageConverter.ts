import { ConversionConfig, ImageItem, ImageMetadata } from '../types';

/**
 * Calculates a simplified aspect ratio string (e.g. 16:9, 4:3, 1:1, or 1.78:1)
 */
export function calculateAspectRatio(width: number, height: number): string {
  if (!width || !height) return '-';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const rW = width / divisor;
  const rH = height / divisor;

  // If simple standard ratios
  if ((rW === 16 && rH === 9) || (rW === 4 && rH === 3) || (rW === 1 && rH === 1) || (rW === 3 && rH === 2) || (rW === 21 && rH === 9) || (rW === 5 && rH === 4)) {
    return `${rW}:${rH}`;
  }
  
  const ratio = (width / height).toFixed(2);
  return `${ratio}:1 (${rW}:${rH})`;
}

/**
 * Parses binary PNG chunks (IHDR, sRGB, iCCP, pHYs, etc.) to extract rich metadata
 */
export async function parsePngBinaryMetadata(file: File): Promise<ImageMetadata> {
  try {
    const buffer = await file.slice(0, 65536).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Verify 8-byte PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
    const isPng = pngSignature.every((b, i) => bytes[i] === b);

    if (!isPng) {
      return {
        mimeType: file.type || 'image/png',
        colorSpace: '标准 RGB',
      };
    }

    const view = new DataView(buffer);
    let offset = 8;
    const metadata: ImageMetadata = {
      mimeType: 'image/png',
      colorSpace: '标准 RGB',
    };

    while (offset + 8 <= bytes.length) {
      const chunkLength = view.getUint32(offset);
      const chunkType = String.fromCharCode(
        bytes[offset + 4],
        bytes[offset + 5],
        bytes[offset + 6],
        bytes[offset + 7]
      );
      const dataOffset = offset + 8;

      if (chunkType === 'IHDR' && dataOffset + 13 <= bytes.length) {
        const width = view.getUint32(dataOffset);
        const height = view.getUint32(dataOffset + 4);
        const bitDepth = bytes[dataOffset + 8];
        const colorType = bytes[dataOffset + 9];
        const interlaceMethod = bytes[dataOffset + 12];

        metadata.bitDepth = bitDepth;
        metadata.colorTypeCode = colorType;
        metadata.interlace = interlaceMethod === 1 ? 'Adam7 隔行扫描' : '逐行扫描 (标准)';
        metadata.aspectRatio = calculateAspectRatio(width, height);
        metadata.megapixels = `${((width * height) / 1000000).toFixed(2)} MP`;

        switch (colorType) {
          case 0:
            metadata.colorType = '灰度图像 (Grayscale)';
            metadata.hasAlpha = false;
            break;
          case 2:
            metadata.colorType = '真彩色 RGB (24-bit 无透明)';
            metadata.hasAlpha = false;
            break;
          case 3:
            metadata.colorType = '索引调色板色 (Indexed 8-bit)';
            metadata.hasAlpha = false;
            break;
          case 4:
            metadata.colorType = '灰度带透明 (Grayscale + Alpha)';
            metadata.hasAlpha = true;
            break;
          case 6:
            metadata.colorType = '真彩色 RGBA (32-bit 带透明通道)';
            metadata.hasAlpha = true;
            break;
          default:
            metadata.colorType = `自定义色彩模式 (${colorType})`;
            metadata.hasAlpha = false;
        }
      } else if (chunkType === 'sRGB') {
        metadata.colorSpace = 'sRGB 原彩色域 (标准)';
      } else if (chunkType === 'iCCP') {
        metadata.colorSpace = 'ICC 嵌入式色彩配置文件';
      } else if (chunkType === 'tRNS') {
        metadata.hasAlpha = true;
        if (!metadata.colorType?.includes('透明')) {
          metadata.colorType = `${metadata.colorType || '自定义'} (含透明度蒙版)`;
        }
      } else if (chunkType === 'pHYs' && dataOffset + 9 <= bytes.length) {
        const ppuX = view.getUint32(dataOffset);
        const unit = bytes[dataOffset + 8];
        if (unit === 1) {
          // unit is meter -> convert to DPI (1 inch = 0.0254 m)
          metadata.dpi = Math.round(ppuX * 0.0254);
        }
      }

      // Next chunk: length + 4 (length bytes) + 4 (type bytes) + 4 (CRC)
      offset += 12 + chunkLength;
      if (chunkType === 'IEND') break;
    }

    return metadata;
  } catch (e) {
    console.warn('Could not parse PNG metadata chunks:', e);
    return {
      mimeType: file.type || 'image/png',
      colorSpace: '标准 RGB',
    };
  }
}

/**
 * Loads an image file and retrieves its native dimensions, Object URL, and metadata.
 */
export async function inspectPngFile(file: File): Promise<{
  width: number;
  height: number;
  url: string;
  metadata: ImageMetadata;
}> {
  const url = URL.createObjectURL(file);
  const binaryMetadataPromise = parsePngBinaryMetadata(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const meta = await binaryMetadataPromise;

      if (!meta.aspectRatio) {
        meta.aspectRatio = calculateAspectRatio(width, height);
      }
      if (!meta.megapixels) {
        meta.megapixels = `${((width * height) / 1000000).toFixed(2)} MP`;
      }
      if (!meta.bitDepth) {
        meta.bitDepth = 8;
      }
      if (!meta.colorType) {
        meta.colorType = '真彩色 RGBA (32-bit)';
        meta.hasAlpha = true;
      }

      resolve({
        width,
        height,
        url,
        metadata: meta,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取图片文件，请确保文件为有效图片。'));
    };
    img.src = url;
  });
}

/**
 * Converts a PNG image to JPG with full fidelity, preserving native resolution and colors,
 * with customizable background fill for transparent regions.
 */
export async function convertPngToJpg(
  file: File,
  config: ConversionConfig
): Promise<{
  blob: Blob;
  url: string;
  width: number;
  height: number;
  size: number;
  durationMs: number;
}> {
  const startTime = performance.now();
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (width === 0 || height === 0) {
          URL.revokeObjectURL(objectUrl);
          throw new Error('图片尺寸无效 (0x0)');
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        // Context configuration for maximum color accuracy
        const ctx = canvas.getContext('2d', {
          colorSpace: 'srgb',
          alpha: false, // Disabling canvas alpha produces solid RGB buffer
        });

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          throw new Error('无法创建 Canvas 2D 上下文');
        }

        // Fill background color for transparent pixels (Default: Solid White #FFFFFF)
        ctx.fillStyle = config.backgroundColor || '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw original PNG onto the canvas at 1:1 scale
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPG Blob with specified quality (1.0 = maximum visual fidelity)
        const qualityClamped = Math.min(Math.max(config.quality, 0.1), 1.0);
        
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error('JPG 编码生成失败'));
              return;
            }

            const convertedUrl = URL.createObjectURL(blob);
            const durationMs = Math.round(performance.now() - startTime);

            resolve({
              blob,
              url: convertedUrl,
              width,
              height,
              size: blob.size,
              durationMs,
            });
          },
          'image/jpeg',
          qualityClamped
        );
      } catch (err: any) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('图片加载解析失败，可能文件损坏'));
    };

    img.src = objectUrl;
  });
}

/**
 * Executes async tasks with a given concurrency pool limit
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      const item = items[idx];
      results[idx] = await worker(item, idx);
    }
  };

  const pool = Array.from({ length: Math.min(limit, items.length) }, () => runWorker());
  await Promise.all(pool);
  return results;
}

/**
 * Format bytes to readable string (e.g. 1.25 MB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Resolves dynamic tokens like {index}, {index:2}, {index:3}, {date}, {time}, {timestamp}, {name}
 */
export function resolveDynamicTokens(
  template: string,
  baseName: string,
  index = 1,
  dateObj = new Date()
): string {
  if (!template) return '';

  const padZero = (num: number, length = 2) => String(num).padStart(length, '0');

  const year = dateObj.getFullYear();
  const month = padZero(dateObj.getMonth() + 1);
  const day = padZero(dateObj.getDate());
  const hours = padZero(dateObj.getHours());
  const minutes = padZero(dateObj.getMinutes());
  const seconds = padZero(dateObj.getSeconds());

  const dateStr = `${year}-${month}-${day}`;
  const dateCompact = `${year}${month}${day}`;
  const timeStr = `${hours}-${minutes}-${seconds}`;
  const timeCompact = `${hours}${minutes}${seconds}`;
  const timestampStr = `${dateCompact}_${timeCompact}`;

  let result = template;

  // Replace {name}
  result = result.replace(/\{name\}/gi, baseName);

  // Replace {index} or {index:N}
  result = result.replace(/\{index(?::(\d+))?\}/gi, (_, padding) => {
    const padLen = padding ? parseInt(padding, 10) : 1;
    return String(index).padStart(padLen, '0');
  });

  // Replace {timestamp}
  result = result.replace(/\{timestamp\}/gi, timestampStr);

  // Replace {date}
  result = result.replace(/\{date\}/gi, dateStr);

  // Replace {time}
  result = result.replace(/\{time\}/gi, timeStr);

  return result;
}

/**
 * Generate output filename based on original name and config with dynamic token support
 */
export function getOutputFilename(
  originalName: string,
  config: ConversionConfig,
  index = 1
): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const rawPrefix = config.namePrefix || '';
  const rawSuffix = config.nameSuffix || '';
  const ext = config.extension || 'jpg';

  const prefix = resolveDynamicTokens(rawPrefix, baseName, index);
  const suffix = resolveDynamicTokens(rawSuffix, baseName, index);

  return `${prefix}${baseName}${suffix}.${ext}`;
}

import { ConversionConfig, ImageItem } from '../types';

/**
 * Loads an image file and retrieves its native dimensions and Object URL.
 */
export async function inspectPngFile(file: File): Promise<{
  width: number;
  height: number;
  url: string;
}> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        url,
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

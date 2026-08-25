/**
 * Generates sample PNG images with transparency and fine details for instant testing
 */
export async function createSamplePngFiles(): Promise<File[]> {
  const samples = [
    {
      name: 'alpha_logo_transparency.png',
      width: 800,
      height: 800,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Transparent background with rich circular badge and transparent cutout
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#F59E0B');
        grad.addColorStop(0.5, '#EF4444');
        grad.addColorStop(1, '#8B5CF6');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w * 0.38, 0, Math.PI * 2);
        ctx.fill();

        // Cutout inner circle (transparent alpha)
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Inner star
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PNG 2 JPG', w / 2, h / 2 + w * 0.28);
      },
    },
    {
      name: 'vibrant_gradient_art.png',
      width: 1200,
      height: 800,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w / 1.5);
        bgGrad.addColorStop(0, '#06B6D4');
        bgGrad.addColorStop(0.5, '#3B82F6');
        bgGrad.addColorStop(1, '#1E1B4B');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Intricate geometric rings for high detail testing
        for (let r = 50; r < 400; r += 20) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + (r / 400) * 0.4})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('100% 像素级保真度测试卡', w / 2, h / 2);
      },
    },
    {
      name: 'product_showcase_alpha.png',
      width: 900,
      height: 900,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Soft drop shadow and floating product card with transparent canvas
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 15;

        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.roundRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6, 40);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('电商产品图', w / 2, h / 2 - 20);
        ctx.font = '24px sans-serif';
        ctx.fillText('透明边缘与白底填充测试', w / 2, h / 2 + 40);
      },
    },
    {
      name: 'fine_typography_chart.png',
      width: 1000,
      height: 600,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 28px monospace';
        ctx.fillText('Sub-pixel Color Accuracy Verification', 60, 80);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '16px monospace';
        for (let i = 0; i < 10; i++) {
          ctx.fillText(`0x${(i * 1024 + 4096).toString(16).toUpperCase()} // High Precision Render Pipeline [Pass ${i + 1}]`, 60, 140 + i * 36);
        }
      },
    },
  ];

  const files: File[] = [];

  for (const sample of samples) {
    const canvas = document.createElement('canvas');
    canvas.width = sample.width;
    canvas.height = sample.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      sample.draw(ctx, sample.width, sample.height);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, 'image/png')
      );
      if (blob) {
        files.push(new File([blob], sample.name, { type: 'image/png' }));
      }
    }
  }

  return files;
}

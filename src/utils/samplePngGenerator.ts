/**
 * Creates high-quality demo sample PNG images with alpha transparency and rich colors
 * so users can test immediately.
 */
export async function createSamplePngFiles(): Promise<File[]> {
  const samples = [
    {
      name: 'sample_transparency_logo.png',
      width: 1200,
      height: 1200,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Transparent background
        // Draw colorful glowing circles
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#F59E0B');
        grad.addColorStop(0.5, '#EC4899');
        grad.addColorStop(1, '#6366F1');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w * 0.38, 0, Math.PI * 2);
        ctx.fill();

        // Inner transparent cutout
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Reset
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HIGH FIDELITY PNG', w / 2, h / 2);
      },
    },
    {
      name: 'sample_nature_landscape.png',
      width: 1920,
      height: 1080,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
        skyGrad.addColorStop(0, '#0F172A');
        skyGrad.addColorStop(0.6, '#38BDF8');
        skyGrad.addColorStop(1, '#FDE047');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Sun
        ctx.fillStyle = '#FFFBEB';
        ctx.beginPath();
        ctx.arc(w * 0.75, h * 0.3, 80, 0, Math.PI * 2);
        ctx.fill();

        // Mountains
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(w * 0.25, h * 0.4);
        ctx.lineTo(w * 0.55, h);
        ctx.fill();

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.moveTo(w * 0.35, h);
        ctx.lineTo(w * 0.75, h * 0.5);
        ctx.lineTo(w, h);
        ctx.fill();

        // Overlay text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px sans-serif';
        ctx.fillText('1080P Ultra-Clear PNG Source', 80, h - 80);
      },
    },
    {
      name: 'sample_product_badge.png',
      width: 1600,
      height: 900,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Transparent canvas with centered modern badge
        ctx.clearRect(0, 0, w, h);

        // Rounded badge
        const bw = 800;
        const bh = 500;
        const bx = (w - bw) / 2;
        const by = (h - bh) / 2;

        const badgeGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
        badgeGrad.addColorStop(0, '#10B981');
        badgeGrad.addColorStop(1, '#065F46');

        ctx.fillStyle = badgeGrad;
        ctx.roundRect(bx, by, bw, bh, 32);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 56px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PRODUCT SPEC 2026', w / 2, by + 180);

        ctx.font = '32px sans-serif';
        ctx.fillStyle = '#A7F3D0';
        ctx.fillText('Transparent Alpha Channel Test', w / 2, by + 260);
      },
    },
  ];

  const files: File[] = [];

  for (const s of samples) {
    const canvas = document.createElement('canvas');
    canvas.width = s.width;
    canvas.height = s.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      s.draw(ctx, s.width, s.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (blob) {
        files.push(new File([blob], s.name, { type: 'image/png' }));
      }
    }
  }

  return files;
}

// Share links. Every link carries ?ref= plus UTM tags so observed attribution works.

export type ShareChannel = 'whatsapp' | 'linkedin' | 'facebook' | 'instagram' | 'copy';

const UTM_SOURCE: Record<ShareChannel, string> = {
  whatsapp: 'whatsapp',
  linkedin: 'linkedin',
  facebook: 'facebook',
  instagram: 'instagram',
  copy: 'referral',
};

export function referralUrl(origin: string, code: string, channel: ShareChannel, medium = 'referral'): string {
  const params = new URLSearchParams({ ref: code, utm_source: UTM_SOURCE[channel], utm_medium: medium, utm_campaign: 'ai60' });
  return `${origin}/?${params.toString()}`;
}

/** Links for ambassador/club codes tag utm_source with the owner type. */
export function ownerUrl(origin: string, code: string, ownerType: 'student' | 'ambassador' | 'club'): string {
  if (ownerType === 'student') return referralUrl(origin, code, 'copy');
  const params = new URLSearchParams({ ref: code, utm_source: ownerType, utm_medium: 'referral', utm_campaign: 'ai60' });
  return `${origin}/?${params.toString()}`;
}

export function defaultInviteMessage(campaignName: string): string {
  return `I just registered for "${campaignName}" — a free, beginner-friendly online workshop for engineering students. Join me using my link:`;
}

export function composeMessage(message: string, url: string): string {
  return `${message.trim()}\n${url}`;
}

export const whatsappShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
export const linkedinShareUrl = (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
export const facebookShareUrl = (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

export function instagramCaption(campaignName: string, code: string): string {
  return `${campaignName} 🚀\nFree, online, beginner-friendly workshop for engineering students.\nRegister with my code ${code} — link in bio / DM me for the link.\n#AI #EngineeringStudents #BuildWithAI`;
}

/** Draws a 1080×1080 campaign card. Returns a PNG blob. */
export async function campaignCardPng(campaignName: string, code: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, '#14335d');
  grad.addColorStop(1, '#1e4a85');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = '#b8cbe6';
  ctx.font = '600 36px system-ui, sans-serif';
  ctx.fillText('FREE · ONLINE · BEGINNER-FRIENDLY', 90, 170);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 92px system-ui, sans-serif';
  wrap(ctx, campaignName, 90, 320, 900, 110);
  ctx.font = '500 40px system-ui, sans-serif';
  ctx.fillStyle = '#dce6f4';
  ctx.fillText('For engineering students in India', 90, 760);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(90, 820, 900, 140);
  ctx.fillStyle = '#14335d';
  ctx.font = '700 56px ui-monospace, monospace';
  ctx.fillText(`Code: ${code}`, 130, 910);
  ctx.fillStyle = '#8aa9d4';
  ctx.font = '400 24px system-ui, sans-serif';
  ctx.fillText('Prototype demo · not affiliated with NxtWave', 90, 1030);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not render card'))), 'image/png'));
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lineHeight: number) {
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else line = test;
  }
  ctx.fillText(line, x, y);
}

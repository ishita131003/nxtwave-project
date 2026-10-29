import { Check, Copy, Download, Facebook, Instagram, Linkedin, MessageCircle, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Button, buttonClass } from '../ui/Button';
import { Notice } from '../ui/Feedback';
import { TextAreaField } from '../ui/Field';
import { useClipboard } from '../../hooks/useClipboard';
import { downloadBlob } from '../../lib/csv';
import {
  campaignCardPng,
  composeMessage,
  defaultInviteMessage,
  facebookShareUrl,
  instagramCaption,
  linkedinShareUrl,
  referralUrl,
  whatsappShareUrl,
} from '../../lib/share';

function CopyStatus({ status, id }: { status: { key: string; ok: boolean } | null; id: string }) {
  if (status?.key !== id) return null;
  return status.ok ? (
    <span role="status" className="flex items-center gap-1 text-sm text-ink">
      <Check aria-hidden className="h-4 w-4" /> Copied
    </span>
  ) : (
    <span role="alert" className="text-sm text-red-700">
      This browser blocked copying. Press and hold the text above to copy it.
    </span>
  );
}

async function shareOrCopy(text: string, url: string, copy: (key: string, text: string) => Promise<void>) {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text, url });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }
  await copy('share', composeMessage(text, url));
}

/** The signature: tear a strip off the circular and the referral link is copied. */
export function ReferralStrips({ code, url }: { code: string; url: string }) {
  const { status, copy } = useClipboard();
  const [torn, setTorn] = useState<number[]>([]);
  return (
    <div>
      <div className="flex">
        {Array.from({ length: 8 }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Tear off a strip to copy your link (${code})`}
            onClick={() => {
              setTorn((t) => (t.includes(i) ? t : [...t, i]));
              void copy('strip', url);
            }}
            disabled={torn.includes(i)}
            className={`strip flex h-24 flex-1 items-center justify-center bg-lemon font-mono text-[11px] font-bold tracking-wide text-ink [writing-mode:vertical-rl] first:border-l-0 hover:bg-[#d4e0f1] ${
              torn.includes(i) ? 'strip-torn' : ''
            } ${i >= 5 ? 'max-sm:hidden' : ''}`}
          >
            {code}
          </button>
        ))}
      </div>
      <div className="mt-2 flex min-h-6 items-center gap-2 text-sm text-ink/75">
        {status?.key === 'strip' ? <CopyStatus status={status} id="strip" /> : 'Tear off a strip to copy your link.'}
      </div>
    </div>
  );
}

/** Compact version for the dashboard: link + copy + share. */
export function QuickShare({ code, campaignName }: { code: string; campaignName: string }) {
  const url = referralUrl(window.location.origin, code, 'copy');
  const { status, copy } = useClipboard();
  return (
    <div className="space-y-3">
      <p className="break-all font-mono text-sm text-ink">{url}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => copy('link', url)}>
          <Copy aria-hidden className="h-4 w-4" /> Copy link
        </Button>
        <Button onClick={() => shareOrCopy(defaultInviteMessage(campaignName), url, copy)}>
          <Share2 aria-hidden className="h-4 w-4" /> Share
        </Button>
        <CopyStatus status={status} id="link" />
        <CopyStatus status={status} id="share" />
      </div>
    </div>
  );
}

export function ShareTools({ code, campaignName }: { code: string; campaignName: string }) {
  const origin = window.location.origin;
  const [message, setMessage] = useState(() => defaultInviteMessage(campaignName));
  const { status, copy } = useClipboard();
  const [cardError, setCardError] = useState<string | null>(null);
  const copyUrl = referralUrl(origin, code, 'copy');
  const caption = instagramCaption(campaignName, code);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-ink">Your link</h3>
        <p className="mt-2 break-all rounded-[3px] bg-wall px-3 py-2 font-mono text-sm text-ink">{copyUrl}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => copy('link', copyUrl)}>
            <Copy aria-hidden className="h-4 w-4" /> Copy link
          </Button>
          <CopyStatus status={status} id="link" />
        </div>
      </div>

      <div>
        <TextAreaField
          label="Invite message"
          hint="Edit it however you like. Your link is added at the end."
          rows={3}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => copy('message', composeMessage(message, copyUrl))}>
            <Copy aria-hidden className="h-4 w-4" /> Copy message
          </Button>
          <Button onClick={() => shareOrCopy(message, copyUrl, copy)}>
            <Share2 aria-hidden className="h-4 w-4" /> Share…
          </Button>
          <CopyStatus status={status} id="message" />
          <CopyStatus status={status} id="share" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink">Share directly</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <a
            className={buttonClass('secondary')}
            href={whatsappShareUrl(composeMessage(message, referralUrl(origin, code, 'whatsapp')))}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle aria-hidden className="h-4 w-4" /> WhatsApp
          </a>
          <a className={buttonClass('secondary')} href={linkedinShareUrl(referralUrl(origin, code, 'linkedin'))} target="_blank" rel="noopener noreferrer">
            <Linkedin aria-hidden className="h-4 w-4" /> LinkedIn
          </a>
          <a className={buttonClass('secondary')} href={facebookShareUrl(referralUrl(origin, code, 'facebook'))} target="_blank" rel="noopener noreferrer">
            <Facebook aria-hidden className="h-4 w-4" /> Facebook
          </a>
        </div>
        <p className="mt-2 text-xs text-ink/75">LinkedIn and Facebook only accept the link; paste your message into the post yourself.</p>
      </div>

      <div className="rounded-[2px] bg-wall p-4 ring-1 ring-ink/15">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Instagram aria-hidden className="h-4 w-4" /> Instagram
        </h3>
        <p className="mt-1 text-sm text-ink/85">Instagram can't take links in posts. Download the campaign card, then paste the caption.</p>
        <pre className="mt-3 whitespace-pre-wrap rounded-[3px] bg-white p-3 font-sans text-sm text-ink ring-1 ring-ink/15">{caption}</pre>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              setCardError(null);
              try {
                downloadBlob(`campaign-card-${code}.png`, await campaignCardPng(campaignName, code));
              } catch (err) {
                setCardError(err instanceof Error ? err.message : 'Could not create the card.');
              }
            }}
          >
            <Download aria-hidden className="h-4 w-4" /> Download card (PNG)
          </Button>
          <Button variant="secondary" onClick={() => copy('caption', caption)}>
            <Copy aria-hidden className="h-4 w-4" /> Copy caption
          </Button>
          <CopyStatus status={status} id="caption" />
        </div>
        {cardError && (
          <div className="mt-3">
            <Notice tone="error">{cardError}</Notice>
          </div>
        )}
      </div>
    </div>
  );
}

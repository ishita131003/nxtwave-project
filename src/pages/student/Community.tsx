import { MessageCircle } from 'lucide-react';
import { Button, buttonClass } from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { DataView } from '../../components/ui/Feedback';
import { communityUrl, usePublicCampaign } from '../../hooks/useStudent';

export default function Community() {
  const campaign = usePublicCampaign();
  return (
    <DataView state={campaign}>
      {(c) => {
        const url = communityUrl(c.whatsappUrl);
        return (
          <>
            <PageHeader title="Community" description="Updates and questions about the workshop happen in the WhatsApp community." />
            <Card>
              <p className="text-sm text-ink/85">
                Join to get announcements, including the date and joining details when they are shared, and to ask questions.
              </p>
              <div className="mt-4">
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClass('primary')}>
                    <MessageCircle aria-hidden className="h-4 w-4" /> Join the WhatsApp community
                  </a>
                ) : (
                  <Button disabled aria-describedby="community-soon">
                    <MessageCircle aria-hidden className="h-4 w-4" /> Community link coming soon
                  </Button>
                )}
              </div>
              {!url && (
                <p id="community-soon" className="mt-2 text-sm text-ink/75">
                  The organisers haven't added the link yet. Check back later.
                </p>
              )}
            </Card>
          </>
        );
      }}
    </DataView>
  );
}

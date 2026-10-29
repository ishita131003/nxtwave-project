import { ResetDemoDataButton } from '../../components/layout/Chrome';
import { buttonClass } from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { Notice } from '../../components/ui/Feedback';
import { STORAGE_KEY } from '../../api/localStore';

export default function AdminSettings() {
  return (
    <>
      <PageHeader title="Demo settings" description="Controls for the local demo itself, separate from campaign settings." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Reset demo data">
          <p className="text-sm text-ink/85">
            Restores the original fictional seed: 26 registrations across 7 days, 3 ambassador/club codes, 8 suggestions and the planned budget.
            Accounts and data you created in this browser are removed and everyone is signed out.
          </p>
          <ResetDemoDataButton className={buttonClass('danger', 'mt-4')} />
        </Card>
        <Card title="Where the data lives">
          <div className="space-y-3 text-sm text-ink/85">
            <p>
              Everything is stored in this browser's localStorage under the key <code className="rounded bg-wall px-1 font-mono">{STORAGE_KEY}</code>.
              Other browsers and devices can't see it.
            </p>
            <Notice tone="warning" title="This is not real security">
              Anyone with access to this browser can read or edit the stored data in devtools, including changing roles. The service layer checks roles
              on every call, but that only protects against mistakes in the UI, not a determined user.
            </Notice>
          </div>
        </Card>
      </div>
    </>
  );
}

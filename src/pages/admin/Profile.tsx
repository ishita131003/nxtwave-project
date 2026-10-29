import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataSource } from '../../api';
import type { PublicUser } from '../../api/dataSource';
import { ChangePassword } from '../../components/account/ChangePassword';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { DataView, Notice } from '../../components/ui/Feedback';
import { TextField } from '../../components/ui/Field';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAuth, useSession } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { formatDateTime } from '../../lib/dates';

function Details({ me }: { me: PublicUser }) {
  const session = useSession();
  const [name, setName] = useState(me.name);
  const [saved, setSaved] = useState(false);
  const { pending, error, fieldErrors, run } = useAsyncAction();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    const ok = await run(async () => {
      await dataSource.updateAdminName(session, name);
      return true;
    });
    if (ok) setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">Saved.</Notice>}
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
      <TextField label="Email" value={me.email} readOnly disabled />
      <TextField label="Role" value={me.role} readOnly disabled hint="Roles can't be changed in the app." />
      <TextField label="Session expires" value={formatDateTime(session.expiresAt) + ' IST'} readOnly disabled hint="Sessions last 8 hours." />
      <Button type="submit" disabled={pending}>
        Save name
      </Button>
    </form>
  );
}

export default function AdminProfile() {
  const session = useSession();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const me = useData(() => dataSource.getMe(session), [session.token]);
  return (
    <>
      <PageHeader title="Profile" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Your details">
          <DataView state={me}>{(u) => <Details key={u.name} me={u} />}</DataView>
        </Card>
        <div className="space-y-4">
          <Card title="Change password">
            <ChangePassword session={session} />
          </Card>
          <Card title="Sign out">
            <Button
              variant="secondary"
              onClick={async () => {
                await logout();
                navigate('/admin/login');
              }}
            >
              Log out
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}

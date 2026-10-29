import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataSource } from '../../api';
import type { StudentProfile } from '../../api/dataSource';
import { ChangePassword } from '../../components/account/ChangePassword';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataView, Notice } from '../../components/ui/Feedback';
import { SelectField, TextField } from '../../components/ui/Field';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAuth, useSession } from '../../hooks/useAuth';
import { useStudentProfile } from '../../hooks/useStudent';
import { BRANCHES, YEAR_LABELS, YEARS, type StudentProfilePatch } from '../../lib/schema';

function ProfileForm({ profile }: { profile: StudentProfile }) {
  const session = useSession();
  const { pending, error, fieldErrors, run } = useAsyncAction();
  const [saved, setSaved] = useState(false);
  const r = profile.registration;
  const [form, setForm] = useState({
    name: profile.user.name,
    college: r.college,
    branch: r.branch,
    year: r.year,
    city: r.city ?? '',
    state: r.state ?? '',
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    const ok = await run(async () => {
      await dataSource.updateMyProfile(session, form as StudentProfilePatch);
      return true;
    });
    if (ok) setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">Profile saved.</Notice>}
      <TextField label="Email" value={profile.user.email} readOnly disabled hint="Your email identifies your registration and can't be changed." />
      <TextField label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={fieldErrors.name} />
      <TextField label="College" value={form.college} onChange={set('college')} error={fieldErrors.college} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Branch" value={form.branch} onChange={set('branch')} options={BRANCHES.map((b) => ({ value: b, label: b }))} />
        <SelectField label="Year" value={form.year} onChange={set('year')} options={YEARS.map((y) => ({ value: y, label: YEAR_LABELS[y] }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="City" optional value={form.city} onChange={set('city')} error={fieldErrors.city} />
        <TextField label="State" optional value={form.state} onChange={set('state')} error={fieldErrors.state} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}

export default function StudentProfilePage() {
  const session = useSession();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const profile = useStudentProfile();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <DataView state={profile}>
      {(p) => (
        <>
          <PageHeader title="Profile" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Your details">
              <ProfileForm profile={p} />
            </Card>
            <div className="space-y-4">
              <Card title="Change password">
                <ChangePassword session={session} />
              </Card>
              <Card title="Account">
                <div className="space-y-4">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await logout();
                      navigate('/login');
                    }}
                  >
                    Log out
                  </Button>
                  {p.registration.deletion_requested ? (
                    <Notice tone="info">You've asked for your account to be deleted. The team will review the request.</Notice>
                  ) : (
                    <div>
                      <p className="text-sm text-ink/85">
                        Want your registration removed? This flags your account for the team to delete; nothing is removed automatically.
                      </p>
                      <Button variant="danger" className="mt-3" onClick={() => setConfirmDelete(true)}>
                        Request account deletion
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
          <ConfirmDialog
            open={confirmDelete}
            title="Request account deletion?"
            confirmLabel="Send request"
            tone="danger"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={async () => {
              await dataSource.requestAccountDeletion(session);
              setConfirmDelete(false);
            }}
          >
            The campaign team will see your request. You can keep using your account until they act on it.
          </ConfirmDialog>
        </>
      )}
    </DataView>
  );
}

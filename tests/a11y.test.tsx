import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppRoutes } from '../src/App';
import { dataSource } from '../src/api';
import { DEMO_ADMIN, DEMO_STUDENT } from '../src/api/seed';
import { AuthProvider } from '../src/hooks/useAuth';

// jsdom cannot compute rendered colours, so axe's colour-contrast rule is disabled here;
// contrast is checked with axe in a real browser instead (see README).
async function seriousViolations() {
  const results = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } });
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  await dataSource.init();
});
afterEach(cleanup);

describe('axe: no serious or critical violations', () => {
  it.each([
    ['/', /Build your first AI project/i],
    ['/register', /Register for the workshop/i],
    ['/login', /Student log in/i],
    ['/admin/login', /Admin log in/i],
    ['/forgot-password', /Reset your password/i],
  ])('public page %s', async (path, heading) => {
    renderAt(path);
    await screen.findByRole('heading', { level: 1, name: heading });
    expect(await seriousViolations()).toEqual([]);
  });

  it.each([
    ['/student/dashboard', /Hi, Demo/i],
    ['/student/referrals', /Refer friends/i],
    ['/student/suggestions', /Suggestions/i],
    ['/student/profile', /Profile/i],
  ])('student page %s', async (path, heading) => {
    await dataSource.login(DEMO_STUDENT.email, DEMO_STUDENT.password, 'student');
    renderAt(path);
    await screen.findByRole('heading', { level: 1, name: heading });
    expect(await seriousViolations()).toEqual([]);
  });

  it.each([
    ['/admin/dashboard', /Campaign dashboard/i],
    ['/admin/registrations', /Registrations/i],
    ['/admin/referrals', /Referral codes/i],
    ['/admin/analytics', /Analytics/i],
    ['/admin/campaigns', /Campaign settings/i],
  ])('admin page %s', async (path, heading) => {
    await dataSource.login(DEMO_ADMIN.email, DEMO_ADMIN.password, 'admin');
    renderAt(path);
    await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 5000 });
    expect(await seriousViolations()).toEqual([]);
  });

  it('a student is blocked from /admin/* in the UI', async () => {
    await dataSource.login(DEMO_STUDENT.email, DEMO_STUDENT.password, 'student');
    renderAt('/admin/dashboard');
    expect(await screen.findByRole('heading', { level: 1, name: /Admins only/i })).toBeInTheDocument();
  });
});

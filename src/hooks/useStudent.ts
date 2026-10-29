import { dataSource } from '../api';
import { WHATSAPP_URL } from '../lib/schema';
import { useSession } from './useAuth';
import { useData } from './useData';

export function useStudentProfile() {
  const session = useSession();
  return useData(() => dataSource.getMyProfile(session), [session.token]);
}

export function usePublicCampaign() {
  return useData(() => dataSource.getPublicCampaign(), []);
}

/** Admin setting wins, then the VITE_WHATSAPP_COMMUNITY_URL build variable. Anything not a WhatsApp invite is ignored. */
export function communityUrl(adminSetting: string | undefined): string | undefined {
  const candidate = adminSetting || import.meta.env.VITE_WHATSAPP_COMMUNITY_URL;
  return candidate && WHATSAPP_URL.safeParse(candidate).success ? candidate : undefined;
}

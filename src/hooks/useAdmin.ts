import { dataSource } from '../api';
import { useSession } from './useAuth';
import { useData } from './useData';

export function useMetricsData() {
  const session = useSession();
  return useData(() => dataSource.getMetricsData(session), [session.token]);
}

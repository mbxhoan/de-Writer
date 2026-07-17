import PhaseOneApp from '@/components/phase-one-app';
import { getHydratedState } from '@/lib/phase-one/service';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const initialState = await getHydratedState();
  return <PhaseOneApp initialState={initialState} />;
}

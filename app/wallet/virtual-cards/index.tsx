import VirtualCardsListScreen from '../../../src/screens/VirtualCardsListScreen';
import { ServiceGate } from '../../../src/components/ServiceGate';
import { SERVICE_CODES } from '../../../src/lib/service-availability';

export default function VirtualCardsIndexRoute() {
  return (
    <ServiceGate serviceCode={SERVICE_CODES.virtualCard} title="Virtual Cards">
      <VirtualCardsListScreen />
    </ServiceGate>
  );
}

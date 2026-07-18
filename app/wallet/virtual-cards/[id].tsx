import VirtualCardDetailScreen from '../../../src/screens/VirtualCardDetailScreen';
import { ServiceGate } from '../../../src/components/ServiceGate';
import { SERVICE_CODES } from '../../../src/lib/service-availability';

export default function VirtualCardDetailRoute() {
  return (
    <ServiceGate serviceCode={SERVICE_CODES.virtualCard} title="Virtual Card">
      <VirtualCardDetailScreen />
    </ServiceGate>
  );
}

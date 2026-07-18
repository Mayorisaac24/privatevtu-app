import VirtualCardCreateScreen from '../../../src/screens/VirtualCardCreateScreen';
import { ServiceGate } from '../../../src/components/ServiceGate';
import { SERVICE_CODES } from '../../../src/lib/service-availability';

export default function VirtualCardCreateRoute() {
  return (
    <ServiceGate serviceCode={SERVICE_CODES.virtualCard} title="New Virtual Card">
      <VirtualCardCreateScreen />
    </ServiceGate>
  );
}

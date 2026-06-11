import CableScreen from '../(tabs)/cable';
import { ServiceGate } from '../../src/components/ServiceGate';
import { SERVICE_CODES } from '../../src/lib/service-availability';

export default function CableRoute() {
  return (
    <ServiceGate serviceCode={SERVICE_CODES.cable} title="Cable TV">
      <CableScreen />
    </ServiceGate>
  );
}

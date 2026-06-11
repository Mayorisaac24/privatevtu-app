import DataScreen from '../(tabs)/data';
import { ServiceGate } from '../../src/components/ServiceGate';
import { SERVICE_CODES } from '../../src/lib/service-availability';

export default function DataRoute() {
  return (
    <ServiceGate serviceCode={SERVICE_CODES.data} title="Data">
      <DataScreen />
    </ServiceGate>
  );
}

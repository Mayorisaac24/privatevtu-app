import ElectricityScreen from '../(tabs)/electricity';
import { ServiceGate } from '../../src/components/ServiceGate';
import { SERVICE_CODES } from '../../src/lib/service-availability';

export default function ElectricityRoute() {
  return (
    <ServiceGate serviceCode={SERVICE_CODES.electricity} title="Electricity">
      <ElectricityScreen />
    </ServiceGate>
  );
}

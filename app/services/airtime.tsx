import AirtimePurchaseScreen from '../../src/screens/AirtimePurchaseScreen';
import { ServiceGate } from '../../src/components/ServiceGate';
import { SERVICE_CODES } from '../../src/lib/service-availability';

export default function AirtimeScreen() {
  return (
    <ServiceGate serviceCode={SERVICE_CODES.airtime} title="Airtime">
      <AirtimePurchaseScreen />
    </ServiceGate>
  );
}

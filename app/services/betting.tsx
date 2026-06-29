import BettingScreen from '../(tabs)/betting';
import { ServiceGate } from '../../src/components/ServiceGate';
import { SERVICE_CODES } from '../../src/lib/service-availability';

export default function BettingRoute() {
  return (
    <ServiceGate serviceCode={SERVICE_CODES.betting} title="Betting">
      <BettingScreen />
    </ServiceGate>
  );
}

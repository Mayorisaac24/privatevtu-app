import { useLocalSearchParams } from 'expo-router';
import TransactionDetailScreen from '../../src/screens/TransactionDetailScreen';

export default function TransactionDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TransactionDetailScreen id={String(id || '')} />;
}

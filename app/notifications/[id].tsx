import { useLocalSearchParams } from 'expo-router';
import NotificationDetailScreen from '../../src/screens/NotificationDetailScreen';

export default function NotificationDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NotificationDetailScreen id={String(id || '')} />;
}

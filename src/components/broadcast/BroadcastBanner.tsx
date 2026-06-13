import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCachedActiveBroadcasts } from '../../lib/marketing-content-cache';
import {
  dismissBroadcast,
  getDismissedBroadcastIds,
  getSeenModalBroadcastIds,
  markModalBroadcastSeen,
} from '../../lib/broadcast-storage';
import {
  openBroadcastAction,
  type AppBroadcast,
  type BroadcastScreenKey,
} from '../../lib/broadcast-navigation';
import { Colors, Spacing } from '../../theme';
import { GlassSurface } from '../ui/GlassSurface';

type Props = {
  screen: BroadcastScreenKey;
};

export function BroadcastBanner({ screen }: Props) {
  const [items, setItems] = useState<AppBroadcast[]>([]);

  const loadBroadcasts = useCallback(async () => {
    try {
      const [broadcasts, dismissed] = await Promise.all([
        getCachedActiveBroadcasts({ screen }),
        getDismissedBroadcastIds(),
      ]);
      if (!broadcasts.length) return;

      const visible = broadcasts.filter((item) => {
        if (item.displayType !== 'ON_PAGE_BANNER' && item.displayType !== 'ON_PAGE_NOTIFICATION') {
          return false;
        }
        if (item.displayType === 'ON_PAGE_NOTIFICATION' && dismissed.has(item.id)) {
          return false;
        }
        return true;
      });

      setItems(visible);
    } catch {
      // Optional content.
    }
  }, [screen]);

  useEffect(() => {
    void loadBroadcasts();
  }, [loadBroadcasts]);

  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        if (item.displayType === 'ON_PAGE_BANNER') {
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={item.actionRoute ? 0.85 : 1}
              onPress={() => openBroadcastAction(item.actionRoute)}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.imageBanner} resizeMode="cover" />
              ) : (
                <GlassSurface variant="light" borderRadius={14} contentStyle={styles.textBanner}>
                  <Text style={styles.title}>{item.title}</Text>
                  {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
                  {item.actionRoute ? (
                    <Text style={styles.cta}>{item.actionLabel || 'Open'}</Text>
                  ) : null}
                </GlassSurface>
              )}
            </TouchableOpacity>
          );
        }

        return (
          <GlassSurface key={item.id} variant="tinted" borderRadius={14} contentStyle={styles.notification}>
            <View style={styles.notificationBody}>
              <Text style={styles.title}>{item.title}</Text>
              {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
              {item.actionRoute ? (
                <TouchableOpacity onPress={() => openBroadcastAction(item.actionRoute)}>
                  <Text style={styles.cta}>{item.actionLabel || 'Open'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                void dismissBroadcast(item.id).then(() => {
                  setItems((prev) => prev.filter((row) => row.id !== item.id));
                });
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color={Colors.muted} />
            </TouchableOpacity>
          </GlassSurface>
        );
      })}
    </View>
  );
}

export function BroadcastModalHost() {
  const [modal, setModal] = useState<AppBroadcast | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadModal = async () => {
      try {
        const [broadcasts, seen] = await Promise.all([
          getCachedActiveBroadcasts(),
          getSeenModalBroadcastIds(),
        ]);
        if (!mounted || !broadcasts.length) return;

        const candidate = broadcasts.find(
          (item) => item.displayType === 'IN_APP_MODAL' && !seen.has(item.id),
        );
        if (!candidate) return;

        setModal(candidate);
        setVisible(true);
      } catch {
        // Optional content.
      }
    };

    void loadModal();
    return () => {
      mounted = false;
    };
  }, []);

  const closeModal = async () => {
    if (modal) {
      await markModalBroadcastSeen(modal.id);
    }
    setVisible(false);
    setModal(null);
  };

  if (!modal) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => void closeModal()}>
      <Pressable style={styles.modalBackdrop} onPress={() => void closeModal()}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          {modal.imageUrl ? (
            <Image source={{ uri: modal.imageUrl }} style={styles.modalImage} resizeMode="cover" />
          ) : null}
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modal.title}</Text>
            {modal.body ? <Text style={styles.modalBody}>{modal.body}</Text> : null}
            {modal.actionRoute ? (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  openBroadcastAction(modal.actionRoute);
                  void closeModal();
                }}
              >
                <Text style={styles.modalButtonText}>{modal.actionLabel || 'Open'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.modalButton} onPress={() => void closeModal()}>
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  imageBanner: {
    width: '100%',
    height: 112,
    borderRadius: 14,
  },
  textBanner: {
    padding: Spacing.md,
    gap: 4,
  },
  notification: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  notificationBody: {
    flex: 1,
    gap: 4,
  },
  closeBtn: {
    padding: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  body: {
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 18,
  },
  cta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  modalImage: {
    width: '100%',
    height: 180,
  },
  modalContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  modalBody: {
    fontSize: 14,
    color: Colors.muted,
    lineHeight: 20,
  },
  modalButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Modal,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { recordAdView, shouldShowAd } from '../../lib/ad-storage';
import { getCachedActiveAds, type AdRecord } from '../../lib/marketing-content-cache';
import { GlassSurface } from '../ui/GlassSurface';
import { Colors, Spacing } from '../../theme';

export type AdScreenKey = 'HOME' | 'WALLET' | 'SERVICES' | 'HISTORY' | 'PROFILE' | 'TRANSFER' | 'FUND';

type AppAd = AdRecord;

type Props = {
  screen: AdScreenKey;
  placement?: AppAd['placement'];
};

async function filterVisibleAds(ads: AppAd[]): Promise<AppAd[]> {
  const visible: AppAd[] = [];
  for (const ad of ads) {
    const allowed = await shouldShowAd({
      id: ad.id,
      frequency: ad.frequency ?? 'UNLIMITED',
      maxImpressions: ad.maxImpressions,
    });
    if (allowed) visible.push(ad);
  }
  return visible;
}

function openAdAction(ad: AppAd): void {
  void api.trackAdClick(ad.id);
  const type = ad.actionType ?? (ad.linkUrl || ad.actionRoute ? 'URL' : 'NONE');
  const route = ad.actionRoute || ad.linkUrl;

  if (type === 'SCREEN' && route) {
    router.push(route as any);
    return;
  }

  if (route && (type === 'URL' || route.startsWith('http'))) {
    void Linking.openURL(route).catch(() => undefined);
  }
}

function TopBannerAd({ ad, onPress }: { ad: AppAd; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      {ad.imageUrl ? (
        <Image source={{ uri: ad.imageUrl }} style={styles.topBannerImage} resizeMode="cover" />
      ) : (
        <GlassSurface variant="light" borderRadius={14} contentStyle={styles.topBannerFallback}>
          <Text style={styles.bannerTitle}>{ad.title}</Text>
          {ad.subtitle ? <Text style={styles.bannerSubtitle}>{ad.subtitle}</Text> : null}
        </GlassSurface>
      )}
    </TouchableOpacity>
  );
}

function BannerAd({ ad, onPress }: { ad: AppAd; onPress: () => void }) {
  const hasAction = ad.actionType !== 'NONE' && Boolean(ad.actionRoute || ad.linkUrl);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={!hasAction}>
      <GlassSurface variant="light" borderRadius={14} style={styles.banner} contentStyle={styles.bannerInner}>
        {ad.imageUrl ? (
          <Image source={{ uri: ad.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
        ) : null}
        <View style={styles.bannerCopy}>
          <Text style={styles.bannerTitle} numberOfLines={1}>{ad.title}</Text>
          {ad.subtitle ? <Text style={styles.bannerSubtitle} numberOfLines={2}>{ad.subtitle}</Text> : null}
          {hasAction ? (
            <Text style={styles.bannerCta}>{ad.ctaLabel || 'Learn more'}</Text>
          ) : null}
        </View>
        {hasAction ? <Ionicons name="chevron-forward" size={18} color={Colors.primary} /> : null}
      </GlassSurface>
    </TouchableOpacity>
  );
}

function CardAd({ ad, onPress }: { ad: AppAd; onPress: () => void }) {
  const hasAction = ad.actionType !== 'NONE' && Boolean(ad.actionRoute || ad.linkUrl);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.cardWrap} disabled={!hasAction}>
      <GlassSurface variant="light" borderRadius={16} style={styles.card} contentStyle={styles.cardInner}>
        {ad.imageUrl ? (
          <Image source={{ uri: ad.imageUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="megaphone-outline" size={28} color={Colors.primary} />
          </View>
        )}
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{ad.title}</Text>
          {ad.subtitle ? <Text style={styles.cardSubtitle}>{ad.subtitle}</Text> : null}
          {hasAction ? (
            <View style={styles.cardCtaRow}>
              <Text style={styles.cardCta}>{ad.ctaLabel || 'Learn more'}</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
            </View>
          ) : null}
        </View>
      </GlassSurface>
    </TouchableOpacity>
  );
}

function ModalAd({
  ad,
  visible,
  onClose,
}: {
  ad: AppAd;
  visible: boolean;
  onClose: () => void;
}) {
  const hasAction = ad.actionType !== 'NONE' && Boolean(ad.actionRoute || ad.linkUrl);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <TouchableOpacity style={styles.modalClose} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color="#64748B" />
          </TouchableOpacity>
          {ad.imageUrl ? (
            <Image source={{ uri: ad.imageUrl }} style={styles.modalImage} resizeMode="cover" />
          ) : null}
          <Text style={styles.modalTitle}>{ad.title}</Text>
          {ad.subtitle ? <Text style={styles.modalSubtitle}>{ad.subtitle}</Text> : null}
          {hasAction ? (
            <TouchableOpacity
              style={styles.modalCta}
              onPress={() => {
                openAdAction(ad);
                onClose();
              }}
            >
              <Text style={styles.modalCtaText}>{ad.ctaLabel || 'Learn more'}</Text>
            </TouchableOpacity>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function AdBanner({ screen, placement }: Props) {
  const [ads, setAds] = useState<AppAd[]>([]);
  const [modalAd, setModalAd] = useState<AppAd | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadAds = useCallback(async () => {
    try {
      const fetched = await getCachedActiveAds({ screen, channel: 'mobile' });
      if (!fetched.length) return;

      const visible = await filterVisibleAds(fetched);
      setAds(visible);

      for (const ad of visible) {
        void api.trackAdImpression(ad.id);
        void recordAdView(ad.id);
      }
    } catch {
      // Ads are optional.
    }
  }, [screen]);

  useEffect(() => {
    void loadAds();
  }, [loadAds]);

  useEffect(() => {
    if (placement) return;
    const modal = ads.find((ad) => ad.placement === 'MODAL');
    if (!modal) return;
    setModalAd(modal);
    setModalVisible(true);
  }, [ads, placement]);

  const filtered = placement
    ? ads.filter((ad) => ad.placement === placement)
    : ads.filter((ad) => ad.placement !== 'MODAL');

  if (!filtered.length && !modalAd) return null;

  const handlePress = (ad: AppAd) => openAdAction(ad);

  return (
    <View style={styles.wrap}>
      {filtered.map((ad) => {
        if (ad.placement === 'TOP_BANNER') {
          return <TopBannerAd key={ad.id} ad={ad} onPress={() => handlePress(ad)} />;
        }
        if (ad.placement === 'CARD') {
          return <CardAd key={ad.id} ad={ad} onPress={() => handlePress(ad)} />;
        }
        return <BannerAd key={ad.id} ad={ad} onPress={() => handlePress(ad)} />;
      })}
      {modalAd && !placement ? (
        <ModalAd
          ad={modalAd}
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    marginBottom: Spacing.md,
  },
  topBannerImage: {
    width: '100%',
    height: 112,
    borderRadius: 14,
  },
  topBannerFallback: {
    padding: Spacing.md,
    gap: 4,
  },
  banner: {
    overflow: 'hidden',
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  bannerImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  bannerCopy: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  bannerCta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  cardWrap: {
    width: '100%',
  },
  card: {
    overflow: 'hidden',
  },
  cardInner: {
    padding: 0,
  },
  cardImage: {
    width: '100%',
    height: 120,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  cardCopy: {
    padding: 14,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  cardCtaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardCta: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  modalClose: {
    alignSelf: 'flex-end',
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  modalCta: {
    marginTop: 4,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCtaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

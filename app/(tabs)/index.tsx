
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  RefreshControl, Modal, Image, ImageSourcePropType, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { apiCall } from '@/utils/api';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function HomeScreen() {
  const theme = useTheme();
  const { user, provider } = useUser();
  const router = useRouter();
  const isMountedRef = useRef(true);

  const [refreshing, setRefreshing] = useState(false);
  const [gigs, setGigs] = useState<any[]>([]);
  const [directOffers, setDirectOffers] = useState<any[]>([]);
  const [processingOffer, setProcessingOffer] = useState<string | null>(null);
  const [loadingGigs, setLoadingGigs] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', isError: false, onClose: () => {} });

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchGigs = useCallback(async () => {
    if (!user?.id || !isMountedRef.current) return;
    console.log('Fetching gigs for user type:', user.userType);
    setLoadingGigs(true);
    try {
      if (user.userType === 'client') {
        console.log('Fetching client gigs for:', user.id);
        const data = await apiCall(`/api/gigs/client/${user.id}`);
        if (isMountedRef.current) setGigs(data || []);
      } else if (user.userType === 'provider' && provider?.id) {
        console.log('Fetching provider gigs for:', provider.id);
        const data = await apiCall(`/api/gigs/matches/${provider.id}`);

        const offers: any[] = [];
        const regularGigs: any[] = [];

        if (data && Array.isArray(data)) {
          for (const gig of data) {
            if (gig.selectedProviderId === provider.id && gig.status === 'pending_acceptance') {
              try {
                const gigStatus = await apiCall(`/api/gigs/${gig.id}/status`);
                if (gigStatus.acceptOfferTimeRemainingSeconds > 0) {
                  offers.push({
                    gigId: gig.id,
                    category: gig.category,
                    description: gig.description,
                    address: gig.address,
                    serviceDate: gig.serviceDate,
                    serviceTime: gig.serviceTime,
                    paymentOffer: gig.paymentOffer,
                    durationDays: gig.durationDays,
                    durationHours: gig.durationHours,
                    timeRemainingSeconds: gigStatus.acceptOfferTimeRemainingSeconds,
                  });
                }
              } catch (statusError) {
                console.error('Error fetching gig status:', statusError);
              }
            } else if (gig.status === 'open' && !gig.selectedProviderId) {
              regularGigs.push(gig);
            }
          }
        }

        if (isMountedRef.current) {
          setDirectOffers(offers);
          setGigs(regularGigs);
          console.log('Direct offers:', offers.length, 'Regular gigs:', regularGigs.length);
        }
      }
    } catch (error) {
      console.error('Error fetching gigs:', error);
      if (isMountedRef.current) {
        setGigs([]);
        setDirectOffers([]);
      }
    } finally {
      if (isMountedRef.current) setLoadingGigs(false);
    }
  }, [user?.id, user?.userType, provider?.id]);

  useEffect(() => {
    if (user) fetchGigs();
  }, [user, fetchGigs]);

  // Poll for direct offer updates
  useEffect(() => {
    if (user?.userType === 'provider' && directOffers.length > 0) {
      const interval = setInterval(() => {
        console.log('Polling for direct offer updates');
        fetchGigs();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user?.userType, directOffers.length, fetchGigs]);

  const onRefresh = async () => {
    console.log('Pull-to-refresh triggered');
    setRefreshing(true);
    await fetchGigs();
    setRefreshing(false);
  };

  const showModal = (title: string, message: string, isError = false, onClose?: () => void) => {
    if (isMountedRef.current) {
      setModalContent({ title, message, isError, onClose: onClose || (() => {}) });
      setModalVisible(true);
    }
  };

  const handleAcceptGig = async (gigId: string) => {
    if (!provider?.id) return;
    console.log('Accepting gig:', gigId);
    try {
      await apiCall(`/api/gigs/${gigId}/accept`, {
        method: 'PUT',
        body: JSON.stringify({ providerId: provider.id }),
      });
      showModal('Success', 'Gig accepted successfully!', false, () => fetchGigs());
    } catch (error) {
      console.error('Error accepting gig:', error);
      showModal('Error', error instanceof Error ? error.message : 'Failed to accept gig', true);
    }
  };

  const handleAcceptDirectOffer = async (gigId: string) => {
    if (!provider?.id) return;
    console.log('Accepting direct offer for gig:', gigId);
    setProcessingOffer(gigId);
    try {
      const response = await apiCall(`/api/gigs/${gigId}/accept-direct-offer`, {
        method: 'POST',
        body: JSON.stringify({ providerId: provider.id }),
      });
      console.log('Direct offer accepted:', response);
      showModal(
        'Gig Accepted!',
        `Client: ${response.clientName}\nPhone: ${response.clientPhoneNumber}`,
        false,
        () => fetchGigs()
      );
    } catch (error) {
      console.error('Error accepting direct offer:', error);
      showModal('Error', error instanceof Error ? error.message : 'Failed to accept offer', true);
    } finally {
      setProcessingOffer(null);
    }
  };

  const handleDeclineDirectOffer = async (gigId: string) => {
    if (!provider?.id) return;
    console.log('Declining direct offer for gig:', gigId);
    setProcessingOffer(gigId);
    try {
      await apiCall(`/api/gigs/${gigId}/decline-direct-offer`, {
        method: 'POST',
        body: JSON.stringify({ providerId: provider.id }),
      });
      console.log('Direct offer declined');
      showModal('Offer Declined', 'The gig will be offered to other providers.', false, () => fetchGigs());
    } catch (error) {
      console.error('Error declining direct offer:', error);
      showModal('Error', error instanceof Error ? error.message : 'Failed to decline offer', true);
    } finally {
      setProcessingOffer(null);
    }
  };

  if (!user) return null;

  const isSubscribed = provider?.subscriptionStatus === 'active';

  // ── CLIENT VIEW ──────────────────────────────────────────────────────────────
  if (user.userType === 'client') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.logoHeader}>
            <Image
              source={resolveImageSource(require('@/assets/images/e5ba27fb-676c-43fc-89f4-e37936a130d9.png'))}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.header}>
            <Text style={[styles.greeting, { color: theme.colors.text }]}>
              Hello, {user.firstName}!
            </Text>
            <Text style={[styles.subtitle, { color: theme.dark ? '#98989D' : '#666' }]}>
              Ready to post a gig?
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.postButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              console.log('Post a New Gig button pressed');
              router.push('/post-gig');
            }}
          >
            <IconSymbol
              ios_icon_name="plus.circle"
              android_material_icon_name="add-circle"
              size={28}
              color="#FFFFFF"
            />
            <Text style={styles.postButtonText}>Post a New Gig</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Posted Gigs</Text>
            {loadingGigs ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
            ) : gigs.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.dark ? colors.cardDark : colors.card }]}>
                <IconSymbol ios_icon_name="briefcase" android_material_icon_name="work" size={48} color={theme.dark ? '#666' : '#999'} />
                <Text style={[styles.emptyText, { color: theme.dark ? '#98989D' : '#666' }]}>No gigs posted yet</Text>
                <Text style={[styles.emptySubtext, { color: theme.dark ? '#666' : '#999' }]}>Tap the button above to post your first gig</Text>
              </View>
            ) : (
              gigs.map((gig) => {
                const gigDate = new Date(gig.serviceDate).toLocaleDateString();
                const statusBg = gig.status === 'open' ? colors.success : gig.status === 'accepted' ? colors.primary : colors.border;
                const statusLabel = String(gig.status ?? '').toUpperCase();
                return (
                  <View key={gig.id} style={[styles.gigCard, { backgroundColor: theme.dark ? colors.cardDark : colors.card }]}>
                    <View style={styles.gigHeader}>
                      <Text style={[styles.gigCategory, { color: colors.primary }]}>{gig.category}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <Text style={styles.statusText}>{statusLabel}</Text>
                      </View>
                    </View>
                    <Text style={[styles.gigDescription, { color: theme.colors.text }]} numberOfLines={2}>{gig.description}</Text>
                    <View style={styles.gigFooter}>
                      <Text style={[styles.gigInfoText, { color: theme.dark ? '#98989D' : '#666' }]}>{gigDate}</Text>
                      <Text style={[styles.gigInfoText, { color: theme.dark ? '#98989D' : '#666' }]}>KES {gig.paymentOffer}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => { setModalVisible(false); modalContent.onClose(); }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: theme.dark ? colors.cardDark : colors.card }]}>
              <Text style={[styles.modalTitle, { color: modalContent.isError ? colors.error : colors.success }]}>{modalContent.title}</Text>
              <Text style={[styles.modalMessage, { color: theme.colors.text }]}>{modalContent.message}</Text>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={() => { setModalVisible(false); modalContent.onClose(); }}>
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── PROVIDER VIEW ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.logoHeader}>
          <Image
            source={resolveImageSource(require('@/assets/images/e5ba27fb-676c-43fc-89f4-e37936a130d9.png'))}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.header}>
          <Text style={[styles.greeting, { color: theme.colors.text }]}>Hello, {user.firstName}!</Text>
          <Text style={[styles.subtitle, { color: theme.dark ? '#98989D' : '#666' }]}>
            {isSubscribed ? 'Available gigs for you' : 'Subscribe to view gigs'}
          </Text>
        </View>

        {!isSubscribed && (
          <TouchableOpacity
            style={[styles.subscribeCard, { backgroundColor: colors.primary }]}
            onPress={() => {
              console.log('Subscribe card pressed');
              router.push('/subscription-payment');
            }}
          >
            <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="warning" size={28} color="#FFFFFF" />
            <View style={styles.subscribeContent}>
              <Text style={styles.subscribeTitle}>Subscription Required</Text>
              <Text style={styles.subscribeText}>Subscribe for KES 130/month to view and accept gigs</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Direct Offers Section */}
        {isSubscribed && directOffers.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Direct Offers for You</Text>
            {directOffers.map((offer) => {
              const timeRemaining = Math.max(0, offer.timeRemainingSeconds);
              const minutes = Math.floor(timeRemaining / 60);
              const seconds = timeRemaining % 60;
              const timeDisplay = `${minutes}:${String(seconds).padStart(2, '0')}`;
              return (
                <View
                  key={offer.gigId}
                  style={[styles.gigCard, { backgroundColor: theme.dark ? colors.cardDark : colors.card, borderWidth: 2, borderColor: colors.primary }]}
                >
                  <View style={styles.gigHeader}>
                    <Text style={[styles.gigCategory, { color: colors.primary }]}>{offer.category}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.statusText}>DIRECT OFFER</Text>
                    </View>
                  </View>
                  <View style={[styles.timerBadge, { backgroundColor: theme.dark ? '#2a2a2a' : '#fff3cd' }]}>
                    <IconSymbol ios_icon_name="clock" android_material_icon_name="access-time" size={16} color={colors.warning} />
                    <Text style={[styles.timerText, { color: theme.colors.text }]}>Time to respond: {timeDisplay}</Text>
                  </View>
                  <Text style={[styles.gigDescription, { color: theme.colors.text }]} numberOfLines={2}>{offer.description}</Text>
                  <View style={styles.gigFooter}>
                    <Text style={[styles.gigInfoText, { color: theme.dark ? '#98989D' : '#666' }]}>📍 {offer.address}</Text>
                    <Text style={[styles.gigInfoText, { color: theme.dark ? '#98989D' : '#666' }]}>KES {offer.paymentOffer}</Text>
                  </View>
                  <View style={styles.offerActions}>
                    <TouchableOpacity
                      style={[styles.offerButton, styles.declineButton, { borderColor: colors.error }]}
                      onPress={() => handleDeclineDirectOffer(offer.gigId)}
                      disabled={processingOffer === offer.gigId}
                    >
                      <Text style={[styles.declineButtonText, { color: colors.error }]}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.offerButton, { backgroundColor: colors.success }]}
                      onPress={() => handleAcceptDirectOffer(offer.gigId)}
                      disabled={processingOffer === offer.gigId}
                    >
                      <Text style={styles.acceptButtonText}>Accept Gig</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Available Gigs</Text>
          {loadingGigs ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
          ) : !isSubscribed ? (
            <View style={[styles.emptyState, { backgroundColor: theme.dark ? colors.cardDark : colors.card }]}>
              <IconSymbol ios_icon_name="lock" android_material_icon_name="lock" size={48} color={theme.dark ? '#666' : '#999'} />
              <Text style={[styles.emptyText, { color: theme.dark ? '#98989D' : '#666' }]}>Subscribe to view gigs</Text>
            </View>
          ) : gigs.length === 0 && directOffers.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.dark ? colors.cardDark : colors.card }]}>
              <IconSymbol ios_icon_name="briefcase" android_material_icon_name="work" size={48} color={theme.dark ? '#666' : '#999'} />
              <Text style={[styles.emptyText, { color: theme.dark ? '#98989D' : '#666' }]}>No gigs available right now</Text>
              <Text style={[styles.emptySubtext, { color: theme.dark ? '#666' : '#999' }]}>Check back later for new opportunities</Text>
            </View>
          ) : (
            gigs.map((gig) => {
              const gigDate = new Date(gig.serviceDate).toLocaleDateString();
              return (
                <View key={gig.id} style={[styles.gigCard, { backgroundColor: theme.dark ? colors.cardDark : colors.card }]}>
                  <View style={styles.gigHeader}>
                    <Text style={[styles.gigCategory, { color: colors.primary }]}>{gig.category}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
                      <Text style={styles.statusText}>OPEN</Text>
                    </View>
                  </View>
                  <Text style={[styles.gigDescription, { color: theme.colors.text }]} numberOfLines={2}>{gig.description}</Text>
                  <View style={styles.gigFooter}>
                    <Text style={[styles.gigInfoText, { color: theme.dark ? '#98989D' : '#666' }]}>📍 {gig.address}</Text>
                    <Text style={[styles.gigInfoText, { color: theme.dark ? '#98989D' : '#666' }]}>{gigDate}</Text>
                    <Text style={[styles.gigInfoText, { color: theme.dark ? '#98989D' : '#666' }]}>KES {gig.paymentOffer}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleAcceptGig(gig.id)}
                  >
                    <Text style={styles.acceptButtonText}>Accept Gig</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => { setModalVisible(false); modalContent.onClose(); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.dark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.modalTitle, { color: modalContent.isError ? colors.error : colors.success }]}>{modalContent.title}</Text>
            <Text style={[styles.modalMessage, { color: theme.colors.text }]}>{modalContent.message}</Text>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={() => { setModalVisible(false); modalContent.onClose(); }}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 8 : 8,
    paddingBottom: 120,
  },
  logoHeader: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 100, height: 100 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 15 },
  postButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 18, borderRadius: 12, marginBottom: 24, gap: 10,
  },
  postButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  emptyState: {
    borderRadius: 12, padding: 32, alignItems: 'center', gap: 8,
  },
  emptyText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptySubtext: { fontSize: 13, textAlign: 'center' },
  gigCard: { borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  gigHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  gigCategory: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  gigDescription: { fontSize: 14, marginBottom: 10, lineHeight: 20 },
  gigFooter: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  gigInfoText: { fontSize: 12 },
  acceptButton: { marginTop: 12, padding: 12, borderRadius: 8, alignItems: 'center' },
  acceptButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  subscribeCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 12, marginBottom: 24, gap: 12,
  },
  subscribeContent: { flex: 1 },
  subscribeTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  subscribeText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 6, gap: 6, marginBottom: 12 },
  timerText: { fontSize: 13, fontWeight: '600' },
  offerActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  offerButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  declineButton: { borderWidth: 1, backgroundColor: 'transparent' },
  declineButtonText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContainer: { borderRadius: 12, padding: 24, width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 15, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  modalButton: { padding: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  warning: { color: '#F59E0B' },
});

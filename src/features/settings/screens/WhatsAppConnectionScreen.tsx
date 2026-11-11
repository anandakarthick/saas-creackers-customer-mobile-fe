import React, { useState } from 'react';
import {
  StyleSheet, View, ScrollView, Alert, ActivityIndicator, Image, TextInput,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { http } from '@/services/api/client';
import { ENDPOINTS } from '@/config/api';

// WhatsApp API helpers — routes are at /admin/whatsapp/*, NOT /admin/settings/whatsapp/*
const WA_BASE = '/admin/whatsapp';
const getWhatsAppStatus = () => http.get<any>(`${WA_BASE}/status`);
const connectWhatsApp = () => http.post<any>(`${WA_BASE}/connect`);
const disconnectWhatsApp = () => http.post<any>(`${WA_BASE}/disconnect`);
const sendWhatsAppTest = (data: { phone: string; message: string }) =>
  http.post<any>(`${WA_BASE}/send-test`, data);

export const WhatsAppConnectionScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [testPhone, setTestPhone] = useState('');
  const [testMsg, setTestMsg] = useState('Hello! This is a test message from your store.');
  const [sendingTest, setSendingTest] = useState(false);

  const { data: waStatus, isLoading } = useQuery({
    queryKey: ['whatsappStatus'],
    queryFn: getWhatsAppStatus,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'qr' || status === 'loading' ? 3000 : 10000;
    },
  });

  const connectMutation = useMutation({
    mutationFn: connectWhatsApp,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsappStatus'] }),
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to connect'),
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectWhatsApp,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsappStatus'] });
      Alert.alert('Disconnected', 'WhatsApp has been disconnected');
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to disconnect'),
  });

  const handleSendTest = async () => {
    if (!testPhone.trim()) { Alert.alert('Required', 'Enter a phone number'); return; }
    setSendingTest(true);
    try {
      await sendWhatsAppTest({ phone: testPhone.trim(), message: testMsg.trim() });
      Alert.alert('Sent!', 'Test message sent successfully');
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not send test message');
    } finally {
      setSendingTest(false);
    }
  };

  const status = waStatus?.status || 'disconnected';
  const isReady = status === 'ready';
  const isQR = status === 'qr';

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="WhatsApp" showBack />
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary.main} /></View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="WhatsApp" showBack />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]} showsVerticalScrollIndicator={false}>

        {/* Status Card */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isReady ? colors.success.main : colors.warning.main }]} />
            <Text style={[styles.statusText, { color: colors.text.primary }]}>
              {isReady ? 'Connected' : status === 'qr' ? 'Scan QR Code' : status === 'loading' ? 'Connecting...' : 'Disconnected'}
            </Text>
          </View>
          {isReady && waStatus?.phone && (
            <View style={styles.connectedInfo}>
              <Icon name="whatsapp" size={24} color="#25D366" />
              <Text style={[styles.connectedPhone, { color: colors.text.primary }]}>{waStatus.phone}</Text>
            </View>
          )}
        </View>

        {/* QR Code */}
        {isQR && waStatus?.qr && (
          <View style={[styles.section, { backgroundColor: colors.surface.default, alignItems: 'center' }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Scan QR Code</Text>
            <Text style={[styles.hint, { color: colors.text.secondary }]}>
              Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
            </Text>
            <Image source={{ uri: waStatus.qr }} style={styles.qrImage} resizeMode="contain" />
            <Text style={[styles.hint, { color: colors.text.tertiary, marginTop: spacing[2] }]}>
              QR code refreshes automatically
            </Text>
          </View>
        )}

        {/* Connect / Disconnect */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          {!isReady ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Connect WhatsApp</Text>
              <Text style={[styles.hint, { color: colors.text.secondary, marginBottom: spacing[3] }]}>
                Link your WhatsApp Business account to send automated order notifications to customers.
              </Text>
              <Button
                mode="contained"
                onPress={() => connectMutation.mutate()}
                loading={connectMutation.isPending || status === 'loading'}
                disabled={connectMutation.isPending || status === 'loading'}
                icon="whatsapp"
                style={{ backgroundColor: '#25D366' }}
              >
                {isQR ? 'Regenerate QR' : 'Connect WhatsApp'}
              </Button>
            </>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Connected</Text>
              <Text style={[styles.hint, { color: colors.text.secondary, marginBottom: spacing[3] }]}>
                Your WhatsApp is linked. Order notifications will be sent automatically.
              </Text>
              <Button
                mode="outlined"
                onPress={() => {
                  Alert.alert('Disconnect?', 'This will stop sending WhatsApp notifications.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Disconnect', style: 'destructive', onPress: () => disconnectMutation.mutate() },
                  ]);
                }}
                textColor={colors.error.main}
                loading={disconnectMutation.isPending}
              >
                Disconnect
              </Button>
            </>
          )}
        </View>

        {/* Test Message */}
        {isReady && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Send Test Message</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
              placeholder="Phone number (with country code)"
              placeholderTextColor={colors.text.tertiary}
              value={testPhone}
              onChangeText={setTestPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={[styles.input, styles.multilineInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
              placeholder="Test message"
              placeholderTextColor={colors.text.tertiary}
              value={testMsg}
              onChangeText={setTestMsg}
              multiline
              numberOfLines={3}
            />
            <Button
              mode="contained"
              onPress={handleSendTest}
              loading={sendingTest}
              disabled={sendingTest || !testPhone.trim()}
              icon="send"
              style={{ backgroundColor: colors.primary.main }}
            >
              Send Test
            </Button>
          </View>
        )}

        {/* Instructions */}
        <View style={[styles.section, { backgroundColor: colors.surface.variant }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>How It Works</Text>
          {[
            'Click "Connect WhatsApp" to generate a QR code',
            'Open WhatsApp on your phone',
            'Go to Settings → Linked Devices → Link a Device',
            'Scan the QR code shown above',
            'Once connected, order status notifications are sent automatically',
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: colors.primary.main }]}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.text.secondary }]}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing[4] },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[4] },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing[2] },
  hint: { fontSize: 13, lineHeight: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 16, fontWeight: '700' },
  connectedInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  connectedPhone: { fontSize: 16, fontWeight: '600' },
  qrImage: { width: 250, height: 250, marginVertical: spacing[3], borderRadius: borderRadius.md, backgroundColor: '#fff' },
  input: { borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontSize: 14, marginBottom: spacing[3] },
  multilineInput: { textAlignVertical: 'top', minHeight: 80 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[3] },
  stepDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepNum: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13, lineHeight: 18 },
});

import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, TextInput, TouchableOpacity, Switch,
} from 'react-native';
import { Button, Text, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { settingsApi } from '@/services/api';

const TEMPLATE_TYPES = [
  { key: 'pending', title: 'Order Pending', icon: 'clock-outline', color: '#F59E0B' },
  { key: 'processing', title: 'Order Processing', icon: 'cog-outline', color: '#3B82F6' },
  { key: 'shipped', title: 'Order Shipped', icon: 'truck-delivery-outline', color: '#8B5CF6' },
  { key: 'delivered', title: 'Order Delivered', icon: 'check-circle-outline', color: '#10B981' },
  { key: 'cancelled', title: 'Order Cancelled', icon: 'close-circle-outline', color: '#EF4444' },
  { key: 'paymentConfirmed', title: 'Payment Confirmed', icon: 'cash-check', color: '#059669' },
] as const;

const PLACEHOLDERS = [
  '{{ customer_name }}',
  '{{ order_number }}',
  '{{ total }}',
  '{{ company_name }}',
  '{{ order_date }}',
  '{{ status }}',
  '{{ payment_status }}',
  '{{ customer_mobile }}',
];

const DEFAULT_TEMPLATES: Record<string, string> = {
  pending: 'Hello {{ customer_name }},\n\nYour order #{{ order_number }} has been received and is now PENDING.\n\nOrder Total: ₹{{ total }}\nDate: {{ order_date }}\n\nWe will notify you once it is being processed.\n\nThank you for shopping with {{ company_name }}!',
  processing: 'Hello {{ customer_name }},\n\nGreat news! Your order #{{ order_number }} is now being PROCESSED.\n\nOrder Total: ₹{{ total }}\n\nWe\'re preparing your items. You\'ll be notified when shipped.\n\nThank you, {{ company_name }}',
  shipped: 'Hello {{ customer_name }},\n\nYour order #{{ order_number }} has been SHIPPED!\n\nOrder Total: ₹{{ total }}\n\nYour package is on its way.\n\nThank you, {{ company_name }}',
  delivered: 'Hello {{ customer_name }},\n\nYour order #{{ order_number }} has been DELIVERED!\n\nOrder Total: ₹{{ total }}\n\nThank you for shopping with {{ company_name }}!',
  cancelled: 'Hello {{ customer_name }},\n\nYour order #{{ order_number }} has been CANCELLED.\n\nOrder Total: ₹{{ total }}\nCancellation Date: {{ order_date }}\n\nIf you have questions, please contact us.\n\n{{ company_name }}',
  paymentConfirmed: 'Hello {{ customer_name }},\n\nYour payment for order #{{ order_number }} has been CONFIRMED!\n\nAmount: ₹{{ total }}\nPayment Status: {{ payment_status }}\n\nThank you, {{ company_name }}',
};

type TemplateKey = typeof TEMPLATE_TYPES[number]['key'];

export const WhatsAppTemplatesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // State for templates and enabled flags
  const [templates, setTemplates] = useState<Record<string, string>>({ ...DEFAULT_TEMPLATES });
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(TEMPLATE_TYPES.map((t) => [t.key, true]))
  );

  const { data: settings, isLoading } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: settingsApi.getAdminSettings,
  });

  useEffect(() => {
    if (settings) {
      const s = (settings as any)?.settings || settings;
      const wt = s?.whatsappTemplates || {};
      const we = s?.whatsappTemplatesEnabled || {};
      const newTemplates = { ...DEFAULT_TEMPLATES };
      const newEnabled: Record<string, boolean> = {};
      for (const t of TEMPLATE_TYPES) {
        if (wt[t.key]) newTemplates[t.key] = wt[t.key];
        newEnabled[t.key] = we[t.key] ?? true;
      }
      setTemplates(newTemplates);
      setEnabled(newEnabled);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const s = (settings as any)?.settings || settings || {};
      return settingsApi.updateAdminSettings({
        settings: {
          ...s,
          whatsappTemplates: templates,
          whatsappTemplatesEnabled: enabled,
        },
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminSettings'] });
      Alert.alert('Success', 'WhatsApp templates saved');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save templates'),
  });

  const onSubmit = async () => {
    setIsSubmitting(true);
    try { await updateMutation.mutateAsync(); } finally { setIsSubmitting(false); }
  };

  const insertPlaceholder = (key: string, placeholder: string) => {
    setTemplates((prev) => ({
      ...prev,
      [key]: (prev[key] || '') + placeholder,
    }));
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="WhatsApp Templates" showBack />
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary.main} /></View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="WhatsApp Templates" showBack />
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]} showsVerticalScrollIndicator={false}>

          {/* Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.info.light + '20', borderColor: colors.info.main }]}>
            <Icon name="information-outline" size={20} color={colors.info.main} />
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>
              Configure automated WhatsApp messages sent when order status changes. Use placeholders to personalize.
            </Text>
          </View>

          {/* Templates */}
          {TEMPLATE_TYPES.map((t) => {
            const isExpanded = expandedKey === t.key;
            return (
              <View key={t.key} style={[styles.templateCard, { backgroundColor: colors.surface.default, borderColor: colors.border.default }]}>
                <TouchableOpacity
                  style={styles.templateHeader}
                  onPress={() => setExpandedKey(isExpanded ? null : t.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.templateIcon, { backgroundColor: t.color + '20' }]}>
                    <Icon name={t.icon} size={20} color={t.color} />
                  </View>
                  <Text style={[styles.templateTitle, { color: colors.text.primary, flex: 1 }]}>{t.title}</Text>
                  <Switch
                    value={enabled[t.key]}
                    onValueChange={(val) => setEnabled((prev) => ({ ...prev, [t.key]: val }))}
                    trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                    thumbColor={enabled[t.key] ? colors.primary.main : colors.neutral[400]}
                  />
                  <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text.tertiary} style={{ marginLeft: spacing[2] }} />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.templateBody, { borderTopColor: colors.border.default }]}>
                    <TextInput
                      style={[styles.templateInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
                      value={templates[t.key]}
                      onChangeText={(text) => setTemplates((prev) => ({ ...prev, [t.key]: text }))}
                      multiline
                      numberOfLines={8}
                      textAlignVertical="top"
                      placeholder="Enter message template..."
                      placeholderTextColor={colors.text.tertiary}
                    />
                    {/* Placeholder chips */}
                    <Text style={[styles.placeholderLabel, { color: colors.text.tertiary }]}>
                      Tap to insert placeholder:
                    </Text>
                    <View style={styles.placeholderRow}>
                      {PLACEHOLDERS.map((p) => (
                        <Chip
                          key={p}
                          compact
                          onPress={() => insertPlaceholder(t.key, p)}
                          style={[styles.placeholderChip, { backgroundColor: colors.surface.variant }]}
                          textStyle={{ fontSize: 10, color: colors.primary.main }}
                        >
                          {p.replace(/\{\{ | \}\}/g, '')}
                        </Chip>
                      ))}
                    </View>
                    <TouchableOpacity
                      onPress={() => setTemplates((prev) => ({ ...prev, [t.key]: DEFAULT_TEMPLATES[t.key] }))}
                    >
                      <Text style={[styles.resetLink, { color: colors.primary.main }]}>Reset to default</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          <Button mode="contained" onPress={onSubmit} style={[styles.submitButton, { backgroundColor: colors.primary.main }]} loading={isSubmitting} disabled={isSubmitting} icon="content-save">
            Save Templates
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: spacing[4] },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], padding: spacing[3], borderRadius: borderRadius.md, borderWidth: 1, marginBottom: spacing[4] },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  templateCard: { borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing[3], overflow: 'hidden' },
  templateHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing[3], gap: spacing[2] },
  templateIcon: { width: 36, height: 36, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  templateTitle: { fontSize: 14, fontWeight: '600' },
  templateBody: { padding: spacing[3], borderTopWidth: 1 },
  templateInput: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing[3], fontSize: 13, minHeight: 160, lineHeight: 20, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  placeholderLabel: { fontSize: 11, marginTop: spacing[2], marginBottom: spacing[1] },
  placeholderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  placeholderChip: { marginBottom: spacing[1] },
  resetLink: { fontSize: 12, fontWeight: '600', marginTop: spacing[2], textAlign: 'right' },
  submitButton: { marginTop: spacing[4] },
});

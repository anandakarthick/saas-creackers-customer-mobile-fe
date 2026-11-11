import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { Badge } from '@/components/common';

/** Shared bits for the returns & notes screens (list cards, detail rows, steppers, dialogs). */

export const returnStatusVariant = (s: string): 'success' | 'warning' | 'error' =>
  s === 'COMPLETED' ? 'success' : s === 'CANCELLED' ? 'error' : 'warning';
export const noteStatusVariant = (s: string): 'success' | 'warning' | 'error' =>
  s === 'OPEN' ? 'success' : s === 'CANCELLED' ? 'error' : 'warning';
export const noteStatusLabel = (s: string) =>
  s === 'PARTIALLY_USED' ? 'PARTLY USED' : s;

export const Section: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
      {title ? <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text> : null}
      {children}
    </View>
  );
};

export const DetailRow: React.FC<{ icon: string; label: string; value: React.ReactNode }> = ({ icon, label, value }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.detailRow}>
      <Icon name={icon} size={16} color={colors.neutral[400]} />
      <View style={{ flex: 1, marginLeft: spacing[2] }}>
        <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{label}</Text>
        {typeof value === 'string' || typeof value === 'number'
          ? <Text style={[styles.detailValue, { color: colors.text.primary }]}>{value}</Text>
          : <View style={{ marginTop: 2 }}>{value}</View>}
      </View>
    </View>
  );
};

export const StatRow: React.FC<{ stats: Array<{ label: string; value: string | number; icon: string; color: string }> }> = ({ stats }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.statsRow}>
      {stats.map((s) => (
        <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <Icon name={s.icon} size={20} color={s.color} />
          <Text style={[styles.statValue, { color: colors.text.primary }]} numberOfLines={1}>{s.value}</Text>
          <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
};

/** Chip row for picking one value (refund / settlement method, status filter). */
export const ChipRow: React.FC<{ options: Array<{ label: string; value: string }>; value: string; onChange: (v: string) => void }> = ({ options, value, onChange }) => {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity key={o.value} onPress={() => onChange(o.value)} style={[styles.chip, { backgroundColor: active ? colors.primary.main : colors.surface.variant }]}>
            <Text style={[styles.chipText, { color: active ? '#fff' : colors.text.secondary }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

export const Stepper: React.FC<{ value: number; max?: number | null; onChange: (v: number) => void }> = ({ value, max, onChange }) => {
  const { colors } = useTheme();
  const cap = max ?? Number.MAX_SAFE_INTEGER;
  return (
    <View style={styles.stepper}>
      <TouchableOpacity onPress={() => onChange(Math.max(0, value - 1))} style={[styles.stepBtn, { backgroundColor: colors.surface.variant }]}><Icon name="minus" size={18} color={colors.text.primary} /></TouchableOpacity>
      <TextInput
        value={String(value)}
        onChangeText={(t) => onChange(Math.max(0, Math.min(cap, Math.floor(Number(t) || 0))))}
        keyboardType="number-pad"
        style={[styles.stepInput, { color: colors.text.primary, borderColor: colors.border.default }]}
      />
      <TouchableOpacity onPress={() => onChange(Math.min(cap, value + 1))} style={[styles.stepBtn, { backgroundColor: colors.primary.main }]}><Icon name="plus" size={18} color="#fff" /></TouchableOpacity>
    </View>
  );
};

export const LabeledInput: React.FC<{ label: string; value: string; onChangeText: (t: string) => void; placeholder?: string; keyboardType?: any; multiline?: boolean }> = ({ label, value, onChangeText, placeholder, keyboardType, multiline }) => {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: spacing[3] }}>
      <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.tertiary}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 72, textAlignVertical: 'top' }, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: colors.surface.variant }]}
      />
    </View>
  );
};

/** Bottom-sheet style picker with a search box; caller supplies the rows. */
export function PickerSheet<T>({ visible, title, onClose, search, onSearch, items, keyOf, render, onPick, loading, emptyText }: {
  visible: boolean; title: string; onClose: () => void; search: string; onSearch: (t: string) => void;
  items: T[]; keyOf: (t: T) => string; render: (t: T) => React.ReactNode; onPick: (t: T) => void; loading?: boolean; emptyText?: string;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface.default }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Icon name="close" size={24} color={colors.text.secondary} /></TouchableOpacity>
          </View>
          <TextInput value={search} onChangeText={onSearch} placeholder="Search…" placeholderTextColor={colors.text.tertiary} autoFocus
            style={[styles.input, { marginHorizontal: spacing[4], color: colors.text.primary, borderColor: colors.border.default, backgroundColor: colors.surface.variant }]} />
          <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
            {loading ? <Text style={[styles.hint, { color: colors.text.tertiary }]}>Searching…</Text>
              : items.length === 0 ? <Text style={[styles.hint, { color: colors.text.tertiary }]}>{emptyText || 'Nothing found'}</Text>
              : items.map((it) => (
                <TouchableOpacity key={keyOf(it)} onPress={() => onPick(it)} style={[styles.pickRow, { borderBottomColor: colors.border.default }]}>{render(it)}</TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Reason prompt used by every "cancel" action. */
export const ReasonModal: React.FC<{ visible: boolean; title: string; message?: string; confirmText: string; loading?: boolean; onConfirm: (reason: string) => void; onCancel: () => void; danger?: boolean }> = ({ visible, title, message, confirmText, loading, onConfirm, onCancel, danger = true }) => {
  const { colors } = useTheme();
  const [reason, setReason] = React.useState('');
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={[styles.modalOverlay, { justifyContent: 'center', padding: spacing[6] }]}>
        <View style={[styles.dialog, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{title}</Text>
          {message ? <Text style={[styles.hint, { color: colors.text.secondary, paddingHorizontal: 0 }]}>{message}</Text> : null}
          <LabeledInput label="Reason (optional)" value={reason} onChangeText={setReason} multiline />
          <View style={styles.dialogButtons}>
            <Button mode="outlined" onPress={onCancel} disabled={loading} style={{ flex: 1 }}>Keep</Button>
            <Button mode="contained" onPress={() => { onConfirm(reason); setReason(''); }} loading={loading} disabled={loading} style={{ flex: 1 }} buttonColor={danger ? colors.error.main : undefined}>{confirmText}</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const StatusBadge: React.FC<{ status: string; kind: 'return' | 'note' }> = ({ status, kind }) => (
  <Badge variant={kind === 'return' ? returnStatusVariant(status) : noteStatusVariant(status)} size="small">
    {kind === 'note' ? noteStatusLabel(status) : status}
  </Badge>
);

export const styles = StyleSheet.create({
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing[2] },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] },
  statCard: { flex: 1, minWidth: '46%', alignItems: 'center', paddingVertical: spacing[3], borderRadius: borderRadius.lg, elevation: 1 },
  statValue: { fontSize: 15, fontWeight: '700', marginTop: spacing[1] },
  statLabel: { fontSize: 11, marginTop: 2 },
  chipRow: { gap: spacing[2], paddingVertical: spacing[1] },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999 },
  chipText: { fontSize: 13, fontWeight: '500' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  stepBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepInput: { width: 52, height: 34, borderWidth: 1, borderRadius: borderRadius.md, textAlign: 'center', fontSize: 15, fontWeight: '600', paddingVertical: 0 },
  inputLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing[3], paddingVertical: Platform.OS === 'ios' ? spacing[3] : spacing[2], fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, paddingBottom: spacing[6] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[4] },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: spacing[2] },
  hint: { fontSize: 13, padding: spacing[4] },
  pickRow: { paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1 },
  dialog: { borderRadius: borderRadius.xl, padding: spacing[4] },
  dialogButtons: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3], elevation: 2 },
  iconWrap: { width: 46, height: 46, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: spacing[2] },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  metaText: { fontSize: 12.5, marginLeft: spacing[2] },
  amount: { fontSize: 14, fontWeight: '700', marginLeft: 'auto' },
  listContent: { padding: spacing[4], paddingBottom: spacing[20] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  searchBar: { borderRadius: borderRadius.lg, elevation: 0 },
  content: { padding: spacing[4], paddingBottom: spacing[10] },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], borderBottomWidth: 1 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalsLabel: { fontSize: 13 },
  totalsValue: { fontSize: 13, fontWeight: '600' },
  grandTotal: { fontSize: 16, fontWeight: '800' },
  buttonRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  bigNumber: { fontSize: 22, fontWeight: '800' },
});

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';

export type RangePreset = 'today' | '7d' | '30d' | '90d' | 'all';

interface Props {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
}

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All' },
];

export function presetToRange(p: RangePreset): { from?: string; to?: string } {
  if (p === 'all') return {};
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const days = p === 'today' ? 0 : p === '7d' ? 7 : p === '30d' ? 30 : 90;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return { from: d.toISOString().slice(0, 10), to };
}

export const ReportDateRange: React.FC<Props> = ({ value, onChange }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {PRESETS.map((p) => {
        const active = p.value === value;
        return (
          <TouchableOpacity
            key={p.value}
            style={[styles.chip, active ? { backgroundColor: colors.primary.main } : { backgroundColor: colors.surface.variant }]}
            onPress={() => onChange(p.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, active ? { color: colors.primary.contrast } : { color: colors.text.secondary }]}>{p.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  chip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

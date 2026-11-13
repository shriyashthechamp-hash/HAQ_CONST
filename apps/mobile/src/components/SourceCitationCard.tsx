import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';
import { KnowledgeSourceCitation } from '@haq/shared';

interface Props {
  citation: KnowledgeSourceCitation;
}

/**
 * Modern Premium Verified Statutory Source Citation Card
 */
export const SourceCitationCard: React.FC<Props> = ({ citation }) => {
  const handleOpenSource = () => {
    if (citation.url) {
      Linking.openURL(citation.url).catch((err) =>
        console.warn('Could not open external URL:', err)
      );
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={11} color={Colors.success} style={{ marginRight: 3 }} />
          <Text style={styles.badgeText}>MAHABOCW VERIFIED</Text>
        </View>
        <Text style={styles.sourceId}>{citation.sourceId}</Text>
      </View>

      <Text style={styles.title}>{citation.title}</Text>
      <Text style={styles.excerpt}>{citation.excerpt}</Text>

      {citation.url ? (
        <TouchableOpacity
          onPress={handleOpenSource}
          style={styles.linkButton}
          accessibilityRole="link"
          activeOpacity={0.8}
        >
          <Text style={styles.linkText}>अधिकृत शासन नियम पहा (View Official)</Text>
          <Ionicons name="open-outline" size={12} color={Colors.primary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successSurface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  badgeText: {
    ...Typography.meta,
    fontSize: 9,
    fontWeight: '700',
    color: Colors.success,
  },
  sourceId: {
    ...Typography.meta,
    fontSize: 10,
    color: Colors.textMuted,
  },
  title: {
    ...Typography.cardTitle,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  excerpt: {
    ...Typography.bodySecondary,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.xs,
    backgroundColor: Colors.warmIvory,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkText: {
    ...Typography.badgeText,
    fontSize: 11,
    color: Colors.primary,
  },
});

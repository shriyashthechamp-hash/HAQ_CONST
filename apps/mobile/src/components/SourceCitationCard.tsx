import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Colors } from '../theme/colors';
import { KnowledgeSourceCitation } from '@haq/shared';

interface Props {
  citation: KnowledgeSourceCitation;
}

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
          <Text style={styles.badgeText}>MAHABOCW REVIEWED SOURCE</Text>
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
        >
          <Text style={styles.linkText}>View Official Regulation ↗</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
    marginVertical: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(22, 119, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.4)',
  },
  badgeText: {
    color: '#60A5FA',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sourceId: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  excerpt: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  linkButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  linkText: {
    color: Colors.primaryCobalt,
    fontSize: 12,
    fontWeight: '600',
  },
});

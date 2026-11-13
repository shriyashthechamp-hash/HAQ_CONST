import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing, Radius, Shadows } from '../theme/spacing';

export interface SchemeCardProps {
  id: string;
  title: string;
  description: string;
  categoryTag?: string;
  benefitAmount?: string;
  eligibilityStatus?: 'ELIGIBLE' | 'POTENTIALLY_ELIGIBLE' | 'NEEDS_VERIFICATION' | 'INELIGIBLE';
  sourceId?: string;
  onPress?: () => void;
  language?: string;
}

/**
 * Reusable Scheme Card — Modern Premium
 * Presents welfare schemes with clear criteria, source attribution,
 * and transparent preliminary eligibility states (never claiming guaranteed government grant).
 */
export const SchemeCard: React.FC<SchemeCardProps> = ({
  title,
  description,
  categoryTag,
  benefitAmount,
  eligibilityStatus,
  sourceId,
  onPress,
  language = 'mr',
}) => {
  const getStatusBadge = () => {
    switch (eligibilityStatus) {
      case 'ELIGIBLE':
        return {
          label: language === 'mr' ? 'प्राथमिक निकष पूर्ण' : language === 'hi' ? 'प्राथमिक पात्र' : 'Eligible Criteria',
          bg: Colors.successSurface,
          border: Colors.successBorder,
          text: Colors.success,
          icon: 'checkmark-circle-outline' as const,
        };
      case 'POTENTIALLY_ELIGIBLE':
        return {
          label: language === 'mr' ? 'संभाव्य पात्र' : language === 'hi' ? 'संभावित पात्र' : 'Potentially Eligible',
          bg: Colors.warningSurface,
          border: Colors.warningBorder,
          text: Colors.warning,
          icon: 'information-circle-outline' as const,
        };
      case 'INELIGIBLE':
        return {
          label: language === 'mr' ? 'अपात्र' : language === 'hi' ? 'अपात्र' : 'Not Eligible',
          bg: Colors.errorSurface,
          border: Colors.errorBorder,
          text: Colors.error,
          icon: 'close-circle-outline' as const,
        };
      default:
        return null;
    }
  };

  const badge = getStatusBadge();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <View style={styles.topRow}>
        {categoryTag && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{categoryTag}</Text>
          </View>
        )}
        {badge && (
          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Ionicons name={badge.icon} size={13} color={badge.text} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description} numberOfLines={3}>{description}</Text>

      <View style={styles.footerRow}>
        {benefitAmount && (
          <View style={styles.benefitBox}>
            <Text style={styles.benefitLabel}>
              {language === 'mr' ? 'अनुदान / लाभ:' : language === 'hi' ? 'लाभ राशि:' : 'Benefit:'}
            </Text>
            <Text style={styles.benefitValue}>{benefitAmount}</Text>
          </View>
        )}

        {sourceId && (
          <View style={styles.sourceBox}>
            <Ionicons name="shield-checkmark" size={12} color={Colors.secondary} style={{ marginRight: 3 }} />
            <Text style={styles.sourceText}>{sourceId}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    backgroundColor: Colors.warmIvory,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryText: {
    ...Typography.meta,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusText: {
    ...Typography.badgeText,
    fontSize: 11,
  },
  title: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.bodySecondary,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  benefitBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  benefitValue: {
    ...Typography.badgeText,
    color: Colors.accent,
  },
  sourceBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceText: {
    ...Typography.meta,
    fontSize: 10,
    color: Colors.textMuted,
  },
});


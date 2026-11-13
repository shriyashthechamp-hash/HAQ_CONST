import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';

export interface TaskCardProps {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  onToggleStatus?: () => void;
  language?: string;
}

/**
 * Reusable Task Card — Modern Premium
 * Displays application tasks with status toggles and priority indicators.
 */
export const TaskCard: React.FC<TaskCardProps> = ({
  title,
  description,
  status,
  priority = 'MEDIUM',
  onToggleStatus,
  language = 'mr',
}) => {
  const isDone = status === 'COMPLETED';

  const getPriorityBadge = () => {
    switch (priority) {
      case 'HIGH':
        return {
          label: language === 'mr' ? 'महत्त्वाचे' : language === 'hi' ? 'महत्वपूर्ण' : 'High Priority',
          color: Colors.error,
          bg: Colors.errorSurface,
        };
      case 'MEDIUM':
        return {
          label: language === 'mr' ? 'साधारण' : language === 'hi' ? 'सामान्य' : 'Normal',
          color: Colors.accent,
          bg: Colors.accentGlow,
        };
      default:
        return {
          label: language === 'mr' ? 'कमी' : language === 'hi' ? 'कम' : 'Low',
          color: Colors.textSecondary,
          bg: Colors.borderSubtle,
        };
    }
  };

  const prio = getPriorityBadge();

  return (
    <View style={[styles.card, isDone && styles.cardDone]}>
      <TouchableOpacity
        style={[styles.checkbox, isDone && styles.checkboxDone]}
        onPress={onToggleStatus}
        activeOpacity={0.8}
      >
        {isDone && <Ionicons name="checkmark" size={16} color={Colors.textInverse} />}
      </TouchableOpacity>

      <View style={styles.contentCol}>
        <View style={styles.badgeRow}>
          <View style={[styles.priorityBadge, { backgroundColor: prio.bg }]}>
            <Text style={[styles.priorityText, { color: prio.color }]}>{prio.label}</Text>
          </View>
        </View>

        <Text style={[styles.title, isDone && styles.titleDone]}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardDone: {
    backgroundColor: '#F9FBF8',
    borderColor: Colors.successBorder,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.borderHighlight,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  contentCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  priorityText: {
    ...Typography.meta,
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  description: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});


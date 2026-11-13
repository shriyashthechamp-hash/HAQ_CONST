import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';
import { DocumentStatus } from '@haq/shared';

export interface DocumentRowProps {
  id: string;
  title: string;
  description?: string;
  status: DocumentStatus;
  userNotes?: string;
  alternatives?: string[];
  onToggleStatus?: () => void;
  onPressFormV?: () => void;
  language?: string;
}

/**
 * Reusable Document Checklist Item — Modern Premium
 * Displays document requirement with status pill, notes, and quick action.
 */
export const DocumentRow: React.FC<DocumentRowProps> = ({
  title,
  description,
  status,
  userNotes,
  alternatives,
  onToggleStatus,
  onPressFormV,
  language = 'mr',
}) => {
  const isAvailable = status === 'AVAILABLE';
  const isActionReq = status === 'ACTION_REQUIRED';
  const isNeedsVerification = status === 'NEEDS_VERIFICATION';

  const getStatusBadge = () => {
    switch (status) {
      case 'AVAILABLE':
        return {
          label: language === 'mr' ? 'उपलब्ध आहे' : language === 'hi' ? 'उपलब्ध है' : 'Available',
          bg: Colors.successSurface,
          border: Colors.successBorder,
          text: Colors.success,
          icon: 'checkmark-circle' as const,
        };
      case 'ACTION_REQUIRED':
        return {
          label: language === 'mr' ? 'स्वाक्षरी आवश्यक' : language === 'hi' ? 'हस्ताक्षर आवश्यक' : 'Action Needed',
          bg: Colors.accentGlow,
          border: Colors.accent,
          text: Colors.textAccent,
          icon: 'alert-circle' as const,
        };
      case 'NEEDS_VERIFICATION':
        return {
          label: language === 'mr' ? 'तपासणी बाकी' : language === 'hi' ? 'सत्यापन बाकी' : 'Verification Needed',
          bg: Colors.warningSurface,
          border: Colors.warningBorder,
          text: Colors.warning,
          icon: 'help-circle' as const,
        };
      default:
        return {
          label: language === 'mr' ? 'अपूर्ण' : language === 'hi' ? 'अपूर्ण' : 'Missing',
          bg: Colors.borderSubtle,
          border: Colors.border,
          text: Colors.textSecondary,
          icon: 'ellipse-outline' as const,
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <View style={[styles.container, isAvailable && styles.containerAvailable]}>
      <View style={styles.mainRow}>
        <TouchableOpacity
          style={[styles.checkbox, isAvailable && styles.checkboxChecked]}
          onPress={onToggleStatus}
          activeOpacity={0.8}
        >
          {isAvailable && <Ionicons name="checkmark" size={16} color={Colors.textInverse} />}
        </TouchableOpacity>

        <View style={styles.contentCol}>
          <Text style={[styles.title, isAvailable && styles.titleAvailable]}>{title}</Text>
          {description && <Text style={styles.description}>{description}</Text>}

          {alternatives && alternatives.length > 0 && (
            <View style={styles.altBox}>
              <Text style={styles.altLabel}>
                {language === 'mr' ? 'पर्याय: ' : language === 'hi' ? 'विकल्प: ' : 'Options: '}
                {alternatives.slice(0, 2).join(' • ')}
              </Text>
            </View>
          )}

          {userNotes && userNotes.trim() !== '' && (
            <Text style={styles.notesText}>“{userNotes}”</Text>
          )}
        </View>

        <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <Ionicons name={badge.icon} size={12} color={badge.text} style={{ marginRight: 3 }} />
          <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>

      {onPressFormV && (
        <TouchableOpacity
          style={styles.formVActionBtn}
          onPress={onPressFormV}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={15} color={Colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.formVActionText}>
            {language === 'mr' ? 'कंत्राटदार अर्ज मसुदा तयार करा' : language === 'hi' ? 'ठेकेदार आवेदन पत्र तैयार करें' : 'Generate Form-V Request Letter'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  containerAvailable: {
    borderColor: Colors.successBorder,
    backgroundColor: '#FCFDFB',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  contentCol: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
  },
  titleAvailable: {
    color: Colors.success,
  },
  description: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  altBox: {
    marginTop: Spacing.xs,
  },
  altLabel: {
    ...Typography.meta,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  notesText: {
    ...Typography.caption,
    fontStyle: 'italic',
    color: Colors.accent,
    marginTop: Spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusText: {
    ...Typography.badgeText,
    fontSize: 10,
  },
  formVActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  formVActionText: {
    ...Typography.badgeText,
    color: Colors.primary,
    flex: 1,
  },
});

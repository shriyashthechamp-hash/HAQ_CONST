import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';
import { useApp } from '../context/AppContext';
import { Language } from '@haq/shared';
import { BrandLogo } from './BrandLogo';

interface HeaderBarProps {
  title?: string;
  showLanguageToggle?: boolean;
}

/**
 * Modern Premium Header Bar with Official HAQ Logo
 * and accessible language switcher (Marathi, Hindi, English).
 */
export const HeaderBar: React.FC<HeaderBarProps> = ({ title, showLanguageToggle = true }) => {
  const { language, setLanguage } = useApp();

  const languages: { code: Language; label: string }[] = [
    { code: 'mr', label: 'मराठी' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'en', label: 'EN' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <BrandLogo size="compact" />
        {title && <Text style={styles.titleText}>{title}</Text>}
      </View>

      {showLanguageToggle && (
        <View style={styles.langSelector}>
          {languages.map((l) => {
            const isActive = language === l.code;
            return (
              <TouchableOpacity
                key={l.code}
                onPress={() => setLanguage(l.code)}
                style={[styles.langChip, isActive && styles.langChipActive]}
                accessibilityLabel={`Switch language to ${l.label}`}
                activeOpacity={0.8}
              >
                <Text style={[styles.langText, isActive && styles.langTextActive]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 48,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titleText: {
    ...Typography.sectionTitle,
    color: Colors.textPrimary,
    marginLeft: Spacing.xs,
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.warmIvory,
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  langChipActive: {
    backgroundColor: Colors.accent,
  },
  langText: {
    ...Typography.badgeText,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  langTextActive: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
});

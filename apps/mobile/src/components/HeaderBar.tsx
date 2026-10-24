import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { Language } from '@haq/shared';

interface HeaderBarProps {
  title?: string;
  showLanguageToggle?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ title, showLanguageToggle = true }) => {
  const { language, setLanguage, isBackendConnected } = useApp();

  const languages: { code: Language; label: string }[] = [
    { code: 'mr', label: 'मराठी' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'en', label: 'EN' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.motifContainer}>
          <View style={styles.motifDiamond} />
          <View style={styles.motifDot} />
        </View>
        <View>
          <Text style={styles.brandText}>HAQ</Text>
          <Text style={styles.brandSubtitle}>Benefits, Unlocked</Text>
        </View>
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
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  motifContainer: {
    width: 32,
    height: 32,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  motifDiamond: {
    width: 14,
    height: 14,
    backgroundColor: Colors.constructionOrange,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  motifDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: Colors.textPrimary,
    borderRadius: 2,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.constructionOrange,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  langChipActive: {
    backgroundColor: Colors.constructionOrange,
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  langTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

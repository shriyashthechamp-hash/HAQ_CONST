import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';
import { useApp } from '../context/AppContext';

export const BottomNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useApp();

  const labels: Record<string, { mr: string; hi: string; en: string }> = {
    home: { mr: 'मुख्य', hi: 'मुख्य', en: 'Home' },
    assistant: { mr: 'HAQ बोला', hi: 'HAQ बोलें', en: 'Ask HAQ' },
    documents: { mr: 'कागदपत्रे', hi: 'दस्तावेज', en: 'Documents' },
    eligibility: { mr: 'पात्रता', hi: 'पात्रता', en: 'Eligibility' },
    journey: { mr: 'प्रवास', hi: 'यात्रा', en: 'Journey' },
  };

  const navItems = [
    {
      key: 'home',
      route: '/',
      icon: 'home-outline' as const,
      activeIcon: 'home' as const,
      label: labels.home[language] || 'Home',
    },
    {
      key: 'eligibility',
      route: '/eligibility',
      icon: 'shield-checkmark-outline' as const,
      activeIcon: 'shield-checkmark' as const,
      label: labels.eligibility[language] || 'Eligibility',
    },
    {
      key: 'assistant',
      route: '/assistant',
      icon: 'mic-outline' as const,
      activeIcon: 'mic' as const,
      label: labels.assistant[language] || 'Ask HAQ',
      isVoiceHighlight: true,
    },
    {
      key: 'documents',
      route: '/documents',
      icon: 'document-text-outline' as const,
      activeIcon: 'document-text' as const,
      label: labels.documents[language] || 'Documents',
    },
    {
      key: 'journey',
      route: '/journey',
      icon: 'navigate-outline' as const,
      activeIcon: 'navigate' as const,
      label: labels.journey[language] || 'Journey',
    },
  ];

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const isActive =
          item.route === '/'
            ? pathname === '/' || pathname === ''
            : pathname.startsWith(item.route);

        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => router.push(item.route as any)}
            style={styles.navButton}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.iconWrapper,
                isActive && styles.iconWrapperActive,
                item.isVoiceHighlight && !isActive && styles.iconWrapperVoice,
              ]}
            >
              <Ionicons
                name={isActive ? item.activeIcon : item.icon}
                size={22}
                color={
                  isActive
                    ? (item.isVoiceHighlight ? '#FFFFFF' : Colors.accent)
                    : (item.isVoiceHighlight ? '#FFFFFF' : Colors.secondary)
                }
              />
            </View>
            <Text
              style={[
                styles.labelText,
                isActive && styles.labelTextActive,
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: Spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? 24 : Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 48,
  },
  iconWrapper: {
    width: 36,
    height: 32,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconWrapperActive: {
    backgroundColor: Colors.saffronOrangeLight,
  },
  iconWrapperVoice: {
    backgroundColor: Colors.accent,
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    marginBottom: 0,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  labelText: {
    ...Typography.tabLabel,
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  labelTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
});

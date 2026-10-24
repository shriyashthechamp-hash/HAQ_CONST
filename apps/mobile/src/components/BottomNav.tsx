import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';

export const BottomNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useApp();

  const labels: Record<string, { mr: string; hi: string; en: string }> = {
    home: { mr: 'मुख्य', hi: 'मुख्य', en: 'Home' },
    eligibility: { mr: 'पात्रता', hi: 'पात्रता', en: 'Eligibility' },
    documents: { mr: 'कागदपत्रे', hi: 'दस्तावेज', en: 'Checklist' },
    assistant: { mr: 'मदतनीस', hi: 'सहायक', en: 'Assistant' },
    journey: { mr: 'प्रवास', hi: 'यात्रा', en: 'Journey' },
  };

  const navItems = [
    { key: 'home', route: '/', icon: '🏛️', label: labels.home[language] || 'Home' },
    { key: 'eligibility', route: '/eligibility', icon: '📋', label: labels.eligibility[language] || 'Eligibility' },
    { key: 'documents', route: '/documents', icon: '📑', label: labels.documents[language] || 'Checklist' },
    { key: 'assistant', route: '/assistant', icon: '🤖', label: labels.assistant[language] || 'Assistant' },
    { key: 'journey', route: '/journey', icon: '🛤️', label: labels.journey[language] || 'Journey' },
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
          >
            <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
              <Text style={styles.iconText}>{item.icon}</Text>
            </View>
            <Text style={[styles.labelText, isActive && styles.labelTextActive]}>
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
    backgroundColor: Colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingBottom: 24,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
    minHeight: 48,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconWrapperActive: {
    backgroundColor: Colors.constructionOrangeGlow,
    borderWidth: 1,
    borderColor: Colors.constructionOrange,
  },
  iconText: {
    fontSize: 18,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  labelTextActive: {
    color: Colors.constructionOrange,
    fontWeight: '700',
  },
});

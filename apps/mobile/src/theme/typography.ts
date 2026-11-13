import { TextStyle, Platform } from 'react-native';
import { Colors } from './colors';

/**
 * HAQ Typography Tokens — Modern Premium
 * Prioritizes comfortable reading of Devanagari (Marathi/Hindi) and English text.
 */
export const Typography = {
  // Display & Screen Titles
  displayHero: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as TextStyle['fontWeight'],
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  screenTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700' as TextStyle['fontWeight'],
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  screenHeader: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700' as TextStyle['fontWeight'],
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: Colors.textPrimary,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: Colors.textPrimary,
  },
  cardHeader: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: Colors.textPrimary,
  },

  // Body & Conversational
  bodyLarge: {
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '400' as TextStyle['fontWeight'],
    color: Colors.textPrimary,
  },
  bodyRegular: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400' as TextStyle['fontWeight'],
    color: Colors.textPrimary,
  },
  bodyMedium: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500' as TextStyle['fontWeight'],
    color: Colors.textPrimary,
  },
  bodySecondary: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400' as TextStyle['fontWeight'],
    color: Colors.textSecondary,
  },

  // Captions, Meta, & Badges
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as TextStyle['fontWeight'],
    color: Colors.textSecondary,
  },
  captionRegular: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as TextStyle['fontWeight'],
    color: Colors.textSecondary,
  },
  labelMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: Colors.textPrimary,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.2,
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
    color: Colors.textMuted,
  },

  // Actions & Buttons
  actionButton: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: Colors.textPrimary,
  },
  buttonPrimary: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: Colors.textInverse,
    textAlign: 'center' as TextStyle['textAlign'],
  },
  buttonSecondary: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: Colors.textPrimary,
    textAlign: 'center' as TextStyle['textAlign'],
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as TextStyle['fontWeight'],
    textAlign: 'center' as TextStyle['textAlign'],
  },
};


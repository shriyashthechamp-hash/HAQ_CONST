import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing, Radius, Shadows } from '../theme/spacing';

interface VoiceReviewModalProps {
  visible: boolean;
  transcript: string;
  language?: string;
  onConfirm: (finalText: string) => void;
  onReRecord: () => void;
  onCancel: () => void;
}

/**
 * Voice Review & Confirmation Modal
 * Allows construction workers to verify and correct their transcribed
 * spoken query before submitting it to the HAQ AI Agent.
 */
export const VoiceReviewModal: React.FC<VoiceReviewModalProps> = ({
  visible,
  transcript,
  language = 'mr',
  onConfirm,
  onReRecord,
  onCancel,
}) => {
  const [editedText, setEditedText] = useState(transcript);

  useEffect(() => {
    setEditedText(transcript);
  }, [transcript]);

  const title =
    language === 'mr'
      ? 'तुमचा आवाज समजला'
      : language === 'hi'
      ? 'आपकी आवाज पहचानी गई'
      : 'Review Your Voice Query';

  const subtitle =
    language === 'mr'
      ? 'जर काही चूक असेल तर तुम्ही शब्द बदलू शकता:'
      : language === 'hi'
      ? 'यदि कोई त्रुटि हो तो आप शब्द सुधार सकते हैं:'
      : 'You can edit your question before sending:';

  const confirmLabel =
    language === 'mr'
      ? 'HAQ ला विचारा'
      : language === 'hi'
      ? 'HAQ से पूछें'
      : 'Ask HAQ';

  const reRecordLabel =
    language === 'mr'
      ? 'पुन्हा बोला'
      : language === 'hi'
      ? 'फिर से बोलें'
      : 'Re-record';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="mic-outline" size={20} color={Colors.accent} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Editable Text Area */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              multiline={true}
              numberOfLines={4}
              value={editedText}
              onChangeText={setEditedText}
              placeholder={
                language === 'mr'
                  ? 'येथे आपला प्रश्न तपासा...'
                  : language === 'hi'
                  ? 'यहाँ अपना प्रश्न जांचें...'
                  : 'Check your query here...'
              }
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.reRecordBtn}
              onPress={onReRecord}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={18} color={Colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.reRecordText}>{reRecordLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                !editedText.trim() && styles.confirmBtnDisabled,
              ]}
              onPress={() => onConfirm(editedText.trim())}
              disabled={!editedText.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
              <Ionicons name="paper-plane" size={16} color={Colors.textInverse} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 26, 58, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.xl,
    ...Shadows.elevated,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.saffronOrangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    ...Typography.sectionTitle,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  inputWrapper: {
    backgroundColor: Colors.warmIvory,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 110,
    marginBottom: Spacing.lg,
  },
  textInput: {
    ...Typography.bodyRegular,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  reRecordBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  reRecordText: {
    ...Typography.buttonSecondary,
    color: Colors.textPrimary,
  },
  confirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    ...Typography.buttonPrimary,
    color: Colors.textInverse,
  },
});


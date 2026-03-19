import { SmsApi } from '@data/api/SmsApi';
import { RootState } from '@data/repository/store';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  designTokensColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../constants/designTokens';

const { width, height } = Dimensions.get('window');
const c = designTokensColors;
const r = radius;
const sh = shadows;
const s = spacing;
const t = typography;

export default function ChangePhoneScreen() {
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const { theme } = useTheme();
  const smsApi = SmsApi.getInstance();
  const { user } = useSelector((state: RootState) => state.auth);

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handleSendVerificationCode = async () => {
    setError('');
    
    if (!newPhoneNumber) {
      setError('请填写新手机号');
      return;
    }

    if (!validatePhoneNumber(newPhoneNumber)) {
      setError('请输入有效的中国手机号');
      return;
    }

    if (!user?.id) {
      setError('用户信息错误，请重新登录');
      return;
    }

    try {
      setLoading(true);
      await smsApi.sendVerificationCode({
        phone_number: newPhoneNumber, // 修改：phone -> phone_number
        purpose: 'change_phone'
      });
      
      // 跳转到短信验证页面
      router.push({
        pathname: '/(auth)/sms-verification',
        params: {
          phoneNumber: newPhoneNumber,
          purpose: 'change_phone',
          userId: user.id.toString(),
        }
      });
    } catch (error: any) {
      setError(error.message || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="返回"
        onPress={() => router.back()}
        style={styles.backArrowAbs}
        activeOpacity={0.7}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
      </TouchableOpacity>

      <View
        pointerEvents="box-none"
        style={[styles.headerWrap, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}
      >
        <View style={styles.backBtnPlaceholder} />
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>修改手机号</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>修改手机号</Text>
              <Text style={styles.subtitle}>请输入新的手机号码，我们将发送验证码进行验证。</Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.labelText}>新手机号</Text>
              <TextInput
                value={newPhoneNumber}
                onChangeText={setNewPhoneNumber}
                mode="outlined"
                style={styles.input}
                contentStyle={styles.inputContent}
                outlineStyle={styles.inputOutline}
                keyboardType="phone-pad"
                maxLength={11}
                placeholder="请输入11位手机号"
                placeholderTextColor={c.placeholder}
                textColor={c.textMain}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              mode="contained"
              onPress={handleSendVerificationCode}
              style={styles.sendButton}
              contentStyle={styles.sendButtonContent}
              labelStyle={styles.sendButtonLabel}
              loading={loading}
              disabled={loading}
            >
              发送验证码
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backArrowAbs: {
    position: 'absolute',
    left: 16,
    top: 32,
    zIndex: 50,
    elevation: 50,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s.pageHorizontalWide,
    paddingVertical: s.headerPaddingVertical,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtnPlaceholder: { width: 44, height: 44 },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 14,
    letterSpacing: t.letterSpacing.sectionLabel,
    fontFamily: t.fontFamily.body,
    color: c.textMain,
    fontWeight: t.fontWeight.semibold,
  },
  headerRightSpacer: { width: 44 },

  scroll: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: s.pageHorizontalWide,
    paddingTop: s.sectionVertical,
    paddingBottom: s.sectionVerticalLarge,
  },
  content: { flex: 1 },

  card: {
    backgroundColor: c.cardBg,
    borderRadius: r.cardLarge,
    borderWidth: 1,
    borderColor: c.border,
    padding: s.cardPadding,
    ...sh.card,
  },
  titleSection: {
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontFamily: t.fontFamily.serifChinese,
    color: c.textMain,
    fontWeight: t.fontWeight.semibold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: t.fontFamily.body,
    color: c.textMuted,
    lineHeight: 18,
  },

  inputSection: { marginTop: 10 },
  labelText: {
    fontSize: 10,
    letterSpacing: t.letterSpacing.sectionLabel,
    fontFamily: t.fontFamily.body,
    color: c.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: c.wordCardTapBg,
    borderRadius: r.card,
  },
  inputContent: {
    paddingVertical: Platform.select({ ios: 10, android: 8, default: 10 }),
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: t.fontFamily.body,
  },
  inputOutline: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: r.card,
  },

  error: {
    color: '#B91C1C',
    marginTop: 10,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: t.fontFamily.body,
  },

  sendButton: {
    backgroundColor: c.primary,
    borderRadius: r.button,
    marginTop: 16,
    ...sh.button,
  },
  sendButtonContent: {
    paddingVertical: 10,
  },
  sendButtonLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: t.letterSpacing.buttonPrimary,
    fontFamily: t.fontFamily.body,
    fontWeight: t.fontWeight.semibold,
  },
});
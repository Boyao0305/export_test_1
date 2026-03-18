import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@data/repository/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDailyLearningLogs } from '@hooks/useDailyLearningLogs';
import {
  designTokensColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../constants/designTokens';

const { width, height } = Dimensions.get('window');
const c = designTokensColors;
const r = radius;
const sh = shadows;
const s = spacing;
const t = typography;

export default function TodayRecapPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isReturningHome, setIsReturningHome] = React.useState(false);
  
  // Get the specific logId from route params
  const logId = params.logId ? parseInt(params.logId as string) : null;
  
  // Get today's learning data from Redux
  const { logs } = useSelector((state: RootState) => state.dailyLearningLogs);
  
  // Filter logs to only show the specific article if logId is provided
  const filteredLogs = logId ? logs.filter(log => log.id === logId) : logs;
  
  // Calculate today's word count (only for the specific article if logId is provided)
  const todayWords = filteredLogs.reduce((total, log) => {
    return total + (log.daily_new_words?.length || 0);
  }, 0);

  const { logsCount, completedCount } = useDailyLearningLogs();

  const handleBackPress = () => {
    router.back();
  };

  const handleReturnHome = async () => {
    if (isReturningHome) return;
    setIsReturningHome(true);
    try {
      if (completedCount >= logsCount && logsCount > 0) {
        console.log('[TodayRecap] Setting congratulations flag - completedCount:', completedCount, 'logsCount:', logsCount);
        await AsyncStorage.setItem('@show_congrats_on_mainpage', '1');
      } else {
        console.log('[TodayRecap] Not setting congratulations flag - completedCount:', completedCount, 'logsCount:', logsCount);
      }
      router.push('/');
    } finally {
      setIsReturningHome(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.headerWrap,
          { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitleSmall}>Today's Recap</Text>
            <Text style={styles.headerSubtitleInline}>{'  /  今日学习总结'}</Text>
          </View>
          <Text style={styles.headerSubtitleSmall}>VenTong</Text>
          <View style={styles.headerDividerSmall} />
        </View>
        <View style={styles.headerRight}>
          <View style={styles.headerIconPill}>
            <Ionicons name="checkmark-circle" size={18} color={c.accent} />
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Upper Section - Word Count */}
        <View style={styles.wordCountSection}>
          <View style={styles.wordCountCard}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeText}>TODAY</Text>
              </View>
              <Text style={styles.wordCountLabel}>今日学习单词</Text>
            </View>
            <View style={styles.summaryStatRow}>
              <Text style={styles.wordCountNumber}>+{todayWords}</Text>
              <Text style={styles.wordCountUnit}>个新单词</Text>
            </View>
            <Text style={styles.wordCountSubtitle}>Today's New Words</Text>
          </View>
        </View>

        {/* Lower Section - New Words List */}
        <View style={styles.newWordsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>今日生词列表</Text>
            <Text style={styles.sectionSubtitle}>Today's New Words</Text>
          </View>
          
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logTitle}>{log.english_title}</Text>
                  <Text style={styles.logSubtitle}>{log.chinese_title}</Text>
                </View>
                
                {log.daily_new_words && log.daily_new_words.length > 0 && (
                  <View style={styles.wordsList}>
                    {log.daily_new_words.map((word: any) => (
                      <View key={word.id} style={styles.wordItem}>
                        <View style={styles.wordInfo}>
                          <Text style={styles.wordText}>{word.word}</Text>
                          <Text style={styles.wordPhonetic}>[{word.phonetic}]</Text>
                        </View>
                        <Text style={styles.wordDefinition}>{word.definition}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconPill}>
                <Ionicons name="book-outline" size={22} color={c.textMuted} />
              </View>
              <Text style={styles.emptyText}>暂无学习记录</Text>
              <Text style={styles.emptySubtext}>开始你的学习之旅吧！</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Orange "返回主页" button */}
      <TouchableOpacity
        style={[styles.returnHomeButton, isReturningHome && styles.returnHomeButtonDisabled]}
        onPress={handleReturnHome}
        disabled={isReturningHome}
      >
        <Ionicons name="home" size={18} color={c.cardBg} />
        <Text style={styles.returnHomeButtonText}>
          {isReturningHome ? '请稍等...' : '返回主页'}
        </Text>
        {isReturningHome && (
          <ActivityIndicator
            size="small"
            color={c.cardBg}
            style={styles.returnHomeButtonSpinner}
          />
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s.headerPaddingHorizontal,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  headerTitleSmall: {
    fontSize: 18,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
    fontFamily: t.fontFamily.serif,
  },
  headerSubtitleInline: {
    fontSize: 10,
    fontWeight: t.fontWeight.bold,
    color: c.accent,
    letterSpacing: 1.6,
    fontFamily: t.fontFamily.body,
  },
  headerSubtitleSmall: {
    fontSize: 11,
    fontWeight: t.fontWeight.bold,
    color: c.accent,
    letterSpacing: 2,
    marginTop: 2,
  },
  headerDividerSmall: {
    width: 32,
    height: 1,
    backgroundColor: c.accent,
    opacity: 0.3,
    marginTop: 6,
  },
  headerRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: c.bgCream,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: s.bottomNavPaddingBottom + 60,
  },
  // Upper Section - Word Count
  wordCountSection: {
    paddingHorizontal: s.pageHorizontal,
    paddingTop: s.sectionVertical,
    paddingBottom: s.sectionVertical,
  },
  wordCountCard: {
    backgroundColor: c.cardBg,
    borderRadius: r.cardLarge,
    paddingVertical: s.cardPaddingLarge,
    paddingHorizontal: s.cardPaddingLarge,
    borderWidth: 1,
    borderColor: c.border,
    ...sh.sophisticated,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryBadge: {
    backgroundColor: c.bgCream,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: r.pill,
  },
  summaryBadgeText: {
    fontSize: 10,
    letterSpacing: 2,
    color: c.primary,
    fontWeight: t.fontWeight.bold,
    fontFamily: t.fontFamily.body,
  },
  wordCountLabel: {
    fontSize: 12,
    color: c.textMuted,
    fontFamily: t.fontFamily.body,
    fontWeight: t.fontWeight.semibold,
    letterSpacing: 1,
  },
  summaryStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 6,
  },
  wordCountNumber: {
    fontSize: 44,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
    fontFamily: t.fontFamily.serif,
    fontStyle: 'italic',
  },
  wordCountUnit: {
    fontSize: 14,
    color: c.textMuted,
    fontFamily: t.fontFamily.body,
    fontWeight: t.fontWeight.semibold,
  },
  wordCountSubtitle: {
    fontSize: 12,
    color: c.textMuted,
    fontFamily: t.fontFamily.body,
    letterSpacing: 1.5,
    opacity: 0.85,
  },
  // Lower Section - New Words List
  newWordsSection: {
    paddingHorizontal: s.pageHorizontal,
    paddingBottom: s.sectionVertical,
  },
  sectionHeader: {
    marginBottom: s.cardGap,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
    fontFamily: t.fontFamily.serifChinese,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: c.textMuted,
    fontFamily: t.fontFamily.body,
    fontWeight: t.fontWeight.semibold,
    letterSpacing: 1.5,
  },
  logCard: {
    backgroundColor: c.cardBg,
    borderRadius: r.cardLarge,
    padding: s.cardPadding,
    marginBottom: s.cardGap,
    borderWidth: 1,
    borderColor: c.border,
    ...sh.wordCard,
  },
  logHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
    fontFamily: t.fontFamily.serif,
    marginBottom: 4,
    lineHeight: 22,
  },
  logSubtitle: {
    fontSize: 12,
    color: c.textMuted,
    fontFamily: t.fontFamily.body,
  },
  wordsList: {
    gap: 12,
  },
  wordItem: {
    backgroundColor: c.cardBg,
    borderRadius: r.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  wordInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  wordText: {
    fontSize: 16,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
    fontFamily: t.fontFamily.serif,
    marginRight: 10,
  },
  wordPhonetic: {
    fontSize: 14,
    color: c.textMuted,
    fontStyle: 'italic',
    fontFamily: t.fontFamily.body,
  },
  wordDefinition: {
    fontSize: 14,
    color: c.textMain,
    lineHeight: 20,
    fontFamily: t.fontFamily.body,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    backgroundColor: c.cardBg,
    borderRadius: r.cardLarge,
    borderWidth: 1,
    borderColor: c.border,
    ...sh.wordCard,
    marginBottom: s.sectionVertical,
  },
  emptyIconPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.bgCream,
    borderWidth: 1,
    borderColor: c.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: c.primary,
    marginTop: 14,
    fontFamily: t.fontFamily.serifChinese,
    fontWeight: t.fontWeight.bold,
  },
  emptySubtext: {
    fontSize: 14,
    color: c.textMuted,
    marginTop: 6,
    fontFamily: t.fontFamily.body,
  },
  returnHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primary,
    paddingVertical: 14,
    paddingHorizontal: s.footerHorizontal,
    borderRadius: r.button,
    marginHorizontal: s.pageHorizontal,
    marginTop: 10,
    marginBottom: s.footerVertical,
    ...sh.button,
  },
  returnHomeButtonDisabled: {
    opacity: 0.72,
  },
  returnHomeButtonText: {
    color: c.cardBg,
    fontSize: 14,
    fontWeight: t.fontWeight.bold,
    marginLeft: 10,
    letterSpacing: t.letterSpacing.buttonPrimary,
    fontFamily: t.fontFamily.body,
  },
  returnHomeButtonSpinner: {
    marginLeft: 10,
  },
});
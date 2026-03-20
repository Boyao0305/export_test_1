import { Ionicons } from '@expo/vector-icons';
import { useDailyLearningLogs } from '@hooks/useDailyLearningLogs';
import { useTheme } from '@hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  designTokensColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../constants/designTokens';
import { recipes } from '../../constants/recipes';
import { finishStudy } from '../../data/api/FinishStudyApi';
import type { RootState } from '../../data/repository/store';
import CongratulationsBottomSheet from '../components/CongratulationsBottomSheet';

const { width, height } = Dimensions.get('window');
const c = designTokensColors;
const s = spacing;
const r = radius;
const sh = shadows;
const t = typography;

// Mock data for articles
const articles = [
  {
    id: '1',
    title: 'How Deep Learning Is Bringing Old Anime Back to Life in Stunning HD',
    subtitle: '深度学习如何让老动画高清重制？',
    image: Platform.select({
      web: { uri: 'https://picsum.photos/800/400' },
      default: require('../../assets/images/icon.png'),
    }),
    category: 'Technology',
  },
  {
    id: '2',
    title: 'Manchester United\'s Tactical DNA: From Ferguson to Ten Hag',
    subtitle: '曼联的战术 DNA：从弗格森到滕哈赫，战术演变全解析',
    image: Platform.select({
      web: { uri: 'https://picsum.photos/800/401' },
      default: require('../../assets/images/icon.png'),
    }),
    category: 'Sports',
  },
  {
    id: '3',
    title: 'What If Football Had a Skill Tree? Ranking the Most \'Game-Level\' Players',
    subtitle: '如果足球有技能树？盘点现实中的"游戏级"球员',
    image: Platform.select({
      web: { uri: 'https://picsum.photos/800/402' },
      default: require('../../assets/images/icon.png'),
    }),
    category: 'Sports',
  },
];

const MainPage = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  // Debug: log when MainPage is mounted and what the current route segments are
  console.log('[MainPage] Component mounted. Segments:', segments);
  // State for the early finish confirmation modal
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [activeRecommendationIndex, setActiveRecommendationIndex] = useState(0);

  // Use the new computed values from useDailyLearningLogs
  const {
    logs,
    isLoading,
    error,
    logsCount, // Number of articles to complete today (1/2/3)
    daily_goal, // User's daily goal (10/20/30)
    completedCount, // Number of finished articles (status === 'learned')
    progress, // Progress ratio for the progress bar
  } = useDailyLearningLogs(); // Add a log in the hook itself for even more clarity
  // Use typed selector for user
  const user = useSelector((state: RootState) => state.auth.user);
  // Track if finishStudy API has been called today to avoid duplicate calls
  const [finishStudyCalled, setFinishStudyCalled] = useState(false);
  // Local override for progress bar after early finish
  const [forceFullProgress, setForceFullProgress] = useState(false);

  // Its purpose is for testing, so these parts should be commented out before going live.
  const ONLY_SHOW_LOGS = true;

  // Function to call the finish study API (now using the utility)
  const callFinishStudyApi = async () => {
    if (!user?.id || finishStudyCalled) return;
    try {
      // Convert user.id to number for finishStudy API
      const data = await finishStudy(Number(user.id));
      console.log('[FinishStudy] Success:', data);
      setFinishStudyCalled(true);
      // 不在这里 setShowCongrats(true)
    } catch (err: any) {
      if (err.message === 'Learning_setting does not exist') {
        console.warn('[FinishStudy] Learning_setting does not exist');
      } else {
        console.error('[FinishStudy] API error:', err);
      }
      setFinishStudyCalled(true);
    }
  };

  // Handler for the '提前完成' button: show confirmation modal
  const handleFinishStudyEarly = () => {
    setShowFinishConfirm(true);
  };

  // Handler for confirming early finish
  const handleConfirmFinish = () => {
    setShowFinishConfirm(false);
    setForceFullProgress(true); // Immediately set progress bar to 100%
    setShowCongrats(true); // 立即弹窗
    callFinishStudyApi(); // 异步调用，不阻塞弹窗
  };

  // Handler for cancelling early finish
  const handleCancelFinish = () => {
    setShowFinishConfirm(false);
  };

  // Effect: If user completes all required articles, call finish study API automatically
  useEffect(() => {
    if (progress >= 1 && !finishStudyCalled) {
      callFinishStudyApi();
      // 不在这里自动弹出，只在用户确认提前完成或从 today-recap 返回时弹出
    }
  }, [progress, finishStudyCalled]);

  const handleHistoryPress = () => {
    console.log('[MainPage] History pressed');
    router.push('/history-articles');
  };

  const handleFavoritesPress = () => {
    console.log('[MainPage] Favorites pressed');
    router.push('/SavedArticles');
  };

  const handleNotesPress = () => {
    console.log('[MainPage] Notes pressed');
    router.push('/MyNotes');
  };

  const handleArticlePress = (articleId: string) => {
    console.log('[MainPage] Navigating to PassageMain with sessionId:', articleId);
    router.push({
      pathname: '/PassageMain',
      params: { sessionId: articleId }
    });
  };

  // Ensure logId is always a number
  const handleLogPress = (logId: number, _words: any[]) => {
    console.log('[MainPage] Navigating to WordPreview with logId:', logId);
    // Only pass the id; the target screen will read words from Redux
    router.push({
      pathname: '/debug/testblank',
      params: {
        logId: logId.toString(),
      }
    });
  };

  // Remove old calculation:
  // const logsCount = Array.isArray(logs) ? logs.length : 0;
  // const learningCount = Array.isArray(logs) ? logs.filter((log: any) => log.status === 'learning').length : 0;
  // const progress = logsCount > 0 ? learningCount / logsCount : 0;

  // Only show logs that are not yet learned (not completed)
  const unlearnedLogs = Array.isArray(logs) ? logs.filter((log: any) => log.status !== 'learned') : [];

  // Use forced progress if early finish was confirmed
  const displayProgress = forceFullProgress ? 1 : progress;
  const recommendationCardWidth = width - s.pageHorizontal * 2;
  const recommendationCardGap = s.cardGap;
  const recommendationSnapInterval = recommendationCardWidth + recommendationCardGap;

  useEffect(() => {
    if (activeRecommendationIndex >= unlearnedLogs.length) {
      setActiveRecommendationIndex(0);
    }
  }, [unlearnedLogs.length, activeRecommendationIndex]);

  useFocusEffect(
    React.useCallback(() => {
      // 检查是否需要弹出 CongratulationsBottomSheet
      // 只有在从 today-recap 返回时才弹出
      AsyncStorage.getItem('@show_congrats_on_mainpage').then((val: string | null) => {
        console.log('[MainPage] useFocusEffect - AsyncStorage value:', val);
        if (val === '1') {
          console.log('[MainPage] Showing congratulations bottom sheet');
          setShowCongrats(true);
          AsyncStorage.removeItem('@show_congrats_on_mainpage');
        }
      });
    }, [user?.id])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header: line1 = 仝文馆 + subtitle on same line; line2 = VenTong */}
      <View style={[styles.headerWrap, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitleSmall, styles.headerTitleChinese]}>{'仝文馆'}</Text>
            <Text style={styles.headerSubtitleInline}>{' —— 沉浸语境，词自成章'}</Text>
          </View>
          <Text style={styles.headerSubtitleSmall}>VenTong</Text>
          <View style={styles.headerDividerSmall} />
        </View>
        <TouchableOpacity
          style={styles.headerMenuBtn}
          onPress={handleHistoryPress}
        >
          <Ionicons name="menu" size={24} color={c.primary} />
        </TouchableOpacity>
      </View>

      {/* Test Daily Log API — commented out
      {__DEV__ && (
        <Button
          mode="contained"
          style={[recipes.button.primaryCta, styles.testApiButtonLayout]}
          onPress={() => router.push('/debug/test-daily-log-request')}
        >
          Test Daily Log API
        </Button>
      )}
      */}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Today's Progress card — compact height */}
        <View style={[recipes.card.progress, styles.progressCardWrap]}>
          <View style={styles.progressTopRow}>
            <View style={styles.progressLeft}>
              <Text style={[recipes.sectionHeader.progressLabel, styles.progressLabelLarge]}>今日进度</Text>
              <View style={styles.progressNumberRow}>
                <Text style={styles.progressNumber}>{completedCount}</Text>
                <Text style={styles.progressOf}> / {logsCount}</Text>
              </View>
            </View>
            <View style={styles.streakBadge}>
              <Ionicons name="calendar" size={12} color={c.accent} />
              <Text style={styles.streakText}>连续 {logsCount > 0 ? logsCount : 0} 天</Text>
            </View>
          </View>
          <View style={[recipes.progressBar.track, styles.progressBarWrap]}>
            <View
              style={[
                recipes.progressBar.fill,
                { width: `${Math.max(0, Math.min(displayProgress, 1)) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.captionRow}>
            <Text style={styles.captionQuote} numberOfLines={1}>阅读只为心灵提供知识的材料。</Text>
            <Text style={styles.captionPercent}>
              {Math.round(displayProgress * 100)}%
            </Text>
          </View>
          <TouchableOpacity
            style={[recipes.button.primaryCta, styles.earlyFinishBtn]}
            onPress={handleFinishStudyEarly}
          >
            <Text style={recipes.button.primaryCtaText}>提前完成</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Recommendations (Design_MainPage §4) */}
        {Array.isArray(unlearnedLogs) && unlearnedLogs.length > 0 && (
          <View style={styles.dailyLogsSection}>
            <View style={recipes.sectionHeader.row}>
              <Text style={[recipes.sectionHeader.title, styles.sectionTitleLarge]}>每日推荐</Text>
              <Text style={recipes.sectionHeader.date}>
                {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>加载中…</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                pagingEnabled={false}
                snapToInterval={recommendationSnapInterval}
                snapToAlignment="start"
                decelerationRate="fast"
                disableIntervalMomentum
                onMomentumScrollEnd={(event) => {
                  const offsetX = event.nativeEvent.contentOffset.x;
                  const nextIndex = Math.round(offsetX / recommendationSnapInterval);
                  const safeIndex = Math.max(0, Math.min(nextIndex, unlearnedLogs.length - 1));
                  setActiveRecommendationIndex(safeIndex);
                }}
                contentContainerStyle={styles.dailyLogsScrollContent}
              >
                {unlearnedLogs.map((log: any) => {
                  return (
                    <View key={log.id} style={[recipes.card.recommendationActive, styles.logCardLayout, { width: recommendationCardWidth }]}>
                      <TouchableOpacity
                        style={styles.logCardTouchable}
                        onPress={() => handleLogPress(Number(log.id), log.daily_new_word)}
                        activeOpacity={1}
                      >
                        <View style={styles.logContent}>
                          <View style={styles.logMetaRow}>
                            <View style={recipes.badge.topicMuted}>
                              <Text style={recipes.badge.topicMutedText}>{log.tag || '综合'}</Text>
                            </View>
                          </View>
                          <Text style={styles.logTitle}>{log.english_title}</Text>
                          {(log.chinese_title != null && log.chinese_title !== '') && (
                            <Text style={styles.logSubtitle} numberOfLines={2}>{log.chinese_title}</Text>
                          )}
                          <View style={styles.logWordsRow}>
                            <Text style={styles.logWords}>
                              词汇：{(log.daily_new_words ?? log.daily_new_word ?? []).length} 新词
                            </Text>
                            <Text style={styles.logWords}>  等级：{log.CEFR || '—'}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[recipes.button.primaryCta, styles.commenceBtn]}
                        onPress={() => handleLogPress(Number(log.id), log.daily_new_word)}
                      >
                        <Text style={recipes.button.primaryCtaText}>开始阅读</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}
            {unlearnedLogs.length > 1 && (
              <View style={styles.recommendationDotsWrap}>
                {unlearnedLogs.map((log: any, index: number) => (
                  <View
                    key={`dot-${log.id}`}
                    style={[
                      styles.recommendationDot,
                      index === activeRecommendationIndex && styles.recommendationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Lexical Mastery block (Design_MainPage §5) */}
        <View style={[styles.lexicalBlock, { backgroundColor: c.primary }]}>
          <View style={styles.lexicalContent}>
            <View>
              <Text style={styles.lexicalLabel}>词汇掌握</Text>
              <Text style={styles.lexicalStat}>
                <Text style={styles.lexicalNumber}>4,820</Text>
                <Text style={styles.lexicalUnit}> 词</Text>
              </Text>
            </View>
            <TouchableOpacity style={styles.lexicalIconBtn}>
              <Ionicons name="trending-up" size={24} color={c.cardBg} />
            </TouchableOpacity>
          </View>
        </View>
         {!ONLY_SHOW_LOGS && (
          <>
          {/* Recommended Banner */}
          <View style={styles.recommendationBanner}>
            <Text style={styles.recommendationTitle}>Today's Picks</Text>
            <Text style={styles.recommendationSubtitle}>今日推荐</Text>
          </View>

          {/* Article Cards */}
          {articles.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={[recipes.card.recommendation, styles.articleCardLayout]}
              // article.id is string, handleArticlePress expects string
              onPress={() => handleArticlePress(article.id)}
            >
              <Image source={article.image} style={styles.articleImage} />
              <View style={styles.articleContent}>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleSubtitle}>{article.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Test Section */}
          {__DEV__ && (
            <View style={styles.testSection}>
              <TouchableOpacity
                style={[recipes.button.primaryCta, styles.testButtonLayout]}
                onPress={() => router.push('../../test')}
              >
                <Text style={recipes.button.primaryCtaText}>🧪 Daily Learning Logs Test</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Feature Articles Section */}
          <View style={styles.featureSection}>
            <View style={styles.featureHeader}>
              <Text style={styles.featureTitle}>Feature Articles</Text>
              <Text style={styles.featureSubtitle}>话题文章</Text>
            </View>

            {/* Feature Articles */}
            {articles.map((article) => (
              <TouchableOpacity
                key={`feature-${article.id}`}
                style={[recipes.card.recommendation, styles.featureCardLayout]}
                onPress={() => handleArticlePress(article.id)}
              >
                <Image source={article.image} style={styles.featureImage} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureCardTitle}>{article.title}</Text>
                  <Text style={styles.featureCardSubtitle}>{article.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          </>
        )}
        {/* {__DEV__ && (
          <View style={{ marginVertical: 16 }}>
            <DailyLearningLogsTest />
          </View>
        )} */}
      </ScrollView>

      {/* Early finish confirmation modal */}
      <Modal
        visible={showFinishConfirm}
        transparent
        animationType="fade"
        onRequestClose={handleCancelFinish}
      >
        <View style={styles.modalOverlay}>
          <View style={[recipes.card.default, styles.modalContentLayout]}>
            <Text style={styles.modalMessage}>是否确认提前完成今日学习</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={handleConfirmFinish} style={recipes.button.primaryCta}>
                <Text style={recipes.button.primaryCtaText}>是</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCancelFinish} style={styles.modalCancelButton}>
                <Text style={styles.modalCancelButtonText}>否</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <CongratulationsBottomSheet visible={showCongrats} onClose={() => setShowCongrats(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  menuButton: {
    padding: s.cardGap,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: s.pageHorizontal,
    paddingBottom: s.bottomNavPaddingBottom * 2 + 60,
  },
  testApiButtonLayout: {
    marginVertical: s.cardPadding,
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
    fontFamily: t.fontFamily.serifChinese,
  },
  headerTitleChinese: {
    fontStyle: 'italic',
  },
  headerSubtitleInline: {
    fontSize: 10,
    fontWeight: t.fontWeight.bold,
    color: c.accent,
    letterSpacing: 2,
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
  headerMenuBtn: {
    width: 44,
    height: 44,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressLabelLarge: {
    fontSize: 13,
  },
  progressCardWrap: {
    marginTop: s.sectionVertical,
    marginBottom: s.sectionVerticalLarge,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  progressLeft: {
    flexDirection: 'column',
  },
  progressNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  progressNumber: {
    fontSize: 34,
    fontFamily: t.fontFamily.serif,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
  },
  progressOf: {
    fontSize: 16,
    fontFamily: t.fontFamily.serif,
    fontStyle: 'italic',
    color: c.textMuted,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.bgCream,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: r.pill,
    borderWidth: 1,
    borderColor: c.border,
  },
  streakText: {
    fontSize: 10,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
  },
  progressBarWrap: {
    marginBottom: 8,
  },
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  captionQuote: {
    fontSize: 11,
    fontFamily: t.fontFamily.serif,
    fontStyle: 'italic',
    color: c.textMuted,
    flex: 1,
  },
  captionPercent: {
    fontSize: 11,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
  },
  earlyFinishBtn: {
    marginTop: 4,
  },
  lexicalBlock: {
    borderRadius: r.cardLarge,
    padding: s.cardPaddingLarge,
    marginTop: s.sectionVerticalLarge,
    marginBottom: s.sectionVertical,
    overflow: 'hidden',
  },
  lexicalContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  lexicalLabel: {
    fontSize: t.fontSize.sectionLabel,
    fontWeight: t.fontWeight.bold,
    color: c.cardBg,
    opacity: 0.6,
    marginBottom: 8,
    letterSpacing: 2,
  },
  lexicalStat: {},
  lexicalNumber: {
    fontSize: 30,
    fontFamily: t.fontFamily.serif,
    fontWeight: t.fontWeight.bold,
    fontStyle: 'italic',
    color: c.cardBg,
  },
  lexicalUnit: {
    fontSize: 14,
    color: c.cardBg,
    opacity: 0.8,
    marginLeft: 4,
  },
  lexicalIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logCardTouchable: {
    padding: s.cardPadding,
  },
  logMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  commenceBtn: {
    marginHorizontal: s.cardPadding,
    marginBottom: s.cardPadding,
  },
  recommendationBanner: {
    backgroundColor: c.primary,
    padding: s.cardPadding,
    margin: s.pageHorizontal,
    borderRadius: r.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendationTitle: {
    color: c.cardBg,
    fontSize: t.fontSize.cardTitle,
    fontFamily: t.fontFamily.serif,
    fontWeight: t.fontWeight.bold,
  },
  recommendationSubtitle: {
    color: c.cardBg,
    fontSize: t.fontSize.ctaStat,
    fontFamily: t.fontFamily.body,
    fontWeight: t.fontWeight.semibold,
  },
  articleCardLayout: {
    marginHorizontal: s.pageHorizontal,
    marginBottom: s.sectionVertical,
  },
  articleImage: {
    width: '100%',
    height: height * 0.25,
    borderTopLeftRadius: r.card,
    borderTopRightRadius: r.card,
  },
  articleContent: {
    padding: s.cardPadding,
  },
  articleTitle: {
    fontSize: t.fontSize.cardTitle,
    fontFamily: t.fontFamily.articleTitle,
    fontWeight: t.fontWeight.bold,
    color: c.textMain,
    marginBottom: s.cardGap,
  },
  articleSubtitle: {
    fontSize: t.fontSize.bodyMeta,
    fontFamily: t.fontFamily.body,
    color: c.textMuted,
  },
  featureSection: {
    marginTop: s.sectionVertical,
  },
  featureHeader: {
    backgroundColor: c.primary,
    padding: s.cardPadding,
    borderRadius: r.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: s.sectionVertical,
  },
  featureTitle: {
    color: c.cardBg,
    fontSize: t.fontSize.cardTitle,
    fontFamily: t.fontFamily.serif,
    fontWeight: t.fontWeight.bold,
  },
  featureSubtitle: {
    color: c.cardBg,
    fontSize: t.fontSize.ctaStat,
    fontFamily: t.fontFamily.body,
    fontWeight: t.fontWeight.semibold,
  },
  featureCardLayout: {
    flexDirection: 'row',
    marginHorizontal: s.pageHorizontal,
    marginBottom: s.sectionVertical,
    alignItems: 'center',
  },
  featureImage: {
    width: width * 0.1,
    height: width * 0.1,
    borderTopLeftRadius: r.card,
    borderBottomLeftRadius: r.card,
    margin: s.pageHorizontal,
  },
  featureContent: {
    flex: 1,
    padding: s.cardPadding,
    justifyContent: 'center',
  },
  featureCardTitle: {
    fontSize: t.fontSize.bodyMeta,
    fontFamily: t.fontFamily.body,
    fontWeight: t.fontWeight.semibold,
    color: c.textMain,
    marginBottom: 4,
  },
  featureCardSubtitle: {
    fontSize: t.fontSize.cardMeta,
    fontFamily: t.fontFamily.body,
    color: c.textMuted,
  },
  sectionTitleLarge: {
    fontSize: 13,
  },
  dailyLogsSection: {
    marginBottom: s.sectionVertical,
  },
  dailyLogsScrollContent: {
    paddingTop: s.cardGap,
    paddingRight: s.cardGap,
  },
  logCardLayout: {
    marginRight: s.cardGap,
  },
  logContent: {
    flex: 1,
  },
  logTitle: {
    fontSize: 16,
    fontFamily: t.fontFamily.serif,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
    marginBottom: 4,
    lineHeight: 22,
  },
  logSubtitle: {
    fontSize: t.fontSize.bodyMeta,
    fontFamily: t.fontFamily.body,
    color: c.textMuted,
    marginBottom: 8,
  },
  logWordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  logWords: {
    fontSize: t.fontSize.sectionLabel,
    fontFamily: t.fontFamily.serif,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
  },
  loadingContainer: {
    padding: s.cardPadding,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: t.fontSize.bodyMeta,
    color: c.textMuted,
    fontFamily: t.fontFamily.body,
  },
  errorContainer: {
    padding: s.cardPadding,
    alignItems: 'center',
  },
  errorText: {
    fontSize: t.fontSize.bodyMeta,
    color: c.primary,
    fontFamily: t.fontFamily.body,
  },
  recommendationDotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: s.cardGap,
  },
  recommendationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.border,
    opacity: 0.9,
  },
  recommendationDotActive: {
    width: 16,
    borderRadius: 999,
    backgroundColor: c.primary,
  },
  testSection: {
    marginHorizontal: s.pageHorizontal,
    marginBottom: s.sectionVertical,
  },
  testButtonLayout: {},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentLayout: {
    padding: s.cardPaddingLarge,
    alignItems: 'center',
    minWidth: 260,
  },
  modalMessage: {
    fontSize: t.fontSize.cardTitle,
    color: c.textMain,
    marginBottom: s.sectionVertical,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: s.sectionVertical,
  },
  modalCancelButton: {
    backgroundColor: c.border,
    borderRadius: r.button,
    paddingVertical: s.cardGap,
    paddingHorizontal: s.cardPadding,
    marginHorizontal: s.cardGap,
  },
  modalCancelButtonText: {
    color: c.textMain,
    fontSize: t.fontSize.cardTitle,
    fontWeight: t.fontWeight.bold,
  },
});

export default MainPage;
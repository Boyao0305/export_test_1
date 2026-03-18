import { AppDispatch, RootState } from '@data/repository/store';
import { getWordsWithCaiji } from '@data/usecase/WordsWithCaijiUseCase';
import { useDailyLearningLogs } from '@hooks/useDailyLearningLogs';
import { useLocalArticles } from '@hooks/useLocalArticles';
import { useTheme } from '@hooks/useTheme';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import LevelBar from '../components/LevelBar';
import RadarChart from '../components/RadarChart';
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

export default function WordsPage() {
  const { theme } = useTheme();
  const { logs, isLoading, error, additional_information } = useDailyLearningLogs();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector((state: any) => state.auth.user?.id);
  const { articles, newWords, isLoading: localLoading, getArticlesGroupedByDate, refreshArticles } = useLocalArticles(userId);
  
  // Words with Caiji state
  const { data: wordsWithCaijiData, isLoading: wordsWithCaijiLoading, error: wordsWithCaijiError } = useSelector(
    (state: RootState) => state.wordsWithCaiji
  );

  // Accordion state: store expanded article ids
  const [expandedArticles, setExpandedArticles] = useState<string[]>([]);
  
  // Swipeable card page state
  const [currentPage, setCurrentPage] = useState(0);
  const [cardWidth, setCardWidth] = useState(width - (width * 0.04 * 2));

  // 默认全部展开：每次 articles 变化时自动展开所有 article
  useEffect(() => {
    if (articles.length > 0) {
      setExpandedArticles(articles.map(a => a.id));
    }
  }, [articles]);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get formatted date for display
  const getFormattedDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  // Get the most recent learning log with words
  const getMostRecentLogWithWords = () => {
    if (!logs || logs.length === 0) return null;
    
    // Sort logs by date (most recent first)
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Find the first log that has words
    return sortedLogs.find(log => log.daily_new_words && log.daily_new_words.length > 0) || null;
  };

  const mostRecentLog = getMostRecentLogWithWords();
  const todayDate = getTodayDate();
  const isToday = mostRecentLog?.date === todayDate;

  // Helper to format percentage
  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

  // Get progress data from additional_information
  const learningProportion = additional_information?.learning_proportion ?? 0;
  const progression = additional_information?.progression ?? 0;
  const wordBookName = additional_information?.word_book?.name ?? '';

  // Helper function to extract learning_factor from word data
  // Try multiple possible field names and nested structures
  const getLearningFactor = (wordData: any): number => {
    // First try direct field names
    if (wordData.learning_factor !== undefined && wordData.learning_factor !== null) {
      return wordData.learning_factor;
    }
    
    // Try nested in l_word_statuss array (most likely structure based on API response)
    if (wordData.l_word_statuss && Array.isArray(wordData.l_word_statuss) && wordData.l_word_statuss.length > 0) {
      const firstStatus = wordData.l_word_statuss[0];
      if (firstStatus?.learning_factor !== undefined && firstStatus?.learning_factor !== null) {
        return firstStatus.learning_factor;
      }
    }
    
    // Try other possible field names
    const fallbackValue = wordData.caiji ?? 
           wordData.learningFactor ?? 
           wordData.factor ?? 
           wordData.caiji_factor ?? 
           wordData.mastery ?? 
           wordData.mastery_factor ?? 
           0;
    
    if (fallbackValue === 0) {
      console.log(`[WordsPage] Warning: Could not find learning_factor for word: ${wordData.word || 'unknown'}, using default 0`);
    }
    
    return fallbackValue;
  };

  const calculateOverallLevel = (): number => {
    if (!wordsWithCaijiData?.words || wordsWithCaijiData.words.length === 0) {
      return 0; // Default to 0 if no data
    }
    
    // Calculate average learning factor using helper function
    const totalFactor = wordsWithCaijiData.words.reduce((sum, word) => sum + getLearningFactor(word), 0);
    const avgFactor = totalFactor / wordsWithCaijiData.words.length;
    
    // learning_factor is typically 0-1, convert to 0-100
    // If learning_factor is already 0-100, use it directly
    const level = avgFactor > 1 ? avgFactor : avgFactor * 100;
    const finalLevel = Math.max(0, Math.min(100, level));
    
    return finalLevel;
  };

  // Calculate radar chart data from words with caiji
  const calculateRadarData = () => {
    if (!wordsWithCaijiData?.words || wordsWithCaijiData.words.length === 0) {
      // Default mock data if no API data
      return [
        { label: '单词', labelEn: 'Words', value: 75 },
        { label: '语法', labelEn: 'Grammar', value: 60 },
        { label: '阅读', labelEn: 'Reading', value: 85 },
      ];
    }
    
    // For now, use average learning factor for all dimensions
    // TODO: Update when API provides separate values for words, grammar, reading
    const avgFactor = wordsWithCaijiData.words.reduce((sum, word) => sum + getLearningFactor(word), 0) / wordsWithCaijiData.words.length;
    const value = avgFactor > 1 ? avgFactor : avgFactor * 100;
    
    return [
      { label: '单词', labelEn: 'Words', value: Math.round(value) },
      { label: '语法', labelEn: 'Grammar', value: Math.round(value * 0.8) },
      { label: '阅读', labelEn: 'Reading', value: Math.round(value * 1.1) },
    ];
  };

  const radarData = calculateRadarData();
  const overallLevel = calculateOverallLevel();
  
  // Get words from caiji API for Recent new words section
  const getWordsFromCaiji = () => {
    if (!wordsWithCaijiData?.words || wordsWithCaijiData.words.length === 0) {
      return [];
    }
    
    // Return words with learning_factor, sorted by learning_factor (highest first)
    const words = wordsWithCaijiData.words
      .map((wordData) => {
        const learningFactor = getLearningFactor(wordData);
        const word = wordData.word || '';
        
        return {
          word: word,
          learning_factor: learningFactor,
          // Add other fields if available in API response
          phonetic: wordData.phonetic || '',
          definition: wordData.definition || '',
        };
      })
      .filter((word) => word.word !== '') // Filter out words without word field
      .sort((a, b) => b.learning_factor - a.learning_factor); // Sort by learning_factor descending
    
    // Log all words with their learning_factor
    console.log('[WordsPage] All words with learning_factor:', words.map(w => ({ word: w.word, learning_factor: w.learning_factor })));
    
    return words;
  };

  const wordsFromCaiji = getWordsFromCaiji();

  // Toggle expand/collapse for an article
  const toggleArticle = (articleId: string) => {
    setExpandedArticles(prev =>
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  // 页面聚焦时刷新
  useFocusEffect(
    React.useCallback(() => {
      console.log('[WordsPage] Page focused, refreshing articles and fetching words with caiji');
      refreshArticles();
      // Fetch words with caiji data when entering the page
      console.log('[WordsPage] Dispatching getWordsWithCaiji...');
      dispatch(getWordsWithCaiji());
    }, [userId, dispatch])
  );
  
  // Log when wordsWithCaijiData changes
  useEffect(() => {

    if (wordsWithCaijiData?.words && wordsWithCaijiData.words.length > 0) {
      console.log('[WordsPage] Sample word data:', wordsWithCaijiData.words[0]);
      console.log('[WordsPage] Sample learning_factor:', wordsWithCaijiData.words[0]?.learning_factor);
      console.log('[WordsPage] All learning_factors:', wordsWithCaijiData.words.map(w => ({ word: w.word, learning_factor: w.learning_factor })));
    }
  }, [wordsWithCaijiData, wordsWithCaijiLoading, wordsWithCaijiError]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header (match MainPage top brand style) */}
      <View
        style={[
          styles.headerWrap,
          { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitleSmall, styles.headerTitleChinese]}>{'仝文馆'}</Text>
            <Text style={styles.headerSubtitleInline}>{' —— 沉浸语境，词自成章'}</Text>
          </View>
          <Text style={styles.headerSubtitleSmall}>VenTong</Text>
          <View style={styles.headerDividerSmall} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Day Day up - Daily Progress Section */}
        {additional_information && (
          <>
            {/* Title block styled like 'Recent new words' */}
            <View style={styles.titleSection}>
              <Text style={styles.titleText}>Day Day up</Text>
              <Text style={styles.subtitleText}>每日进步</Text>
            </View>
            {/* Swipeable card container */}
            <View 
              style={styles.dailyProgressSection}
              onLayout={(event) => {
                const { width: layoutWidth } = event.nativeEvent.layout;
                setCardWidth(layoutWidth);
              }}
            >
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.swipeableCardScrollView}
                contentContainerStyle={styles.swipeableCardContent}
                onMomentumScrollEnd={(event) => {
                  if (cardWidth > 0) {
                    const pageIndex = Math.round(
                      event.nativeEvent.contentOffset.x / cardWidth
                    );
                    setCurrentPage(pageIndex);
                  }
                }}
              >
                {/* Page 1: Arc progress bar */}
                <View style={styles.swipeableCardPage}>
                  <View style={styles.arcProgressContainer}>
                    <AnimatedCircularProgress
                      size={180}
                      width={16}
                      fill={learningProportion * 100}
                      arcSweepAngle={270}
                      rotation={225}
                      lineCap="round"
                      tintColor={c.accent}
                      backgroundColor={c.progressBg}
                      children={() => (
                        <Text style={styles.arcProgressPercentText}>{formatPercent(learningProportion)}</Text>
                      )}
                    />
                  </View>
                  {/* Progression and word book name */}
                  <View style={styles.arcProgressInfoContainer}>
                    <Text style={styles.arcProgressInfoText}>已学{progression}个单词</Text>
                    <Text style={styles.arcProgressInfoText}>{wordBookName}</Text>
                  </View>
                </View>
                
                {/* Page 2: Overall Level Bar */}
                <View style={styles.swipeableCardPage}>
                  <View style={styles.levelBarContainer}>
                    <LevelBar 
                      level={overallLevel} 
                      label="整体水平"
                      showLabel={true}
                    />
                  </View>
                </View>
                
                {/* Page 3: Radar Chart */}
                <View style={styles.swipeableCardPage}>
                  <View style={styles.radarChartContainer}>
                    <RadarChart data={radarData} size={250} />
                  </View>
                </View>
              </ScrollView>
              
              {/* Page indicator dots */}
              <View style={styles.pageIndicatorContainer}>
                <View style={[styles.pageIndicatorDot, currentPage === 0 && styles.pageIndicatorDotActive]} />
                <View style={[styles.pageIndicatorDot, currentPage === 1 && styles.pageIndicatorDotActive]} />
                <View style={[styles.pageIndicatorDot, currentPage === 2 && styles.pageIndicatorDotActive]} />
              </View>
            </View>
          </>
        )}

        {/* 功能按钮区 - 卡片式美化 function button */ }
        {/* <View style={styles.featureGridBg}>
                <View style={styles.featureGridCard}>
                  <TouchableOpacity style={styles.featureGridItem}
                    onPress={() => {
                      // Navigate to FavouriteSentences page
                      router.push('/FavouriteSentences');
                    }}
                  >
                    <Ionicons name="book-outline" size={32} color="#FC9B33" />
                    <Text style={styles.featureGridText}>单词本</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.featureGridItem}
                    onPress={() => {
                      // Navigate to FavouriteSentences page
                      router.push('/FavouriteSentences');
                    }}
                  >
                    <Ionicons name="star-outline" size={32} color="#FC9B33" />
                    <Text style={styles.featureGridText}>收藏句子</Text>
                  </TouchableOpacity>
                  <View style={styles.featureGridItem} />
                  <View style={styles.featureGridItem} />
                </View>
              </View> */}

        {/*/!* Tool Section *!/*/}
        {/*<View style={styles.toolSection}>*/}
        {/*  /!* 单词本 *!/*/}
        {/*  <TouchableOpacity style={styles.toolItem1} onPress={() => router.push('/word-preview')}>*/}
        {/*    <View style={styles.toolIcon1}>*/}
        {/*      <Ionicons name="book-outline" size={16} color="#FF9500" />*/}
        {/*    </View>*/}
        {/*    <Text style={styles.toolText1}>单词本</Text>*/}
        {/*  </TouchableOpacity>*/}
        {/*  */}
        {/*  /!* 复习测验 *!/*/}
        {/*  <TouchableOpacity style={styles.toolItem2}>*/}
        {/*    <View style={styles.toolIcon2}>*/}
        {/*      <Ionicons name="search-outline" size={16} color="#FF9500" />*/}
        {/*    </View>*/}
        {/*    <Text style={styles.toolText2}>复习测验</Text>*/}
        {/*  </TouchableOpacity>*/}
        {/*  */}
        {/*  /!* 收藏句子 *!/*/}
        {/*  <TouchableOpacity style={styles.toolItem3} onPress={() => router.push('/FavouriteSentences')}>*/}
        {/*    <View style={styles.toolIcon3}>*/}
        {/*      <Ionicons name="heart-outline" size={16} color="#FF9500" />*/}
        {/*    </View>*/}
        {/*    <Text style={styles.toolText3}>收藏句子</Text>*/}
        {/*  </TouchableOpacity>*/}
        {/*  */}
        {/*  /!* 收藏短语 *!/*/}
        {/*  <TouchableOpacity style={styles.toolItem4}>*/}
        {/*    <View style={styles.toolIcon4}>*/}
        {/*      <Ionicons name="bookmark-outline" size={16} color="#FF9500" />*/}
        {/*    </View>*/}
        {/*    <Text style={styles.toolText4}>收藏短语</Text>*/}
        {/*  </TouchableOpacity>*/}
        {/*</View>*/}
        
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>
            {articles.length > 0 ? "Recent new words" : "Recent new words"}
          </Text>
          <Text style={styles.subtitleText}>
            {articles.length > 0 ? "最近新学单词" : "最近新学单词"}
          </Text>
        </View>

        {/* Loading State */}
        {wordsWithCaijiLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading words...</Text>
          </View>
        )}

        {/* Error State */}
        {wordsWithCaijiError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {wordsWithCaijiError}</Text>
          </View>
        )}

        {/* Words List - From Caiji API */}
        {!wordsWithCaijiLoading && !wordsWithCaijiError && wordsFromCaiji.length > 0 && (
          <View style={styles.wordsSection}>
            <View style={styles.dateGroupContainer}>
              {wordsFromCaiji.map((wordData, index) => {
                // learning_factor is a coefficient from 0 to 1, convert to percentage (0-100)
                // Handle cases where learning_factor might be undefined, null, or already a percentage
                let factorValue = 0;
                if (wordData.learning_factor !== undefined && wordData.learning_factor !== null) {
                  if (wordData.learning_factor > 1) {
                    // Already a percentage (0-100)
                    factorValue = wordData.learning_factor;
                  } else {
                    // Coefficient (0-1), convert to percentage
                    factorValue = wordData.learning_factor * 100;
                  }
                }
                
                return (
                  <View key={`word-${index}-${wordData.word}`} style={styles.wordItem}>
                    <View style={styles.wordRow}>
                      <View style={styles.wordInfoContainer}>
                        <Text style={styles.wordText}>{wordData.word}</Text>
                        {wordData.phonetic && (
                          <Text style={styles.phoneticText}>[{wordData.phonetic}]</Text>
                        )}
                      </View>
                      <View style={styles.learningFactorContainer}>
                        <Text style={styles.learningFactorLabel}>掌握度</Text>
                        <Text style={styles.learningFactorValue}>
                          {Math.round(factorValue)}%
                        </Text>
                      </View>
                    </View>
                    {wordData.definition && (
                      <Text style={styles.definitionText}>{wordData.definition}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* No Words State */}
        {!wordsWithCaijiLoading && !wordsWithCaijiError && wordsFromCaiji.length === 0 && (
          <View style={styles.noWordsContainer}>
            <Text style={styles.noWordsText}>No words found</Text>
            <Text style={styles.noWordsSubtext}>Complete articles to see learned words here</Text>
          </View>
        )}
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.015,
    backgroundColor: '#FFFBF8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    color: '#FC9B33',
    fontSize: 18,
    fontFamily: Platform.select({ ios: 'DM Sans', android: 'sans-serif' }),
    fontWeight: '700',
  },
  menuButton: {
    padding: 8,
  },
  notificationButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: s.bottomNavPaddingBottom * 2 + 60,
  },
  titleSection: {
    backgroundColor: c.primary,
    paddingVertical: 14,
    paddingHorizontal: s.pageHorizontal,
    marginHorizontal: s.pageHorizontal,
    marginTop: s.sectionVertical,
    marginBottom: s.cardGap,
    borderRadius: r.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...sh.card,
  },
  titleText: {
    color: c.cardBg,
    fontSize: 18,
    fontFamily: t.fontFamily.serif,
    fontWeight: t.fontWeight.bold,
  },
  subtitleText: {
    color: c.cardBg,
    fontSize: 12,
    fontFamily: t.fontFamily.body,
    fontWeight: t.fontWeight.semibold,
    letterSpacing: 1.5,
    opacity: 0.85,
  },
  dateSection: {
    paddingHorizontal: width * 0.04,
    marginBottom: height * 0.02,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontFamily: Platform.select({ ios: 'DM Sans', android: 'sans-serif' }),
    fontWeight: '600',
    color: c.primary,
    marginBottom: height * 0.005,
  },
  dateNote: {
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'Inter', android: 'sans-serif' }),
    color: '#838589',
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: width * 0.04,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: c.textMuted,
    fontFamily: Platform.select({ ios: 'Inter', android: 'sans-serif' }),
  },
  errorContainer: {
    padding: width * 0.04,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontFamily: Platform.select({ ios: 'Inter', android: 'sans-serif' }),
  },
  wordsSection: {
    paddingHorizontal: s.pageHorizontal,
  },
  wordsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: height * 0.02,
    fontFamily: Platform.select({ ios: 'DM Sans', android: 'sans-serif' }),
  },
  wordItem: {
    backgroundColor: c.cardBg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: s.cardGap,
    borderRadius: r.card,
    borderWidth: 1,
    borderColor: c.border,
    ...sh.wordCard,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  wordInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  learningFactorContainer: {
    alignItems: 'flex-end',
    marginLeft: width * 0.02,
  },
  learningFactorLabel: {
    fontSize: 10,
    color: c.textMuted,
    fontFamily: t.fontFamily.body,
    marginBottom: 2,
    letterSpacing: 1.5,
  },
  learningFactorValue: {
    fontSize: 14,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
    fontFamily: t.fontFamily.serif,
  },
  wordText: {
    fontSize: 16,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
    marginRight: width * 0.02,
    fontFamily: t.fontFamily.serif,
  },
  phoneticText: {
    fontSize: 14,
    color: c.textMuted,
    fontStyle: 'italic',
    fontFamily: t.fontFamily.body,
  },
  definitionText: {
    fontSize: 14,
    color: c.textMain,
    lineHeight: 20,
    fontFamily: t.fontFamily.body,
  },
  noWordsContainer: {
    padding: width * 0.04,
    alignItems: 'center',
    marginTop: height * 0.1,
  },
  noWordsText: {
    fontSize: 18,
    color: c.textMuted,
    fontFamily: Platform.select({ ios: 'DM Sans', android: 'sans-serif' }),
    fontWeight: '600',
    marginBottom: height * 0.01,
  },
  noWordsSubtext: {
    fontSize: 14,
    color: c.textMuted,
    fontFamily: Platform.select({ ios: 'Inter', android: 'sans-serif' }),
    textAlign: 'center',
  },
  dailyProgressSection: {
    backgroundColor: c.cardBg,
    borderRadius: r.cardLarge,
    marginHorizontal: s.pageHorizontal,
    marginTop: 0,
    marginBottom: s.sectionVertical,
    paddingTop: 16,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    ...sh.sophisticated,
  },
  dailyProgressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.primary,
    marginBottom: 10,
    fontFamily: Platform.select({ ios: 'DM Sans', android: 'sans-serif' }),
  },
  arcProgressContainer: {
    width: 180,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 10,
    
  },
  arcProgressCenterTextContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    height: 90,
  },
  arcProgressPercentText: {
    fontSize: 24,
    fontWeight: '700',
    color: c.primary,
    fontFamily: Platform.select({ ios: 'DM Sans', android: 'sans-serif' }),
  },
  arcProgressInfoContainer: {
    marginTop: 6,
    alignItems: 'center',
  },
  arcProgressInfoText: {
    fontSize: 12,
    color: c.textMuted,
    fontFamily: t.fontFamily.body,
    marginVertical: 2,
    letterSpacing: 1,
  },
  radarChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s.cardGap,
    paddingHorizontal: 6,
  },
  levelBarContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 6,
  },
  swipeableCardScrollView: {
    width: '100%',
  },
  swipeableCardContent: {
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  swipeableCardPage: {
    width: width - (width * 0.04 * 2),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s.cardPadding,
    paddingVertical: 6,
    minHeight: 260,
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  pageIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: c.border,
    opacity: 0.9,
  },
  pageIndicatorDotActive: {
    backgroundColor: c.primary,
    width: 18,
    height: 5,
    borderRadius: 3,
    opacity: 1,
  },
  // 卡片式功能入口区样式
  featureGridBg: {
    paddingHorizontal: width * 0.04,
    paddingTop: height * 0.01,
    paddingBottom: height * 0.01,
  },
  featureGridCard: {
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.02,
    elevation: 2,
  },
  featureGridItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: height * 0.01,
  },
  featureGridText: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'Inter', android: 'sans-serif' }),
    lineHeight: 20,
  },
  dateGroupContainer: {
    marginBottom: height * 0.03,
  },
  dateGroupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0C1A30',
    marginBottom: height * 0.015,
    fontFamily: Platform.select({ ios: 'DM Sans', android: 'sans-serif' }),
  },
  articleContainer: {
    backgroundColor: '#FFF7E6',
    borderRadius: 8,
    padding: width * 0.03,
    marginBottom: height * 0.015,
    borderLeftWidth: 3,
    borderLeftColor: '#FC9B33',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FC9B33',
    marginBottom: height * 0.005,
    fontFamily: Platform.select({ ios: 'DM Sans', android: 'sans-serif' }),
  },
  articleSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: height * 0.01,
    fontFamily: Platform.select({ ios: 'Inter', android: 'sans-serif' }),
  },
  // Tool Section styles
  toolSection: {
    flexDirection: 'row',
    height: 125,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    marginHorizontal: width * 0.04,
    marginVertical: height * 0.02,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  // Word book tool item
  toolItem1: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  toolIcon1: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  toolText1: {
    width: 39,
    height: 25,
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 11,
    lineHeight: 25,
    textAlign: 'center',
    color: '#5C5D61',
  },
  // 复习测验
  toolItem2: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  toolIcon2: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  toolText2: {
    width: 52,
    height: 25,
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 11,
    lineHeight: 25,
    textAlign: 'center',
    color: '#5C5D61',
  },
  // 收藏句子
  toolItem3: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  toolIcon3: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  toolText3: {
    width: 52,
    height: 25,
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 11,
    lineHeight: 25,
    textAlign: 'center',
    color: '#5C5D61',
  },
  // 收藏短语
  toolItem4: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  toolIcon4: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  toolText4: {
    width: 52,
    height: 25,
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 11,
    lineHeight: 25,
    textAlign: 'center',
    color: '#5C5D61',
  },
});
import { SpeakApi } from '@data/api/SpeakApi';
import { DailyNewWord } from '@data/model/WordPreview';
import { Ionicons } from '@expo/vector-icons';
import { useDailyLearningLogs } from '@hooks/useDailyLearningLogs';
import { useTheme } from '@hooks/useTheme';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  designTokensColors as c,
  radius as r,
  spacing as s,
  typography as t
} from '../../constants/designTokens';
import { recipes } from '../../constants/recipes';

let Audio: any = null;

const { width, height } = Dimensions.get('window');

interface WordPreviewProps {
  logId: number;
  words: DailyNewWord[];
  onBackPress?: () => void; // Optional custom back handler
}

export const WordPreview: React.FC<WordPreviewProps> = ({ logId, words, onBackPress }) => {
  const { theme } = useTheme();
  const router = useRouter();
  const soundRef = useRef<any>(null);
  
  // Global hidden state for English/Chinese
  const [englishHidden, setEnglishHidden] = useState(false); // false: show all, true: hide all
  const [chineseHidden, setChineseHidden] = useState(false);
  // Exception sets: when hidden, these are shown; when shown, these are hidden
  const [englishExceptions, setEnglishExceptions] = useState<Set<number>>(new Set());
  const [chineseExceptions, setChineseExceptions] = useState<Set<number>>(new Set());
  
  // State for reviewed words modal
  const [showReviewedWordsModal, setShowReviewedWordsModal] = useState(false);
  
  // Get all logs from Redux to find the current log
  const { logs } = useDailyLearningLogs();
  
  // Get reviewed words only from the current passage (logId)
  const currentReviewedWords = React.useMemo(() => {
    console.log('[WordPreview] Collecting reviewed words for current logId:', logId, 'type:', typeof logId);
    
    if (!logId) {
      console.log('[WordPreview] No logId provided');
      return [];
    }
    
    if (!Array.isArray(logs) || logs.length === 0) {
      console.log('[WordPreview] No logs available or logs is empty');
      return [];
    }
    
    // Convert logId to number for comparison (in case it's a string)
    const logIdNum = typeof logId === 'string' ? parseInt(logId, 10) : logId;
    
    // Find the current log by logId (try both number and string comparison)
    const currentLog = logs.find((log: any) => {
      const logIdMatch = log.id === logIdNum || log.id === logId || String(log.id) === String(logId);
      return logIdMatch;
    }) as any;
    
    console.log('[WordPreview] Searching for log:', {
      searchLogId: logId,
      searchLogIdNum: logIdNum,
      logsCount: logs.length,
      allLogIds: logs.map((l: any) => ({ id: l.id, type: typeof l.id, title: l.english_title }))
    });
    
    if (!currentLog) {
      console.log('[WordPreview] Current log not found for logId:', logId);
      console.log('[WordPreview] Available log IDs:', logs.map((l: any) => l.id));
      return [];
    }
    
    // Check both field names: daily_reviewed_words (expected) and daily_review_words (actual API)
    const reviewedWords = currentLog.daily_reviewed_words || (currentLog as any).daily_review_words;
    
    console.log('[WordPreview] Current log found:', {
      id: currentLog.id,
      englishTitle: currentLog.english_title,
      hasDailyReviewedWords: !!currentLog.daily_reviewed_words,
      hasDailyReviewWords: !!(currentLog as any).daily_review_words,
      reviewedWords: reviewedWords,
      reviewedWordsType: typeof reviewedWords,
      reviewedWordsIsArray: Array.isArray(reviewedWords),
      reviewedWordsLength: reviewedWords?.length || 0,
    });
    
    if (reviewedWords && Array.isArray(reviewedWords) && reviewedWords.length > 0) {
      console.log('[WordPreview] Current log has', reviewedWords.length, 'reviewed words');
      return reviewedWords;
    } else {
      console.log('[WordPreview] Current log has no reviewed words or invalid format');
      return [];
    }
  }, [logId, logs]);

  // Handle English word click
  const handleEnglishWordClick = (wordId: number) => {
    const newSet = new Set(englishExceptions);
    if (englishHidden) {
      // All hidden, click to show this word
      if (newSet.has(wordId)) {
        newSet.delete(wordId); // remove from exceptions, so stays hidden
      } else {
        newSet.add(wordId); // add to exceptions, so show this word
      }
    } else {
      // All shown, click to hide this word
      if (newSet.has(wordId)) {
        newSet.delete(wordId); // remove from exceptions, so stays shown
      } else {
        newSet.add(wordId); // add to exceptions, so hide this word
      }
    }
    setEnglishExceptions(newSet);
  };

  // Handle Chinese word click
  const handleChineseWordClick = (wordId: number) => {
    const newSet = new Set(chineseExceptions);
    if (chineseHidden) {
      // All hidden, click to show this word
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
    } else {
      // All shown, click to hide this word
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
    }
    setChineseExceptions(newSet);
  };

  // Handle global English toggle
  const handleToggleEnglish = () => {
    setEnglishHidden(!englishHidden);
    setEnglishExceptions(new Set()); // clear all exceptions
  };

  // Handle global Chinese toggle
  const handleToggleChinese = () => {
    setChineseHidden(!chineseHidden);
    setChineseExceptions(new Set());
  };

  const handleSoundPress = async (word: string) => {
    if (!word) return;

    try {
      const url = await SpeakApi.getInstance().getSpeechUrl({ word });
      console.log('[WordPreview] 尝试播放语音，URL:', url);

      if (!Audio) {
        try {
          const mod = require('expo-av');
          Audio = mod.Audio;
        } catch (e) {
          console.error('[WordPreview] Failed to load expo-av:', e);
          return;
        }
      }

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync({ uri: url });
      soundRef.current = sound;
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error: any) {
      console.error('[WordPreview] 语音播放失败:', error.message || error);
    }
  };

  // Handle start learning button
  const handleStartLearning = () => {
    console.log('[WordPreview] Starting learning for logId:', logId);
    router.push({
      pathname: '/PassageMain',
      params: { sessionId: logId.toString() }
    });
  };

  // Handle back button
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress(); // Use custom back logic if provided
    } else {
      router.back(); // Default: go back
    }
  };

  // Render individual word item with two-column layout
  const renderWordItem = (word: DailyNewWord) => {
    // English show/hide logic
    let shouldShowEnglish;
    if (englishHidden) {
      // All hidden, only show if in exceptions
      shouldShowEnglish = englishExceptions.has(word.id);
    } else {
      // All shown, hide if in exceptions
      shouldShowEnglish = !englishExceptions.has(word.id);
    }
    // Chinese show/hide logic
    let shouldShowChinese;
    if (chineseHidden) {
      shouldShowChinese = chineseExceptions.has(word.id);
    } else {
      shouldShowChinese = !chineseExceptions.has(word.id);
    }

    return (
      <View key={word.id} style={[recipes.card.wordCard, styles.wordItemLayout]}>
        <Pressable
          style={({ pressed }) => [
            recipes.card.wordCardSide,
            styles.englishSide,
            pressed && styles.wordCardSidePressed,
          ]}
          onPress={() => handleEnglishWordClick(word.id)}
        >
          {shouldShowEnglish ? (
            <View style={styles.englishContent}>
              <View style={styles.englishWordRow}>
                <View style={styles.englishTextContainer}>
                  <Text style={styles.wordText}>{word.word}</Text>
                  <Text style={styles.phoneticText}>{word.phonetic}</Text>
                </View>
                <TouchableOpacity
                  style={styles.soundButton}
                  onPress={() => handleSoundPress(word.word)}
                >
                  <Ionicons name="volume-high-outline" size={20} color={c.accent} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.hiddenPlaceholder} />
          )}
        </Pressable>

        <View style={styles.wordCardDivider} />

        <Pressable
          style={({ pressed }) => [
            recipes.card.wordCardSide,
            styles.chineseSide,
            pressed && styles.wordCardSidePressed,
          ]}
          onPress={() => handleChineseWordClick(word.id)}
        >
          {shouldShowChinese ? (
            <Text style={styles.definitionText}>{word.definition}</Text>
          ) : (
            <View style={styles.hiddenPlaceholder} />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header - brand style aligned with MainPage / Words, with back button */}
      <View
        style={[
          styles.headerWrap,
          { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color={c.primary} />
          </TouchableOpacity>

          <View>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>仝文馆</Text>
              <Text style={styles.headerSubtitle}>— 沉浸语境，词自成章</Text>
            </View>
            <Text style={styles.headerBrand}>VenTong</Text>
          </View>
        </View>
      </View>

      <View style={styles.headerDivider} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Section: New Academic Terms */}
        <View style={styles.wordsSection}>
          <View style={recipes.sectionHeader.wordPreviewRow}>
            <View style={recipes.badge.badgeGreen}>
              <Text style={recipes.badge.badgeGreenText}>新学术词汇</Text>
            </View>
            <Text style={recipes.sectionHeader.wordPreviewCount}>
              {words.length} 个词
            </Text>
          </View>

          {__DEV__ && (
            <View style={styles.testSection}>
              <TouchableOpacity
                style={[recipes.button.primaryCta, styles.testButtonLayout]}
                onPress={() => {
                  setShowReviewedWordsModal(true);
                }}
              >
                <Text style={recipes.button.primaryCtaText}>
                  🧪 显示已复习词汇 ({currentReviewedWords.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {words.map(renderWordItem)}
        </View>
      </ScrollView>

      {/* Footer: Hide English / Show Chinese + 开始阅读 */}
      <View style={[styles.footer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.footerToggleRow}>
          <TouchableOpacity
            style={[recipes.button.secondaryOutline, !englishHidden && styles.toggleActive]}
            onPress={handleToggleEnglish}
          >
            <Text style={recipes.button.secondaryOutlineText}>
              {englishHidden ? '显示英文' : '隐藏英文'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[recipes.button.secondaryOutline, !chineseHidden && styles.toggleActive]}
            onPress={handleToggleChinese}
          >
            <Text style={recipes.button.secondaryOutlineText}>
              {chineseHidden ? '显示中文' : '隐藏中文'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={recipes.button.primaryCtaLarge}
          onPress={handleStartLearning}
        >
          <Text style={recipes.button.primaryCtaLargeText}>开始阅读</Text>
        </TouchableOpacity>
      </View>

      {/* Reviewed Words Modal */}
      <Modal
        visible={showReviewedWordsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewedWordsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[recipes.card.default, styles.modalContentLayout]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reviewed Words</Text>
              <TouchableOpacity
                onPress={() => setShowReviewedWordsModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={c.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {currentReviewedWords.length === 0 ? (
                <Text style={styles.emptyText}>No reviewed words found</Text>
              ) : (
                currentReviewedWords.map((word: DailyNewWord) => (
                  <View key={`${word.id}-${word.word}`} style={styles.reviewedWordItem}>
                    <View style={styles.reviewedWordRow}>
                      <View style={styles.reviewedWordTextContainer}>
                        <Text style={styles.reviewedWordText}>{word.word}</Text>
                        <Text style={styles.reviewedPhoneticText}>{word.phonetic}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.soundButton}
                        onPress={() => handleSoundPress(word.word)}
                      >
                        <Ionicons name="volume-high-outline" size={20} color={c.accent} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.reviewedDefinitionText}>{word.definition}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
    fontFamily: t.fontFamily.serifChinese,
    marginRight: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: t.fontWeight.bold,
    color: c.accent,
    letterSpacing: 2,
    fontFamily: t.fontFamily.body,
  },
  headerBrand: {
    fontSize: 11,
    fontWeight: t.fontWeight.bold,
    color: c.accent,
    letterSpacing: 2,
    marginTop: 2,
  },
  headerDivider: {
    width: 32,
    height: 1,
    backgroundColor: c.accent,
    opacity: 0.3,
    marginTop: 6,
    marginLeft: s.headerPaddingHorizontal + 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: s.pageHorizontal,
    paddingBottom: 160,
  },
  wordsSection: {
    marginBottom: s.sectionVertical,
  },
  testSection: {
    marginBottom: s.cardGap,
  },
  testButtonLayout: {
    marginBottom: s.cardGap,
  },
  toggleActive: {
    backgroundColor: 'rgba(26, 43, 60, 0.1)',
  },
  footer: {
    paddingHorizontal: s.pageHorizontal,
    paddingTop: 16,
    paddingBottom: s.bottomNavPaddingBottom,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  footerToggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  wordItemLayout: {
    marginBottom: 12,
  },
  englishSide: {
    borderRightWidth: 0,
  },
  chineseSide: {},
  wordCardSidePressed: {
    backgroundColor: c.wordCardTapBg,
  },
  wordCardDivider: {
    width: 1,
    backgroundColor: c.border,
    alignSelf: 'stretch',
  },
  englishContent: {
    alignItems: 'center',
    width: '100%',
  },
  englishWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  englishTextContainer: {
    flex: 1,
  },
  wordText: {
    fontSize: t.fontSize.cardTitle,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
    marginBottom: 4,
    fontFamily: t.fontFamily.serif,
    textAlign: 'center',
  },
  phoneticText: {
    fontSize: t.fontSize.sectionLabel,
    fontWeight: t.fontWeight.medium,
    color: c.textMuted,
    fontStyle: 'italic',
    fontFamily: t.fontFamily.body,
    textAlign: 'center',
  },
  soundButton: {
    padding: 8,
  },
  definitionText: {
    fontSize: t.fontSize.bodyMeta,
    color: c.textMain,
    lineHeight: 22,
    fontFamily: t.fontFamily.serifChinese,
    textAlign: 'center',
  },
  hiddenPlaceholder: {
    minHeight: 40,
    backgroundColor: c.progressBg,
    borderRadius: r.tag,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentLayout: {
    width: width * 0.9,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: s.cardPadding,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  modalTitle: {
    fontSize: t.fontSize.cardTitle,
    fontWeight: t.fontWeight.bold,
    color: c.textMain,
    fontFamily: t.fontFamily.body,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: height * 0.6,
  },
  reviewedWordItem: {
    padding: s.cardPadding,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  reviewedWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewedWordTextContainer: {
    flex: 1,
  },
  reviewedWordText: {
    fontSize: t.fontSize.bodyMeta,
    fontWeight: t.fontWeight.bold,
    color: c.primary,
    fontFamily: t.fontFamily.serif,
  },
  reviewedPhoneticText: {
    fontSize: t.fontSize.bodyMeta,
    color: c.textMuted,
    fontStyle: 'italic',
    fontFamily: t.fontFamily.body,
  },
  reviewedDefinitionText: {
    fontSize: t.fontSize.bodyMeta,
    color: c.textMain,
    lineHeight: 20,
    fontFamily: t.fontFamily.body,
  },
  emptyText: {
    padding: s.cardPadding,
    textAlign: 'center',
    color: c.textMuted,
    fontSize: t.fontSize.bodyMeta,
    fontFamily: t.fontFamily.body,
  },
}); 
export default WordPreview;
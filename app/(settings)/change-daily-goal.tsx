import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@data/repository/store';
import { useDailyLearningLogs } from '@hooks/useDailyLearningLogs';
import { HttpClient } from '@data/api/HttpClient';
import { API_ENDPOINTS } from '@data/api/ApiConfig';
import { recipes } from '@constants/recipes';

const dailyGoalOptions = [
  { id: 1, words: 10, articles: 1, title: '每日1篇文章', subtitle: '轻松学习' },
  { id: 2, words: 20, articles: 2, title: '每日2篇文章', subtitle: '常规练习' },
  { id: 3, words: 30, articles: 3, title: '每日3篇文章', subtitle: '强化学习' },
];

const dg = recipes.dailyGoalSelection;

export default function ChangeDailyGoalPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, selectedWordBookId } = useSelector((state: RootState) => state.auth);
  const { additional_information } = useDailyLearningLogs();
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBackPress = () => {
    router.back();
  };

  const handleGoalSelect = (goalId: number) => {
    setSelectedGoal(goalId);
    const goal = dailyGoalOptions.find(option => option.id === goalId);
    console.log('[ChangeDailyGoalPage] Selected goal:', {
      id: goalId,
      words: goal?.words,
      articles: goal?.articles,
      title: goal?.title
    });
  };

  const handleCompletePress = async () => {
    if (!selectedGoal || !user) return;

    setIsSubmitting(true);
    
    try {
      // 获取单词本ID
      let wordBookId: number;
      
      if (selectedWordBookId) {
        wordBookId = selectedWordBookId;
        console.log('[ChangeDailyGoalPage] Using word book ID from Redux state:', wordBookId);
      } else if (additional_information?.word_book?.id) {
        wordBookId = additional_information.word_book.id;
        console.log('[ChangeDailyGoalPage] Using word book ID from additional_information:', wordBookId);
      } else {
        console.log('[ChangeDailyGoalPage] No word book ID found, using default value');
        wordBookId = 1;
      }

      const dailyGoal = dailyGoalOptions.find(option => option.id === selectedGoal)?.words || 10;
      
      // 使用HttpClient和正确的端点配置
      const httpClient = HttpClient.getInstance();
      const endpoint = API_ENDPOINTS.ACCOUNT_INITIATION(
        wordBookId, 
        dailyGoal
      );
      
      console.log('[ChangeDailyGoalPage] Sending API request:', {
        endpoint,
        userId: user.id,
        wordBookId,
        dailyGoal
      });
  
      const response = await httpClient.post(endpoint, {});
  
      console.log('[ChangeDailyGoalPage] API response:', response);
      
      // 处理成功响应，跳转到主页面
      console.log('[ChangeDailyGoalPage] Account initiation completed successfully');
      router.replace('/(tabs)/MainPage');
      
    } catch (error) {
      console.error('[ChangeDailyGoalPage] API error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderGoalOption = (option: typeof dailyGoalOptions[0]) => {
    const isSelected = selectedGoal === option.id;
    return (
      <TouchableOpacity
        key={option.id}
        style={[dg.goalCard, isSelected && dg.goalCardSelected]}
        onPress={() => handleGoalSelect(option.id)}
      >
        <Text style={[dg.goalCardTitle, isSelected && dg.goalCardTitleSelected]}>
          {option.title}
        </Text>
        <Text style={[dg.goalCardSubtitle, isSelected && dg.goalCardSubtitleSelected]}>
          {option.subtitle}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[dg.screen, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={dg.header}>
          <Text style={dg.headerTitle}>设定您的每日学业目标</Text>
          <Text style={dg.headerSubtitle}>选择每日文章目标，开启学业之旅</Text>
          <View style={dg.headerDivider} />
        </View>

        <View style={dg.main}>
          <View style={dg.goalCardList}>
            {dailyGoalOptions.map(renderGoalOption)}
          </View>
        </View>

        <View style={dg.footer}>
          <TouchableOpacity
            style={[dg.confirmButton, (!selectedGoal || isSubmitting) && { backgroundColor: theme.colors.border, opacity: 0.8 }]}
            onPress={handleCompletePress}
            disabled={!selectedGoal || isSubmitting}
          >
            <Text style={dg.confirmButtonText}>
              {isSubmitting ? '提交中...' : '确认并开始'}
            </Text>
          </TouchableOpacity>
          <Text style={dg.footerQuote}>Veni, vidi, vici.</Text>
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={handleBackPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{
          position: 'absolute',
          left: 16,
          top: 32,
          width: 44,
          height: 44,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 50,
          elevation: 50,
        }}
        accessibilityRole="button"
      >
        <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
      </TouchableOpacity>

      {isSubmitting && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, fontSize: 16, color: theme.colors.primary, fontWeight: '600' }}>请稍候...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, Dimensions, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase/client';
import { MealPlan, MealType } from '../../types/meal_plan';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import Toast from 'react-native-toast-message';
import { RecipeSelector } from '../../components/RecipeSelector';
import { Recipe } from '../../types/recipe';
import { useRouter } from 'expo-router';
import analytics from '@react-native-firebase/analytics';
import { getGuestMealPlans, addGuestMealPlan, deleteGuestMealPlan } from '../../utils/storage';
import { useTranslation } from 'react-i18next';
import i18next from '../../locales'; // Import global i18n instance

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LABEL_WIDTH = 50;
const MEAL_COL_WIDTH = (SCREEN_WIDTH - 32 - LABEL_WIDTH) / 3;

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

export default function MealScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  // Safe translation helper
  const safeT = (key: string, options?: any) => i18next.t(key, options);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);

  const [currentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewingWeekStart, setViewingWeekStart] = useState(currentWeekStart);

  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  // recipeSelectorVisible seems unused in original file, but I'll check if I need it. Original used modalVisible for RecipeSelector.
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [customText, setCustomText] = useState('');
  const [saving, setSaving] = useState(false);

  const isCurrentWeek = isSameDay(viewingWeekStart, currentWeekStart);
  const nextWeekStart = addDays(currentWeekStart, 7);
  const isNextWeek = isSameDay(viewingWeekStart, nextWeekStart);

  const dayNames = t('meal.days', { returnObjects: true }) as string[];

  const fetchMealPlans = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      const startDate = format(viewingWeekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(viewingWeekStart, 6), 'yyyy-MM-dd');

      if (!user) {
        // Guest mode
        const guestPlans = await getGuestMealPlans(startDate, endDate);
        setMealPlans(guestPlans as any); // Type assertion needed or unification
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data, error } = await supabase
        .from('meal_plans')
        .select('*, recipes(id, title, thumbnail_url)')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);
      if (error) throw error;
      setMealPlans(data || []);
    } catch (error) {
      console.error('Error fetching meal plans:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [viewingWeekStart]);

  useEffect(() => {
    fetchMealPlans();
  }, [fetchMealPlans]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMealPlans();
  };

  const handleAddPress = (date: Date, type: MealType) => {
    setSelectedDate(date);
    setSelectedMealType(type);
    setSelectedRecipe(null);
    setCustomText('');
    setEntryModalVisible(true);
  };

  const handleSaveCustomMeal = async () => {
    if (!customText.trim()) return;
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      const dateStr = format(selectedDate!, 'yyyy-MM-dd');

      if (!user) {
        // Guest mode
        await addGuestMealPlan({
          date: dateStr,
          meal_type: selectedMealType!,
          custom_text: customText.trim(),
        });
      } else {
        const { error } = await supabase.from('meal_plans').insert({
          user_id: user.id,
          date: dateStr,
          meal_type: selectedMealType!,
          custom_text: customText.trim(),
        });
        if (error) throw error;
      }

      // Toast.show({ type: 'success', text1: t('meal.message.added') });
      setEntryModalVisible(false);
      fetchMealPlans();
      await analytics().logEvent('menu_added', {
        type: 'custom',
        text: customText.trim(),
      });
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: t('meal.message.save_failed') });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMeal = async (id: string, e?: any) => {
    // Prevent event propagation if pressing button inside cell
    if (e) e.stopPropagation();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Guest mode
        await deleteGuestMealPlan(id);
      } else {
        const { error } = await supabase.from('meal_plans').delete().eq('id', id);
        if (error) throw error;
      }
      // Toast.show({ type: 'success', text1: t('meal.message.deleted') });
      fetchMealPlans();
    } catch (error) {
      console.error('Error deleting meal:', error);
      Toast.show({ type: 'error', text1: t('meal.message.delete_failed') });
    }
  };

  const renderCell = (date: Date, type: MealType) => {
    const plan = mealPlans.find(
      p => isSameDay(new Date(p.date), date) && p.meal_type === type
    );

    // Hide entries where recipe was deleted (zombie entries) or incomplete data
    if (plan && (plan.custom_text || plan.recipes)) {
      // Determine background color: Recipe (Yellow/Orange) vs Custom (Light Gray)
      const isRecipe = !!plan.recipes;
      const bgColor = isRecipe ? '#FFE082' : '#F5F5F5';

      return (
        <TouchableOpacity
          style={[{ width: '100%', height: '100%', backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', position: 'relative', padding: 4 }]}
          onPress={() => {
            if (plan.recipe_id) router.push(`/detail/${plan.recipe_id}`);
          }}
        >
          {/* DELETE BUTTON */}
          <TouchableOpacity
            style={{ position: 'absolute', top: 2, right: 2, zIndex: 10 }}
            onPress={(e) => handleDeleteMeal(plan.id, e)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={16} color="rgba(0,0,0,0.3)" />
          </TouchableOpacity>

          <Text style={{ fontSize: 12, color: 'black', fontWeight: 'bold', textAlign: 'center' }} numberOfLines={3}>
            {plan.recipes?.title || plan.custom_text || t('common.menu')}
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={{ width: MEAL_COL_WIDTH, height: 60, justifyContent: 'center', alignItems: 'center' }}
        onPress={() => handleAddPress(date, type)}
      >
        <Ionicons name="add" size={20} color={Colors.gray[400]} />
      </TouchableOpacity>
    );
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(viewingWeekStart, i));

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerButton}>
          {!isCurrentWeek && (
            <TouchableOpacity onPress={() => setViewingWeekStart(currentWeekStart)} style={styles.arrowButton}>
              <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.headerTitle}>{isCurrentWeek ? t('meal.title_current') : t('meal.title_next')}</Text>

        <View style={styles.headerButton}>
          {!isNextWeek && (
            <TouchableOpacity onPress={() => setViewingWeekStart(nextWeekStart)} style={styles.arrowButton}>
              <Ionicons name="chevron-forward" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={{ borderWidth: 1, borderColor: '#ddd' }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ddd', backgroundColor: '#f0f0f0' }}>
            <View style={{ width: LABEL_WIDTH, borderRightWidth: 1, borderColor: '#ddd', height: 40 }} />
            {MEAL_TYPES.map(type => (
              <View key={type} style={{ width: MEAL_COL_WIDTH, height: 40, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderColor: '#ddd' }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'black' }}>{t(`meal.type.${type}`)}</Text>
              </View>
            ))}
          </View>

          {/* Body */}
          {weekDays.map((date, index) => {
            const dayName = dayNames[date.getDay()];
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <View key={index} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ddd', height: 80 }}>

                {/* Day Label - NO TODAY Highlight */}
                <View style={{
                  width: LABEL_WIDTH,
                  backgroundColor: '#f5f5f5',
                  borderRightWidth: 1,
                  borderColor: '#ddd',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: isWeekend ? Colors.error : 'black'
                  }}>
                    {dayName}
                  </Text>
                </View>

                {/* Meal Columns */}
                {MEAL_TYPES.map(type => (
                  <View key={type} style={{ width: MEAL_COL_WIDTH, borderRightWidth: 1, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' }}>
                    {renderCell(date, type)}
                  </View>
                ))}
              </View>
            )
          })}
        </View>
      </ScrollView>

      {/* Modal logic */}
      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <RecipeSelector
          onSelect={async (recipe) => {
            try {
              setSaving(true);
              const { data: { user } } = await supabase.auth.getUser();
              const dateStr = format(selectedDate!, 'yyyy-MM-dd');

              if (!user) {
                // Guest mode
                await addGuestMealPlan({
                  date: dateStr,
                  meal_type: selectedMealType!,
                  recipe_id: recipe.id,
                });
              } else {
                const { error } = await supabase.from('meal_plans').insert({
                  user_id: user.id,
                  date: dateStr,
                  meal_type: selectedMealType!,
                  recipe_id: recipe.id,
                });
                if (error) throw error;
              }

              // Toast.show({ type: 'success', text1: t('meal.message.added') });
              setModalVisible(false);
              fetchMealPlans();
              await analytics().logEvent('menu_added', {
                type: 'recipe',
                recipe_title: recipe.title,
                recipe_id: recipe.id,
              });
            } catch (error) {
              console.error(error);
            } finally {
              setSaving(false);
            }
          }}
          onClose={() => setModalVisible(false)}
        />
      </Modal>

      {/* NEW: Input Type Selection Modal */}
      <Modal
        visible={entryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEntryModalVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}
          activeOpacity={1}
          onPress={() => setEntryModalVisible(false)}
        >
          <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 20 }} onStartShouldSetResponder={() => true}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{safeT('meal.modal.title')}</Text>
              <TouchableOpacity onPress={() => setEntryModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.gray[400]} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: Colors.border.light,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                marginBottom: 16
              }}
              placeholder={safeT('meal.modal.placeholder')}
              value={customText}
              onChangeText={setCustomText}
              autoFocus
            />

            <TouchableOpacity
              style={{
                backgroundColor: Colors.gray[800],
                padding: 14,
                borderRadius: 8,
                alignItems: 'center',
                marginBottom: 12
              }}
              onPress={handleSaveCustomMeal}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{safeT('meal.modal.submit')}</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: Colors.border.light }} />
              <Text style={{ marginHorizontal: 8, color: Colors.gray[400], fontSize: 12 }}>{safeT('meal.modal.or')}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: Colors.border.light }} />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: Colors.primary,
                padding: 14,
                borderRadius: 8,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8
              }}
              onPress={() => {
                setEntryModalVisible(false);
                setModalVisible(true);
              }}
            >
              <Ionicons name="book-outline" size={20} color="black" />
              <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 16 }}>{safeT('meal.modal.select_recipe')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: Colors.primary,
  },
  headerButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButton: {
    padding: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 16 },
});

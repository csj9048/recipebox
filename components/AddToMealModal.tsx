import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { Colors } from '../constants/Colors';
import { MealType } from '../types/meal_plan';
import { format, addDays, startOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

interface AddToMealModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (date: Date, mealType: MealType) => Promise<void>;
    recipeTitle: string;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];
const MEAL_TYPE_LABELS: Record<MealType, string> = {
    breakfast: '아침',
    lunch: '점심',
    dinner: '저녁',
};

export function AddToMealModal({ visible, onClose, onSave, recipeTitle }: AddToMealModalProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedMealType, setSelectedMealType] = useState<MealType>('dinner');
    const [saving, setSaving] = useState(false);

    // Generate next 7 days
    const today = new Date();
    const nextDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));

    const handleSave = async () => {
        setSaving(true);
        await onSave(selectedDate, selectedMealType);
        setSaving(false);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.content} onPress={e => e.stopPropagation()}>
                    <View style={styles.header}>
                        <Text style={styles.title}>식단에 추가하기</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={Colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.recipeTitle}>{recipeTitle}</Text>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>날짜 선택</Text>
                        <View style={styles.dateList}>
                            {nextDays.map(date => {
                                const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                                return (
                                    <TouchableOpacity
                                        key={date.toISOString()}
                                        style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                                        onPress={() => setSelectedDate(date)}
                                    >
                                        <Text style={[styles.dateChipText, isSelected && styles.dateChipTextSelected]}>
                                            {format(date, 'M/d (EEE)', { locale: ko })}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>식사 시간</Text>
                        <View style={styles.typeRow}>
                            {MEAL_TYPES.map(type => {
                                const isSelected = selectedMealType === type;
                                return (
                                    <TouchableOpacity
                                        key={type}
                                        style={[styles.typeButton, isSelected && styles.typeButtonSelected]}
                                        onPress={() => setSelectedMealType(type)}
                                    >
                                        <Text style={[styles.typeButtonText, isSelected && styles.typeButtonTextSelected]}>
                                            {MEAL_TYPE_LABELS[type]}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <Text style={styles.saveButtonText}>추가하기</Text>
                        )}
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    recipeTitle: {
        fontSize: 16,
        color: Colors.primary,
        marginBottom: 24,
        fontWeight: '500',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        color: Colors.gray[600],
        marginBottom: 12,
    },
    dateList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dateChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.gray[50],
        borderWidth: 1,
        borderColor: Colors.border.light,
    },
    dateChipSelected: {
        backgroundColor: `${Colors.primary}10`,
        borderColor: Colors.primary,
    },
    dateChipText: {
        fontSize: 14,
        color: Colors.text.primary,
    },
    dateChipTextSelected: {
        color: Colors.primary,
        fontWeight: '500',
    },
    typeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: Colors.gray[50],
        borderWidth: 1,
        borderColor: Colors.border.light,
    },
    typeButtonSelected: {
        backgroundColor: `${Colors.primary}10`,
        borderColor: Colors.primary,
    },
    typeButtonText: {
        fontSize: 16,
        color: Colors.text.primary,
    },
    typeButtonTextSelected: {
        color: Colors.primary,
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
});

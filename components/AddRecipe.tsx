import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Recipe, RecipeInsert, RecipeUpdate } from '../types/recipe';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { saveGuestRecipe, updateGuestRecipe, getGuestRecipes } from '../utils/storage';
import { convertImageToBase64, uploadImage } from '../utils/image';
import analytics from '@react-native-firebase/analytics';

export function AddRecipe() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [thumbnail, setThumbnail] = useState<string>('');
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [extractionImages, setExtractionImages] = useState<string[]>([]);
  const [extractionImageUris, setExtractionImageUris] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [situationTagInput, setSituationTagInput] = useState('');
  const [situationTags, setSituationTags] = useState<string[]>([]);
  const [ingredientTagInput, setIngredientTagInput] = useState('');
  const [ingredientTags, setIngredientTags] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [imageCollapsed, setImageCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadRecipe();
    }
  }, [params.id]);

  const loadRecipe = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let data: Recipe | null = null;

      if (!user) {
        // Load from guest storage
        const guestRecipes = await getGuestRecipes();
        data = guestRecipes.find(r => r.id === params.id) || null;
      } else {
        // Load from Supabase
        const { data: remoteData, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', params.id)
          .single();
        if (error) throw error;
        data = remoteData;
      }

      if (data) {
        setEditingRecipe(data);
        setTitle(data.title || '');
        setBodyText(data.body_text || '');
        const safeThumbnail = (data.thumbnail_url && (data.thumbnail_url.startsWith('http') || data.thumbnail_url.startsWith('file'))) ? data.thumbnail_url : null;
        setThumbnail(safeThumbnail || '');
        setThumbnailUri(safeThumbnail);

        if (data.image_url) {
          try {
            const urls = JSON.parse(data.image_url);
            if (Array.isArray(urls)) {
              setExtractionImages(urls);
              setExtractionImageUris(urls);
            } else {
              setExtractionImages([data.image_url]);
              setExtractionImageUris([data.image_url]);
            }
          } catch {
            setExtractionImages([data.image_url]);
            setExtractionImageUris([data.image_url]);
          }
        }

        const sitTags = data.tags.filter((t: any) => t.type === 'situation').map((t: any) => t.name);
        const ingTags = data.tags.filter((t: any) => t.type === 'ingredient').map((t: any) => t.name);
        setSituationTags(sitTags);
        setIngredientTags(ingTags);
        setMemo(data.memo || '');
      }
    } catch (err) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: '레시피를 불러오는데 실패했습니다',
      });
    }
  };

  const pickThumbnail = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setThumbnailUri(result.assets[0].uri);
      setThumbnail(result.assets[0].uri);
    }
  };

  const pickExtractionImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const totalCount = extractionImages.length;
    if (totalCount >= 2) {
      Toast.show({
        type: 'error',
        text1: '이미지는 최대 2장까지 업로드할 수 있습니다',
      });
      return;
    }

    const maxImages = 2 - totalCount;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: maxImages,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map(asset => asset.uri);
      setExtractionImages([...extractionImages, ...newUris]);
      setExtractionImageUris([...extractionImageUris, ...newUris]);
      setCurrentImageIndex(extractionImages.length);
    }
  };

  const removeImage = (indexToRemove: number) => {
    const newImages = extractionImages.filter((_, i) => i !== indexToRemove);
    const newUris = extractionImageUris.filter((_, i) => i !== indexToRemove);
    setExtractionImages(newImages);
    setExtractionImageUris(newUris);

    if (currentImageIndex >= newImages.length && newImages.length > 0) {
      setCurrentImageIndex(newImages.length - 1);
    } else if (newImages.length === 0) {
      setCurrentImageIndex(0);
      setImageCollapsed(false);
    }
  };
  const handleAnalyzeImage = async () => {
    if (extractionImageUris.length === 0) {
      Toast.show({
        type: 'error',
        text1: '분석할 이미지를 먼저 업로드해주세요',
      });
      return;
    }

    await analytics().logEvent('click_ai_recipe');

    setAnalyzing(true);
    try {
      // Convert images to base64
      const imageBase64Array = await Promise.all(
        extractionImageUris.map(uri => convertImageToBase64(uri))
      );

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/analyze-recipe-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ imageBase64Array }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Image analysis error:', errorData);
        Toast.show({
          type: 'error',
          text1: '이미지 분석에 실패했습니다',
        });
        return;
      }

      const data = await response.json();

      if (data.error) {
        Toast.show({
          type: 'error',
          text1: '레시피를 가져오지 못했어요',
        });
        return;
      }

      // 분석 결과를 폼에 자동 입력
      if (data.title) setTitle(data.title);
      if (data.body_text) setBodyText(data.body_text);
      if (data.ingredientTags) {
        setIngredientTags(data.ingredientTags.map((t: string) => t.replace(/\s+/g, '')));
      }

      setImageCollapsed(true);
      Toast.show({
        type: 'success',
        text1: '이미지 분석이 완료되었습니다!',
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      Toast.show({
        type: 'error',
        text1: '이미지 분석 중 오류가 발생했습니다',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddSituationTag = () => {
    const tag = situationTagInput.trim().replace('#', '').replace(/\s+/g, '');
    if (tag && !situationTags.includes(tag)) {
      setSituationTags([...situationTags, tag]);
      setSituationTagInput('');
    }
  };

  const handleRemoveSituationTag = (tagToRemove: string) => {
    setSituationTags(situationTags.filter((tag) => tag !== tagToRemove));
  };

  const handleAddIngredientTag = () => {
    const tag = ingredientTagInput.trim().replace('#', '').replace(/\s+/g, '');
    if (tag && !ingredientTags.includes(tag)) {
      setIngredientTags([...ingredientTags, tag]);
      setIngredientTagInput('');
    }
  };

  const handleRemoveIngredientTag = (tagToRemove: string) => {
    setIngredientTags(ingredientTags.filter((tag) => tag !== tagToRemove));
  };


  const handleSubmit = async () => {
    if (!title.trim()) {
      Toast.show({
        type: 'error',
        text1: '레시피 제목을 입력해주세요',
      });
      return;
    }

    if (!bodyText.trim() && extractionImageUris.length === 0) {
      Toast.show({
        type: 'error',
        text1: '레시피 내용을 입력하거나 이미지를 업로드해주세요',
      });
      return;
    }

    setSaving(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Guest Mode
      if (!user) {
        console.log('--- Guest Mode Save Debug ---');
        let savedImageUrl = null;
        if (extractionImageUris.length > 0) {
          try {
            const savedUris = [];
            for (const uri of extractionImageUris) {
              const fileName = uri.split('/').pop() || `image_${Date.now()}.jpg`;
              const docDir = FileSystem.documentDirectory;
              if (!docDir) throw new Error('Document directory null');

              const newPath = docDir + 'guest_' + fileName;
              console.log('Img Process:', uri, '->', newPath);

              if (!uri.startsWith(docDir)) {
                console.log('Copying image...');
                await FileSystem.copyAsync({ from: uri, to: newPath });
                savedUris.push(newPath);
              } else {
                console.log('Skipping copy');
                savedUris.push(uri);
              }
            }
            savedImageUrl = JSON.stringify(savedUris);
          } catch (e) {
            console.error('Guest image save failed', e);
            savedImageUrl = JSON.stringify(extractionImageUris);
          }
        }

        let savedThumbnail = null;
        if (thumbnailUri) {
          try {
            const fileName = thumbnailUri.split('/').pop() || `thumb_${Date.now()}.jpg`;
            const docDir = FileSystem.documentDirectory;
            if (docDir) {
              const newPath = docDir + 'guest_thumb_' + fileName;
              console.log('Thumb Process:', thumbnailUri, '->', newPath);

              if (!thumbnailUri.startsWith(docDir)) {
                console.log('Copying thumb...');
                await FileSystem.copyAsync({ from: thumbnailUri, to: newPath });
                savedThumbnail = newPath;
              } else {
                savedThumbnail = thumbnailUri;
              }
            }
          } catch (e) {
            console.error('Guest thumb save failed', e);
            savedThumbnail = thumbnailUri;
          }
        }

        const newRecipe: Recipe = {
          id: editingRecipe ? editingRecipe.id : Date.now().toString(36) + Math.random().toString(36).substr(2),
          user_id: null,
          title: title.trim(),
          body_text: bodyText.trim(),
          memo,
          tags: [
            ...situationTags.map(name => ({ type: 'situation' as const, name })),
            ...ingredientTags.map(name => ({ type: 'ingredient' as const, name })),
          ],
          thumbnail_url: savedThumbnail,
          image_url: savedImageUrl,
          created_at: editingRecipe ? editingRecipe.created_at : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log('Saving Guest Recipe:', JSON.stringify(newRecipe, null, 2));

        if (editingRecipe) {
          const { updateGuestRecipe } = require('../utils/storage');
          await updateGuestRecipe(newRecipe);
        } else {
          await saveGuestRecipe(newRecipe);
        }

        console.log('Guest Save Done');
        router.back();
        return;
      }

      let thumbnailUrl: string | null = null;
      const extractionImageUrls: string[] = [];

      // Upload thumbnail if there's a new file
      if (thumbnailUri && !thumbnailUri.startsWith('http')) {
        const base64 = await convertImageToBase64(thumbnailUri);
        thumbnailUrl = await uploadImage(base64, 'thumbnail.jpg', 'image/jpeg');
      } else if (thumbnail && thumbnail.startsWith('http')) {
        thumbnailUrl = thumbnail;
      }

      // Upload extraction images
      for (let i = 0; i < extractionImageUris.length; i++) {
        const uri = extractionImageUris[i];
        if (uri.startsWith('http')) {
          extractionImageUrls.push(uri);
        } else {
          const base64 = await convertImageToBase64(uri);
          const url = await uploadImage(base64, `extraction-${i}.jpg`, 'image/jpeg');
          extractionImageUrls.push(url);
        }
      }

      const tags = [
        ...situationTags.map(tag => ({ type: 'situation' as const, name: tag })),
        ...ingredientTags.map(tag => ({ type: 'ingredient' as const, name: tag })),
      ];

      const imageUrlString = extractionImageUrls.length > 0
        ? JSON.stringify(extractionImageUrls)
        : null;

      if (editingRecipe) {
        // Update existing recipe
        const updateData: RecipeUpdate = {
          title: title.trim(),
          body_text: bodyText.trim(),
          memo,
          tags,
          thumbnail_url: thumbnailUrl,
          image_url: imageUrlString,
        };

        const { error } = await supabase
          .from('recipes')
          .update(updateData)
          .eq('id', editingRecipe.id);

        if (error) {
          console.error('Error updating recipe:', error);
          Toast.show({
            type: 'error',
            text1: '레시피 수정에 실패했습니다',
          });
          return;
        }

        await analytics().logEvent('recipe_updated', {
          title: title.trim(),
          has_image: !!imageUrlString,
        });


      } else {
        // Create new recipe
        const newRecipe: RecipeInsert = {
          user_id: user.id, // Explicitly set user_id
          title: title.trim(),
          body_text: bodyText.trim(),
          memo,
          tags,
          ...(thumbnailUrl && { thumbnail_url: thumbnailUrl }),
          ...(imageUrlString && { image_url: imageUrlString }),
        };

        const { error } = await supabase
          .from('recipes')
          .insert([newRecipe]);

        if (error) {
          console.error('Error creating recipe:', error);
          Toast.show({
            type: 'error',
            text1: '레시피 저장에 실패했습니다',
          });
          return;
        }

        await analytics().logEvent('recipe_created', {
          title: title.trim(),
          has_image: !!imageUrlString,
        });
      }

      router.back();
    } catch (err) {
      console.error('Error saving recipe:', err);
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : '레시피 저장 중 오류가 발생했습니다',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: Colors.primary, borderBottomWidth: 0 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editingRecipe ? '레시피 수정' : '새 레시피 추가'}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Thumbnail */}
        <View style={styles.section}>
          <Text style={styles.label}>사진</Text>
          {thumbnailUri ? (
            <View style={styles.thumbnailContainer}>
              <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} contentFit="contain" />
              <TouchableOpacity
                onPress={() => {
                  setThumbnail('');
                  setThumbnailUri(null);
                }}
                style={styles.removeButton}
              >
                <Ionicons name="close" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={pickThumbnail} style={styles.imagePickerButton}>
              <Ionicons name="camera" size={32} color={Colors.gray[400]} />
              <Text style={styles.imagePickerText}>사진 추가하기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>레시피 제목</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="예: 참치김밥"
            placeholderTextColor={Colors.gray[400]}
          />
        </View>

        {/* Body Text */}
        <View style={styles.section}>
          <Text style={styles.label}>레시피 텍스트</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bodyText}
            onChangeText={setBodyText}
            placeholder="레시피 내용을 입력하거나, 이미지를 업로드 해주세요"
            placeholderTextColor={Colors.gray[400]}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />

          {/* Extraction Images */}
          {extractionImageUris.length > 0 && (
            <>
              {imageCollapsed ? (
                <TouchableOpacity
                  onPress={() => setImageCollapsed(false)}
                  style={styles.collapseButton}
                >
                  <Text style={styles.collapseButtonText}>이미지 펼치기</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.imageContainer}>
                    <View style={styles.imageWrapper}>
                      <Image
                        source={{ uri: extractionImageUris[currentImageIndex] }}
                        style={styles.detailImage}
                        contentFit="contain"
                      />

                      {extractionImageUris.length > 1 && (
                        <View style={styles.imageCounter}>
                          <Text style={styles.imageCounterText}>
                            {currentImageIndex + 1} / {extractionImageUris.length}
                          </Text>
                        </View>
                      )}

                      {extractionImageUris.length > 1 && (
                        <>
                          {currentImageIndex > 0 && (
                            <TouchableOpacity
                              onPress={() => setCurrentImageIndex(currentImageIndex - 1)}
                              style={[styles.imageNavButton, styles.imageNavButtonLeft]}
                            >
                              <Ionicons name="chevron-back" size={20} color={Colors.white} />
                            </TouchableOpacity>
                          )}
                          {currentImageIndex < extractionImageUris.length - 1 && (
                            <TouchableOpacity
                              onPress={() => setCurrentImageIndex(currentImageIndex + 1)}
                              style={[styles.imageNavButton, styles.imageNavButtonRight]}
                            >
                              <Ionicons name="chevron-forward" size={20} color={Colors.white} />
                            </TouchableOpacity>
                          )}
                        </>
                      )}

                      <TouchableOpacity
                        onPress={() => removeImage(currentImageIndex)}
                        style={styles.removeImageButton}
                      >
                        <Ionicons name="close" size={20} color={Colors.white} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setImageCollapsed(true)}
                        style={styles.collapseButtonBottom}
                      >
                        <Text style={styles.collapseButtonText}>이미지 접기</Text>
                      </TouchableOpacity>
                    </View>
                  </View>



                  <TouchableOpacity
                    onPress={handleAnalyzeImage}
                    disabled={analyzing}
                    style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled, { flexDirection: 'column', gap: 4, paddingVertical: 12, height: 'auto' }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {analyzing ? (
                        <ActivityIndicator size="small" color={Colors.text.primary} />
                      ) : (
                        <Ionicons name="sparkles" size={18} color={Colors.text.primary} />
                      )}
                      <Text style={styles.analyzeButtonText}>
                        {analyzing ? 'AI 분석 중...' : 'AI로 레시피 가져오기'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: Colors.gray[600], textAlign: 'center' }}>
                      사진 속 레시피를 정리하고 재료 해시태그를 추가해드려요
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {extractionImageUris.length < 2 && (
            <TouchableOpacity onPress={pickExtractionImages} style={styles.addImageButton}>
              <Ionicons name="add" size={20} color={Colors.primary} />
              <Text style={styles.addImageButtonText}>이미지 추가</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Ingredient Tags */}
        <View style={styles.section}>
          <Text style={styles.label}>재료별 해시태그</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.input, styles.tagInput]}
              value={ingredientTagInput}
              onChangeText={setIngredientTagInput}
              placeholder="예: 오이, 참치"
              placeholderTextColor={Colors.gray[400]}
              onSubmitEditing={handleAddIngredientTag}
            />
            <TouchableOpacity onPress={handleAddIngredientTag} style={styles.addTagButton}>
              <Text style={styles.addTagButtonText}>추가</Text>
            </TouchableOpacity>
          </View>
          {ingredientTags.length > 0 && (
            <View style={styles.tagsRow}>
              {ingredientTags.map((tag) => (
                <View key={tag} style={[styles.tag, styles.ingredientTag]}>
                  <Text style={styles.tagText}>#{tag}</Text>
                  <TouchableOpacity onPress={() => handleRemoveIngredientTag(tag)}>
                    <Ionicons name="close" size={14} color={Colors.text.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Situation Tags */}
        <View style={styles.section}>
          <Text style={styles.label}>상황별 해시태그</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.input, styles.tagInput]}
              value={situationTagInput}
              onChangeText={setSituationTagInput}
              placeholder="예: 유아식, 한식, 한끼요리"
              placeholderTextColor={Colors.gray[400]}
              onSubmitEditing={handleAddSituationTag}
            />
            <TouchableOpacity onPress={handleAddSituationTag} style={styles.addTagButton}>
              <Text style={styles.addTagButtonText}>추가</Text>
            </TouchableOpacity>
          </View>
          {situationTags.length > 0 && (
            <View style={styles.tagsRow}>
              {situationTags.map((tag) => (
                <View key={tag} style={[styles.tag, styles.situationTag]}>
                  <Text style={styles.tagText}>#{tag}</Text>
                  <TouchableOpacity onPress={() => handleRemoveSituationTag(tag)}>
                    <Ionicons name="close" size={14} color={Colors.text.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Memo */}
        <View style={styles.section}>
          <Text style={styles.label}>코멘트</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={memo}
            onChangeText={setMemo}
            placeholder="예: 레시피대로 하니까 조금 짰음. 다음 번엔 소금 덜 넣기"
            placeholderTextColor={Colors.gray[400]}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={saving}
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.text.primary} />
            ) : (
              <Ionicons name="cloud-upload-outline" size={20} color={Colors.text.primary} />
            )}
            <Text style={styles.submitButtonText}>
              {saving ? '저장 중...' : '레시피 저장'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerButton: {
    width: 40,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  thumbnailContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.gray[50],
  },
  thumbnail: {
    width: '100%',
    height: 200,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.error,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerButton: {
    height: 128,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border.medium,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.white,
  },
  textArea: {
    minHeight: 160,
    paddingTop: 12,
  },
  imageContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.gray[50],
  },
  imageWrapper: {
    position: 'relative',
    paddingBottom: 48,
  },
  detailImage: {
    width: '100%',
    height: 300,
  },
  imageCounter: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  imageCounterText: {
    color: Colors.white,
    fontSize: 14,
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  imageNavButtonLeft: {
    left: 8,
  },
  imageNavButtonRight: {
    right: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.error,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapseButton: {
    paddingVertical: 12,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  collapseButtonText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  collapseButtonBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
  },
  helperText: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
    marginTop: 8,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  analyzeButtonDisabled: {
    opacity: 0.5,
  },
  analyzeButtonText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  addImageButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
  },
  addTagButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addTagButtonText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  ingredientTag: {
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  situationTag: {
    backgroundColor: Colors.gray[100],
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  tagText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
});


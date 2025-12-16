import { ChevronLeft, X, Upload, Sparkles, Camera, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Recipe, RecipeInsert, RecipeUpdate } from '../types/recipe';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AddRecipeProps {
  onNavigateToList: () => void;
  editingRecipe?: Recipe;
}

export function AddRecipe({ onNavigateToList, editingRecipe }: AddRecipeProps) {
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [thumbnail, setThumbnail] = useState<string>('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [extractionImages, setExtractionImages] = useState<string[]>([]);
  const [extractionImageFiles, setExtractionImageFiles] = useState<File[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [situationTagInput, setSituationTagInput] = useState('');
  const [situationTags, setSituationTags] = useState<string[]>([]);
  const [ingredientTagInput, setIngredientTagInput] = useState('');
  const [ingredientTags, setIngredientTags] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [imageCollapsed, setImageCollapsed] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const extractionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingRecipe) {
      setTitle(editingRecipe.title || '');
      setBodyText(editingRecipe.body_text || '');
      setThumbnail(editingRecipe.thumbnail_url || '');
      
      // Parse image_url as JSON array if it exists
      if (editingRecipe.image_url) {
        try {
          const urls = JSON.parse(editingRecipe.image_url);
          if (Array.isArray(urls)) {
            setExtractionImages(urls);
          } else {
            setExtractionImages([editingRecipe.image_url]);
          }
        } catch {
          // If not JSON, treat as single URL
          setExtractionImages([editingRecipe.image_url]);
        }
      }
      
      const sitTags = editingRecipe.tags.filter(t => t.type === 'situation').map(t => t.name);
      const ingTags = editingRecipe.tags.filter(t => t.type === 'ingredient').map(t => t.name);
      setSituationTags(sitTags);
      setIngredientTags(ingTags);
      setMemo(editingRecipe.memo || '');
    }
  }, [editingRecipe]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('이미지 파일만 업로드 가능합니다');
        return;
      }
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setThumbnail(event.target.result as string);
          toast.success('이미지가 추가되었습니다');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtractionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check total count (existing + new)
    const totalCount = extractionImages.length + files.length;
    if (totalCount > 2) {
      toast.error('이미지는 최대 2장까지 업로드할 수 있습니다');
      return;
    }

    const newImages: string[] = [];
    const newFiles: File[] = [];
    let processedCount = 0;

    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith('image/')) {
        toast.error('이미지 파일만 업로드 가능합니다');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string);
          newFiles.push(file);
          processedCount++;

          if (processedCount === files.length) {
            setExtractionImages([...extractionImages, ...newImages]);
            setExtractionImageFiles([...extractionImageFiles, ...newFiles]);
            setCurrentImageIndex(extractionImages.length); // Move to first new image
            toast.success(`이미지 ${files.length}장이 추가되었습니다`);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const newImages = extractionImages.filter((_, i) => i !== indexToRemove);
    const newFiles = extractionImageFiles.filter((_, i) => i !== indexToRemove);
    
    setExtractionImages(newImages);
    setExtractionImageFiles(newFiles);
    
    // Adjust current index
    if (currentImageIndex >= newImages.length && newImages.length > 0) {
      setCurrentImageIndex(newImages.length - 1);
    } else if (newImages.length === 0) {
      setCurrentImageIndex(0);
      setImageCollapsed(false);
    }
    
    toast.success('이미지가 삭제되었습니다');
  };

  const handleAnalyzeImage = async () => {
    if (extractionImages.length === 0) {
      toast.error('분석할 이미지를 먼저 업로드해주세요');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f9c124c9/analyze-recipe-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ imageBase64Array: extractionImages }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Image analysis error:', errorData);
        toast.error('이미지 분석에 실패했습니다');
        return;
      }

      const data = await response.json();

      if (data.error) {
        toast.error('레시피를 가져오지 못했어요');
        return;
      }

      // 분석 결과를 폼에 자동 입력
      if (data.title) setTitle(data.title);
      if (data.body_text) setBodyText(data.body_text);
      if (data.ingredientTags) setIngredientTags(data.ingredientTags);

      // AI 분석 완료 후 이미지를 접어놓기
      setImageCollapsed(true);
      
      toast.success('이미지 분석이 완료되었습니다!');
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast.error('이미지 분석 중 오류가 발생했습니다');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddSituationTag = () => {
    const tag = situationTagInput.trim().replace('#', '');
    if (tag && !situationTags.includes(tag)) {
      setSituationTags([...situationTags, tag]);
      setSituationTagInput('');
    }
  };

  const handleRemoveSituationTag = (tagToRemove: string) => {
    setSituationTags(situationTags.filter((tag) => tag !== tagToRemove));
  };

  const handleAddIngredientTag = () => {
    const tag = ingredientTagInput.trim().replace('#', '');
    if (tag && !ingredientTags.includes(tag)) {
      setIngredientTags([...ingredientTags, tag]);
      setIngredientTagInput('');
    }
  };

  const handleRemoveIngredientTag = (tagToRemove: string) => {
    setIngredientTags(ingredientTags.filter((tag) => tag !== tagToRemove));
  };

  const handleSituationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSituationTag();
    }
  };

  const handleIngredientKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddIngredientTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('레시피 제목을 입력해주세요');
      return;
    }

    // Check if there's either body text or extraction image
    if (!bodyText.trim() && extractionImages.length === 0) {
      toast.error('레시피 내용을 입력하거나 이미지를 업로드해주세요');
      return;
    }

    try {
      let thumbnailUrl: string | null = null;
      const extractionImageUrls: string[] = [];

      // Upload thumbnail if there's a new file
      if (thumbnailFile) {
        const reader = new FileReader();
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(thumbnailFile);
        });

        const uploadResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-f9c124c9/upload-image`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              fileBase64,
              fileName: thumbnailFile.name,
              fileType: thumbnailFile.type,
            }),
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          console.error('Error uploading thumbnail:', errorData);
          toast.error('썸네일 업로드에 실패했습니다');
          return;
        }

        const { publicUrl } = await uploadResponse.json();
        thumbnailUrl = publicUrl;
      } else if (thumbnail && thumbnail.startsWith('http')) {
        // Keep existing URL if not deleted
        thumbnailUrl = thumbnail;
      }

      // Upload extraction images if there are new files
      for (let i = 0; i < extractionImages.length; i++) {
        const image = extractionImages[i];
        
        if (image.startsWith('http')) {
          // Existing URL, keep it
          extractionImageUrls.push(image);
        } else if (extractionImageFiles[i]) {
          // New file to upload
          const reader = new FileReader();
          const fileBase64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(extractionImageFiles[i]);
          });

          const uploadResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-f9c124c9/upload-image`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify({
                fileBase64,
                fileName: extractionImageFiles[i].name,
                fileType: extractionImageFiles[i].type,
              }),
            }
          );

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            console.error('Error uploading extraction image:', errorData);
            toast.error('이미지 업로드에 실패했습니다');
            return;
          }

          const { publicUrl } = await uploadResponse.json();
          extractionImageUrls.push(publicUrl);
        }
      }

      const tags = [
        ...situationTags.map(tag => ({ type: 'situation' as const, name: tag })),
        ...ingredientTags.map(tag => ({ type: 'ingredient' as const, name: tag })),
      ];

      // Store image URLs as JSON string
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
          toast.error('레시피 수정에 실패했습니다');
          return;
        }

        toast.success('레시피가 수정되었습니다');
      } else {
        // Create new recipe
        const newRecipe: RecipeInsert = {
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
          toast.error('레시피 저장에 실패했습니다');
          return;
        }

        toast.success('레시피가 저장되었습니다');
      }

      onNavigateToList();
    } catch (err) {
      console.error('Error saving recipe:', err);
      toast.error('레시피 저장 중 오류가 발생했습니다');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile App Header */}
      <div className="bg-[#FDD360] border-b border-gray-300 sticky top-0 z-10">
        <div className="flex items-center justify-center px-4 py-3">
          <button 
            onClick={onNavigateToList}
            className="absolute left-4 p-2 -ml-2 hover:bg-[#FDD360]/80 rounded-full transition-colors"
          >
            <ChevronLeft className="size-6 text-gray-900" />
          </button>
          <h1 className="text-gray-900" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
            {editingRecipe ? '레시피 수정' : '새 레시피 추가'}
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <Card className="border-0 shadow-none rounded-none bg-white">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Thumbnail photo at the top */}
              <div className="space-y-2">
                <Label>사진</Label>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {thumbnail ? (
                  <div className="relative border rounded-lg overflow-hidden bg-gray-50">
                    <img
                      src={thumbnail}
                      alt="Thumbnail"
                      className="w-full max-h-64 object-contain"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setThumbnail('');
                        setThumbnailFile(null);
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-gray-400 transition-colors bg-gray-50"
                  >
                    <Camera className="size-8 text-gray-400" />
                    <span className="text-sm text-gray-500">사진 추가하기</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">레시피 제목</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 참치김밥"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">레시피 설명</Label>
                
                {/* Hidden file input - support multiple files */}
                <input
                  ref={extractionInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleExtractionFileUpload}
                  className="hidden"
                />
                
                {/* Show images if uploaded */}
                {extractionImages.length > 0 && (
                  <>
                    {imageCollapsed ? (
                      <button
                        type="button"
                        onClick={() => setImageCollapsed(false)}
                        className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        이미지 {extractionImages.length}장 펼치기
                      </button>
                    ) : (
                      <>
                        <div className="relative border rounded-lg overflow-hidden">
                          <div className="pb-10">
                            {/* Carousel for images */}
                            <div className="relative">
                              <img
                                src={extractionImages[currentImageIndex]}
                                alt={`Preview ${currentImageIndex + 1}`}
                                className="w-full max-h-64 object-contain bg-gray-50"
                              />
                              
                              {/* Image counter */}
                              {extractionImages.length > 1 && (
                                <div className="absolute top-2 left-2 bg-black/60 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                                  {currentImageIndex + 1} / {extractionImages.length}
                                </div>
                              )}
                              
                              {/* Navigation buttons */}
                              {extractionImages.length > 1 && (
                                <>
                                  {currentImageIndex > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
                                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                                    >
                                      <ChevronLeft className="size-5" />
                                    </button>
                                  )}
                                  {currentImageIndex < extractionImages.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => setCurrentImageIndex(currentImageIndex + 1)}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                                    >
                                      <ChevronRight className="size-5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Loading overlay during AI analysis */}
                          {analyzing && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <div className="bg-white px-6 py-3 rounded-lg shadow-lg">
                                <p className="text-sm font-medium">레시피 가져오는 중...</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Delete button for current image */}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => handleRemoveImage(currentImageIndex)}
                          >
                            <X className="size-4" />
                          </Button>
                          
                          {/* Collapse button at the bottom of image */}
                          <button
                            type="button"
                            onClick={() => setImageCollapsed(true)}
                            className="absolute bottom-0 left-0 right-0 w-full py-2 bg-gray-900/60 text-white hover:bg-gray-900/70 transition-colors text-sm backdrop-blur-sm"
                          >
                            이미지 접기
                          </button>
                        </div>
                        
                        {/* Helper text - centered and shorter */}
                        <p className="text-sm text-gray-500 text-center">
                          사진 속 레시피와 재료를 정리해드려요
                          {extractionImages.length > 1 && ' (모든 사진 종합)'}
                        </p>
                        
                        {/* AI analyze button - centered */}
                        <div className="flex justify-center mb-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAnalyzeImage}
                            disabled={analyzing}
                          >
                            <Sparkles className="size-4 mr-2" />
                            {analyzing ? 'AI 분석 중...' : 'AI로 레시피 가져오기'}
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}
                
                {/* Textarea */}
                <Textarea
                  id="description"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="레시피 내용을 입력하거나, 이미지를 업로드 해주세요"
                  rows={8}
                />
                
                {/* Upload button - show when less than 2 images */}
                {extractionImages.length < 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => extractionInputRef.current?.click()}
                  >
                    <Upload className="size-4 mr-2" />
                    이미지 올리기 {extractionImages.length > 0 && `(${extractionImages.length}/2)`}
                  </Button>
                )}
              </div>

              {/* Swap order: ingredient tags first, then situation tags */}
              <div className="space-y-2">
                <Label htmlFor="ingredientTags">재료별 해시태그</Label>
                <div className="flex gap-2">
                  <Input
                    id="ingredientTags"
                    value={ingredientTagInput}
                    onChange={(e) => setIngredientTagInput(e.target.value)}
                    onKeyDown={handleIngredientKeyDown}
                    placeholder="예: 오이, 참치"
                  />
                  <Button type="button" onClick={handleAddIngredientTag} variant="outline">
                    추가
                  </Button>
                </div>
                {ingredientTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {ingredientTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientTag(tag)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="situationTags">상황별 해시태그</Label>
                <div className="flex gap-2">
                  <Input
                    id="situationTags"
                    value={situationTagInput}
                    onChange={(e) => setSituationTagInput(e.target.value)}
                    onKeyDown={handleSituationKeyDown}
                    placeholder="예: 한끼요리, 초대"
                  />
                  <Button type="button" onClick={handleAddSituationTag} variant="outline">
                    추가
                  </Button>
                </div>
                {situationTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {situationTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveSituationTag(tag)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">코멘트</Label>
                <Textarea
                  id="comments"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="예: 레시피대로 하니까 조금 짰음. 다음 번엔 소금 덜 넣기"
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  <Upload className="size-4 mr-2" />
                  레시피 저장
                </Button>
                <Button type="button" variant="outline" onClick={onNavigateToList}>
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
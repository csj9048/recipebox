import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Create storage bucket on startup
async function initializeStorage() {
  const bucketName = 'make-f9c124c9-recipes';
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
  
  if (!bucketExists) {
    await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
    });
    console.log(`Created storage bucket: ${bucketName}`);
  } else {
    // Update bucket to public if it already exists
    await supabase.storage.updateBucket(bucketName, {
      public: true,
      fileSizeLimit: 5242880,
    });
    console.log(`Updated storage bucket: ${bucketName} to public`);
  }
}

// Initialize storage on server start
initializeStorage().catch(console.error);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-f9c124c9/health", (c) => {
  return c.json({ status: "ok" });
});

// Analyze recipe image with OpenAI Vision API
app.post("/make-server-f9c124c9/analyze-recipe-image", async (c) => {
  try {
    const { imageBase64Array } = await c.req.json();
    
    if (!imageBase64Array || !Array.isArray(imageBase64Array) || imageBase64Array.length === 0) {
      return c.json({ error: 'No images provided' }, 400);
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured');
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    // Build content array with text and all images
    const contentArray: any[] = [
      {
        type: 'text',
        text: `이미지에서 레시피 정보를 추출해주세요. ${imageBase64Array.length > 1 ? `총 ${imageBase64Array.length}장의 이미지를 종합해서 분석해주세요.` : ''} 다음 JSON 형식으로 응답해주세요:
{
  "title": "요리 이름",
  "body_text": "재료 목록과 만드는 방법만 포함. 반드시 [재료]와 [방법] 섹션으로 구조화하고, 재료는 각 줄 앞에 하이픈(-)을 붙여서 ���스트 형태로 표시해주세요. 서론, 설명, 꾸밈말은 모두 제외하고 순수하게 [재료]와 [방법] 내용만 추출해주세요.",
  "ingredients": ["재료1", "재료2", ...],
  "ingredientTags": ["주요 재료 태그 (예: 오이, 참치, 돼지고기 등)"]
}

중요: 
1. body_text는 반드시 다음 형식을 따라야 합니다:
   [재료]
   - 재료1
   - 재료2
   ...
   
   [방법]
   1. 첫 번째 조리 단계
   2. 두 번째 조리 단계
   ...

2. body_text에는 요리에 대한 설명이나 감상, 추천 문구 등은 절대 포함하지 말고, 오직 재료 목록과 만드는 방법(조리 순서)만 정확하게 추출해주세요.
3. 재료 목록의 각 재료는 반드시 "- 재료명" 형식으로 하이픈을 앞에 붙여주세요.
4. situationTags는 포함하지 마세요. ingredientTags만 포함해주세요.
${imageBase64Array.length > 1 ? '5. 여러 이미지에 나눠진 레시피는 모두 종합해서 하나의 완전한 레시피로 정리해주세요.' : ''}

이미지에 레시피가 없다면 null을 반환하고, error 필드에 "레시피를 찾을 수 없습니다"를 포함해주세요.`,
      },
    ];

    // Add all images to the content array
    imageBase64Array.forEach((imageBase64: string) => {
      contentArray.push({
        type: 'image_url',
        image_url: {
          url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
        },
      });
    });

    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: contentArray,
          },
        ],
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return c.json({ error: 'Failed to analyze image with OpenAI API', details: errorData }, response.status);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return c.json({ error: 'No response from OpenAI' }, 500);
    }

    // Parse JSON response (handle markdown code blocks)
    try {
      // Remove markdown code blocks if present
      let jsonString = content.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      
      const parsed = JSON.parse(jsonString);
      return c.json(parsed);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      return c.json({ error: 'Failed to parse AI response', rawContent: content }, 500);
    }

  } catch (error) {
    console.error('Error analyzing recipe image:', error);
    return c.json({ error: 'Internal server error while analyzing image', details: String(error) }, 500);
  }
});

// Upload image endpoint
app.post("/make-server-f9c124c9/upload-image", async (c) => {
  try {
    const { fileBase64, fileName, fileType } = await c.req.json();
    
    if (!fileBase64 || !fileName) {
      return c.json({ error: 'File data and name are required' }, 400);
    }

    // Convert base64 to blob
    const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileExt = fileName.split('.').pop();
    const filePath = `${Date.now()}.${fileExt}`;

    // Upload using service role key (bypasses RLS)
    const { error: uploadError } = await supabase.storage
      .from('make-f9c124c9-recipes')
      .upload(filePath, buffer, {
        contentType: fileType || 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return c.json({ error: 'Failed to upload image', details: uploadError.message }, 500);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('make-f9c124c9-recipes')
      .getPublicUrl(filePath);

    return c.json({ publicUrl });

  } catch (error) {
    console.error('Error in upload endpoint:', error);
    return c.json({ error: 'Internal server error while uploading', details: String(error) }, 500);
  }
});

Deno.serve(app.fetch);
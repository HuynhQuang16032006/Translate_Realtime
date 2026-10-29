import { GoogleGenAI, Type } from '@google/genai';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Universal JSON responder compatible with both Vercel and Node http.ServerResponse
  const sendResponse = (statusCode: number, data: any) => {
    if (typeof res.status === 'function') {
      return res.status(statusCode).json(data);
    }
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(data));
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendResponse(500, {
      error: 'GEMINI_API_KEY chưa được cấu hình. Vui lòng thêm biến môi trường trên Vercel hoặc file .env',
    });
  }

  // Diagnostic GET to list available models
  if (req.method === 'GET') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const modelsList = await ai.models.list();
      const modelNames: string[] = [];
      for await (const m of modelsList) {
        if (m.supportedActions?.includes('generateContent') || m.name) {
          modelNames.push(m.name || '');
        }
      }
      return sendResponse(200, { availableModels: modelNames });
    } catch (e: any) {
      return sendResponse(500, { error: e.message });
    }
  }

  if (req.method !== 'POST') {
    return sendResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    const { audioBase64, mimeType, speakerLang } = req.body || {};

    if (!audioBase64) {
      return sendResponse(400, { error: 'Missing audioBase64 payload.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Sanitize mimeType for Gemini API
    let cleanMimeType = mimeType || 'audio/webm';
    if (cleanMimeType.includes(';')) {
      cleanMimeType = cleanMimeType.split(';')[0].trim();
    }

    const systemInstruction = `Bạn là thông dịch viên đồng thời cao cấp chuyên nghiệp phục vụ triển lãm, đàm phán thương mại và giao tiếp đa quốc gia.
Nhiệm vụ:
1. Lắng nghe tệp âm thanh (ngôn ngữ dự kiến: ${speakerLang || 'vi, zh, hoặc en'}).
2. Nhận diện chính xác ngôn ngữ được nói (vi: Tiếng Việt, zh: Tiếng Trung Giản thể, en: Tiếng Anh).
3. Dịch chuẩn xác sang cả 3 ngôn ngữ: Tiếng Việt (vi), Tiếng Trung (zh) và Tiếng Anh (en).
4. QUY TẮC NHẬN DIỆN:
   - Nếu nghe thấy bất kỳ từ ngữ, câu nói nào dù ngắn (ví dụ: "chào bạn", "giá này bao nhiêu", "你好", "hello", "ok", "máy móc", "hợp đồng"...), bạn BẮT BUỘC nhận diện, dịch và đặt "is_noise_or_empty": false.
   - CHỈ đặt "is_noise_or_empty": true nếu đoạn âm thanh HOÀN TOÀN KHÔNG CÓ TIẾNG NGƯỜI NÓI (chỉ là tiếng thở dài, tiếng im lặng hoặc tiếng gõ kim loại vô nghĩa).`;

    // Active Gemini models in Google AI Studio
    const candidateModels = [
      'gemini-3.7-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
    ];
    const modelErrors: Record<string, string> = {};
    let responseText = '';

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMimeType,
                    data: audioBase64,
                  },
                },
                {
                  text: 'Hãy nhận diện giọng nói trong đoạn ghi âm và dịch sang 3 ngôn ngữ theo đúng định dạng JSON.',
                },
              ],
            },
          ],
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                is_noise_or_empty: { type: Type.BOOLEAN },
                detected_lang: { type: Type.STRING, enum: ['vi', 'zh', 'en'] },
                original_text: { type: Type.STRING },
                translations: {
                  type: Type.OBJECT,
                  properties: {
                    vi: { type: Type.STRING },
                    zh: { type: Type.STRING },
                    en: { type: Type.STRING },
                  },
                  required: ['vi', 'zh', 'en'],
                },
              },
              required: ['is_noise_or_empty', 'detected_lang', 'original_text', 'translations'],
            },
            temperature: 0.1,
          },
        });

        if (response && response.text) {
          responseText = response.text;
          break; // Succeeded!
        }
      } catch (err: any) {
        modelErrors[modelName] = err?.message || String(err);
      }
    }

    if (!responseText) {
      return sendResponse(500, {
        error: 'Tất cả các model AI đều thất bại',
        modelErrors,
      });
    }

    const parsed = JSON.parse(responseText);
    return sendResponse(200, parsed);
  } catch (error: any) {
    console.error('Lỗi phiên dịch Gemini API:', error);
    return sendResponse(500, {
      error: 'Lỗi phiên dịch giọng nói',
      details: error?.message || String(error),
    });
  }
}

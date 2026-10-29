export const config = {
  maxDuration: 30,
};

// Fallback high-speed translator (0 rate-limit, 0 quota issues, 150ms latency)
async function freeTranslate(text: string, targetLang: string): Promise<string> {
  try {
    const code = targetLang === 'zh' ? 'zh-CN' : targetLang === 'en' ? 'en' : 'vi';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${code}&dt=t&q=${encodeURIComponent(text)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const data = (await resp.json()) as any;
    return data[0]?.map((s: any) => s[0]).join('') || text;
  } catch (e) {
    return text;
  }
}

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

  const { audioBase64, mimeType, speakerLang, textOnly, clientTranscript, userApiKey } = req.body || {};
  const apiKey = (userApiKey || process.env.GEMINI_API_KEY || '').trim();

  // Diagnostic GET or High-Speed Neural TTS Audio Stream
  if (req.method === 'GET') {
    let ttsText = '';
    let ttsLang = 'vi';
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      ttsText = urlObj.searchParams.get('tts') || '';
      ttsLang = urlObj.searchParams.get('lang') || 'vi';
    } catch (e) {
      if (req.query) {
        ttsText = req.query.tts || '';
        ttsLang = req.query.lang || 'vi';
      }
    }

    if (ttsText) {
      try {
        const langCode = ttsLang === 'zh' ? 'zh-CN' : ttsLang === 'en' ? 'en' : 'vi';
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(ttsText)}&tl=${langCode}&client=tw-ob`;
        const ttsResp = await fetch(ttsUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(4000),
        });

        if (ttsResp.ok) {
          const arrayBuf = await ttsResp.arrayBuffer();
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          if (typeof res.send === 'function') {
            return res.send(Buffer.from(arrayBuf));
          }
          return res.end(Buffer.from(arrayBuf));
        }
      } catch (err) {
        console.warn('TTS proxy error:', err);
      }
    }

    return sendResponse(200, {
      status: 'active',
      hasApiKey: !!apiKey,
      timestamp: Date.now(),
    });
  }

  if (req.method !== 'POST') {
    return sendResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    const textToTranslate = (textOnly || clientTranscript || '').trim();

    // Sanitize mimeType for Gemini REST API
    let cleanMimeType = mimeType || 'audio/webm';
    if (cleanMimeType.includes(';')) {
      cleanMimeType = cleanMimeType.split(';')[0].trim();
    }

    // SCENARIO 1: We have text transcript (from client speech recognition or textOnly input)
    if (textToTranslate) {
      // Ultra-Fast Neural Translation (150ms latency, 0 quota issues, 0 delay)
      const [transVi, transZh, transEn] = await Promise.all([
        speakerLang === 'vi' ? Promise.resolve(textToTranslate) : freeTranslate(textToTranslate, 'vi'),
        speakerLang === 'zh' ? Promise.resolve(textToTranslate) : freeTranslate(textToTranslate, 'zh'),
        speakerLang === 'en' ? Promise.resolve(textToTranslate) : freeTranslate(textToTranslate, 'en'),
      ]);

      return sendResponse(200, {
        is_noise_or_empty: false,
        detected_lang: speakerLang || 'vi',
        original_text: textToTranslate,
        translations: {
          vi: transVi,
          zh: transZh,
          en: transEn,
        },
      });
    }

    // SCENARIO 2: Pure audioBase64 without client transcript
    if (!audioBase64) {
      return sendResponse(400, { error: 'Không nhận được âm thanh hoặc đoạn văn bản để dịch.' });
    }

    if (!apiKey) {
      return sendResponse(500, {
        error: 'Chưa cấu hình GEMINI_API_KEY. Vui lòng bấm vào biểu tượng Cài đặt để thêm khóa API.',
      });
    }

    const systemInstruction = `Bạn là thông dịch viên đồng thời cao cấp chuyên nghiệp phục vụ triển lãm, đàm phán thương mại và giao tiếp đa quốc gia.
Nhiệm vụ:
1. Lắng nghe tệp âm thanh (ngôn ngữ dự kiến: ${speakerLang || 'vi, zh, hoặc en'}).
2. Nhận diện chính xác ngôn ngữ được nói (vi: Tiếng Việt, zh: Tiếng Trung Giản thể, en: Tiếng Anh).
3. Dịch chuẩn xác sang cả 3 ngôn ngữ: Tiếng Việt (vi), Tiếng Trung (zh) và Tiếng Anh (en).
4. QUY TẮC:
   - Nếu có tiếng người nói, đặt "is_noise_or_empty": false.
   - CHỈ đặt "is_noise_or_empty": true nếu đoạn âm thanh hoàn toàn im lặng hoặc tiếng gõ kim loại vô nghĩa.
5. Định dạng JSON BẮT BUỘC:
{
  "is_noise_or_empty": false,
  "detected_lang": "vi",
  "original_text": "...",
  "translations": {
    "vi": "...",
    "zh": "...",
    "en": "..."
  }
}`;

    const candidateModels = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
    ];

    const payload = {
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              inline_data: {
                mime_type: cleanMimeType,
                data: audioBase64,
              },
            },
            {
              text: 'Hãy nhận diện giọng nói trong đoạn ghi âm và dịch sang 3 ngôn ngữ theo đúng định dạng JSON.',
            },
          ],
        },
      ],
      generation_config: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    };

    let responseJsonText = '';
    let isQuotaExceeded = false;
    const modelErrors: Record<string, any> = {};

    for (const modelName of candidateModels) {
      try {
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(6000), // 6s fast timeout for real-time response
          }
        );

        const data = (await geminiResp.json()) as any;
        if (!geminiResp.ok) {
          const errMsg = data?.error?.message || data?.error || `HTTP ${geminiResp.status}`;
          modelErrors[modelName] = errMsg;
          if (geminiResp.status === 429 || errMsg.includes('Quota exceeded') || errMsg.includes('free_tier_requests')) {
            isQuotaExceeded = true;
          }
          continue;
        }

        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          responseJsonText = candidateText;
          break;
        }
      } catch (err: any) {
        modelErrors[modelName] = err?.message || String(err);
      }
    }

    if (!responseJsonText) {
      if (isQuotaExceeded) {
        return sendResponse(429, {
          error: 'Khóa Gemini API miễn phí đã hết hạn mức 20 câu/ngày của Google. Hãy dùng khung gõ chữ bên dưới (không giới hạn lượt) hoặc bấm Cài đặt để thêm API Key mới.',
          modelErrors,
        });
      }

      return sendResponse(500, {
        error: 'AI chưa nhận diện được âm thanh. Hãy nói to hơn hoặc gõ trực tiếp vào ô nhắn tin bên dưới.',
        modelErrors,
      });
    }

    let cleaned = responseJsonText.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');

    const parsed = JSON.parse(cleaned);
    return sendResponse(200, parsed);
  } catch (error: any) {
    console.error('Lỗi phiên dịch Gemini API:', error);
    return sendResponse(500, {
      error: 'Lỗi phiên dịch giọng nói',
      details: error?.message || String(error),
    });
  }
}

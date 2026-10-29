export const config = {
  maxDuration: 30,
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

  // Diagnostic GET to test candidate models with fast 4s timeout
  if (req.method === 'GET') {
    try {
      const testModels = [
        'gemini-2.5-flash',
        'gemini-flash-latest',
        'gemini-3.7-flash',
        'gemini-3.8-flash',
        'gemini-3.5-flash',
      ];
      const results: Record<string, any> = {};

      for (const m of testModels) {
        try {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Trả lời đúng 1 từ: OK' }] }],
              }),
              signal: AbortSignal.timeout(4000),
            }
          );
          const json = (await resp.json()) as any;
          results[m] = {
            status: resp.status,
            ok: resp.ok,
            text: json.candidates?.[0]?.content?.parts?.[0]?.text || json,
          };
          if (resp.ok) break; // Found working model
        } catch (e: any) {
          results[m] = { error: e.message };
        }
      }

      return sendResponse(200, { results });
    } catch (e: any) {
      return sendResponse(500, { error: e.message });
    }
  }

  if (req.method !== 'POST') {
    return sendResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    const { audioBase64, mimeType, speakerLang, textOnly } = req.body || {};

    if (!audioBase64 && !textOnly) {
      return sendResponse(400, { error: 'Missing audioBase64 payload.' });
    }

    // Sanitize mimeType for Gemini REST API
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
   - CHỈ đặt "is_noise_or_empty": true nếu đoạn âm thanh HOÀN TOÀN KHÔNG CÓ TIẾNG NGƯỜI NÓI (chỉ là tiếng thở dài, tiếng im lặng hoặc tiếng gõ kim loại vô nghĩa).
5. Định dạng JSON BẮT BUỘC:
{
  "is_noise_or_empty": false,
  "detected_lang": "vi",
  "original_text": "câu gốc người đó nói",
  "translations": {
    "vi": "bản dịch tiếng Việt",
    "zh": "bản dịch tiếng Trung",
    "en": "bản dịch tiếng Anh"
  }
}`;

    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
    ];

    const payload = {
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: textOnly
            ? [
                {
                  text: `Dịch câu thoại sau sang 3 ngôn ngữ theo đúng định dạng JSON: "${textOnly}"`,
                },
              ]
            : [
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
    const modelErrors: Record<string, any> = {};

    for (const modelName of candidateModels) {
      try {
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000), // 8s timeout per model
          }
        );

        const data = (await geminiResp.json()) as any;
        if (!geminiResp.ok) {
          modelErrors[modelName] = data?.error?.message || data?.error || `HTTP ${geminiResp.status}`;
          continue; // Try next model immediately
        }

        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          responseJsonText = candidateText;
          break; // Succeeded!
        }
      } catch (err: any) {
        modelErrors[modelName] = err?.message || String(err);
      }
    }

    if (!responseJsonText) {
      return sendResponse(500, {
        error: 'Tất cả các model AI đều thất bại',
        modelErrors,
      });
    }

    // Clean markdown code fence if present
    let cleaned = responseJsonText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

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

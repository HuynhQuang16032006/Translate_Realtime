import { GoogleGenAI, Type } from '@google/genai';

export const config = {
  maxDuration: 30, // 30 seconds for audio analysis
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY chưa được cấu hình trên Vercel Environment Variables.',
    });
  }

  try {
    const { audioBase64, mimeType, speakerLang } = req.body || {};

    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audioBase64 payload.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Sanitize mimeType for Gemini
    // Supports audio/webm, audio/mp4, audio/aac, audio/wav, audio/ogg
    let cleanMimeType = mimeType || 'audio/webm';
    if (cleanMimeType.includes(';')) {
      cleanMimeType = cleanMimeType.split(';')[0].trim();
    }

    const systemInstruction = `Bạn là thông dịch viên đồng thời cao cấp tại Triển lãm Máy móc Công nghiệp, Cơ khí Chế tạo, Tự động hóa và Đàm phán Thương mại Quốc tế tại Trung Quốc.
Nhiệm vụ của bạn:
1. Lắng nghe đoạn âm thanh (từ khách tham quan Việt Nam, đối tác Trung Quốc hoặc chuyên gia quốc tế). Ngôn ngữ dự kiến của người nói có thể là: ${speakerLang || 'vi, zh, hoặc en'}.
2. Nhận diện chính xác ngôn ngữ được nói (vi: Tiếng Việt, zh: Tiếng Trung Giản thể, en: Tiếng Anh).
3. Dịch nghĩa câu nói sang cả 3 ngôn ngữ: Tiếng Việt (vi), Tiếng Trung (zh) và Tiếng Anh (en). Sử dụng thuật ngữ cơ khí, kỹ thuật máy móc, thông số (dung sai, công suất, trục quay, động cơ servo, biến tần, khuôn mẫu, áp suất...) và điều khoản thương mại (giá FOB, CIF, EXW, đặt cọc, thanh toán L/C, bảo hành, linh kiện thay thế...) một cách chuẩn xác, tự nhiên và chuyên nghiệp nhất.
4. BỘ LỌC TẠP ÂM TRIỂN LÃM: Khu vực triển lãm rất nhiều tiếng ồn cơ khí (tiếng máy dập, động cơ rít, còi xe nâng, tiếng vỗ tay, ho, tiếng thở, hoặc im lặng). Nếu đoạn âm thanh KHÔNG chứa câu nói có nghĩa của con người hoặc chỉ toàn tạp âm vô nghĩa, bạn BẮT BUỘC trả về "is_noise_or_empty": true và để các trường text là chuỗi rỗng "".
5. Nếu là câu nói có nghĩa, đặt "is_noise_or_empty": false và điền đầy đủ original_text và translations cho 3 ngôn ngữ vi, zh, en.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
              text: 'Hãy xử lý đoạn ghi âm này theo hướng dẫn chuyên ngành và trả về định dạng JSON.',
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
        temperature: 0.1, // Low temperature for high accuracy in technical terms
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return res.status(200).json({
        is_noise_or_empty: true,
        detected_lang: 'vi',
        original_text: '',
        translations: { vi: '', zh: '', en: '' },
      });
    }

    const parsed = JSON.parse(responseText);
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('Lỗi phiên dịch Gemini API:', error);
    return res.status(500).json({
      error: 'Lỗi xử lý âm thanh từ AI',
      details: error?.message || String(error),
    });
  }
}

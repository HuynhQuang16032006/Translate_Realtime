import type { Language } from '../types';

export const translations = {
  vi: {
    app_title: 'ExpoTrans',
    app_subtitle: 'Phòng Phiên dịch Giọng nói Thời gian thực Đa thiết bị',
    app_badge: 'Real-time AI Audio',
    app_desc: 'Kết nối nhiều điện thoại qua mã QR để đàm phán, hội thoại và phiên dịch giọng nói 2 chiều tức thì.',
    
    // Join Screen
    join_welcome: 'Tham gia Phòng Phiên dịch',
    join_subwelcome: 'Quét mã hoặc nhập mã để bắt đầu đàm phán đa ngôn ngữ',
    your_name_label: 'Tên hiển thị của bạn:',
    your_name_placeholder: 'VD: Nguyễn Văn A, David, Vương Tổng...',
    your_lang_label: 'Ngôn ngữ mẹ đẻ của bạn:',
    room_code_label: 'Mã phòng:',
    room_placeholder: 'Nhập mã phòng hoặc tạo mới',
    generate_random_room: 'Tạo mã ngẫu nhiên',
    joining_room_badge: 'Đang tham gia phòng:',
    join_submit_btn: 'Tham gia phòng ngay',
    create_and_join_btn: 'Tạo phòng mới & Tham gia',
    feature_realtime_mqtt: 'Đồng bộ Realtime tức thì',
    feature_ai_specialized: 'AI Dịch thuật chính xác',

    // Room Header
    room_label: 'Phòng:',
    status_online: 'Trực tuyến',
    status_reconnecting: 'Đang nối lại...',
    status_offline: 'Mất kết nối',
    mode_vad: 'Rảnh tay (VAD)',
    mode_ptt: 'Chạm nói (PTT)',
    mode_vad_tooltip: 'Chế độ: Tự động nhận diện khi đưa máy sát miệng',
    mode_ptt_tooltip: 'Chế độ: Bấm để nói (Chống ồn tốt nhất)',
    auto_speak_on: 'Tự động phát: BẬT',
    auto_speak_off: 'Tự động phát: TẮT',
    auto_speak_tooltip: 'Tự động đọc bản dịch khi có người nói trong phòng',
    btn_qr: 'Mã QR',
    btn_calibrate: 'Lọc ồn',
    btn_leave: 'Rời phòng',

    // Live Status Bar
    status_ready: 'Phòng sẵn sàng • Nói để phiên dịch',
    status_you_speaking: 'Bạn đang nói (Đã khóa mic các máy khác)...',
    status_other_speaking: 'đang nói... (Các máy khác tạm ngưng)',
    status_ai_processing: 'AI đang nhận diện & phiên dịch chuyên ngành...',
    mic_level: 'Cường độ Mic:',
    emergency_unlock: 'Mở khóa',

    // Live Speech Popup
    just_spoke: 'Vừa nói',

    // Chat Feed
    chat_empty_title: 'Phòng phiên dịch đã sẵn sàng',
    chat_empty_desc: 'Bấm giữ nút Micro để nói hoặc đưa máy sát miệng. Hệ thống sẽ tự động dịch và phát âm thanh đến tất cả các máy trong phòng.',
    chat_empty_tip: '💡 Mẹo nhanh: Bấm nút "Mã QR" góc trên để các thành viên khác quét mã tham gia ngay lập tức.',
    chat_you: 'Bạn',
    chat_original_prefix: 'Gốc:',
    chat_speak_btn: 'Phát âm',
    chat_speaking_btn: 'Đang đọc...',

    // Audio Controls
    ptt_idle: 'Bấm để nói (Click to Speak)',
    ptt_recording: 'Đang ghi âm ({sec}s) • Bấm để Dừng & Dịch',
    ptt_locked: 'Mic đang bị khóa bởi {name}',
    ptt_processing: 'AI đang nhận diện & dịch thuật...',
    ptt_hint: '💡 Chế độ chống ồn máy móc & hội trường tối ưu',
    vad_active_title: 'Đang thu âm giọng nói...',
    vad_idle_title: 'Rảnh tay thông minh (Auto VAD)',
    vad_threshold_info: 'Ngưỡng nhạy: {db} dB • Đưa máy sát miệng để kích hoạt',
    vad_calibrate_btn: 'Cân chỉnh',

    // QR Modal
    qr_title: 'Mã QR Tham gia Phòng',
    qr_subtitle: 'Dùng camera hoặc trình duyệt quét mã để vào phòng tức thì',
    qr_scan_auto_hint: '✨ Quét mã này sẽ tự động điền mã phòng, người tham gia không cần gõ thủ công.',
    qr_copy_link: 'Sao chép link',
    qr_copied: 'Đã sao chép link!',
    qr_close: 'Đóng',

    // Noise Calibration Modal
    calib_title: 'Cân Chỉnh Lọc Ồn Môi Trường',
    calib_desc: 'Đo tiếng ồn nền xung quanh để hệ thống không bị kích hoạt nhầm bởi tiếng ồn xung quanh.',
    calib_auto_title: 'Đo ồn tự động (3 giây)',
    calib_auto_desc: 'Giữ yên lặng trong 3 giây để máy tự động đo cường độ âm thanh nền.',
    calib_start_btn: 'Bắt đầu đo tiếng ồn',
    calib_measuring: 'Đang đo tiếng ồn môi trường...',
    calib_success: 'Đã cân chỉnh mức tối ưu: {db} dB',
    calib_manual_label: 'Ngưỡng Proximity dB thủ công:',
    calib_sensitive: '-65 dB (Nhạy hơn)',
    calib_noise_resist: '-20 dB (Chống ồn cực mạnh)',
    calib_save_btn: 'Lưu cài đặt',
    calib_close_btn: 'Đóng',

    // WeChat Detector
    wechat_detected_title: 'Môi trường WeChat / Trình duyệt nội bộ',
    wechat_tip_action: 'Bấm vào góc trên bên phải 【 ··· 】',
    wechat_instruction_1: 'Bấm vào biểu tượng dấu ba chấm 【 ··· 】 ở góc trên bên phải màn hình.',
    wechat_instruction_2: 'Chọn "Mở bằng trình duyệt" (Safari / Chrome / Trình duyệt hệ thống) để cấp quyền Micro thu âm.',
    wechat_dismiss_btn: 'Tôi đã mở trình duyệt ngoài / Tiếp tục',
  },

  zh: {
    app_title: 'ExpoTrans',
    app_subtitle: '多设备实时语音同传会议室',
    app_badge: '实时 AI 语音',
    app_desc: '多部手机扫码一键连接，支持多语种现场双向即时同声传译。',

    // Join Screen
    join_welcome: '加入同传房间',
    join_subwelcome: '扫码或输入房间号，立即开启跨语言现场沟通',
    your_name_label: '您的姓名 / 称呼:',
    your_name_placeholder: '例如: 张总, 李工程师, David...',
    your_lang_label: '您的母语 / 听辨语言:',
    room_code_label: '房间号:',
    room_placeholder: '输入房间号或直接创建',
    generate_random_room: '随机生成房间号',
    joining_room_badge: '正在加入房间:',
    join_submit_btn: '立即加入房间',
    create_and_join_btn: '创建并进入房间',
    feature_realtime_mqtt: '低延迟毫秒级同传',
    feature_ai_specialized: '专业商务与工业级 AI 翻译',

    // Room Header
    room_label: '房间:',
    status_online: '在线',
    status_reconnecting: '重连中...',
    status_offline: '网络离线',
    mode_vad: '自由发言 (VAD)',
    mode_ptt: '按住对讲 (PTT)',
    mode_vad_tooltip: '自动模式：靠近麦克风即自动开始拾音',
    mode_ptt_tooltip: '对讲模式：点击或按住说话（降噪最稳）',
    auto_speak_on: '语音播报: 开启',
    auto_speak_off: '语音播报: 关闭',
    auto_speak_tooltip: '房间内有发言时自动播放您所选语言的翻译声音',
    btn_qr: '邀请码',
    btn_calibrate: '降噪校准',
    btn_leave: '退出',

    // Live Status Bar
    status_ready: '房间就绪 • 点击麦克风开始交流',
    status_you_speaking: '您正在发言 (其他手机麦克风已自动静音)...',
    status_other_speaking: '正在发言... (其他手机已锁定)',
    status_ai_processing: 'AI 正在极速识别并翻译专业词汇...',
    mic_level: '麦克风音量:',
    emergency_unlock: '解锁房间',

    // Live Speech Popup
    just_spoke: '刚刚发言',

    // Chat Feed
    chat_empty_title: '现场同传房间已就绪',
    chat_empty_desc: '按住或点击下方麦克风发言。系统将瞬间完成翻译并向房间所有设备自动朗读译文。',
    chat_empty_tip: '💡 快捷提示：点击右上角【邀请码】让现场同伴扫码直接加入。',
    chat_you: '您',
    chat_original_prefix: '原文:',
    chat_speak_btn: '朗读',
    chat_speaking_btn: '正在朗读...',

    // Audio Controls
    ptt_idle: '点击开始发言',
    ptt_recording: '正在录音 ({sec}s) • 点击完成并翻译',
    ptt_locked: '麦克风已被 {name} 占用',
    ptt_processing: '正在智能识别与翻译...',
    ptt_hint: '💡 针对机械展会与嘈杂车间优化的防串音对讲',
    vad_active_title: '正在录音中...',
    vad_idle_title: '智能自由拾音 (Auto VAD)',
    vad_threshold_info: '灵敏度: {db} dB • 靠近嘴边说话即触发',
    vad_calibrate_btn: '校准环境',

    // QR Modal
    qr_title: '扫码加入现场同传房间',
    qr_subtitle: '使用手机相机或微信扫码，一键直接进入房间',
    qr_scan_auto_hint: '✨ 扫码将自动填入房间号，无需手动输入任何代码。',
    qr_copy_link: '复制链接',
    qr_copied: '已复制链接！',
    qr_close: '关闭',

    // Noise Calibration Modal
    calib_title: '环境噪声校准',
    calib_desc: '测量展厅或现场背景噪声，防止周围噪音误触发录音。',
    calib_auto_title: '自动测噪 (3秒)',
    calib_auto_desc: '请保持周围安静3秒钟，设备将自动计算最佳拾音阈值。',
    calib_start_btn: '开始测量背景噪音',
    calib_measuring: '正在测量周围环境噪音...',
    calib_success: '已优化阈值: {db} dB',
    calib_manual_label: '手动设置门限 dB:',
    calib_sensitive: '-65 dB (更灵敏)',
    calib_noise_resist: '-20 dB (强效降噪)',
    calib_save_btn: '保存设置',
    calib_close_btn: '关闭',

    // WeChat Detector
    wechat_detected_title: '微信内置浏览器提示',
    wechat_tip_action: '请点击右上角 【 ··· 】',
    wechat_instruction_1: '点击右上角菜单按钮 【 ··· 】',
    wechat_instruction_2: '选择【在浏览器打开】（如 Safari、Chrome 或系统自带浏览器），以获取麦克风正常使用权限。',
    wechat_dismiss_btn: '已在外部浏览器打开 / 继续',
  },

  en: {
    app_title: 'ExpoTrans',
    app_subtitle: 'Multi-device Real-time Voice Translation Room',
    app_badge: 'Real-time AI Audio',
    app_desc: 'Connect multiple smartphones via QR code for instant, two-way multi-lingual voice interpretation.',

    // Join Screen
    join_welcome: 'Join Translation Room',
    join_subwelcome: 'Scan QR code or enter room code to start real-time multi-lingual dialogue',
    your_name_label: 'Your Display Name:',
    your_name_placeholder: 'E.g., John Smith, David, Lisa...',
    your_lang_label: 'Your Native / Target Language:',
    room_code_label: 'Room Code:',
    room_placeholder: 'Enter room code or create new',
    generate_random_room: 'Generate Random Code',
    joining_room_badge: 'Joining Room:',
    join_submit_btn: 'Join Room Now',
    create_and_join_btn: 'Create & Join Room',
    feature_realtime_mqtt: 'Low-latency Realtime Sync',
    feature_ai_specialized: 'Industrial & Business Translation',

    // Room Header
    room_label: 'Room:',
    status_online: 'Online',
    status_reconnecting: 'Reconnecting...',
    status_offline: 'Offline',
    mode_vad: 'Hands-free (VAD)',
    mode_ptt: 'Push-to-Talk (PTT)',
    mode_vad_tooltip: 'Hands-free: automatically starts when brought close to mouth',
    mode_ptt_tooltip: 'Push-to-Talk: click/hold to speak (best for loud noise)',
    auto_speak_on: 'Auto-Voice: ON',
    auto_speak_off: 'Auto-Voice: OFF',
    auto_speak_tooltip: 'Automatically read incoming translations in your language',
    btn_qr: 'QR Invite',
    btn_calibrate: 'Noise Calib',
    btn_leave: 'Leave',

    // Live Status Bar
    status_ready: 'Room Ready • Speak to translate',
    status_you_speaking: 'You are speaking (other mics muted)...',
    status_other_speaking: 'is speaking... (others muted)',
    status_ai_processing: 'AI is recognizing and translating...',
    mic_level: 'Mic Level:',
    emergency_unlock: 'Unlock',

    // Live Speech Popup
    just_spoke: 'Just Spoke',

    // Chat Feed
    chat_empty_title: 'Translation Room is Ready',
    chat_empty_desc: 'Hold or tap the mic button below to talk. Translations will be instantly broadcast and spoken out loud to all devices in the room.',
    chat_empty_tip: '💡 Pro Tip: Tap "QR Invite" at the top to let nearby partners scan and join in seconds.',
    chat_you: 'You',
    chat_original_prefix: 'Original:',
    chat_speak_btn: 'Listen',
    chat_speaking_btn: 'Reading...',

    // Audio Controls
    ptt_idle: 'Click to Speak',
    ptt_recording: 'Recording ({sec}s) • Click to Stop & Translate',
    ptt_locked: 'Microphone is locked by {name}',
    ptt_processing: 'Translating audio with AI...',
    ptt_hint: '💡 Optimized anti-echo intercom for loud factory booths',
    vad_active_title: 'Recording voice...',
    vad_idle_title: 'Smart Hands-free (Auto VAD)',
    vad_threshold_info: 'Sensitivity: {db} dB • Bring near mouth to trigger',
    vad_calibrate_btn: 'Calibrate',

    // QR Modal
    qr_title: 'Scan QR to Join Room',
    qr_subtitle: 'Use camera or mobile browser to join the session instantly',
    qr_scan_auto_hint: '✨ Scanning this QR code pre-fills the room code automatically.',
    qr_copy_link: 'Copy Link',
    qr_copied: 'Link Copied!',
    qr_close: 'Close',

    // Noise Calibration Modal
    calib_title: 'Background Noise Calibration',
    calib_desc: 'Measure ambient booth noise to prevent surrounding sounds from false-triggering the microphone.',
    calib_auto_title: 'Auto Noise Test (3 sec)',
    calib_auto_desc: 'Keep quiet for 3 seconds while your device calculates the optimal noise floor.',
    calib_start_btn: 'Start Measuring Noise',
    calib_measuring: 'Measuring ambient noise...',
    calib_success: 'Optimized threshold: {db} dB',
    calib_manual_label: 'Manual Proximity Threshold dB:',
    calib_sensitive: '-65 dB (More Sensitive)',
    calib_noise_resist: '-20 dB (Heavy Noise Rejection)',
    calib_save_btn: 'Save Settings',
    calib_close_btn: 'Close',

    // WeChat Detector
    wechat_detected_title: 'WeChat In-App Browser Notice',
    wechat_tip_action: 'Tap the top-right 【 ··· 】 button',
    wechat_instruction_1: 'Tap the three dots 【 ··· 】 in the top right corner.',
    wechat_instruction_2: 'Select "Open in Browser" (Safari, Chrome, or default browser) to grant microphone access.',
    wechat_dismiss_btn: 'Opened in external browser / Continue',
  },
};

export function t(key: keyof typeof translations['vi'], lang: Language, params?: Record<string, string | number>): string {
  const currentDict = translations[lang] || translations.vi;
  let text = currentDict[key] || translations.vi[key] || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, paramVal]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    });
  }

  return text;
}

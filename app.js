'use strict';

/* ============================================
   勤学小书仔 v6 - 主程序
   朗读 + 作业打卡(左右分栏) + 宠物养成 + 双积分池
   导航布局：朗读相关归朗读 / 作业相关归作业 / 宠物归宠物 / 奖励归奖励
   积分系统：⭐奖励积分(兑换奖励) + 🐾宠物积分(养育宠物) 互不冲突
   ============================================ */

// ============================================
// 1. 常量
// ============================================
const STORAGE_KEY = 'reading-coach-data-v4';
const DAILY_GOAL_MINUTES = 25;

// 朗读分级规则（积分与作业分级保持一致）
const GRADE_RULES = [
  { grade: 'S', name: '完美朗读', minErrors: 0,  maxErrors: 0,  points: 30, cls: 'grade-s' },
  { grade: 'A', name: '优秀',     minErrors: 1,  maxErrors: 3,  points: 20, cls: 'grade-a' },
  { grade: 'B', name: '良好',     minErrors: 4,  maxErrors: 8,  points: 12, cls: 'grade-b' },
  { grade: 'C', name: '及格',     minErrors: 9,  maxErrors: 15, points: 5,  cls: 'grade-c' },
  { grade: 'D', name: '需要努力', minErrors: 16, maxErrors: Infinity, points: -5, cls: 'grade-d' },
];

// 作业质量分级规则
const HW_GRADE_RULES = [
  { grade: 'S', name: '完美', desc: '全对、书写工整', points: 30, cls: 'grade-s' },
  { grade: 'A', name: '优秀', desc: '少量错误、书写认真', points: 20, cls: 'grade-a' },
  { grade: 'B', name: '良好', desc: '有部分错误、基本完成', points: 12, cls: 'grade-b' },
  { grade: 'C', name: '及格', desc: '错误较多、需订正', points: 5, cls: 'grade-c' },
  { grade: 'D', name: '需努力', desc: '未完成或错误太多', points: -5, cls: 'grade-d' },
];

const DEFAULT_REWARDS = [
  { id: 1, name: '麦当劳套餐', cost: 300, icon: '🍔' },
  { id: 2, name: '游戏20分钟', cost: 100, icon: '🎮' },
  { id: 3, name: '电影观看权', cost: 500, icon: '🎬' },
  { id: 4, name: '零食一份', cost: 50, icon: '🍪' },
];

// 宠物成长阶段
const PET_STAGES = [
  { stage: 0, name: '蛋',     emoji: '🥚', minLevel: 1,  desc: '刚出生的小蛋蛋' },
  { stage: 1, name: '幼宠',   emoji: '🐣', minLevel: 2,  desc: '破壳而出的小宝贝' },
  { stage: 2, name: '小宠',   emoji: '🐱', minLevel: 4,  desc: '活泼可爱的小宠物' },
  { stage: 3, name: '大宠',   emoji: '😸', minLevel: 7,  desc: '长大的好伙伴' },
  { stage: 4, name: '超级宠', emoji: '🦁', minLevel: 10, desc: '威风凛凛的超级宠物' },
];

// 宠物商店物品
const PET_SHOP_ITEMS = [
  { id: 'food1', name: '苹果',   icon: '🍎', cost: 20,  type: 'food', effect: { hunger: 30 }, desc: '饱食+30' },
  { id: 'food2', name: '肉骨头', icon: '🍖', cost: 50,  type: 'food', effect: { hunger: 50, happiness: 5 }, desc: '饱食+50 快乐+5' },
  { id: 'food3', name: '蛋糕',   icon: '🎂', cost: 80,  type: 'food', effect: { hunger: 40, happiness: 20 }, desc: '饱食+40 快乐+20' },
  { id: 'food4', name: '冰淇淋', icon: '🍦', cost: 40,  type: 'food', effect: { hunger: 25, happiness: 15 }, desc: '饱食+25 快乐+15' },
  { id: 'toy1',  name: '玩具球', icon: '🎾', cost: 30,  type: 'toy',  effect: { happiness: 30 }, desc: '快乐+30' },
  { id: 'toy2',  name: '气球',   icon: '🎈', cost: 20,  type: 'toy',  effect: { happiness: 20 }, desc: '快乐+20' },
  { id: 'toy3',  name: '积木',   icon: '🧩', cost: 60,  type: 'toy',  effect: { happiness: 40, exp: 10 }, desc: '快乐+40 经验+10' },
  { id: 'care1', name: '洗澡露', icon: '🧴', cost: 40,  type: 'care', effect: { health: 30 }, desc: '健康+30' },
  { id: 'care2', name: '维生素', icon: '💊', cost: 60,  type: 'care', effect: { health: 50 }, desc: '健康+50' },
  { id: 'care3', name: '小窝',   icon: '🏠', cost: 100, type: 'care', effect: { health: 20, happiness: 20 }, desc: '健康+20 快乐+20' },
  { id: 'special1', name: '经验药水', icon: '⚗️', cost: 150, type: 'special', effect: { exp: 50 }, desc: '经验+50' },
];

// ============================================
// 2. 数据存储 (localStorage)
// ============================================
const Store = {
  data: null,

  init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { this.data = JSON.parse(saved); }
      catch(e) { this.data = this.createDefault(); }
    } else {
      this.data = this.createDefault();
    }
    // 确保新字段存在（兼容旧数据）
    if (this.data.petPoints === undefined) this.data.petPoints = 0;
    if (!this.data.homeworks) this.data.homeworks = [];
    if (!this.data.pet) this.data.pet = { name: '', level: 1, exp: 0, hunger: 80, happiness: 80, health: 100, lastUpdate: null };
    if (!this.data.petInventory) this.data.petInventory = {};
    if (!this.data.petActionLog) this.data.petActionLog = [];
    this.updatePetDecay();
  },

  createDefault() {
    return {
      childName: '小朋友',
      totalPoints: 0,
      petPoints: 0,
      sessions: [],
      homeworks: [],
      rewards: [...DEFAULT_REWARDS],
      redeemedRewards: [],
      lastReadDate: null,
      currentStreak: 0,
      dailyGoalStreak: 0,
      pet: { name: '', level: 1, exp: 0, hunger: 80, happiness: 80, health: 100, lastUpdate: new Date().toISOString() },
      petInventory: {},
      petActionLog: [],
    };
  },

  save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); },

  // --- 朗读 ---
  addSession(session) {
    this.data.sessions.push(session);
    this.data.totalPoints = Math.max(0, this.data.totalPoints + session.points);
    this.data.petPoints = Math.max(0, this.data.petPoints + session.points);

    const today = new Date().toISOString().split('T')[0];
    if (this.data.lastReadDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      this.data.currentStreak = (this.data.lastReadDate === yesterday)
        ? (this.data.currentStreak || 0) + 1 : 1;
      this.data.lastReadDate = today;
    }

    const metGoal = session.duration >= DAILY_GOAL_MINUTES * 60;
    if (metGoal) {
      this.data.dailyGoalStreak = (this.data.dailyGoalStreak || 0) + 1;
      if (this.data.dailyGoalStreak % 7 === 0) {
        this.data.totalPoints += 30;
        this.data.petPoints += 30;
      }
    } else {
      this.data.dailyGoalStreak = 0;
    }
    this.save();
  },

  getTodayTotalSeconds() {
    const today = new Date().toISOString().split('T')[0];
    return this.data.sessions
      .filter(s => s.date.startsWith(today))
      .reduce((sum, s) => sum + s.duration, 0);
  },

  // --- 作业 ---
  addHomework(hw) {
    this.data.homeworks.push(hw);
    this.save();
  },

  submitHomework(id, photoData) {
    const hw = this.data.homeworks.find(h => h.id === id);
    if (!hw) return;
    hw.status = 'submitted';
    hw.submittedPhoto = photoData;
    hw.submittedDate = new Date().toISOString();
    this.save();
  },

  gradeHomework(id, grade, comment) {
    const hw = this.data.homeworks.find(h => h.id === id);
    if (!hw) return;
    hw.status = 'graded';
    hw.grade = grade;
    hw.comment = comment || '';
    hw.gradedDate = new Date().toISOString();
    const rule = HW_GRADE_RULES.find(r => r.grade === grade);
    if (rule) {
      hw.points = rule.points;
      // 倒扣积分时不能扣到负数
      this.data.totalPoints = Math.max(0, this.data.totalPoints + rule.points);
      this.data.petPoints = Math.max(0, this.data.petPoints + rule.points);
    }
    this.save();
  },

  deleteHomework(id) {
    this.data.homeworks = this.data.homeworks.filter(h => h.id !== id);
    this.save();
  },

  // --- 通用积分（同时存入两个池） ---
  addPoints(points) {
    this.data.totalPoints += points;
    this.data.petPoints += points;
    this.save();
  },

  // --- 奖励 ---
  redeemReward(rewardId) {
    const reward = this.data.rewards.find(r => r.id === rewardId);
    if (!reward || this.data.totalPoints < reward.cost) return false;
    this.data.totalPoints -= reward.cost;
    this.data.redeemedRewards.push({
      name: reward.name, icon: reward.icon, cost: reward.cost,
      date: new Date().toISOString(),
    });
    this.save();
    return true;
  },

  // --- 宠物（消耗petPoints） ---
  buyPetItem(itemId) {
    const item = PET_SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return false;
    if (this.data.petPoints < item.cost) return false;
    this.data.petPoints -= item.cost;
    if (!this.data.petInventory[itemId]) this.data.petInventory[itemId] = 0;
    this.data.petInventory[itemId]++;
    this.save();
    return true;
  },

  usePetItem(itemId) {
    const item = PET_SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return null;
    if (!this.data.petInventory[itemId] || this.data.petInventory[itemId] <= 0) return null;
    this.data.petInventory[itemId]--;
    if (this.data.petInventory[itemId] <= 0) delete this.data.petInventory[itemId];
    const pet = this.data.pet;
    const changes = {};
    if (item.effect.hunger) { pet.hunger = Math.min(100, pet.hunger + item.effect.hunger); changes.hunger = item.effect.hunger; }
    if (item.effect.happiness) { pet.happiness = Math.min(100, pet.happiness + item.effect.happiness); changes.happiness = item.effect.happiness; }
    if (item.effect.health) { pet.health = Math.min(100, pet.health + item.effect.health); changes.health = item.effect.health; }
    if (item.effect.exp) { changes.exp = item.effect.exp; this.addPetExp(item.effect.exp); }
    this.addPetLog(`使用了${item.name}`, item.icon);
    this.save();
    return { item, changes };
  },

  addPetExp(amount) {
    const pet = this.data.pet;
    pet.exp += amount;
    const need = pet.level * 100;
    if (pet.exp >= need) {
      pet.exp -= need;
      pet.level++;
      this.addPetLog(`升级了！Lv.${pet.level}`, '🎉');
      // 检查进化
      const oldStage = Pet.getStage(pet.level - 1);
      const newStage = Pet.getStage(pet.level);
      if (newStage.stage > oldStage.stage) {
        this.addPetLog(`进化为${newStage.name}！`, newStage.emoji);
      }
    }
  },

  addPetLog(text, icon) {
    this.data.petActionLog.unshift({ text, icon, time: new Date().toISOString() });
    if (this.data.petActionLog.length > 50) this.data.petActionLog = this.data.petActionLog.slice(0, 50);
  },

  updatePetDecay() {
    const pet = this.data.pet;
    if (!pet.lastUpdate) {
      pet.lastUpdate = new Date().toISOString();
      this.save();
      return;
    }
    const now = Date.now();
    const last = new Date(pet.lastUpdate).getTime();
    const hoursElapsed = Math.min(24, (now - last) / 3600000); // 最多计算24小时
    if (hoursElapsed < 0.1) return; // 不到6分钟不计算

    pet.hunger = Math.max(0, Math.round(pet.hunger - hoursElapsed * 2));
    pet.happiness = Math.max(0, Math.round(pet.happiness - hoursElapsed * 2));
    if (pet.hunger < 20 || pet.happiness < 20) {
      pet.health = Math.max(0, Math.round(pet.health - hoursElapsed * 1));
    }
    pet.lastUpdate = new Date().toISOString();
    this.save();
  },

  getStreak() { return this.data.currentStreak || 0; },
};

// ============================================
// 3. 音频存储 (IndexedDB)
// ============================================
const AudioStore = {
  db: null,
  dbName: 'reading-coach-audio',
  storeName: 'audio',

  init() {
    return new Promise((resolve) => {
      if (!window.indexedDB) { console.warn('IndexedDB not supported'); resolve(); return; }
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };
      request.onerror = () => { console.warn('IndexedDB open failed'); resolve(); };
    });
  },

  saveAudio(id, blob, meta) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject('DB not ready'); return; }
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const record = { id, blob, ...meta, savedAt: new Date().toISOString() };
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  getAudio(id) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject('DB not ready'); return; }
      const tx = this.db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  getAllAudioMeta() {
    return new Promise((resolve, reject) => {
      if (!this.db) { resolve([]); return; }
      const tx = this.db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result || []).map(r => ({
          id: r.id, title: r.title, duration: r.duration,
          size: r.blob ? r.blob.size : 0, type: r.blob ? r.blob.type : '', date: r.date,
        })).sort((a, b) => new Date(b.date) - new Date(a.date));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  },

  deleteAudio(id) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject('DB not ready'); return; }
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};

// ============================================
// 4. 语音识别模块
// ============================================
const Speech = {
  recognition: null,
  isSupported: false,
  isRecognizing: false,
  finalText: '',
  interimText: '',
  onResultCallback: null,
  onEndCallback: null,
  timerInterval: null,
  startTime: 0,

  init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { this.isSupported = false; return false; }
    this.isSupported = true;
    this.recognition = new SR();
    this.recognition.lang = 'zh-CN';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) this.finalText += transcript;
        else interim += transcript;
      }
      this.interimText = interim;
      if (this.onResultCallback) this.onResultCallback(this.getResult());
    };

    this.recognition.onend = () => {
      if (this.isRecognizing) {
        try { this.recognition.start(); } catch(e) {}
      } else {
        if (this.onEndCallback) this.onEndCallback();
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        if (this.isRecognizing) {
          setTimeout(() => { try { this.recognition.start(); } catch(e) {} }, 500);
        }
      } else if (event.error === 'not-allowed') {
        alert('请允许麦克风访问权限，才能使用语音识别功能。');
        this.isRecognizing = false;
        this.stopTimer();
      }
    };
    return true;
  },

  start(onResult, onEnd) {
    if (!this.isSupported) return false;
    this.finalText = '';
    this.interimText = '';
    this.onResultCallback = onResult;
    this.onEndCallback = onEnd;
    this.isRecognizing = true;
    this.startTime = Date.now();
    this.startTimer();
    try { this.recognition.start(); } catch(e) {}
    return true;
  },

  stop() {
    this.isRecognizing = false;
    this.stopTimer();
    if (this.recognition) { try { this.recognition.stop(); } catch(e) {} }
  },

  startTimer() {
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const sec = String(elapsed % 60).padStart(2, '0');
      const timerEl = document.getElementById('readingTimer');
      if (timerEl) timerEl.textContent = `${min}:${sec}`;

      const goalFill = document.getElementById('readingGoalFill');
      const goalText = document.getElementById('readingGoalPercent');
      if (goalFill) {
        const pct = Math.min(100, Math.round(elapsed / (DAILY_GOAL_MINUTES * 60) * 100));
        goalFill.style.width = pct + '%';
        goalText.textContent = pct + '%';
        if (pct >= 100) goalFill.classList.add('complete');
      }
    }, 500);
  },

  stopTimer() { if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; } },
  getDuration() { return Math.floor((Date.now() - this.startTime) / 1000); },
  getResult() { return (this.finalText + this.interimText).trim(); },
};

// ============================================
// 5. 音频录制模块 (MediaRecorder)
// ============================================
const Recorder = {
  mediaRecorder: null,
  audioChunks: [],
  audioBlob: null,
  audioUrl: null,
  stream: null,
  isRecording: false,
  isSupported: false,

  checkSupport() {
    this.isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    return this.isSupported;
  },

  getSupportedMimeType() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const type of types) { if (MediaRecorder.isTypeSupported(type)) return type; }
    return '';
  },

  async start() {
    if (!this.checkSupport()) return false;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.audioBlob = null;
      this.audioUrl = null;
      const mimeType = this.getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };
      this.mediaRecorder.onstop = () => {
        const type = this.mediaRecorder.mimeType || 'audio/webm';
        this.audioBlob = new Blob(this.audioChunks, { type });
        if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = URL.createObjectURL(this.audioBlob);
      };
      this.isRecording = true;
      this.mediaRecorder.start(1000);
      return true;
    } catch(e) {
      console.error('录音启动失败:', e);
      return false;
    }
  },

  stop() {
    if (this.mediaRecorder && this.isRecording) {
      return new Promise((resolve) => {
        this.mediaRecorder.onstop = () => {
          const type = this.mediaRecorder.mimeType || 'audio/webm';
          this.audioBlob = new Blob(this.audioChunks, { type });
          if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
          this.audioUrl = URL.createObjectURL(this.audioBlob);
          this.isRecording = false;
          if (this.stream) { this.stream.getTracks().forEach(track => track.stop()); }
          resolve();
        };
        this.mediaRecorder.stop();
      });
    }
    return Promise.resolve();
  },

  getBlob() { return this.audioBlob; },
  getUrl() { return this.audioUrl; },
  getSize() { return this.audioBlob ? this.audioBlob.size : 0; },
  getExtension() {
    if (!this.audioBlob) return 'webm';
    const type = this.audioBlob.type;
    if (type.includes('webm')) return 'webm';
    if (type.includes('ogg')) return 'ogg';
    if (type.includes('mp4')) return 'm4a';
    return 'webm';
  },
};

// ============================================
// 6. OCR 识别模块
// ============================================
const OCR = {
  async recognize(imageFile, onProgress) {
    if (typeof Tesseract === 'undefined') {
      throw new Error('OCR库未加载，请检查网络连接');
    }
    try {
      const worker = await Tesseract.createWorker('chi_sim', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(Math.round(m.progress * 100));
          }
        },
      });
      const { data } = await worker.recognize(imageFile);
      await worker.terminate();
      return data.text;
    } catch(e) {
      throw e;
    }
  },
};

// ============================================
// 7. 文本对比算法 (LCS)
// ============================================
const Diff = {
  normalize(text) { return text.replace(/[\s\p{P}\p{S}]/gu, ''); },

  compute(original, recognized) {
    const a = this.normalize(original);
    const b = this.normalize(recognized);
    const m = a.length, n = b.length;
    const dp = [];
    for (let i = 0; i <= m; i++) dp.push(new Int16Array(n + 1));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    const ops = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        ops.unshift({ type: 'match', char: a[i - 1] });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.unshift({ type: 'insert', char: b[j - 1] });
        j--;
      } else {
        ops.unshift({ type: 'delete', char: a[i - 1] });
        i--;
      }
    }
    return ops;
  },

  classify(ops) {
    const result = [];
    let i = 0;
    while (i < ops.length) {
      if (ops[i].type === 'match') {
        result.push({ type: 'match', char: ops[i].char });
        i++; continue;
      }
      const deletes = [], inserts = [];
      while (i < ops.length && ops[i].type !== 'match') {
        if (ops[i].type === 'delete') deletes.push(ops[i].char);
        else inserts.push(ops[i].char);
        i++;
      }
      if (deletes.length > 0 && inserts.length > 0) {
        result.push({ type: 'substitute', original: deletes.join(''), read: inserts.join(''), count: Math.max(deletes.length, inserts.length) });
      } else if (deletes.length > 0) {
        if (deletes.length >= 5) result.push({ type: 'lineskip', chars: deletes.join(''), count: deletes.length });
        else result.push({ type: 'skip', chars: deletes.join(''), count: deletes.length });
      } else if (inserts.length > 0) {
        result.push({ type: 'extra', chars: inserts.join(''), count: inserts.length });
      }
    }
    return result;
  },

  getStats(classified) {
    let correct = 0, substitutions = 0, skips = 0, extras = 0, lineSkips = 0;
    for (const item of classified) {
      switch (item.type) {
        case 'match': correct++; break;
        case 'substitute': substitutions += item.count; break;
        case 'skip': skips += item.count; break;
        case 'extra': extras += item.count; break;
        case 'lineskip': lineSkips += item.count; break;
      }
    }
    const total = correct + substitutions + skips + lineSkips;
    const errorTotal = substitutions + skips + extras + lineSkips;
    const accuracy = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
    return { correct, substitutions, skips, extras, lineSkips, total, errorTotal, accuracy };
  },

  renderHTML(classified) {
    let html = '';
    for (const item of classified) {
      switch (item.type) {
        case 'match': html += `<span class="char correct">${esc(item.char)}</span>`; break;
        case 'substitute': html += `<span class="char wrong" title="读成了「${item.read}」">${esc(item.original)}<span class="wrong-read">${esc(item.read)}</span></span>`; break;
        case 'skip': for (const c of item.chars) html += `<span class="char skip" title="漏读">${esc(c)}</span>`; break;
        case 'lineskip': html += `<span class="lineskip-block" title="串行漏读${item.count}个字">${esc(item.chars)}<span class="lineskip-label">串行${item.count}字</span></span>`; break;
        case 'extra': html += `<span class="char extra" title="多读了">${esc(item.chars)}</span>`; break;
      }
    }
    return html;
  },
};

function esc(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// 8. 分级评价模块
// ============================================
const Grading = {
  getGrade(errorCount) {
    return GRADE_RULES.find(g => errorCount >= g.minErrors && errorCount <= g.maxErrors) || GRADE_RULES[GRADE_RULES.length - 1];
  },
  calcPoints(grade, metGoal, streak) {
    let points = grade.points;
    if (metGoal) points += 10;
    points += Math.min(streak * 2, 20);
    return points;
  },
  renderGradeHTML(grade) {
    return `<div class="grade-letter ${grade.cls}">${grade.grade}</div>`;
  },
};

// ============================================
// 9. 宠物模块
// ============================================
const Pet = {
  getStage(level) {
    let stage = PET_STAGES[0];
    for (const s of PET_STAGES) {
      if (level >= s.minLevel) stage = s;
    }
    return stage;
  },

  getExpForNextLevel(level) {
    return level * 100;
  },

  getExpProgress(level, exp) {
    const need = this.getExpForNextLevel(level);
    return Math.min(100, Math.round(exp / need * 100));
  },

  getStageProgress(level, exp) {
    const stage = this.getStage(level);
    const nextStage = PET_STAGES.find(s => s.minLevel > level);
    if (!nextStage) return { current: stage, next: null, levelsToNext: 0 };
    return { current: stage, next: nextStage, levelsToNext: nextStage.minLevel - level };
  },
};

// ============================================
// 10. UI 管理
// ============================================
const UI = {
  // 朗读相关状态
  currentImageFile: null,
  currentText: '',
  currentTitle: '',
  currentRecognized: '',
  currentClassified: null,
  currentStats: null,
  currentDuration: 0,
  practicedWrongChars: new Set(),
  lastResult: null,
  hasAudio: false,
  currentSessionId: null,

  // 作业相关状态
  hwFilterType: 'daily',
  hwFilterSubject: 'all',
  hwSelectedGrade: null,
  hwGradingId: null,

  init() {
    if (!Speech.isSupported) {
      document.getElementById('browserWarning').style.display = 'block';
    }

    // 是否已以独立 APP 形式运行（已添加到主屏幕）
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    AppState.isStandalone = isStandalone;

    // 微信内置浏览器无法安装 APP，也无法用语音识别，引导用系统浏览器打开
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
    if (isWeChat && !isStandalone) {
      const tip = document.getElementById('wechatTip');
      if (tip) {
        tip.style.display = 'block';
        const closeBtn = document.getElementById('wechatTipClose');
        if (closeBtn) closeBtn.addEventListener('click', () => { tip.style.display = 'none'; });
      }
    }

    // 捕获浏览器的"可安装"事件，弹出添加到主屏幕引导条
    window.addEventListener('beforeinstallprompt', (e) => {
      if (isStandalone) return;
      e.preventDefault();
      AppState.deferredPrompt = e;
      const bar = document.getElementById('installBar');
      if (bar) bar.style.display = 'flex';
      const btn = document.getElementById('installBtn');
      if (btn) btn.addEventListener('click', async () => {
        if (AppState.deferredPrompt) {
          AppState.deferredPrompt.prompt();
          await AppState.deferredPrompt.userChoice;
          AppState.deferredPrompt = null;
        }
        bar.style.display = 'none';
      });
      const close = document.getElementById('installClose');
      if (close) close.addEventListener('click', () => { bar.style.display = 'none'; });
    });
    window.addEventListener('appinstalled', () => {
      const bar = document.getElementById('installBar');
      if (bar) bar.style.display = 'none';
    });
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this.navigate(tab.dataset.tab));
    });
    document.getElementById('childNameInput').value = Store.data.childName || '';
    this.renderDashboard();
    this.renderStats();
    this.renderReadingGradeRules();
    this.renderHwGradeRules();
    this.renderRewards();
    this.renderHomework();
    this.renderPet();

    const uploadZone = document.getElementById('uploadZone');
    const photoInput = document.getElementById('photoInput');
    uploadZone.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-reupload')) return;
      photoInput.click();
    });
    photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
  },

  navigate(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-' + viewName).classList.add('active');
    const tab = document.querySelector(`.tab[data-tab="${viewName}"]`);
    if (tab) tab.classList.add('active');
    if (viewName === 'dashboard') { this.renderDashboard(); }
    if (viewName === 'practice') { this.renderStats(); this.renderReadingGradeRules(); }
    if (viewName === 'homework') { this.renderHwGradeRules(); this.renderHomework(); }
    if (viewName === 'pet') { Store.updatePetDecay(); this.renderPet(); }
    if (viewName === 'rewards') { this.renderRewards(); }
    this.updateNavPoints();
  },

  goToStep(step) {
    document.querySelectorAll('.practice-step').forEach(s => s.classList.remove('active'));
    const map = { 'select': 'step-select', 'read': 'step-read', 'review': 'step-review', 'results': 'step-results', 'practice-wrong': 'step-practice-wrong' };
    const el = document.getElementById(map[step]);
    if (el) el.classList.add('active');
  },

  saveChildName() {
    const name = document.getElementById('childNameInput').value.trim() || '小朋友';
    Store.data.childName = name;
    Store.save();
    this.renderDashboard();
    this.updateNavPoints();
  },

  // ======== 朗读模块 (保持原有功能) ========

  handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    this.currentImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('previewImg').src = e.target.result;
      document.getElementById('uploadPreview').style.display = 'block';
      document.getElementById('uploadPlaceholder').style.display = 'none';
      document.getElementById('ocrBtn').style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
  },

  resetUpload() {
    this.currentImageFile = null;
    document.getElementById('photoInput').value = '';
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('uploadPlaceholder').style.display = 'block';
    document.getElementById('ocrBtn').style.display = 'none';
    document.getElementById('ocrResultSection').style.display = 'none';
    document.getElementById('ocrProgress').style.display = 'none';
  },

  async startOCR() {
    if (!this.currentImageFile) return;
    document.getElementById('ocrBtn').style.display = 'none';
    document.getElementById('ocrProgress').style.display = 'flex';
    document.getElementById('ocrProgressFill').style.width = '0%';
    document.getElementById('ocrProgressText').textContent = '正在识别文字...';
    try {
      const text = await OCR.recognize(this.currentImageFile, (progress) => {
        document.getElementById('ocrProgressFill').style.width = progress + '%';
        document.getElementById('ocrProgressText').textContent = `正在识别文字... ${progress}%`;
      });
      document.getElementById('ocrProgress').style.display = 'none';
      document.getElementById('ocrResultSection').style.display = 'block';
      const cleanText = text.replace(/\n+/g, '\n').trim();
      document.getElementById('ocrResultEditor').value = cleanText;
      if (!cleanText) {
        document.getElementById('ocrProgressText').textContent = '未能识别到文字，请手动输入或重新拍照';
      }
    } catch(e) {
      document.getElementById('ocrProgress').style.display = 'none';
      document.getElementById('ocrBtn').style.display = 'inline-block';
      alert('OCR识别失败：' + e.message + '\n请手动输入文字内容。');
    }
  },

  confirmOCRText() {
    const text = document.getElementById('ocrResultEditor').value.trim();
    if (!text) { alert('请输入或修改识别到的文字内容！'); return; }
    this.currentText = text;
    this.currentTitle = document.getElementById('textTitleInput').value.trim() || '朗读练习';
    this.startReading();
  },

  useCustomText() {
    const text = document.getElementById('customText').value.trim();
    if (!text) { alert('请先输入朗读内容！'); return; }
    this.currentText = text;
    this.currentTitle = document.getElementById('textTitle').value.trim() || '朗读练习';
    this.startReading();
  },

  async startReading() {
    this.goToStep('read');
    document.getElementById('readingTitleDisplay').textContent = this.currentTitle;
    document.getElementById('readingTextDisplay').textContent = this.currentText;
    document.getElementById('recognitionLive').innerHTML = '<span class="recognition-placeholder">朗读的声音会显示在这里...</span>';
    document.getElementById('audioPlayerSection').style.display = 'none';
    const goalFill = document.getElementById('readingGoalFill');
    if (goalFill) goalFill.classList.remove('complete');

    this.hasAudio = false;
    const recStarted = await Recorder.start();
    if (!recStarted) { console.warn('录音启动失败，仅使用语音识别'); }

    Speech.start(
      (result) => {
        const live = document.getElementById('recognitionLive');
        if (result) live.innerHTML = `<span style="color:var(--text)">${esc(result)}</span>`;
      },
      null
    );
  },

  async stopReading() {
    Speech.stop();
    this.currentRecognized = Speech.getResult();
    this.currentDuration = Speech.getDuration();
    await Recorder.stop();
    this.hasAudio = !!Recorder.getBlob();

    if (!this.currentRecognized) {
      alert('没有识别到语音内容，请检查麦克风是否正常，或尝试重新朗读。');
      this.goToStep('read');
      return;
    }
    document.getElementById('recognizedTextEditor').value = this.currentRecognized;
    this.goToStep('review');
  },

  runComparison() {
    const recognized = document.getElementById('recognizedTextEditor').value.trim();
    if (!recognized) { alert('识别文字为空，请重新朗读或手动输入。'); return; }
    this.currentRecognized = recognized;
    const ops = Diff.compute(this.currentText, recognized);
    const classified = Diff.classify(ops);
    const stats = Diff.getStats(classified);
    this.currentClassified = classified;
    this.currentStats = stats;
    this.renderResults();
    this.goToStep('results');
  },

  renderResults() {
    const stats = this.currentStats;
    const grade = Grading.getGrade(stats.errorTotal);
    const metGoal = this.currentDuration >= DAILY_GOAL_MINUTES * 60;
    const streak = Store.getStreak();
    const points = Grading.calcPoints(grade, metGoal, streak);
    this.currentSessionId = 'session-' + Date.now();

    this.lastResult = {
      id: this.currentSessionId,
      title: this.currentTitle,
      originalText: this.currentText,
      recognizedText: this.currentRecognized,
      accuracy: stats.accuracy,
      grade: grade.grade,
      gradeName: grade.name,
      points,
      duration: this.currentDuration,
      metGoal,
      hasAudio: this.hasAudio,
      errors: {
        substitutions: stats.substitutions,
        skips: stats.skips,
        extras: stats.extras,
        lineSkips: stats.lineSkips,
      },
      totalErrors: stats.errorTotal,
      totalChars: stats.total,
      correctChars: stats.correct,
      classified: this.currentClassified,
      date: new Date().toISOString(),
    };

    document.getElementById('gradeDisplay').innerHTML = Grading.renderGradeHTML(grade);
    document.getElementById('resultAccuracy').textContent = stats.accuracy + '%';
    document.getElementById('resultErrors').textContent = stats.errorTotal;
    const min = Math.floor(this.currentDuration / 60);
    const sec = this.currentDuration % 60;
    document.getElementById('resultDuration').textContent = min > 0 ? `${min}'${String(sec).padStart(2,'0')}"` : `${sec}"`;
    document.getElementById('resultPoints').textContent = (points >= 0 ? '+' : '') + points;

    const accEl = document.getElementById('resultAccuracy');
    accEl.style.color = stats.accuracy >= 95 ? 'var(--success)' : stats.accuracy >= 85 ? 'var(--warning)' : 'var(--danger)';

    let breakdownHTML = '';
    if (stats.substitutions > 0) breakdownHTML += `<div class="error-stat wrong">读错 ${stats.substitutions}</div>`;
    if (stats.skips > 0) breakdownHTML += `<div class="error-stat skip">漏字 ${stats.skips}</div>`;
    if (stats.extras > 0) breakdownHTML += `<div class="error-stat extra">添字 ${stats.extras}</div>`;
    if (stats.lineSkips > 0) breakdownHTML += `<div class="error-stat lineskip">串行 ${stats.lineSkips}</div>`;
    if (stats.errorTotal === 0) breakdownHTML = '<div class="error-stat" style="background:var(--success-light);color:var(--success);">🎉 完美无错！</div>';
    document.getElementById('errorBreakdown').innerHTML = breakdownHTML;
    document.getElementById('textComparison').innerHTML = Diff.renderHTML(this.currentClassified);

    const audioSection = document.getElementById('audioPlayerSection');
    if (this.hasAudio && Recorder.getUrl()) {
      audioSection.style.display = 'block';
      const audioEl = document.getElementById('audioPlayback');
      audioEl.src = Recorder.getUrl();
      const sizeKB = Math.round(Recorder.getSize() / 1024);
      document.getElementById('audioDuration').textContent = `时长: ${min > 0 ? min + '分' : ''}${sec}秒`;
      document.getElementById('audioSize').textContent = `大小: ${sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + 'MB' : sizeKB + 'KB'}`;
    } else {
      audioSection.style.display = 'none';
    }
    if (stats.errorTotal === 0 || grade.grade === 'S') this.fireConfetti();
  },

  downloadAudio() {
    if (!this.hasAudio || !Recorder.getBlob()) { alert('没有可下载的录音文件'); return; }
    const blob = Recorder.getBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
    const ext = Recorder.getExtension();
    const name = Store.data.childName || '小朋友';
    a.href = url;
    a.download = `${name}_朗读_${dateStr}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  listenCorrect() {
    if (!('speechSynthesis' in window)) { alert('浏览器不支持语音朗读功能。'); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(this.currentText);
    utter.lang = 'zh-CN';
    utter.rate = 0.8;
    window.speechSynthesis.speak(utter);
  },

  startWrongPractice() {
    const wrongChars = [];
    for (const item of this.currentClassified) {
      if (item.type === 'substitute') wrongChars.push({ original: item.original, read: item.read });
      else if (item.type === 'skip' || item.type === 'lineskip') wrongChars.push({ original: item.chars, read: '(漏读)' });
    }
    if (wrongChars.length === 0) { alert('这次没有读错的字，太棒了！🎉'); return; }
    this.practicedWrongChars.clear();
    const container = document.getElementById('wrongCharsList');
    container.innerHTML = wrongChars.map((w, i) => `
      <div class="wrong-char-card" id="wrong-card-${i}">
        <div class="wrong-char-display">${esc(w.original)}</div>
        <div class="wrong-char-read">读成了 <s>${esc(w.read)}</s></div>
        <div class="wrong-char-actions">
          <button class="btn-listen" onclick="UI.listenChar('${esc(w.original)}')">🔊 听</button>
          <button class="btn-practice" id="practice-btn-${i}" onclick="UI.markPracticed(${i})">✓ 会了</button>
        </div>
      </div>
    `).join('');
    this.goToStep('practice-wrong');
  },

  listenChar(char) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(char);
    utter.lang = 'zh-CN';
    utter.rate = 0.7;
    window.speechSynthesis.speak(utter);
  },

  markPracticed(index) {
    this.practicedWrongChars.add(index);
    const btn = document.getElementById('practice-btn-' + index);
    if (btn) { btn.classList.add('practiced'); btn.textContent = '✓ 已掌握'; btn.disabled = true; }
  },

  finishWrongPractice() {
    const total = this.practicedWrongChars.size;
    if (total > 0) {
      const bonus = total * 3;
      Store.addPoints(bonus);
      this.updateNavPoints();
      alert(`练习了${total}个错字，获得${bonus}额外积分！💪`);
    }
    this.goToStep('results');
  },

  async saveResults() {
    if (!this.lastResult) return;
    Store.addSession(this.lastResult);
    Store.save();
    if (this.hasAudio && Recorder.getBlob() && this.currentSessionId) {
      try {
        await AudioStore.saveAudio(this.currentSessionId, Recorder.getBlob(), {
          title: this.currentTitle,
          duration: this.currentDuration,
          date: this.lastResult.date,
        });
      } catch(e) { console.error('音频保存失败:', e); }
    }
    this.updateNavPoints();
    this.navigate('dashboard');
  },

  async downloadHistoryAudio(sessionId) {
    try {
      const record = await AudioStore.getAudio(sessionId);
      if (!record || !record.blob) { alert('录音文件不存在或已被清除'); return; }
      const url = URL.createObjectURL(record.blob);
      const a = document.createElement('a');
      const date = new Date(record.date);
      const dateStr = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
      const ext = record.blob.type.includes('webm') ? 'webm' : record.blob.type.includes('mp4') ? 'm4a' : 'ogg';
      const name = Store.data.childName || '小朋友';
      a.href = url;
      a.download = `${name}_朗读_${dateStr}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch(e) { alert('下载失败: ' + e.message); }
  },

  async playHistoryAudio(sessionId, btnEl) {
    try {
      const record = await AudioStore.getAudio(sessionId);
      if (!record || !record.blob) { alert('录音文件不存在或已被清除'); return; }
      let playerEl = document.getElementById('inline-player-' + sessionId);
      if (playerEl) {
        if (playerEl.style.display === 'none') {
          playerEl.src = URL.createObjectURL(record.blob);
          playerEl.style.display = 'block';
          btnEl.textContent = '⏸ 收起';
        } else {
          playerEl.pause();
          playerEl.style.display = 'none';
          btnEl.textContent = '▶ 播放';
        }
      } else {
        const container = btnEl.closest('.audio-file-item') || btnEl.parentElement;
        const audio = document.createElement('audio');
        audio.id = 'inline-player-' + sessionId;
        audio.controls = true;
        audio.src = URL.createObjectURL(record.blob);
        audio.style.cssText = 'width:100%;margin-top:8px;display:block;';
        audio.className = 'audio-file-player-inline show';
        container.appendChild(audio);
        btnEl.textContent = '⏸ 收起';
      }
    } catch(e) { alert('播放失败: ' + e.message); }
  },

  async deleteHistoryAudio(sessionId) {
    if (!confirm('确定删除这个录音文件吗？删除后无法恢复。')) return;
    try {
      await AudioStore.deleteAudio(sessionId);
      this.renderAudioFiles();
    } catch(e) { alert('删除失败: ' + e.message); }
  },

  fireConfetti() {
    const container = document.getElementById('confettiContainer');
    const colors = ['#FFB74D', '#4CAF50', '#5B8DEF', '#EF5350', '#AB47BC', '#FF9800'];
    for (let i = 0; i < 60; i++) {
      const conf = document.createElement('div');
      conf.className = 'confetti';
      conf.style.left = Math.random() * 100 + '%';
      conf.style.background = colors[Math.floor(Math.random() * colors.length)];
      conf.style.animationDelay = Math.random() * 0.5 + 's';
      conf.style.animationDuration = (2 + Math.random() * 2) + 's';
      conf.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      conf.style.width = (6 + Math.random() * 8) + 'px';
      conf.style.height = (6 + Math.random() * 8) + 'px';
      container.appendChild(conf);
      setTimeout(() => conf.remove(), 4000);
    }
  },

  updateNavPoints() {
    document.getElementById('navPoints').textContent = Store.data.totalPoints;
    const navPetPoints = document.getElementById('navPetPoints');
    if (navPetPoints) navPetPoints.textContent = Store.data.petPoints;
    document.getElementById('navChildName').textContent = Store.data.childName || '';
  },

  // ======== 首页 ========

  renderDashboard() {
    const data = Store.data;
    const name = data.childName || '小朋友';
    document.getElementById('greeting').textContent = `${name}，加油！`;
    document.getElementById('navChildName').textContent = name;
    document.getElementById('dashTotalPoints').textContent = data.totalPoints;
    document.getElementById('dashPetPoints').textContent = data.petPoints;
    document.getElementById('dashTotalSessions').textContent = data.sessions.length;
    document.getElementById('dashHwDone').textContent = data.homeworks.filter(h => h.status === 'graded').length;

    const todaySecs = Store.getTodayTotalSeconds();
    const todayMin = Math.floor(todaySecs / 60);
    const pct = Math.min(100, Math.round(todaySecs / (DAILY_GOAL_MINUTES * 60) * 100));
    document.getElementById('todayProgressFill').style.width = pct + '%';
    document.getElementById('todayProgressText').textContent = `${todayMin} / ${DAILY_GOAL_MINUTES} 分钟`;

    // 最近活动 (朗读 + 作业)
    const recentEl = document.getElementById('dashRecentSessions');
    const activities = [];

    // 朗读记录
    data.sessions.slice(-5).reverse().forEach(r => {
      activities.push({
        type: 'reading',
        date: r.date,
        sortTime: new Date(r.date).getTime(),
        title: r.title,
        grade: r.grade,
        accuracy: r.accuracy,
        points: r.points,
        errors: r.totalErrors,
        hasAudio: r.hasAudio,
        id: r.id,
      });
    });

    // 作业记录
    data.homeworks.filter(h => h.status === 'graded').slice(-5).reverse().forEach(h => {
      activities.push({
        type: 'homework',
        date: h.gradedDate,
        sortTime: new Date(h.gradedDate).getTime(),
        title: h.title,
        grade: h.grade,
        points: h.points || 0,
      });
    });

    activities.sort((a, b) => b.sortTime - a.sortTime);
    const recent = activities.slice(0, 6);

    if (recent.length > 0) {
      recentEl.innerHTML = recent.map(a => {
        const grade = a.type === 'reading'
          ? Grading.getGrade(a.errors)
          : HW_GRADE_RULES.find(r => r.grade === a.grade) || HW_GRADE_RULES[4];
        const date = new Date(a.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
        const icon = a.type === 'reading' ? '📖' : '📝';
        const extra = a.type === 'reading' ? ` · ${a.accuracy}%` : '';
        const audioIcon = a.hasAudio ? '🎵' : '';
        return `<div class="session-item">
          <div class="session-info">
            <div class="session-title">${icon} ${esc(a.title)} ${audioIcon}</div>
            <div class="session-meta">${date}${extra} · ${a.points >= 0 ? '+' : ''}${a.points}积分</div>
          </div>
          <div class="history-grade ${grade.cls}">${grade.grade}</div>
        </div>`;
      }).join('');
    } else {
      recentEl.innerHTML = '<p class="empty-hint">还没有记录，开始朗读或做作业吧！</p>';
    }

    this.updateNavPoints();
    this.renderAudioFiles();
    this.renderPetMini();
  },

  renderPetMini() {
    const pet = Store.data.pet;
    const stage = Pet.getStage(pet.level);
    document.getElementById('petMiniEmoji').textContent = stage.emoji;
    document.getElementById('petMiniName').textContent = pet.name || '我的宠物';
    document.getElementById('petMiniHunger').textContent = pet.hunger;
    document.getElementById('petMiniHappy').textContent = pet.happiness;
    document.getElementById('petMiniHealth').textContent = pet.health;
  },

  async renderAudioFiles() {
    const container = document.getElementById('audioFilesList');
    if (!container) return;
    try {
      const audioList = await AudioStore.getAllAudioMeta();
      if (audioList.length === 0) {
        container.innerHTML = '<p class="empty-hint">还没有录音文件</p>';
        return;
      }
      const recent = audioList.slice(0, 20);
      container.innerHTML = recent.map(a => {
        const date = new Date(a.date);
        const dateStr = date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' +
          String(date.getHours()).padStart(2,'0') + ':' + String(date.getMinutes()).padStart(2,'0');
        const min = Math.floor(a.duration / 60);
        const sec = a.duration % 60;
        const durStr = min > 0 ? `${min}分${sec}秒` : `${sec}秒`;
        const sizeKB = Math.round(a.size / 1024);
        const sizeStr = sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + 'MB' : sizeKB + 'KB';
        return `<div class="audio-file-item">
          <div class="audio-file-icon">🎵</div>
          <div class="audio-file-info">
            <div class="audio-file-name">${esc(a.title || '朗读录音')}</div>
            <div class="audio-file-meta">${dateStr} · ${durStr} · ${sizeStr}</div>
          </div>
          <div class="audio-file-actions">
            <button class="btn-audio-play" onclick="UI.playHistoryAudio('${a.id}', this)">▶ 播放</button>
            <button class="btn-audio-download" onclick="UI.downloadHistoryAudio('${a.id}')">📥 下载</button>
            <button class="btn-delete" onclick="UI.deleteHistoryAudio('${a.id}')">删除</button>
          </div>
        </div>`;
      }).join('');
    } catch(e) {
      container.innerHTML = '<p class="empty-hint">录音加载失败</p>';
    }
  },

  // ======== 统计 ========

  renderStats() {
    const data = Store.data;
    const sessions = data.sessions;
    const statsTotalSessions = document.getElementById('statsTotalSessions');
    if (!statsTotalSessions) return;

    statsTotalSessions.textContent = sessions.length;
    const totalSecs = sessions.reduce((s, r) => s + r.duration, 0);
    const totalMin = Math.floor(totalSecs / 60);
    document.getElementById('statsTotalTime').textContent = totalMin + "'";

    const avgAcc = sessions.length > 0 ? Math.round(sessions.reduce((s, r) => s + r.accuracy, 0) / sessions.length * 10) / 10 : 0;
    document.getElementById('statsAvgAccuracy').textContent = avgAcc + '%';

    const gradeOrder = { S: 5, A: 4, B: 3, C: 2, D: 1 };
    const bestGrade = sessions.length > 0 ? sessions.reduce((best, r) => (gradeOrder[r.grade] > gradeOrder[best] ? r.grade : best), 'D') : '-';
    document.getElementById('statsBestGrade').textContent = bestGrade;

    // 准确率趋势
    const chartEl = document.getElementById('accuracyChart');
    const recent10 = sessions.slice(-10);
    if (recent10.length > 0) {
      chartEl.innerHTML = recent10.map((r) => {
        const height = Math.max(2, r.accuracy);
        const color = r.accuracy >= 95 ? 'var(--success)' : r.accuracy >= 85 ? 'var(--warning)' : 'var(--danger)';
        const date = new Date(r.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
        return `<div class="bar-item">
          <div class="bar" style="height:${height}%;background:${color};">
            <span class="bar-value">${r.accuracy}%</span>
          </div>
          <div class="bar-label">${date}</div>
        </div>`;
      }).join('');
    } else {
      chartEl.innerHTML = '<p class="empty-hint">暂无数据</p>';
    }

    // 错误类型分布
    const errorChartEl = document.getElementById('errorTypeChart');
    const totalSubs = sessions.reduce((s, r) => s + (r.errors?.substitutions || 0), 0);
    const totalSkips = sessions.reduce((s, r) => s + (r.errors?.skips || 0), 0);
    const totalExtras = sessions.reduce((s, r) => s + (r.errors?.extras || 0), 0);
    const totalLineSkips = sessions.reduce((s, r) => s + (r.errors?.lineSkips || 0), 0);
    const totalErrors = totalSubs + totalSkips + totalExtras + totalLineSkips;

    if (totalErrors > 0) {
      const types = [
        { label: '读错字', count: totalSubs, class: 'fill-wrong' },
        { label: '漏字', count: totalSkips, class: 'fill-skip' },
        { label: '添字', count: totalExtras, class: 'fill-extra' },
        { label: '串行', count: totalLineSkips, class: 'fill-lineskip' },
      ];
      errorChartEl.innerHTML = types.map(t => {
        const pct = Math.round(t.count / totalErrors * 100);
        return `<div class="error-type-bar">
          <div class="error-type-label">${t.label}</div>
          <div class="error-type-track">
            <div class="error-type-fill ${t.class}" style="width:${Math.max(pct, 8)}%">${t.count}</div>
          </div>
        </div>`;
      }).join('');
    } else {
      errorChartEl.innerHTML = '<p class="empty-hint">暂无错误数据</p>';
    }

    // 等级分布
    const gradeDistEl = document.getElementById('gradeDistribution');
    const grades = ['S', 'A', 'B', 'C', 'D'];
    const gradeCounts = {};
    grades.forEach(g => gradeCounts[g] = 0);
    sessions.forEach(r => { if (gradeCounts[r.grade] !== undefined) gradeCounts[r.grade]++; });
    gradeDistEl.innerHTML = grades.map(g => {
      return `<div class="grade-dist-item">
        <div class="grade-dist-letter ${g.toLowerCase()}">${g}</div>
        <div class="grade-dist-count">${gradeCounts[g]}</div>
        <div class="grade-dist-label">${GRADE_RULES.find(r => r.grade === g).name}</div>
      </div>`;
    }).join('');

    // 历史
    const historyEl = document.getElementById('historyList');
    if (sessions.length > 0) {
      const reversed = [...sessions].reverse();
      historyEl.innerHTML = reversed.map(r => {
        const accClass = r.accuracy >= 95 ? 'accuracy-high' : r.accuracy >= 85 ? 'accuracy-mid' : 'accuracy-low';
        const grade = Grading.getGrade(r.totalErrors);
        const min = Math.floor(r.duration / 60);
        const sec = r.duration % 60;
        const date = new Date(r.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
        const errs = [];
        if (r.errors?.substitutions) errs.push(`错${r.errors.substitutions}`);
        if (r.errors?.skips) errs.push(`漏${r.errors.skips}`);
        if (r.errors?.extras) errs.push(`添${r.errors.extras}`);
        if (r.errors?.lineSkips) errs.push(`串${r.errors.lineSkips}`);
        const audioBtn = r.hasAudio ? `<button class="btn-audio-download" style="font-size:11px;padding:3px 8px;" onclick="UI.downloadHistoryAudio('${r.id}')">📥 录音</button>` : '';
        return `<div class="history-item">
          <div class="history-date">${date}</div>
          <div class="history-info">
            <div class="history-title">${esc(r.title)} ${r.hasAudio ? '🎵' : ''}</div>
            <div class="history-errors">${errs.length > 0 ? errs.join(' · ') : '完美无错'} · ${min}'${String(sec).padStart(2,'0')}" · ${r.points >= 0 ? '+' : ''}${r.points}积分</div>
          </div>
          ${audioBtn}
          <div class="history-grade ${grade.cls}">${grade.grade}</div>
          <div class="history-accuracy ${accClass}">${r.accuracy}%</div>
        </div>`;
      }).join('');
    } else {
      historyEl.innerHTML = '<p class="empty-hint">暂无朗读记录</p>';
    }
  },

  // ======== 朗读分级规则（朗读页内） ========

  renderReadingGradeRules() {
    const readingRulesEl = document.getElementById('readingGradeRules');
    if (!readingRulesEl) return;
    readingRulesEl.innerHTML = GRADE_RULES.map(g => `
      <div class="grade-rule ${g.cls}">
        <div class="grade-badge">${g.grade}</div>
        <div class="grade-info">
          <div class="grade-name">${g.name}</div>
          <div class="grade-desc">${g.minErrors === 0 && g.maxErrors === 0 ? '零错误' : `错误 ${g.minErrors}~${g.maxErrors === Infinity ? '以上' : g.maxErrors} 个`}</div>
        </div>
        <div class="grade-points ${g.points < 0 ? 'grade-points-negative' : ''}">${g.points > 0 ? '+' : ''}${g.points} 积分</div>
      </div>
    `).join('');
  },

  // ======== 作业质量分级规则（作业栏侧边栏内） ========

  renderHwGradeRules() {
    const hwRulesEl = document.getElementById('homeworkGradeRules');
    if (!hwRulesEl) return;
    hwRulesEl.innerHTML = HW_GRADE_RULES.map(g => `
      <div class="grade-rule ${g.cls}">
        <div class="grade-badge">${g.grade}</div>
        <div class="grade-info">
          <div class="grade-name">${g.name}</div>
          <div class="grade-desc">${g.desc}</div>
        </div>
        <div class="grade-points ${g.points < 0 ? 'grade-points-negative' : ''}">${g.points > 0 ? '+' : ''}${g.points}</div>
      </div>
    `).join('');
  },

  // ======== 奖励中心（仅积分兑换） ========

  renderRewards() {
    const data = Store.data;
    document.getElementById('rewardsTotalPoints').textContent = data.totalPoints;

    // 奖励列表
    const rewardsEl = document.getElementById('rewardsList');
    if (data.rewards.length > 0) {
      rewardsEl.innerHTML = data.rewards.map(r => {
        const canRedeem = data.totalPoints >= r.cost;
        return `<div class="reward-item">
          <div class="reward-info">
            <span class="reward-icon">${r.icon}</span>
            <div>
              <div class="reward-name">${esc(r.name)}</div>
              <div class="reward-cost">⭐ ${r.cost} 积分</div>
            </div>
          </div>
          <div class="reward-actions">
            <button class="btn-redeem" ${canRedeem ? '' : 'disabled'} onclick="UI.redeemReward(${r.id})">
              ${canRedeem ? '兑换' : '积分不足'}
            </button>
            <button class="btn-delete" onclick="UI.deleteReward(${r.id})">删除</button>
          </div>
        </div>`;
      }).join('');
    } else {
      rewardsEl.innerHTML = '<p class="empty-hint">还没有设置奖励，添加一个吧！</p>';
    }

    const redeemedEl = document.getElementById('redeemedList');
    if (data.redeemedRewards.length > 0) {
      const reversed = [...data.redeemedRewards].reverse();
      redeemedEl.innerHTML = reversed.map(r => {
        const date = new Date(r.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
        return `<div class="redeemed-item">
          <div class="redeemed-info">
            <span style="font-size:24px">${r.icon}</span>
            <div>
              <div class="reward-name">${esc(r.name)}</div>
              <div class="redeemed-date">${date} · 消耗 ${r.cost} 积分</div>
            </div>
          </div>
          <span style="color:var(--success);font-weight:600;">✅ 已完成</span>
        </div>`;
      }).join('');
    } else {
      redeemedEl.innerHTML = '<p class="empty-hint">还没有兑换记录</p>';
    }
  },

  addReward() {
    const name = document.getElementById('newRewardName').value.trim();
    const cost = parseInt(document.getElementById('newRewardCost').value);
    if (!name || !cost || cost < 1) { alert('请填写奖励名称和所需积分！'); return; }
    const icons = ['🎁', '🎮', '📺', '🍔', '📚', '🍪', '🎪', '🎨', '⚽', '🚲', '🛍', '🎬'];
    Store.data.rewards.push({ id: Date.now(), name, cost, icon: icons[Math.floor(Math.random() * icons.length)] });
    Store.save();
    document.getElementById('newRewardName').value = '';
    document.getElementById('newRewardCost').value = '';
    this.renderRewards();
  },

  redeemReward(rewardId) {
    const reward = Store.data.rewards.find(r => r.id === rewardId);
    if (!reward) return;
    if (Store.data.totalPoints < reward.cost) { alert('积分不足！'); return; }
    if (confirm(`确定用 ${reward.cost} 积分兑换「${reward.name}」吗？`)) {
      Store.redeemReward(rewardId);
      this.updateNavPoints();
      this.renderRewards();
      this.fireConfetti();
    }
  },

  deleteReward(rewardId) {
    if (confirm('确定删除这个奖励吗？')) {
      Store.data.rewards = Store.data.rewards.filter(r => r.id !== rewardId);
      Store.save();
      this.renderRewards();
    }
  },

  // ======== 作业打卡模块 ========

  filterHomework(type, btn) {
    this.hwFilterType = type;
    this.hwFilterSubject = 'all';
    document.querySelectorAll('.hw-type-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.hw-subject-item').forEach(s => s.classList.remove('active'));
    const allSubject = document.querySelector('.hw-subject-item[data-subject="all"]');
    if (allSubject) allSubject.classList.add('active');
    this.renderHomework();
  },

  filterHomeworkSubject(subject, btn) {
    this.hwFilterSubject = subject;
    document.querySelectorAll('.hw-subject-item').forEach(s => s.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.renderHomework();
  },

  toggleHwAddForm() {
    const wrap = document.getElementById('hwAddFormWrap');
    if (wrap.style.display === 'none') {
      wrap.style.display = 'block';
    } else {
      wrap.style.display = 'none';
    }
  },

  renderHwSubjectCounts() {
    const homeworks = Store.data.homeworks.filter(h => h.type === this.hwFilterType);
    const subjects = ['all', '语文', '数学', '英语', '其他'];
    const countMap = { all: homeworks.length };
    subjects.slice(1).forEach(s => { countMap[s] = 0; });
    homeworks.forEach(h => {
      const subj = h.subject || '其他';
      if (countMap[subj] !== undefined) countMap[subj]++;
      else countMap['其他']++;
    });
    document.getElementById('hwSubjectCountAll').textContent = countMap.all;
    document.getElementById('hwSubjectCountChinese').textContent = countMap['语文'];
    document.getElementById('hwSubjectCountMath').textContent = countMap['数学'];
    document.getElementById('hwSubjectCountEnglish').textContent = countMap['英语'];
    document.getElementById('hwSubjectCountOther').textContent = countMap['其他'];
  },

  renderHomework() {
    const data = Store.data;
    let homeworks = data.homeworks.filter(h => h.type === this.hwFilterType);

    // 科目筛选
    if (this.hwFilterSubject !== 'all') {
      homeworks = homeworks.filter(h => (h.subject || '其他') === this.hwFilterSubject);
    }

    // 更新科目计数
    this.renderHwSubjectCounts();

    // 更新当前筛选标签
    const typeName = this.hwFilterType === 'vacation' ? '🏖️ 假期作业' : '📚 日常作业';
    const subjectName = this.hwFilterSubject === 'all' ? '全部科目' : this.hwFilterSubject;
    document.getElementById('hwCurrentFilter').textContent = `${typeName} · ${subjectName}`;

    const listEl = document.getElementById('homeworkList');
    const countBadge = document.getElementById('hwCountBadge');
    countBadge.textContent = homeworks.length;

    if (homeworks.length === 0) {
      listEl.innerHTML = '<p class="empty-hint">还没有作业，点击右上角添加吧！</p>';
      return;
    }

    // 按状态排序: pending -> submitted -> graded
    const statusOrder = { pending: 0, submitted: 1, graded: 2 };
    const sorted = [...homeworks].sort((a, b) => {
      if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
      return new Date(b.createdDate || 0) - new Date(a.createdDate || 0);
    });

    listEl.innerHTML = sorted.map(h => {
      const typeTag = h.type === 'vacation' ? 'vacation' : 'daily';
      const typeName = h.type === 'vacation' ? '🏖️ 假期' : '📚 日常';
      const statusName = { pending: '待完成', submitted: '待批改', graded: '已完成' }[h.status];
      const dueDate = h.dueDate ? new Date(h.dueDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '';
      const subjectTag = h.subject ? `<span class="hw-subject-tag">${esc(h.subject)}</span>` : '';

      // 完成时间信息
      let timeInfo = '';
      if (h.status === 'pending') {
        timeInfo = dueDate ? `📅 截止 ${dueDate}` : '📅 无截止日期';
      } else if (h.status === 'submitted') {
        const submitTime = h.submittedDate ? new Date(h.submittedDate).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        timeInfo = `📷 提交于 ${submitTime}${dueDate ? ' · 截止 ' + dueDate : ''}`;
      } else if (h.status === 'graded') {
        const gradeTime = h.gradedDate ? new Date(h.gradedDate).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        timeInfo = `✅ 完成于 ${gradeTime}`;
      }

      let actions = '';
      if (h.status === 'pending') {
        actions = `<button class="hw-action-btn submit" onclick="UI.directHwPhoto('${h.id}')">📷 拍照打卡</button>
                   <button class="hw-action-btn view" onclick="UI.openHwModal('${h.id}')">👁 详情</button>`;
      } else if (h.status === 'submitted') {
        actions = `<div class="hw-inline-grade">
                     ${HW_GRADE_RULES.map(g => `<button class="hw-grade-inline ${g.cls}" onclick="UI.quickGradeHomework('${h.id}', '${g.grade}')" title="${g.name} · ${g.points > 0 ? '+' : ''}${g.points}分">${g.grade}</button>`).join('')}
                   </div>
                   <button class="hw-action-btn view" onclick="UI.openHwModal('${h.id}')">👁 详情</button>`;
      } else {
        actions = `<button class="hw-action-btn view" onclick="UI.openHwModal('${h.id}')">👁 查看</button>`;
      }

      const gradeBadge = h.status === 'graded' && h.grade
        ? `<div class="history-grade ${HW_GRADE_RULES.find(r => r.grade === h.grade)?.cls || 'grade-d'}">${h.grade}</div>`
        : '';
      const pointsInfo = h.status === 'graded' && h.points !== 0 ? ` · ${h.points > 0 ? '+' : ''}${h.points}积分` : '';

      return `<div class="hw-card status-${h.status}">
        <div class="hw-card-header">
          <div class="hw-card-title-wrap">
            <div class="hw-card-title">${esc(h.title)}</div>
            <div class="hw-card-tags">
              <span class="hw-type-tag ${typeTag}">${typeName}</span>
              ${subjectTag}
            </div>
          </div>
          ${gradeBadge}
        </div>
        <div class="hw-card-meta">${timeInfo}${pointsInfo}</div>
        <div class="hw-card-footer">
          <span class="hw-status-badge ${h.status}">${statusName}</span>
          <div class="hw-card-actions">
            ${actions}
            <button class="hw-action-btn delete" onclick="UI.deleteHomework('${h.id}')">删除</button>
          </div>
        </div>
      </div>`;
    }).join('');
  },

  addHomework() {
    const title = document.getElementById('hwTitle').value.trim();
    const type = this.hwFilterType;
    const subject = document.getElementById('hwSubject').value.trim();
    const dueDate = document.getElementById('hwDueDate').value;
    if (!title) { alert('请输入作业标题！'); return; }
    const hw = {
      id: 'hw-' + Date.now(),
      title,
      type,
      subject,
      dueDate: dueDate || null,
      status: 'pending',
      submittedPhoto: null,
      submittedDate: null,
      grade: null,
      comment: '',
      points: 0,
      gradedDate: null,
      createdDate: new Date().toISOString(),
    };
    Store.addHomework(hw);
    document.getElementById('hwTitle').value = '';
    document.getElementById('hwSubject').value = '';
    document.getElementById('hwDueDate').value = '';
    document.getElementById('hwAddFormWrap').style.display = 'none';
    this.renderHomework();
    this.renderDashboard();
  },

  deleteHomework(id) {
    if (!confirm('确定删除这个作业吗？')) return;
    Store.deleteHomework(id);
    this.renderHomework();
    this.renderDashboard();
  },

  quickGradeHomework(id, grade) {
    const rule = HW_GRADE_RULES.find(r => r.grade === grade);
    if (!rule) return;
    const pointsText = rule.points > 0 ? `+${rule.points}积分` : `${rule.points}积分（倒扣）`;
    if (confirm(`评定为 ${grade}级 - ${rule.name}\n${pointsText}\n\n确定吗？`)) {
      Store.gradeHomework(id, grade, '');
      this.renderHomework();
      this.renderDashboard();
      this.updateNavPoints();
      if (rule.points > 0) this.fireConfetti();
    }
  },

  openHwModal(id) {
    const hw = Store.data.homeworks.find(h => h.id === id);
    if (!hw) return;
    this.hwGradingId = id;
    this.hwSelectedGrade = null;
    const modal = document.getElementById('hwModal');
    const content = document.getElementById('hwModalContent');
    const typeTag = hw.type === 'vacation' ? '🏖️ 假期作业' : '📚 日常作业';
    const statusName = { pending: '待完成', submitted: '待批改', graded: '已完成' }[hw.status];

    let photoHTML = '';
    if (hw.submittedPhoto) {
      photoHTML = `<img class="hw-modal-photo" src="${hw.submittedPhoto}" alt="作业照片">`;
    } else if (hw.status === 'pending') {
      photoHTML = `
        <div style="text-align:center;padding:20px;background:var(--bg);border-radius:8px;margin-bottom:12px;">
          <p style="color:var(--text-secondary);margin-bottom:12px;">还没有提交作业照片</p>
          <input type="file" id="hwPhotoInput" accept="image/*" capture="environment" style="display:none">
          <button class="btn-primary" onclick="document.getElementById('hwPhotoInput').click()">📷 拍照上传</button>
        </div>`;
    }

    let gradeSection = '';
    if (hw.status === 'submitted') {
      gradeSection = `
        <div class="hw-grade-section">
          <div class="hw-grade-label">👨‍🏫 家长批改 - 选择作业等级</div>
          <div class="hw-grade-buttons">
            ${HW_GRADE_RULES.map(g => `
              <button class="hw-grade-btn ${g.cls}" onclick="UI.selectHwGrade('${g.grade}', this)">
                ${g.grade}
                <span class="hw-grade-label-sm">${g.name}</span>
              </button>
            `).join('')}
          </div>
          <textarea class="hw-comment-input" id="hwCommentInput" rows="2" placeholder="批改评语（可选）" maxlength="100"></textarea>
          <div class="hw-modal-actions">
            <button class="btn-primary btn-save" id="confirmGradeBtn" disabled onclick="UI.confirmGradeHomework('${hw.id}')">确认评分</button>
          </div>
        </div>`;
    } else if (hw.status === 'graded') {
      const gradeRule = HW_GRADE_RULES.find(r => r.grade === hw.grade);
      const pointsText = hw.points > 0 ? `+${hw.points} 积分` : `${hw.points} 积分`;
      const pointsColor = hw.points < 0 ? 'var(--danger)' : 'var(--accent-dark)';
      gradeSection = `
        <div class="hw-grade-section" style="text-align:center;">
          <div class="grade-letter ${gradeRule?.cls || 'grade-d'}" style="margin:0 auto 12px;">${hw.grade}</div>
          <div style="font-size:18px;font-weight:700;margin-bottom:4px;">${gradeRule?.name || ''}</div>
          <div style="color:${pointsColor};font-weight:700;">${pointsText}</div>
          ${hw.comment ? `<p style="margin-top:8px;color:var(--text-secondary);">💬 ${esc(hw.comment)}</p>` : ''}
        </div>`;
    }

    content.innerHTML = `
      <div class="hw-modal-title">${esc(hw.title)}</div>
      <div style="text-align:center;margin-bottom:12px;">
        <span class="hw-type-tag ${hw.type === 'vacation' ? 'vacation' : 'daily'}">${typeTag}</span>
        ${hw.subject ? `<span class="hw-subject-tag">${esc(hw.subject)}</span>` : ''}
        <span class="hw-status-badge ${hw.status}">${statusName}</span>
      </div>
      ${photoHTML}
      <div class="hw-modal-info">
        ${hw.dueDate ? `<div class="hw-modal-info-row"><span class="hw-modal-info-label">截止日期</span><span class="hw-modal-info-value">${new Date(hw.dueDate).toLocaleDateString('zh-CN')}</span></div>` : ''}
        ${hw.submittedDate ? `<div class="hw-modal-info-row"><span class="hw-modal-info-label">提交时间</span><span class="hw-modal-info-value">${new Date(hw.submittedDate).toLocaleString('zh-CN')}</span></div>` : ''}
        ${hw.gradedDate ? `<div class="hw-modal-info-row"><span class="hw-modal-info-label">批改时间</span><span class="hw-modal-info-value">${new Date(hw.gradedDate).toLocaleString('zh-CN')}</span></div>` : ''}
      </div>
      ${gradeSection}
      <div class="hw-modal-actions">
        <button class="btn-secondary" onclick="UI.closeHwModal()">关闭</button>
      </div>
    `;

    // 绑定拍照上传事件
    if (hw.status === 'pending') {
      const photoInput = document.getElementById('hwPhotoInput');
      if (photoInput) {
        photoInput.addEventListener('change', (e) => this.handleHwPhoto(e, hw.id));
      }
    }

    modal.style.display = 'flex';
  },

  async handleHwPhoto(event, hwId) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      // 压缩图片
      const compressed = await this.compressImage(e.target.result, 800, 0.5);
      Store.submitHomework(hwId, compressed);
      this.closeHwModal();
      this.openHwModal(hwId);
      this.renderHomework();
      this.renderDashboard();
      // 提示拍照成功
      this.fireConfetti();
      alert('拍照打卡成功！已提交作业，等待家长批改。');
    };
    reader.readAsDataURL(file);
  },

  // 直接拍照打卡（无需先打开弹窗）
  directHwPhoto(hwId) {
    const hw = Store.data.homeworks.find(h => h.id === hwId);
    if (!hw || hw.status !== 'pending') return;
    // 创建临时input元素
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const compressed = await this.compressImage(ev.target.result, 800, 0.5);
        Store.submitHomework(hwId, compressed);
        this.renderHomework();
        this.renderDashboard();
        this.updateNavPoints();
        this.fireConfetti();
        alert('拍照打卡成功！作业已提交，等待家长批改。');
      };
      reader.readAsDataURL(file);
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(() => document.body.removeChild(input), 5000);
  },

  compressImage(dataUrl, maxWidth, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round(height * maxWidth / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },

  selectHwGrade(grade, btn) {
    this.hwSelectedGrade = grade;
    document.querySelectorAll('.hw-grade-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('confirmGradeBtn').disabled = false;
  },

  confirmGradeHomework(hwId) {
    if (!this.hwSelectedGrade) { alert('请先选择作业等级！'); return; }
    const comment = document.getElementById('hwCommentInput')?.value.trim() || '';
    const rule = HW_GRADE_RULES.find(r => r.grade === this.hwSelectedGrade);
    Store.gradeHomework(hwId, this.hwSelectedGrade, comment);
    this.closeHwModal();
    this.renderHomework();
    this.renderDashboard();
    this.updateNavPoints();
    this.fireConfetti();
    alert(`批改完成！获得 ${rule.points} 积分！⭐`);
  },

  closeHwModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('hwModal').style.display = 'none';
  },

  // ======== 宠物养成模块 ========

  renderPet() {
    const pet = Store.data.pet;
    const stage = Pet.getStage(pet.level);
    const expNeed = Pet.getExpForNextLevel(pet.level);
    const expPct = Pet.getExpProgress(pet.level, pet.exp);
    const stageProgress = Pet.getStageProgress(pet.level, pet.exp);

    // 宠物积分显示
    const petPointsEl = document.getElementById('petPointsDisplay');
    if (petPointsEl) petPointsEl.textContent = Store.data.petPoints;

    // 宠物展示
    document.getElementById('petEmoji').textContent = stage.emoji;
    document.getElementById('petName').textContent = pet.name || '我的宠物';
    let stageText = `Lv.${pet.level} · ${stage.name}`;
    if (stageProgress.next) {
      stageText += ` (再升${stageProgress.levelsToNext}级进化为${stageProgress.next.name})`;
    }
    document.getElementById('petStageText').textContent = stageText;

    // 状态条
    document.getElementById('petHungerBar').style.width = pet.hunger + '%';
    document.getElementById('petHungerValue').textContent = pet.hunger;
    document.getElementById('petHappyBar').style.width = pet.happiness + '%';
    document.getElementById('petHappyValue').textContent = pet.happiness;
    document.getElementById('petHealthBar').style.width = pet.health + '%';
    document.getElementById('petHealthValue').textContent = pet.health;
    document.getElementById('petExpBar').style.width = expPct + '%';
    document.getElementById('petExpValue').textContent = `${pet.exp}/${expNeed}`;

    // 商店
    const shopEl = document.getElementById('petShopGrid');
    shopEl.innerHTML = PET_SHOP_ITEMS.map(item => {
      const owned = Store.data.petInventory[item.id] || 0;
      const canBuy = Store.data.petPoints >= item.cost;
      return `<div class="pet-shop-item ${canBuy ? '' : 'disabled'}" onclick="${canBuy ? `UI.buyPetItem('${item.id}')` : `alert('宠物积分不足！')`}">
        <div class="pet-shop-icon">${item.icon}</div>
        <div class="pet-shop-name">${item.name}</div>
        <div class="pet-shop-desc">${item.desc}</div>
        <div class="pet-shop-cost">🐾${item.cost}</div>
        ${owned > 0 ? `<div style="font-size:11px;color:var(--success);margin-top:4px;">已有${owned}个</div>` : ''}
      </div>`;
    }).join('');

    // 背包
    const invEl = document.getElementById('petInventory');
    const invEntries = Object.entries(Store.data.petInventory).filter(([id, count]) => count > 0);
    if (invEntries.length > 0) {
      invEl.innerHTML = `<div class="pet-inventory-grid">${invEntries.map(([itemId, count]) => {
        const item = PET_SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return '';
        return `<div class="pet-inv-item" onclick="UI.usePetItem('${item.id}')">
          <div class="pet-inv-icon">${item.icon}</div>
          <div class="pet-inv-name">${item.name}</div>
          <div class="pet-inv-count">${count}</div>
        </div>`;
      }).join('')}</div>`;
    } else {
      invEl.innerHTML = '<p class="empty-hint">背包空空如也，去商店买点东西吧！</p>';
    }

    // 日志
    const logEl = document.getElementById('petActionLog');
    const logs = Store.data.petActionLog;
    if (logs.length > 0) {
      logEl.innerHTML = logs.slice(0, 15).map(log => {
        const time = new Date(log.time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `<div class="pet-log-item">
          <span class="pet-log-icon">${log.icon}</span>
          <span class="pet-log-text">${esc(log.text)}</span>
          <span class="pet-log-time">${time}</span>
        </div>`;
      }).join('');
    } else {
      logEl.innerHTML = '<p class="empty-hint">还没有养成记录</p>';
    }
  },

  buyPetItem(itemId) {
    const item = PET_SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    if (Store.data.petPoints < item.cost) { alert('宠物积分不足！'); return; }
    Store.buyPetItem(itemId);
    this.updateNavPoints();
    this.renderPet();
    this.renderDashboard();
    this.showPetModal('购买成功！', `获得了 ${item.icon} ${item.name}`, item.icon);
  },

  usePetItem(itemId) {
    const result = Store.usePetItem(itemId);
    if (!result) { alert('使用失败！'); return; }
    this.updateNavPoints();
    this.renderPet();
    this.renderDashboard();

    const { item, changes } = result;
    const pet = Store.data.pet;
    const stage = Pet.getStage(pet.level);
    let statsHTML = '';
    if (changes.hunger) statsHTML += `<div class="pet-modal-stat"><span>🍖 饱食度</span><div class="pet-stat-bar"><div class="pet-stat-fill stat-hunger" style="width:${pet.hunger}%"></div></div><span>${pet.hunger}</span></div>`;
    if (changes.happiness) statsHTML += `<div class="pet-modal-stat"><span>😊 快乐度</span><div class="pet-stat-bar"><div class="pet-stat-fill stat-happy" style="width:${pet.happiness}%"></div></div><span>${pet.happiness}</span></div>`;
    if (changes.health) statsHTML += `<div class="pet-modal-stat"><span>💚 健康度</span><div class="pet-stat-bar"><div class="pet-stat-fill stat-health" style="width:${pet.health}%"></div></div><span>${pet.health}</span></div>`;
    if (changes.exp) statsHTML += `<div class="pet-modal-stat"><span>✨ 经验</span><div class="pet-stat-bar"><div class="pet-stat-fill stat-exp" style="width:${Pet.getExpProgress(pet.level, pet.exp)}%"></div></div><span>+${changes.exp}</span></div>`;

    this.showPetModal(`使用了${item.name}`, '', item.icon, statsHTML);

    // 检查是否升级
    if (pet.level > 1 && pet.exp < changes.exp) {
      setTimeout(() => {
        this.fireConfetti();
        this.showPetModal('🎉 升级了！', `宠物升到了 Lv.${pet.level}！`, stage.emoji);
      }, 2000);
    }
  },

  showPetModal(title, subtitle, emoji, statsHTML) {
    const modal = document.getElementById('petModal');
    const content = document.getElementById('petModalContent');
    content.innerHTML = `
      <div class="pet-modal-emoji">${emoji}</div>
      <div class="pet-modal-title">${esc(title)}</div>
      ${subtitle ? `<p style="color:var(--text-secondary);margin-bottom:8px;">${esc(subtitle)}</p>` : ''}
      ${statsHTML ? `<div class="pet-modal-stats">${statsHTML}</div>` : ''}
      <button class="btn-primary" onclick="UI.closePetModal()">好的</button>
    `;
    modal.style.display = 'flex';
  },

  closePetModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('petModal').style.display = 'none';
  },
};

// ============================================
// 11. 初始化
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  Store.init();
  await AudioStore.init();
  Speech.init();
  UI.init();
});

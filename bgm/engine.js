/* ぴよぴよランド 共通BGMエンジン（オルゴール風・手続き生成ループ）
 * ------------------------------------------------------------------
 * 街（kerokero-1245.github.io）の静的HTML用・依存ゼロの vanilla 版。
 * Expo 3アプリ用の engine.ts と同一ロジック（同じ音色・同じスケジューラ）。
 *
 * 設計思想は既存の効果音／声（src/audio/ の sounds.ts・clips.ts・voice.ts）と同じ:
 *   - 音源ファイルを同梱しない。Web Audio API でその場合成する（完全オフライン）。
 *   - 音は必ず「ユーザー操作起点」で鳴らす（iOS Safari の自動再生制限に合わせる）。
 *   - AudioContext 非対応／未取得なら全 API は無害な no-op（クラッシュ厳禁）。
 *
 * つなぎ目のないループ: lookahead 方式のスケジューラで、曲を「無限に続くノート列」として
 * ctx.currentTime 基準の絶対時刻に前もって予約する。実際に止めて鳴らし直すことはしないので
 * ループ境界に切れ目が出ない（末尾で鳴っている音の余韻がそのまま次周へ伸びる）。
 *
 * 使い方（街）:
 *   <script src="assets/bgm/songs.js"></script>   // window.PIYO_SONGS を定義
 *   <script src="assets/bgm/engine.js"></script>  // window.PiyoBgm を定義
 *   var bgm = PiyoBgm.createEngine();              // 既定で window.PIYO_SONGS を読む
 *   // ユーザーの最初のタップで:
 *   bgm.startBgm('land');
 *   // 声を鳴らす直前／直後:
 *   bgm.duckBgm();  ...  bgm.unduckBgm();
 */
(function (global) {
  'use strict';

  // ── 音色パラメータ（オルゴール風）────────────────────────────────────
  var MASTER_VOLUME = 0.1; // 控えめ既定音量（マスターゲイン）
  var DUCK_RATIO = 0.35; // 声再生中はこの比率まで下げる
  var DUCK_TAU = 0.08; // ダッキング時定数（速く沈む）
  var UNDUCK_TAU = 0.22; // 復帰時定数（ゆっくり戻る）
  var LOWPASS_HZ = 4500; // 全体をやわらげるローパス
  var LOWPASS_Q = 0.7;
  var OVERTONE_RATIO = 2.0; // 高次倍音1本（1オクターブ上）
  var OVERTONE_GAIN = 0.32; // 倍音の相対ゲイン（小さめ）
  var ATTACK = 0.005; // アタック 約5ms
  var PARTIAL_ATTACK = 0.003;
  var DECAY_MIN = 0.9; // 指数減衰の最小・最大（秒）
  var DECAY_MAX = 2.0;
  var DECAY_SCALE = 1.4; // 音価に対する余韻の伸び
  var PARTIAL_DECAY_RATIO = 0.45; // 倍音は速く減衰（金属的な立ち上がり）

  // ── スケジューラ・パラメータ ────────────────────────────────────────
  var LOOKAHEAD_MS = 200; // インターバル
  var SCHEDULE_AHEAD = 0.6; // 先読み秒
  var START_DELAY = 0.12; // start 時、最初のノートまでの余裕

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  // AudioContext コンストラクタを安全に取り出す（無ければ null）。
  function getAC(g) {
    try {
      return g.AudioContext || g.webkitAudioContext || null;
    } catch (e) {
      return null;
    }
  }
  function getOfflineAC(g) {
    try {
      return g.OfflineAudioContext || g.webkitOfflineAudioContext || null;
    } catch (e) {
      return null;
    }
  }

  // ── オルゴール1音の合成（リアルタイムでもオフライン描画でも共通で使う）──────
  // 基音（triangle）＋高次倍音1本（sine, 小ゲイン・速い減衰）。指数減衰でチンと鳴らす。
  // out（GainNode/AudioNode）に接続する。t は絶対時刻（ctx.currentTime 基準）。
  function voice(ctx, out, t, midi, durBeats, vel, secPerBeat) {
    var freq = midiToFreq(midi);
    var decay = clamp(durBeats * secPerBeat * DECAY_SCALE, DECAY_MIN, DECAY_MAX);
    var peak = Math.max(0.0002, vel);

    // 基音
    var osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = freq;
    var g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.0001, t);
    g1.gain.exponentialRampToValueAtTime(peak, t + ATTACK);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc1.connect(g1);
    g1.connect(out);
    osc1.start(t);
    osc1.stop(t + decay + 0.05);

    // 高次倍音（1オクターブ上・小ゲイン・速い減衰）
    var osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * OVERTONE_RATIO;
    var g2 = ctx.createGain();
    var pdecay = clamp(decay * PARTIAL_DECAY_RATIO, 0.3, DECAY_MAX);
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(peak * OVERTONE_GAIN, t + PARTIAL_ATTACK);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + pdecay);
    osc2.connect(g2);
    g2.connect(out);
    osc2.start(t);
    osc2.stop(t + pdecay + 0.05);
  }

  // 曲データ（{bpm, beatsPerBar, bars, notes:[{t,midi,dur,vel}], mix?}）を検証して整える。
  function prepSong(song) {
    var bpm = song.bpm || 80;
    var beatsPerBar = song.beatsPerBar || 4;
    var bars = song.bars || 16;
    var secPerBeat = 60 / bpm;
    var loopBeats = beatsPerBar * bars;
    return {
      bpm: bpm,
      beatsPerBar: beatsPerBar,
      bars: bars,
      secPerBeat: secPerBeat,
      loopBeats: loopBeats,
      loopDur: loopBeats * secPerBeat,
      mix: typeof song.mix === 'number' ? song.mix : 1,
      notes: song.notes || [],
    };
  }

  // ── エンジン本体（1インスタンス＝1つの再生系）────────────────────────
  function createEngine(config) {
    config = config || {};
    var g = global;
    var AC = getAC(g);

    // 曲データの供給元: config.songs → window.PIYO_SONGS の順。
    var songs = config.songs || (g.PIYO_SONGS ? g.PIYO_SONGS : null);

    // 外部（声・効果音）と同じ AudioContext を共有するための注入口。
    //   config.getCtx: () => AudioContext | null   … 既存 ctx を返す関数
    //   config.ctx:    AudioContext                … 既存 ctx を直接注入
    var injectedGetCtx =
      typeof config.getCtx === 'function' ? config.getCtx : config.ctx ? function () { return config.ctx; } : null;

    var masterVolume = typeof config.masterVolume === 'number' ? config.masterVolume : MASTER_VOLUME;

    var ctx = null; // 使用中の AudioContext
    var ownsCtx = false; // 自分で生成した ctx か（visibility 制御の判断に使う）
    var master = null; // マスターゲイン（音量・ダッキング）
    var lowpass = null; // 全体のローパス

    var enabled = true; // 初期状態 ON
    var running = false; // 現在ループ再生中か
    var songId = null; // 再生中／再生予定の曲ID
    var song = null; // prepSong 済みデータ

    var timer = null; // lookahead インターバル
    var loopStart = 0; // 1周目先頭の絶対時刻
    var loopIndex = 0; // 何周目か
    var noteCursor = 0; // 現在の周で次に予約するノート添字
    var duckCount = 0; // 多重ダッキングのネスト数
    var baseVolume = masterVolume; // 現在の基準音量（曲の mix を反映）

    var supported = !!AC || !!injectedGetCtx;

    // 使用する AudioContext を確保（注入があればそれ、無ければ自前生成）。
    function ensureCtx() {
      if (ctx) return ctx;
      if (injectedGetCtx) {
        try {
          var c = injectedGetCtx();
          if (c) {
            ctx = c;
            ownsCtx = false;
            return ctx;
          }
        } catch (e) {}
      }
      if (!AC) return null;
      try {
        ctx = new AC();
        ownsCtx = true;
      } catch (e) {
        ctx = null;
      }
      return ctx;
    }

    // マスター系（master gain → lowpass → destination）を用意。
    function ensureGraph() {
      if (!ctx) return false;
      if (master) return true;
      try {
        master = ctx.createGain();
        master.gain.value = baseVolume;
        lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = LOWPASS_HZ;
        lowpass.Q.value = LOWPASS_Q;
        master.connect(lowpass);
        lowpass.connect(ctx.destination);
        return true;
      } catch (e) {
        master = null;
        lowpass = null;
        return false;
      }
    }

    function currentDuckTarget() {
      return duckCount > 0 ? baseVolume * DUCK_RATIO : baseVolume;
    }

    // lookahead 一回分: 先読み窓に入るノートを予約する。
    function scheduleTick() {
      if (!running || !ctx || !master || !song) return;
      var now = ctx.currentTime;
      var horizon = now + SCHEDULE_AHEAD;
      var notes = song.notes;
      // 無限ループとして、window に入るノートを順に予約。
      // 安全上限（1tick で予約しすぎない）。
      var guard = 0;
      while (guard++ < 512) {
        if (noteCursor >= notes.length) {
          // 次の周へ
          loopIndex += 1;
          noteCursor = 0;
          if (notes.length === 0) break;
        }
        var n = notes[noteCursor];
        var at = loopStart + loopIndex * song.loopDur + n.t * song.secPerBeat;
        if (at >= horizon) break; // まだ先。次tickで。
        if (at >= now - 0.02) {
          voice(ctx, master, at, n.midi, n.dur, n.vel, song.secPerBeat);
        }
        noteCursor += 1;
      }
    }

    function startTimer() {
      if (timer != null) return;
      timer = setInterval(scheduleTick, LOOKAHEAD_MS);
      scheduleTick(); // 即座に一度
    }
    function stopTimer() {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    }

    // ── 公開API ──────────────────────────────────────────────────────

    // 曲を再生開始（必ずユーザー操作起点で呼ぶ前提）。
    function startBgm(id) {
      if (!supported) return;
      if (!songs) return;
      var data = songs[id];
      if (!data) return;
      songId = id;
      song = prepSong(data);
      baseVolume = masterVolume * song.mix;

      if (!enabled) return; // OFF のときは予約だけ覚えて鳴らさない
      if (running && ctx && master) {
        // 既に同じ曲が回っているなら二重startしない。
        return;
      }
      if (!ensureCtx()) return;
      if (!ensureGraph()) return;
      try {
        if (ctx.state === 'suspended') ctx.resume();
      } catch (e) {}

      // 基準音量へ（ダッキング状態は維持）。
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(currentDuckTarget(), ctx.currentTime);
      } catch (e) {}

      loopStart = ctx.currentTime + START_DELAY;
      loopIndex = 0;
      noteCursor = 0;
      running = true;
      startTimer();
    }

    // 再生停止（fadeSec でフェードアウト）。予約済みの余韻はゲインで消える。
    function stopBgm(fadeSec) {
      stopTimer();
      running = false;
      if (!ctx || !master) return;
      var f = typeof fadeSec === 'number' && fadeSec >= 0 ? fadeSec : 0.4;
      try {
        var now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        if (f <= 0.001) {
          master.gain.setValueAtTime(0.0001, now);
        } else {
          master.gain.setTargetAtTime(0.0001, now, f / 3);
        }
      } catch (e) {}
    }

    // ON/OFF トグル（おとなモード用）。false で止め、true で予定曲を鳴らし直す。
    function setBgmEnabled(on) {
      on = !!on;
      if (enabled === on) return;
      enabled = on;
      if (!on) {
        stopBgm(0.3);
      } else if (songId) {
        startBgm(songId);
      }
    }

    function isBgmEnabled() {
      return enabled;
    }

    // 声クリップ再生中のダッキング（なめらかに沈める）。多重呼び出しに耐える。
    function duckBgm() {
      duckCount += 1;
      if (!ctx || !master) return;
      try {
        master.gain.setTargetAtTime(baseVolume * DUCK_RATIO, ctx.currentTime, DUCK_TAU);
      } catch (e) {}
    }

    // ダッキング解除（なめらかに戻す）。ネストが全部解けたら基準音量へ。
    function unduckBgm() {
      duckCount = Math.max(0, duckCount - 1);
      if (!ctx || !master) return;
      if (duckCount > 0) return;
      try {
        master.gain.setTargetAtTime(baseVolume, ctx.currentTime, UNDUCK_TAU);
      } catch (e) {}
    }

    // タブが隠れたら自動サスペンド、戻ったら復帰。
    function onVisibility() {
      try {
        if (!ctx) return;
        if (g.document && g.document.hidden) {
          stopTimer();
          if (ownsCtx && ctx.state === 'running') ctx.suspend();
        } else {
          if (running && enabled) {
            if (ctx.state === 'suspended') ctx.resume();
            startTimer();
          }
        }
      } catch (e) {}
    }
    if (supported && g.document && typeof g.document.addEventListener === 'function') {
      try {
        g.document.addEventListener('visibilitychange', onVisibility);
      } catch (e) {}
    }

    return {
      startBgm: startBgm,
      stopBgm: stopBgm,
      setBgmEnabled: setBgmEnabled,
      isBgmEnabled: isBgmEnabled,
      duckBgm: duckBgm,
      unduckBgm: unduckBgm,
      // 検証・デバッグ用（アプリからは通常使わない）。
      _getState: function () {
        return { supported: supported, enabled: enabled, running: running, songId: songId, ownsCtx: ownsCtx };
      },
      _getCtx: function () {
        return ctx;
      },
    };
  }

  // ── オフライン描画（試聴WAV生成・レンダリング検証用）──────────────────
  // OfflineAudioContext で曲を loops 周ぶんレンダリングして AudioBuffer を返す。
  // リアルタイムと同一の voice()／マスター系を使うので、出音は実再生と一致する。
  // ブラウザ専用（Node には OfflineAudioContext が無いので null を返す）。
  function renderSong(songId, opts) {
    opts = opts || {};
    var g = global;
    var OAC = getOfflineAC(g);
    if (!OAC) return Promise.resolve(null);
    var songs = opts.songs || g.PIYO_SONGS;
    if (!songs || !songs[songId]) return Promise.resolve(null);
    var song = prepSong(songs[songId]);
    var loops = opts.loops || 1;
    var tail = typeof opts.tail === 'number' ? opts.tail : DECAY_MAX + 0.5; // 末尾の余韻ぶん
    var sampleRate = opts.sampleRate || 44100;
    var masterVolume = typeof opts.masterVolume === 'number' ? opts.masterVolume : MASTER_VOLUME;
    var baseVolume = masterVolume * song.mix;

    var totalDur = loops * song.loopDur + tail;
    var length = Math.ceil(totalDur * sampleRate);
    var ctx = new OAC(1, length, sampleRate);

    var master = ctx.createGain();
    master.gain.value = baseVolume;
    var lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = LOWPASS_HZ;
    lowpass.Q.value = LOWPASS_Q;
    master.connect(lowpass);
    lowpass.connect(ctx.destination);

    var scheduled = 0;
    for (var L = 0; L < loops; L++) {
      var base = L * song.loopDur;
      for (var i = 0; i < song.notes.length; i++) {
        var n = song.notes[i];
        var at = base + n.t * song.secPerBeat;
        voice(ctx, master, at, n.midi, n.dur, n.vel, song.secPerBeat);
        scheduled++;
      }
    }

    return ctx.startRendering().then(function (buf) {
      buf._notesScheduled = scheduled;
      buf._loopDur = song.loopDur;
      buf._loops = loops;
      return buf;
    });
  }

  var api = {
    createEngine: createEngine,
    renderSong: renderSong,
    voice: voice,
    prepSong: prepSong,
    midiToFreq: midiToFreq,
    MASTER_VOLUME: MASTER_VOLUME,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.PiyoBgm = api;
})(typeof self !== 'undefined' ? self : typeof globalThis !== 'undefined' ? globalThis : this);

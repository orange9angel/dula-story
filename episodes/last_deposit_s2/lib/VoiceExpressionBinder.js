/**
 * VoiceExpressionBinder — 把 {Voice:xxx} 语气标签同步到 MoodDirector
 *
 * engine 已经做了：
 *   - ToneDirector 分析台词情绪 → 自动表情 + 肢体动作
 * 这里补充：
 *   - 根据 voice_config 里的情绪名，同步切换 MoodDirector 的 ambient / eye-glow / pulse
 *
 * 绑定方式：在 bootstrap.js 中调用
 *   bindVoiceToMood(storyboard, moodDirector);
 */

const VOICE_TO_MOOD = {
  calm: 'stealth',
  worried: 'alert',
  angry: 'combat',
  excited: 'triumph',
  sad: 'despair',
};

export function bindVoiceToMood(storyboard, moodDirector) {
  if (!storyboard || !moodDirector) return;

  // Patch Storyboard._processEntries 后的表情应用阶段，同步 mood
  const originalApplyEntries = storyboard._applyEntryEffects || storyboard._processEntries;

  // 更安全：在 parse 完成后，遍历 entries 给每个台词 entry 追加 mood 同步事件
  const originalParse = storyboard.loadStory || storyboard.loadEntries;

  // 方案 B：在 Storyboard update 循环里，根据当前活跃的台词 entry 的 tone 实时切 mood
  const originalUpdate = storyboard.update.bind(storyboard);
  storyboard.update = function (time, delta) {
    _syncActiveEntryMood(storyboard, moodDirector, time);
    return originalUpdate(time, delta);
  };
}

function _syncActiveEntryMood(storyboard, moodDirector, time) {
  if (!storyboard.entries) return;

  // 找到当前时间所在的台词 entry
  const activeEntry = storyboard.entries.find(
    (e) => e.character && e.dialogue && time >= e.startTime && time < e.endTime
  );
  if (!activeEntry) return;

  const tone = activeEntry.tone || activeEntry.voiceEmotion;
  if (!tone) return;

  const moodName = VOICE_TO_MOOD[tone];
  if (!moodName) return;

  if (moodDirector.currentMood?.name !== moodName) {
    moodDirector.setMood(moodName, { duration: 0.8, skipExpression: true });
  }
}

/**
 * 反向：从 MoodDirector 情绪推导推荐 Voice 情绪
 */
export function moodToVoice(moodName) {
  const map = {
    stealth: 'calm',
    alert: 'worried',
    combat: 'angry',
    triumph: 'excited',
    despair: 'sad',
  };
  return map[moodName] || 'calm';
}

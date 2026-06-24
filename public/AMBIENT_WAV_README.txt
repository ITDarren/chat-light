【自然環境音 WAV 檔案放置說明】

請將您的 19 秒自然環境音 WAV 檔案，重新命名為：

  ambient.wav

並放置在本資料夾（/public/）中：
  e:\...\chat-light\public\ambient.wav

規格建議：
- 格式：WAV（PCM）
- 時長：19 秒（程式將自動循環播放）
- 取樣率：44100 Hz 或 48000 Hz
- 聲道：立體聲（Stereo）或單聲道（Mono）

放置完畢後重新啟動開發伺服器即可生效。
音量由程式設定為 75%，可視需求調整 App.tsx 中 audio.volume 的數值（0.0 ~ 1.0）。

# 常见问题

## 权限问题

### 错误码 201：权限被拒绝
- **原因**：应用未在 `module.json5` 中声明所需权限
- **相关 API**：AVRecorder（录制音频）、AVScreenCaptureRecorder（录屏）
- **需要声明的权限**：
  - 录制音频：`ohos.permission.MICROPHONE`
  - 屏幕录制：`ohos.permission.CAPTURE_SCREEN`（系统权限）
  - 后台播放：`ohos.permission.KEEP_BACKGROUND_RUNNING`
- **排查步骤**：
  1. 检查 `module.json5` 的 `requestPermissions` 中是否声明了对应权限
  2. 确认权限的 `reason` 字段已正确填写（用户可见权限说明）
  3. 对于动态授权权限，检查是否调用了 `requestPermissionsFromUser()`

### 错误码 202：非系统应用
- **原因**：使用了仅限系统应用的 API
- **相关 API**：VideoRecorder（systemapi）、部分 ScreenCapture 高级功能
- **排查步骤**：
  1. 检查 `.d.ts` 中该 API 是否标注为 `systemapi`
  2. 确认应用的签名类型是否为系统应用签名

## 参数问题

### 错误码 401：参数错误
- **常见场景**：
  - `createAVPlayer()` 或 `createAVRecorder()` 未传必需参数
  - `AVPlayer.seek()` 传入负数或超出媒体时长的位置
  - `AVRecorder.prepare(config)` 配置对象格式不正确
  - `SoundPool.load()` 文件路径不存在或格式不支持
- **排查步骤**：
  1. 对照 API 文档检查参数类型和取值范围
  2. 检查回调中返回的具体错误信息
  3. 使用 try-catch 包裹调用并打印完整错误对象

### 错误码 5400108：参数值超出范围
- **常见场景**：seek 位置超出时长、播放速率值非法

## 状态机问题

### 错误码 5400102：操作不允许
- **原因**：在错误的状态下调用了方法。这是最常见的问题之一
- **AVPlayer 状态机**：`idle → initialized → preparing → prepared → playing ↔ paused → stopped → completed`
- **常见错误操作**：
  - 在 `idle` 状态直接调用 `play()`（需要先设置 source 并 prepare）
  - 在 `stopped` 状态调用 `pause()`（需要先 reset 再重新播放）
  - 在 `released` 状态调用任何方法
  - 在 `preparing` 状态调用 `seek()`
- **排查步骤**：
  1. 监听 `stateChange` 事件，确认当前状态
  2. 在调用方法前检查 `player.state` 属性
  3. 确保按正确顺序调用：设置 source → prepare → play

### AVRecorder 状态机问题
- **AVRecorder 状态机**：`idle → prepared → started ↔ paused → stopped`
- **常见错误**：
  - 未调用 `prepare()` 就调用 `start()`
  - 未配置 `audioSourceType` 或 `videoSourceType` 就 prepare
  - 在 `stopped` 状态直接再次 `start()`（需要 `reset()` 后重新配置）

## 内存和服务问题

### 错误码 5400101：内存不足或服务数达到上限
- **原因**：同时创建了过多的播放器或录制器实例
- **排查步骤**：
  1. 检查是否及时调用了 `release()` 释放不再使用的实例
  2. 减少同时活跃的播放器/录制器数量
  3. 检查设备可用内存

### 错误码 5400105：服务进程死亡
- **原因**：媒体服务进程（`media_server`）崩溃
- **排查步骤**：
  1. 查看 `hilog` 中 `MediaServer` 相关的崩溃日志
  2. 检查是否触发了服务端的死锁或空指针
  3. 查看系统日志中的 `hisysevent` 事件
  4. 尝试重新创建播放器/录制器实例

## 格式和编解码问题

### 错误码 5400106：不支持的格式
- **常见场景**：
  - 播放不支持的容器格式（如某些专有格式）
  - 使用不支持的编解码器
  - 文件损坏导致格式识别失败
- **排查步骤**：
  1. 确认文件格式在鸿蒙支持的媒体格式列表中
  2. 检查编码格式是否受设备支持
  3. 尝试用其他播放器验证文件是否可正常播放
  4. 对于录制，确认 `outputFormat` 配置正确

### 内部错误码映射
- `MSERR_UNSUPPORT_AUD_SRC_TYPE`：不支持的音频源类型
- `MSERR_UNSUPPORT_AUD_ENC_TYPE`：不支持的音频编码器
- `MSERR_UNSUPPORT_VID_ENC_TYPE`：不支持的视频编码器
- `MSERR_UNSUPPORT_CONTAINER_TYPE`：不支持的容器格式
- `MSERR_AUD_DEC_FAILED`：音频解码失败
- `MSERR_VID_DEC_FAILED`：视频解码失败
- `MSERR_AUD_ENC_FAILED`：音频编码失败
- `MSERR_VID_ENC_FAILED`：视频编码失败

## 网络问题（流媒体播放）

### 错误码 5400104：超时
- **原因**：网络连接或数据传输超时
- **排查步骤**：
  1. 检查网络连接是否正常
  2. 确认流媒体 URL 是否可访问
  3. 检查是否需要配置网络安全策略（明文 HTTP 限制）

### 网络相关错误码（5411001-5411012）
| 错误码 | 含义 | 排查建议 |
|--------|------|---------|
| 5411001 | DNS 解析失败 | 检查 URL 域名是否正确 |
| 5411002 | 连接超时 | 检查网络连通性 |
| 5411003 | 网络异常 | 检查网络稳定性 |
| 5411004 | 网络不可用 | 检查 Wi-Fi/移动数据是否开启 |
| 5411005 | 网络权限被拒绝 | 检查 `ohos.permission.INTERNET` 权限 |
| 5411007 | 资源未找到 | 检查 URL 是否返回 404 |
| 5411012 | HTTP 明文不允许 | 使用 HTTPS 或配置 `security` 域名例外 |

## 音频中断问题

### 错误码 5400107：音频被中断
- **原因**：高优先级音频事件（来电、闹钟等）中断播放
- **处理方式**：
  1. 监听 `audioInterrupt` 事件获取中断类型
  2. 在中断回调中根据中断类型暂停播放
  3. 在中断结束回调中恢复播放
  4. 配置 `audioInterruptMode` 设置中断响应模式

## Surface 和视频渲染问题

### 视频无法显示
- **常见原因**：
  - 未设置 `surfaceId` 或设置错误
  - XComponent 的 surface 还未准备好就设置给了播放器
  - Surface 尺寸与视频不匹配
- **排查步骤**：
  1. 确保 XComponent 的 `onLoad()` 回调中获取 surfaceId 后再设置
  2. 检查 surfaceId 是否为有效字符串
  3. 确认 `videoScaleType` 设置是否正确

## 录屏问题

### 录屏权限问题
- 录屏需要系统权限 `ohos.permission.CAPTURE_SCREEN`
- 需要通过系统弹窗获取用户授权
- 隐私模式应用内容可能被跳过（`skipPrivacyMode`）

### 录屏音频采集问题
- 需要单独调用 `setMicEnabled()` 启用麦克风
- 内部音频采集受音频策略限制

## SoundPool 问题

### 音效加载失败
- **常见原因**：音频文件格式不支持、文件路径错误
- **排查步骤**：
  1. 检查 `load()` 返回的 streamID 是否有效
  2. 监听 `error` 事件获取详细错误
  3. 确认音频文件格式（推荐 WAV/OGG/MP3）

### 音效播放延迟
- **原因**：SoundPool 设计用于短音效，长音频应使用 AVPlayer
- **建议**：预加载音效（调用 `load()` 并等待完成回调后再 `play()`）

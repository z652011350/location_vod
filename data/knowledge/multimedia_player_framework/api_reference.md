# multimedia_player_framework API 参考手册

## 模块声明

```typescript
import media from '@ohos.multimedia.media';
```

- 声明文件: `api/interface_sdk-js/api/@ohos.multimedia.media.d.ts`
- 系统能力: `SystemCapability.Multimedia.Media.Core`
- Kit: MediaKit

---

## 工厂函数

### media.createAVPlayer()

创建 AVPlayer 播放器实例。建议单应用最多创建 16 个实例。

**签名**:
```typescript
function createAVPlayer(): Promise<AVPlayer>;
function createAVPlayer(callback: AsyncCallback<AVPlayer>): void;
```

**返回值**: `Promise<AVPlayer>` 或通过 callback 返回 AVPlayer 实例。

**错误码**:

| 错误码 | 消息 | 说明 |
|--------|------|------|
| 5400101 | No Memory | 内存不足，无法创建播放器实例 |

**SysCap**: `SystemCapability.Multimedia.Media.AVPlayer`

**实现链路**:
- NAPI: `AVPlayerNapi::JsCreateAVPlayer` — `frameworks/js/avplayer/avplayer_napi.cpp`
- Service: `PlayerServer::Create()` — `services/services/player/server/player_server.cpp`

---

### media.createAVRecorder()

创建 AVRecorder 录制器实例。

**签名**:
```typescript
function createAVRecorder(): Promise<AVRecorder>;
function createAVRecorder(callback: AsyncCallback<AVRecorder>): void;
```

**错误码**:

| 错误码 | 消息 | 说明 |
|--------|------|------|
| 5400101 | No Memory | 内存不足 |

**SysCap**: `SystemCapability.Multimedia.Media.AVRecorder`

**实现链路**:
- NAPI: `AVRecorderNapi::JsCreateAVRecorder` — `frameworks/js/avrecorder/avrecorder_napi.cpp`
- Service: `RecorderServer` — `services/services/recorder/server/recorder_server.cpp`

---

### media.createSoundPool()

创建音效池实例。

**签名**:
```typescript
function createSoundPool(
  maxStreams: number,
  audioRendererInfo: audio.AudioRendererInfo
): Promise<SoundPool>;
function createSoundPool(
  maxStreams: number,
  audioRendererInfo: audio.AudioRendererInfo,
  callback: AsyncCallback<SoundPool>
): void;
```

**参数**:
- `maxStreams`: 最大同时播放流数
- `audioRendererInfo`: 音频渲染器信息（contentType, streamUsage, rendererFlags）

**错误码**:

| 错误码 | 消息 | 说明 |
|--------|------|------|
| 5400101 | No Memory | 内存不足 |
| 5400102 | Invalid Parameter | 参数不合法 |

**SysCap**: `SystemCapability.Multimedia.Media.SoundPool`

**实现链路**:
- NAPI: `SoundPoolNapi::CreateSoundPool` — `frameworks/js/soundpool/src/soundpool_napi.cpp`

---

### media.createAVScreenCaptureRecorder()

创建屏幕录制实例。

**签名**:
```typescript
function createAVScreenCaptureRecorder(): AVScreenCaptureRecorder;
```

**权限**: `ohos.permission.CAPTURE_SCREEN`

**SysCap**: `SystemCapability.Multimedia.Media.AVScreenCapture`

**实现链路**:
- NAPI: `AVScreenCaptureNapi::JsCreateAVScreenCaptureRecorder` — `frameworks/js/avscreen_capture/avscreen_capture_napi.cpp`

---

### media.createAVTranscoder()

创建转码器实例。

**签名**:
```typescript
function createAVTranscoder(): AVTranscoder;
```

**SysCap**: `SystemCapability.Multimedia.Media.AVTranscoder`

**实现链路**:
- NAPI: `AVTransCoderNapi::JsCreateAVTranscoder` — `frameworks/js/avtranscoder/avtranscoder_napi.cpp`

---

### media.createMediaSourceWithUrl()

创建流媒体预下载 MediaSource 实例。支持 HLS、HTTP-FLV、DASH、HTTPS 格式。

**签名**:
```typescript
function createMediaSourceWithUrl(
  url: string,
  headers?: Record<string, string>
): MediaSource;
```

**参数**:
- `url`: 流媒体 URL
- `headers`: 附带到网络请求的 HTTP 头（可选）

**错误码**:

| 错误码 | 消息 | 说明 |
|--------|------|------|
| 401 | Parameter error | 参数类型错误或必填参数缺失 |
| 5400101 | No Memory | 内存不足 |

**实现链路**:
- NAPI: `MediaSourceNapi::JsCreateMediaSourceWithUrl` — `frameworks/js/mediasource/media_source_napi.cpp`

---

### media.createAVMetadataExtractor()

创建元数据提取器实例。

**签名**:
```typescript
function createAVMetadataExtractor(): AVMetadataExtractor;
```

**SysCap**: `SystemCapability.Multimedia.Media.Core`

**实现链路**:
- NAPI: `AVMetadataHelperNapi::JsCreateAVMetadataHelper` — `frameworks/js/metadatahelper/avmetadataextractor_napi.cpp`

---

## AVPlayer 接口

AVPlayer 是核心播放器接口，提供完整的音视频播放控制能力。

**声明**: `api/interface_sdk-js/api/@ohos.multimedia.media.d.ts`
**实现链路**: NAPI → `PlayerServer` → `HiPlayerImpl`

### 属性

| 属性名 | 类型 | 可写 | 说明 | 状态要求 |
|--------|------|------|------|---------|
| url | string | 是 | 网络或本地文件 URL | idle |
| fdSrc | AVFileDescriptor | 是 | 文件描述符源 {fd, offset, length} | idle |
| dataSrc | AVDataSurfaceDescriptor | 是 | 自定义数据源 | idle |
| surfaceId | string | 是 | 视频输出 Surface ID | initialized 或之后 |
| state | AVPlayerState | 否 | 当前播放状态 | 任何 |
| currentTime | number | 否 | 当前播放位置(ms) | prepared 或之后 |
| duration | number | 否 | 媒体总时长(ms) | prepared 或之后 |
| width | number | 否 | 视频宽度 | prepared 或之后 |
| height | number | 否 | 视频高度 | prepared 或之后 |
| loop | boolean | 是 | 是否单曲循环 | prepared 或之后 |

### 方法

#### prepare()

准备播放环境，缓冲媒体数据。

```typescript
prepare(): Promise<void>;
```

**状态要求**: `initialized`
**目标状态**: `prepared`
**错误码**: 5400102 (状态错误), 5400103 (IO错误), 5400106 (格式不支持)

---

#### play()

开始播放。

```typescript
play(): Promise<void>;
```

**状态要求**: `prepared`, `paused`, `completed`
**目标状态**: `playing`

---

#### pause()

暂停播放。

```typescript
pause(): Promise<void>;
```

**状态要求**: `playing`
**目标状态**: `paused`

---

#### stop()

停止播放。

```typescript
stop(): Promise<void>;
```

**状态要求**: `prepared`, `playing`, `paused`, `completed`
**目标状态**: `stopped`

---

#### reset()

重置到初始状态，可重新设置数据源。

```typescript
reset(): Promise<void>;
```

**状态要求**: 任何非 released 状态
**目标状态**: `idle`

---

#### release()

释放播放器资源。

```typescript
release(): Promise<void>;
```

**状态要求**: 任何非 released 状态
**目标状态**: `released`
**注意**: release 后实例不可复用

---

#### seek()

跳转到指定位置。

```typescript
seek(timeMs: number, mode?: SeekMode): Promise<void>;
```

**参数**:
- `timeMs`: 目标位置（毫秒）
- `mode`: Seek 模式，默认 `SEEK_PREVIOUS_SYNC`

**SeekMode 枚举**:

| 值 | 说明 |
|----|------|
| SEEK_PREVIOUS_SYNC | 跳到目标时间之前最近关键帧 |
| SEEK_NEXT_SYNC | 跳到目标时间之后最近关键帧 |
| SEEK_CLOSEST | 跳到最接近目标时间的帧 |

**状态要求**: `prepared`, `playing`, `paused`, `completed`
**事件**: `seekDone(position)`

---

#### setVolume()

设置播放音量。

```typescript
setVolume(volume: number): Promise<void>;
```

**参数**: `volume` — 音量值，范围 0.0 ~ 1.0，步长 0.01
**状态要求**: `prepared` 或之后
**事件**: `volumeChange(volume)`

---

#### setSpeed()

设置播放速度。

```typescript
setSpeed(speed: PlaybackSpeed): Promise<void>;
```

**PlaybackSpeed 枚举**:

| 枚举值 | 速率 | 说明 |
|--------|------|------|
| SPEED_FORWARD_0_125_X | 0.125x | 极慢速 |
| SPEED_FORWARD_0_25_X | 0.25x | 1/4 速 |
| SPEED_FORWARD_0_5_X | 0.5x | 半速 |
| SPEED_FORWARD_0_75_X | 0.75x | 3/4 速 |
| SPEED_FORWARD_1_00_X | 1.0x | 正常速度 |
| SPEED_FORWARD_1_25_X | 1.25x | 1.25 倍速 |
| SPEED_FORWARD_1_50_X | 1.5x | 1.5 倍速 |
| SPEED_FORWARD_1_75_X | 1.75x | 1.75 倍速 |
| SPEED_FORWARD_2_00_X | 2.0x | 2 倍速 |
| SPEED_FORWARD_3_00_X | 3.0x | 3 倍速 |
| SPEED_FORWARD_4_00_X | 4.0x | 4 倍速 |

**状态要求**: `prepared` 或之后
**事件**: `speedDone(speed)`

---

#### selectBitrate()

选择码率（仅 HLS 流媒体有效）。

```typescript
selectBitrate(bitrate: number): Promise<number>;
```

**参数**: `bitrate` — 目标码率（bps）
**事件**: `bitrateDone(bitrate)`

---

#### addSubtitleUrl()

添加外挂字幕。

```typescript
addSubtitleUrl(url: string): Promise<void>;
```

**实现链路**:
- NAPI: `AVPlayerNapi::JsAddSubtitleUrl` → `PlayerServer::AddSubtitles` → `HiPlayerImpl::AddSubSource`

---

### 事件

AVPlayer 通过 `on()` 方法订阅事件。

源文件: `frameworks/js/avplayer/avplayer_napi.cpp` (JsOn → EventManager::AddListener)

| 事件名 | 回调签名 | 说明 | 触发时机 |
|--------|---------|------|---------|
| stateChange | `(state: string, reason: StateChangeReason) => void` | 播放状态变更 | 所有状态转换 |
| error | `(err: BusinessError) => void` | 错误事件 | 发生错误时 |
| seekDone | `(position: number) => void` | Seek 完成 | seek() 操作完成后 |
| speedDone | `(speed: PlaybackSpeed) => void` | 速度设置完成 | setSpeed() 完成后 |
| volumeChange | `(volume: number) => void` | 音量变更 | setVolume() 完成后 |
| endOfStream | `() => void` | 播放到末尾 | 媒体播放完毕 |
| timeUpdate | `(position: number) => void` | 播放位置更新 | 播放中定期触发 |
| bufferingUpdate | `(info: BufferingInfoType, value: number) => void` | 缓冲更新 | 网络流缓冲状态变化 |
| videoSizeChange | `(width: number, height: number) => void` | 视频尺寸变化 | 视频轨信息获取后 |
| audioInterrupt | `(info: audio.InterruptEvent) => void` | 音频中断 | 音频焦点变化 |
| trackChange | `(type: MediaType, index: number) => void` | 轨道切换 | selectTrack/deselectTrack 后 |
| subtitleTextUpdate | `(info: SubtitleInfo) => void` | 字幕更新 | 有新字幕数据 |
| mediaKeySystemInfoUpdate | `(info: DrmMediaKeySystemInfo) => void` | DRM 信息更新 | 检测到 DRM 保护 |
| seiMessageReceived | `(info: SeiMessage) => void` | SEI 消息 | 收到 SEI 数据 |
| amplitudeUpdate | `(amplitude: number) => void` | 音频振幅更新 | 实时音频振幅 |
| superResolutionChanged | `(enabled: boolean) => void` | 超分辨率状态变化 | 超分能力变更 |
| metricsEvent | `(event: AVMetricsEvent) => void` | 播放指标事件 | 卡顿等性能事件 |

### AVPlayerState 枚举

```typescript
type AVPlayerState =
  'idle' | 'initialized' | 'prepared' | 'playing' |
  'paused' | 'stopped' | 'completed' | 'released' | 'error';
```

定义源文件: `interfaces/inner_api/native/player.h` (PlayerStates 枚举)

---

## AVRecorder 接口

音视频录制器接口。

**声明**: `api/interface_sdk-js/api/@ohos.multimedia.media.d.ts`
**实现链路**: NAPI → `RecorderServer` → `HiRecorderImpl`

### 属性

| 属性名 | 类型 | 可写 | 说明 |
|--------|------|------|------|
| state | AVRecorderState | 否 | 当前录制状态 |
| config | AVRecorderConfig | 是 | 录制配置（设置源时使用） |

### 方法

#### prepare()

```typescript
prepare(config: AVRecorderConfig): Promise<void>;
```

**状态要求**: `idle`
**目标状态**: `prepared`

#### start()

```typescript
start(): Promise<void>;
```

**状态要求**: `prepared`
**目标状态**: `started`

#### pause()

```typescript
pause(): Promise<void>;
```

**状态要求**: `started`
**目标状态**: `paused`

#### stop()

```typescript
stop(): Promise<void>;
```

**状态要求**: `started` 或 `paused`
**目标状态**: `stopped`

#### release()

```typescript
release(): Promise<void>;
```

**状态要求**: 任何状态
**目标状态**: `released`

### AVRecorderState

```typescript
type AVRecorderState =
  'idle' | 'prepared' | 'started' | 'paused' | 'stopped' | 'released' | 'error';
```

### AVRecorderConfig

```typescript
interface AVRecorderConfig {
  audio?: boolean;                    // 是否录制音频
  video?: boolean;                    // 是否录制视频
  url?: string;                       // 输出文件路径
  rotation?: number;                  // 视频旋转角度
  location?: { latitude: number; longitude: number };
  profile?: AVRecorderProfile;        // 编码配置
  audioSourceType?: AudioSourceType;  // 音频源类型
  videoSourceType?: VideoSourceType;  // 视频源类型
}
```

---

## AVScreenCapture 接口

屏幕录制接口。

**权限**: `ohos.permission.CAPTURE_SCREEN`
**声明**: `api/interface_sdk-js/api/@ohos.multimedia.media.d.ts`
**实现链路**: NAPI → AVScreenCaptureService → 引擎

### 错误码 (Native C API)

定义源文件: `interfaces/inner_api/native/native_avscreen_capture_errors.h`

| 错误码 | 内部码 | 消息 | 说明 |
|--------|--------|------|------|
| 0 | AV_SCREEN_CAPTURE_ERR_OK | Success | 操作成功 |
| 1 | AV_SCREEN_CAPTURE_ERR_NO_MEMORY | No Memory | 内存不足 |
| 2 | AV_SCREEN_CAPTURE_ERR_OPERATE_NOT_PERMIT | Operate Not Permit | 操作不被允许 |
| 3 | AV_SCREEN_CAPTURE_ERR_INVALID_VAL | Invalid Value | 参数无效 |
| 4 | AV_SCREEN_CAPTURE_ERR_IO | IO Error | IO 错误 |
| 5 | AV_SCREEN_CAPTURE_ERR_TIMEOUT | Timeout | 操作超时 |
| 6 | AV_SCREEN_CAPTURE_ERR_UNKNOWN | Unknown Error | 未知错误 |
| 7 | AV_SCREEN_CAPTURE_ERR_SERVICE_DIED | Service Died | 服务死亡 |
| 8 | AV_SCREEN_CAPTURE_ERR_INVALID_STATE | Invalid State | 状态无效 |
| 9 | AV_SCREEN_CAPTURE_ERR_UNSUPPORT | Unsupport | 不支持 |

---

## SoundPool 接口

短音效播放池。

**声明**: `api/interface_sdk-js/api/@ohos.multimedia.media.d.ts` → `multimedia/soundPool`
**实现链路**: NAPI (`frameworks/js/soundpool/`) → SoundPool Service

### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| load | `(url: string): Promise<number>` | 加载音效，返回 soundID |
| load | `(fd: number, offset: number, length: number): Promise<number>` | 通过 FD 加载 |
| play | `(soundID: number, params?: PlayParameters): Promise<number>` | 播放，返回 streamID |
| stop | `(streamID: number): Promise<void>` | 停止指定流 |
| release | `(): Promise<void>` | 释放资源 |
| setVolume | `(streamID: number, leftVolume: number, rightVolume: number): Promise<void>` | 设置音量 |
| setLoop | `(streamID: number, loop: number): Promise<void>` | 设置循环次数 |
| setPriority | `(streamID: number, priority: number): Promise<void>` | 设置优先级 |
| setRate | `(streamID: number, rate: number): Promise<void>` | 设置播放速率 |

---

## AVTranscoder 接口

音视频转码器。

**声明**: `api/interface_sdk-js/api/@ohos.multimedia.media.d.ts`
**实现链路**: NAPI (`frameworks/js/avtranscoder/`) → `HiTranscoderImpl`

### 方法

| 方法 | 说明 |
|------|------|
| prepare(config) | 配置并准备转码 |
| start() | 开始转码 |
| pause() | 暂停转码 |
| resume() | 恢复转码 |
| stop() | 停止转码 |
| release() | 释放资源 |

---

## AVMetadataExtractor 接口

元数据提取器。

**声明**: `api/interface_sdk-js/api/@ohos.multimedia.media.d.ts`
**实现链路**: NAPI (`frameworks/js/metadatahelper/`) → `AVMetadataHelperImpl`

### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| fdSrcSet | `(fdSrc: AVFileDescriptor): void` | 设置文件描述符源 |
| fetchResult | `(): Promise<AVMetadata>` | 提取元数据 |
| release | `(): Promise<void>` | 释放资源 |

### AVMetadata 常用字段

| 键 | 类型 | 说明 |
|----|------|------|
| AV_METADATA_ALBUM | string | 专辑名 |
| AV_METADATA_ARTIST | string | 艺术家 |
| AV_METADATA_DURATION | string | 时长(ms) |
| AV_METADATA_TITLE | string | 标题 |
| AV_METADATA_AUTHOR | string | 作者 |
| AV_METADATA_MIME_TYPE | string | MIME 类型 |
| AV_METADATA_WIDTH | string | 视频宽度 |
| AV_METADATA_HEIGHT | string | 视频高度 |

---

## AVImageGenerator 接口

视频缩略图提取器。

**实现链路**: NAPI (`frameworks/js/metadatahelper/avimagegenerator_napi.cpp`)

### 方法

| 方法 | 说明 |
|------|------|
| fetchFrameByTime(timeMs, options) | 获取指定时间点的视频帧 |

---

## MediaSource 接口

流媒体源，用于预下载和多码率场景。

**声明**: `api/interface_sdk-js/api/@ohos.multimedia.media.d.ts`
**实现**: `frameworks/js/mediasource/media_source_napi.cpp`

### 创建方式

```typescript
// 从 URL 创建（支持 HLS/FLV/DASH）
const mediaSource = media.createMediaSourceWithUrl(url, headers);

// 从多码率流创建
const mediaSource = media.createMediaSourceWithStreamData(streams);
```

### 与 AVPlayer 配合使用

```typescript
const mediaSource = media.createMediaSourceWithUrl(url);
avPlayer.setMediaSource(mediaSource, {
  preferredWidth: 1920,
  preferredHeight: 1080,
  preferredBufferDuration: 5,
  preferredHdr: false,
});
```

---

## C API 参考 (OH_AVPlayer_*)

面向 Native C/C++ 开发者的播放器接口。

**头文件**: `api/interface_sdk_c/multimedia/player_framework/avplayer.h`
**实现**: `frameworks/native/capi/player/native_avplayer.cpp` (117KB)
**链接库**: `libavplayer.so`

### 创建与销毁

| 函数 | 签名 | 说明 |
|------|------|------|
| OH_AVPlayer_Create | `OH_AVPlayer* Create(void)` | 创建播放器 |
| OH_AVPlayer_Release | `OH_AVErrCode Release(OH_AVPlayer*)` | 释放播放器 |

### 数据源设置

| 函数 | 签名 | 说明 |
|------|------|------|
| OH_AVPlayer_SetURLSource | `OH_AVErrCode SetURLSource(OH_AVPlayer*, const char* url)` | 设置 URL 源 |
| OH_AVPlayer_SetFDSource | `OH_AVErrCode SetFDSource(OH_AVPlayer*, int32_t fd, int64_t offset, int64_t size)` | 设置 FD 源 |
| OH_AVPlayer_SetMediaSource | `OH_AVErrCode SetMediaSource(OH_AVPlayer*, OH_AVMemory* source)` | 设置 MediaSource |

### 播放控制

| 函数 | 签名 | 说明 |
|------|------|------|
| OH_AVPlayer_Prepare | `OH_AVErrCode Prepare(OH_AVPlayer*)` | 准备 |
| OH_AVPlayer_Play | `OH_AVErrCode Play(OH_AVPlayer*)` | 播放 |
| OH_AVPlayer_Pause | `OH_AVErrCode Pause(OH_AVPlayer*)` | 暂停 |
| OH_AVPlayer_Stop | `OH_AVErrCode Stop(OH_AVPlayer*)` | 停止 |
| OH_AVPlayer_Seek | `OH_AVErrCode Seek(OH_AVPlayer*, int32_t mSeconds, AVPlayerSeekMode mode)` | 跳转 |
| OH_AVPlayer_Reset | `OH_AVErrCode Reset(OH_AVPlayer*)` | 重置 |

### 属性设置

| 函数 | 签名 | 说明 |
|------|------|------|
| OH_AVPlayer_SetVolume | `OH_AVErrCode SetVolume(OH_AVPlayer*, float leftVol, float rightVol)` | 设置音量 |
| OH_AVPlayer_SetSpeed | `OH_AVErrCode SetSpeed(OH_AVPlayer*, AVPlayerPlaybackSpeed speed)` | 设置速度 |
| OH_AVPlayer_SetLooping | `OH_AVErrCode SetLooping(OH_AVPlayer*, bool loop)` | 设置循环 |
| OH_AVPlayer_SetSurfaceID | `OH_AVErrCode SetSurfaceID(OH_AVPlayer*, const char* surfaceId)` | 设置 Surface |
| OH_AVPlayer_SelectBitrate | `OH_AVErrCode SelectBitrate(OH_AVPlayer*, uint32_t bitrate)` | 选择码率 |

### 返回值

| 返回码 | 说明 |
|--------|------|
| AV_ERR_OK (0) | 成功 |
| AV_ERR_INVALID_VAL | 参数无效（player 为 null 或操作失败） |

---

## 通用错误码 (API9)

所有 JS/TS 接口统一使用以下错误码体系。

**定义源文件**: `frameworks/native/common/media_errors.cpp`

| 错误码 | 内部码 | 消息 | 说明 |
|--------|--------|------|------|
| 5400101 | MSERR_EXT_API9_NO_PERMISSION | No Permission | 缺少媒体权限或内存不足 |
| 5400102 | MSERR_EXT_API9_INVALID_PARAMETER | Invalid Parameter | 参数不合法或操作不被允许 |
| 5400103 | MSERR_EXT_API9_IO | IO Error | 文件读写/网络 IO 异常 |
| 5400104 | MSERR_EXT_API9_TIMEOUT | Network Timeout | 网络超时 |
| 5400105 | MSERR_EXT_API9_SERVICE_DIED | Service Died | 媒体服务进程死亡 |
| 5400106 | MSERR_EXT_API9_UNSUPPORT_FORMAT | Unsupported Format | 不支持的编码/容器/协议格式 |
| 5400107 | MSERR_EXT_API9_AUDIO_INTERRUPTED | Audio Interrupted | 音频被中断（焦点被抢占） |

### 网络 IO 细化错误码 (API14+)

| 错误码 | 内部码 | 消息 | 说明 |
|--------|--------|------|------|
| 5411001 | MSERR_EXT_API14_IO_CANNOT_FIND_HOST | IO Cannot Find Host | DNS 解析失败/主机不可达 |
| 5411002 | MSERR_EXT_API14_IO_CONNECTION_TIMEOUT | IO Connection Timeout | TCP 连接超时 |
| 5411003 | MSERR_EXT_API14_IO_NETWORK_ABNORMAL | IO Network Abnormal | 网络传输异常 |
| 5411004 | MSERR_EXT_API14_IO_NETWORK_UNAVAILABLE | IO Network Unavailable | 无可用网络连接 |
| 5411005 | MSERR_EXT_API14_IO_NO_PERMISSION | IO No Permission | 网络资源访问权限不足 |
| 5411006 | MSERR_EXT_API14_IO_NETWORK_ACCESS_DENIED | IO Network Access Denied | 网络访问被拒绝 |
| 5411007 | MSERR_EXT_API14_IO_RESOURE_NOT_FOUND | IO Resource Not Found | 资源不存在 (HTTP 404) |
| 5411008 | MSERR_EXT_API14_IO_SSL_CLIENT_CERT_NEEDED | IO SSL Client Cert Needed | 需要客户端证书 |
| 5411009 | MSERR_EXT_API14_IO_SSL_CONNECT_FAIL | IO SSL Connect Fail | SSL 连接失败 |
| 5411010 | MSERR_EXT_API14_IO_SSL_SERVER_CERT_UNTRUSTED | IO SSL Server Cert Untrusted | 服务器证书不可信 |
| 5411011 | MSERR_EXT_API14_IO_UNSUPPORTTED_REQUEST | IO Unsupported Request | 不支持的请求 |

### 播放器专用错误码 (API16+)

| 错误码 | 内部码 | 消息 | 说明 |
|--------|--------|------|------|
| 5410002 | MSERR_EXT_API16_SEEK_CONTINUOUS_UNSUPPORTED | Seek Continuous Unsupported | 不支持连续 Seek |
| 5410003 | MSERR_EXT_API16_SUPER_RESOLUTION_UNSUPPORTED | Super Resolution Unsupported | 不支持超分辨率 |
| 5410004 | MSERR_EXT_API16_SUPER_RESOLUTION_NOT_ENABLED | Super Resolution Not Enabled | 超分辨率未启用 |

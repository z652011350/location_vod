# multimedia_player_framework 故障排查指南

本文档按错误码分组，提供 multimedia_player_framework 模块的常见错误场景、排查思路和典型修复方案。

## 错误码体系

multimedia_player_framework 使用分层错误码体系:

- **API9 错误码** (5400101 ~ 5400107): 面向应用层的通用错误码
- **API14 网络 IO 细化码** (5411001 ~ 5411011): 网络相关的详细错误
- **API16 播放器专用码** (5410002 ~ 5410004): 播放器特有能力相关错误
- **AVScreenCapture 错误码** (0 ~ 9): 屏幕录制专用错误

所有错误码定义在 `frameworks/native/common/media_errors.cpp`（API9/API14/API16）和 `interfaces/inner_api/native/native_avscreen_capture_errors.h`（AVScreenCapture）。

---

## 5400101 — No Permission / No Memory

### 错误描述

应用缺少必要的媒体权限，或系统内存不足无法创建媒体实例。由内部码 `MSERR_USER_NO_PERMISSION` 或内存分配失败映射而来。

### 常见场景

1. **未声明权限**: 应用未在 `module.json5` 中声明 `ohos.permission.READ_MEDIA` 或相关权限
2. **用户未授权**: 声明了权限但用户拒绝了授权
3. **内存不足**: 系统内存紧张，无法分配播放器/录制器资源
4. **实例数超限**: 单应用创建了超过 16 个 AVPlayer 实例

### 排查步骤

1. 检查 `module.json5` 中是否声明了所需权限:
   ```json5
   {
     "requestPermissions": [
       { "name": "ohos.permission.INTERNET" },
       { "name": "ohos.permission.READ_MEDIA" }
     ]
   }
   ```
2. 检查应用是否在运行时请求了用户授权
3. 检查设备内存使用情况，是否有过多的媒体实例同时存在
4. 确认 AVPlayer 实例是否在不用时正确调用了 `release()`

### 修复方案

```typescript
// 确保 release 旧实例后再创建新实例
if (this.avPlayer) {
  await this.avPlayer.release();
  this.avPlayer = null;
}
this.avPlayer = await media.createAVPlayer();
```

---

## 5400102 — Invalid Parameter

### 错误描述

传入的参数不合法或操作不被允许。由内部码 `MSERR_INVALID_VAL` 或 `MSERR_INVALID_OPERATION` 映射而来。

### 常见场景

1. **状态不匹配**: 在错误状态下调用 API（如在 `idle` 状态调用 `play()`）
2. **参数类型错误**: URL 不是 string 类型，seek 位置为负数
3. **Seek 位置越界**: seek 目标超出媒体时长范围
4. **Surface ID 无效**: surfaceId 为空字符串或无效值
5. **空对象**: 传入 null/undefined 给必填参数

### 排查步骤

1. 监听 `stateChange` 事件，确认调用 API 时的实际状态
2. 检查参数类型和取值范围
3. 查看 NAPI 层参数验证逻辑（`frameworks/js/avplayer/avplayer_napi.cpp` 中各 Js* 方法）

### 修复方案

```typescript
// 正确的状态机调用顺序
const player = await media.createAVPlayer();   // idle
player.url = "http://example.com/video.mp4";   // → initialized
await player.prepare();                         // → prepared
await player.play();                            // → playing

// 错误示例: 跳过步骤
// player.play();  // 失败! 当前还是 idle 状态
```

```typescript
// Seek 前检查参数有效性
if (timeMs >= 0 && timeMs <= player.duration) {
  await player.seek(timeMs, media.SeekMode.SEEK_PREVIOUS_SYNC);
}
```

---

## 5400103 — IO Error

### 错误描述

IO 错误，包括文件读写失败、数据源 IO 异常等。由以下内部错误码映射而来:
- `MSERR_OPEN_FILE_FAILED` — 文件打开失败
- `MSERR_FILE_ACCESS_FAILED` — 文件访问失败
- `MSERR_DATA_SOURCE_IO_ERROR` — 数据源 IO 错误

### 常见场景

1. **文件不存在**: URL 指向的本地文件不存在
2. **文件权限不足**: 应用没有读取指定文件的权限
3. **FD 无效**: fdSrc 传入的文件描述符已关闭或无效
4. **存储空间不足**: 设备存储空间已满
5. **DataSrc 回调异常**: 自定义数据源的 readAt 回调抛出异常

### 排查步骤

1. 验证文件路径是否存在:
   ```typescript
   import fs from '@ohos.file.fs';
   const exists = fs.accessSync(filePath);
   ```
2. 检查文件描述符是否有效:
   ```typescript
   // 确保 FD 在使用期间保持打开
   const fd = fs.openSync(filePath, fs.OpenMode.READ_ONLY);
   player.fdSrc = { fd: fd.fd, offset: 0, length: fileSize };
   // 不要在播放期间关闭 fd!
   ```
3. 检查存储权限声明
4. 查看系统日志中的 IO 错误详情

### 修复方案

```typescript
// 正确使用 fdSrc
const stat = fs.statSync(filePath);
const fd = fs.openSync(filePath, fs.OpenMode.READ_ONLY);
try {
  player.fdSrc = { fd: fd.fd, offset: 0, length: stat.size };
  await player.prepare();
  // ... 播放完成后释放
} finally {
  // 只在 release 后关闭 fd
  fs.closeSync(fd);
}
```

---

## 5400104 — Network Timeout

### 错误描述

网络超时错误。由 `MSERR_NETWORK_TIMEOUT` 映射而来。

### 常见场景

1. **网络连接缓慢**: 网络带宽不足，数据下载速度跟不上播放速度
2. **服务器响应慢**: 媒体服务器响应延迟高
3. **DNS 解析慢**: 域名解析耗时长

### 排查步骤

1. 检查设备网络连接状态（WiFi/移动数据）
2. 使用其他网络工具验证 URL 是否可达
3. 监听 `bufferingUpdate` 事件，观察缓冲状态
4. 检查是否是特定格式（如高码率 HLS）导致的超时

### 修复方案

```typescript
// 监听缓冲状态，给用户反馈
player.on('bufferingUpdate', (infoType, value) => {
  if (infoType === media.BufferingInfoType.BUFFERING_START) {
    console.info('开始缓冲...');
    // 显示加载动画
  } else if (infoType === media.BufferingInfoType.BUFFERING_END) {
    console.info('缓冲结束');
    // 隐藏加载动画
  } else if (infoType === media.BufferingInfoType.BUFFERING_PERCENT) {
    console.info(`缓冲进度: ${value}%`);
  }
});
```

---

## 5400105 — Service Died

### 错误描述

媒体服务死亡。由 `MSERR_SERVICE_DIED` 映射而来。媒体服务进程（`media_service`）崩溃或被系统杀死。

### 常见场景

1. **系统 OOM**: 系统内存不足，LMK 杀死了媒体服务
2. **服务内部异常**: 服务进程遇到未处理的崩溃
3. **系统更新**: 系统升级导致服务重启

### 排查步骤

1. 查看系统日志 (`hilog`) 中的媒体服务崩溃信息
2. 搜索关键字: `PlayerServer`, `MediaServer`, `CRASH`, `Fatal`
3. 检查设备内存使用情况
4. 查看服务 Dfx 日志: `services/dfx/` 下的 dump 信息

### 修复方案

```typescript
// 监听 error 事件，检测服务死亡
player.on('error', (err) => {
  if (err.code === 5400105) {
    console.error('媒体服务死亡，需要重建播放器');
    // 清理旧实例（可能已无效）
    // 等待一段时间后重新创建
    setTimeout(async () => {
      this.avPlayer = await media.createAVPlayer();
      // 重新设置数据源和状态
    }, 2000);
  }
});
```

---

## 5400106 — Unsupported Format

### 错误描述

不支持的格式。由多个内部错误码映射而来:
- `MSERR_UNSUPPORT_AUD_SRC_TYPE` — 不支持的音频源类型
- `MSERR_UNSUPPORT_AUD_ENC_TYPE` / `MSERR_UNSUPPORT_AUD_DEC_TYPE` — 不支持的音频编解码
- `MSERR_UNSUPPORT_VID_ENC_TYPE` / `MSERR_UNSUPPORT_VID_DEC_TYPE` — 不支持的视频编解码
- `MSERR_UNSUPPORT_CONTAINER_TYPE` — 不支持的容器格式
- `MSERR_UNSUPPORT_PROTOCOL_TYPE` — 不支持的协议
- `MSERR_UNSUPPORT_STREAM` — 不支持的流
- `MSERR_UNSUPPORT_FILE` — 不支持的文件
- `MSERR_UNSUPPORT_SOURCE` — 不支持的源

### 常见场景

1. **编码格式不支持**: 视频使用了设备不支持的编码（如某些 HEVC 10bit 或 AV1）
2. **容器格式不支持**: 如 FLV、RMVB 等不支持的容器
3. **协议不支持**: 如 RTMP、RTSP 等实时流协议
4. **HLS 高级特性**: 某些 HLS 高级特性（如 fMP4 分片）可能不支持

### 排查步骤

1. 确认媒体文件的编码格式信息:
   ```typescript
   // 使用 AVMetadataExtractor 获取格式信息
   const extractor = media.createAVMetadataExtractor();
   extractor.fdSrc = { fd: fd.fd, offset: 0, length: size };
   const metadata = await extractor.fetchResult();
   ```
2. 检查设备支持的编解码列表（通过 `mediaquery` 或系统能力查询）
3. 查看引擎层日志中具体的解析错误

### 修复方案

- 使用设备支持的编码格式转码媒体文件
- 对于视频: 优先使用 H.264 (AVC) 编码
- 对于音频: 优先使用 AAC 编码
- 容器格式优先使用 MP4

---

## 5400107 — Audio Interrupted

### 错误描述

音频被中断。由 `MSERR_AUD_INTERRUPT` 映射而来。其他音频应用（如电话、闹钟、其他播放器）抢占音频焦点。

### 常见场景

1. **来电**: 电话应用抢占音频焦点
2. **闹钟**: 闹钟响铃时中断
3. **其他播放器**: 另一个应用开始播放音频
4. **系统提示音**: 系统通知音暂时中断

### 排查步骤

1. 监听 `audioInterrupt` 事件确认中断类型
2. 检查 `InterruptEvent` 中的 `forceType` 和 `hintType`

### 修复方案

```typescript
import audio from '@ohos.multimedia.audio';

player.on('audioInterrupt', (event) => {
  if (event.forceType === audio.InterruptForceType.INTERRUPT_FORCE) {
    // 系统强制中断，播放器已被自动暂停
    console.info('音频被强制中断');
  } else {
    // 可选中断，应用自行决定是否暂停
    if (event.hintType === audio.InterruptHint.INTERRUPT_HINT_PAUSE) {
      player.pause();
    }
  }

  // 监听恢复信号
  if (event.hintType === audio.InterruptHint.INTERRUPT_HINT_RESUME) {
    player.play();
  }
});
```

---

## 5410002 — Seek Continuous Unsupported

### 错误描述

不支持连续 Seek 操作。由 `MSERR_SEEK_CONTINUOUS_UNSUPPORTED` 映射而来。

### 常见场景

1. 当前媒体格式或引擎不支持 SeekContinuous 能力
2. 在不支持拖拽的场景下调用了 seekContinuous

### 排查步骤

1. 调用 `isSeekContinuousSupported()` 检查是否支持
2. 确认当前播放状态和媒体格式

### 修复方案

```typescript
// 使用标准的 seek 替代连续 seek
// 等待 seekDone 后再发起下一次 seek
player.on('seekDone', (position) => {
  if (this.pendingSeekPos >= 0) {
    player.seek(this.pendingSeekPos);
    this.pendingSeekPos = -1;
  }
});
```

---

## 5410003 / 5410004 — Super Resolution 错误

### 错误描述

- `5410003`: 设备或视频格式不支持超分辨率能力
- `5410004`: 设备支持但未启用超分辨率功能

### 排查步骤

1. 确认设备芯片是否支持超分辨率后处理
2. 检查是否在 `AVPlayStrategy` 中设置了 `enableSuperResolution: true`
3. 超分能力需在 `prepare()` 之前设置

---

## 网络错误码 (5411001 ~ 5411011)

### 5411001 — IO Cannot Find Host

**现象**: DNS 解析失败或目标主机不可达。

**排查**:
1. 确认 URL 中的域名拼写正确
2. 检查设备 DNS 配置
3. 尝试 `ping` 域名验证可达性

### 5411002 — IO Connection Timeout

**现象**: TCP 连接建立超时。

**排查**:
1. 检查网络连通性
2. 确认媒体服务器是否正常运行
3. 检查防火墙/代理设置

### 5411003 — IO Network Abnormal

**现象**: 传输过程中出现网络错误（连接重置、丢包等）。

**排查**:
1. 检查网络稳定性
2. 查看 `bufferingUpdate` 事件判断缓冲状态
3. 考虑降低码率

### 5411004 — IO Network Unavailable

**现象**: 设备无可用网络连接。

**排查**:
1. 检查飞行模式是否开启
2. 确认 WiFi/移动数据是否连接

### 5411005 — IO No Permission

**现象**: 访问网络资源被服务器拒绝（HTTP 403）。

**排查**:
1. 检查 URL 是否需要认证
2. 使用 `createMediaSourceWithUrl()` 传入认证 headers
3. 确认服务器访问策略

### 5411007 — IO Resource Not Found

**现象**: 媒体资源不存在（HTTP 404）。

**排查**:
1. 确认 URL 是否正确
2. 检查资源是否已被删除或迁移
3. 如果是 HLS，检查 m3u8 中引用的分片是否都存在

### 5411009 — IO SSL Connect Fail

**现象**: TLS 握手失败。

**排查**:
1. 检查 TLS 版本兼容性
2. 确认服务器证书配置
3. 查看是否需要客户端证书

---

## AVScreenCapture 错误码

定义在 `interfaces/inner_api/native/native_avscreen_capture_errors.h`。

### 错误码 2 — Operate Not Permit

**现象**: 操作不被允许。

**排查**:
1. 确认应用是否持有 `ohos.permission.CAPTURE_SCREEN` 权限
2. 该权限为系统级权限，仅系统应用可获取
3. 检查是否在错误状态下调用了 start/stop

### 错误码 7 — Service Died

**现象**: 屏幕录制服务进程崩溃。

**排查**:
1. 查看系统日志中的崩溃栈
2. 检查系统内存状态
3. 重新创建实例并重试

### 错误码 8 — Invalid State

**现象**: 在错误的状态下调用了操作。

**排查**:
1. AVScreenCapture 也有状态机，确认当前状态
2. 参考 `stopped → prepared → started → stopped` 的状态流转

---

## 通用排查方法

### 1. 状态机检查

最常见的错误原因是在错误的状态下调用了 API。所有 PlayerServer 操作都通过 TaskQueue 异步执行，并在内部进行状态校验。

源文件: `services/services/player/server/player_server.cpp` (各状态类的 OnMessageReceived 方法)

**正确的 AVPlayer 状态流转**:

```
idle ──(setUrl/fdSrc/dataSrc)──→ initialized ──(prepare)──→ prepared
                                                              │
                                              ┌───(play)──────┤
                                              │               │
                                              ▼               │
                                           playing ◄───(play)─┤
                                              │               │
                                        ┌─(pause)─┐          │
                                        ▼         │          │
                                      paused ──(play)         │
                                        │                     │
                                        └─(stop)──→ stopped ←─┘
                                                      │
                                                 (reset)→ idle
                                                      │
                                                 (release)→ released
```

### 2. 日志收集

**系统日志** (hilog):
```bash
# 过滤媒体模块日志
hilog | grep -E "Player|Media|HiPlayer"

# 过滤特定播放器实例日志
hilog | grep "PlayerServer"
```

**DFX 诊断报告**:
- DfxAgent (`services/engine/histreamer/player/dfx_agent.cpp`) 自动收集性能数据
- 包括: 首帧延迟、卡顿次数/时长、Seek 延迟等

**服务 Dump**:
```bash
# dump 媒体服务信息
hidumper -s 1011
```

### 3. 内存泄漏排查

常见内存泄漏场景:
1. **未 release 播放器**: 页面退出时未调用 `release()`
2. **事件监听未移除**: `on()` 注册但未 `off()` 移除
3. **循环引用**: 回调函数中持有播放器引用

```typescript
// 正确的清理流程
async cleanup() {
  if (this.player) {
    this.player.off('stateChange');
    this.player.off('error');
    this.player.off('seekDone');
    this.player.off('timeUpdate');
    this.player.off('audioInterrupt');
    this.player.off('bufferingUpdate');
    this.player.off('endOfStream');
    this.player.off('videoSizeChange');
    this.player.off('volumeChange');
    this.player.off('speedDone');
    await this.player.release();
    this.player = null;
  }
}
```

### 4. 播放器创建失败

如果 `createAVPlayer()` 抛出 5400101 错误:
1. 确认当前已有实例数是否超过 16 个
2. 检查系统内存状态
3. 检查媒体服务是否运行正常:
   ```bash
   ps -ef | grep media_service
   ```
4. 如果媒体服务未运行，可能是系统启动异常

### 5. 视频渲染问题

视频有声音无画面:
1. 确认是否设置了 `surfaceId`
2. 确认 XComponent 已正确初始化
3. 确认 Surface 在播放期间未被销毁

```typescript
// XComponent 与 AVPlayer 的正确绑定
XComponent({
  id: 'videoPlayer',
  type: 'surface',
  controller: this.xComponentController
})
  .onLoad(() => {
    // 在 XComponent 加载完成后再设置 surfaceId
    this.player.surfaceId = this.xComponentController.getXComponentSurfaceId();
  })
```

### 6. DRM 内容播放

DRM 保护内容播放失败:
1. 确认设备是否支持对应 DRM 方案（如 Widevine）
2. 监听 `mediaKeySystemInfoUpdate` 事件获取 DRM 信息
3. 检查 `SetDecryptConfig` 是否在 `prepared` 状态前调用
4. 源文件: `services/engine/histreamer/player/hiplayer_impl.cpp` 中的 DRM 相关方法

---

## 常见问题 FAQ

### Q: prepare() 一直不回调 stateChange 到 prepared

**可能原因**:
1. 网络流下载缓慢，缓冲未完成
2. 媒体格式解析异常
3. 状态机阻塞（前面有未完成的操作）

**排查**: 监听 `bufferingUpdate` 确认缓冲进度；查看日志确认 HiPlayerImpl 是否收到事件。

### Q: seek() 后 seekDone 回调延迟很大

**可能原因**:
1. Seek 目标位置附近没有关键帧，需要解码大量帧
2. 使用了 `SEEK_CLOSEST` 模式（最慢但最精确）
3. SeekAgent 等待音视频目标帧同步到达

**优化**: 使用 `SEEK_PREVIOUS_SYNC` 或 `SEEK_NEXT_SYNC` 模式，比 `SEEK_CLOSEST` 快。

### Q: 播放一段时间后自动停止

**可能原因**:
1. 音频焦点被抢占（检查 `audioInterrupt` 事件）
2. 网络流断连（检查 `bufferingUpdate` 事件）
3. 系统冻结（检查 `PLAYER_FROZEN` 状态）

### Q: release() 调用后应用卡住

**可能原因**:
1. release 是异步操作，内部需要等待引擎完全停止
2. 如果在 `playing` 状态直接 release，需要先停止 Pipeline

**优化**: 先 `stop()` 再 `release()`；或使用 `release()` 的 Promise 等待完成。

### Q: HLS 流播放失败但直接 URL 可以

**可能原因**:
1. m3u8 文件格式问题
2. 分片编码格式不支持
3. 需要 DRM 但未配置
4. `MSERR_UNSUPPORT_PROTOCOL_TYPE` — 协议不支持

**排查**: 用工具检查 m3u8 文件内容是否合法。

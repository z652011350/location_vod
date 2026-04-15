# multimedia_player_framework

## 模块职责

multimedia_player_framework 是鸿蒙多媒体框架的核心组件，提供音视频播放、录制、转码、录屏、元数据提取、音效池等能力。作为 OpenHarmony 标准媒体子系统（subsystem: multimedia）的一部分，该模块通过 NAPI/CAPI 向应用层暴露 JS/C 接口，内部采用 Client-Server 架构，通过 IPC 与媒体服务进程通信，底层使用 HiStreamer 流水线引擎执行实际的编解码和媒体处理。

**核心功能**:
- **AVPlayer** (API9+): 统一音视频播放器，支持本地/网络/流式源，含 DRM、字幕、超分辨率等高级特性
- **AVRecorder** (API9+): 统一音视频录制器，支持音频/视频/元数据多路录制
- **AVTranscoder** (API9+): 音视频转码，支持编解码格式转换和分辨率调整
- **AVScreenCaptureRecorder**: 屏幕录制（含音频采集）
- **SoundPool**: 短音效播放池，适用于游戏音效等场景
- **AVMetadataExtractor / AVImageGenerator**: 媒体元数据提取和视频帧缩略图生成
- **MediaSource**: 自定义媒体数据源，支持 URL 和流式数据加载
- **ScreenCaptureMonitor**: 监听系统录屏状态

**已废弃接口** (API6-8): AudioPlayer、VideoPlayer、AudioRecorder、VideoRecorder（API9 起由 AVPlayer/AVRecorder 替代）

## 目录结构

```
multimedia_player_framework/
├── interfaces/                    # 外部接口层
│   ├── kits/
│   │   ├── js/                    # 旧版 NAPI 入口头文件（声明模块导出）
│   │   └── c/                     # C API 头文件（avplayer.h, avrecorder.h 等）
│   └── inner_api/native/          # 内部 C++ 接口（player.h, recorder.h 等）
├── frameworks/                    # 框架实现层
│   ├── js/                        # NAPI 桥接层（各组件 *_napi.cpp）
│   │   ├── avplayer/              # AVPlayer NAPI 实现
│   │   ├── avrecorder/            # AVRecorder NAPI 实现
│   │   ├── avscreen_capture/      # AVScreenCapture NAPI 实现
│   │   ├── avtranscoder/          # AVTranscoder NAPI 实现
│   │   ├── soundpool/             # SoundPool NAPI 实现
│   │   ├── mediasource/           # MediaSource NAPI 实现
│   │   ├── metadatahelper/        # AVMetadataExtractor / AVImageGenerator NAPI 实现
│   │   ├── player/                # 旧版 AudioPlayer / VideoPlayer NAPI 实现
│   │   ├── recorder/              # 旧版 AudioRecorder / VideoRecorder NAPI 实现
│   │   └── media/                 # 模块注册入口 + 枚举导出
│   ├── native/                    # Native 框架层
│   │   ├── player/                # Player 客户端实现
│   │   ├── recorder/              # Recorder 客户端实现
│   │   ├── screen_capture/        # ScreenCapture 客户端实现
│   │   ├── soundpool/             # SoundPool 客户端实现
│   │   ├── transcoder/            # Transcoder 客户端实现
│   │   ├── capi/                  # C API 实现
│   │   └── common/                # 公共工具（含 media_errors.cpp 错误码映射）
│   └── taihe/                     # Taihe 架构（新一代框架封装层）
├── services/                      # 服务层（C/S 架构的 Server 端）
│   ├── services/
│   │   ├── sa_media/              # 媒体主服务（System Ability 注册）
│   │   ├── player/                # PlayerServer + IPC
│   │   ├── recorder/              # RecorderServer + IPC
│   │   ├── transcoder/            # TransCoderServer + IPC
│   │   ├── avmetadatahelper/      # AVMetadataHelperServer + IPC
│   │   ├── monitor/               # MonitorServer（运行时监控）
│   │   ├── media_source/          # MediaSourceServer
│   │   └── common/                # 公共服务组件
│   ├── engine/histreamer/         # HiStreamer 引擎层（流水线架构）
│   │   ├── player/                # HiPlayerImpl（播放引擎）
│   │   ├── recorder/              # HiRecorderImpl（录制引擎）
│   │   ├── transcoder/            # HiTransCoderImpl（转码引擎）
│   │   ├── avmetadatahelper/      # 元数据引擎
│   │   └── factory/               # 引擎工厂
│   ├── include/                   # 服务接口定义
│   ├── utils/                     # 服务工具类
│   └── dfx/                       # DFX（诊断/可靠性）
└── test/                          # 测试代码（单元测试 + 模糊测试）
```

## 核心文件

### NAPI 桥接层
- `frameworks/js/media/native_module_ohos_media.cpp` — 模块注册入口，导出所有 NAPI 函数
- `frameworks/js/avplayer/avplayer_napi.cpp` — AVPlayer NAPI 实现（46 个实例 API）
- `frameworks/js/avrecorder/avrecorder_napi.cpp` — AVRecorder NAPI 实现（25 个实例 API）
- `frameworks/js/avscreen_capture/avscreen_capture_napi.cpp` — AVScreenCapture NAPI 实现
- `frameworks/js/avtranscoder/avtranscoder_napi.cpp` — AVTranscoder NAPI 实现
- `frameworks/js/soundpool/src/soundpool_napi.cpp` — SoundPool NAPI 实现
- `frameworks/js/mediasource/media_source_napi.cpp` — MediaSource NAPI 实现
- `frameworks/js/metadatahelper/avmetadataextractor_napi.cpp` — AVMetadataExtractor NAPI 实现
- `frameworks/js/metadatahelper/avimagegenerator_napi.cpp` — AVImageGenerator NAPI 实现

### 服务层
- `services/services/sa_media/server/media_server.cpp` — 媒体主服务 System Ability 入口
- `services/services/sa_media/server_manager/media_server_manager.h` — 服务管理器，管理所有 IPC stub
- `services/services/player/server/player_server.h` — 播放器服务端（状态机驱动）
- `services/services/recorder/server/recorder_server.h` — 录制器服务端
- `services/services/transcoder/server/transcoder_server.h` — 转码器服务端

### 引擎层
- `services/engine/histreamer/player/hiplayer_impl.h` — HiStreamer 播放引擎（Pipeline 架构：Demuxer → Decoder → Sink）
- `services/engine/histreamer/recorder/hirecorder_impl.h` — HiStreamer 录制引擎
- `services/engine/histreamer/transcoder/hitranscoder_impl.h` — HiStreamer 转码引擎
- `services/services/engine_intf/i_engine_factory.h` — 引擎工厂接口（支持多引擎竞争选择）

### 接口与错误码
- `interfaces/inner_api/native/player.h` — Player 内部接口
- `interfaces/inner_api/native/recorder.h` — Recorder 内部接口
- `frameworks/native/common/media_errors.cpp` — 完整错误码名称-描述映射
- `interfaces/kits/c/native_avscreen_capture_errors.h` — 录屏 C API 错误码枚举

### SDK API 声明
- `api/interface_sdk-js/api/@ohos.multimedia.media.d.ts` — 主 API 声明文件（含 AVErrorCode 枚举和所有接口）
- `api/interface_sdk-js/api/multimedia/soundPool.d.ts` — SoundPool 专用 API 声明

## 架构概要

```
应用层 (JS/TS)                    NAPI 桥接层                     服务层 (SA)                    引擎层 (HiStreamer)
┌──────────────┐    ┌──────────────────────────┐    ┌───────────────────────────┐    ┌─────────────────────────┐
│ media.       │───►│ AVPlayerNapi             │───►│ PlayerServer              │───►│ HiPlayerImpl            │
│ createAVPlayer│    │ AVRecorderNapi           │    │ RecorderServer            │    │ HiRecorderImpl          │
│ media.       │    │ AVScreenCaptureNapi      │    │ TransCoderServer          │    │ HiTransCoderImpl        │
│ createAVRecorder   │ AVTransCoderNapi        │    │ ScreenCaptureServer       │    │ (Pipeline Filters)      │
│ ...          │    │ SoundPoolNapi            │    │                           │    │  - DemuxerFilter        │
└──────────────┘    │ MediaSourceNapi          │    │  状态机驱动               │    │  - AudioDecoderFilter   │
                    │ AVMetadataExtractorNapi  │    │  IPC Client ←→ Stub      │    │  - AudioSinkFilter      │
                    │ AVImageGeneratorNapi     │    │  TaskQueue 串行化         │    │  - SurfaceEncoderFilter │
                    └──────────────────────────┘    └───────────────────────────┘    │  - MuxerFilter          │
                                                                                       └─────────────────────────┘
```

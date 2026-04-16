# multimedia_av_codec 模块 API 参考手册

本文档列出模块暴露的所有公开 C API 接口，按子系统分组。

## 通用说明

- 所有接口返回 `OH_AVErrCode` 类型的错误码，定义于 `native_averrors.h`（SDK 公开头文件）
- 参数中的 `OH_AVCodec *codec` 为编解码器实例句柄
- 参数中的 `OH_AVFormat *format` 为媒体描述格式句柄
- 源文件路径前缀: `interfaces/kits/c/`

---

## 1. Audio Decoder（音频解码器）

**头文件**: `interfaces/kits/c/native_avcodec_audiodecoder.h`
**动态库**: `libnative_media_adec.so`
**系统能力**: `SystemCapability.Multimedia.Media.AudioDecoder`
**状态**: deprecated since 11，推荐使用 OH_AudioCodec_*

| 接口 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `OH_AudioDecoder_CreateByMime` | `const char *mime` | `OH_AVCodec *` | 根据 MIME 类型创建音频解码器实例 |
| `OH_AudioDecoder_CreateByName` | `const char *name` | `OH_AVCodec *` | 根据解码器名称创建实例 |
| `OH_AudioDecoder_Destroy` | `OH_AVCodec *codec` | `OH_AVErrCode` | 销毁解码器实例并释放资源 |
| `OH_AudioDecoder_SetCallback` | `OH_AVCodec *codec`, `OH_AVCodecAsyncCallback callback`, `void *userData` | `OH_AVErrCode` | 设置异步回调（需在 Prepare 前调用） |
| `OH_AudioDecoder_Configure` | `OH_AVCodec *codec`, `OH_AVFormat *format` | `OH_AVErrCode` | 配置解码参数（需在 Prepare 前调用） |
| `OH_AudioDecoder_Prepare` | `OH_AVCodec *codec` | `OH_AVErrCode` | 准备内部资源 |
| `OH_AudioDecoder_Start` | `OH_AVCodec *codec` | `OH_AVErrCode` | 启动解码 |
| `OH_AudioDecoder_Stop` | `OH_AVCodec *codec` | `OH_AVErrCode` | 停止解码 |
| `OH_AudioDecoder_Flush` | `OH_AVCodec *codec` | `OH_AVErrCode` | 清空缓冲数据 |
| `OH_AudioDecoder_Reset` | `OH_AVCodec *codec` | `OH_AVErrCode` | 重置解码器（需重新 Configure） |
| `OH_AudioDecoder_GetOutputDescription` | `OH_AVCodec *codec` | `OH_AVFormat *` | 获取输出格式描述 |
| `OH_AudioDecoder_SetParameter` | `OH_AVCodec *codec`, `OH_AVFormat *format` | `OH_AVErrCode` | 设置动态参数（需在 Start 后调用） |
| `OH_AudioDecoder_PushInputData` | `OH_AVCodec *codec`, `uint32_t index`, `OH_AVCodecBufferAttr attr` | `OH_AVErrCode` | 提交输入数据（deprecated since 11） |
| `OH_AudioDecoder_FreeOutputData` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVErrCode` | 释放输出缓冲区 |
| `OH_AudioDecoder_IsValid` | `OH_AVCodec *codec`, `bool *isValid` | `OH_AVErrCode` | 检查实例是否有效 |

**实现文件**: `frameworks/native/capi/avcodec/native_audio_decoder.cpp`

---

## 2. Audio Encoder（音频编码器）

**头文件**: `interfaces/kits/c/native_avcodec_audioencoder.h`
**动态库**: `libnative_media_aenc.so`
**系统能力**: `SystemCapability.Multimedia.Media.AudioEncoder`
**状态**: deprecated since 11，推荐使用 OH_AudioCodec_*

接口与 Audio Decoder 完全对称（将 Decoder 替换为 Encoder），此处不再重复列表。

**实现文件**: `frameworks/native/capi/avcodec/native_audio_encoder.cpp`

---

## 3. Video Decoder（视频解码器）

**头文件**: `interfaces/kits/c/native_avcodec_videodecoder.h`
**动态库**: `libnative_media_vdec.so`
**系统能力**: `SystemCapability.Multimedia.Media.VideoDecoder`

| 接口 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `OH_VideoDecoder_CreateByMime` | `const char *mime` | `OH_AVCodec *` | 根据 MIME 类型创建视频解码器 |
| `OH_VideoDecoder_CreateByName` | `const char *name` | `OH_AVCodec *` | 根据解码器名称创建实例 |
| `OH_VideoDecoder_Destroy` | `OH_AVCodec *codec` | `OH_AVErrCode` | 销毁实例 |
| `OH_VideoDecoder_SetCallback` | `OH_AVCodec *codec`, `OH_AVCodecAsyncCallback callback`, `void *userData` | `OH_AVErrCode` | 设置异步回调（deprecated since 11） |
| `OH_VideoDecoder_RegisterCallback` | `OH_AVCodec *codec`, `OH_AVCodecCallback callback`, `void *userData` | `OH_AVErrCode` | 设置新异步回调（since 11，推荐） |
| `OH_VideoDecoder_SetSurface` | `OH_AVCodec *codec`, `OHNativeWindow *window` | `OH_AVErrCode` | 设置输出 Surface（需在 Prepare 前调用，或在 Executing 状态调用） |
| `OH_VideoDecoder_Configure` | `OH_AVCodec *codec`, `OH_AVFormat *format` | `OH_AVErrCode` | 配置解码参数 |
| `OH_VideoDecoder_Prepare` | `OH_AVCodec *codec` | `OH_AVErrCode` | 准备资源 |
| `OH_VideoDecoder_Start` | `OH_AVCodec *codec` | `OH_AVErrCode` | 启动解码 |
| `OH_VideoDecoder_Stop` | `OH_AVCodec *codec` | `OH_AVErrCode` | 停止解码 |
| `OH_VideoDecoder_Flush` | `OH_AVCodec *codec` | `OH_AVErrCode` | 清空缓冲 |
| `OH_VideoDecoder_Reset` | `OH_AVCodec *codec` | `OH_AVErrCode` | 重置 |
| `OH_VideoDecoder_GetOutputDescription` | `OH_AVCodec *codec` | `OH_AVFormat *` | 获取输出格式 |
| `OH_VideoDecoder_SetParameter` | `OH_AVCodec *codec`, `OH_AVFormat *format` | `OH_AVErrCode` | 设置动态参数 |
| `OH_VideoDecoder_PushInputData` | `OH_AVCodec *codec`, `uint32_t index`, `OH_AVCodecBufferAttr attr` | `OH_AVErrCode` | 提交输入（deprecated since 11） |
| `OH_VideoDecoder_PushInputBuffer` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVErrCode` | 提交输入缓冲区（since 11，推荐） |
| `OH_VideoDecoder_RenderOutputData` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVErrCode` | 渲染输出并释放（deprecated since 11） |
| `OH_VideoDecoder_RenderOutputBuffer` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVErrCode` | 渲染输出并释放（since 11，推荐） |
| `OH_VideoDecoder_RenderOutputBufferAtTime` | `OH_AVCodec *codec`, `uint32_t index`, `int64_t renderTimestampNs` | `OH_AVErrCode` | 指定时间戳渲染（since 12） |
| `OH_VideoDecoder_FreeOutputData` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVErrCode` | 释放输出（deprecated since 11） |
| `OH_VideoDecoder_FreeOutputBuffer` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVErrCode` | 释放输出缓冲区（since 11，推荐） |
| `OH_VideoDecoder_IsValid` | `OH_AVCodec *codec`, `bool *isValid` | `OH_AVErrCode` | 检查有效性 |
| `OH_VideoDecoder_SetDecryptionConfig` | `OH_AVCodec *codec`, `MediaKeySession *mediaKeySession`, `bool secureVideoPath` | `OH_AVErrCode` | 设置 DRM 解密配置（since 11） |
| `OH_VideoDecoder_QueryInputBuffer` | `OH_AVCodec *codec`, `uint32_t *index`, `int64_t timeoutUs` | `OH_AVErrCode` | 查询输入缓冲区索引（since 20，同步模式） |
| `OH_VideoDecoder_GetInputBuffer` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVBuffer *` | 获取输入缓冲区句柄（since 20） |
| `OH_VideoDecoder_QueryOutputBuffer` | `OH_AVCodec *codec`, `uint32_t *index`, `int64_t timeoutUs` | `OH_AVErrCode` | 查询输出缓冲区索引（since 20，同步模式） |
| `OH_VideoDecoder_GetOutputBuffer` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVBuffer *` | 获取输出缓冲区句柄（since 20） |

**实现文件**: `frameworks/native/capi/avcodec/native_video_decoder.cpp`

### 视频解码器错误码

| 错误码 | 值 | 含义 |
|--------|------|------|
| `AV_ERR_OK` | 0 | 成功 |
| `AV_ERR_NO_MEMORY` | 1 | 内存不足或实例已销毁 |
| `AV_ERR_INVALID_VAL` | 3 | 参数无效或 codec 指针错误 |
| `AV_ERR_OPERATE_NOT_PERMIT` | 2 | 操作不被允许（内部执行错误） |
| `AV_ERR_UNKNOWN` | 6 | 未知错误 |
| `AV_ERR_INVALID_STATE` | 8 | 无效状态调用 |
| `AV_ERR_VIDEO_UNSUPPORTED_COLOR_SPACE_CONVERSION` | 301 | 不支持色彩空间转换 |
| `AV_ERR_SERVICE_DIED` | 7 | 服务死亡 |
| `AV_ERR_TRY_AGAIN_LATER` | 5410006 | 临时缓冲区查询失败，稍后重试 |

---

## 4. Video Encoder（视频编码器）

**头文件**: `interfaces/kits/c/native_avcodec_videoencoder.h`
**动态库**: `libnative_media_venc.so`
**系统能力**: `SystemCapability.Multimedia.Media.VideoEncoder`

| 接口 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `OH_VideoEncoder_CreateByMime` | `const char *mime` | `OH_AVCodec *` | 根据 MIME 类型创建视频编码器 |
| `OH_VideoEncoder_CreateByName` | `const char *name` | `OH_AVCodec *` | 根据编码器名称创建 |
| `OH_VideoEncoder_Destroy` | `OH_AVCodec *codec` | `OH_AVErrCode` | 销毁实例 |
| `OH_VideoEncoder_SetCallback` | `OH_AVCodec *codec`, `OH_AVCodecAsyncCallback callback`, `void *userData` | `OH_AVErrCode` | 设置异步回调（deprecated since 11） |
| `OH_VideoEncoder_RegisterCallback` | `OH_AVCodec *codec`, `OH_AVCodecCallback callback`, `void *userData` | `OH_AVErrCode` | 设置新异步回调（since 11） |
| `OH_VideoEncoder_RegisterParameterCallback` | `OH_AVCodec *codec`, `OH_VideoEncoder_OnNeedInputParameter onInputParameter`, `void *userData` | `OH_AVErrCode` | 注册帧参数回调（since 12，Surface 模式） |
| `OH_VideoEncoder_Configure` | `OH_AVCodec *codec`, `OH_AVFormat *format` | `OH_AVErrCode` | 配置编码参数 |
| `OH_VideoEncoder_Prepare` | `OH_AVCodec *codec` | `OH_AVErrCode` | 准备资源 |
| `OH_VideoEncoder_Start` | `OH_AVCodec *codec` | `OH_AVErrCode` | 启动编码 |
| `OH_VideoEncoder_Stop` | `OH_AVCodec *codec` | `OH_AVErrCode` | 停止编码 |
| `OH_VideoEncoder_Flush` | `OH_AVCodec *codec` | `OH_AVErrCode` | 清空缓冲 |
| `OH_VideoEncoder_Reset` | `OH_AVCodec *codec` | `OH_AVErrCode` | 重置 |
| `OH_VideoEncoder_GetOutputDescription` | `OH_AVCodec *codec` | `OH_AVFormat *` | 获取输出格式 |
| `OH_VideoEncoder_SetParameter` | `OH_AVCodec *codec`, `OH_AVFormat *format` | `OH_AVErrCode` | 设置动态参数 |
| `OH_VideoEncoder_GetSurface` | `OH_AVCodec *codec`, `OHNativeWindow **window` | `OH_AVErrCode` | 获取输入 Surface（Surface 模式） |
| `OH_VideoEncoder_FreeOutputData` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVErrCode` | 释放输出（deprecated since 11） |
| `OH_VideoEncoder_NotifyEndOfStream` | `OH_AVCodec *codec` | `OH_AVErrCode` | 通知输入流结束（仅 Surface 模式） |
| `OH_VideoEncoder_PushInputData` | `OH_AVCodec *codec`, `uint32_t index`, `OH_AVCodecBufferAttr attr` | `OH_AVErrCode` | 提交输入（deprecated since 11） |
| `OH_VideoEncoder_PushInputBuffer` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVErrCode` | 提交输入缓冲区（since 11） |
| `OH_VideoEncoder_PushInputParameter` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVErrCode` | 提交帧参数（since 12） |
| `OH_VideoEncoder_FreeOutputBuffer` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVErrCode` | 释放输出缓冲区（since 11） |
| `OH_VideoEncoder_GetInputDescription` | `OH_AVCodec *codec` | `OH_AVFormat *` | 获取输入格式描述（since 10） |
| `OH_VideoEncoder_IsValid` | `OH_AVCodec *codec`, `bool *isValid` | `OH_AVErrCode` | 检查有效性 |
| `OH_VideoEncoder_QueryInputBuffer` | `OH_AVCodec *codec`, `uint32_t *index`, `int64_t timeoutUs` | `OH_AVErrCode` | 查询输入缓冲区（since 20） |
| `OH_VideoEncoder_GetInputBuffer` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVBuffer *` | 获取输入缓冲区（since 20） |
| `OH_VideoEncoder_QueryOutputBuffer` | `OH_AVCodec *codec`, `uint32_t *index`, `int64_t timeoutUs` | `OH_AVErrCode` | 查询输出缓冲区（since 20） |
| `OH_VideoEncoder_GetOutputBuffer` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVBuffer *` | 获取输出缓冲区（since 20） |

**实现文件**: `frameworks/native/capi/avcodec/native_video_encoder.cpp`

---

## 5. AudioCodec（统一音频编解码器，since 11）

**头文件**: `interfaces/kits/c/native_avcodec_audiocodec.h`
**动态库**: `libnative_media_acodec.so`
**系统能力**: `SystemCapability.Multimedia.Media.AudioCodec`

| 接口 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `OH_AudioCodec_CreateByMime` | `const char *mime`, `bool isEncoder` | `OH_AVCodec *` | 创建编/解码器（isEncoder: true 编码, false 解码） |
| `OH_AudioCodec_CreateByName` | `const char *name` | `OH_AVCodec *` | 根据名称创建 |
| `OH_AudioCodec_Destroy` | `OH_AVCodec *codec` | `OH_AVErrCode` | 销毁实例 |
| `OH_AudioCodec_RegisterCallback` | `OH_AVCodec *codec`, `OH_AVCodecCallback callback`, `void *userData` | `OH_AVErrCode` | 注册异步回调（OH_AVBuffer 模式） |
| `OH_AudioCodec_Configure` | `OH_AVCodec *codec`, `const OH_AVFormat *format` | `OH_AVErrCode` | 配置参数 |
| `OH_AudioCodec_Prepare` | `OH_AVCodec *codec` | `OH_AVErrCode` | 准备资源 |
| `OH_AudioCodec_Start` | `OH_AVCodec *codec` | `OH_AVErrCode` | 启动 |
| `OH_AudioCodec_Stop` | `OH_AVCodec *codec` | `OH_AVErrCode` | 停止 |
| `OH_AudioCodec_Flush` | `OH_AVCodec *codec` | `OH_AVErrCode` | 清空缓冲 |
| `OH_AudioCodec_Reset` | `OH_AVCodec *codec` | `OH_AVErrCode` | 重置 |
| `OH_AudioCodec_GetOutputDescription` | `OH_AVCodec *codec` | `OH_AVFormat *` | 获取输出格式 |
| `OH_AudioCodec_SetParameter` | `OH_AVCodec *codec`, `const OH_AVFormat *format` | `OH_AVErrCode` | 设置动态参数 |
| `OH_AudioCodec_PushInputBuffer` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVErrCode` | 提交输入缓冲区 |
| `OH_AudioCodec_FreeOutputBuffer` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVErrCode` | 释放输出缓冲区 |
| `OH_AudioCodec_IsValid` | `OH_AVCodec *codec`, `bool *isValid` | `OH_AVErrCode` | 检查有效性 |
| `OH_AudioCodec_SetDecryptionConfig` | `OH_AVCodec *codec`, `MediaKeySession *mediaKeySession`, `bool secureAudio` | `OH_AVErrCode` | 设置 DRM 解密配置（since 12） |
| `OH_AudioCodec_QueryInputBuffer` | `OH_AVCodec *codec`, `uint32_t *index`, `int64_t timeoutUs` | `OH_AVErrCode` | 查询输入缓冲区（since 20） |
| `OH_AudioCodec_GetInputBuffer` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVBuffer *` | 获取输入缓冲区（since 20） |
| `OH_AudioCodec_QueryOutputBuffer` | `OH_AVCodec *codec`, `uint32_t *index`, `int64_t timeoutUs` | `OH_AVErrCode` | 查询输出缓冲区（since 20） |
| `OH_AudioCodec_GetOutputBuffer` | `OH_AVCodec *codec`, `uint32_t index` | `OH_AVBuffer *` | 获取输出缓冲区（since 20） |

**实现文件**: `frameworks/native/capi/avcodec/native_audio_codec.cpp`

---

## 6. Capability（编解码能力查询）

**头文件**: `interfaces/kits/c/native_avcapability.h`
**动态库**: `libnative_media_codecbase.so`
**系统能力**: `SystemCapability.Multimedia.Media.CodecBase`

| 接口 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `OH_AVCodec_GetCapability` | `const char *mime`, `bool isEncoder` | `OH_AVCapability *` | 获取系统推荐编解码能力 |
| `OH_AVCodec_GetCapabilityByCategory` | `const char *mime`, `bool isEncoder`, `OH_AVCodecCategory category` | `OH_AVCapability *` | 获取指定类别（硬/软）的编解码能力 |
| `OH_AVCapability_IsHardware` | `OH_AVCapability *capability` | `bool` | 是否为硬件编解码器 |
| `OH_AVCapability_GetName` | `OH_AVCapability *capability` | `const char *` | 获取编解码器名称 |
| `OH_AVCapability_GetMaxSupportedInstances` | `OH_AVCapability *capability` | `int32_t` | 最大支持实例数 |
| `OH_AVCapability_GetEncoderBitrateRange` | `OH_AVCapability *capability`, `OH_AVRange *bitrateRange` | `OH_AVErrCode` | 编码器比特率范围 |
| `OH_AVCapability_IsEncoderBitrateModeSupported` | `OH_AVCapability *capability`, `OH_BitrateMode bitrateMode` | `bool` | 是否支持指定比特率模式 |
| `OH_AVCapability_GetEncoderQualityRange` | `OH_AVCapability *capability`, `OH_AVRange *qualityRange` | `OH_AVErrCode` | 编码器质量范围 |
| `OH_AVCapability_GetEncoderComplexityRange` | `OH_AVCapability *capability`, `OH_AVRange *complexityRange` | `OH_AVErrCode` | 编码器复杂度范围 |
| `OH_AVCapability_GetAudioSupportedSampleRates` | `OH_AVCapability *capability`, `const int32_t **sampleRates`, `uint32_t *sampleRateNum` | `OH_AVErrCode` | 音频支持的采样率 |
| `OH_AVCapability_GetAudioSupportedSampleRateRanges` | `OH_AVCapability *capability`, `OH_AVRange **sampleRateRanges`, `uint32_t *rangesNum` | `OH_AVErrCode` | 音频采样率范围（since 20） |
| `OH_AVCapability_GetAudioChannelCountRange` | `OH_AVCapability *capability`, `OH_AVRange *channelCountRange` | `OH_AVErrCode` | 音频通道数范围 |
| `OH_AVCapability_GetVideoWidthAlignment` | `OH_AVCapability *capability`, `int32_t *widthAlignment` | `OH_AVErrCode` | 视频宽度对齐 |
| `OH_AVCapability_GetVideoHeightAlignment` | `OH_AVCapability *capability`, `int32_t *heightAlignment` | `OH_AVErrCode` | 视频高度对齐 |
| `OH_AVCapability_GetVideoWidthRangeForHeight` | `OH_AVCapability *capability`, `int32_t height`, `OH_AVRange *widthRange` | `OH_AVErrCode` | 指定高度的视频宽度范围 |
| `OH_AVCapability_GetVideoHeightRangeForWidth` | `OH_AVCapability *capability`, `int32_t width`, `OH_AVRange *heightRange` | `OH_AVErrCode` | 指定宽度的视频高度范围 |
| `OH_AVCapability_GetVideoWidthRange` | `OH_AVCapability *capability`, `OH_AVRange *widthRange` | `OH_AVErrCode` | 视频宽度范围 |
| `OH_AVCapability_GetVideoHeightRange` | `OH_AVCapability *capability`, `OH_AVRange *heightRange` | `OH_AVErrCode` | 视频高度范围 |
| `OH_AVCapability_IsVideoSizeSupported` | `OH_AVCapability *capability`, `int32_t width`, `int32_t height` | `bool` | 是否支持指定视频尺寸 |
| `OH_AVCapability_GetVideoFrameRateRange` | `OH_AVCapability *capability`, `OH_AVRange *frameRateRange` | `OH_AVErrCode` | 帧率范围 |
| `OH_AVCapability_GetVideoFrameRateRangeForSize` | `OH_AVCapability *capability`, `int32_t width`, `int32_t height`, `OH_AVRange *frameRateRange` | `OH_AVErrCode` | 指定尺寸的帧率范围 |
| `OH_AVCapability_AreVideoSizeAndFrameRateSupported` | `OH_AVCapability *capability`, `int32_t width`, `int32_t height`, `int32_t frameRate` | `bool` | 是否支持指定尺寸和帧率组合 |
| `OH_AVCapability_GetVideoSupportedPixelFormats` | `OH_AVCapability *capability`, `const int32_t **pixelFormats`, `uint32_t *pixelFormatNum` | `OH_AVErrCode` | 支持的像素格式 |
| `OH_AVCapability_GetVideoSupportedNativeBufferFormats` | `OH_AVCapability *capability`, `const OH_NativeBuffer_Format **nativeBufferFormats`, `uint32_t *nativeBufferFormatNum` | `OH_AVErrCode` | 支持的 NativeBuffer 格式（since 22） |
| `OH_AVCapability_GetSupportedProfiles` | `OH_AVCapability *capability`, `const int32_t **profiles`, `uint32_t *profileNum` | `OH_AVErrCode` | 支持的 Profile |
| `OH_AVCapability_GetSupportedLevelsForProfile` | `OH_AVCapability *capability`, `int32_t profile`, `const int32_t **levels`, `uint32_t *levelNum` | `OH_AVErrCode` | 指定 Profile 的 Level |
| `OH_AVCapability_AreProfileAndLevelSupported` | `OH_AVCapability *capability`, `int32_t profile`, `int32_t level` | `bool` | 是否支持 Profile+Level |
| `OH_AVCapability_IsFeatureSupported` | `OH_AVCapability *capability`, `OH_AVCapabilityFeature feature` | `bool` | 是否支持特性（since 12） |
| `OH_AVCapability_GetFeatureProperties` | `OH_AVCapability *capability`, `OH_AVCapabilityFeature feature` | `OH_AVFormat *` | 获取特性属性（since 12） |

**实现文件**: `frameworks/native/capi/common/native_avcapability.cpp`

---

## 7. AVSource（媒体源）

**头文件**: `interfaces/kits/c/native_avsource.h`
**动态库**: `libnative_media_avsource.so`
**系统能力**: `SystemCapability.Multimedia.Media.Spliter`

| 接口 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `OH_AVSource_CreateWithFD` | `int32_t fd`, `int64_t offset`, `int64_t size` | `OH_AVSource *` | 从文件描述符创建媒体源 |
| `OH_AVSource_CreateWithURI` | `char *uri` | `OH_AVSource *` | 从 URI 创建媒体源 |
| `OH_AVSource_CreateWithDataSource` | `OH_AVDataSource *dataSource` | `OH_AVSource *` | 从自定义数据源创建（since 12） |
| `OH_AVSource_CreateWithDataSourceExt` | `OH_AVDataSourceExt *dataSource`, `void *userData` | `OH_AVSource *` | 扩展数据源创建（since 20） |
| `OH_AVSource_Destroy` | `OH_AVSource *source` | `OH_AVErrCode` | 销毁媒体源 |
| `OH_AVSource_GetSourceFormat` | `OH_AVSource *source` | `OH_AVFormat *` | 获取源格式信息 |
| `OH_AVSource_GetTrackFormat` | `OH_AVSource *source`, `uint32_t trackIndex` | `OH_AVFormat *` | 获取轨道格式信息 |
| `OH_AVSource_GetCustomMetadataFormat` | `OH_AVSource *source` | `OH_AVFormat *` | 获取自定义元数据（since 18） |

**实现文件**: `frameworks/native/capi/avsource/native_avsource.cpp`

---

## 8. AVDemuxer（解封装器）

**头文件**: `interfaces/kits/c/native_avdemuxer.h`
**动态库**: `libnative_media_avdemuxer.so`
**系统能力**: `SystemCapability.Multimedia.Media.Spliter`

| 接口 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `OH_AVDemuxer_CreateWithSource` | `OH_AVSource *source` | `OH_AVDemuxer *` | 创建解封装器 |
| `OH_AVDemuxer_Destroy` | `OH_AVDemuxer *demuxer` | `OH_AVErrCode` | 销毁解封装器 |
| `OH_AVDemuxer_SelectTrackByID` | `OH_AVDemuxer *demuxer`, `uint32_t trackIndex` | `OH_AVErrCode` | 选择轨道 |
| `OH_AVDemuxer_UnselectTrackByID` | `OH_AVDemuxer *demuxer`, `uint32_t trackIndex` | `OH_AVErrCode` | 取消选择轨道 |
| `OH_AVDemuxer_ReadSample` | `OH_AVDemuxer *demuxer`, `uint32_t trackIndex`, `OH_AVMemory *sample`, `OH_AVCodecBufferAttr *info` | `OH_AVErrCode` | 读取帧（deprecated since 11） |
| `OH_AVDemuxer_ReadSampleBuffer` | `OH_AVDemuxer *demuxer`, `uint32_t trackIndex`, `OH_AVBuffer *sample` | `OH_AVErrCode` | 读取帧（since 11，推荐） |
| `OH_AVDemuxer_SeekToTime` | `OH_AVDemuxer *demuxer`, `int64_t millisecond`, `OH_AVSeekMode mode` | `OH_AVErrCode` | Seek 到指定时间 |
| `OH_AVDemuxer_SetMediaKeySystemInfoCallback` | `OH_AVDemuxer *demuxer`, `DRM_MediaKeySystemInfoCallback callback` | `OH_AVErrCode` | 设置 DRM 回调（deprecated since 14） |
| `OH_AVDemuxer_SetDemuxerMediaKeySystemInfoCallback` | `OH_AVDemuxer *demuxer`, `Demuxer_MediaKeySystemInfoCallback callback` | `OH_AVErrCode` | 设置 DRM 回调（since 12） |
| `OH_AVDemuxer_GetMediaKeySystemInfo` | `OH_AVDemuxer *demuxer`, `DRM_MediaKeySystemInfo *mediaKeySystemInfo` | `OH_AVErrCode` | 获取 DRM 信息 |

**实现文件**: `frameworks/native/capi/avdemuxer/native_avdemuxer.cpp`

---

## 9. AVMuxer（封装器）

**头文件**: `interfaces/kits/c/native_avmuxer.h`
**动态库**: `libnative_media_avmuxer.so`
**系统能力**: `SystemCapability.Multimedia.Media.Muxer`

| 接口 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `OH_AVMuxer_Create` | `int32_t fd`, `OH_AVOutputFormat format` | `OH_AVMuxer *` | 创建封装器 |
| `OH_AVMuxer_Destroy` | `OH_AVMuxer *muxer` | `OH_AVErrCode` | 销毁封装器 |
| `OH_AVMuxer_SetRotation` | `OH_AVMuxer *muxer`, `int32_t rotation` | `OH_AVErrCode` | 设置旋转角度（0/90/180/270） |
| `OH_AVMuxer_SetFormat` | `OH_AVMuxer *muxer`, `OH_AVFormat *format` | `OH_AVErrCode` | 设置格式信息（since 14） |
| `OH_AVMuxer_AddTrack` | `OH_AVMuxer *muxer`, `int32_t *trackIndex`, `OH_AVFormat *trackFormat` | `OH_AVErrCode` | 添加轨道 |
| `OH_AVMuxer_Start` | `OH_AVMuxer *muxer` | `OH_AVErrCode` | 启动封装 |
| `OH_AVMuxer_WriteSample` | `OH_AVMuxer *muxer`, `uint32_t trackIndex`, `OH_AVMemory *sample`, `OH_AVCodecBufferAttr info` | `OH_AVErrCode` | 写入帧（deprecated since 11） |
| `OH_AVMuxer_WriteSampleBuffer` | `OH_AVMuxer *muxer`, `uint32_t trackIndex`, `const OH_AVBuffer *sample` | `OH_AVErrCode` | 写入帧（since 11，推荐） |
| `OH_AVMuxer_Stop` | `OH_AVMuxer *muxer` | `OH_AVErrCode` | 停止封装 |
| `OH_AVMuxer_Destroy` | `OH_AVMuxer *muxer` | `OH_AVErrCode` | 销毁实例 |

**实现文件**: `frameworks/native/capi/avmuxer/native_avmuxer.cpp`

---

## 10. CencInfo（DRM 加密信息）

**头文件**: `interfaces/kits/c/native_cencinfo.h`
**动态库**: `libnative_media_avcencinfo.so`
**系统能力**: `SystemCapability.Multimedia.Media.Spliter`

| 接口 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `OH_AVCencInfo_Create` | 无 | `OH_AVCencInfo *` | 创建 CencInfo 实例 |
| `OH_AVCencInfo_Destroy` | `OH_AVCencInfo *cencInfo` | `OH_AVErrCode` | 销毁实例 |
| `OH_AVCencInfo_SetAlgorithm` | `OH_AVCencInfo *cencInfo`, `DrmCencAlgorithm algo` | `OH_AVErrCode` | 设置加密算法 |
| `OH_AVCencInfo_SetKeyIdAndIv` | `OH_AVCencInfo *cencInfo`, `uint8_t *keyId`, `uint32_t keyIdLen`, `uint8_t *iv`, `uint32_t ivLen` | `OH_AVErrCode` | 设置 Key ID 和 IV |
| `OH_AVCencInfo_SetSubSampleInfo` | `OH_AVCencInfo *cencInfo`, `uint32_t encryptedBlockCount`, `uint32_t skippedBlockCount`, `uint32_t firstEncryptedOffset`, `uint32_t subsampleCount`, `DrmSubsample *subsamples` | `OH_AVErrCode` | 设置子样本信息 |
| `OH_AVCencInfo_SetMode` | `OH_AVCencInfo *cencInfo`, `DrmCencInfoMode mode` | `OH_AVErrCode` | 设置 Cenc 模式 |
| `OH_AVCencInfo_SetAVBuffer` | `OH_AVCencInfo *cencInfo`, `OH_AVBuffer *buffer` | `OH_AVErrCode` | 将 CencInfo 附加到 AVBuffer |

**实现文件**: `frameworks/native/capi/avcencinfo/native_cencinfo.cpp`

### DrmCencAlgorithm 枚举

| 值 | 含义 |
|----|------|
| `DRM_ALG_CENC_UNENCRYPTED` (0x0) | 不加密 |
| `DRM_ALG_CENC_AES_CTR` (0x1) | AES CTR 模式 |
| `DRM_ALG_CENC_AES_WV` (0x2) | AES WV 模式 |
| `DRM_ALG_CENC_AES_CBC` (0x3) | AES CBC 模式 |
| `DRM_ALG_CENC_SM4_CBC` (0x4) | SM4 CBC 模式 |
| `DRM_ALG_CENC_SM4_CTR` (0x5) | SM4 CTR 模式 |

---

## 11. CodecBase（基础类型与常量）

**头文件**: `interfaces/kits/c/native_avcodec_base.h`
**动态库**: `libnative_media_codecbase.so`

### 回调类型

| 类型 | 说明 |
|------|------|
| `OH_AVCodecOnError` | 错误回调: `void (*)(OH_AVCodec *, int32_t errorCode, void *userData)` |
| `OH_AVCodecOnStreamChanged` | 流变化回调: `void (*)(OH_AVCodec *, OH_AVFormat *, void *userData)` |
| `OH_AVCodecOnNeedInputData` | 需要输入数据回调（deprecated） |
| `OH_AVCodecOnNewOutputData` | 新输出数据回调（deprecated） |
| `OH_AVCodecOnNeedInputBuffer` | 需要输入缓冲区回调（since 11） |
| `OH_AVCodecOnNewOutputBuffer` | 新输出缓冲区回调（since 11） |
| `OH_AVCodecAsyncCallback` | 旧回调集合（deprecated since 11） |
| `OH_AVCodecCallback` | 新回调集合（since 11，推荐） |

### 支持的 MIME 类型

**视频编解码器**:
- `OH_AVCODEC_MIMETYPE_VIDEO_AVC` - H.264/AVC
- `OH_AVCODEC_MIMETYPE_VIDEO_HEVC` - H.265/HEVC
- `OH_AVCODEC_MIMETYPE_VIDEO_VVC` - VVC (since 12)
- `OH_AVCODEC_MIMETYPE_VIDEO_AV1` - AV1 (since 23)
- `OH_AVCODEC_MIMETYPE_VIDEO_VP8` - VP8 (since 23)
- `OH_AVCODEC_MIMETYPE_VIDEO_VP9` - VP9 (since 23)
- `OH_AVCODEC_MIMETYPE_VIDEO_MPEG2` - MPEG-2 (since 17)
- `OH_AVCODEC_MIMETYPE_VIDEO_MPEG4_PART2` - MPEG-4 Part 2 (since 17)

**音频编解码器**:
- `OH_AVCODEC_MIMETYPE_AUDIO_AAC` - AAC
- `OH_AVCODEC_MIMETYPE_AUDIO_MPEG` - MP3
- `OH_AVCODEC_MIMETYPE_AUDIO_FLAC` - FLAC
- `OH_AVCODEC_MIMETYPE_AUDIO_VORBIS` - Vorbis
- `OH_AVCODEC_MIMETYPE_AUDIO_OPUS` - Opus
- `OH_AVCODEC_MIMETYPE_AUDIO_AMR_NB` / `AMR_WB` - AMR
- `OH_AVCODEC_MIMETYPE_AUDIO_G711MU` - G.711 mu-law
- `OH_AVCODEC_MIMETYPE_AUDIO_VIVID` - Audio Vivid
- `OH_AVCODEC_MIMETYPE_AUDIO_APE` - APE (since 12)
- `OH_AVCODEC_MIMETYPE_AUDIO_LBVC` - LBVC (since 12)
- `OH_AVCODEC_MIMETYPE_AUDIO_RAW` - Raw PCM (since 18)

### 封装输出格式

| 枚举值 | 格式 |
|--------|------|
| `AV_OUTPUT_FORMAT_DEFAULT` (0) | 默认 (MP4) |
| `AV_OUTPUT_FORMAT_MPEG_4` (2) | MP4 |
| `AV_OUTPUT_FORMAT_M4A` (6) | M4A |
| `AV_OUTPUT_FORMAT_AMR` (8) | AMR (since 12) |
| `AV_OUTPUT_FORMAT_MP3` (9) | MP3 (since 12) |
| `AV_OUTPUT_FORMAT_WAV` (10) | WAV (since 12) |
| `AV_OUTPUT_FORMAT_AAC` (11) | AAC (since 18) |
| `AV_OUTPUT_FORMAT_FLAC` (12) | FLAC (since 20) |
| `AV_OUTPUT_FORMAT_OGG` (13) | OGG (since 23) |

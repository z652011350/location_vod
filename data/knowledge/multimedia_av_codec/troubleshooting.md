# multimedia_av_codec 模块故障排查指南

本文档提供 multimedia_av_codec 模块的常见错误场景、错误码含义、排查思路和典型修复方案。

## 错误码体系概览

模块使用三层错误码体系:

| 层级 | 前缀 | 范围 | 定义文件 |
|------|------|------|----------|
| 内部错误码 | `AVCS_ERR_*` | 系统偏移 + 错误值 | `interfaces/inner_api/native/avcodec_errors.h` |
| 公开错误码 | `AV_ERR_*` | 0 ~ 201, 541xxxx | `native_averrors.h` (SDK) |
| JS 层错误码 | 数值 | 401, 5400101 等 | `@ohos.multimedia.media.d.ts` |

内部错误码通过 `AVCSErrorToOHAVErrCode()` 转换为公开错误码（源码: `interfaces/inner_api/native/avcodec_errors.h`）。

---

## 1. 参数错误类

### 1.1 AV_ERR_INVALID_VAL (公开码 3)

**对应内部码**: AVCS_ERR_INVALID_VAL

**含义**: 传入参数无效

**常见场景**:
- codec/muxer/demuxer/source 指针为 NULL 或已被销毁
- format 指针为 NULL 或非有效 OH_AVFormat 实例
- magic 字段校验失败（传入了错误类型的对象）
- MIME 类型字符串为 NULL 或过长（超过 255 字符）
- buffer size 为负值
- trackIndex 超出范围

**排查思路**:
1. 检查所有指针参数是否为 NULL
2. 确认编解码器实例是否已通过 Create 成功创建
3. 确认未对已销毁的对象进行操作
4. 检查 trackIndex 是否在 AVSource 报告的轨道范围内

**典型修复**:
```c
// 错误: 未检查 Create 返回值
OH_AVCodec *codec = OH_AudioDecoder_CreateByMime("audio/unknown");
// codec 为 NULL，后续调用会返回 AV_ERR_INVALID_VAL

// 正确: 检查返回值
OH_AVCodec *codec = OH_AudioDecoder_CreateByMime(mime);
if (codec == NULL) {
    // MIME 类型不支持，检查 MIME 字符串是否正确
    return;
}
```

### 1.2 JS 层 401 错误

**含义**: 参数错误，可能缺少必填参数

**排查思路**:
1. 检查 JS API 调用是否缺少必选参数
2. 检查参数类型是否匹配（如传入字符串却期望数字）

---

## 2. 状态机错误类

### 2.1 AV_ERR_INVALID_STATE (公开码 8)

**对应内部码**: AVCS_ERR_INVALID_STATE

**含义**: 在无效状态下调用了接口

**常见场景**:
- 未调用 Configure 就调用 Prepare
- 未调用 Prepare 就调用 Start
- 在未启动状态下调用 Flush/SetParameter
- 对已 Stop 的编解码器调用 PushInputBuffer
- 在 Surface 模式下调用 Buffer 模式接口（或反之）

**标准状态流转**:
```
创建(Create) -> 配置(Configure) -> 准备(Prepare) -> 启动(Start) -> 运行中
    |                  |                  |               |
    v                  v                  v               v
  Reset             Reset             Reset          Stop/Flush/Reset
```

**排查思路**:
1. 检查 API 调用顺序是否符合状态机要求
2. 回调注册必须在 Prepare 之前
3. SetParameter 必须在 Start 之后
4. Flush/Stop 后需重新输入 Codec-Specific-Data（如 H.264 的 SPS/PPS）

### 2.2 AV_ERR_OPERATE_NOT_PERMIT (公开码 2)

**对应内部码**: AVCS_ERR_INVALID_OPERATION

**含义**: 操作不被允许

**常见场景**:
- Buffer 模式的视频解码器配置了色彩空间转换
- 同步模式下设置了异步回调
- 异步模式下调用了 QueryInputBuffer/QueryOutputBuffer
- Surface 模式的编码器中 Buffer 操作不匹配
- DRM 解密配置时 mediaKeySession 服务状态异常

**排查思路**:
1. 确认 Buffer/Surface 模式与调用的接口是否匹配
2. 确认同步/异步模式与调用方式一致
3. 检查 DRM session 是否已正确初始化

---

## 3. 编解码错误类

### 3.1 音频编解码失败

**内部码 AVCS_ERR_AUD_DEC_FAILED (音频解码失败)**

**场景**:
- 输入的音频数据格式与配置不匹配
- 输入数据损坏
- Codec-Specific-Data 未正确设置

**排查思路**:
1. 检查 Configure 时设置的 MIME 类型、采样率、通道数是否与实际数据一致
2. 对于 AAC: 检查是否正确设置了 `OH_MD_KEY_AAC_IS_ADTS`（ADTS 格式设 1，LATM 格式设 0）
3. 对于 Vorbis: 检查是否设置了 `OH_MD_KEY_IDENTIFICATION_HEADER` 和 `OH_MD_KEY_SETUP_HEADER`
4. 检查输入数据是否完整（特别是流的首帧需要携带 CSD 数据）

**内部码 AVCS_ERR_AUD_ENC_FAILED (音频编码失败)**

**排查**:
1. 检查采样率/通道数/比特率是否在 Capability 查询的范围内
2. FLAC 编码器检查 `OH_MD_KEY_COMPLIANCE_LEVEL` 是否超限（0-8）

### 3.2 视频编解码失败

**内部码 AVCS_ERR_VID_DEC_FAILED (视频解码失败)**

**场景**:
- H.264/H.265: SPS/PPS 参数集缺失或损坏
- 视频流格式与配置不匹配
- 硬件解码器资源不足

**排查思路**:
1. 确保首帧输入携带了完整的 SPS/PPS（通过 `OH_MD_KEY_CODEC_CONFIG` 设置）
2. 检查 `OH_MD_KEY_WIDTH`/`OH_MD_KEY_HEIGHT`/`OH_MD_KEY_PIXEL_FORMAT` 是否正确
3. 如果 Stop 后重新 Start，需要重新输入 CSD 数据
4. 检查硬件资源是否充足（`AVCS_ERR_INSUFFICIENT_HARDWARE_RESOURCES`）

**内部码 AVCS_ERR_VID_ENC_FAILED (视频编码失败)**

**排查**:
1. 检查编码参数（分辨率、帧率、比特率）是否在 Capability 范围内
2. 检查比特率模式是否正确设置
3. Surface 模式下确认输入帧格式正确

### 3.3 不支持的格式/参数

| 内部错误码 | 含义 |
|-----------|------|
| `AVCS_ERR_UNSUPPORT_AUD_SRC_TYPE` | 不支持的音频源类型 |
| `AVCS_ERR_UNSUPPORT_AUD_SAMPLE_RATE` | 不支持的音频采样率 |
| `AVCS_ERR_UNSUPPORT_AUD_CHANNEL_NUM` | 不支持的音频通道数 |
| `AVCS_ERR_UNSUPPORT_AUD_ENC_TYPE` | 不支持的音频编码器类型 |
| `AVCS_ERR_UNSUPPORT_AUD_PARAMS` | 不支持的音频参数 |
| `AVCS_ERR_UNSUPPORT_VID_SRC_TYPE` | 不支持的视频源类型 |
| `AVCS_ERR_UNSUPPORT_VID_ENC_TYPE` | 不支持的视频编码器类型 |
| `AVCS_ERR_UNSUPPORT_VID_PARAMS` | 不支持的视频参数 |
| `AVCS_ERR_UNSUPPORT_VID_DEC_TYPE` | 不支持的视频解码器类型 |
| `AVCS_ERR_UNSUPPORT_AUD_DEC_TYPE` | 不支持的音频解码器类型 |
| `AVCS_ERR_UNSUPPORT_FILE_TYPE` | 不支持的文件格式 |
| `AVCS_ERR_UNSUPPORT_PROTOCOL_TYPE` | 不支持的协议类型 |
| `AVCS_ERR_UNSUPPORT_STREAM` | 内部数据流错误 |
| `AVCS_ERR_UNSUPPORT_SOURCE` | 不支持的源类型 |
| `AVCS_ERR_UNSUPPORTED_CODEC_SPECIFICATION` | 不支持的编解码规格 |
| `AVCS_ERR_VIDEO_UNSUPPORT_COLOR_SPACE_CONVERSION` | 不支持色彩空间转换 |

**排查**:
1. 使用 `OH_AVCodec_GetCapability` 查询系统支持的编解码器和参数范围
2. 使用 `OH_AVCapability_IsVideoSizeSupported` / `AreVideoSizeAndFrameRateSupported` 验证参数
3. 使用 `OH_AVCapability_GetAudioSupportedSampleRates` 查询支持的采样率
4. 色彩空间转换: 检查 `OH_AVCapability_IsFeatureSupported(VIDEO_LOW_LATENCY)` 是否支持

### 3.4 配置参数不匹配

| 内部错误码 | 含义 | 典型原因 |
|-----------|------|---------|
| `AVCS_ERR_CONFIGURE_MISMATCH_CHANNEL_COUNT` | 通道数不匹配 | Configure 时未设置通道数 |
| `AVCS_ERR_MISMATCH_SAMPLE_RATE` | 采样率不匹配 | Configure 的采样率与实际数据不一致 |
| `AVCS_ERR_MISMATCH_BIT_RATE` | 比特率不匹配 | Configure 的比特率与编码器能力不匹配 |
| `AVCS_ERR_CONFIGURE_ERROR` | 配置错误 | FLAC 压缩级别超限 |
| `AVCS_ERR_CODEC_PARAM_INCORRECT` | 编解码参数校验失败 | 视频参数不符合规范 |
| `AVCS_ERR_ILLEGAL_PARAMETER_SETS` | 非法参数集 | H.264/H.265 SPS/PPS 非法 |
| `AVCS_ERR_MINSSING_PARAMETER_SETS` | 缺少参数集 | 未提供必要的 SPS/PPS |

---

## 4. IO 和文件错误类

### 4.1 文件操作错误

| 内部错误码 | 含义 |
|-----------|------|
| `AVCS_ERR_OPEN_FILE_FAILED` | 打开文件失败 |
| `AVCS_ERR_FILE_ACCESS_FAILED` | 文件读写失败 |
| `AVCS_ERR_NOT_FIND_FILE` | 找不到文件 |

**排查思路**:
1. 检查文件描述符 fd 是否有效（>= 0）
2. 检查 offset 和 size 参数是否正确
3. 确认文件权限（fd 需要有读写权限）
4. Muxer 的 fd 需要以读写模式打开

### 4.2 网络错误

| 公开错误码 | 值 | 含义 |
|-----------|------|------|
| `AV_ERR_IO` | 4 | IO 错误 |
| `AV_ERR_TIMEOUT` | 5 | 网络超时 |
| `AV_ERR_IO_CANNOT_FIND_HOST` | 5411001 | 无法找到主机 |
| `AV_ERR_IO_CONNECTION_TIMEOUT` | 5411002 | 网络连接超时 |
| `AV_ERR_IO_NETWORK_ABNORMAL` | 5411003 | 网络异常 |
| `AV_ERR_IO_NETWORK_UNAVAILABLE` | 5411004 | 网络不可用 |
| `AV_ERR_IO_NO_PERMISSION` | 5411005 | 网络权限被拒绝 |
| `AV_ERR_IO_NETWORK_ACCESS_DENIED` | 5411006 | 网络访问被拒绝 |
| `AV_ERR_IO_RESOURCE_NOT_FOUND` | 5411007 | 找不到网络资源 |
| `AV_ERR_IO_SSL_CLIENT_CERT_NEEDED` | 5411008 | SSL 客户端证书验证失败 |
| `AV_ERR_IO_SSL_CONNECT_FAIL` | 5411009 | SSL 连接失败 |
| `AV_ERR_IO_SSL_SERVER_CERT_UNTRUSTED` | 5411010 | SSL 服务器证书不受信任 |
| `AV_ERR_IO_UNSUPPORTED_REQUEST` | 5411011 | 网络协议不支持该请求 |
| `AV_ERR_IO_CLEARTEXT_NOT_PERMITTED` | 5411012 | 不允许 HTTP 明文传输 |

**排查思路**:
1. 检查网络连接状态
2. HTTP 明文传输: 需要在应用配置中允许明文传输（`NetworkSecurityConfig`）
3. SSL 错误: 检查证书配置
4. DNS 解析失败: 检查 URL 是否正确，DNS 是否可用
5. 超时: 检查网络带宽和服务器响应速度

**HTTP 明文传输特殊处理**:

AVSource 创建时（`native_avsource.cpp` 中 `OH_AVSource_CreateWithURI`）会检查 `NetworkSecurityConfig`:
```
GetProtocolFromURL(uri) -> 提取协议
NetworkSecurityConfig::IsCleartextCfgByComponent("Media Kit") -> 检查组件配置
IsCleartextPermitted(hostName) -> 检查主机是否允许明文
```
如果 HTTP 协议被禁止，将返回 NULL。

### 4.3 数据源错误

| 内部错误码 | 含义 |
|-----------|------|
| `AVCS_ERR_DATA_SOURCE_IO_ERROR` | 数据源 IO 失败 |
| `AVCS_ERR_DATA_SOURCE_OBTAIN_MEM_ERROR` | 数据源获取内存失败 |
| `AVCS_ERR_DATA_SOURCE_ERROR_UNKNOWN` | 数据源未知错误 |

**排查**:
1. 检查 `OH_AVDataSource` 的 `readAt` 回调实现是否正确
2. 确认 `size` 字段与实际数据大小一致
3. 检查 readAt 回调返回值（应返回实际读取字节数）

---

## 5. 服务与 IPC 错误类

### 5.1 服务死亡

**公开码 AV_ERR_SERVICE_DIED (7)** / **JS 层 5400105**

**对应内部码**: AVCS_ERR_SERVICE_DIED

**含义**: 编解码服务进程死亡

**排查思路**:
1. 使用 `OH_VideoDecoder_IsValid` / `OH_AudioCodec_IsValid` 检查实例是否有效
2. 服务死亡后需要重新创建编解码器实例
3. 检查系统日志确认服务崩溃原因（可能是硬件编解码器异常）
4. 考虑使用 `AVCS_ERR_INSUFFICIENT_HARDWARE_RESOURCES` 判断是否为硬件资源耗尽

### 5.2 IPC 错误

| 内部错误码 | 含义 |
|-----------|------|
| `AVCS_ERR_IPC_UNKNOWN` | IPC 未知错误 |
| `AVCS_ERR_IPC_GET_SUB_SYSTEM_ABILITY_FAILED` | 获取子系统 SA 失败 |
| `AVCS_ERR_IPC_SET_DEATH_LISTENER_FAILED` | 设置死亡监听器失败 |
| `AVCS_ERR_CREATE_CODECLIST_STUB_FAILED` | 创建编解码能力列表子服务失败 |
| `AVCS_ERR_CREATE_AVCODEC_STUB_FAILED` | 创建编解码子服务失败 |

**排查**:
1. 检查编解码服务 SA 是否已注册（Samgr）
2. 确认多媒体服务进程是否正常运行
3. 检查系统是否支持所需的编解码能力

---

## 6. 内存与资源错误类

### 6.1 AV_ERR_NO_MEMORY (公开码 1) / JS 层 5400101

**对应内部码**: AVCS_ERR_NO_MEMORY

**常见场景**:
- 系统内存不足
- 编解码器实例已销毁但仍有引用
- 缓冲区分配失败
- `AVCS_ERR_INSUFFICIENT_HARDWARE_RESOURCES`: 硬件编解码器资源不足

**排查思路**:
1. 减少同时创建的编解码器实例数（通过 `OH_AVCapability_GetMaxSupportedInstances` 查询上限）
2. 及时释放不再使用的编解码器实例
3. 检查是否存在内存泄漏
4. 硬件资源不足时考虑使用软件编解码器

### 6.2 AVCS_ERR_NOT_ENOUGH_DATA

**含义**: 输出缓冲区数据不足一个包

**排查**: 这是正常的流结束信号之一，通常无需处理。如果频繁出现，检查输入数据是否完整。

### 6.3 AVCS_ERR_END_OF_STREAM

**含义**: 到达流末尾

**说明**: 这是正常信号，表示所有数据已处理完毕。应用可通过在 `PushInputData` 时设置 `AVCODEC_BUFFER_FLAG_EOS` 标志通知流结束。

---

## 7. DRM 加密错误类

### 7.1 AV_ERR_DRM_DECRYPT_FAILED (公开码 201)

**对应内部码**: AVCS_ERR_DECRYPT_FAILED

**含义**: DRM 解密失败

**排查思路**:
1. 确认已通过 `OH_VideoDecoder_SetDecryptionConfig` 或 `OH_AudioCodec_SetDecryptionConfig` 正确设置了 MediaKeySession
2. 确认 MediaKeySession 已获取有效的许可证（License）
3. 检查 CencInfo 的算法、Key ID、IV 是否正确
4. 确认 `secureVideoPath`/`secureAudio` 参数与内容要求一致

### 7.2 CencInfo 设置错误

**AV_ERR_INVALID_VAL 常见原因**:
- `keyIdLen` 不等于 `DRM_KEY_ID_SIZE` (16)
- `ivLen` 不等于 `DRM_KEY_IV_SIZE` (16)
- `subsampleCount` 大于 `DRM_KEY_MAX_SUB_SAMPLE_NUM` (64)
- keyId/iv/subsamples 指针为 NULL
- `OH_AVCencInfo_SetAVBuffer` 时 buffer 或 buffer->meta 为 NULL

---

## 8. 封装/解封装错误类

### 8.1 Muxer 错误

**内部码 AVCS_ERR_MUXER_FAILED (封装器失败)**

**常见场景**:
- 未调用 AddTrack 就调用 Start
- 未调用 Start 就调用 WriteSample
- WriteSample 的 trackIndex 无效
- 帧数据未按时间戳顺序写入
- fd 无效或无写权限

**排查**:
1. 确保调用顺序: Create -> SetRotation(可选) -> AddTrack -> Start -> WriteSample -> Stop -> Destroy
2. 确保帧数据按时间戳递增顺序写入
3. 确保 fd 在 Destroy 之前保持有效

### 8.2 Demuxer 错误

**内部码 AVCS_ERR_DEMUXER_FAILED (解封装器失败)**

**常见场景**:
- 文件格式不支持
- 文件数据损坏
- Seek 到不支持的位置

**排查**:
1. 使用 `OH_AVSource_GetSourceFormat` 检查源格式是否正确
2. Seek 时检查时间是否在文件时长范围内
3. 检查 SeekMode 是否合适（`SEEK_MODE_NEXT_SYNC` 可能因无 I 帧导致失败）
4. 使用 `OH_AVSource_GetTrackFormat` 确认轨道信息

---

## 9. 流格式变化

### 9.1 AV_ERR_STREAM_CHANGED (公开码 5410005)

**含义**: 同步模式下流格式发生变化

**处理方法**:
1. 调用 `OH_VideoDecoder_GetOutputDescription` 获取新的流格式信息
2. 根据新格式调整后续处理逻辑
3. 在异步模式下，此信号通过 `OH_AVCodecOnStreamChanged` 回调通知

### 9.2 AVCS_ERR_STREAM_CHANGED (内部码)

**含义**: 输出格式变化（如分辨率变化）

**处理**: 异步模式下通过 `onStreamChanged` 回调获取新格式信息。

---

## 10. 数据错误类

### 10.1 AV_ERR_INPUT_DATA_ERROR (公开码 10)

**对应内部码**: AVCS_ERR_INPUT_DATA_ERROR

**含义**: 输入数据有误

**排查**:
1. 检查输入数据的格式是否与编解码器配置一致
2. 检查是否输入了损坏的帧数据
3. 确认时间戳是否递增

### 10.2 AVCS_ERR_INVALID_DATA

**含义**: 处理输入时发现无效数据

**排查**:
1. 检查输入数据是否完整
2. 确认 CSD 数据是否正确
3. 检查是否混入了其他格式的数据

### 10.3 AVCS_ERR_TRY_AGAIN

**含义**: 稍后重试

**处理**: 这是一个临时性错误，通常在缓冲区暂时不可用时返回。应用应等待短暂时间后重试。

---

## 11. 超时与重试

### 11.1 AV_ERR_TIMEOUT (公开码 5) / JS 层 5400104

**对应内部码**: AVCS_ERR_NETWORK_TIMEOUT

**排查**:
1. 检查网络连接状态
2. 增加超时时间
3. 考虑添加重试机制

### 11.2 AV_ERR_TRY_AGAIN_LATER (公开码 5410006)

**含义**: 临时缓冲区查询失败，稍后重试（同步模式）

**处理**:
1. 等待几毫秒后重试 `QueryInputBuffer` / `QueryOutputBuffer`
2. 不要频繁轮询，使用合理的超时参数

---

## 12. 快速排查流程图

```
编解码器返回错误
    |
    v
错误码是否为 AV_ERR_INVALID_VAL (3)?
    |-- 是 -> 检查所有指针参数是否为 NULL
    |         检查 codec 实例是否已创建
    |         检查 format 是否有效
    |
    v
错误码是否为 AV_ERR_INVALID_STATE (8)?
    |-- 是 -> 检查 API 调用顺序
    |         Create -> SetCallback -> Configure -> Prepare -> Start
    |
    v
错误码是否为 AV_ERR_SERVICE_DIED (7)?
    |-- 是 -> 服务崩溃，需重新创建实例
    |         检查 IsValid 确认实例状态
    |
    v
错误码是否为 AV_ERR_UNSUPPORT (9)?
    |-- 是 -> 使用 Capability API 查询支持能力
    |         确认 MIME 类型、参数范围
    |
    v
错误码是否为 AV_ERR_NO_MEMORY (1)?
    |-- 是 -> 减少并发编解码器实例
    |         及时释放不再使用的实例
    |
    v
错误码是否为 AV_ERR_OPERATE_NOT_PERMIT (2)?
    |-- 是 -> 确认 Buffer/Surface 模式是否匹配
    |         确认同步/异步模式是否匹配
    |
    v
检查 HiLog 日志 (hilog | grep AVCodec)
    -> 搜索关键字: "failed", "error", "magic error"
```

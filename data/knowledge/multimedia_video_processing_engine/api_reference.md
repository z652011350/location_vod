# VPE API 参考手册

本文档涵盖 VPE 模块的全部公共 API，包括 JS API、C Image Processing API 和 C Video Processing API。

---

## 1. JS API (`videoProcessingEngine` namespace)

**声明文件**: `interface_sdk-js/api/@ohos.multimedia.videoProcessingEngine.d.ts`
**SysCap**: `SystemCapability.Multimedia.VideoProcessingEngine`
**引入方式**: `import videoProcessingEngine from '@ohos.multimedia.videoProcessingEngine'`
**Kit**: ImageKit
**Since**: 18 (dynamic) / 23 (static)
**跨平台**: 支持

---

### 1.1 QualityLevel 枚举

细节增强的质量等级枚举。

| 枚举值 | 数值 | 说明 |
|--------|------|------|
| `NONE` | 0 | 不进行细节增强 |
| `LOW` | 1 | 低质量，速度快。**默认值** |
| `MEDIUM` | 2 | 中等质量，速度适中 |
| `HIGH` | 3 | 高质量，速度较慢 |

源文件: `interface_sdk-js/api/@ohos.multimedia.videoProcessingEngine.d.ts`

---

### 1.2 ImageProcessor 接口

由 `videoProcessingEngine.create()` 返回的图像处理器实例。

#### enhanceDetail(sourceImage, width, height, level?)

异步细节增强 -- 按指定宽高缩放。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sourceImage | `image.PixelMap` | 是 | 源图像 PixelMap |
| width | `int` | 是 | 目标宽度 (范围: 32-8192) |
| height | `int` | 是 | 目标高度 (范围: 32-8192) |
| level | `QualityLevel` | 否 | 质量等级，默认 LOW |

**返回值**: `Promise<image.PixelMap>` -- 处理后的目标 PixelMap

**可抛出错误**:

| 错误码 | 说明 |
|--------|------|
| 801 | 设备能力不支持 |
| 29200007 | 内存不足 |
| 29200009 | 输入值无效 (宽高过大、色彩空间不正确、档位不正确) |

源文件: `interface_sdk-js/api/@ohos.multimedia.videoProcessingEngine.d.ts`, `framework/capi/image_processing/detail_enhance_napi_formal.cpp`

---

#### enhanceDetail(sourceImage, scale, level?)

异步细节增强 -- 按缩放比例。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sourceImage | `image.PixelMap` | 是 | 源图像 PixelMap |
| scale | `double` | 是 | 缩放比例 |
| level | `QualityLevel` | 否 | 质量等级，默认 LOW |

**返回值**: `Promise<image.PixelMap>`

**可抛出错误**: 801, 29200007, 29200009

源文件: `interface_sdk-js/api/@ohos.multimedia.videoProcessingEngine.d.ts`, `framework/capi/image_processing/detail_enhance_napi_formal.cpp`

---

#### enhanceDetailSync(sourceImage, width, height, level?)

同步细节增强 -- 按指定宽高缩放。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sourceImage | `image.PixelMap` | 是 | 源图像 PixelMap |
| width | `int` | 是 | 目标宽度 |
| height | `int` | 是 | 目标高度 |
| level | `QualityLevel` | 否 | 质量等级，默认 LOW |

**返回值**: `image.PixelMap` -- 成功返回目标 PixelMap，失败返回 `undefined`

**可抛出错误**: 801, 29200004 (处理超时), 29200007, 29200009

源文件: `interface_sdk-js/api/@ohos.multimedia.videoProcessingEngine.d.ts`, `framework/capi/image_processing/detail_enhance_napi_formal.cpp`

---

#### enhanceDetailSync(sourceImage, scale, level?)

同步细节增强 -- 按缩放比例。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sourceImage | `image.PixelMap` | 是 | 源图像 PixelMap |
| scale | `double` | 是 | 缩放比例 |
| level | `QualityLevel` | 否 | 质量等级，默认 LOW |

**返回值**: `image.PixelMap` 或 `undefined`

**可抛出错误**: 801, 29200004, 29200007, 29200009

源文件: `interface_sdk-js/api/@ohos.multimedia.videoProcessingEngine.d.ts`, `framework/capi/image_processing/detail_enhance_napi_formal.cpp`

---

### 1.3 模块函数

#### initializeEnvironment()

初始化全局图像处理环境。

**签名**: `function initializeEnvironment(): Promise<void>`

**返回值**: `Promise<void>`

**可抛出错误**:

| 错误码 | 说明 |
|--------|------|
| 801 | 设备能力不支持 |
| 29200002 | GPU 环境初始化失败 |
| 29200006 | 操作不被允许 (状态不正确) |
| 29200007 | 内存不足 |

**注意**: 当前 NAPI 实现直接返回 `true`，未实际调用底层 C API。

源文件: `interface_sdk-js/api/@ohos.multimedia.videoProcessingEngine.d.ts`

---

#### deinitializeEnvironment()

反初始化全局图像处理环境。

**签名**: `function deinitializeEnvironment(): Promise<void>`

**返回值**: `Promise<void>`

**可抛出错误**:

| 错误码 | 说明 |
|--------|------|
| 29200006 | 操作不被允许 |

源文件: `interface_sdk-js/api/@ohos.multimedia.videoProcessingEngine.d.ts`

---

#### create()

创建图像处理实例。

**签名**: `function create(): ImageProcessor`

**返回值**: `ImageProcessor` 实例，失败返回 `null`

**可抛出错误**:

| 错误码 | 说明 |
|--------|------|
| 801 | 设备能力不支持 |
| 29200003 | 创建实例失败 (如超出上限) |
| 29200007 | 内存不足 |

源文件: `interface_sdk-js/api/@ohos.multimedia.videoProcessingEngine.d.ts`

---

## 2. C Image Processing API

**头文件**: `interfaces/kits/c/image_processing.h`, `interfaces/kits/c/image_processing_types.h`
**库文件**: `libimage_processing.so`
**SysCap**: `SystemCapability.Multimedia.VideoProcessingEngine`
**Kit**: ImageKit
**Since**: 13

---

### 2.1 类型定义

#### ImageProcessing_ErrorCode

| 枚举值 | 数值 | 说明 |
|--------|------|------|
| IMAGE_PROCESSING_SUCCESS | 0 | 操作成功 |
| IMAGE_PROCESSING_ERROR_INVALID_PARAMETER | 401 | 输入参数无效 (缓冲区空/指针空/type不存在) |
| IMAGE_PROCESSING_ERROR_UNKNOWN | 29200001 | 未知错误 (GPU计算失败/memcpy失败) |
| IMAGE_PROCESSING_ERROR_INITIALIZE_FAILED | 29200002 | 全局环境初始化失败 (如GPU) |
| IMAGE_PROCESSING_ERROR_CREATE_FAILED | 29200003 | 创建实例失败 (如超出上限) |
| IMAGE_PROCESSING_ERROR_PROCESS_FAILED | 29200004 | 处理图像失败 (如超时) |
| IMAGE_PROCESSING_ERROR_UNSUPPORTED_PROCESSING | 29200005 | 不支持该处理操作 |
| IMAGE_PROCESSING_ERROR_OPERATION_NOT_PERMITTED | 29200006 | 操作不被允许 (状态不正确) |
| IMAGE_PROCESSING_ERROR_NO_MEMORY | 29200007 | 内存不足 |
| IMAGE_PROCESSING_ERROR_INVALID_INSTANCE | 29200008 | 实例无效 (指针为空) |
| IMAGE_PROCESSING_ERROR_INVALID_VALUE | 29200009 | 输入值无效 (宽高过大/色彩空间/档位) |

源文件: `interfaces/kits/c/image_processing_types.h`

#### 处理类型常量

| 常量 | 值 | 说明 |
|------|-----|------|
| IMAGE_PROCESSING_TYPE_COLOR_SPACE_CONVERSION | 0x1 | 色彩空间转换 |
| IMAGE_PROCESSING_TYPE_COMPOSITION | 0x2 | HDR 合成 (双层->单层) |
| IMAGE_PROCESSING_TYPE_DECOMPOSITION | 0x4 | HDR 分解 (单层->双层) |
| IMAGE_PROCESSING_TYPE_METADATA_GENERATION | 0x8 | HDR Vivid 元数据生成 |
| IMAGE_PROCESSING_TYPE_DETAIL_ENHANCER | 0x10 | 细节增强 |

源文件: `framework/capi/image_processing/image_processing.cpp`

#### ImageDetailEnhancer_QualityLevel

| 枚举值 | 数值 | 说明 |
|--------|------|------|
| IMAGE_DETAIL_ENHANCER_QUALITY_LEVEL_NONE | 0 | 不增强 |
| IMAGE_DETAIL_ENHANCER_QUALITY_LEVEL_LOW | 1 | 低质量，速度快 (**默认**) |
| IMAGE_DETAIL_ENHANCER_QUALITY_LEVEL_MEDIUM | 2 | 中等质量 |
| IMAGE_DETAIL_ENHANCER_QUALITY_LEVEL_HIGH | 3 | 高质量，速度慢 |

源文件: `interfaces/kits/c/image_processing_types.h`

#### ImageProcessing_ColorSpaceInfo

```c
typedef struct ImageProcessing_ColorSpaceInfo {
    int32_t metadataType;   // OH_Pixelmap_HdrMetadataKey
    int32_t colorSpace;     // ColorSpaceName
    int32_t pixelFormat;    // PIXEL_FORMAT
} ImageProcessing_ColorSpaceInfo;
```

源文件: `interfaces/kits/c/image_processing_types.h`

---

### 2.2 环境管理函数

#### OH_ImageProcessing_InitializeEnvironment

```c
ImageProcessing_ErrorCode OH_ImageProcessing_InitializeEnvironment(void);
```

**功能**: 初始化图像处理全局环境 (OpenCL + OpenGL)。可选调用，提前初始化可减少后续 Create 耗时。
**参数**: 无
**返回值**:
- `IMAGE_PROCESSING_SUCCESS` (0) -- 成功
- `IMAGE_PROCESSING_ERROR_INITIALIZE_FAILED` (29200002) -- GPU 环境初始化失败
- `IMAGE_PROCESSING_ERROR_UNSUPPORTED_PROCESSING` (29200005) -- OpenCL/OpenGL 不可用

**权限要求**: 无
**线程安全**: 是

源文件: `interfaces/kits/c/image_processing.h`, `framework/capi/image_processing/image_processing.cpp`

---

#### OH_ImageProcessing_DeinitializeEnvironment

```c
ImageProcessing_ErrorCode OH_ImageProcessing_DeinitializeEnvironment(void);
```

**功能**: 反初始化全局环境。需在所有实例销毁后调用。仅当调用过 `InitializeEnvironment` 后才可调用。
**参数**: 无
**返回值**:
- `IMAGE_PROCESSING_SUCCESS` -- 成功
- `IMAGE_PROCESSING_ERROR_OPERATION_NOT_PERMITTED` (29200006) -- 有实例未销毁或未调用过 Initialize

源文件: `interfaces/kits/c/image_processing.h`, `framework/capi/image_processing/image_processing.cpp`

---

### 2.3 能力查询函数

#### OH_ImageProcessing_IsColorSpaceConversionSupported

```c
bool OH_ImageProcessing_IsColorSpaceConversionSupported(
    const ImageProcessing_ColorSpaceInfo* sourceImageInfo,
    const ImageProcessing_ColorSpaceInfo* destinationImageInfo);
```

**功能**: 查询色彩空间转换是否支持。
**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| sourceImageInfo | `const ImageProcessing_ColorSpaceInfo*` | 输入色彩空间信息 |
| destinationImageInfo | `const ImageProcessing_ColorSpaceInfo*` | 输出色彩空间信息 |
**返回值**: `true` 支持 / `false` 不支持

源文件: `interfaces/kits/c/image_processing.h`

#### OH_ImageProcessing_IsCompositionSupported

```c
bool OH_ImageProcessing_IsCompositionSupported(
    const ImageProcessing_ColorSpaceInfo* sourceImageInfo,
    const ImageProcessing_ColorSpaceInfo* sourceGainmapInfo,
    const ImageProcessing_ColorSpaceInfo* destinationImageInfo);
```

**功能**: 查询 HDR 图像合成是否支持。
**返回值**: `true` / `false`

源文件: `interfaces/kits/c/image_processing.h`

#### OH_ImageProcessing_IsDecompositionSupported

```c
bool OH_ImageProcessing_IsDecompositionSupported(
    const ImageProcessing_ColorSpaceInfo* sourceImageInfo,
    const ImageProcessing_ColorSpaceInfo* destinationImageInfo,
    const ImageProcessing_ColorSpaceInfo* destinationGainmapInfo);
```

**功能**: 查询 HDR 图像分解是否支持。
**返回值**: `true` / `false`

源文件: `interfaces/kits/c/image_processing.h`

#### OH_ImageProcessing_IsMetadataGenerationSupported

```c
bool OH_ImageProcessing_IsMetadataGenerationSupported(
    const ImageProcessing_ColorSpaceInfo* sourceImageInfo);
```

**功能**: 查询元数据生成是否支持。
**返回值**: `true` / `false`

源文件: `interfaces/kits/c/image_processing.h`

---

### 2.4 实例管理函数

#### OH_ImageProcessing_Create

```c
ImageProcessing_ErrorCode OH_ImageProcessing_Create(
    OH_ImageProcessing** imageProcessor, int32_t type);
```

**功能**: 创建图像处理实例。type 决定处理能力，创建后不可更改。
**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| imageProcessor | `OH_ImageProcessing**` | 输出参数，调用前 `*imageProcessor` 必须为 nullptr |
| type | `int32_t` | IMAGE_PROCESSING_TYPE_* 常量 |

**返回值**:
- `IMAGE_PROCESSING_SUCCESS` -- 成功
- `IMAGE_PROCESSING_ERROR_INVALID_PARAMETER` (401) -- type 无效
- `IMAGE_PROCESSING_ERROR_UNSUPPORTED_PROCESSING` (29200005) -- 设备不支持
- `IMAGE_PROCESSING_ERROR_CREATE_FAILED` (29200003) -- 创建失败
- `IMAGE_PROCESSING_ERROR_INVALID_INSTANCE` (29200008) -- 指针无效
- `IMAGE_PROCESSING_ERROR_NO_MEMORY` (29200007) -- 内存不足

**分发规则**:
| type | 创建的 Native 类 |
|------|-----------------|
| DETAIL_ENHANCER (0x10) | DetailEnhancerImageNative |
| COLOR_SPACE_CONVERSION (0x1) | ColorspaceConverterImageNative |
| COMPOSITION (0x2) | ColorspaceConverterImageNative |
| DECOMPOSITION (0x4) | ColorspaceConverterImageNative |
| METADATA_GENERATION (0x8) | MetadataGeneratorImageNative |

源文件: `interfaces/kits/c/image_processing.h`, `framework/capi/image_processing/image_processing_impl.cpp`, `framework/capi/image_processing/image_processing_factory.cpp`

---

#### OH_ImageProcessing_Destroy

```c
ImageProcessing_ErrorCode OH_ImageProcessing_Destroy(OH_ImageProcessing* imageProcessor);
```

**功能**: 销毁图像处理实例。建议销毁后将指针置 nullptr。
**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| imageProcessor | `OH_ImageProcessing*` | 要销毁的实例指针 |
**返回值**:
- `IMAGE_PROCESSING_SUCCESS` -- 成功
- `IMAGE_PROCESSING_ERROR_INVALID_INSTANCE` (29200008) -- 指针无效

源文件: `interfaces/kits/c/image_processing.h`, `framework/capi/image_processing/image_processing_impl.cpp`

---

### 2.5 参数管理函数

#### OH_ImageProcessing_SetParameter

```c
ImageProcessing_ErrorCode OH_ImageProcessing_SetParameter(
    OH_ImageProcessing* imageProcessor, const OH_AVFormat* parameter);
```

**功能**: 设置图像处理参数。通过 OH_AVFormat 的键值对传递。
**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| imageProcessor | `OH_ImageProcessing*` | 实例指针 |
| parameter | `const OH_AVFormat*` | 参数 (键: `IMAGE_DETAIL_ENHANCER_PARAMETER_KEY_QUALITY_LEVEL`) |
**返回值**:
- `IMAGE_PROCESSING_SUCCESS` -- 成功
- `IMAGE_PROCESSING_ERROR_INVALID_INSTANCE` (29200008)
- `IMAGE_PROCESSING_ERROR_INVALID_PARAMETER` (401)
- `IMAGE_PROCESSING_ERROR_INVALID_VALUE` (29200009) -- 参数键/值无效
- `IMAGE_PROCESSING_ERROR_NO_MEMORY` (29200007)

源文件: `interfaces/kits/c/image_processing.h`, `framework/capi/image_processing/image_processing.cpp`

---

#### OH_ImageProcessing_GetParameter

```c
ImageProcessing_ErrorCode OH_ImageProcessing_GetParameter(
    OH_ImageProcessing* imageProcessor, OH_AVFormat* parameter);
```

**功能**: 获取当前参数设置。
**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| imageProcessor | `OH_ImageProcessing*` | 实例指针 |
| parameter | `OH_AVFormat*` | 输出参数 |
**返回值**:
- `IMAGE_PROCESSING_SUCCESS` -- 成功
- `IMAGE_PROCESSING_ERROR_INVALID_INSTANCE` (29200008)
- `IMAGE_PROCESSING_ERROR_INVALID_PARAMETER` (401)

源文件: `interfaces/kits/c/image_processing.h`

---

### 2.6 图像处理函数

#### OH_ImageProcessing_ConvertColorSpace

```c
ImageProcessing_ErrorCode OH_ImageProcessing_ConvertColorSpace(
    OH_ImageProcessing* imageProcessor,
    OH_PixelmapNative* sourceImage,
    OH_PixelmapNative* destinationImage);
```

**功能**: 色彩空间转换 (HDR->SDR, SDR->HDR, SDR->SDR, HDR->HDR)。
**前提**: 实例需以 `IMAGE_PROCESSING_TYPE_COLOR_SPACE_CONVERSION` 类型创建。
**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| imageProcessor | `OH_ImageProcessing*` | 实例指针 |
| sourceImage | `OH_PixelmapNative*` | 输入图像 |
| destinationImage | `OH_PixelmapNative*` | 输出图像 (需预分配) |
**返回值**: SUCCESS / INVALID_INSTANCE / INVALID_PARAMETER / INVALID_VALUE / UNSUPPORTED / PROCESS_FAILED / NO_MEMORY

源文件: `interfaces/kits/c/image_processing.h`, `framework/capi/image_processing/image_processing.cpp`

---

#### OH_ImageProcessing_Compose

```c
ImageProcessing_ErrorCode OH_ImageProcessing_Compose(
    OH_ImageProcessing* imageProcessor,
    OH_PixelmapNative* sourceImage,
    OH_PixelmapNative* sourceGainmap,
    OH_PixelmapNative* destinationImage);
```

**功能**: HDR 合成 -- 从双层 (image + gainmap) 到单层 HDR。
**前提**: 实例需以 `IMAGE_PROCESSING_TYPE_COMPOSITION` 类型创建。
**返回值**: 同 ConvertColorSpace

源文件: `interfaces/kits/c/image_processing.h`

---

#### OH_ImageProcessing_Decompose

```c
ImageProcessing_ErrorCode OH_ImageProcessing_Decompose(
    OH_ImageProcessing* imageProcessor,
    OH_PixelmapNative* sourceImage,
    OH_PixelmapNative* destinationImage,
    OH_PixelmapNative* destinationGainmap);
```

**功能**: HDR 分解 -- 从单层到双层 (image + gainmap)。
**前提**: 实例需以 `IMAGE_PROCESSING_TYPE_DECOMPOSITION` 类型创建。
**返回值**: 同 ConvertColorSpace

源文件: `interfaces/kits/c/image_processing.h`

---

#### OH_ImageProcessing_GenerateMetadata

```c
ImageProcessing_ErrorCode OH_ImageProcessing_GenerateMetadata(
    OH_ImageProcessing* imageProcessor,
    OH_PixelmapNative* sourceImage);
```

**功能**: 生成 HDR Vivid 元数据。
**前提**: 实例需以 `IMAGE_PROCESSING_TYPE_METADATA_GENERATION` 类型创建。
**返回值**: 同 ConvertColorSpace

源文件: `interfaces/kits/c/image_processing.h`

---

#### OH_ImageProcessing_EnhanceDetail

```c
ImageProcessing_ErrorCode OH_ImageProcessing_EnhanceDetail(
    OH_ImageProcessing* imageProcessor,
    OH_PixelmapNative* sourceImage,
    OH_PixelmapNative* destinationImage);
```

**功能**: 图像细节增强。根据 sourceImage 和 destinationImage 预设的尺寸进行缩放，质量等级由 SetParameter 设定。
**前提**: 实例需以 `IMAGE_PROCESSING_TYPE_DETAIL_ENHANCER` 类型创建。
**返回值**: 同 ConvertColorSpace

源文件: `interfaces/kits/c/image_processing.h`

---

## 3. C Video Processing API

**头文件**: `interfaces/kits/c/video_processing.h`, `interfaces/kits/c/video_processing_types.h`
**库文件**: `libvideo_processing.so`
**SysCap**: `SystemCapability.Multimedia.VideoProcessingEngine`
**Kit**: MediaKit
**Since**: 12

---

### 3.1 类型定义

#### VideoProcessing_ErrorCode

| 枚举值 | 数值 | 说明 |
|--------|------|------|
| VIDEO_PROCESSING_SUCCESS | 0 | 操作成功 |
| VIDEO_PROCESSING_ERROR_INVALID_PARAMETER | 401 | 输入参数无效 |
| VIDEO_PROCESSING_ERROR_UNKNOWN | 29210001 | 未知错误 |
| VIDEO_PROCESSING_ERROR_INITIALIZE_FAILED | 29210002 | 全局环境初始化失败 |
| VIDEO_PROCESSING_ERROR_CREATE_FAILED | 29210003 | 创建实例失败 |
| VIDEO_PROCESSING_ERROR_PROCESS_FAILED | 29210004 | 处理视频失败 |
| VIDEO_PROCESSING_ERROR_UNSUPPORTED_PROCESSING | 29210005 | 不支持该处理操作 |
| VIDEO_PROCESSING_ERROR_OPERATION_NOT_PERMITTED | 29210006 | 操作不被允许 |
| VIDEO_PROCESSING_ERROR_NO_MEMORY | 29210007 | 内存不足 |
| VIDEO_PROCESSING_ERROR_INVALID_INSTANCE | 29210008 | 实例无效 |
| VIDEO_PROCESSING_ERROR_INVALID_VALUE | 29210009 | 输入值无效 |

源文件: `interfaces/kits/c/video_processing_types.h`

#### 处理类型常量

| 常量 | 值 | 说明 |
|------|-----|------|
| VIDEO_PROCESSING_TYPE_COLOR_SPACE_CONVERSION | 0x1 | 色彩空间转换 |
| VIDEO_PROCESSING_TYPE_METADATA_GENERATION | 0x2 | 元数据生成 |
| VIDEO_PROCESSING_TYPE_DETAIL_ENHANCER | 0x4 | 细节增强 |

源文件: `framework/capi/video_processing/video_processing.cpp`

#### VideoDetailEnhancer_QualityLevel

| 枚举值 | 数值 | 说明 |
|--------|------|------|
| VIDEO_DETAIL_ENHANCER_QUALITY_LEVEL_NONE | 0 | 不增强 |
| VIDEO_DETAIL_ENHANCER_QUALITY_LEVEL_LOW | 1 | 低质量 (**默认**) |
| VIDEO_DETAIL_ENHANCER_QUALITY_LEVEL_MEDIUM | 2 | 中等质量 |
| VIDEO_DETAIL_ENHANCER_QUALITY_LEVEL_HIGH | 3 | 高质量 |

源文件: `interfaces/kits/c/video_processing_types.h`

#### VideoMetadataGeneratorStyleControl

| 枚举值 | 数值 | 说明 |
|--------|------|------|
| VIDEO_METADATA_GENERATOR_CONTRAST_MODE | 0 | 对比度模式 |
| VIDEO_METADATA_GENERATOR_BRIGHT_MODE | 1 | 亮度模式 |

源文件: `interfaces/kits/c/video_processing_types.h` (since 22)

#### VideoProcessing_State

| 枚举值 | 说明 |
|--------|------|
| VIDEO_PROCESSING_STATE_RUNNING | 视频处理运行中 |
| VIDEO_PROCESSING_STATE_STOPPED | 视频处理已停止 |

源文件: `interfaces/kits/c/video_processing_types.h`

#### 回调函数类型

```c
typedef void (*OH_VideoProcessingCallback_OnError)(
    OH_VideoProcessing* videoProcessor,
    VideoProcessing_ErrorCode error, void* userData);

typedef void (*OH_VideoProcessingCallback_OnState)(
    OH_VideoProcessing* videoProcessor,
    VideoProcessing_State state, void* userData);

typedef void (*OH_VideoProcessingCallback_OnNewOutputBuffer)(
    OH_VideoProcessing* videoProcessor,
    uint32_t index, void* userData);
```

源文件: `interfaces/kits/c/video_processing_types.h`

#### VideoProcessing_ColorSpaceInfo

```c
typedef struct VideoProcessing_ColorSpaceInfo {
    int32_t metadataType;   // OH_NativeBuffer_MetadataType
    int32_t colorSpace;     // OH_NativeBuffer_ColorSpace
    int32_t pixelFormat;    // OH_NativeBuffer_Format
} VideoProcessing_ColorSpaceInfo;
```

源文件: `interfaces/kits/c/video_processing_types.h`

---

### 3.2 环境管理函数

#### OH_VideoProcessing_InitializeEnvironment

```c
VideoProcessing_ErrorCode OH_VideoProcessing_InitializeEnvironment(void);
```

**功能**: 初始化视频处理全局环境。可选调用。
**返回值**:
- `VIDEO_PROCESSING_SUCCESS` (0) -- 成功
- `VIDEO_PROCESSING_ERROR_INITIALIZE_FAILED` (29210002) -- 初始化失败

源文件: `interfaces/kits/c/video_processing.h`, `framework/capi/video_processing/video_processing.cpp`

---

#### OH_VideoProcessing_DeinitializeEnvironment

```c
VideoProcessing_ErrorCode OH_VideoProcessing_DeinitializeEnvironment(void);
```

**功能**: 反初始化全局环境。所有实例销毁后才可调用。
**返回值**:
- `VIDEO_PROCESSING_SUCCESS` -- 成功
- `VIDEO_PROCESSING_ERROR_OPERATION_NOT_PERMITTED` (29210006) -- 有实例未销毁

源文件: `interfaces/kits/c/video_processing.h`

---

### 3.3 能力查询函数

#### OH_VideoProcessing_IsColorSpaceConversionSupported

```c
bool OH_VideoProcessing_IsColorSpaceConversionSupported(
    const VideoProcessing_ColorSpaceInfo* sourceVideoInfo,
    const VideoProcessing_ColorSpaceInfo* destinationVideoInfo);
```

源文件: `interfaces/kits/c/video_processing.h`

#### OH_VideoProcessing_IsMetadataGenerationSupported

```c
bool OH_VideoProcessing_IsMetadataGenerationSupported(
    const VideoProcessing_ColorSpaceInfo* sourceVideoInfo);
```

源文件: `interfaces/kits/c/video_processing.h`

---

### 3.4 实例管理函数

#### OH_VideoProcessing_Create

```c
VideoProcessing_ErrorCode OH_VideoProcessing_Create(
    OH_VideoProcessing** videoProcessor, int type);
```

**功能**: 创建视频处理实例。
**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| videoProcessor | `OH_VideoProcessing**` | 输出参数，调用前须为 nullptr |
| type | `int` | VIDEO_PROCESSING_TYPE_* 常量 |

**返回值**:
- `VIDEO_PROCESSING_SUCCESS` -- 成功
- `VIDEO_PROCESSING_ERROR_INVALID_PARAMETER` (401) -- type 无效
- `VIDEO_PROCESSING_ERROR_UNSUPPORTED_PROCESSING` (29210005) -- 设备不支持
- `VIDEO_PROCESSING_ERROR_CREATE_FAILED` (29210003)
- `VIDEO_PROCESSING_ERROR_INVALID_INSTANCE` (29210008)
- `VIDEO_PROCESSING_ERROR_NO_MEMORY` (29210007)

**分发规则**:
| type | 创建的 Native 类 |
|------|-----------------|
| DETAIL_ENHANCER (0x4) | DetailEnhancerVideoNative |
| COLOR_SPACE_CONVERSION (0x1) | ColorSpaceConverterVideoNative |
| METADATA_GENERATION (0x2) | MetadataGeneratorVideoNative |

源文件: `interfaces/kits/c/video_processing.h`, `framework/capi/video_processing/video_processing_impl.cpp`, `framework/capi/video_processing/video_processing_factory.cpp`

---

#### OH_VideoProcessing_Destroy

```c
VideoProcessing_ErrorCode OH_VideoProcessing_Destroy(OH_VideoProcessing* videoProcessor);
```

**功能**: 销毁视频处理实例。需先 Stop。
**返回值**:
- `VIDEO_PROCESSING_SUCCESS`
- `VIDEO_PROCESSING_ERROR_INVALID_INSTANCE` (29210008)
- `VIDEO_PROCESSING_ERROR_OPERATION_NOT_PERMITTED` (29210006) -- 实例仍在运行

源文件: `interfaces/kits/c/video_processing.h`, `framework/capi/video_processing/video_processing_impl.cpp`

---

### 3.5 回调管理函数

#### OH_VideoProcessing_RegisterCallback

```c
VideoProcessing_ErrorCode OH_VideoProcessing_RegisterCallback(
    OH_VideoProcessing* videoProcessor,
    const VideoProcessing_Callback* callback, void* userData);
```

**功能**: 注册回调对象。需在 Start 之前调用。
**前提**: 实例未在运行状态
**返回值**:
- `VIDEO_PROCESSING_SUCCESS`
- `VIDEO_PROCESSING_ERROR_INVALID_INSTANCE` (29210008)
- `VIDEO_PROCESSING_ERROR_INVALID_PARAMETER` (401) -- callback 为空
- `VIDEO_PROCESSING_ERROR_OPERATION_NOT_PERMITTED` (29210006) -- 实例运行中

源文件: `interfaces/kits/c/video_processing.h`, `framework/capi/video_processing/video_processing.cpp`

---

#### OH_VideoProcessingCallback_Create

```c
VideoProcessing_ErrorCode OH_VideoProcessingCallback_Create(
    VideoProcessing_Callback** callback);
```

**功能**: 创建回调对象。
**返回值**:
- `VIDEO_PROCESSING_SUCCESS`
- `VIDEO_PROCESSING_ERROR_INVALID_PARAMETER` (401) -- callback 为空或 *callback 非空
- `VIDEO_PROCESSING_ERROR_NO_MEMORY` (29210007)

源文件: `interfaces/kits/c/video_processing.h`, `framework/capi/video_processing/video_processing_callback_impl.cpp`

---

#### OH_VideoProcessingCallback_Destroy

```c
VideoProcessing_ErrorCode OH_VideoProcessingCallback_Destroy(
    VideoProcessing_Callback* callback);
```

**功能**: 销毁回调对象。注册到实例后即可销毁。
**返回值**:
- `VIDEO_PROCESSING_SUCCESS`
- `VIDEO_PROCESSING_ERROR_INVALID_PARAMETER` (401)

源文件: `interfaces/kits/c/video_processing.h`

---

#### OH_VideoProcessingCallback_BindOnError / BindOnState / BindOnNewOutputBuffer

```c
VideoProcessing_ErrorCode OH_VideoProcessingCallback_BindOnError(
    VideoProcessing_Callback* callback,
    OH_VideoProcessingCallback_OnError onError);

VideoProcessing_ErrorCode OH_VideoProcessingCallback_BindOnState(
    VideoProcessing_Callback* callback,
    OH_VideoProcessingCallback_OnState onState);

VideoProcessing_ErrorCode OH_VideoProcessingCallback_BindOnNewOutputBuffer(
    VideoProcessing_Callback* callback,
    OH_VideoProcessingCallback_OnNewOutputBuffer onNewOutputBuffer);
```

**功能**: 分别绑定错误、状态变更、新输出缓冲区回调函数。
**返回值**:
- `VIDEO_PROCESSING_SUCCESS`
- `VIDEO_PROCESSING_ERROR_INVALID_PARAMETER` (401) -- callback 或函数指针为空

源文件: `interfaces/kits/c/video_processing.h`, `framework/capi/video_processing/video_processing_callback_impl.cpp`

---

### 3.6 Surface 管理函数

#### OH_VideoProcessing_SetSurface

```c
VideoProcessing_ErrorCode OH_VideoProcessing_SetSurface(
    OH_VideoProcessing* videoProcessor, const OHNativeWindow* window);
```

**功能**: 设置输出 Surface。需在 Start 之前设置。
**返回值**:
- `VIDEO_PROCESSING_SUCCESS`
- `VIDEO_PROCESSING_ERROR_INVALID_INSTANCE` (29210008)
- `VIDEO_PROCESSING_ERROR_INVALID_PARAMETER` (401) -- window 为空

源文件: `interfaces/kits/c/video_processing.h`

---

#### OH_VideoProcessing_GetSurface

```c
VideoProcessing_ErrorCode OH_VideoProcessing_GetSurface(
    OH_VideoProcessing* videoProcessor, OHNativeWindow** window);
```

**功能**: 创建输入 Surface。需在 Start 之前创建。通过 `OH_NativeWindow_DestroyNativeWindow` 销毁。
**返回值**:
- `VIDEO_PROCESSING_SUCCESS`
- `VIDEO_PROCESSING_ERROR_INVALID_INSTANCE` (29210008)
- `VIDEO_PROCESSING_ERROR_INVALID_PARAMETER` (401) -- window 为空或 *window 非空
- `VIDEO_PROCESSING_ERROR_OPERATION_NOT_PERMITTED` (29210006) -- Surface 已创建或实例运行中

源文件: `interfaces/kits/c/video_processing.h`

---

### 3.7 参数管理函数

#### OH_VideoProcessing_SetParameter / GetParameter

```c
VideoProcessing_ErrorCode OH_VideoProcessing_SetParameter(
    OH_VideoProcessing* videoProcessor, const OH_AVFormat* parameter);

VideoProcessing_ErrorCode OH_VideoProcessing_GetParameter(
    OH_VideoProcessing* videoProcessor, OH_AVFormat* parameter);
```

**功能**: 设置/获取视频处理参数。
**参数键**:
| Key | 类型 | 说明 |
|-----|------|------|
| `VIDEO_DETAIL_ENHANCER_PARAMETER_KEY_QUALITY_LEVEL` (`"QualityLevel"`) | int | 细节增强质量等级 |
| `VIDEO_METADATA_GENERATOR_STYLE_CONTROL` (`"StyleControl"`) | int | 元数据生成风格控制 (since 22) |

**返回值**: 同 Image API 的 SetParameter/GetParameter

源文件: `interfaces/kits/c/video_processing.h`, `framework/capi/video_processing/video_processing.cpp`

---

### 3.8 流程控制函数

#### OH_VideoProcessing_Start

```c
VideoProcessing_ErrorCode OH_VideoProcessing_Start(OH_VideoProcessing* videoProcessor);
```

**功能**: 启动视频处理。成功后回调报告 `VIDEO_PROCESSING_STATE_RUNNING`。
**前提**: 输出 Surface 已设置、输入 Surface 已创建、回调已注册。
**返回值**:
- `VIDEO_PROCESSING_SUCCESS`
- `VIDEO_PROCESSING_ERROR_INVALID_INSTANCE` (29210008)
- `VIDEO_PROCESSING_ERROR_OPERATION_NOT_PERMITTED` (29210006) -- Surface 未设置/未创建或已在运行

源文件: `interfaces/kits/c/video_processing.h`

---

#### OH_VideoProcessing_Stop

```c
VideoProcessing_ErrorCode OH_VideoProcessing_Stop(OH_VideoProcessing* videoProcessor);
```

**功能**: 停止视频处理。处理完缓存的 buffer 后回调报告 `VIDEO_PROCESSING_STATE_STOPPED`。
**返回值**:
- `VIDEO_PROCESSING_SUCCESS`
- `VIDEO_PROCESSING_ERROR_INVALID_INSTANCE` (29210008)
- `VIDEO_PROCESSING_ERROR_OPERATION_NOT_PERMITTED` (29210006) -- 已停止

源文件: `interfaces/kits/c/video_processing.h`

---

#### OH_VideoProcessing_RenderOutputBuffer

```c
VideoProcessing_ErrorCode OH_VideoProcessing_RenderOutputBuffer(
    OH_VideoProcessing* videoProcessor, uint32_t index);
```

**功能**: 渲染输出缓冲区。在 `OnNewOutputBuffer` 回调中获取 index 后调用。
**返回值**:
- `VIDEO_PROCESSING_SUCCESS`
- `VIDEO_PROCESSING_ERROR_INVALID_INSTANCE` (29210008)
- `VIDEO_PROCESSING_ERROR_INVALID_PARAMETER` (401) -- index 无效
- `VIDEO_PROCESSING_ERROR_OPERATION_NOT_PERMITTED` (29210006) -- OnNewOutputBuffer 未注册或已停止

源文件: `interfaces/kits/c/video_processing.h`

---

## 4. 内部算法错误码

以下错误码定义在内部接口中，不出现在公共 API 层，但在日志和内部处理中使用。

| 错误码 | 名称 | 说明 | 源文件 |
|--------|------|------|--------|
| VPE_ALGO_ERR_OK | 操作成功 | ERR_OK | `interfaces/inner_api/algorithm_errors.h` |
| VPE_ALGO_ERR_NO_MEMORY | 内存不足 | 基于 ENOMEM | 同上 |
| VPE_ALGO_ERR_INVALID_OPERATION | 操作不被允许 | 基于 ENOSYS | 同上 |
| VPE_ALGO_ERR_INVALID_VAL | 参数无效 | 基于 EINVAL | 同上 |
| VPE_ALGO_ERR_UNKNOWN | 未知错误 | OFFSET + 0x200 | 同上 |
| VPE_ALGO_ERR_INIT_FAILED | 初始化失败 | -- | 同上 |
| VPE_ALGO_ERR_EXTENSION_NOT_FOUND | 插件未找到 | -- | 同上 |
| VPE_ALGO_ERR_EXTENSION_INIT_FAILED | 插件初始化失败 | -- | 同上 |
| VPE_ALGO_ERR_EXTENSION_PROCESS_FAILED | 插件处理失败 | -- | 同上 |
| VPE_ALGO_ERR_NOT_IMPLEMENTED | 插件未实现 | -- | 同上 |
| VPE_ALGO_ERR_OPERATION_NOT_SUPPORTED | 不支持的操作 | -- | 同上 |
| VPE_ALGO_ERR_INVALID_STATE | 状态不支持 | -- | 同上 |
| VPE_ALGO_ERR_INVALID_PARAM | 参数无效 | -- | 同上 |

错误码模块: `VPE_ALGO_MODULE = 11`，偏移基于 `ErrCodeOffset(SUBSYS_MULTIMEDIA, 11)`。

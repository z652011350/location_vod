# VPE 故障排查指南

本文档汇总 VPE (Video Processing Engine) 模块的常见故障场景、错误码含义和排查思路。

---

## 1. 错误码速查表

### 1.1 图像处理错误码 (ImageProcessing_ErrorCode)

| 错误码 | 常量名 | 典型触发场景 |
|--------|--------|-------------|
| 401 | IMAGE_PROCESSING_ERROR_INVALID_PARAMETER | 传入空指针、type 不存在、图像缓冲区为空 |
| 29200001 | IMAGE_PROCESSING_ERROR_UNKNOWN | GPU 计算失败、memcpy 失败 |
| 29200002 | IMAGE_PROCESSING_ERROR_INITIALIZE_FAILED | GPU 环境初始化失败 |
| 29200003 | IMAGE_PROCESSING_ERROR_CREATE_FAILED | 实例数量超出上限 |
| 29200004 | IMAGE_PROCESSING_ERROR_PROCESS_FAILED | 图像处理超时、算法内部错误 |
| 29200005 | IMAGE_PROCESSING_ERROR_UNSUPPORTED_PROCESSING | 设备不支持该处理类型 |
| 29200006 | IMAGE_PROCESSING_ERROR_OPERATION_NOT_PERMITTED | 状态不正确 (如未初始化就反初始化) |
| 29200007 | IMAGE_PROCESSING_ERROR_NO_MEMORY | 内存不足 |
| 29200008 | IMAGE_PROCESSING_ERROR_INVALID_INSTANCE | 实例指针为空或已损坏 |
| 29200009 | IMAGE_PROCESSING_ERROR_INVALID_VALUE | 图像宽高过大、色彩空间不正确、参数值无效 |

源文件: `interfaces/kits/c/image_processing_types.h`

### 1.2 视频处理错误码 (VideoProcessing_ErrorCode)

| 错误码 | 常量名 | 典型触发场景 |
|--------|--------|-------------|
| 401 | VIDEO_PROCESSING_ERROR_INVALID_PARAMETER | 传入空指针、type 不存在、视频缓冲区为空 |
| 29210001 | VIDEO_PROCESSING_ERROR_UNKNOWN | GPU 计算失败、memcpy 失败 |
| 29210002 | VIDEO_PROCESSING_ERROR_INITIALIZE_FAILED | GPU 环境初始化失败 |
| 29210003 | VIDEO_PROCESSING_ERROR_CREATE_FAILED | 实例数量超出上限 |
| 29210004 | VIDEO_PROCESSING_ERROR_PROCESS_FAILED | 视频处理超时 |
| 29210005 | VIDEO_PROCESSING_ERROR_UNSUPPORTED_PROCESSING | 设备不支持该处理类型 |
| 29210006 | VIDEO_PROCESSING_ERROR_OPERATION_NOT_PERMITTED | 状态不正确 (如在运行中 Destroy) |
| 29210007 | VIDEO_PROCESSING_ERROR_NO_MEMORY | 内存不足 |
| 29210008 | VIDEO_PROCESSING_ERROR_INVALID_INSTANCE | 实例指针为空或已损坏 |
| 29210009 | VIDEO_PROCESSING_ERROR_INVALID_VALUE | 视频宽高过大、色彩空间不正确、参数值无效 |

源文件: `interfaces/kits/c/video_processing_types.h`

### 1.3 JS API 错误码

| 错误码 | 说明 | 影响函数 |
|--------|------|----------|
| 801 | 设备能力不支持 | create, initializeEnvironment, enhanceDetail, enhanceDetailSync |
| 29200002 | 环境初始化失败 | initializeEnvironment |
| 29200003 | 创建实例失败 | create |
| 29200004 | 处理失败 (超时) | enhanceDetailSync |
| 29200006 | 操作不被允许 | initializeEnvironment, deinitializeEnvironment |
| 29200007 | 内存不足 | create, enhanceDetail, enhanceDetailSync |
| 29200009 | 输入值无效 | enhanceDetail, enhanceDetailSync |

源文件: `interface_sdk-js/api/@ohos.multimedia.videoProcessingEngine.d.ts`

---

## 2. 常见故障场景与排查思路

### 场景 1: OH_ImageProcessing_Create 返回 29200005 (UNSUPPORTED_PROCESSING)

**症状**: 调用 `OH_ImageProcessing_Create` 时，传入 `IMAGE_PROCESSING_TYPE_COLOR_SPACE_CONVERSION` 等类型，返回 `IMAGE_PROCESSING_ERROR_UNSUPPORTED_PROCESSING`。

**根因分析**:
1. 设备缺少厂商算法扩展库 `libvideoprocessingengine_ext.z.so`
2. Factory 的 `IsValid()` 方法检测到 ext 库不存在时，仅允许 `DETAIL_ENHANCER` 类型

**排查步骤**:
1. 检查设备上是否存在 `/system/lib64/libvideoprocessingengine_ext.z.so`
2. 调用 `OH_ImageProcessing_IsColorSpaceConversionSupported()` 等能力查询接口确认
3. 查看日志中是否有 `dlopen libvideoprocessingengine_ext failed` 的错误信息

**关键源文件**:
- `framework/capi/image_processing/image_processing_factory.cpp` -- `IsValid()` 方法检查 ext 库
- `framework/algorithm/extension_manager/extension_manager.cpp` -- `dlopen` 扩展库

**修复方案**:
- 确认设备固件中包含厂商扩展库
- 若设备不支持，改用 `IMAGE_PROCESSING_TYPE_DETAIL_ENHANCER` 类型
- 在调用 Create 前先调用 `IsXXXSupported()` 查询能力

---

### 场景 2: OH_ImageProcessing_InitializeEnvironment 返回 29200002 (INITIALIZE_FAILED)

**症状**: 环境初始化失败。

**根因分析**:
1. GPU (OpenCL 或 OpenGL) 环境初始化失败
2. GPU 驱动异常或 GPU 资源被占用

**排查步骤**:
1. 查看 hilog 日志，搜索 LOG_DOMAIN `0xD002B3F` (VPE 模块)
2. 检查日志中是否有 `OpenCLInit failed` 或 `OpenGLInit failed` 信息
3. 检查 GPU 驱动是否正常加载

**关键源文件**:
- `framework/capi/image_processing/image_processing.cpp` -- `OH_ImageProcessing_InitializeEnvironment()` 中依次调用 `OpenCLInit()` 和 `OpenGLInit()`
- `framework/capi/image_processing/image_processing_capi_capability.cpp` -- CAPI 能力初始化
- `framework/capi/image_processing/image_environment_native.cpp` -- 环境管理

**修复方案**:
- 检查 GPU 驱动状态，必要时重启设备
- 确认无其他进程占用 GPU 资源
- 环境初始化是可选的，可以跳过直接 Create (首次 Create 会自动初始化)

---

### 场景 3: OH_ImageProcessing_Create 返回 29200003 (CREATE_FAILED)

**症状**: 创建图像处理实例失败。

**根因分析**:
1. 实例数量超出上限
2. 内存不足
3. Native 对象构造失败

**排查步骤**:
1. 检查当前进程是否已创建过多实例
2. 查看日志中 `VPE image processing constructor failed!` 或 `VPE image processing out of memory!`
3. 检查内存使用情况

**关键源文件**:
- `framework/capi/image_processing/image_processing_impl.cpp` -- `Create()` 方法中的错误路径

**修复方案**:
- 销毁不再使用的实例后再创建新实例
- 降低内存压力 (减小图像尺寸)
- 检查是否需要先调用 `InitializeEnvironment()`

---

### 场景 4: OH_ImageProcessing_EnhanceDetail 返回 29200009 (INVALID_VALUE)

**症状**: 细节增强处理返回输入值无效错误。

**根因分析**:
1. 图像宽高超出支持范围 [32, 8192]
2. 色彩空间不正确
3. 未设置质量等级参数 (QualityLevel)
4. 质量等级值无效

**排查步骤**:
1. 确认源图像和目标图像的分辨率在 [32, 8192] 范围内
2. 确认色彩空间设置正确
3. 确认已通过 `OH_ImageProcessing_SetParameter()` 设置了 `QualityLevel`
4. 确认 `QualityLevel` 值在 0-3 范围内

**关键源文件**:
- `framework/capi/image_processing/detail_enhance_napi_formal.cpp` -- NAPI 层参数校验 (MIN_RESOLUTION_DETAIL=32, MAX_RESOLUTION_DETAIL=8192)
- `interfaces/kits/c/image_processing_types.h` -- ImageDetailEnhancer_QualityLevel 定义

**修复方案**:
- 将图像分辨率调整到 [32, 8192] 范围内
- 在处理前调用 `SetParameter()` 设置有效的 QualityLevel
- 检查图像的色彩空间格式

---

### 场景 5: OH_VideoProcessing_Start 返回 29210006 (OPERATION_NOT_PERMITTED)

**症状**: 视频处理启动失败。

**根因分析**:
1. 输出 Surface 未设置 (`SetSurface` 未调用)
2. 输入 Surface 未创建 (`GetSurface` 未调用)
3. 回调未注册
4. 实例已在运行状态

**排查步骤**:
1. 确认调用 Start 前已完成以下步骤:
   - `OH_VideoProcessing_SetSurface()` -- 设置输出 Surface
   - `OH_VideoProcessing_GetSurface()` -- 创建输入 Surface
   - `OH_VideoProcessing_RegisterCallback()` -- 注册回调 (推荐)
2. 确认实例未已在运行

**关键源文件**:
- `framework/capi/video_processing/video_processing.cpp` -- `OH_VideoProcessing_Start()` 的前置检查
- `framework/capi/video_processing/video_processing_native_base.cpp` -- Native 基类的状态检查

**修复方案**:
- 严格按照生命周期调用: Create -> RegisterCallback -> SetSurface -> GetSurface -> SetParameter -> Start
- 确保 Start 前所有必要条件满足

---

### 场景 6: OH_VideoProcessing_Destroy 返回 29210006 (OPERATION_NOT_PERMITTED)

**症状**: 无法销毁视频处理实例。

**根因分析**: 实例仍在运行状态，必须先 Stop 才能 Destroy。

**排查步骤**:
1. 确认是否调用了 `OH_VideoProcessing_Stop()`
2. 确认是否收到了 `VIDEO_PROCESSING_STATE_STOPPED` 回调

**关键源文件**:
- `framework/capi/video_processing/video_processing_impl.cpp` -- `Destroy()` 方法检查运行状态

**修复方案**:
- 先调用 `Stop()` 等待 STOPPED 回调后再 `Destroy()`

---

### 场景 7: JS API enhanceDetailSync 抛出 29200004 (PROCESS_FAILED)

**症状**: 同步增强处理超时。

**根因分析**:
1. 图像过大导致处理时间过长
2. GPU 资源繁忙
3. 算法内部错误

**排查步骤**:
1. 尝试降低图像分辨率
2. 尝试降低质量等级 (使用 LOW 代替 HIGH)
3. 查看 hilog 日志中的 VPE 错误信息

**关键源文件**:
- `framework/capi/image_processing/detail_enhance_napi_formal.cpp` -- 同步处理调用路径

**修复方案**:
- 减小图像分辨率
- 使用异步 `enhanceDetail()` 代替同步版本
- 降低质量等级

---

### 场景 8: Extension 插件加载失败

**症状**: 功能正常但算法不生效，日志中出现扩展相关错误。

**根因分析**:
1. `libvideoprocessingengine_ext.z.so` 不存在或加载失败
2. 扩展注册函数未正确导出
3. Skia 插件未编译 (SKIA_ENABLE 宏未定义)

**排查步骤**:
1. 查看 hilog 中 `dlopen libvideoprocessingengine_ext failed` 信息
2. 检查 `dlerror()` 返回的错误信息
3. 查看 `extension not found` 或 `extension init failed` 相关日志

**关键源文件**:
- `framework/algorithm/extension_manager/extension_manager.cpp` -- dlopen 加载扩展库
- `framework/algorithm/extension_manager/include/static_extension_list.h` -- Skia 静态注册

**内部错误码对应关系**:
| 内部错误码 | 说明 |
|-----------|------|
| VPE_ALGO_ERR_EXTENSION_NOT_FOUND | 找不到所需插件 |
| VPE_ALGO_ERR_EXTENSION_INIT_FAILED | 插件初始化失败 |
| VPE_ALGO_ERR_EXTENSION_PROCESS_FAILED | 插件处理过程失败 |
| VPE_ALGO_ERR_NOT_IMPLEMENTED | 插件未实现该功能 |

源文件: `interfaces/inner_api/algorithm_errors.h`

**修复方案**:
- 确认设备固件包含正确的扩展库
- 检查编译配置中 SKIA_ENABLE 宏
- 确认厂商扩展库的符号导出

---

### 场景 9: 对比度增强功能异常

**症状**: `setLcdImage()` 或 `setDetailImage()` 调用异常。

**根因分析**:
1. 图像尺寸不满足最低要求 (720x720)
2. 分辨率超出上限 (20000x20000)

**排查步骤**:
1. 确认输入图像尺寸 >= 720x720 且 <= 20000x20000
2. 检查 ContrastEnhancerImage 初始化是否成功

**关键源文件**:
- `framework/capi/image_processing/detail_enhance_napi_formal.cpp` -- MIN_WIDTH_CONTRAST=720, MIN_HEIGHT_CONTRAST=720, MAX_RESOLUTION_CONTRAST=20000
- `framework/algorithm/contrast_enhancer/contrast_enhancer_image_fwk.cpp`

**修复方案**:
- 确保输入图像满足尺寸要求
- 检查 ContrastEnhancer 算法初始化日志

---

## 3. 日志排查指南

### 日志标识

- **LOG_DOMAIN**: `0xD002B3F`
- **LOG_TAG**: `VpeNapi` (NAPI 层), `VPE` (其他层)

源文件: `framework/dfx/include/vpe_log.h`, `framework/capi/image_processing/detail_enhance_napi_formal.cpp`

### 关键日志关键字

| 关键字 | 含义 | 出现位置 |
|--------|------|----------|
| `VPE image processing instance is null` | 实例指针检查失败 | image_processing_impl.cpp |
| `VPE image processing type is invalid` | type 参数无效 | image_processing_impl.cpp |
| `VPE image processing out of memory` | 内存分配失败 | image_processing_impl.cpp |
| `VPE image processing constructor failed` | 构造函数失败 | image_processing_impl.cpp |
| `dlopen libvideoprocessingengine_ext failed` | 扩展库加载失败 | extension_manager.cpp |
| `extension not found` | 算法插件未找到 | extension_manager.cpp |
| `Unknown type` | 不知的处理类型 | *_factory.cpp |
| `videoProcessor is null` | 视频处理实例为空 | video_processing.cpp |
| `callback is null` | 回调对象为空 | video_processing.cpp |

### 日志过滤命令

```bash
# 过滤 VPE 模块日志
hilog | grep "0xD002B3F"

# 过滤 VPE TAG 日志
hilog | grep -E "VpeNapi|VPE"

# 过滤错误级别
hilog -x | grep -E "VPE.*E|VpeNapi.*E"
```

---

## 4. 视频处理生命周期检查清单

视频处理 API 有严格的生命周期要求，以下按正确顺序列出检查项:

```
1. OH_VideoProcessing_InitializeEnvironment()         [可选]
2. OH_VideoProcessingCallback_Create()
3. OH_VideoProcessingCallback_BindOnError()
4. OH_VideoProcessingCallback_BindOnState()
5. OH_VideoProcessingCallback_BindOnNewOutputBuffer()  [可选]
6. OH_VideoProcessing_Create()
7. OH_VideoProcessing_RegisterCallback()               [Start 前必须]
8. OH_VideoProcessing_SetSurface()                     [Start 前必须]
9. OH_VideoProcessing_GetSurface()                     [Start 前必须]
10. OH_VideoProcessing_SetParameter()                  [可选]
11. OH_VideoProcessing_Start()
    -> OnState(RUNNING) 回调
12. [处理循环] OnNewOutputBuffer -> RenderOutputBuffer
13. OH_VideoProcessing_Stop()
    -> OnState(STOPPED) 回调
14. OH_VideoProcessing_Destroy()
15. OH_VideoProcessingCallback_Destroy()
16. OH_VideoProcessing_DeinitializeEnvironment()        [可选]
```

常见违反顺序的问题:
- **Start 失败**: 漏掉了步骤 7/8/9 中的某一步
- **Destroy 失败**: 未先 Stop (步骤 13)
- **DeinitializeEnvironment 失败**: 未先 Destroy 所有实例

---

## 5. 典型修复方案汇总

| 问题 | 修复方案 |
|------|----------|
| 设备不支持某处理类型 | 调用 IsXXXSupported() 预检; 确认厂商 ext 库存在 |
| 创建实例失败 | 减少并发实例数; 检查内存; 先 InitializeEnvironment |
| 处理超时 | 降低图像/视频分辨率; 降低质量等级; 使用异步 API |
| 内存不足 | 释放不用的实例; 减小处理尺寸; 避免同时处理多个大图 |
| GPU 错误 (29200001/29210001) | 检查 GPU 驱动; 重启设备; 查看 GPU 异常日志 |
| 状态错误 (29200006/29210006) | 严格遵循 API 调用顺序; 检查当前实例状态 |
| 扩展插件错误 | 确认 ext 库版本匹配; 检查编译配置; 查看 dlopen 错误 |
| 图像参数无效 (29200009) | 检查分辨率范围 [32,8192]; 检查色彩空间; 设置正确的 QualityLevel |

---

## 6. 调试技巧

### 6.1 检查扩展库可用性

```bash
# 检查厂商扩展库是否存在
ls -la /system/lib64/libvideoprocessingengine_ext.z.so

# 检查扩展库导出符号
nm -D /system/lib64/libvideoprocessingengine_ext.z.so | grep Register
```

### 6.2 检查 VPE SA 服务状态

```bash
# 检查 SA 服务是否运行 (SA ID: 0x00010256 = 66134)
sa_checker 66134
```

源文件: `services/utils/include/vpe_sa_constants.h`

### 6.3 检查 VPE 库文件

```bash
# 图像处理库
ls -la /system/lib64/libimage_processing.so

# 视频处理库
ls -la /system/lib64/libvideo_processing.so
```

# API 参考手册

本文档按三级组织所有公开接口：Manager 级、AVSession 实例级、AVSessionController 实例级。

> 源文件基础路径：`multimedia_av_session/`
> JS 类型声明：`api/interface_sdk-js/api/@ohos.multimedia.avsession.d.ts`

---

## 一、Manager 级接口 (avSession)

通过 `import avSession from '@ohos.multimedia.avsession'` 导入，所有方法挂在 `avSession` 命名空间上。

NAPI 实现源文件：`multimedia_av_session/frameworks/js/napi/session/src/napi_avsession_manager.cpp`
客户端实现源文件：`multimedia_av_session/frameworks/native/session/src/avsession_manager_impl.cpp`

---

### avSession.createAVSession

创建媒体会话。

| 项目 | 说明 |
|------|------|
| **签名** | `createAVSession(context: Context, tag: string, type: AVSessionType): Promise<AVSession>` |
| **权限** | 无特殊权限要求（应用级 API） |
| **系统API** | 否 |

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| context | Context | 是 | 应用上下文，用于提取 ElementName |
| tag | string | 是 | 会话标签，用于标识和调试 |
| type | AVSessionType | 是 | 会话类型：`'audio'` 或 `'video'` |

**返回值**：`Promise<AVSession>` — 创建的会话实例

**错误码**

| 错误码 | 说明 |
|--------|------|
| 401 | 参数类型错误或缺少必要参数 |
| 6600101 | 会话服务异常 |

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::CreateAVSession)

---

### avSession.getAVSession

根据 ElementName 获取已有会话。

| 项目 | 说明 |
|------|------|
| **签名** | `getAVSession(sessionId: string): Promise<AVSession>` |
| **权限** | 无特殊权限要求 |
| **系统API** | 否 |

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 目标会话 ID |

**返回值**：`Promise<AVSession>`

**错误码**：401, 6600101, 6600102

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::GetAVSession)

---

### avSession.getAllSessionDescriptors

获取系统所有会话描述符列表。

| 项目 | 说明 |
|------|------|
| **签名** | `getAllSessionDescriptors(): Promise<Array<AVSessionDescriptor>>` |
| **权限** | `ohos.permission.MANAGE_MEDIA_RESOURCES` |
| **系统API** | 是 |

**返回值**：`Promise<Array<AVSessionDescriptor>>` — 所有会话描述符列表

**错误码**：201, 202, 6600101

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::GetAllSessionDescriptors)

---

### avSession.getSessionDescriptors

按类别获取会话描述符列表。

| 项目 | 说明 |
|------|------|
| **签名** | `getSessionDescriptors(category: SessionCategory): Promise<Array<AVSessionDescriptor>>` |
| **权限** | 无特殊权限要求 |
| **系统API** | 否 |

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category | SessionCategory | 是 | CATEGORY_ACTIVE / CATEGORY_ALL |

**返回值**：`Promise<Array<AVSessionDescriptor>>`

**错误码**：401, 6600101

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::GetSessionDescriptors)

---

### avSession.getHistoricalSessionDescriptors

获取历史会话描述符。

| 项目 | 说明 |
|------|------|
| **签名** | `getHistoricalSessionDescriptors(maxSize: number): Promise<Array<AVSessionDescriptor>>` |
| **权限** | 无特殊权限要求 |
| **系统API** | 否 |

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| maxSize | number | 是 | 最大返回数量（0-10，或特殊值 52225 表示媒体控制中心） |

**返回值**：`Promise<Array<AVSessionDescriptor>>`

**错误码**：401, 6600101

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::GetHistoricalSessionDescriptors)

---

### avSession.getHistoricalAVQueueInfos

获取历史媒体队列信息。

| 项目 | 说明 |
|------|------|
| **签名** | `getHistoricalAVQueueInfos(maxSize: number, maxAppSize: number): Promise<Array<AVQueueInfo>>` |
| **权限** | 无特殊权限要求 |
| **系统API** | 否 |

**错误码**：401, 6600101

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::GetHistoricalAVQueueInfos)

---

### avSession.startAVPlayback

启动指定应用的媒体播放。

| 项目 | 说明 |
|------|------|
| **签名** | `startAVPlayback(bundleName: string, assetId: string, moduleName?: string): Promise<void>` |
| **权限** | 无特殊权限要求 |
| **系统API** | 否 |

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bundleName | string | 是 | 目标应用包名 |
| assetId | string | 是 | 媒体资源 ID |
| moduleName | string | 否 | 模块名 |

**错误码**：401, 6600101

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::StartAVPlayback)

---

### avSession.createController

根据 sessionId 创建会话控制器。

| 项目 | 说明 |
|------|------|
| **签名** | `createController(sessionId: string): Promise<AVSessionController>` |
| **权限** | `ohos.permission.MANAGE_MEDIA_RESOURCES` |
| **系统API** | 是 |

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 目标会话的唯一标识 |

**返回值**：`Promise<AVSessionController>`

**错误码**

| 错误码 | 说明 |
|--------|------|
| 201 | 缺少权限 |
| 202 | 非系统应用 |
| 401 | 参数错误 |
| 6600101 | 会话服务异常 |
| 6600102 | 会话不存在 |

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::CreateController)

---

### avSession.getAVCastController

获取投播控制器实例。

| 项目 | 说明 |
|------|------|
| **签名** | `getAVCastController(sessionId: string): Promise<AVCastController>` |
| **权限** | `ohos.permission.MANAGE_MEDIA_RESOURCES` |
| **系统API** | 是 |
| **编译宏** | `CASTPLUS_CAST_ENGINE_ENABLE` |

**错误码**：201, 202, 401, 6600101, 6600109

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::GetAVCastController)

---

### avSession.castAudio

音频投播，支持单个或全部会话。

| 项目 | 说明 |
|------|------|
| **签名** | `castAudio(session: 'all' \| AVSessionDescriptor, devices: OutputDeviceInfo): Promise<void>` |
| **权限** | `ohos.permission.MANAGE_MEDIA_RESOURCES` |
| **系统API** | 是 |

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| session | 'all' / AVSessionDescriptor | 是 | 传入 `'all'` 投播全部会话，传入 AVSessionDescriptor 投播单个会话 |
| devices | OutputDeviceInfo | 是 | 目标输出设备信息 |

**错误码**：201, 202, 401, 6600101, 6600108, 6600109

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::CastAudio)

---

### avSession.sendSystemAVKeyEvent

发送系统媒体按键事件。

| 项目 | 说明 |
|------|------|
| **签名** | `sendSystemAVKeyEvent(keyEvent: KeyEvent): Promise<void>` |
| **权限** | `ohos.permission.MANAGE_MEDIA_RESOURCES` |
| **系统API** | 是 |

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyEvent | KeyEvent | 是 | 包含 keyCode、keyAction、keyItems |

**错误码**：201, 202, 401, 6600101, 6600102

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::SendSystemAVKeyEvent)

---

### avSession.sendSystemControlCommand

发送系统媒体控制命令。

| 项目 | 说明 |
|------|------|
| **签名** | `sendSystemControlCommand(command: AVControlCommand): Promise<void>` |
| **权限** | `ohos.permission.MANAGE_MEDIA_RESOURCES` |
| **系统API** | 是 |

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| command | AVControlCommand | 是 | 控制命令（play/pause/stop/playNext/playPrevious/fastForward/rewind/seek/setSpeed/setLoopMode/toggleFavorite） |

**错误码**：201, 202, 401, 6600101, 6600102, 6600105, 6600106

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::SendSystemControlCommand)

---

### avSession.startCastDeviceDiscovery

启动投播设备发现。

| 项目 | 说明 |
|------|------|
| **签名** | `startCastDeviceDiscovery(castDeviceCapability?: number, drmSchemes?: Array<string>): Promise<void>` |
| **权限** | `ohos.permission.MANAGE_MEDIA_RESOURCES` |
| **系统API** | 是 |
| **编译宏** | `CASTPLUS_CAST_ENGINE_ENABLE` |

**错误码**：201, 202, 401, 6600101

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::StartCastDiscovery)

---

### avSession.stopCastDeviceDiscovery

停止投播设备发现。

| 项目 | 说明 |
|------|------|
| **签名** | `stopCastDeviceDiscovery(): Promise<void>` |
| **权限** | `ohos.permission.MANAGE_MEDIA_RESOURCES` |
| **系统API** | 是 |
| **编译宏** | `CASTPLUS_CAST_ENGINE_ENABLE` |

**错误码**：201, 202, 6600101

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::StopCastDiscovery)

---

### avSession.setDiscoverable

设置设备是否可被发现。

| 项目 | 说明 |
|------|------|
| **签名** | `setDiscoverable(enable: boolean): Promise<void>` |
| **权限** | `ohos.permission.MANAGE_MEDIA_RESOURCES` |
| **系统API** | 是 |
| **编译宏** | `CASTPLUS_CAST_ENGINE_ENABLE` |

**错误码**：201, 202, 401, 6600101

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::SetDiscoverable)

---

### avSession.startCasting

启动投播。

| 项目 | 说明 |
|------|------|
| **签名** | `startCasting(sessionToken: AVSessionToken, outputDeviceInfo: OutputDeviceInfo): Promise<void>` |
| **权限** | `ohos.permission.MANAGE_MEDIA_RESOURCES` |
| **系统API** | 是 |
| **编译宏** | `CASTPLUS_CAST_ENGINE_ENABLE` |

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionToken | AVSessionToken | 是 | 包含 sessionId 和 elementName |
| outputDeviceInfo | OutputDeviceInfo | 是 | 目标设备信息 |

**错误码**：201, 202, 401, 6600101, 6600108

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::StartCast)

---

### avSession.stopCasting

停止投播。

| 项目 | 说明 |
|------|------|
| **签名** | `stopCasting(sessionToken: AVSessionToken): Promise<void>` |
| **权限** | `ohos.permission.MANAGE_MEDIA_RESOURCES` |
| **系统API** | 是 |
| **编译宏** | `CASTPLUS_CAST_ENGINE_ENABLE` |

**错误码**：201, 202, 401, 6600101

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::StopCast)

---

### avSession.isDesktopLyricSupported

查询设备是否支持桌面歌词。

| 项目 | 说明 |
|------|------|
| **签名** | `isDesktopLyricSupported(): Promise<boolean>` |
| **权限** | 无 |
| **系统API** | 否 |

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::IsDesktopLyricSupported)

---

### avSession.getDistributedSessionController

获取分布式会话控制器。

| 项目 | 说明 |
|------|------|
| **签名** | `getDistributedSessionController(sessionType: DistributedSessionType): Promise<Array<AVSessionController>>` |
| **权限** | 无 |
| **系统API** | 否 |

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionType | DistributedSessionType | 是 | TYPE_SESSION_REMOTE / TYPE_SESSION_MIGRATE_IN |

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::GetDistributedSessionControllers)

---

### avSession.on (Manager 级事件)

注册 Manager 级别的事件监听。

| 项目 | 说明 |
|------|------|
| **签名** | `on(type: string, callback: Function): void` |

**支持的事件类型**

| 事件名 | 回调参数 | 权限要求 | 说明 |
|--------|---------|---------|------|
| sessionCreate | AVSessionDescriptor | 系统API | 会话创建 |
| sessionDestroy | AVSessionDescriptor | 系统API | 会话销毁 |
| topSessionChange | AVSessionDescriptor | 系统API | 置顶会话变更 |
| sessionServiceDie | void | 无 | 服务死亡通知 |
| deviceAvailable | OutputDeviceInfo | 系统API | 投播设备可用 |
| deviceLogEvent | DeviceInfo | 系统API | 设备日志事件 |
| deviceOffline | DeviceInfo | 系统API | 设备离线 |
| deviceStateChanged | DeviceInfo | 系统API | 设备状态变更 |
| activeSessionChanged | AVSessionDescriptor | MANAGE_MEDIA_RESOURCES | 活跃会话变更 |
| distributedSessionChange | Array<AVSessionDescriptor> | 无 | 分布式会话变更 |

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::OnEvent / NapiSessionListener::AddCallback)

---

### avSession.off (Manager 级事件)

取消 Manager 级别的事件监听。

| 项目 | 说明 |
|------|------|
| **签名** | `off(type: string, callback?: Function): void` |

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::OffEvent / NapiSessionListener::RemoveCallback)

---

### avSession.startDeviceLogging / stopDeviceLogging

启动/停止设备日志记录。

| 项目 | 说明 |
|------|------|
| **签名** | `startDeviceLogging(fd: number, maxSize: number): Promise<void>` |
| **签名** | `stopDeviceLogging(): Promise<void>` |
| **编译宏** | `CASTPLUS_CAST_ENGINE_ENABLE` |

**源文件**：`frameworks/js/napi/session/src/napi_avsession_manager.cpp` (NapiAVSessionManager::StartDeviceLogging / StopDeviceLogging)

---

## 二、AVSession 实例级接口

通过 `createAVSession()` 获取 AVSession 实例后调用的方法。

NAPI 实现源文件：`multimedia_av_session/frameworks/js/napi/session/src/napi_avsession.cpp`
接口头文件：`multimedia_av_session/interfaces/inner_api/native/session/include/av_session.h`

---

### session.setAVMetadata

设置媒体元数据。

| 项目 | 说明 |
|------|------|
| **签名** | `setAVMetadata(metadata: AVMetadata): Promise<void>` |
| **权限** | 无 |

**参数说明 (AVMetadata)**

| 字段 | 类型 | 说明 |
|------|------|------|
| assetId | string | 媒体资源 ID |
| title | string | 标题 |
| artist | string | 艺术家 |
| album | string | 专辑名 |
| writer | string | 词作者 |
| composer | string | 作曲者 |
| duration | number | 时长（毫秒） |
| mediaImage | string / PixelMap | 封面图 |
| subtitle | string | 副标题 |
| description | string | 描述 |
| lyric | string | 歌词 |
| previousAssetId | string | 上一首资源 ID |
| nextAssetId | string | 下一首资源 ID |

**错误码**：401, 6600101, 6600102

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::SetAVMetaData)

---

### session.setAVPlaybackState

设置播放状态。

| 项目 | 说明 |
|------|------|
| **签名** | `setAVPlaybackState(state: AVPlaybackState): Promise<void>` |
| **权限** | 无 |

**参数说明 (AVPlaybackState)**

| 字段 | 类型 | 说明 |
|------|------|------|
| state | PlaybackState | 播放状态（PLAY/PAUSE/STOP/等） |
| speed | number | 播放速度 |
| position | PlaybackPosition | 播放位置（elapsedTime, updateTime） |
| bufferedTime | number | 缓冲时长 |
| loopMode | LoopMode | 循环模式 |
| isFavorite | boolean | 是否收藏 |

**错误码**：401, 6600101, 6600102

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::SetAVPlaybackState)

---

### session.activate / session.deactivate

激活/去激活会话。

| 项目 | 说明 |
|------|------|
| **签名** | `activate(): Promise<void>` |
| **签名** | `deactivate(): Promise<void>` |
| **权限** | 无 |

**错误码**：6600101, 6600102

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::Activate / Deactivate)

---

### session.destroy

销毁会话并释放资源。

| 项目 | 说明 |
|------|------|
| **签名** | `destroy(): Promise<void>` |
| **权限** | 无 |

**错误码**：6600101, 6600102

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::Destroy)

---

### session.getController

获取当前会话的控制器。

| 项目 | 说明 |
|------|------|
| **签名** | `getController(): Promise<AVSessionController>` |
| **权限** | 无 |

**错误码**：6600101, 6600102, 6600103

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::GetController)

---

### session.getOutputDevice

获取当前音频输出设备信息。

| 项目 | 说明 |
|------|------|
| **签名** | `getOutputDevice(): Promise<OutputDeviceInfo>` |
| **权限** | 无 |

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::GetOutputDevice)

---

### session.setLaunchAbility

设置点击媒体通知时启动的 Ability。

| 项目 | 说明 |
|------|------|
| **签名** | `setLaunchAbility(ability: WantAgent): Promise<void>` |
| **权限** | 无 |

**错误码**：401, 6600101, 6600102

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::SetLaunchAbility)

---

### session.setAVQueueItems / session.setAVQueueTitle

设置媒体队列。

| 项目 | 说明 |
|------|------|
| **签名** | `setAVQueueItems(items: Array<AVQueueItem>): Promise<void>` |
| **签名** | `setAVQueueTitle(title: string): Promise<void>` |
| **权限** | 无 |

**错误码**：401, 6600101, 6600102

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::SetAVQueueItems / SetAVQueueTitle)

---

### session.setExtras

设置自定义扩展数据。

| 项目 | 说明 |
|------|------|
| **签名** | `setExtras(extras: Record<string, string>): Promise<void>` |
| **权限** | 无 |

**错误码**：401, 6600101, 6600102

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::SetExtras)

---

### session.dispatchSessionEvent

分发自定义会话事件。

| 项目 | 说明 |
|------|------|
| **签名** | `dispatchSessionEvent(event: string, args: Record<string, string>): Promise<void>` |
| **权限** | 无 |

**错误码**：401, 6600101, 6600102

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::SetSessionEvent)

---

### session.sendCustomData

发送自定义数据。

| 项目 | 说明 |
|------|------|
| **签名** | `sendCustomData(data: Record<string, Object>): Promise<void>` |
| **权限** | 无 |

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::SendCustomData)

---

### session.stopCasting (实例级)

停止当前会话的投播。

| 项目 | 说明 |
|------|------|
| **签名** | `stopCasting(): Promise<void>` |
| **编译宏** | `CASTPLUS_CAST_ENGINE_ENABLE` |

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::ReleaseCast)

---

### session.getAVCastController (实例级)

获取投播控制器。

| 项目 | 说明 |
|------|------|
| **签名** | `getAVCastController(): Promise<AVCastController>` |
| **编译宏** | `CASTPLUS_CAST_ENGINE_ENABLE` |

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::GetAVCastController)

---

### session.enableDesktopLyric

启用桌面歌词。

| 项目 | 说明 |
|------|------|
| **签名** | `enableDesktopLyric(enable: boolean): Promise<void>` |
| **权限** | 无 |

**错误码**：401, 6600101, 6600102, 6600110, 6600111

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::EnableDesktopLyric)

---

### session.on (AVSession 实例事件)

注册会话控制回调事件。

| 项目 | 说明 |
|------|------|
| **签名** | `on(type: string, callback: Function): void` |

**支持的事件类型**

| 事件名 | 回调参数 | 说明 |
|--------|---------|------|
| play | void | 播放命令 |
| pause | void | 暂停命令 |
| stop | void | 停止命令 |
| playNext | void | 下一首命令 |
| playPrevious | void | 上一首命令 |
| fastForward | void | 快进命令 |
| rewind | void | 快退命令 |
| seek | number | 跳转命令（目标位置 ms） |
| setSpeed | number | 设置速度 |
| setLoopMode | LoopMode | 设置循环模式 |
| toggleFavorite | void | 收藏切换 |
| handleKeyEvent | KeyEvent | 按键事件 |
| outputDeviceChange | OutputDeviceInfo | 输出设备变更 |
| commonCommand | string, Record<string, Object> | 自定义命令 |
| skipToQueueItem | number | 跳转到队列项 |
| answer | void | 接听命令 |
| hangUp | void | 挂断命令 |
| toggleCallMute | void | 通话静音切换 |
| playFromAssetId | number | 按资源 ID 播放 |
| castDisplayChange | string, Record<string, Object> | 投播显示变更 |
| customDataChange | Record<string, Object> | 自定义数据变更 |

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::OnEvent / NapiAVSessionCallback::AddCallback)

---

### session.off (AVSession 实例事件)

取消会话控制回调事件。

| 项目 | 说明 |
|------|------|
| **签名** | `off(type: string, callback?: Function): void` |

**源文件**：`frameworks/js/napi/session/src/napi_avsession.cpp` (NapiAVSession::OffEvent / NapiAVSessionCallback::RemoveCallback)

---

## 三、AVSessionController 实例级接口

通过 `createController()` 获取 AVSessionController 实例后调用的方法。

NAPI 实现源文件：`multimedia_av_session/frameworks/js/napi/session/src/napi_avsession_controller.cpp`
接口头文件：`multimedia_av_session/interfaces/inner_api/native/session/include/avsession_controller.h`

---

### controller.getAVPlaybackState

获取播放状态。

| 项目 | 说明 |
|------|------|
| **签名** | `getAVPlaybackState(): Promise<AVPlaybackState>` |
| **权限** | 无 |

**错误码**：6600101, 6600103

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::GetAVPlaybackState)

---

### controller.getAVMetadata

获取媒体元数据。

| 项目 | 说明 |
|------|------|
| **签名** | `getAVMetadata(): Promise<AVMetadata>` |
| **权限** | 无 |

**错误码**：6600101, 6600103

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::GetAVMetaData)

---

### controller.sendControlCommand

发送控制命令。

| 项目 | 说明 |
|------|------|
| **签名** | `sendControlCommand(command: AVControlCommand): Promise<void>` |
| **权限** | `ohos.permission.MANAGE_MEDIA_RESOURCES` |
| **系统API** | 是 |

**支持命令**：play, pause, stop, playNext, playPrevious, fastForward, rewind, seek, setSpeed, setLoopMode, toggleFavorite

**错误码**：201, 202, 401, 6600101, 6600102, 6600103, 6600105, 6600106, 6600107

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::SendControlCommand)

---

### controller.sendAVKeyEvent

发送按键事件。

| 项目 | 说明 |
|------|------|
| **签名** | `sendAVKeyEvent(keyEvent: KeyEvent): Promise<void>` |
| **权限** | `ohos.permission.MANAGE_MEDIA_RESOURCES` |
| **系统API** | 是 |

**错误码**：201, 202, 401, 6600101, 6600103, 6600105, 6600106

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::SendAVKeyEvent)

---

### controller.isActive

查询会话是否激活。

| 项目 | 说明 |
|------|------|
| **签名** | `isActive(): Promise<boolean>` |
| **权限** | 无 |

**错误码**：6600101, 6600103

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::IsSessionActive)

---

### controller.getValidCommands

获取会话支持的有效命令列表。

| 项目 | 说明 |
|------|------|
| **签名** | `getValidCommands(): Promise<Array<AVControlCommand>>` |
| **权限** | 无 |

**错误码**：6600101, 6600103

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::GetValidCommands)

---

### controller.destroy

销毁控制器。

| 项目 | 说明 |
|------|------|
| **签名** | `destroy(): Promise<void>` |
| **权限** | 无 |

**错误码**：6600101, 6600103

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::Destroy)

---

### controller.getOutputDevice

获取输出设备信息。

| 项目 | 说明 |
|------|------|
| **签名** | `getOutputDevice(): Promise<OutputDeviceInfo>` |
| **权限** | 无 |

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::GetOutputDevice)

---

### controller.sendCommonCommand

发送自定义控制命令。

| 项目 | 说明 |
|------|------|
| **签名** | `sendCommonCommand(command: string, args: Record<string, Object>): Promise<void>` |
| **权限** | `ohos.permission.MANAGE_MEDIA_RESOURCES` |
| **系统API** | 是 |

**错误码**：201, 202, 401, 6600101, 6600103, 6600105, 6600106, 6600107

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::SendCommonCommand)

---

### controller.skipToQueueItem

跳转到指定队列项。

| 项目 | 说明 |
|------|------|
| **签名** | `skipToQueueItem(itemId: number): Promise<void>` |
| **权限** | 无 |

**错误码**：401, 6600101, 6600103, 6600105, 6600106

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::SkipToQueueItem)

---

### controller.getAVQueueItems / controller.getAVQueueTitle

获取媒体队列信息。

| 项目 | 说明 |
|------|------|
| **签名** | `getAVQueueItems(): Promise<Array<AVQueueItem>>` |
| **签名** | `getAVQueueTitle(): Promise<string>` |
| **权限** | 无 |

**错误码**：6600101, 6600103

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::GetAVQueueItems / GetAVQueueTitle)

---

### controller.getExtras

获取扩展数据。

| 项目 | 说明 |
|------|------|
| **签名** | `getExtras(): Promise<Record<string, string>>` |
| **权限** | 无 |

**错误码**：6600101, 6600103

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::GetExtras)

---

### controller.sendCustomData

发送自定义数据。

| 项目 | 说明 |
|------|------|
| **签名** | `sendCustomData(data: Record<string, Object>): Promise<void>` |
| **权限** | 无 |

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::SendCustomData)

---

### controller.on (Controller 实例事件)

注册控制器事件监听。

| 项目 | 说明 |
|------|------|
| **签名** | `on(type: string, callback: Function): void` |

**支持的事件类型**

| 事件名 | 回调参数 | 说明 |
|--------|---------|------|
| metadataChange | AVMetadata | 元数据变更 |
| playbackStateChange | AVPlaybackState | 播放状态变更 |
| activeStateChange | boolean | 激活状态变更 |
| validCommandChange | Array<AVControlCommand> | 有效命令变更 |
| outputDeviceChange | OutputDeviceInfo | 输出设备变更 |
| sessionDestroy | void | 会话销毁 |
| sessionEvent | string, Record<string, Object> | 会话事件 |
| queueItemsChange | Array<AVQueueItem> | 队列项变更 |
| queueTitleChange | string | 队列标题变更 |
| extrasChange | Record<string, string> | 扩展数据变更 |
| customDataChange | Record<string, Object> | 自定义数据变更 |

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::OnEvent / NapiAVControllerCallback::AddCallback)

---

### controller.off (Controller 实例事件)

取消控制器事件监听。

| 项目 | 说明 |
|------|------|
| **签名** | `off(type: string, callback?: Function): void` |

**源文件**：`frameworks/js/napi/session/src/napi_avsession_controller.cpp` (NapiAVSessionController::OffEvent / NapiAVControllerCallback::RemoveCallback)

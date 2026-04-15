# NAPI 映射模式参考

本文件参考 api_dfx_2.0 中的 NAPI 映射模式知识，供知识库构建 Skill 探索模块时使用。

## 常见 NAPI 映射模式

鸿蒙的 NAPI（Node-API）桥接层将 JavaScript/TypeScript API 调用映射到 C/C++ 实现函数。常见的映射模式：

### 1. 同步函数映射
```
.d.ts: function foo(param: string): Result
NAPI: napi_value Foo(napi_env env, napi_callback_info info)
Impl: Result Foo(const std::string& param)
```

### 2. 异步回调映射
```
.d.ts: function foo(callback: AsyncCallback<Result>)
NAPI: napi_value Foo(napi_env env, napi_callback_info info)
  → 创建 napi_async_work
Impl: void FooExec(napi_env env, void* data)
      void FooComplete(napi_env env, napi_status status, void* data)
```

### 3. Promise 映射
```
.d.ts: function foo(): Promise<Result>
NAPI: 同回调模式，但返回 Promise
```

### 4. 类方法映射
```
.d.ts: class Foo { method(): void }
NAPI: napi_value FooMethod(napi_env env, napi_callback_info info)
  → 从 this 提取 native 对象
Impl: void Foo::Method()
```

### 5. 事件订阅映射
```
.d.ts: function on(type: string, callback: Callback)
NAPI: napi_value On(napi_env env, napi_callback_info info)
  → 注册回调到事件管理器
Impl: EventManager::AddListener(type, callback)
```

## 关键搜索模式

在搜索 NAPI 桥接层时，使用以下关键词：

| 关键词 | 用途 |
|--------|------|
| `napi_define_properties` | 模块导出函数 |
| `DECLARE_NAPI_FUNCTION` | 声明 NAPI 函数 |
| `DECLARE_NAPI_CLASS` | 声明 NAPI 类 |
| `napi_create_function` | 创建 JS 函数 |
| `napi_async_work` | 异步工作 |
| `napi_call_function` | 回调调用 |
| `Init` / `RegisterModule` | 模块注册入口 |

## 错误码来源

鸿蒙错误码通常定义在以下位置：

- 接口 `.d.ts` 文件中的 `@throws` 注释
- `utils/error/code.h` 或类似头文件
- 模块内 `common/` 或 `include/` 目录下的错误码头文件
- `foundation/` 目录下的公共错误码定义

---
name: knowledge-builder
description: "构建鸿蒙模块知识库。当需要探索指定模块的代码结构并生成结构化知识文件时使用。"
---

# 知识库构建 Skill

探索鸿蒙指定模块的代码结构，生成结构化知识文件供问题定位时查询。

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `module_name` | 是 | 目标模块名（如 base_location、ability_ability_runtime） |
| `code_repo_root` | 是 | 鸿蒙代码仓根目录 |
| `docs_repo_root` | 是 | 文档仓根目录 |
| `sdk_repo_root` | 是 | API 声明仓根目录 |
| `knowledge_root` | 是 | 知识库输出根目录 |

## 执行阶段

### 阶段 1：模块扫描

定位并扫描 `code_repo_root/{module_name}/` 目录：

1. 列出目录结构，识别关键层级：
   - **NAPI 桥接层**：搜索包含 `napi_`、`NAPI_` 的文件
   - **Framework 层**：搜索 `frameworks/` 或 `framework/` 目录
   - **实现层**：核心 C/C++ 源文件（`.cpp`、`.c`、`.h`）
2. 识别模块的主要功能和职责（通过 README、BUILD.gn、bundle.json 等）
3. 记录目录树结构（限制深度为 3 层）

### 阶段 2：代码分析

深入分析模块代码：

1. **错误码提取**
   - 搜索错误码定义：`ERR_`、`ERROR_`、错误码枚举、`.d.ts` 中的错误码
   - 记录格式：`{code, message, source_file, line}`

2. **API 实现链路**
   - 在 `sdk_repo_root` 中搜索该模块的 `.d.ts` API 声明
   - 参考 `references/mapping_patterns.md` 中的 NAPI 映射模式
   - 追踪 API 声明 → NAPI 桥接函数 → 实现函数的调用链
   - 记录格式：`{api_name, d_ts_file, napi_func, impl_func, impl_file}`

3. **关键函数入口**
   - 识别模块的公开接口和核心内部函数
   - 特别关注错误处理、权限校验、参数校验相关代码

### 阶段 3：知识文件生成

将分析结果写入 `knowledge_root/{module_name}/` 目录：

1. **`overview.md`** — 模块概览
   ```markdown
   # {module_name}

   ## 模块职责
   {一段话描述}

   ## 目录结构
   {简化的目录树}

   ## 核心文件
   - `path/to/key_file` — {用途}
   ```

2. **`error_codes.json`** — 错误码映射表
   ```json
   [
     {
       "code": "201",
       "message": "Permission denied",
       "source_file": "xxx/error_code.h",
       "description": "调用方缺少所需权限"
     }
   ]
   ```

3. **`api_chain.json`** — API 实现链路
   ```json
   [
     {
       "api_name": "geoLocationManager.getCurrentLocation",
       "d_ts_file": "interface_sdk-js/api/@ohos.geoLocationManager.d.ts",
       "napi_func": "GeoLocationManagerGetCurrentLocation",
       "impl_file": "frameworks/location_gnss/gnss/src/geo_location_manager.cpp"
     }
   ]
   ```

4. **`common_issues.md`** — 常见问题模式
   ```markdown
   # 常见问题

   ## 权限问题
   - 错误码 201：需要在 module.json5 中声明 ohos.permission.LOCATION 权限
   - ...

   ## 参数问题
   - 错误码 401：...
   ```

**注意**：不生成 `meta.json`，该文件由后端系统统一管理。

## 覆盖式重建

重新探索同一模块时，完整覆盖已有知识文件（overview.md、error_codes.json、api_chain.json、common_issues.md）。

## 参考资源

NAPI 映射模式见 `references/mapping_patterns.md`。

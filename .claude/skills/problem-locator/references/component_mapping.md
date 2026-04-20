# 组件路径映射表

本文件定义了闭源代码仓中组件的路径映射关系。当代码仓目录结构与开源版本不同时，通过此映射表定位组件的实际代码路径。

## CSV 格式

映射数据维护在项目根目录 `config/component_mapping.csv`，格式如下：

```csv
kit_name,component_name,component_path
xxx kit,xxxxx_xxxx,/xxx/path/to/xxxxx
```

- `kit_name`: 所属套件名称（仅用于展示）
- `component_name`: 组件名（与知识库模块名、module_mapping.md 中的模块名对应）
- `component_path`: 组件在代码仓中的相对路径（以 `/` 开头，相对于 `code_repo_root`）

## 使用方式

阶段 3.2 代码仓搜索时：

1. 读取项目根目录 `config/component_mapping.csv`
2. 按识别到的模块名匹配 `component_name` 列
3. 若命中：搜索范围为 `{code_repo_root}/{component_path}`（去掉前导 `/`）
4. 若未命中或文件不存在：回退到 `{code_repo_root}/{module_dir}/`

## 注意事项

- CSV 文件为空或不存在时，自动回退到顶级目录扫描模式
- 映射表修改后需重启服务生效
- `component_path` 必须以 `/` 开头

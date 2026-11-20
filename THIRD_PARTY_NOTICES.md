# 浏览器端第三方组件

下列许可只适用于随静态站发布的第三方库，不适用于狼人杀项目源码。已逐字节核对 `vendor/` 中的两个文件，内容与表中所列 npm 发布包一致。

| 文件 | npm 发布包及包内路径 | 许可原文 |
| --- | --- | --- |
| `vendor/bootstrap.min.css` | [`bootstrap@4.6.2`](https://www.npmjs.com/package/bootstrap/v/4.6.2)，`dist/css/bootstrap.min.css` | [MIT · Twitter, Inc. / The Bootstrap Authors](vendor/licenses/bootstrap.txt) |
| `vendor/supabase.js` | [`@supabase/supabase-js@2.119.2`](https://www.npmjs.com/package/@supabase/supabase-js/v/2.119.2)，`dist/umd/supabase.js` | [MIT · Supabase](vendor/licenses/supabase-js.txt) |

Supabase 客户端包含 Auth、Functions、PostgREST、Realtime 和 Storage 组件。另附该版本依赖的 [Phoenix 0.4.5](vendor/licenses/phoenix.txt)、[iceberg-js 0.8.1](vendor/licenses/iceberg-js.txt)、[tslib 2.8.1](vendor/licenses/tslib.txt) 及 [tslib 版权声明](vendor/licenses/tslib-copyright.txt)。更新压缩文件时，请一并核对版本与许可。测试工具和服务端的 `postgres` 包不随静态站发布；npm 依赖版本见 `package-lock.json`。

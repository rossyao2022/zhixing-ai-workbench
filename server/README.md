# 夸夸学习 AI 会员服务

这是一个只依赖 Python 标准库的会员 API：`http.server + sqlite3`。它把浏览器里的临时会员状态迁移到服务端，提供真实账号会话、会员权益、AI 次数、人工收款订单、管理员审核和企业兑换码核销。

## 已实现的业务规则

- 免费用户可浏览内容，但不能开始学习或调用 AI。
- PRO 月付 29 元、年付 299 元；按上海时区自然月提供 100 次 AI 调用。
- Max 月付 99 元、年付 999 元；AI 调用不限量。
- 管理员确认付款到账后，事务性创建对应会员权益。
- 企业兑换码一次性核销，每个兑换码开通连续六个日历月 PRO。
- 数据库只保存兑换码 SHA-256 指纹；原码只在管理员生成接口的单次响应中出现。
- 浏览器默认使用 `HttpOnly; Secure; SameSite=Lax` 会话 Cookie；CLI/自动化可显式请求 Bearer token。

## 本地启动

需要 Python 3.11 或更高版本，不需要安装第三方包。

```bash
cd /path/to/kuakua-ai-platform
export KUAKUA_DATABASE_PATH="$PWD/server/data/kuakua.sqlite3"
export KUAKUA_PAYMENT_QR_PATH="$PWD/local-preview-assets/company-payment-qr.png"
export KUAKUA_ALLOWED_ORIGINS="http://127.0.0.1:5173,http://localhost:5173"
export KUAKUA_COOKIE_SECURE=0
export KUAKUA_BOOTSTRAP_ADMIN_EMAIL="admin@example.com"
export KUAKUA_BOOTSTRAP_ADMIN_PASSWORD="在本机设置一个随机强密码"
python -m server.app
```

本地默认监听 `127.0.0.1:8787`；本项目的生产模板使用空闲的 `127.0.0.1:8791`。首次启动成功后，应从环境文件中删除两个 `KUAKUA_BOOTSTRAP_ADMIN_*` 变量；已有管理员密码不会在后续启动时被环境变量重置。

配置自检：

```bash
python -m server.app --check
```

运行测试：

```bash
python -m unittest discover -s server/tests -v
```

## 浏览器会话与请求约定

当前生产前端在 `https://happykua.com/kuakua-ai/`，API 在同站点子域 `https://www.happykua.com/kuakua-ai-api/`。nginx 按 `nginx-kuakua-api.conf` 剥离 API 前缀，前端请求设置 `credentials: "include"`。所有 `POST` 和预检请求都必须携带受信任的 `Origin`；服务只允许明确配置的来源，不返回通配符 CORS。

成功响应：

```json
{"ok":true,"data":{}}
```

失败响应：

```json
{"ok":false,"error":{"code":"INVALID_INPUT","message":"..."}}
```

注册和登录默认只设置 HttpOnly Cookie，不在 JSON 中暴露 token。CLI 需要 Bearer token 时，在注册或登录请求中增加 `X-Session-Mode: bearer`；响应的 `data.session.token` 只在这种模式下出现。所有写操作即使使用 Bearer，也仍须发送正确的 `Origin`。

## API 路由

| 方法 | 路径 | 权限 | 请求 / 结果 |
|---|---|---|---|
| `GET` | `/health` | 公开 | 服务健康状态 |
| `POST` | `/auth/register` | 公开 | `{email,password,displayName}` |
| `POST` | `/auth/login` | 公开 | `{email,password}` |
| `POST` | `/auth/logout` | 登录 | 注销当前 Cookie 或 Bearer 会话 |
| `GET` | `/me` | 登录 | 用户、会员快照、AI 用量 |
| `GET` | `/membership/current` | 登录 | 当前会员与 AI 用量 |
| `POST` | `/ai/consume` | PRO/Max | `{}`，原子扣减一次用量 |
| `GET` | `/payment-qr` | 登录 | 企业收款码图片，禁止缓存 |
| `POST` | `/payment-orders` | 登录 | `{planId,payerName,paymentReference,customerNote?}` |
| `GET` | `/payment-orders/my` | 登录 | 当前用户最近 100 笔订单 |
| `POST` | `/redemption-codes/redeem` | 登录 | `{code}`，原子核销并开通半年 PRO |
| `GET` | `/admin/payment-orders?status=pending` | 管理员 | `pending/approved/rejected/all` |
| `POST` | `/admin/payment-orders/:id/review` | 管理员 | `{decision:"approved"或"rejected",reviewNote?}` |
| `POST` | `/admin/redemption-codes/generate` | 管理员 | `{count,enterpriseId,campaignId?,expiresAt?}`；单次 1–500 个 |
| `GET` | `/admin/redemption-codes?status=all` | 管理员 | 仅状态元数据，不返回原码或 hash |

套餐编号和服务端固定金额（客户端金额字段会被忽略）：

| `planId` | 权益 | 金额（分） | 时长 |
|---|---:|---:|---:|
| `pro-monthly` | PRO | 2900 | 1 个日历月 |
| `pro-yearly` | PRO | 29900 | 12 个日历月 |
| `max-monthly` | Max | 9900 | 1 个日历月 |
| `max-yearly` | Max | 99900 | 12 个日历月 |

管理员生成兑换码示例（原码必须立即通过企业的安全交付渠道保存）：

```bash
curl -sS https://www.happykua.com/kuakua-ai-api/admin/redemption-codes/generate \
  -H 'Origin: https://happykua.com' \
  -H 'Authorization: Bearer ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  --data '{"count":10,"enterpriseId":"CUSTOMER-001","campaignId":"contract-2026-001"}'
```

## 线上部署

1. 新建专用系统用户 `kuakua-api`，将服务端代码部署至 `/opt/kuakua-ai-api/current`。
2. 把企业收款码放到 Web 根目录之外，例如 `/etc/kuakua-ai-api/company-payment-qr.png`，权限设为仅服务账号可读。
3. 从 `.env.example` 创建 `/etc/kuakua-ai-api/env`，权限设为 `0640` 且仅 root 与服务组可读，填入真实域名和首次管理员强密码。
4. 安装 `kuakua-membership.service` 到 `/etc/systemd/system/`，执行 `systemctl daemon-reload && systemctl enable --now kuakua-membership`。
5. 安装 `nginx-kuakua-rate-limit.conf` 到 `/etc/nginx/conf.d/`，并把 `nginx-kuakua-api.conf` 的 locations 合入 `www.happykua.com` 的 HTTPS server block；检查配置后 reload nginx。
6. 登录管理员并完成一笔测试订单、一次审核、一次兑换，确认会员和 AI 额度在另一台设备上仍一致。
7. 备份 `/var/lib/kuakua-ai-api/kuakua.sqlite3`；备份必须包含数据库中的账号和会员数据，并采用加密和最小权限策略。

## 安全边界

- 密码使用带独立随机盐的 PBKDF2-HMAC-SHA256（默认 310,000 轮），会话 token 使用 256 位随机数且数据库仅存 token hash。
- 所有订单审核、AI 扣次和兑换码核销都在 `BEGIN IMMEDIATE` SQLite 事务内完成；并发兑换只能成功一次。
- Nginx 模板对注册/登录配置了单独的每 IP 速率和连接数限制；API 进程只绑定 loopback。
- 日志只记录 HTTP 方法、无查询参数的路径和状态，不记录请求体、密码、会话 token、付款凭证或兑换码原码。
- 收款码接口要求登录，响应为 `private, no-store`；线上图片应放在 nginx Web 根目录之外。
- 本服务没有自动确认微信/银行到账的能力；管理员只能在公司的真实收款后台核对后点击通过。不要根据用户上传的截图自动开通会员。
- SQLite 适合当前单机人工审核规模。若未来运行多个 API 实例或高并发核销，应迁移到受管 PostgreSQL，并保持相同的唯一约束和事务语义。

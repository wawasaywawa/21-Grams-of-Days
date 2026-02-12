## 21 Grams of Days

一个为两个人设计的「时间胶囊」应用，用来记录、分享和回看共同的旅程。

---

### 功能简介

- **星点时间网格**：每天一颗星点，根据心情不同呈现不同颜色和光晕效果，支持 hover tooltip。
- **便当盒视图（Bento View）**：点击某一天，会弹出大卡片展示：
  - 日期与 `DAY OF JOURNEY`
  - 心情标签
  - 照片拼贴
  - 文字记录
  - 语音（上传 / 播放）
- **情侣连接与合并时间线**：
  - 通过邮箱邀请对方，建立 share 关系
  - 视图切换：`只看我的 / 只看对方 / 合并`
  - 合并视图中，同一天双方都有记录时显示「共同记忆」爱心
- **写信系统**：
  - 专用写信弹窗（全屏玻璃风格）
  - 富文本编辑：加粗 / 斜体 / 列表
  - 本地草稿保存（localStorage）
  - 定时发送（`scheduled_at` 字段，前端按时间过滤可见性）
  - 新信提醒：右下角爱心心跳 + 「xx 给你写信了」消息气泡
- **多主题支持**：
  - Pink Nebula / Starry Night / Warm Sunset / Aurora / Deep Space
  - 每个主题包含背景渐变、面板文字色、tooltip、复选框、按钮等成套设计
- **底部时间线**：
  - 显示 `Days from graduation` 与 `Days to today`
  - 小星星根据所选日期在时间线上平滑滑动
  - 起止月份自动随数据范围调整

---

### 技术栈

- **前端**：React + TypeScript + Vite
- **样式与动效**：
  - Tailwind CSS
  - Framer Motion
  - Lucide React 图标
- **时间与数据处理**：
  - date-fns（日期计算与格式化）
  - localStorage（本地草稿）
- **后端与存储**：Supabase
  - Auth：邮箱登录 / 注册
  - Database：Postgres（`memories`、`letters`、`shares`、`profiles` 等表）
  - RLS：通过 Supabase 控制台配置访问规则
- **部署**：Vercel（从 GitHub `main` 分支自动构建）

---

### 本地开发

**环境要求：** Node.js（推荐 18+）

```bash
git clone https://github.com/wawasaywawa/21-Grams-of-Days.git
cd 21-Grams-of-Days

npm install
```

在项目根目录创建 `.env` 文件（不要提交到 Git）：

```bash
VITE_SUPABASE_URL=你的 Supabase 项目 URL
VITE_SUPABASE_ANON_KEY=你的 Supabase anon 公钥
```

启动开发服务器：

```bash
npm run dev
```

浏览器访问 `http://localhost:5173`。

---

### 部署（Vercel）

1. 将仓库推送到 GitHub。  
2. 在 Vercel 中导入该仓库，Preset 选择 **Vite**。  
3. 在项目的 **Environment Variables** 中配置：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. 保持 Build Command 为 `npm run build`，Output Directory 为 `dist`。  
5. 点击 **Deploy**，等待构建成功后即可获得线上访问链接。

之后只需要在本地：

```bash
git add .
git commit -m "your change"
git push origin main
```

Vercel 会自动重新构建并更新线上站点。


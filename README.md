# 智能衣橱 · 本地优先版

移动端优先的响应式 Web 应用：拍照录入衣物、手动打标 + 本地规则推导季节与适温、按场景/温度智能搭配、记录穿着次数、提醒清洗。

**本版本为阶段一（MVP，无 AI）**：不调用任何外部 AI 模型，照片只在浏览器本地处理；天气走免密钥 Open-Meteo。全部业务数据存 IndexedDB，不上云。

---

## 1. 本地运行

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:5173/`。首次使用建议到「设置 → 加载示例衣物」加入 8 件示例单品，即可体验完整搭配闭环。

验证命令：

```bash
npm test          # Vitest 单元测试
npm run build     # vue-tsc 类型检查 + Vite 生产构建
```

---

## 2. A0：GitHub Pages 部署（需要你手动完成登录部分）

我不会使用你聊天中出现的任何账号凭据。以下步骤请在你自己的终端/浏览器完成：

1. **新建公开仓库**  
   在 github.com 新建一个 Public 仓库，例如 `smart-wardrobe`。免费账户的 GitHub Pages 要求仓库必须是 Public。

2. **本地初始化并推送**  
   在本项目目录执行：

   ```bash
   git init -b main
   git add .
   git commit -m "feat: local-first smart wardrobe MVP"
   git remote add origin https://github.com/<你的用户名>/smart-wardrobe.git
   git push -u origin main
   ```

   > 若本地已配置 Git 凭据助手，推送时不要再粘贴密码。建议改用 Personal Access Token 或 SSH key，并开启两步验证。

3. **开启 Pages**  
   仓库 → Settings → Pages → Build and deployment：
   - Source 选择 **GitHub Actions**
   - 保存后，`.github/workflows/deploy.yml` 会在每次 push 到 `main` 时自动构建并部署

4. **验证部署**  
   Actions 页出现绿色勾后，访问：

   ```
   https://<你的用户名>.github.io/smart-wardrobe/
   ```

   工作流里已设置 `VITE_BASE_PATH=/${{ github.event.repository.name }}/`，`vite.config.ts` 会据此生成正确的静态资源路径；路由使用 hash 模式，刷新子页面不会 404。

5. **安全复核**  
   - 确认仓库里没有任何照片、`.env`、密钥文件
   - `.gitignore` 已排除 `node_modules/`、`dist/`、`.env*`、`*.local`
   - **你此前在聊天中发过 GitHub 明文登录信息，请立即改密并开启两步验证**

---

## 3. 已实现的阶段一功能

| 模块 | 内容 |
| --- | --- |
| 今日穿搭 | 天气胶囊、待清洗提醒、Top N 搭配、换一套、穿这套、今日记录与撤销 |
| 衣橱 | 搜索、季节/品类/状态筛选、2/3/4 列自适应网格、详情编辑、适温规则重算、清洗/删除 |
| 拍照录入 | 相机/相册、canvas 压缩为 WebP、剥离 EXIF/GPS、主色提取、手动打标、规则推导预览 |
| 搭配实验室 | 场景、温度滑块、降水/大风开关、Top N、可解释推荐理由 |
| 穿搭日历 | 月历角标、月度统计、最常穿 Top3、场景分布、记录时间线与撤销 |
| 设置 | 城市与手动温度、清洗阈值表、推荐偏好、备份导出/导入、存储用量、持久化申请、示例数据、清空数据 |

领域规则全部是可单测的纯 TypeScript：

- `src/services/rules/tempTable.ts` — 厚度/品类 → 季节与适温区间
- `src/services/rules/washRules.ts` — 按品类与材质推导清洗阈值
- `src/services/rules/colorRules.ts` — 色彩协调打分
- `src/services/recommend/engine.ts` — 硬约束过滤 + 组合生成 + Top N
- `src/services/recommend/score.ts` — 6 因子加权打分
- `src/services/recommend/explain.ts` — 「为什么推荐它」

---

## 4. 隐私与数据边界

- 照片、标签、搭配、穿着记录、反馈、设置全部写浏览器 IndexedDB；应用没有后端，也没有数据库账号。
- 上传照片这一步不存在：拍照后由 canvas 在本地重绘、压缩，EXIF/GPS 已被剥离。
- 天气请求会向 Open-Meteo 发送经纬度或城市名坐标，不发送任何衣物数据；署名已固定在天气条和设置页。
- 清除浏览器数据会永久删除全部数据。请定期使用「设置 → 导出备份」保存 JSON 文件。
- GitHub Pages 会按 GitHub 官方说明记录站点访问 IP，但应用本身不收集访问信息。

---

## 5. 阶段二展望（本版未做）

- 可选 Gemini 免费层视觉识别：设置页自填 key，只存本机，不进仓库与备份；失败或关闭时自动走手动录入
- 反馈自学习（Beta 平滑）、单次穿着成本（用户已决定不做）、PWA 安装、浏览器通知
- 本地 WebGPU 小模型离线识别

详见工作区文档 `smart-wardrobe-github-free-plan.md`。

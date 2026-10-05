# 🚀 Gợi ý tính năng cho HiMo Portfolio

## 📊 Tình trạng hiện tại

| Thành phần | Trạng thái |
|---|---|
| Framework | **Astro 5** + TailwindCSS |
| Integrations | `@astrojs/react`, `@astrojs/vue`, MDX, KaTeX |
| Content | Blog, Projects, Notes, Learn (có Quiz) |
| Layout 3 cột | ✅ Đã có khung 2 sidebar quảng cáo (ẩn dưới 1600px) |
| Tìm kiếm | ✅ Pagefind |
| Mobile nav | ✅ Magic Curved Menu |

---

## 1. 💰 Chiến lược vùng quảng cáo (Ad Placement)

Bạn đã có khung 2 sidebar trái/phải rồi! Dưới đây là gợi ý nâng cấp:

### Vị trí nên gắn ads

| Vị trí | Loại Ad | Khi nào hiện | Ghi chú |
|---|---|---|---|
| **Sidebar trái** (đã có) | Banner dọc 160x600 / 300x250 | Màn ≥1600px | ✅ Đã có khung |
| **Sidebar phải** (đã có) | Banner dọc / Adsense responsive | Màn ≥1600px | ✅ Đã có khung |
| **Trong bài blog** | In-article ad | Sau paragraph thứ 3 | Tự nhiên, không phá UX |
| **Cuối bài viết** | Banner ngang 728x90 | Mọi kích thước | Sau khi đọc xong |
| **Giữa danh sách** | Native ad giả blog card | Trang list blog/projects | Blend với content |

### Cách triển khai

```astro
<!-- Tạo component AdSlot.astro -->
<!-- Dùng Google Adsense hoặc tự quản lý banner affiliate -->
<!-- Có thể dùng slot fallback khi chưa có ad thật -->
```

> [!TIP]
> Gợi ý: Tạo component `AdSlot.astro` có prop `type` (sidebar/inline/banner) để quản lý tập trung. Khi chưa có Adsense, hiển thị banner tự quảng bá project/dịch vụ của mình.

---

## 2. 🎮 Nhúng Game/App (Vue/React) — **Phân tích 3 cách**

### So sánh 3 phương án

| | **Cách 1: Component trực tiếp** ⭐ | **Cách 2: Git Submodule** | **Cách 3: iframe deploy riêng** |
|---|---|---|---|
| **Cách làm** | Tạo folder `src/games/` hoặc `src/apps/`, viết Vue/React component, import vào trang Astro | Thêm game repo làm submodule vào `src/games/` | Deploy game lên Vercel/Netlify riêng, nhúng `<iframe>` |
| **Ưu điểm** | Nhanh, SEO tốt, cùng build, share state dễ | Tách code riêng, team khác dev được | Hoàn toàn độc lập, không ảnh hưởng build |
| **Nhược điểm** | Bundle size tăng | Config phức tạp, CI/CD cần setup thêm | Không SEO, UX kém (scroll lồng), chậm hơn |
| **Phù hợp khi** | Game/app nhỏ-vừa, cùng 1 dev | Team lớn, repo riêng | App cực lớn, framework khác (Angular, Svelte...) |
| **Độ khó** | ⭐ Dễ nhất | ⭐⭐⭐ Phức tạp | ⭐⭐ Trung bình |

### ⭐ Cách 1: Component trực tiếp — **KHUYÊN DÙNG**

Vì bạn đã có `@astrojs/react` và `@astrojs/vue`, bạn hoàn toàn có thể:

```
src/
├── components/
│   └── react/          # Đã có (Typewriter, Quiz...)
├── apps/               # 🆕 Folder mới cho mini-apps/games
│   ├── react/
│   │   ├── TicTacToe.tsx
│   │   └── MemoryGame.tsx
│   └── vue/
│       ├── SnakeGame.vue
│       └── Calculator.vue
├── pages/
│   └── playground/     # 🆕 Trang showcase apps
│       ├── index.astro       # Danh sách tất cả games/apps
│       └── [slug].astro      # Trang chi tiết từng game
```

**Ví dụ sử dụng trong page:**

```astro
---
// src/pages/playground/tic-tac-toe.astro
import Layout from '../../layouts/Layout.astro';
import TicTacToe from '../../apps/react/TicTacToe';
---
<Layout title="Tic Tac Toe">
  <div class="max-w-2xl mx-auto">
    <h1>🎮 Tic Tac Toe</h1>
    <!-- client:load = hydrate ngay, client:visible = hydrate khi scroll tới -->
    <TicTacToe client:load />
  </div>
</Layout>
```

> [!IMPORTANT]
> **Astro Islands** cho phép bạn mix React + Vue trên cùng 1 trang! Mỗi component được hydrate độc lập. Đây chính là điểm mạnh nhất của Astro cho use case này.

### Cách 2: Git Submodule (nếu muốn repo riêng)

```bash
# Thêm game repo riêng làm submodule
git submodule add https://github.com/ITmrHoang/snake-game.git src/apps/snake-game

# Trong repo game, export component
# src/apps/snake-game/src/SnakeGame.vue
```

> [!WARNING]
> Git submodule **tăng complexity** đáng kể: CI/CD phải `--recurse-submodules`, team member phải `git submodule update`. Chỉ nên dùng khi thực sự cần tách repo.

### Cách 3: iframe (backup plan)

```astro
<!-- Chỉ dùng khi game quá lớn hoặc dùng framework khác -->
<iframe 
  src="https://my-snake-game.vercel.app" 
  width="100%" 
  height="600px"
  class="rounded-2xl border-0 shadow-lg"
  loading="lazy"
/>
```

---

## 3. 🌟 Gợi ý thêm tính năng mới

### 🔥 Ưu tiên cao (nên làm sớm)

| Tính năng | Mô tả | Độ khó |
|---|---|---|
| **🎮 Playground / Lab** | Trang tổng hợp tất cả mini-games, tools, demos | ⭐⭐ |
| **🌙 Dark Mode** | Toggle sáng/tối, lưu preference vào localStorage | ⭐⭐ |
| **📊 Reading Progress Bar** | Thanh tiến trình đọc bài viết (top of page) | ⭐ |
| **💬 Giscus / Utterances** | Comment bằng GitHub Discussions (miễn phí, không DB) | ⭐ |
| **📧 Newsletter / Subscribe** | Form đăng ký email (dùng Buttondown hoặc Mailchimp free) | ⭐⭐ |

### 💡 Ưu tiên trung bình

| Tính năng | Mô tả | Độ khó |
|---|---|---|
| **🏷️ Tag System** | Gắn tag cho blog/notes, filter theo tag | ⭐⭐ |
| **📖 Table of Contents (TOC)** | Sidebar mục lục tự sinh cho bài dài, highlight section đang đọc | ⭐⭐ |
| **⏱️ Estimated Reading Time** | Hiển thị thời gian đọc ước tính cho mỗi bài | ⭐ |
| **🔗 Share Buttons** | Nút chia sẻ lên Twitter/Facebook/LinkedIn/Copy link | ⭐ |
| **📈 View Counter** | Đếm lượt xem (dùng [Umami](https://umami.is/) - free, self-host) | ⭐⭐ |
| **🎯 Related Posts** | Gợi ý bài liên quan cuối mỗi bài viết | ⭐⭐ |

### 🚀 Ưu tiên thấp (nice-to-have)

| Tính năng | Mô tả | Độ khó |
|---|---|---|
| **🤖 AI Chat Widget** | Chatbot trả lời câu hỏi về portfolio/CV (dùng Gemini API) | ⭐⭐⭐ |
| **📄 Resume/CV Page** | Trang CV online có nút tải PDF | ⭐⭐ |
| **🏆 Achievements / Certificates** | Showcase chứng chỉ, thành tích | ⭐ |
| **🌐 i18n (Đa ngôn ngữ)** | Hỗ trợ Tiếng Việt + English | ⭐⭐⭐ |
| **📱 PWA Support** | Cài portfolio như app trên điện thoại | ⭐⭐ |
| **🎨 Theme Customizer** | Cho visitor chọn accent color | ⭐⭐ |
| **⌨️ Command Palette** | Ctrl+K mở quick search/navigate (như VS Code) | ⭐⭐⭐ |

---

## 4. 📋 Kế hoạch triển khai đề xuất

### Phase 1 — Nền tảng (1-2 tuần)
1. ✅ Tạo `src/apps/` folder structure
2. ✅ Tạo trang `/playground/` (danh sách + chi tiết)
3. ✅ Viết 1-2 mini game đầu tiên (React/Vue)
4. ✅ Nâng cấp AdSlot component cho sidebar hiện có

### Phase 2 — Tăng engagement (2-3 tuần)
5. 🌙 Dark Mode
6. 💬 Giscus comments  
7. 📊 Reading progress + TOC
8. 🏷️ Tag system

### Phase 3 — Monetization & Growth (ongoing)
9. 📧 Newsletter
10. 📈 Analytics (Umami)
11. 🤖 AI Chat Widget
12. 💰 Tích hợp Google Adsense thật

---

## 5. ❓ Câu hỏi cần bạn quyết định

Trước khi bắt tay vào làm, tôi cần biết:

1. **Về Playground/Games**: Bạn muốn bắt đầu với game nào? (Tic-tac-toe, Snake, Memory, Calculator, hay ý tưởng riêng?)
2. **Về Ads**: Bạn đã có tài khoản Google Adsense chưa, hay muốn tạm dùng banner tự quảng bá?
3. **Về tính năng ưu tiên**: Trong danh sách trên, bạn muốn làm cái nào trước?

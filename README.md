# Astro + Decap CMS Portfolio 🚀

**Language / Ngôn ngữ:** [English](#english) | [Tiếng Việt](#tiếng-việt)

---

## Tiếng Việt

Đây là mã nguồn trang web cá nhân (Portfolio + Blog + Sổ tay Ghi chú) siêu tốc độ, được thiết kế tối giản, hiện đại và hoạt động độc lập không cần Database máy chủ phức tạp.

### 🌟 Tính Năng Nổi Bật

- **Astro SSG:** Tạo ra 100% trang HTML tĩnh, tốc độ Load siêu thanh.
- **Tailwind CSS:** Giao diện Responsive cực đẹp và hiện đại.
- **Decap CMS:** Trang quản trị viết bài ngay trên trình duyệt, lưu thẳng về file Markdown (`.mdx`) mà không cần cài đặt CSDL.
- **Full-site Search:** Tích hợp Pagefind để tìm kiếm nội dung tĩnh cực nhanh.

### � Cấu Trúc Thư Mục (Project Structure)

```text
/
├── public/                 # Các tài nguyên tĩnh (Ảnh, Fonts)
│   ├── admin/              # CHỨA GIAO DIỆN QUẢN TRỊ CMS (index.html, config.yml)
│   └── uploads/            # Ảnh được tải lên từ CMS
├── src/
│   ├── components/         # Các mảnh giao diện UI tái sử dụng được (Callout React)
│   ├── content/            # Nơi lưu trữ TOÀN BỘ BÀI VIẾT (Projects, Blog, Notes)
│   │   ├── blog/           # Các bài viết blog (.mdx)
│   │   ├── notes/          # Ghi chú / Sổ tay (.mdx)
│   │   └── projects/       # Dự án cá nhân (.mdx)
│   ├── layouts/            # Layout bọc cố định (Navbar, Footer, Sidebar Notes)
│   └── pages/              # Khai báo các trang của hệ thống (Ví dụ: /blog, /search)
└── astro.config.mjs        # File cấu hình trung tâm của Astro
```

### 🧠 Cách Tính Năng "Cây Thư Mục Ghi Chú" (Notes Sidebar) Hoạt Động

Trong trang `/notes`, hệ thống được thiết kế với giao diện Documentation chuyên nghiệp:
- Bất cứ khi nào bạn tạo 1 bài Note mới (từ trang Quản trị), bạn sẽ được yêu cầu chọn **Topic (Chủ Đề)** và nhập **Title (Tiêu đề bài viết)**.
- Khi bấm Lưu:
  - Hệ thống code ở `NotesLayout.astro` sẽ tự động tìm tất cả các **Topic** có mặt để biến thành **Menu Chính** (Ví dụ: Menu Frontend, Menu Backend).
  - Tiếp theo, nó tự lấy **Title** của bài viết nhét vào làm **Sub-menu** (Menu con) tương ứng.
- **Bạn KHÔNG THỂ và KHÔNG CẦN CẤU HÌNH MENU này bằng tay.** Cứ tạo bài viết, chọn Topic, hệ thống tự lo phần hiển thị Sidebar!

### 💻 Chạy Dự Án Ở Máy Của Bạn (Local Development)

Mở Terminal và khởi chạy dự án tại Local:

```bash
npm install
npm run dev
```

Lệnh `npm run dev` sẽ đồng thời chạy 2 máy chủ:
1. `http://localhost:4321` - Xem giao diện trang web thực tế.
2. `http://localhost:8081` - Proxy ngầm của Decap CMS.

👉 **Vào trang quản trị bài viết tại:** `http://localhost:4321/admin`

*(Lưu ý tính năng tìm kiếm `/search` bằng Pagefind yêu cầu bạn phải Build trang web tĩnh ở lệnh bên dưới mới hoạt động được trên môi trường Local).*

### 📦 Đưa Lên Mạng (Build & Deploy)

```bash
npm run build
```

Hệ thống sẽ build toàn bộ HTML nén vào thư mục `dist/` và sau đó tự động chạy lệnh sinh Index tìm kiếm nội dung bằng `pagefind`. Đẩy code lên môi trường Github, kết hợp Vercel/Netlify để triển khai miễn phí 100%.

---

## English

This is the source code for a lightning-fast, modern personal website (Portfolio + Blog + Knowledge Notes), built to operate independently without a complex backend database.

### 🌟 Key Features

- **Astro SSG:** Generates 100% static HTML pages, delivering lightning-fast load times.
- **Tailwind CSS:** Beautiful, responsive, and modern UI out of the box.
- **Decap CMS:** An in-browser content management system that securely saves directly to Markdown (`.mdx`) files (No setup required).
- **Full-site Search:** Integrated Pagefind for instantaneous static content search.

### 📂 Project Structure

```text
/
├── public/                 # Static assets (Images, Fonts)
│   ├── admin/              # CONTAINS THE CMS DASHBOARD UI (index.html, config.yml)
│   └── uploads/            # Images uploaded via the CMS
├── src/
│   ├── components/         # Reusable UI parts (e.g., React Callout component)
│   ├── content/            # STORAGE DIRECTORY FOR ALL CONTENT (Projects, Blog, Notes)
│   │   ├── blog/           # Blog posts (.mdx)
│   │   ├── notes/          # Knowledge base notes (.mdx)
│   │   └── projects/       # Portfolio projects (.mdx)
│   ├── layouts/            # Fixed layout wrappers (Navbar, Footer, Notes Sidebar)
│   └── pages/              # System routing declarations (e.g., /blog, /search)
└── astro.config.mjs        # Astro's core configuration file
```

### 🧠 How the "Notes Sidebar" Works

On the `/notes` page, the system is designed with a professional Documentation-style layout:
- Whenever you create a new Note (via the Admin dashboard), you are prompted to select a **Topic** and enter a **Title**.
- Upon saving:
  - The logic inside `NotesLayout.astro` dynamically extracts all existing **Topics** and renders them as the **Main Menu categories** (e.g., Frontend, Backend).
  - It then maps the **Titles** of the matching articles as **Sub-menus** underneath their respective categories.
- **You CANNOT and DO NOT NEED to configure this menu manually.** Just create the content and pick a Topic—the system handles the Sidebar tree mapping automatically!

### � Running Locally

Open your Terminal and start the project locally:

```bash
npm install
npm run dev
```

The `npm run dev` command concurrently runs:
1. `http://localhost:4321` - The live Astro frontend site.
2. `http://localhost:8081` - The Decap CMS local Git proxy.

👉 **Access the Content Dashboard at:** `http://localhost:4321/admin`

*(Note: The `/search` feature powered by Pagefind requires you to run the static production build command below at least once before it works locally).*

### 📦 Build & Deploy

```bash
npm run build
```

The system will generate and compress all static HTML into the `dist/` directory and subsequently run a script to create the Search Index via `pagefind`. Push this code to Github, and deploy entirely for free via Vercel or Netlify.

Đây là tổng hợp **tất cả các nguyên lý và mô hình quan trọng nhất** về tái sử dụng code và viết code sạch:

---

## 1. Các Nguyên Lý Cơ Bản (Coding Principles)

| Nguyên lý                         | Viết tắt | Ý nghĩa                                                                             |
| --------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| **Don't Repeat Yourself**         | DRY      | Không lặp lại code. Nếu 1 đoạn logic xuất hiện ≥2 lần → tách thành hàm/module riêng |
| **Keep It Simple, Stupid**        | KISS     | Viết code đơn giản nhất có thể. Đừng over-engineer                                  |
| **You Aren't Gonna Need It**      | YAGNI    | Chỉ code những gì cần ngay bây giờ. Đừng code "phòng hờ tương lai"                  |
| **Separation of Concerns**        | SoC      | Tách biệt các mối quan tâm: UI riêng, logic riêng, data riêng                       |
| **Composition over Inheritance**  | CoI      | Ưu tiên ghép nối (compose) hơn kế thừa (extend)                                     |
| **Law of Demeter**                | LoD      | Một object chỉ nên nói chuyện với "bạn bè trực tiếp", không gọi chuỗi `a.b.c.d()`   |
| **Fail Fast**                     | —        | Phát hiện lỗi sớm nhất có thể, đừng để lỗi lan ra xa                                |
| **Convention over Configuration** | CoC      | Quy ước mặc định thay vì cấu hình phức tạp (Rails, Spring Boot)                     |

---

## 2. SOLID Principles (5 nguyên lý OOP)

| Chữ   | Nguyên lý             | Giải thích ngắn                                                            |
| ----- | --------------------- | -------------------------------------------------------------------------- |
| **S** | Single Responsibility | Mỗi class chỉ làm **1 việc duy nhất**                                      |
| **O** | Open/Closed           | Mở cho mở rộng (extend), đóng cho sửa đổi (modify)                         |
| **L** | Liskov Substitution   | Class con phải thay thế được class cha mà không gây lỗi                    |
| **I** | Interface Segregation | Tách interface nhỏ, cụ thể. Đừng ép class implement method không cần       |
| **D** | Dependency Inversion  | Depend vào abstraction (interface), không depend vào implementation cụ thể |

---

## 3. Design Patterns (23 mẫu thiết kế GoF)

### Creational (Khởi tạo)
- **Singleton** — 1 instance duy nhất (DB connection, Logger)
- **Factory Method** — Tạo object mà không cần biết class cụ thể
- **Abstract Factory** — Factory của các Factory
- **Builder** — Xây dựng object phức tạp từng bước
- **Prototype** — Clone object thay vì tạo mới

### Structural (Cấu trúc)
- **Adapter** — Chuyển đổi interface không tương thích
- **Decorator** — Thêm tính năng mới mà không sửa class gốc
- **Facade** — Giao diện đơn giản cho hệ thống phức tạp
- **Proxy** — Đại diện cho object khác (cache, lazy load, bảo mật)
- **Bridge** — Tách abstraction khỏi implementation
- **Composite** — Cây phân cấp (menu, folder)
- **Flyweight** — Chia sẻ object nhẹ để tiết kiệm bộ nhớ

### Behavioral (Hành vi)
- **Observer** — Pub/Sub, thông báo khi state thay đổi (Event Emitter)
- **Strategy** — Đổi thuật toán lúc runtime
- **Command** — Đóng gói request thành object (Undo/Redo)
- **State** — Thay đổi hành vi khi state thay đổi
- **Template Method** — Khung sườn cố định, bước con tùy biến
- **Iterator** — Duyệt collection mà không lộ cấu trúc bên trong
- **Mediator** — Trung gian điều phối giao tiếp giữa các object
- **Chain of Responsibility** — Chuyền request qua chuỗi handler (Middleware)
- **Visitor** — Thêm operation mới mà không sửa class
- **Memento** — Lưu/phục hồi state (Snapshot)
- **Interpreter** — Xử lý ngôn ngữ/biểu thức

---

## 4. Architecture Patterns (Kiến trúc phần mềm)

| Pattern                          | Mô tả                                            | Ví dụ                      |
| -------------------------------- | ------------------------------------------------ | -------------------------- |
| **MVC**                          | Model-View-Controller                            | Rails, Spring MVC, Laravel |
| **MVVM**                         | Model-View-ViewModel                             | Angular, WPF, SwiftUI      |
| **MVP**                          | Model-View-Presenter                             | Android cũ                 |
| **Clean Architecture**           | Layers: Entity → UseCase → Interface → Framework | Uncle Bob                  |
| **Hexagonal (Ports & Adapters)** | Core logic ở trung tâm, bên ngoài là adapters    | Domain-Driven Design       |
| **Microservices**                | Chia app thành nhiều service nhỏ độc lập         | Netflix, Uber              |
| **Monolithic**                   | 1 app duy nhất chứa tất cả                       | App nhỏ, startup           |
| **Event-Driven**                 | Giao tiếp qua event/message                      | Kafka, RabbitMQ            |
| **CQRS**                         | Tách Read (Query) và Write (Command) riêng biệt  | Event Sourcing             |
| **Serverless**                   | Không quản lý server, chạy theo function         | AWS Lambda, Vercel         |
| **Layered (N-tier)**             | Presentation → Business → Data                   | Java Enterprise            |

---

## 5. Các Nguyên Lý Khác Cũng Rất Quan Trọng

- **TDD (Test-Driven Development)** — Viết test trước, code sau
- **BDD (Behavior-Driven Development)** — Viết test theo hành vi người dùng
- **CI/CD** — Tự động test + deploy liên tục
- **Code Smell** — Nhận biết "mùi" code xấu để refactor
- **Refactoring** — Cải thiện cấu trúc code mà không thay đổi hành vi
- **Domain-Driven Design (DDD)** — Thiết kế phần mềm theo nghiệp vụ thực tế
- **12-Factor App** — 12 quy tắc xây dựng SaaS hiện đại

---

**Tóm lại thứ tự ưu tiên học:**
1. **KISS + DRY + YAGNI** → nguyên lý nền tảng
2. **SOLID** → viết OOP đúng cách
3. **Design Patterns** → giải quyết bài toán lặp lại
4. **Architecture Patterns** → thiết kế hệ thống lớn
5. **TDD + CI/CD + DDD** → quy trình chuyên nghiệp

Bạn muốn tôi đi sâu vào phần nào hoặc tạo một bài viết chi tiết kèm ví dụ code cho từng pattern không?
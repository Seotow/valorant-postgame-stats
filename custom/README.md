# Hướng dẫn tạo Custom HTML Overlay

Mọi file HTML đặt trong thư mục `custom/` đều được serve tự động qua:

```
http://127.0.0.1:7123/custom/<tên-file>.html
```

File chỉ cần include một dòng script để tự nhận data live từ server — không cần viết thêm bất kỳ JavaScript nào.

---

## Cách hoạt động

```
Server (API + SSE)
      │
      ▼
overlay.js  ──── fetch /api/current-match ──▶ buildPostgameData()
      │                                              │
      │           fetch /api/overlay-config ──▶ applyOverlayConfig()
      │                                              │
      └──── render(data) ──▶ điền data-bind / data-bind-img / data-round-*
```

`overlay.js` lắng nghe Server-Sent Events (SSE) trên `/api/events`. Mỗi khi trận đấu hoặc config thay đổi, nó **tự động** gọi lại API và điền lại toàn bộ binding trong HTML.

---

## Bước tạo layout mới

### 1. Tạo file HTML

```html
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>My Custom Overlay</title>
  <link rel="stylesheet" href="/custom/my-style.css" />
</head>
<body>

  <!-- Nền động từ config -->
  <div class="bg-layer" id="bg-layer"></div>

  <!-- Nội dung bất kỳ với data-bind -->
  <div class="score">
    <span data-bind="leftScore">0</span>
    :
    <span data-bind="rightScore">0</span>
  </div>

  <!-- BẮT BUỘC: script này điều khiển mọi binding -->
  <script src="/static/js/overlay.js"></script>
</body>
</html>
```

### 2. Đặt file vào `custom/`

```
custom/
  my-overlay.html
  my-style.css
```

### 3. Mở trong OBS hoặc trình duyệt

```
http://127.0.0.1:7123/custom/my-overlay.html
```

---

## Tham chiếu: Tất cả Binding

### Text — `data-bind="<key>"`

Đặt attribute vào bất kỳ element nào. `overlay.js` sẽ ghi `textContent` tự động.

| Attribute value | Nội dung | Ví dụ |
|---|---|---|
| `leftTeamName` | Tên đội trái | `T1` |
| `rightTeamName` | Tên đội phải | `PRX` |
| `leftScore` | Tỷ số đội trái | `13` |
| `rightScore` | Tỷ số đội phải | `11` |
| `leftResult` | Kết quả đội trái | `THẮNG` / `THUA` |
| `rightResult` | Kết quả đội phải | `THẮNG` / `THUA` |
| `mapName` | Tên bản đồ (viết hoa) | `ASCENT` |
| `mapNameLeft` | Tên bản đồ (panel trái) | `ASCENT` |
| `queueName` | Loại hàng chờ | `COMPETITIVE` |
| `duration` | Thời lượng trận | `38:24` |

#### MVP — đội trái

| Attribute value | Nội dung |
|---|---|
| `leftMvpAgent` | Tên agent của MVP |
| `leftMvpName` | Tên game của MVP |
| `leftMvpKills` | Số kill |
| `leftMvpDeaths` | Số death |
| `leftMvpAcs` | ACS (điểm giao tranh TB) |

#### MVP — đội phải

| Attribute value | Nội dung |
|---|---|
| `rightMvpAgent` | Tên agent của MVP |
| `rightMvpName` | Tên game của MVP |
| `rightMvpKills` | Số kill |
| `rightMvpDeaths` | Số death |
| `rightMvpAcs` | ACS |

---

### Hình ảnh — `data-bind-img="<key>"`

Đặt vào thẻ `<img>`. `overlay.js` sẽ ghi `src` tự động.

| Attribute value | Nội dung |
|---|---|
| `leftTeamLogo` | Logo đội trái (upload từ config) |
| `rightTeamLogo` | Logo đội phải |
| `leagueLogo` | Logo giải đấu |
| `leftMvpPortrait` | Ảnh nhân vật fullsize MVP trái |
| `rightMvpPortrait` | Ảnh nhân vật fullsize MVP phải |
| `mapImageLeft` | Ảnh splash bản đồ (tự động từ API) |
| `sponsorImage` | Ảnh nhà tài trợ (upload từ config) |

---

### Bảng player — `data-round-*`

Mỗi đội có tối đa **4 player** (index `0` → `3`, bỏ MVP). Đặt trên bất kỳ element nào.

#### Text

| Attribute | Nội dung |
|---|---|
| `data-round-left-sub="0"` | Tên agent player trái #1 |
| `data-round-left-main="0"` | Tên game player trái #1 |
| `data-round-left-kills="0"` | Số kill player trái #1 |
| `data-round-left-acs="0"` | ACS player trái #1 |
| `data-round-right-sub="0"` | Tên agent player phải #1 |
| `data-round-right-main="0"` | Tên game player phải #1 |
| `data-round-right-kills="0"` | Số kill player phải #1 |
| `data-round-right-acs="0"` | ACS player phải #1 |

> Thay `0` bằng `1`, `2`, `3` cho các player tiếp theo.

#### Icon agent (thẻ `<img>`)

| Attribute | Nội dung |
|---|---|
| `data-round-left-icon="0"` | Icon agent player trái #1 |
| `data-round-right-icon="0"` | Icon agent player phải #1 |

---

### CSS Variables (từ overlay-config)

Tất cả CSS variable bên dưới được set tự động lên `:root` khi `applyOverlayConfig()` chạy. Dùng thoải mái trong CSS của bạn.

| Variable | Mô tả | Mặc định |
|---|---|---|
| `--primary-rgb` | Màu chủ đạo (r,g,b) | `255, 90, 0` |
| `--primary-a` | Opacity màu chủ đạo | `1` |
| `--cell-rgb` | Màu ô nền tối (r,g,b) | `52, 52, 52` |
| `--cell-a` | Opacity ô nền tối | `1` |
| `--cell2-rgb` | Màu ô nền 2 (r,g,b) | `27, 29, 27` |
| `--cell2-a` | Opacity ô nền 2 | `1` |
| `--header-bg-rgb` | Màu nền header (r,g,b) | `52, 52, 52` |
| `--header-bg-a` | Opacity nền header | `1` |
| `--header-text` | Màu chữ header | `#f5f5f5` |
| `--body-text` | Màu chữ nội dung | `#f5f5f5` |
| `--font-overlay` | Font family | `"Tungsten"` |
| `--white` | Trắng | `#f5f5f5` |
| `--black` | Đen | `#050505` |
| `--line` | Độ dày viền | `4px` |

Ví dụ sử dụng trong CSS:

```css
.my-header {
  background: rgba(var(--header-bg-rgb), var(--header-bg-a));
  color: var(--header-text);
  border-bottom: var(--line) solid rgba(var(--primary-rgb), var(--primary-a));
}
```

### Element đặc biệt

| ID | Mô tả |
|---|---|
| `id="bg-layer"` | Div nền — `overlay.js` set `background-image` và `backgroundColor` từ config |

---

## Mẹo

- Có thể dùng **nhiều element cùng một binding** — `overlay.js` dùng `querySelectorAll`, tất cả đều được update.
- Không cần `data-bind` nào bắt buộc — chỉ dùng những gì layout cần.
- Để xem trước khi chưa chọn trận, `overlay.js` tự động hiển thị **demo data**.
- CSS của bạn có thể đặt bất kỳ đâu: `custom/`, `static/css/`, hoặc inline trong HTML.

---

## File trong thư mục này

| File | Mô tả |
|---|---|
| `README.md` | Hướng dẫn này |
| `template.html` | Template trống với tất cả binding có chú thích |
| `example-scoreboard.html` | Ví dụ hoàn chỉnh: scoreboard tối giản |
| `example-scoreboard.css` | CSS cho ví dụ scoreboard |

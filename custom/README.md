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

## Mẹo (overlay.js)

- Có thể dùng **nhiều element cùng một binding** — `overlay.js` dùng `querySelectorAll`, tất cả đều được update.
- Không cần `data-bind` nào bắt buộc — chỉ dùng những gì layout cần.
- Để xem trước khi chưa chọn trận, `overlay.js` tự động hiển thị **demo data**.
- CSS của bạn có thể đặt bất kỳ đâu: `custom/`, `static/css/`, hoặc inline trong HTML.

---

## Overlay Match MVP — dùng `mvp.js`

Nếu bạn muốn tạo layout riêng cho **Match MVP** (player có ACS cao nhất toàn trận), dùng `mvp.js` thay vì `overlay.js`. Script này gọi `/api/current-mvp` và cũng lắng nghe SSE để tự động cập nhật.

```html
<!-- BẮT BUỘC: thay overlay.js bằng mvp.js -->
<script src="/static/js/mvp.js"></script>
```

> ⚠️ **Không dùng cả hai cùng lúc** trong một file HTML.

### Cách hoạt động

```
Server ──▶ /api/current-mvp ──▶ mvp.js render() ──▶ điền theo id=""
```

Khác với `overlay.js`, `mvp.js` dùng **`id` cố định** thay vì `data-bind`. Bạn đặt đúng `id` vào element là dữ liệu tự điền.

### Tham chiếu: Tất cả `id` của mvp.js

#### Hình ảnh agent

| `id` | Nội dung |
|---|---|
| `mvp-agent-bg` | `<img>` — ảnh nền agent có màu (`background.png` từ valorant-api.com) |
| `mvp-agent-portrait` | `<img>` — fullportrait agent nền trong (`fullportrait.png`) |

#### Thông tin player

| `id` | Nội dung | Ví dụ |
|---|---|---|
| `mvp-name` | Tên game (Riot ID) | `HYY` |
| `mvp-team-name` | Tên đội (lấy từ overlay-config theo đội nào) | `RRQ` |
| `mvp-team-logo` | `<img>` — logo đội (lấy từ overlay-config) | — |

#### Stats nâng cao

| `id` | Chỉ số | Cách tính | Ví dụ |
|---|---|---|---|
| `mvp-acs` | ĐGTTB (ACS) | `score / total_rounds` | `281` |
| `mvp-kda` | KDA | `kills/deaths` | `22/19` |
| `mvp-dpr` | Sát thương/vòng đấu | Tổng damage từ rounds data / rounds | `160.9` |
| `mvp-fk` | % Chiến công đầu | Vòng mở màn do player này giết đầu tiên / tổng vòng × 100 | `17.4` |
| `mvp-kast` | KAST % | Vòng có Kill / Assist / Survive / Trade (cửa sổ 5 s) / tổng × 100 | `78.3` |

### Ví dụ layout MVP tối giản

```html
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Custom MVP Lower Third</title>
  <style>
    body { background: transparent; font-family: "Tungsten", sans-serif; text-transform: uppercase; }
    .card { display: flex; align-items: center; gap: 24px; background: rgba(var(--cell-rgb), var(--cell-a)); padding: 20px 32px; }
    img  { height: 80px; object-fit: contain; }
    .name  { font-size: 64px; font-weight: 900; color: var(--header-text); }
    .label { font-size: 16px; color: var(--body-text); opacity: 0.6; }
    .stat  { font-size: 36px; font-weight: 700; color: rgba(var(--primary-rgb), var(--primary-a)); }
  </style>
</head>
<body>
  <div class="bg-layer" id="bg-layer"></div>

  <div class="card">
    <img id="mvp-agent-portrait" src="" alt="" />

    <div>
      <div class="name"  id="mvp-name">PLAYER</div>
      <div class="label">MVP · ĐGTTB</div>
      <div class="stat"  id="mvp-acs">0</div>
    </div>

    <div>
      <div class="label">KDA</div>      <div class="stat" id="mvp-kda">0/0</div>
      <div class="label">KAST %</div>  <div class="stat" id="mvp-kast">0</div>
    </div>

    <div>
      <div class="label">SAT/VĐ</div>  <div class="stat" id="mvp-dpr">0</div>
      <div class="label">FK %</div>    <div class="stat" id="mvp-fk">0</div>
    </div>
  </div>

  <!-- dùng mvp.js, KHÔNG phải overlay.js -->
  <script src="/static/js/mvp.js"></script>
</body>
</html>
```

### Dữ liệu JSON thô từ `/api/current-mvp`

Nếu bạn muốn viết hoàn toàn script riêng, endpoint này trả về:

```json
{
  "puuid":            "...",
  "name":             "HYY",
  "tag":              "RRQ",
  "team_id":          "Blue",
  "is_my_team":       true,
  "agent_id":         "a3bab",
  "agent_name":       "Neon",
  "acs":              281,
  "kills":            22,
  "deaths":           19,
  "assists":          5,
  "damage_per_round": 160.9,
  "first_kill_pct":   17.4,
  "kast_pct":         78.3
}
```

URL ảnh agent từ `agent_id`:
- Nền có màu: `https://media.valorant-api.com/agents/{agent_id}/background.png`
- Fullportrait trong suốt: `https://media.valorant-api.com/agents/{agent_id}/fullportrait.png`
- Icon nhỏ: `https://media.valorant-api.com/agents/{agent_id}/displayicon.png`

---

## File trong thư mục này

| File | Mô tả |
|---|---|
| `README.md` | Hướng dẫn này |
| `template.html` | Template trống với tất cả binding có chú thích |
| `example-scoreboard.html` | Ví dụ hoàn chỉnh: scoreboard tối giản |
| `example-scoreboard.css` | CSS cho ví dụ scoreboard |

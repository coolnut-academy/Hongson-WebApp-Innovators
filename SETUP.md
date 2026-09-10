# คู่มือการติดตั้งและตั้งค่าระบบ (SETUP GUIDE)
## AI Learning Game Gallery WebApp

คู่มือนี้สำหรับผู้ดูแลระบบ เพื่อเตรียมความพร้อมของ **Google Sheets**, **Google Drive** และ **Google Apps Script** ก่อนนำข้อมูลจริงมาเชื่อมต่อกับ Frontend

---

### ขั้นตอนที่ 1: เตรียม Google Spreadsheet (ฐานข้อมูล)

1. เข้าไปที่ [Google Sheets](https://sheets.new) และสร้าง Spreadsheet ใหม่ 1 ไฟล์
2. ตั้งชื่อไฟล์ เช่น `AI-Learning-Game-Gallery-DB`
3. คัดลอก **URL ของ Spreadsheet** หรือ **Spreadsheet ID** เก็บไว้
   > *ตัวอย่าง Spreadsheet ID*: ใน URL `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit` ค่า ID คือ `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
4. **ไม่ต้องสร้างแท็บหรือหัวคอลัมน์เอง** — ระบบจะมีฟังก์ชัน `setupDatabase()` สร้างโครงสร้างตารางและจัดฟอร์แมตให้อัตโนมัติในขั้นตอนถัดไป

---

### ขั้นตอนที่ 2: เตรียม Google Drive Root Folder (ที่เก็บรูปปกเกม)

1. เข้าไปที่ [Google Drive](https://drive.google.com)
2. สร้างโฟลเดอร์ใหม่ 1 โฟลเดอร์ ตั้งชื่อ เช่น `AI Learning Game Gallery`
3. เข้าไปในโฟลเดอร์ที่เพิ่งสร้าง แล้วคัดลอก **Folder URL** หรือ **Folder ID** จากแถบ URL
   > *ตัวอย่าง Folder ID*: ใน URL `https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ` ค่า ID คือ `1aBcDeFgHiJkLmNoPqRsTuVwXyZ`
4. โฟลเดอร์นี้จะทำหน้าที่เป็น **Root Folder** เมื่อมีการสร้างหัวข้อใหม่ ระบบจะสร้างโฟลเดอร์ย่อยในนี้โดยอัตโนมัติ

---

### ขั้นตอนที่ 3: สร้างโปรเจกต์ Google Apps Script

1. ไปที่ [Google Apps Script Dashboard](https://script.google.com/home) แล้วกด **"โครงการใหม่" (New Project)**
2. ตั้งชื่อโครงการที่มุมซ้ายบน เช่น `AI-Game-Gallery-Backend`
3. นำไฟล์ในโฟลเดอร์ `appscript/` ของโปรเจกต์นี้ไปใส่:
   - **ไฟล์สคริปต์ (.gs)**:
     - `Code.gs`
     - `Config.gs`
     - `Sheets.gs`
     - `Drive.gs`
     - `Auth.gs`
     - `Categories.gs`
     - `Submissions.gs`
     - `Utils.gs`
   - **ไฟล์ HTML**:
     - กดปุ่ม `+` ข้างๆ ส่วนไฟล์ เลือก **HTML** ตั้งชื่อ `Bridge` แล้วนำโค้ดจาก `Bridge.html` ไปวาง

---

### ขั้นตอนที่ 4: กำหนด Script Properties (ตัวแปรความปลอดภัย)

1. ในหน้า Google Apps Script ให้คลิกไอคอนฟันเฟือง **"การตั้งค่าโครงการ" (Project Settings)** ที่เมนูด้านซ้าย
2. เลื่อนลงมาที่หัวข้อ **"คุณสมบัติของสคริปต์" (Script Properties)** แล้วคลิก **"เพิ่มคุณสมบัติของสคริปต์" (Add script property)**
3. เพิ่มตัวแปรทั้งหมด 4 ค่าดังนี้:

| คุณสมบัติ (Property) | ค่า (Value) | คำอธิบาย |
| :--- | :--- | :--- |
| `SPREADSHEET_ID` | *[Spreadsheet ID จากขั้นตอนที่ 1]* | รหัส Google Sheets |
| `ROOT_DRIVE_FOLDER_ID` | *[Folder ID จากขั้นตอนที่ 2]* | รหัส Google Drive Root Folder |
| `ADMIN_PASSWORD` | *[รหัสผ่านที่คุณต้องการกำหนด]* | รหัสผ่านสำหรับ Admin Login หน้าเว็บ |
| `ALLOWED_FRONTEND_ORIGIN` | `*` หรือ URL GitHub Pages | เช่น `https://username.github.io` |

4. คลิก **"บันทึกคุณสมบัติของสคริปต์" (Save script properties)**

---

### ขั้นตอนที่ 5: เริ่มต้นฐานข้อมูล (Initialize Database)

1. กลับไปที่หน้าแก้ไขโค้ด (`Code.gs` หรือ `Sheets.gs`)
2. ตรงแถบเครื่องมือด้านบน เลือกฟังก์ชันเป็น **`setupDatabase`** (จากใน `Sheets.gs`)
3. กดปุ่ม **"เรียกใช้" (Run)**
4. ในการรันครั้งแรก Google จะขึ้นหน้าต่างขอสิทธิ์การเข้าถึง (Authorization):
   - คลิก **ตรวจสอบสิทธิ์ (Review permissions)**
   - เลือกบัญชี Google ของคุณ
   - หากขึ้นคำเตือน "Google ไม่ได้ยืนยันแอปนี้" ให้คลิก **ขั้นสูง (Advanced)** แล้วคลิก **ไปที่... (ไม่ปลอดภัย)**
   - คลิก **อนุญาต (Allow)**
5. เมื่อรันเสร็จ ลองเปิด Google Spreadsheet ดู จะพบว่ามี 3 แท็บถูกสร้างขึ้นพร้อมฟอร์แมตที่สวยงาม:
   - `Categories`
   - `Submissions`
   - `AdminLog`

---

### ขั้นตอนที่ 6: เผยแพร่เป็น Web App (Deploy)

1. ที่มุมขวาบนของหน้า Apps Script คลิกปุ่ม **"การทำให้ใช้งานได้" (Deploy) ➔ "การทำให้ใช้งานได้รายการใหม่" (New deployment)**
2. คลิกไอคอนฟันเฟือง เลือกประเภทเป็น **"เว็บแอป" (Web app)**
3. ตั้งค่าดังนี้:
   - **คำอธิบาย (Description)**: `Production v1`
   - **เรียกใช้เป็น (Execute as)**: **ฉัน (Me / your email)** *(สำคัญมาก! เพื่อให้ใช้สิทธิ์คุณในการเขียน Sheet และ Drive)*
   - **ผู้มีสิทธิ์เข้าถึง (Who has access)**: **ทุกคน (Anyone)** *(สำคัญมาก! เพื่อให้นักเรียนส่งผลงานได้โดยไม่ต้องล็อกอิน)*
4. คลิก **"ทำให้ใช้งานได้" (Deploy)**
5. คัดลอก **URL ของเว็บแอป (Web App URL)** ที่ลงท้ายด้วย `/exec`
   > *ตัวอย่าง*: `https://script.google.com/macros/s/AKfycbx.../exec`

---

### รายการข้อมูลที่ต้องนำมาให้ใน Phase 3 (CONNECTION GATE)

เมื่อคุณดำเนินการตามขั้นตอนข้างต้นเรียบร้อยแล้ว ให้นำข้อมูลต่อไปนี้มาส่งในแชท:

1. **Google Spreadsheet ID** (หรือ URL)
2. **Google Drive Root Folder ID** (หรือ URL)
3. **Web App `/exec` URL** (จากขั้นตอน Deploy)
4. **GitHub Pages URL** (ถ้ามีแล้ว หรือชื่อ Repository เพื่อใช้กำหนด CORS)
5. *(รหัสผ่าน Admin ให้เก็บไว้ใน Script Properties ไม่ต้องส่งมาในแชท)*

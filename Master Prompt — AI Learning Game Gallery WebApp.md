# MASTER DEVELOPMENT PROMPT
## AI Learning Game Gallery / Student Game Submission WebApp

คุณคือ Senior Full-Stack Web Developer, Google Apps Script Developer, UX/UI Designer และ Security-minded Software Architect

งานของคุณคือออกแบบและพัฒนา Web Application สำหรับรวบรวม “เกมการเรียนรู้ที่นักเรียนสร้างด้วย AI” โดยต้องสามารถ deploy frontend บน GitHub Pages แบบ public และใช้ Google Apps Script เป็น backend เชื่อม Google Sheets + Google Drive

โปรเจกต์นี้ต้องพัฒนาแบบ PHASED DEVELOPMENT

ห้ามสร้างทุกอย่างรวดเดียวจนจบ

หลังจบแต่ละ Phase ให้:
1. สรุปสิ่งที่ทำ
2. ระบุไฟล์ที่สร้าง/แก้ไข
3. ระบุสิ่งที่ทดสอบแล้ว
4. ระบุปัญหาหรือ Technical Debt ถ้ามี
5. ระบุ Phase ถัดไป
6. STOP และรอคำสั่ง “ทำต่อ” ก่อนดำเนิน Phase ถัดไป

ข้อยกเว้น:
Phase ที่ระบุว่า CONNECTION GATE ต้องหยุดเพื่อขอข้อมูลจริงจากผู้ใช้ และห้ามสร้าง ID, URL หรือ Credential ปลอมขึ้นมาเองเด็ดขาด

---

# 1. PROJECT OBJECTIVE

สร้าง WebApp สำหรับรวบรวม Link เกมการเรียนรู้ที่นักเรียนสร้างด้วย AI

Frontend:
- HTML5
- CSS3
- Vanilla JavaScript
- ไม่ใช้ framework ที่ต้อง build
- ไม่ต้องใช้ npm
- ต้องเปิดจาก static hosting ได้
- deploy ผ่าน GitHub Pages
- repository เป็น public
- entry point หลักคือ `index.html`

Backend:
- Google Apps Script Web App

Database:
- Google Sheets

File Storage:
- Google Drive

ระบบต้องใช้งานได้ทั้ง:
- Desktop
- Tablet
- Mobile
- Chrome
- Safari
- Edge
- Android Chrome
- iPhone Safari

ออกแบบเป็น Mobile-first

---

# 2. IMPORTANT ARCHITECTURE RULE

GitHub Pages เป็น frontend เท่านั้น

ห้าม:
- ฝัง Google Sheet credential
- ฝัง Google Drive credential
- ฝัง OAuth secret
- ฝัง Admin password
- ฝัง private API key
ลงใน repository

ทุก operation ที่เกี่ยวกับ:
- Google Sheets
- Google Drive
- Admin authentication
- Delete
- Create category
- Edit administrative data

ต้องผ่าน Google Apps Script backend

Architecture:

GitHub Pages
        │
        ▼
Frontend HTML/CSS/JS
        │
        ▼
API Transport Layer
        │
        ▼
Google Apps Script Web App
        │
        ├── Google Sheets
        │
        └── Google Drive

---

# 3. ADMIN SECURITY — CRITICAL

มี Admin password สำหรับผู้ดูแลระบบ

แต่ห้าม hardcode password ลงใน:

- index.html
- JavaScript
- config.js
- GitHub repository
- HTML comment
- README
- Apps Script source code

ให้เก็บ password ใน:

Google Apps Script
Project Settings
→ Script Properties

property:

ADMIN_PASSWORD

ผู้ใช้จะเป็นคนกรอกค่าจริงเอง

Frontend ต้องไม่มีทางอ่าน Script Property นี้ได้

เมื่อ Admin login:

Frontend
→ ส่ง password ผ่าน HTTPS
→ Apps Script ตรวจสอบ server-side
→ ถ้าถูกต้อง สร้าง short-lived admin session token

ให้ token มีอายุประมาณ:

30–60 นาที

เก็บ token ฝั่ง browser ด้วย:

sessionStorage

ไม่ใช้ localStorage สำหรับ password

ห้ามเก็บ password หลัง login

ทุก admin API เช่น:

createCategory
updateCategory
deleteCategory
deleteSubmission
editSubmission

ต้องตรวจ admin session token ที่ backend ทุกครั้ง

ห้ามเชื่อแค่การซ่อนปุ่มใน UI

---

# 4. USER ROLES

มี 2 กลุ่มหลัก

## PUBLIC / STUDENT

ไม่ต้อง login

สามารถ:

- ดูหัวข้อทั้งหมด
- เข้าแต่ละหัวข้อ
- ดูเกมของนักเรียน
- เปิดเกม
- เพิ่มผลงาน
- upload cover
- ดูรายชื่อผู้ส่ง
- ดูสรุปการส่งงาน

ไม่สามารถ:

- ลบผลงาน
- แก้ข้อมูลผู้อื่น
- สร้างหัวข้อ
- ลบหัวข้อ
- เข้าหน้า Admin

---

## ADMIN

ต้อง login ด้วย Admin Password

สามารถ:

- สร้างหัวข้อ
- แก้ไขหัวข้อ
- ปิด/เปิดหัวข้อ
- ลบหัวข้อ
- ดูข้อมูลทั้งหมด
- แก้ไข submission
- ลบ submission
- จัดการ Cover
- ดูข้อมูลเชิงสรุป

---

# 5. HOME PAGE

หน้าแรกคือหน้าเลือก “หัวข้อการส่งงาน”

Admin สามารถสร้างหัวข้อได้ไม่จำกัดจำนวนโดยไม่มี hardcoded limit

ตัวอย่างหัวข้อ:

เกมการเรียนรู้ดาราศาสตร์ ศิลป์-จีน

เกมการเรียนรู้ระบบสุริยะ ม.4/3

เกมฟิสิกส์เรื่องแรงและการเคลื่อนที่

ฯลฯ

แต่ละหัวข้อแสดงเป็น Category Card / Large Button

ข้อมูลอย่างน้อย:

- ชื่อหัวข้อ
- คำอธิบายสั้น ๆ ถ้ามี
- จำนวนผลงาน
- สถานะเปิดรับ / ปิดรับ
- วันที่สร้าง

เมื่อกดหัวข้อ:

เปิด Category Detail View

ไม่จำเป็นต้องโหลด HTML หน้าใหม่จริง
สามารถใช้ SPA-like routing ด้วย Vanilla JS ได้ เช่น:

?category=xxxxxxxx

หรือ hash routing

แต่ต้อง refresh URL แล้วเปิดหน้าเดิมได้

---

# 6. CATEGORY MANAGEMENT

Admin สามารถสร้าง Category ใหม่จากหน้าเว็บได้

ข้อมูล:

categoryId
title
description
createdAt
updatedAt
isActive
driveFolderId
deletedAt

categoryId ต้องสร้างด้วย UUID

เมื่อ Admin สร้าง Category:

1. Apps Script สร้าง Category record ใน Google Sheet
2. Apps Script สร้าง folder ใหม่ภายใน Google Drive Root Folder
3. ชื่อ folder อ้างอิงชื่อ Category
4. บันทึก Drive Folder ID กลับลง Categories sheet
5. ส่งผลสำเร็จกลับ frontend

ห้ามใช้ชื่อ Category เป็น primary key

เพราะ Admin สามารถเปลี่ยนชื่อได้

ใช้ UUID เป็น primary identifier

---

# 7. GOOGLE DRIVE FOLDER STRUCTURE

มี Root Folder หลักหนึ่ง folder

ตัวอย่าง:

AI-Learning-Game-Gallery/
│
├── เกมการเรียนรู้ดาราศาสตร์ ศิลป์-จีน/
│     ├── cover_xxxxx.webp
│     ├── cover_yyyyy.webp
│     └── ...
│
├── เกมฟิสิกส์ ม.4/
│     ├── cover_xxxxx.webp
│     └── ...
│
└── ...

ทุก Category ที่ Admin สร้าง
ต้องมี Folder ของตัวเอง

ห้ามค้น Folder ด้วยชื่อทุกครั้ง

ให้บันทึก:

driveFolderId

ไว้ใน Categories sheet

เวลานักเรียน upload cover ให้ upload ไปยัง Folder ID ของ Category นั้นโดยตรง

---

# 8. STUDENT SUBMISSION

ภายใน Category มีปุ่มเด่น:

“+ เพิ่มผลงานของฉัน”

เมื่อกด ให้เปิด Modal / Form

นักเรียนต้องกรอก:

1. ชื่อ-นามสกุล
2. ชั้น
3. เลขที่
4. สายการเรียน
5. ชื่อผลงาน / ชื่อเกม
6. URL ของผลงาน
7. Cover Image

---

# 9. IMPORTANT FORM RULES

## ชื่อ-นามสกุล

Text input

required

---

## ชั้น

ให้นักเรียนพิมพ์เอง

ตัวอย่าง:

ม.4/1

ม.4/3

ม.5/2

ไม่ hardcode ห้อง

---

## เลขที่

รับเฉพาะเลขจำนวนเต็มบวก

แต่บันทึกแบบ numeric field สำหรับ sorting

---

## สายการเรียน

ต้องเป็น Text Input

ห้ามสร้าง dropdown แบบตายตัว

เพราะผู้ใช้ต้องการให้นักเรียนเขียนเอง

ตัวอย่าง:

วิทย์พิเศษฯ

วิทย์สุขภาพ

วิทย์คอมพ์ฯ

ศิลป์คำนวณ

ศิลป์ภาษา

ศิลป์-จีน

แต่ตัวอย่างเหล่านี้เป็น placeholder เท่านั้น

---

## ชื่อผลงาน

required

---

## URL ผลงาน

required

ยอมรับเฉพาะ:

http://
https://

ก่อนบันทึกต้อง validate

ห้าม:

javascript:
data:
file:

หรือ protocol อันตรายอื่น

---

# 10. COVER IMAGE

นักเรียนต้องเลือก Cover Image

รองรับอย่างน้อย:

JPEG
PNG
WEBP

Frontend ต้องตรวจ file type

ควรจำกัดขนาด upload ที่เหมาะสม เช่น 5 MB ก่อน processing

ถ้าภาพใหญ่ ให้ resize/compress ฝั่ง browser ก่อน upload

เป้าหมายประมาณ:

max width = 1600 px
max height = 900 px

รักษา aspect ratio

ไม่ upscale ภาพเล็กโดยไม่จำเป็น

---

# 11. COVER DISPLAY NORMALIZATION

สำคัญมาก:

ไม่ว่าภาพต้นฉบับจะเป็น:

แนวนอน
แนวตั้ง
สี่เหลี่ยม
มือถือ
Screenshot
ภาพขนาดใหญ่
ภาพขนาดเล็ก

Card ทุกใบต้องมีขนาด Cover เท่ากัน

ใช้ CSS:

aspect-ratio: 16 / 9

และ:

object-fit: cover

ห้ามทำให้รูปยืดผิดสัดส่วน

ต้องมี fallback placeholder ถ้าภาพโหลดไม่ได้

ใช้ lazy loading:

loading="lazy"

---

# 12. GAME GALLERY

เมื่อเข้าหัวข้อ เช่น:

“เกมการเรียนรู้ดาราศาสตร์ ศิลป์-จีน”

ให้แสดง Game Gallery คล้ายหน้าเลือกเกมจำนวนมาก

แต่ละ Game Card แสดง:

Cover

ชื่อเกม

ชื่อผู้สร้าง

ชั้น

เลขที่

สายการเรียน

ปุ่ม:

“เล่นเกม”

หรือทำ Card ทั้งใบ clickable

เมื่อกด:

เปิด URL เกมใน tab ใหม่

ใช้:

target="_blank"

และ:

rel="noopener noreferrer"

---

# 13. GAME CARD UX

Card ต้องดูเป็นเกม ไม่ใช่ตารางราชการ

ต้อง:

- modern
- clean
- friendly
- educational
- premium
- เหมาะกับนักเรียน
- mobile friendly

มี hover effect บน Desktop

มี pressed state บน Mobile

ไม่ใช้ animation เยอะจนรบกวน

ไม่ใช้ 3D หนัก

ไม่ใช้ gradient ฉูดฉาดเกินไป

เน้น UI สมัยใหม่ เรียบ อ่านง่าย

---

# 14. SUBMISSION SUMMARY

ทุก Category Page ต้องมีส่วน:

“สรุปการส่งงาน”

แสดง:

จำนวนผลงานทั้งหมด

และรายชื่อผู้ส่ง

ข้อมูล:

ลำดับ
เลขที่
ชื่อ-นามสกุล
ชั้น
สายการเรียน
ชื่อผลงาน
วันที่ส่ง

---

# 15. SORTING RULE — CRITICAL

รายชื่อการส่งงานต้องเรียง:

อันดับแรก:

เลขที่จากน้อย → มาก

เลขที่ต้อง sort แบบ Number

ห้าม sort แบบ String

เช่น:

1
2
3
10
11

ไม่ใช่:

1
10
11
2
3

ถ้าเลขที่เหมือนกัน:

เรียงชื่อภาษาไทย ก → ฮ

ใช้ JavaScript:

Intl.Collator('th')

หรือ:

localeCompare(name, 'th')

อย่างเหมาะสม

ตัวอย่าง:

submissions.sort((a, b) => {
    const numberDiff =
        Number(a.studentNo) - Number(b.studentNo);

    if (numberDiff !== 0) {
        return numberDiff;
    }

    return thaiCollator.compare(
        a.studentName,
        b.studentName
    );
});

ต้องใช้ sorting rule เดียวกันทั้ง:

Gallery
Submission Summary
Admin view

หาก UI ต้องการลำดับอื่นใน Gallery สามารถมี option ได้
แต่ Summary ต้องใช้กติกานี้เสมอ

---

# 16. GOOGLE SHEETS STRUCTURE

ใช้ Spreadsheet เดียว

อย่างน้อยมี Sheet:

Categories
Submissions
AdminLog

---

## Categories

columns:

categoryId
title
description
driveFolderId
isActive
createdAt
updatedAt
deletedAt

---

## Submissions

columns:

submissionId
categoryId
studentName
className
studentNo
studyProgram
workTitle
workUrl
coverFileId
coverUrl
coverOriginalName
coverMimeType
createdAt
updatedAt
deletedAt

---

## AdminLog

columns:

logId
timestamp
action
targetType
targetId
detail

---

# 17. DO NOT USE ROW NUMBER AS RECORD ID

ห้ามใช้:

row 2
row 3
row 10

เป็น permanent identifier

เพราะเมื่อมีการ sort/delete จะผิด record ได้

ใช้:

UUID

สำหรับ:

categoryId
submissionId
logId

ทุกครั้ง

---

# 18. GOOGLE SHEET SECURITY

ข้อมูลจากนักเรียนเป็น untrusted input

ก่อนเขียนลง Google Sheet ต้องป้องกัน Spreadsheet Formula Injection

ถ้าข้อความขึ้นต้นด้วย:

=
+
-
@

ต้อง sanitize ก่อนบันทึก

อย่าใช้ raw student input เป็น formula

server-side validation ต้องทำซ้ำอีกครั้ง

ห้ามพึ่ง validation ฝั่ง browser อย่างเดียว

---

# 19. CONCURRENCY

อาจมีนักเรียนหลายคนกดส่งพร้อมกัน

Google Apps Script ต้องใช้:

LockService

ใน critical write operations

เช่น:

- append submission
- create category
- delete record
- update record

เพื่อป้องกัน race condition

---

# 20. FILE UPLOAD BACKEND

Frontend ส่ง:

- image data
- mime type
- original filename
- categoryId

Apps Script:

1. validate Category
2. ตรวจว่า Category เปิดรับ
3. หา driveFolderId
4. decode image
5. สร้าง Blob
6. createFile ใน Category Folder
7. บันทึก File ID
8. สร้าง usable cover URL
9. บันทึก metadata ลง Sheet

หากเขียน Sheet ไม่สำเร็จหลัง upload:
ต้อง clean up orphan Drive file ถ้าทำได้

หาก upload ไม่สำเร็จ:
ห้ามสร้าง Submission record

ต้องพยายามทำ operation ให้ atomic เท่าที่ Apps Script ทำได้

---

# 21. PUBLIC COVER ACCESS

ระบบต้องทดสอบจริงว่า Cover สามารถแสดงจาก GitHub Pages ได้

อย่าสมมติว่า Google Drive share URL ทุกแบบใช้ใน `<img>` ได้

ให้บันทึก:

coverFileId

เป็น canonical reference

และ:

coverUrl

เป็น URL สำหรับ rendering

ต้องมี:

onerror fallback

หากระบบเลือกทำ cover public เพื่อให้ browser โหลดได้
ให้ตั้ง permission เฉพาะที่จำเป็น

Document เรื่อง privacy และ permission ไว้ใน SETUP.md

---

# 22. ADMIN LOGIN

หน้าเว็บมีปุ่ม:

“ผู้ดูแลระบบ”

อาจอยู่:

header
menu
footer

กดแล้วเปิด Admin Login Modal

หลัง login สำเร็จแสดง:

Admin Mode

พร้อมเครื่องมือ:

+ สร้างหัวข้อ

แก้ไขหัวข้อ

ปิดรับ

เปิดรับ

ลบ

จัดการผลงาน

Logout

---

# 23. ADMIN SESSION

หลัง login:

backend สร้าง random token

บันทึกใน:

CacheService

หรือ server-side temporary store

token ต้อง:

- random
- guess ยาก
- มี expiration
- ไม่ใช่ password
- ไม่ expose credential

Frontend เก็บใน:

sessionStorage

Logout:

invalidate token ถ้าทำได้
และลบ token ฝั่ง browser

---

# 24. DELETE POLICY

PUBLIC USER:

ห้าม delete ทุกกรณี

ADMIN:

delete ได้หลังผ่าน server-side admin token validation

ทุก delete ต้องมี Confirmation Dialog

สำหรับ Submission:

แนะนำให้ใช้ soft delete ก่อน:

deletedAt = timestamp

และไม่แสดงใน public gallery

หากต้องการลบ Cover:
สามารถ move file to trash หลัง record update สำเร็จ

สำหรับ Category:

ถ้ายังมี Submission อยู่
ห้ามลบทันทีแบบเงียบ ๆ

ให้แจ้งจำนวนผลงาน

Admin ต้อง confirm อย่างชัดเจน

ควรมี:

Archive / Close Submission

เป็นทางเลือกก่อน Delete

---

# 25. READ API

ต้องมี backend function สำหรับ:

getCategories()

getCategory(categoryId)

getSubmissions(categoryId)

getStats(categoryId)

Public read APIs ต้องคืนเฉพาะข้อมูลที่ UI จำเป็นต้องใช้

ห้ามคืน:

- ADMIN_PASSWORD
- Script Properties
- internal token
- sensitive Drive configuration ที่ไม่จำเป็น

---

# 26. WRITE API

Public:

createSubmission()

Admin only:

adminLogin()

adminLogout()

createCategory()

updateCategory()

deleteCategory()

updateSubmission()

deleteSubmission()

---

# 27. API RESPONSE FORMAT

ใช้รูปแบบ consistent

success:

{
  "success": true,
  "data": {},
  "message": ""
}

failure:

{
  "success": false,
  "error": {
      "code": "VALIDATION_ERROR",
      "message": "..."
  }
}

ห้ามส่ง stack trace ให้ public user

log technical error ฝั่ง Apps Script แทน

---

# 28. CROSS-ORIGIN / APPS SCRIPT TRANSPORT

เพราะ frontend อยู่ GitHub Pages
แต่ backend อยู่ script.google.com

ต้องออกแบบ API Transport Layer แยกจาก UI

ห้ามกระจาย fetch codeทั่ว app

สร้าง abstraction เช่น:

ApiClient

ที่รับผิดชอบ:

getCategories
getSubmissions
submitWork
adminLogin
adminAction

Phase Integration ต้องทดสอบ cross-origin จริง

อย่างน้อย:

Windows Chrome
Android Chrome
Safari ถ้ามี

ถ้า direct fetch ใช้งานได้เสถียร
สามารถใช้ fetch ได้

POST request ควรหลีกเลี่ยง custom headers ที่ไม่จำเป็น

---

# 29. FALLBACK FOR APPS SCRIPT CORS

หาก direct GitHub Pages → Apps Script POST มีปัญหา cross-origin
ห้ามย้าย frontend ออกจาก GitHub Pagesโดยทันที

ให้ใช้ architecture fallback:

GitHub Pages
      │
      │ postMessage
      ▼
Hidden Apps Script Bridge iframe
      │
      │ google.script.run
      ▼
Apps Script Server Functions

สร้าง:

Bridge.html

ภายใน Apps Script

Frontend embed bridge:

iframe

Bridge ใช้:

window.postMessage()

เพื่อรับคำสั่งจาก GitHub frontend

จากนั้น Bridge เรียก:

google.script.run

ไปยัง Apps Script server function

แล้วส่ง response กลับด้วย:

parent.postMessage()

---

# 30. BRIDGE SECURITY

หากใช้ iframe bridge:

Apps Script HtmlOutput อาจต้องเปิดให้ iframe ได้

แต่ Bridge ต้องตรวจ:

event.origin

ยอมรับเฉพาะ GitHub Pages origin ที่กำหนดใน:

ALLOWED_FRONTEND_ORIGIN

Script Property

ตัวอย่าง concept:

https://username.github.io

หรือ custom domain จริง

ห้ามใช้:

event.origin === "*"

ในการ validate

เวลาส่ง response ด้วย postMessage
ระบุ exact targetOrigin

ห้ามส่ง admin password กลับไป frontend

ทุก admin action ยังต้องตรวจ token ที่ server อีกชั้นหนึ่ง

---

# 31. PUBLIC FORM UX

Submission Form ต้อง:

- label ภาษาไทยชัดเจน
- required indicator
- inline validation
- preview cover ก่อนส่ง
- preview URL
- submit loading state
- disable submit ขณะส่ง
- progress indicator สำหรับ image processing/upload
- success state
- error state

ป้องกัน double submit

หลังสำเร็จ:

ปิด form

show success toast/dialog

reload submissions

เลื่อนไปยัง Game Card ที่เพิ่งเพิ่มถ้าทำได้

---

# 32. LOADING / EMPTY / ERROR STATES

ทุกหน้าต้องมี:

Loading Skeleton

Empty State

Error State

Retry Button

ตัวอย่าง Category ที่ยังไม่มีงาน:

“ยังไม่มีผลงานในหัวข้อนี้
เป็นคนแรกที่ส่งเกมของคุณได้เลย 🎮”

---

# 33. SEARCH

Category Page ควรมี Search

ค้นหาได้จาก:

ชื่อเกม

ชื่อนักเรียน

ชั้น

เลขที่

สายการเรียน

ทำ client-side ได้หากข้อมูลยังไม่ใหญ่

---

# 34. CATEGORY STATUS

แต่ละ Category มี:

isActive

ถ้าเปิดรับ:

แสดงปุ่ม:

เพิ่มผลงาน

ถ้าปิดรับ:

ยังดู Gallery ได้

แต่ห้ามส่งเพิ่ม

แสดงข้อความ:

“ปิดรับผลงานแล้ว”

Backend ต้องตรวจ isActive ด้วย

ห้ามพึ่ง UI อย่างเดียว

---

# 35. UI DESIGN SYSTEM

ออกแบบธีม:

Modern Education Game Gallery

อารมณ์:

clean
modern
premium
friendly
cozy
approachable

ใช้สีหลักไม่เกิน 2–3 สี

พื้นหลังสว่าง

ใช้ Card Design

Border radius สมัยใหม่

Shadow บาง

Whitespace เยอะ

Typography อ่านง่าย

รองรับภาษาไทยดี

---

# 36. RESPONSIVE DESIGN

Desktop:

4–5 cards ต่อแถวตามความกว้าง

Tablet:

2–3 cards

Mobile:

1–2 cards

ห้ามมี horizontal overflow

touch targets อย่างน้อยประมาณ 44px

Modal บนมือถือควรกลายเป็น Bottom Sheet หรือ Full-screen Dialog ได้ถ้าเหมาะสม

---

# 37. ACCESSIBILITY

ต้องมี:

semantic HTML

label ทุก input

button ที่ใช้ keyboard ได้

focus state

aria-label เมื่อจำเป็น

alt text สำหรับ cover

color contrast อ่านง่าย

รองรับ prefers-reduced-motion

---

# 38. PERFORMANCE

ต้อง:

lazy-load images

compress cover ก่อน upload

cache public data ฝั่ง client ชั่วคราวได้

ไม่โหลด submission ทุก Category ตั้งแต่หน้าแรก

Home โหลด:

Categories + counts

เมื่อเข้า Category จึงโหลด submissions ของ Category นั้น

---

# 39. DATA REFRESH

หลัง:

เพิ่มผลงาน

ลบผลงาน

สร้าง Category

แก้ Category

ปิด/เปิดรับ

ต้อง update UI โดยไม่ต้อง reload browser ทั้งหน้า ถ้าไม่จำเป็น

---

# 40. PRIVACY NOTICE

ข้อมูลที่แสดงใน public gallery มี:

ชื่อ-นามสกุล
ชั้น
เลขที่
สายการเรียน
ผลงาน

เนื่องจากเว็บไซต์ GitHub Pages เป็น public
ให้สร้าง privacy notice ขนาดสั้นใน UI/README

อย่าเก็บข้อมูลเพิ่มเกิน requirement

ห้ามเก็บ:

เบอร์โทร
อีเมล
เลขประจำตัวประชาชน
วันเกิด
ที่อยู่

เพราะไม่จำเป็นกับระบบนี้

---

# 41. ANONYMOUS PUBLIC WRITE WARNING

เนื่องจากระบบอนุญาตให้บุคคลทั่วไป submit โดยไม่ login

ไม่มีระบบใดสามารถป้องกัน spam/bot ได้สมบูรณ์

ให้เพิ่ม protection ขั้นพื้นฐาน:

- server-side validation
- file type validation
- file size limits
- request timestamp
- honeypot field
- duplicate submit protection
- reasonable rate limiting ที่ Apps Script ทำได้
- LockService

แต่อย่าอ้างว่า anonymous endpoint “secure from spam 100%”

---

# 42. DUPLICATE SUBMISSION

อย่าบังคับว่าหนึ่งนักเรียนส่งได้เพียงครั้งเดียว เว้นแต่ผู้ใช้กำหนดเพิ่มภายหลัง

แต่ก่อน submit:

สามารถตรวจ:

categoryId
className
studentNo
studentName

หากพบข้อมูลคล้ายกัน ให้แจ้งเตือน:

“พบข้อมูลที่อาจเป็นผลงานของนักเรียนคนเดียวกัน”

แต่ให้ผู้ใช้สามารถยืนยันส่งเพิ่มได้

Admin สามารถลบ duplicate ภายหลัง

---

# 43. PROJECT FILE STRUCTURE

Frontend:

/
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── config.js
│   │   ├── api.js
│   │   ├── app.js
│   │   ├── admin.js
│   │   └── image-utils.js
│   └── images/
│       └── placeholder-cover.svg
├── README.md
└── SETUP.md

Apps Script:

/appscript/
├── Code.gs
├── Config.gs
├── Sheets.gs
├── Drive.gs
├── Auth.gs
├── Categories.gs
├── Submissions.gs
├── Utils.gs
└── Bridge.html

ไม่จำเป็นต้องยึดไฟล์ย่อยนี้แบบตายตัว
แต่ต้องแยก responsibility ชัดเจน

`index.html` ต้องเป็น entry point

ไม่มี build process

---

# 44. CONFIGURATION

Frontend config:

const APP_CONFIG = {
    API_URL: "",
    BRIDGE_URL: "",
    APP_NAME: "...",
};

ห้ามใส่ secret

Frontend config ถือว่า public เสมอ

Apps Script Script Properties:

SPREADSHEET_ID
ROOT_DRIVE_FOLDER_ID
ADMIN_PASSWORD
ALLOWED_FRONTEND_ORIGIN

อาจเพิ่ม property อื่นเมื่อจำเป็น

---

# 45. SETUP FUNCTION

Apps Script ต้องมี setup function เช่น:

setupDatabase()

ทำหน้าที่:

- ตรวจ Spreadsheet
- สร้าง Sheets ที่ขาด
- สร้าง header
- freeze header
- format columns
- ตรวจ Root Drive Folder
- return diagnostics

ต้อง idempotent

รันซ้ำได้โดยไม่สร้าง duplicate Sheet/header

---

# 46. HEALTH CHECK

สร้าง API/backend function:

healthCheck()

คืนข้อมูลเช่น:

{
  success: true,
  sheetConnected: true,
  driveConnected: true,
  version: "...",
  timestamp: "..."
}

ห้ามคืน secret

Phase Integration ต้องใช้ healthCheck ก่อนทำ operation อื่น

---

# 47. ADMIN DIAGNOSTICS

Admin Mode ควรมี diagnostics panel แบบเรียบง่าย

แสดง:

Backend connected

Google Sheet connected

Google Drive connected

จำนวน Categories

จำนวน Submissions

Apps Script version ถ้ามี

ห้ามแสดง:

password
token
private property values

---

# ============================================
# PHASED DEVELOPMENT PLAN
# ============================================

# PHASE 0 — REQUIREMENT CONTRACT & ARCHITECTURE

ยังไม่เขียน application เต็ม

ทำ:

1. สรุป requirement
2. Architecture diagram
3. Data flow
4. User roles
5. Data schema
6. File structure
7. API contract
8. Security model
9. Google Drive folder model
10. Sorting logic
11. Identify risks
12. Define acceptance criteria

ต้องยืนยันว่าเข้าใจว่า:

Frontend = GitHub Pages

Backend = Apps Script

Database = Google Sheets

Files = Google Drive

Public = Add only

Admin = Manage/Delete

หลังจบ Phase 0:

STOP

รอผู้ใช้สั่ง:

“ทำ Phase 1 ต่อ”

---

# PHASE 1 — FRONTEND PROTOTYPE WITH MOCK DATA

สร้าง frontend ที่ใช้งานได้ด้วย Mock Data ก่อน

สร้าง:

index.html
CSS
JS modules
placeholder image

ทำ UI:

Home
Category cards
Category Detail
Game Gallery
Submission Summary
Submission Form
Admin Login UI
Admin toolbar

ยังไม่เชื่อม Google

ใช้ Mock Categories และ Mock Submissions

ต้องทดสอบ:

responsive
sorting
Thai alphabetical sorting
cover normalization
URL routing
form validation
modal
gallery

ห้ามใส่ Spreadsheet ID ปลอม

ห้ามใส่ Drive ID ปลอม

ห้ามใส่ Apps Script URL ปลอม

หลังจบ:

STOP

---

# PHASE 2 — GOOGLE APPS SCRIPT BACKEND

สร้าง Apps Script backend

ยังใช้ placeholder configuration

สร้าง:

doGet
doPost ถ้าจำเป็น
healthCheck
setupDatabase

Categories service

Submissions service

Drive service

Auth service

Admin Session

Validation

Sheet sanitization

LockService

Error handling

AdminLog

Bridge.html fallback architecture ถ้าจะใช้

สร้าง SETUP instructions แบบละเอียด

ยังห้ามเดา ID จริง

หลังสร้าง backend:

STOP

---

# PHASE 3 — CONNECTION GATE

PHASE นี้สำคัญมาก

ห้ามเขียนค่าปลอม

ห้ามดำเนิน integration ก่อนมีข้อมูลจริง

ให้ถามผู้ใช้เฉพาะข้อมูลต่อไปนี้:

### A. GOOGLE SHEET

ขอ:

Google Spreadsheet URL

หรือ

Spreadsheet ID

ถ้าผู้ใช้ส่ง URL
ให้ parse ID เอง

---

### B. GOOGLE DRIVE

ขอ:

Google Drive Root Folder URL

หรือ

Folder ID

Folder นี้จะเป็น root:

AI Learning Game Gallery

ถ้าผู้ใช้ส่ง URL
ให้ parse Folder ID เอง

---

### C. ADMIN PASSWORD

ห้ามขอให้ผู้ใช้ส่ง password มาเพื่อเอาไปเขียนใน code

ให้บอกผู้ใช้ไปตั้ง:

Apps Script
Project Settings
Script Properties

Key:

ADMIN_PASSWORD

Value:

รหัส Admin ที่ผู้ใช้ต้องการ

ถ้าผู้ใช้มีรหัสอยู่แล้ว ให้ใช้รหัสนั้นใน Script Properties

ห้าม echo password ลง source code

---

### D. FRONTEND ORIGIN

ขอ:

GitHub Pages URL

เช่น:

https://username.github.io/repository/

หรือ custom domain

เพื่อใช้กำหนด:

ALLOWED_FRONTEND_ORIGIN

---

### E. APPS SCRIPT DEPLOYMENT

หลังผู้ใช้ใส่:

Spreadsheet ID
Drive Folder ID
Admin Password

ให้พา deploy Apps Script เป็น:

Web App

Execute as:

Me / deploying user

Access:

Anyone / anonymous users ตาม option ที่ Google UI แสดง

จากนั้นขอ:

Web App `/exec` URL

เช่น:

https://script.google.com/macros/s/XXXXX/exec

อย่าใช้ `/dev`

---

เมื่อยังได้ข้อมูลไม่ครบ:

STOP

และบอกอย่างชัดเจนว่าเหลืออะไร

ห้ามไป Phase 4 เอง

---

# PHASE 4 — REAL INTEGRATION

เมื่อได้ข้อมูลครบแล้ว:

เชื่อม:

GitHub frontend
↔ Apps Script
↔ Google Sheet
↔ Google Drive

ทดสอบตามลำดับ:

TEST 1
healthCheck

TEST 2
read empty Categories

TEST 3
Admin Login

TEST 4
Admin Create Category

ตรวจว่า:

record ถูกสร้างใน Sheet

Folder ถูกสร้างใน Drive

folderId ถูกบันทึก

TEST 5
Public Student Submission

ตรวจ:

metadata ลง Sheet

cover เข้า Drive

cover แสดงหน้าเว็บ

TEST 6
Sorting

เลขที่:

2
5
5
7
10

เลขที่ซ้ำต้องเรียงชื่อ ก→ฮ

TEST 7
Open game URL

TEST 8
Admin delete submission

TEST 9
Close Category

ตรวจว่า frontend ส่งไม่ได้

และ backend ปฏิเสธด้วย

TEST 10
Mobile browser

อย่างน้อย Android Chrome

หากพบ CORS issue:

เปลี่ยน API transport เป็น Apps Script iframe bridge

ไม่เปลี่ยน business logic

หลัง Integration ผ่าน:

STOP

---

# PHASE 5 — ADMIN MANAGEMENT

พัฒนา Admin Mode เต็ม

เพิ่ม:

Create Category

Edit Category

Open/Close Submission

Delete Category

Edit Submission

Delete Submission

Admin dashboard

Stats

Confirmation dialogs

AdminLog

Session expiration handling

หาก session หมด:

ให้ logout อัตโนมัติ

แสดง:

“เซสชันผู้ดูแลหมดอายุ กรุณาเข้าสู่ระบบใหม่”

---

# PHASE 6 — UI/UX POLISH

ปรับหน้าตา production quality

ตรวจ:

Typography ไทย

Spacing

Card density

Mobile layout

Game cover

Button hierarchy

Loading skeleton

Toast

Empty state

Error state

Admin state

Form usability

Accessibility

Performance

Animation

ไม่เปลี่ยน data architecture ใน Phase นี้
เว้นแต่พบ bug จริง

---

# PHASE 7 — QA & SECURITY REVIEW

ทำ Final QA

ทดสอบ:

PUBLIC:

view categories
view submissions
submit valid form
invalid URL
missing fields
large image
wrong image type
double click submit
duplicate number
Thai names

ADMIN:

wrong password
correct password
expired token
create category
edit
close
open
delete submission
delete category

SECURITY:

password ไม่มีใน repository

Script Properties ไม่ expose

delete endpoint requires token

createCategory requires token

student input sanitized

javascript URL rejected

formula injection blocked

XSS blocked

file validation server-side

event.origin validated if Bridge is used

---

# PHASE 8 — GITHUB PAGES DEPLOYMENT

เตรียม repository สำหรับ GitHub Pages

ตรวจว่า:

index.html อยู่ตำแหน่งถูกต้อง

ไม่มี secret

ไม่มี dev URL

API URL เป็น `/exec`

relative asset paths ใช้งานกับ project Pages ได้

รองรับ:

https://username.github.io/repository/

ไม่ assume ว่าเว็บอยู่ domain root

สร้าง `.nojekyll` ถ้าจำเป็น

เขียน deployment instructions

ให้ผู้ใช้เปิด:

GitHub Repository
→ Settings
→ Pages

และ deploy จาก branch ที่กำหนด

---

# PHASE 9 — FINAL DOCUMENTATION

จัดทำ:

README.md

SETUP.md

ARCHITECTURE.md

DATA_MODEL.md

SECURITY.md

APPS_SCRIPT_SETUP.md

DEPLOYMENT.md

PROJECT_STATUS.md

README ต้องอธิบาย:

ระบบคืออะไร

Tech Stack

Architecture

วิธีรัน

วิธี Deploy

Folder structure

---

# PHASE 10 — FINAL HANDOFF

ก่อนประกาศว่าเสร็จ:

ตรวจว่าทุก requirement เดิมครบ

สร้าง Final Checklist:

[ ] Home categories

[ ] Unlimited category creation

[ ] Category → Drive Folder

[ ] Student submission

[ ] Name

[ ] Class

[ ] Number

[ ] Study Program text input

[ ] Work title

[ ] Work URL

[ ] Cover

[ ] Uniform cover size

[ ] Game gallery

[ ] Submission summary

[ ] Sort student number

[ ] Thai alphabet tie-break

[ ] Public add

[ ] Public cannot delete

[ ] Admin login

[ ] Admin delete

[ ] Password server-side only

[ ] Google Sheets

[ ] Google Drive

[ ] Apps Script

[ ] GitHub Pages

[ ] Desktop

[ ] Mobile

[ ] Production deployment

จากนั้นสรุป:

Production URL
Apps Script URL
Spreadsheet
Drive Root
Repository

โดยไม่เปิดเผย secret

---

# DEVELOPMENT BEHAVIOR RULES

ระหว่างทำงาน:

อย่ารื้อ architecture โดยไม่จำเป็น

อย่าทำ mock แล้วเรียกว่า production

อย่าปลอมผลการทดสอบ

อย่าบอกว่า API connected หากยังไม่ได้ใช้ URL จริง

อย่าบอกว่า Google Drive upload ผ่าน หากยังไม่ได้ upload จริง

อย่าบอกว่า Mobile ผ่าน หากยังไม่ได้ทดสอบจริง

ถ้าทำได้เพียง static code review ให้ระบุว่า:

“ผ่าน static review แต่ยังไม่ได้ runtime test”

---

# CODE QUALITY

ใช้:

const / let

async/await

ES modules ถ้าเหมาะสม

separation of concerns

reusable functions

centralized config

centralized API client

centralized error handling

ไม่มี giant function

ไม่มี duplicated code จำนวนมาก

ไม่มี inline onclick ถ้าไม่จำเป็น

ห้ามใช้ eval()

ห้ามใช้ innerHTML กับ untrusted student input

ใช้:

textContent

หรือ safe DOM creation

---

# IMPORTANT: DO NOT CHANGE STACK

ห้ามเปลี่ยนไปใช้:

Firebase
Supabase
Node.js backend
PHP
MySQL
React
Next.js
Vercel backend

เว้นแต่ผู้ใช้สั่งเปลี่ยนเองภายหลัง

Tech Stack ของโปรเจกต์นี้คือ:

HTML5
CSS
Vanilla JavaScript
GitHub Pages
Google Apps Script
Google Sheets
Google Drive

---

# FIRST RESPONSE

เมื่อได้รับ Prompt นี้:

อย่าเริ่มเขียนทุกไฟล์ทันที

เริ่มเฉพาะ:

PHASE 0 — REQUIREMENT CONTRACT & ARCHITECTURE

วิเคราะห์ระบบให้ครบ

เสนอ architecture

กำหนด data schema

กำหนด API

กำหนด folder structure

กำหนด security

กำหนด acceptance criteria

จากนั้น:

STOP

และถามผู้ใช้เพียงว่า:

“ถ้าโครงสร้าง Phase 0 นี้โอเค ให้พิมพ์ ‘ทำ Phase 1 ต่อ’”

ห้ามขอ Spreadsheet ID หรือ Drive ID ใน Phase 0

ข้อมูลเหล่านั้นต้องขอเมื่อถึง:

PHASE 3 — CONNECTION GATE

เท่านั้น
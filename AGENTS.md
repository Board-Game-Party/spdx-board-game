# AGENTS.md

## Project

[1 บรรทัดว่าระบบนี้ทำอะไรให้ใคร] — รายละเอียดดู memory-bank/intent.md

## Setup & Commands

- dev:        `docker compose up`
- test:       `docker compose -f compose.test.yaml up unit --abort-on-container-exit --exit-code-from unit`
- teardown:   `docker compose -f compose.test.yaml down -v`
- local dev:  `npm run dev`
- local test: `npm test`
- lint:       `npm run lint`
- build:      `npm run build`

## Conventions

- ภาษา: [TypeScript strict / Python 3.12 + type hints]
- ใช้ `data-testid` กับ element ที่ test จะอ้างถึง
- Commit ตาม Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`)
- Branch: ทำงานบน `feature/*` แล้ว PR เข้า `develop`

## Rules for agents

- ต้องรัน test ให้เขียวก่อนเสนอ diff เสมอ
- ถ้า test แดง ให้แก้ code — ห้ามแก้หรือลบ test เพื่อให้ผ่าน
- ห้ามใส่ค่า secret ลงไฟล์ใด ๆ ใช้ env var เท่านั้น
- ห้ามแก้ `docs/adr/` และ `memory-bank/` โดยไม่ถามก่อน
- แก้ทีละเรื่อง — diff ที่เกิน ~200 บรรทัดให้หยุดถามก่อน

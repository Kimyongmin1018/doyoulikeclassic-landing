# 클래식을 좋아하세요 Landing

클래식 음악이라는 취향을 중심으로 사람을 연결하는 로테이션 소개팅 랜딩페이지입니다.
공개 페이지는 현재 모집 중인 기수와 브랜드 콘텐츠를 보여주고, 운영자는 가벼운 관리자 화면에서 일정, 신청 링크, 지원현황, FAQ, 법무 정보를 직접 수정할 수 있습니다.

## Overview

이 프로젝트는 별도의 CMS 없이 작은 운영팀이 빠르게 행사 페이지를 관리할 수 있도록 만든 Express 기반 웹 애플리케이션입니다.

- 공개 랜딩페이지: 행사 소개, 일정, 참가비, 지원현황, 진행 방식, Instagram, FAQ 제공
- 관리자 대시보드: 일정 추가/수정, 대표 일정 지정, CTA 상태 관리, 콘텐츠 편집
- 데이터 저장소: SQLite 기반 로컬 DB
- 신청 흐름: 개인정보는 저장하지 않고 Google Forms로 연결
- 테스트: Vitest 기반 단위/통합 테스트와 Playwright 브라우저 테스트

## Product Direction

서비스의 핵심은 "어색한 소개팅"보다 "취향이 있는 만남"에 가깝습니다.

클래식 공연, 연주자, 악장, 좋아하는 무대 이야기를 자연스러운 대화의 출발점으로 삼고, 여러 사람을 짧게 만나는 로테이션 방식으로 부담을 낮춥니다. 랜딩페이지는 이 분위기를 차분하고 신뢰감 있게 전달하는 데 초점을 둡니다.

## Key Features

### Public Landing

- 현재 대표 행사 1개를 메인 페이지에 노출
- 모집 상태에 따라 CTA 자동 변경
  - `open`: 신청 가능
  - `closing-soon`: 마감 전 신청 가능
  - `closed`: 모집 마감
  - `scheduled`, `hidden`: 신청 오픈 예정
- 날짜, 지역, 장소 안내, 정원, 신청 조건 표시
- 시간 슬롯과 참가비 테이블 표시
- 지원현황 노션 링크 및 성별/연령대 요약 표시
- Instagram 프로필과 릴스 링크 관리
- FAQ와 사업자/문의 정보 노출

### Admin Dashboard

- `/admin`에서 비밀번호 기반 로그인
- 여러 행사 일정 등록 및 수정
- 대표 행사 지정
- 시간 슬롯 입력
  - 형식: `라벨|시작시간|종료시간`
  - 예: `1회차|16:00|18:00`
- 참가비 입력
  - 형식: `라벨|금액|비고`
  - 예: `기본|35,000원|선정 후 결제 안내`
- 히어로 문구, 배지, 참여자 예시, 지원현황, Instagram, FAQ, 법무 정보 수정
- CSRF 토큰, 서명 쿠키, 세션 만료, 로그인 rate limit 적용
- 관리자 주요 행동 audit log 저장

### Privacy by Design

이 앱은 신청자 개인정보를 저장하지 않습니다.

신청은 Google Forms로 이동하고, 이 저장소의 DB에는 행사 운영에 필요한 공개 콘텐츠와 관리자 세션 정보만 저장합니다. 개인정보 처리 범위를 줄여 운영 리스크를 낮추는 구조입니다.

## Tech Stack

| Area | Stack |
| --- | --- |
| Runtime | Node.js |
| Server | Express |
| View | EJS |
| Database | SQLite, better-sqlite3 |
| Validation | Zod |
| Security | Helmet, signed cookies, CSRF, rate limit |
| Test | Vitest, Supertest, Playwright |

## Project Structure

```text
.
├── public/                  # 정적 CSS, JS, 이미지 에셋
├── src/
│   ├── app.js               # Express 앱 조립
│   ├── config.js            # 환경변수 로딩 및 production secret 검증
│   ├── db/                  # SQLite 스키마, 연결, seed
│   ├── middleware/          # 관리자 인증 미들웨어
│   ├── routes/              # public/admin 라우트
│   └── services/            # public model, admin service, security helper
├── views/                   # EJS 템플릿
├── tests/                   # Vitest 및 Playwright 테스트
└── docs/                    # 배포/운영 문서
```

## Local Development

```bash
npm install
cp .env.example .env
npm run db:seed
npm run dev
```

Open:

- Public: http://localhost:3000
- Admin: http://localhost:3000/admin

기본 개발용 관리자 비밀번호:

```text
change-this-before-production
```

실제 운영 환경에서는 반드시 `.env`의 `ADMIN_PASSWORD`와 `SESSION_SECRET`을 안전한 값으로 교체해야 합니다.

## Environment Variables

| Name | Description | Default |
| --- | --- | --- |
| `NODE_ENV` | 실행 환경 | `development` |
| `PORT` | 서버 포트 | `3000` |
| `DATABASE_PATH` | SQLite DB 파일 경로 | `data/classic-rotation.sqlite` |
| `ADMIN_PASSWORD` | 관리자 로그인 비밀번호 | `change-this-before-production` |
| `SESSION_SECRET` | 서명 쿠키/세션용 secret | `dev-session-secret` |
| `PUBLIC_BASE_URL` | 공개 서비스 URL | `http://localhost:3000` |

`NODE_ENV=production`에서는 placeholder secret을 사용할 수 없도록 서버 시작 시 검증합니다.

## Scripts

```bash
npm run dev          # watch 모드로 로컬 개발 서버 실행
npm start            # 일반 서버 실행
npm run db:seed      # 초기 데이터 seed
npm test             # Vitest 테스트 실행
npm run test:browser # Playwright 브라우저 테스트 실행
```

## Data Model

핵심 데이터는 SQLite에 저장됩니다.

- `events`: 행사 기본 정보, 모집 상태, 대표 행사 여부
- `event_time_slots`: 행사별 시간 슬롯
- `event_price_rows`: 행사별 참가비 행
- `content_blocks`: 히어로, 지원현황, Instagram, FAQ, 법무 정보 JSON 블록
- `admin_sessions`: 관리자 로그인 세션
- `admin_audit_log`: 관리자 주요 행동 기록

공개 페이지는 요청 시 DB에서 대표 행사와 콘텐츠 블록을 읽어 렌더링합니다. 따라서 admin에서 저장한 내용은 공개 페이지 새로고침 후 바로 확인할 수 있습니다.

## Operating Flow

1. Admin에서 새 행사 일정을 추가합니다.
2. 모집 상태와 Google Forms 링크를 설정합니다.
3. 시간 슬롯과 참가비를 입력합니다.
4. 해당 행사를 대표 일정으로 지정합니다.
5. 공개 페이지에서 CTA와 일정 노출을 확인합니다.
6. 모집 현황은 Notion URL과 요약 문구로 업데이트합니다.

## Testing

```bash
npm test
npm run test:browser
```

테스트는 설정값 검증, DB seed, 관리자 인증, 관리자 CRUD, 공개 모델 렌더링, 랜딩페이지 브라우저 동작을 중심으로 구성되어 있습니다.

## Deployment

라즈베리파이 배포 문서는 아래에서 확인할 수 있습니다.

[docs/deployment-raspberry-pi.md](docs/deployment-raspberry-pi.md)

배포 전 체크리스트:

- `.env`의 `ADMIN_PASSWORD` 변경
- `.env`의 `SESSION_SECRET`을 긴 랜덤 문자열로 변경
- `PUBLIC_BASE_URL`을 실제 도메인으로 변경
- DB 파일 백업 정책 확인
- Google Forms, Notion, Instagram 링크가 모두 HTTPS인지 확인

## Notes

- 공개 페이지에는 대표 행사 1개만 노출됩니다.
- 신청자 개인정보는 이 앱에 저장하지 않습니다.
- Google Forms 응답과 실제 신청자 관리는 외부 운영 프로세스에서 처리합니다.
- 관리자에서 저장한 내용은 DB에 즉시 반영되며, 공개 페이지는 새로고침 시 최신 데이터를 읽습니다.

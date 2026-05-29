# Cloudflare Tunnel 배포 메모

이 사이트는 앱 서버를 `localhost:3001`에서 실행하고, Cloudflare Tunnel이 외부 도메인
`doyoulikeclassic.com` 및 `www.doyoulikeclassic.com` 트래픽을 해당 로컬 서버로 전달하는 구조로 배포한다.

## 필요한 권한

Cloudflare API 토큰에는 최소한 다음 권한이 필요하다.

- Account: Cloudflare Tunnel Edit
- Zone: DNS Edit
- Account: Account Read
- Zone: Zone Read

현재 받은 토큰은 계정과 zone, DNS 조회는 가능하지만 Tunnel API에서 인증 오류가 발생했다. Tunnel 생성까지 자동화하려면 위 권한이 포함된 토큰이 필요하다.

## 최초 연결

```bash
export CF_API_TOKEN="Cloudflare API token"
export CF_ACCOUNT_ID="2f05ada8b82bfa6f8ce858cdab914f7b"
export CF_ZONE_ID="cddf5255756c77ae3f328512a141608d"
export CF_TUNNEL_NAME="doyoulikeclassic-main"
export CF_HOSTNAMES="doyoulikeclassic.com,www.doyoulikeclassic.com"
export CF_ORIGIN_URL="http://localhost:3001"
export CF_TUNNEL_TOKEN_FILE="$HOME/.cloudflared/doyoulikeclassic-main.token"

npm run cloudflare:setup
```

이 명령은 named tunnel을 만들거나 기존 tunnel을 재사용하고, 두 hostname을 tunnel에 연결하며, Cloudflare Tunnel token을 `CF_TUNNEL_TOKEN_FILE` 위치에 저장한다. token은 repo에 저장하지 않는다.

## 서버 실행

```bash
NODE_ENV=production \
PORT=3001 \
DATABASE_PATH=data/classic-rotation.sqlite \
ADMIN_PASSWORD="관리자 비밀번호" \
SESSION_SECRET="충분히 긴 랜덤 문자열" \
PUBLIC_BASE_URL="https://doyoulikeclassic.com" \
npm start
```

다른 터미널에서 tunnel connector를 실행한다.

```bash
export CF_TUNNEL_TOKEN_FILE="$HOME/.cloudflared/doyoulikeclassic-main.token"
npm run cloudflare:tunnel
```

## 다른 컴퓨터에서 실행할 때

1. 같은 repo와 데이터베이스 파일을 준비한다.
2. 앱을 동일하게 `PORT=3001`로 실행한다.
3. 같은 Cloudflare Tunnel token file을 안전하게 옮기거나 Cloudflare dashboard에서 replica token을 다시 발급한다.
4. `npm run cloudflare:tunnel`을 실행한다.

같은 tunnel token으로 여러 컴퓨터에서 동시에 connector를 켤 수는 있지만, 그러면 Cloudflare가 여러 connector로 트래픽을 분산할 수 있다. 실제 운영 서버는 의도하지 않은 분산을 피하려면 한 컴퓨터에서만 켜는 편이 안전하다.

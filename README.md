# 로또 API 백엔드

Node.js, Express, MongoDB를 사용한 로또 번호 API 서비스입니다.

## 기능

-   한국 로또 6/45 당첨 번호 데이터 관리
-   사용자 번호 저장 및 당첨 확인
-   당첨 통계 분석

## 시작하기

### 필수 조건

-   Node.js v14 이상
-   MongoDB (로컬 설치 또는 Atlas)

### 설치

1. 의존성 설치:

```bash
npm install
```

2. `.env` 파일 설정:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lotto
NODE_ENV=development
```

### 실행

개발 서버 실행:

```bash
npm run dev
```

프로덕션 서버 실행:

```bash
npm start
```

### 로또 데이터 시드

모든 회차의 로또 데이터를 가져오려면:

```bash
npm run seed
```

최근 회차 데이터만 가져오려면:

```bash
npm run seed:recent
```

특정 범위의 회차 데이터를 가져오려면:

```bash
node ./utils/seedLottoData.js [시작회차] [종료회차]
```

## API 엔드포인트

### 로또 당첨 정보

-   `GET /api/lotto/latest` - 최신 회차 정보 조회
-   `GET /api/lotto/:round` - 특정 회차 정보 조회
-   `GET /api/lotto` - 여러 회차 정보 조회 (쿼리 파라미터: start, end)
-   `GET /api/lotto/stats/:round` - 특정 회차 당첨 통계 조회

### 사용자 번호 관리

-   `POST /api/users/numbers` - 사용자 번호 저장
    -   요청 본문: `{ "numbers": [1, 2, 3, 4, 5, 6] }`
-   `GET /api/users/numbers/:numberId/check/:round` - 사용자 번호와 특정 회차 당첨 번호 비교
-   `GET /api/users/numbers` - 모든 사용자 번호 조회 (쿼리 파라미터: page, limit)

## 데이터 모델

### Lotto (로또 당첨 정보)

-   `drwNo`: 회차 번호
-   `drwNoDate`: 추첨일
-   `drwtNo1~6`: 당첨 번호 6개
-   `bnusNo`: 보너스 번호
-   `firstWinamnt`: 1등 상금액
-   `firstPrzwnerCo`: 1등 당첨자 수
-   `totSellamnt`: 총 판매금액
-   `returnValue`: API 응답 상태

### UserNumber (사용자 번호)

-   `numbers`: 사용자가 선택한 6개 번호
-   `createdAt`: 생성 시간
-   `winResult`: 당첨 결과 (drwNo, rank, matchedNumbers, matchedBonus, verifiedAt)

### WinStats (당첨 통계)

-   `drwNo`: 회차 번호
-   `rank1~5Count`: 각 등수별 당첨 횟수
-   `totalGeneratedCount`: 총 번호 생성 횟수
-   `updatedAt`: 통계 업데이트 시간

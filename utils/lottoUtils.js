const moment = require("moment");
const axios = require("axios");
const cheerio = require("cheerio");

/**
 * 현재 최신 회차 번호를 계산합니다 (예상값).
 */
const getCurrentRound = () => {
    // 로또 시작일: 2002-12-07 (제1회)
    const startDate = moment("2002-12-07");
    const today = moment();
    const diffDays = today.diff(startDate, "days");
    return Math.floor(diffDays / 7) + 1;
};

/**
 * 동행복권 웹사이트에서 최신 회차 번호를 크롤링합니다.
 * 블로그 참고: https://dalseobi.tistory.com/159
 */
const fetchLatestRound = async () => {
    try {
        // 동행복권 메인 페이지 요청
        const response = await axios.get(
            "https://dhlottery.co.kr/common.do?method=main",
            {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    Referer: "https://www.dhlottery.co.kr",
                },
            }
        );

        // HTML 파싱
        const $ = cheerio.load(response.data);
        // 최신 회차 정보 추출 (lottoDrwNo ID를 가진 strong 태그)
        const latestRound = $("#lottoDrwNo").text();

        if (latestRound && !isNaN(parseInt(latestRound))) {
            return parseInt(latestRound);
        }

        // 크롤링 실패 시 계산된 회차 사용
        console.warn(
            "크롤링으로 최신 회차를 가져오지 못했습니다. 계산된 회차를 사용합니다."
        );
        return getCurrentRound();
    } catch (error) {
        console.error("최신 회차 크롤링 실패:", error.message);
        // 오류 발생 시 계산된 회차 사용
        return getCurrentRound();
    }
};

/**
 * 사용자 번호와 당첨 번호를 비교하여 당첨 등수를 계산합니다.
 * @param {Array} userNumbers - 사용자가 선택한 로또 번호 배열 (6개)
 * @param {Object} lottoDraw - 로또 당첨 정보 객체
 * @returns {Object} 당첨 결과 정보
 */
const checkWinResult = (userNumbers, lottoDraw) => {
    // 당첨 번호 배열
    const winNumbers = [
        lottoDraw.drwtNo1,
        lottoDraw.drwtNo2,
        lottoDraw.drwtNo3,
        lottoDraw.drwtNo4,
        lottoDraw.drwtNo5,
        lottoDraw.drwtNo6,
    ];

    // 보너스 번호
    const bonusNumber = lottoDraw.bnusNo;

    // 일치하는 번호 찾기
    const matchedNumbers = userNumbers.filter((num) =>
        winNumbers.includes(num)
    );

    // 보너스 번호 일치 여부
    const matchedBonus = userNumbers.includes(bonusNumber);

    // 당첨 등수 결정
    let rank = 0; // 기본값: 미당첨

    if (matchedNumbers.length === 6) {
        rank = 1; // 1등: 6개 번호 일치
    } else if (matchedNumbers.length === 5 && matchedBonus) {
        rank = 2; // 2등: 5개 번호 + 보너스 번호 일치
    } else if (matchedNumbers.length === 5) {
        rank = 3; // 3등: 5개 번호 일치
    } else if (matchedNumbers.length === 4) {
        rank = 4; // 4등: 4개 번호 일치
    } else if (matchedNumbers.length === 3) {
        rank = 5; // 5등: 3개 번호 일치
    }

    return {
        rank,
        matchedNumbers,
        matchedBonus,
        drwNo: lottoDraw.drwNo,
        verifiedAt: new Date(),
    };
};

/**
 * 특정 회차의 로또 당첨 번호를 외부 API에서 가져옵니다.
 * @param {Number} round - 가져올 회차 번호
 */
const fetchLottoData = async (round, retries = 3, delay = 2000) => {
    try {
        console.log(`${round}회차 로또 데이터를 조회합니다...`);

        // 동행복권 API URL
        const url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${round}`;

        // 실제 브라우저처럼 보이는 헤더 설정
        const headers = {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Referer: "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
            Accept: "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "X-Requested-With": "XMLHttpRequest",
        };

        const response = await axios.get(url, { headers, timeout: 10000 });

        if (response.data && response.data.returnValue === "success") {
            return response.data;
        } else {
            console.error(
                `${round}회차 로또 데이터 API 응답 실패:`,
                response.data
            );
            throw new Error("API 응답이 유효하지 않습니다.");
        }
    } catch (error) {
        if (retries > 0) {
            console.warn(
                `${round}회차 데이터 조회 실패, ${delay}ms 후 재시도... (남은 시도: ${retries})`
            );

            // 지정된 시간만큼 대기
            await new Promise((resolve) => setTimeout(resolve, delay));

            // 재귀적으로 다시 시도 (지연 시간 증가)
            return fetchLottoData(round, retries - 1, delay * 1.5);
        }

        console.error(`로또 데이터 조회 오류 (${round}회차):`, error.message);
        throw error;
    }
};

module.exports = {
    getCurrentRound,
    fetchLatestRound,
    checkWinResult,
    fetchLottoData,
};

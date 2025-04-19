const mongoose = require("mongoose");
const Lotto = require("../models/Lotto");
const WinStats = require("../models/WinStats");
const { fetchLottoData, getCurrentRound } = require("./lottoUtils");
require("dotenv").config();

/**
 * 지정된 범위의 로또 데이터를 API에서 가져와 DB에 저장합니다.
 * @param {Number} start - 시작 회차
 * @param {Number} end - 종료 회차
 */
const seedLottoData = async (start = 1, end = getCurrentRound()) => {
    try {
        // MongoDB 연결
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB 연결 성공");

        // 범위 내 각 회차에 대해 데이터 가져오기
        for (let round = start; round <= end; round++) {
            try {
                // 이미 DB에 저장된 데이터는 건너뜀
                const existingData = await Lotto.findOne({ drwNo: round });
                if (existingData) {
                    console.log(`${round}회차 데이터 이미 존재함, 건너뜁니다.`);
                    continue;
                }

                // API에서 데이터 가져오기
                const lottoData = await fetchLottoData(round);

                // 날짜 형식 변환
                lottoData.drwNoDate = new Date(lottoData.drwNoDate);

                // DB에 저장
                await Lotto.create(lottoData);

                // 당첨 통계 문서도 초기화
                await WinStats.findOneAndUpdate(
                    { drwNo: round },
                    { drwNo: round },
                    { upsert: true, new: true }
                );

                console.log(`${round}회차 데이터 저장 완료`);

                // API 요청 사이에 약간의 지연을 줌 (API 서버 부하 방지)
                await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (error) {
                console.error(
                    `${round}회차 데이터 저장 중 오류:`,
                    error.message
                );
                // 오류 발생해도 계속 진행
            }
        }

        console.log(`${start}회차부터 ${end}회차까지의 데이터 가져오기 완료`);
    } catch (error) {
        console.error("초기 데이터 가져오기 실패:", error);
    } finally {
        // 연결 종료
        await mongoose.disconnect();
        console.log("MongoDB 연결 종료");
    }
};

// 직접 실행 시 사용 (예: node seedLottoData.js 1 100)
if (require.main === module) {
    const args = process.argv.slice(2);
    const start = parseInt(args[0]) || 1;
    const end = parseInt(args[1]) || getCurrentRound();

    seedLottoData(start, end)
        .then(() => process.exit(0))
        .catch((err) => {
            console.error("시드 스크립트 실행 오류:", err);
            process.exit(1);
        });
}

module.exports = seedLottoData;

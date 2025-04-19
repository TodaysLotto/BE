const Lotto = require("../models/Lotto");
const { fetchLatestRound, fetchLottoData } = require("../utils/lottoUtils");

/**
 * 여러 회차의 로또 정보를 한번에 가져옵니다.
 */
exports.getMultipleDraws = async (req, res) => {
    try {
        const { start, end, latest, dbOnly } = req.query;

        // 최신 회차 가져오기 시도
        let latestRound = 1168; // 기본값 (2023년 11월 기준 최신 회차)
        try {
            latestRound = await fetchLatestRound();
        } catch (error) {
            console.warn("최신 회차 크롤링 실패:", error.message);
            console.log(`기본 최신 회차 값(${latestRound}) 사용`);

            // DB에서 가장 높은 회차 조회 시도
            try {
                const highestDraw = await Lotto.findOne().sort({ drwNo: -1 });
                if (highestDraw) {
                    latestRound = highestDraw.drwNo;
                    console.log(`DB에서 찾은 최신 회차: ${latestRound}`);
                }
            } catch (dbError) {
                console.warn("DB에서 최신 회차 조회 실패:", dbError.message);
            }
        }

        // 최신 N개 회차만 요청한 경우
        if (latest) {
            const latestCount = parseInt(latest);
            if (!isNaN(latestCount) && latestCount > 0) {
                // 최신 회차부터 latestCount만큼 이전 회차까지
                const startRound = Math.max(1, latestRound - latestCount + 1);
                const endRound = latestRound;

                console.log(
                    `최신 ${latestCount}개 로또 회차 정보 조회: ${startRound} ~ ${endRound}`
                );

                // req.query 재설정
                req.query.start = startRound.toString();
                req.query.end = endRound.toString();
            }
        }

        // 시작 회차와 종료 회차 설정 (기본값: 모든 회차)
        const startRound = parseInt(req.query.start) || 1;
        const endRound = parseInt(req.query.end) || latestRound;

        console.log(
            `여러 회차 로또 정보 조회: ${startRound} ~ ${endRound} (총 ${
                endRound - startRound + 1
            }회)`
        );

        // 요청 범위가 너무 크면 제한
        if (endRound - startRound > 500 && !req.query.noLimit) {
            return res.status(400).json({
                message:
                    "한 번에 최대 500회차까지만 조회 가능합니다. 더 많은 데이터를 원하시면 ?noLimit=true 파라미터를 추가하세요.",
            });
        }

        // DB에서 범위 내 회차 정보 조회
        let draws = await Lotto.find({
            drwNo: { $gte: startRound, $lte: endRound },
        }).sort({ drwNo: 1 });

        // DB에 데이터가 부족하면 API로 요청해서 채우기
        const existingRounds = new Set(draws.map((draw) => draw.drwNo));
        const missingRounds = [];

        for (let round = startRound; round <= endRound; round++) {
            if (!existingRounds.has(round)) {
                missingRounds.push(round);
            }
        }

        // DB에만 있는 데이터를 사용하는 경우 API 호출 건너뛰기
        if (dbOnly === "true") {
            console.log(
                "DB에 있는 데이터만 사용합니다. API 호출을 건너뜁니다."
            );
        }
        // 없는 회차가 있고 dbOnly 옵션이 없는 경우 API로 가져와서 추가
        else if (missingRounds.length > 0) {
            console.log(
                `DB에 없는 회차 데이터 ${missingRounds.length}개를 API로 요청합니다.`
            );

            // 요청할 회차가 너무 많으면 앞에서부터 10개만 처리 (50개에서 10개로 줄임)
            const roundsToFetch =
                missingRounds.length > 10
                    ? missingRounds.slice(0, 10)
                    : missingRounds;

            // 순차적으로 처리하여 API 부하 줄이기
            const fetchedResults = [];
            for (const round of roundsToFetch) {
                try {
                    // 각 요청 간 지연 시간 추가 (1초)
                    if (fetchedResults.length > 0) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, 1000)
                        );
                    }

                    const lottoData = await fetchLottoData(round);

                    // API 응답으로 받은 날짜 문자열을 Date 객체로 변환
                    lottoData.drwNoDate = new Date(lottoData.drwNoDate);

                    // DB에 저장
                    const savedDraw = await Lotto.create(lottoData);
                    fetchedResults.push(savedDraw);
                    console.log(`${round}회차 데이터 저장 완료!`);
                } catch (error) {
                    console.warn(
                        `${round}회차 데이터 가져오기 실패:`,
                        error.message
                    );
                }
            }

            if (fetchedResults.length > 0) {
                // 새로 가져온 데이터를 결과에 추가
                draws = [...draws, ...fetchedResults].sort(
                    (a, b) => a.drwNo - b.drwNo
                );
            }

            // 아직 가져오지 못한 회차가 있다면 안내
            if (missingRounds.length > roundsToFetch.length) {
                console.log(
                    `${
                        missingRounds.length - roundsToFetch.length
                    }개 회차는 한 번에 처리하지 않고 다음 요청 시 처리할 예정입니다.`
                );
            }
        }

        // 클라이언트에 전체 회차 수와 현재 가져온 회차 수 정보 포함
        res.status(200).json({
            draws,
            meta: {
                totalRounds: endRound - startRound + 1,
                returnedRounds: draws.length,
                requestedRange: { start: startRound, end: endRound },
                missingRounds:
                    missingRounds.length > 0
                        ? `${missingRounds.length}개 회차 데이터 누락 (${
                              missingRounds.length <= 10
                                  ? missingRounds.join(", ")
                                  : missingRounds.slice(0, 10).join(", ") +
                                    " 외 " +
                                    (missingRounds.length - 10) +
                                    "개"
                          })`
                        : null,
            },
        });
    } catch (error) {
        console.error("여러 회차 로또 정보 조회 실패:", error);
        res.status(500).json({
            message: "서버 오류 발생",
            error: error.message,
        });
    }
};

/**
 * 특정 범위의 로또 데이터를 강제로 로드합니다.
 * 중간에 실패해도 계속 진행하며, 성공한 데이터만 반환합니다.
 */
exports.loadLottoData = async (req, res) => {
    try {
        const { start, end, batch = 5, delay = 2000 } = req.query;

        // 최신 회차 확인 시도
        let latestRound = 1168; // 기본값 설정
        try {
            latestRound = await fetchLatestRound();
            console.log(`최신 회차 확인 성공: ${latestRound}회차`);
        } catch (error) {
            console.warn("최신 회차 확인 실패:", error.message);

            // DB에서 가장 높은 회차 찾기 시도
            try {
                const highestDraw = await Lotto.findOne().sort({ drwNo: -1 });
                if (highestDraw) {
                    latestRound = highestDraw.drwNo;
                    console.log(`DB 최신 회차: ${latestRound}회차`);
                }
            } catch (dbError) {
                console.warn("DB 최신 회차 조회 실패:", dbError.message);
            }
        }

        // 로드할 회차 범위 계산
        const startRound = parseInt(start) || Math.max(1, latestRound - 499);
        const endRound = parseInt(end) || latestRound;
        const batchSize = parseInt(batch) || 5;
        const delayMs = parseInt(delay) || 2000;

        console.log(
            `로또 데이터 로드 시작: ${startRound}회차 ~ ${endRound}회차 (총 ${
                endRound - startRound + 1
            }회차)`
        );
        console.log(`배치 크기: ${batchSize}, 지연 시간: ${delayMs}ms`);

        // 클라이언트에 작업 시작 알림
        res.status(200).json({
            message: "로또 데이터 로드를 시작합니다.",
            range: { start: startRound, end: endRound },
            settings: { batchSize, delay: delayMs },
        });

        // 이미 DB에 있는 회차 확인
        const existingDraws = await Lotto.find({
            drwNo: { $gte: startRound, $lte: endRound },
        }).select("drwNo");

        const existingRounds = new Set(existingDraws.map((d) => d.drwNo));
        const missingRounds = [];

        for (let round = startRound; round <= endRound; round++) {
            if (!existingRounds.has(round)) {
                missingRounds.push(round);
            }
        }

        console.log(
            `이미 DB에 있는 회차: ${existingRounds.size}개, 누락된 회차: ${missingRounds.length}개`
        );

        // 누락된 회차가 없으면 종료
        if (missingRounds.length === 0) {
            console.log("모든 회차 데이터가 이미 DB에 존재합니다.");
            return;
        }

        // 회차별로 배치 처리
        const batches = [];
        for (let i = 0; i < missingRounds.length; i += batchSize) {
            batches.push(missingRounds.slice(i, i + batchSize));
        }

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(
                `배치 ${i + 1}/${batches.length} 처리 중... (${batch.join(
                    ", "
                )}회차)`
            );

            // 각 배치를 순차적으로 처리
            for (const round of batch) {
                try {
                    const lottoData = await fetchLottoData(round, 3, 3000); // 최대 3번 재시도, 3초 간격

                    // 날짜 문자열을 Date 객체로 변환
                    lottoData.drwNoDate = new Date(lottoData.drwNoDate);

                    // DB에 저장
                    await Lotto.create(lottoData);
                    successCount++;
                    console.log(
                        `${round}회차 데이터 저장 성공! (${successCount}/${missingRounds.length})`
                    );
                } catch (error) {
                    errorCount++;
                    console.error(
                        `${round}회차 데이터 저장 실패:`,
                        error.message
                    );
                }

                // 각 요청 사이에 지연 시간 추가
                if (batch.indexOf(round) < batch.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }

            // 배치 사이에 더 긴 지연 시간 추가
            if (i < batches.length - 1) {
                console.log(`다음 배치 전 ${delayMs}ms 대기...`);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }

        console.log(
            `데이터 로드 완료: 성공 ${successCount}개, 실패 ${errorCount}개`
        );
    } catch (error) {
        console.error("로또 데이터 로드 중 오류 발생:", error);
    }
};

const express = require("express");
const router = express.Router();
const lottoController = require("../controllers/lottoController");

// 기본 경로 (여러 회차 로또 정보 조회)
router.get("/", lottoController.getMultipleDraws);

// 데이터 로딩 엔드포인트 (특정 범위의 데이터를 강제로 가져옴)
router.get("/load", lottoController.loadLottoData);

module.exports = router;

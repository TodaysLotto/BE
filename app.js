const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// 라우트 임포트
const lottoRoutes = require("./routes/lottoRoutes");

// 앱 초기화
const app = express();

// 기본 미들웨어
app.use(express.json());
app.use(cors());

// 라우트 설정
app.use("/lotto", lottoRoutes);

// 테스트 라우트도 수정
app.get("/test", (req, res) => {
    res.json({ message: "테스트 API가 작동합니다!" });
});

// 데이터베이스 연결
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB 연결 성공");
    })
    .catch((err) => {
        console.error("MongoDB 연결 실패:", err);
    });

// 서버 시작
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`서버가 ${PORT} 포트에서 실행 중입니다.`);
});

module.exports = app;

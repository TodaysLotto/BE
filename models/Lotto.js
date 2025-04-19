const mongoose = require("mongoose");

// 로또 당첨 번호 정보 스키마
const lottoSchema = new mongoose.Schema(
    {
        drwNo: {
            type: Number,
            required: true,
            unique: true,
        },
        drwNoDate: {
            type: Date,
            required: true,
        },
        drwtNo1: {
            type: Number,
            required: true,
        },
        drwtNo2: {
            type: Number,
            required: true,
        },
        drwtNo3: {
            type: Number,
            required: true,
        },
        drwtNo4: {
            type: Number,
            required: true,
        },
        drwtNo5: {
            type: Number,
            required: true,
        },
        drwtNo6: {
            type: Number,
            required: true,
        },
        bnusNo: {
            type: Number,
            required: true,
        },
        firstWinamnt: {
            type: Number,
            required: true,
        },
        firstPrzwnerCo: {
            type: Number,
            required: true,
        },
        totSellamnt: {
            type: Number,
            required: true,
        },
        returnValue: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Lotto", lottoSchema);

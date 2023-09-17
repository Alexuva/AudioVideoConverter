"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AVC = void 0;
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffprobe_1 = __importDefault(require("@ffprobe-installer/ffprobe"));
const events_1 = require("events");
class AVC extends events_1.EventEmitter {
    init() {
        try {
            if (ffmpeg_static_1.default) {
                fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_static_1.default);
            }
            else {
                throw new Error('Ffmpeg not found');
            }
            if (ffprobe_1.default.path) {
                fluent_ffmpeg_1.default.setFfprobePath(ffprobe_1.default.path);
            }
            else {
                throw new Error('Path of ffprobe not found');
            }
        }
        catch (Error) {
            this.emit('error');
            console.error(Error);
        }
    }
    getMetadata(filePath) {
        return new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(filePath, (error, data) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(data);
                }
            });
        });
    }
    getCodecs(data) {
        let codecs = [];
        for (const stream of data.streams) {
            try {
                if (stream.codec_name && stream.codec_type && stream.bit_rate) {
                    codecs.push({
                        name: stream.codec_name,
                        type: stream.codec_type,
                        bitrate: parseInt(stream.bit_rate)
                    });
                }
            }
            catch (error) {
                this.emit('error');
                console.error(error);
            }
        }
        return codecs;
    }
    hasAudioCodec(data) {
        let hasCodec = false;
        for (const codec of data) {
            if (codec.type === 'audio') {
                hasCodec = true;
            }
        }
        return hasCodec;
    }
    hasVideoCodec(data) {
        let hasCodec = false;
        for (const codec of data) {
            if (codec.type === 'video') {
                hasCodec = true;
            }
        }
        return hasCodec;
    }
    audioConversion(filePath, savingPath, outputFormat, bitrate) {
        try {
            (0, fluent_ffmpeg_1.default)()
                .input(filePath)
                .outputOptions('-ab', `${bitrate}k`)
                .toFormat(outputFormat)
                .saveToFile(savingPath)
                .on('progress', (data) => {
                if (data.percent) {
                    this.emit('progress', data.percent);
                }
            })
                .on('end', () => {
                this.emit('finish');
            });
        }
        catch (error) {
            this.emit('error');
            console.error(error);
        }
    }
    getAudio(filePath, savingPath, outputFormat) {
        try {
            let bitrate;
            this.init();
            this.getMetadata(filePath)
                .then(data => this.getCodecs(data))
                .then(codecs => {
                for (const codec of codecs) {
                    if (codec.type === 'audio') {
                        bitrate = Math.floor(codec.bitrate / 1000) ?? undefined;
                    }
                }
                return this.hasAudioCodec(codecs);
            })
                .then(hasAudio => {
                if (hasAudio) {
                    bitrate = bitrate ?? 320;
                    this.emit('start');
                    this.audioConversion(filePath, savingPath, outputFormat, bitrate);
                }
                else {
                    throw new Error("Doesn't have audio");
                }
            });
        }
        catch (error) {
            this.emit('error');
            console.error(error);
        }
    }
}
exports.AVC = AVC;

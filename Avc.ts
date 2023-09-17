import ffmpegStatic from 'ffmpeg-static';
import Ffmpeg, { FfprobeData } from 'fluent-ffmpeg';
import ffprobe from '@ffprobe-installer/ffprobe';
import { Codec } from './types';
import { EventEmitter } from 'events';

export class AVC extends EventEmitter{

    private init():void{
        try{
            if(ffmpegStatic){
                Ffmpeg.setFfmpegPath(ffmpegStatic)
            }else{
                throw new Error('Ffmpeg not found');
            }

            if(ffprobe.path){
                Ffmpeg.setFfprobePath(ffprobe.path)
            }else{
                throw new Error('Path of ffprobe not found');
            }
            
        }catch(Error){
            this.emit('error');
            console.error(Error);
        }
    }

    private getMetadata(filePath:string):Promise<FfprobeData>{
        return new Promise((resolve, reject)=>{
            Ffmpeg.ffprobe(filePath, (error, data)=>{
                if(error){
                    reject(error);
                }else{
                    console.log(data);
                    resolve(data);
                }
            })
        })
    }

    private getCodecs(data:FfprobeData):Codec[]{
        let codecs:Codec[] = [];

        for(const stream of data.streams){
            try{
                if(stream.codec_name && stream.codec_type && stream.bit_rate){
                    codecs.push({
                        name: stream.codec_name,
                        type: stream.codec_type,
                        bitrate: parseInt(stream.bit_rate)
                    })
                }
            }catch(error){
                this.emit('error');
                console.error(error);
            }
        }
        return codecs;
    }

    private hasAudioCodec(data:Codec[]):boolean{
        let hasCodec:boolean = false;
        for( const codec of data){
            if(codec.type === 'audio'){
                hasCodec = true;
            } 
        }
        return hasCodec;
    }

    private hasVideoCodec(data:Codec[]):boolean{
        let hasCodec:boolean = false;
        for(const codec of data){
            if(codec.type === 'video'){
                hasCodec = true;
            }
        }
        return hasCodec;
    }

    private audioConversion(filePath:string, savingPath:string, outputFormat:string, bitrate:number):void{
        try{
            Ffmpeg()
                .input(filePath)
                .outputOptions('-ab', `${bitrate}k`)
                .toFormat(outputFormat)
                .saveToFile(savingPath)
                .on('progress', (data)=>{
                    if(data.percent){
                        this.emit('progress', data.percent);
                    }
                })
                .on('end', ()=>{
                    this.emit('finish');
                })
        }catch(error){
            this.emit('error');
            console.error(error)
        }
    }

    public getAudio(filePath:string, savingPath:string, outputFormat:string):void{
        try{
            let bitrate:number;
            this.init();
            this.getMetadata(filePath)
            .then( data => this.getCodecs(data))
            .then( codecs => {
                for(const codec of codecs){
                    if(codec.type === 'audio'){
                        bitrate = Math.floor(codec.bitrate/1000) ?? undefined;
                    }
                }
                return this.hasAudioCodec(codecs)
            })
            .then( hasAudio =>{ 
                if(hasAudio){
                    bitrate = bitrate ?? 320;
                    this.emit('start');
                    this.audioConversion(filePath, savingPath, outputFormat, bitrate)
                }else{
                    throw new Error("Doesn't have audio")
                }
            })
        }catch(error){
            this.emit('error');
            console.error(error)
        }
    }
}

const CONVERTER = new AVC();

CONVERTER.getAudio('./video/Orisa.mp4', './video/ejemplo1.mp3', 'mp3');
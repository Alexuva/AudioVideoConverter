import ffmpegStatic from 'ffmpeg-static';
import Ffmpeg, { FfprobeData } from 'fluent-ffmpeg';
import ffprobe from '@ffprobe-installer/ffprobe';
import { Codec } from './Types';
import * as Enums from './Enum';
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
            this.emit(Enums.Events.ERROR);
            console.error(Error);
        }
    }

    public getMetadata(filePath:string):Promise<FfprobeData>{
        return new Promise((resolve, reject)=>{
            Ffmpeg.ffprobe(filePath, (error, data)=>{
                if(error){
                    reject(error);
                }else{
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
                this.emit(Enums.Events.ERROR);
                console.error(error);
            }
        }
        return codecs;
    }

    private hasAudioCodec(data:Codec[]):boolean{
        let hasCodec:boolean = false;
        for( const codec of data){
            if(codec.type === Enums.CodecType.AUDIO ){
                hasCodec = true;
            } 
        }
        return hasCodec;
    }

    private hasVideoCodec(data:Codec[]):boolean{
        let hasCodec:boolean = false;
        for(const codec of data){
            if(codec.type === Enums.CodecType.VIDEO){
                hasCodec = true;
            }
        }
        return hasCodec;
    }

    private videoConversion(filePath:string, savingPath:string, outputFormat:string, fps:number):void{
        try{
            Ffmpeg()
                .input(filePath)
                .outputOptions('-filter:v' , `fps=fps=${fps}`)
                .toFormat(outputFormat)
                .saveToFile(savingPath)
                .on(Enums.Events.PROGRESS, (data)=>{
                    if(data.percent){
                        this.emit(Enums.Events.PROGRESS, data.percent);
                    }
                })
                .on(Enums.Events.FINISH, ()=>{
                    this.emit(Enums.Events.FINISH);
                })
        }catch(error){
            this.emit(Enums.Events.ERROR);
            console.error(error)
        }
    }

    public getVideo(filePath:string, savingPath:string, outputFormat:string, fps:number = 24):void{
        try{
            this.init();
            this.getMetadata(filePath)
            .then( data => this.getCodecs(data))
            .then( codecs => this.hasVideoCodec(codecs))
            .then( hasVideo =>{ 
                if(hasVideo){
                    this.emit(Enums.Events.START);
                    this.videoConversion(filePath, `${savingPath}.${outputFormat}`, outputFormat, fps)
                }else{
                    throw new Error("Doesn't have video")
                }
            })
        }catch(error){
            this.emit(Enums.Events.ERROR);
            console.error(error)
        }
    }

    private audioConversion(filePath:string, savingPath:string, outputFormat:string):void{
        try{
            Ffmpeg()
                .input(filePath)
                .toFormat(outputFormat)
                .saveToFile(savingPath)
                .on(Enums.Events.PROGRESS, (data)=>{
                    if(data.percent){
                        this.emit(Enums.Events.PROGRESS, data.percent);
                    }
                })
                .on(Enums.Events.FINISH, ()=>{
                    this.emit(Enums.Events.FINISH);
                })
        }catch(error){
            this.emit(Enums.Events.ERROR);
            console.error(error)
        }
    }

    public getAudio(filePath:string, savingPath:string, outputFormat:string):void{
        try{
            this.init();
            this.getMetadata(filePath)
            .then( data => this.getCodecs(data))
            .then( codecs => this.hasAudioCodec(codecs))
            .then( hasAudio =>{ 
                if(hasAudio){
                    this.emit(Enums.Events.START);
                    this.audioConversion(filePath, `${savingPath}.${outputFormat}`, outputFormat)
                }else{
                    throw new Error("Doesn't have audio")
                }
            })
        }catch(error){
            this.emit(Enums.Events.ERROR);
            console.error(error)
        }
    }
}
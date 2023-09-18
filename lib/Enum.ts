enum CodecType{
    AUDIO = 'audio',
    VIDEO = 'video'
}

enum Events{
    START = 'start',
    FINISH = 'end',
    PROGRESS = 'progress',
    ERROR = 'error'
}

export{ CodecType, Events }
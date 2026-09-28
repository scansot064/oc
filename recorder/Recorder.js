class Recorder {
  #isElectron = false;
  #inputVideo = null;
  #inputCanvas = null;
  #audioStream = null;

  #renderWorkerPath = "";
  #encodeWorkerPath = "";
  #renderWorker = null;
  #encodeWorker = null;

  #sourceInfo = {};
  #transform = {
    rotate: 0,
    mirror: false,
  };
  #size = {
    width: 800,
    height: 600,
  };

  #isChromeOs = false;
  #Mp4VideoCodecs = ["avc1.42E03E", "avc1.42E034", "avc1.42E02A", "avc1.42E01f"];
  #Mp4AudioCodecs = ["mp4a.40.2", "mp4a.40.02", "mp4a.40.5", "mp4a.40.05", "mp4a.40.29"];
  #WebmVideoCodecs = ["vp8"];
  #WebmAudioCodecs = ["opus"];
  mimeType = "mp4";

  filePath = null;
  fileHandle = null;
  fileDescriptor = null;
  fileWriteStream = null;

  mixCanvas = null;
  mixVideo = null;
  mixStream = null;
  mixOffscreen = null;
  bitrate = 8_000_000;

  isRecordIng = false;
  isRenderIng = false;
  isPauseIng = false;
  isFinish = false;

  videoConfig = {};

  listener = new EventTarget();

  constructor() {}

  initEnv(isElectron = false) {
    this.#isElectron = isElectron;
    this.#isChromeOs = /\bCrOS\b/.test(navigator.userAgent);
    if (this.#isChromeOs) {
      this.mimeType = "webm";
    }
  }
  initElement(liveViddeo, canvasPaint) {
    this.#inputVideo = liveViddeo;
    this.#inputCanvas = canvasPaint;
  }
  initAudio(audioStream) {
    // stop
    if (this.#audioStream) {
      this.#audioStream.getAudioTracks().forEach((track) => track.stop());
    }
    this.#audioStream = audioStream || null;
  }
  initWorker(renderWorkerPath, encodeWorkerPath) {
    this.#renderWorkerPath = renderWorkerPath;
    this.#encodeWorkerPath = encodeWorkerPath;
    this.#renderWorker = new Worker(this.#renderWorkerPath);
    this.#encodeWorker = new Worker(this.#encodeWorkerPath);
    this.onWorkerMessage();
  }
  async setCodecs() {
    let videoConfig = null;
    let videoCodecs = [];
    let audioCodecs = [];
    if (this.#isChromeOs) {
      videoCodecs = [...this.#WebmVideoCodecs];
      audioCodecs = [...this.#WebmAudioCodecs];
    } else {
      videoCodecs = [...this.#Mp4VideoCodecs];
      audioCodecs = [...this.#Mp4AudioCodecs];
    }
    let accelerations = ["prefer-hardware", "prefer-software", "no-preference"];
    for (const codec of videoCodecs) {
      for (const acceleration of accelerations) {
        let config = {
          codec: codec,
          width: this.#size.width,
          height: this.#size.height,
          bitrate: this.bitrate,
          framerate: 30,
          hardwareAcceleration: acceleration,
        };
        try {
          if (!videoConfig) {
            let supportConfig = await VideoEncoder.isConfigSupported(config);
            if (supportConfig.supported) {
              videoConfig = supportConfig;
              break;
            }
          }
        } catch (error) {
          console.log(config, error);
        }
      }
    }
    let audioConfig = null;
    if (this.#audioStream) {
      let audioTrack = this.#audioStream.getAudioTracks()[0];
      let audioSettings = audioTrack.getSettings();
      for (const codec of audioCodecs) {
        let config = {
          codec: codec,
          sampleRate: audioSettings.sampleRate,
          numberOfChannels: 1,
        };
        try {
          if (!audioConfig) {
            let supportConfig = await AudioEncoder.isConfigSupported(config);
            audioConfig = supportConfig.supported ? supportConfig : null;
          } else {
            console.log(await AudioEncoder.isConfigSupported(config));
          }
        } catch (error) {
          console.log(config, "fail!");
        }
      }
    }

    this.audioConfig = audioConfig?.supported ? audioConfig.config : null;
    this.videoConfig = videoConfig?.supported ? videoConfig.config : null;

    if (this.videoConfig) {
      return Promise.resolve();
    } else {
      return Promise.reject("VideoEncoder Config not support!");
    }
  }
  // 設置畫面大小
  setRenderSize(width, height) {
    this.#size.width = Number(width);
    this.#size.height = Number(height);
    if (this.#size.width >= 1600) {
      this.bitrate = 7_000_000;
    } else {
      this.bitrate = 3_500_000;
    }
  }
  // 設置畫面旋轉角度
  rotate(rotate) {
    this.#transform.rotate = rotate;
  }
  // 設置畫面水平翻轉
  mirror(mirror) {
    this.#transform.mirror = mirror ? true : false;
  }
  // 放大後需要裁切的畫面資訊
  sourceInfo(sourceInfo) {
    this.#sourceInfo = sourceInfo;
  }
  // 開始繪製合成畫面
  startRender() {
    let style = {
      position: "absolute",
      left: "100px",
      top: "100px",
      width: "300px",
      zIndex: "1000",
      border: "1px solid red",
    };
    this.mixVideo = document.createElement("video");
    this.mixCanvas = document.createElement("canvas");

    // set canvas siz
    this.mixCanvas.width = this.#size.width;
    this.mixCanvas.height = this.#size.height;

    // set offscreen
    let mixOffscreen = this.mixCanvas.transferControlToOffscreen();
    this.#renderWorker.postMessage(
      {
        type: "startRender",
        mixOffscreen: mixOffscreen,
      },
      [mixOffscreen]
    );

    Object.assign(this.mixVideo.style, style);
    Object.assign(this.mixCanvas.style, style);

    //document.body.appendChild(this.mixCanvas);
  }
  // 停止繪製合成畫面
  stopRender() {
    this.#renderWorker.postMessage({ type: "stopRender" });
  }
  // 繪製合成畫面
  updateRender() {
    if (this.isRenderIng) {
      // 設置畫面旋轉、水平翻轉、裁切畫面需要的訊息，分別是 rotate、mirror、sourceInfo
      this.listener.dispatchEvent(new Event("renderIng"));
      let promises = [createImageBitmap(this.#inputVideo), createImageBitmap(this.#inputCanvas)];
      Promise.all(promises)
        .then((bitmaps) => {
          this.#renderWorker.postMessage(
            {
              type: "drawRender",
              bitmaps: {
                videoBitmap: bitmaps[0],
                paintBitmap: bitmaps[1],
              },
              startTime: Date.now(),
              sourceInfo: this.#sourceInfo,
              rotate: this.#transform.rotate,
              mirror: this.#transform.mirror,
            },
            [bitmaps[0], bitmaps[1]]
          );
          bitmaps.forEach((bitmap) => {
            bitmap.close();
          });
        })
        .catch((err) => {
          console.log(err.message);
          if (err.message === "Failed to execute 'createImageBitmap' on 'Window': The source image width is 0.") {
            setTimeout(() => {
              this.updateRender();
            }, 100);
          }
        });
    }
  }
  // 開始編碼並寫入檔案
  startEncode() {
    this.mixStream = this.mixCanvas.captureStream(30);

    let transferableList = [];

    // get video stream readable
    let mixTrack = this.mixStream.getVideoTracks()[0];
    let mixProcessor = new MediaStreamTrackProcessor(mixTrack);
    let videoReadable = mixProcessor.readable;
    transferableList.push(videoReadable);

    // get audio stream readable
    let audioReadable = null;
    if (this.#audioStream && this.audioConfig) {
      let audioTrack = this.#audioStream.getAudioTracks()[0];
      let audioProcessor = new MediaStreamTrackProcessor(audioTrack);
      audioReadable = audioProcessor.readable;
      transferableList.push(audioReadable);
    }

    this.#encodeWorker.postMessage(
      {
        type: "startRecorder",
        mimeType: this.mimeType,
        videoConfig: this.videoConfig,
        audioConfig: audioReadable ? this.audioConfig : null,
        filePath: this.filePath,
        fileHandle: this.fileHandle,
        fileDescriptor: this.fileDescriptor,
        videoReadable: videoReadable,
        audioReadable: audioReadable,
      },
      transferableList
    );
  }
  // 停止編碼並寫入檔案
  stopEncode() {
    this.#encodeWorker.postMessage({ type: "stopRecorder" });
  }
  // 設置 webworker 訊息
  onWorkerMessage() {
    this.#renderWorker.onmessage = (e) => {
      if (e.data.type === "onStartRender") {
        this.updateRender();
        // this.startEncode();
      }
      if (e.data.type === "onDrawRender") {
        this.updateRender();
      }
      if (e.data.type === "onStopRender") {
        if (this.mixCanvas) {
          this.mixCanvas.remove();
          this.mixVideo.remove();
          this.mixCanvas = null;
          this.mixVideo = null;
        }
        this.isRenderIng = false;
      }
    };
    this.#encodeWorker.onmessage = async (e) => {
      if (e.data.type === "onStopRecorder") {
        this.isFinish = true;
        if (this.fileHandle) {
          this.fileHandle = null;
        }
        if (this.filePath) {
          this.filePath = null;
        }
        this.mixStream.getTracks().forEach((track) => track.stop());
        this.mixStream = null;
        this.stopRender();
      }
    };
  }
  // 錄製完畢
  onFinish(callback) {
    this.listener.addEventListener("finish", (e) => {
      callback();
    });
  }
  // 畫面繪製中
  onRendering(callback) {
    this.listener.addEventListener("renderIng", (e) => {
      callback();
    });
  }
  // 取得錄製影片長寬
  getSize = () => {
    return this.#size;
  };
  // 設置影片檔案
  setFile = (info) => {
    if (info.type === "fileHandle") {
      this.fileHandle = info.fileHandle;
    }
    if (info.type === "fileDescriptor") {
      this.fileDescriptor = info.fileDescriptor;
    }
    if (info.type === "filePath") {
      this.filePath = info.filePath;
    }
  };
  // 取得影片檔案
  getFileHandle = async (fileName) => {
    try {
      let fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: "Video File",
            accept: { "video/webm": [".webm"] },
          },
        ],
      });
      return Promise.resolve(fileHandle);
    } catch (error) {
      return Promise.reject(error);
    }
  };
  // startRender => onStarterRender => startEncode
  // startRender => onStarterRender => drawRednder <=> onDrawRender
  start() {
    this.isRecordIng = true;
    this.isRenderIng = true;
    this.isFinish = false;
    this.startRender();
    this.startEncode();
  }
  // stopEncode => onStopRecord => stopRender => onStopRender
  stop() {
    if (this.isPauseIng) {
      this.resume();
    }
    this.stopRender();
    this.stopEncode();
    this.isRecordIng = false;
  }
  // 暫停錄製
  pause() {
    this.isPauseIng = true;
    this.#encodeWorker.postMessage({
      type: "pauseRecorder",
    });
  }
  // 繼續錄製
  resume() {
    this.isPauseIng = false;
    this.#encodeWorker.postMessage({
      type: "resumeRecorder",
    });
  }
}
export { Recorder };

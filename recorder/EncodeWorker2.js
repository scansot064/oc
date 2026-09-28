(() => {
  "use strict";

  importScripts("../lib/mp4-muxer.min.js");
  importScripts("../lib/webm-muxer.min.js");

  var isElectron = false;
  if (typeof module === "object") {
    isElectron = true;
  }

  // node env
  if (isElectron) {
    var fs = require("fs");
  }

  var videoMuxer = null;

  var videoReader = null;
  var videoReadable = null;
  var videoEncoder = null;

  var audioReader = null;
  var audioReadable = null;
  var audioEncoder = null;

  var inRecordIng = false;
  var inPauseIng = false;

  var frameGenerateCount = 0;
  var audioGenerateCount = 0;

  var videoFrameQueue = [];

  var browserFileWriteStream = null; // in browser use
  var nodeFileDescriptor = null; // in electron node use

  const Timer = () => {
    let time = 0;
    let start = 0;
    let pause = 0;
    let temp = 0;
    let freq = null;
    const timeStart = () => {
      start = performance.now();
      timeProcess();
    };
    const timeProcess = () => {
      time = performance.now() - start - pause;
      freq = requestAnimationFrame(timeProcess);
    };
    const timeStop = () => {
      cancelAnimationFrame(freq);
      time = 0;
      start = 0;
      pause = 0;
      temp = 0;
      freq = null;
    };
    const timePause = () => {
      temp = performance.now();
      cancelAnimationFrame(freq);
    };
    const timeResume = () => {
      pause = pause + (performance.now() - temp);
      timeProcess();
    };
    const setTime = (t) => {
      time = t;
    };
    const getTime = () => {
      return Math.floor(time * 1000);
    };
    return {
      start: timeStart,
      stop: timeStop,
      pause: timePause,
      resume: timeResume,
      getTime,
      setTime,
    };
  };

  const RecordTimer = Timer();

  const encodeVideo = () => {
    const process = async (result) => {
      let done = result.done;
      let data = result?.value;
      let frame = null;
      if (done) {
        console.log("video done");
        return;
      }
      if (videoEncoder.encodeQueueSize <= 30) {
        if (frameGenerateCount === 0) {
          frame = new VideoFrame(data, {
            timestamp: 0,
          });
        } else if (frameGenerateCount > 0) {
          let timestamp = RecordTimer.getTime();
          frame = new VideoFrame(data, {
            timestamp: timestamp,
          });
        }
        frameGenerateCount++;
        const insert_keyframe = frameGenerateCount % 150 == 0;
        videoEncoder.encode(frame, { keyFrame: insert_keyframe });
        if (frameGenerateCount % 20 == 0) {
          console.log(frameGenerateCount + " frames processed");
        }
      } else {
        console.log("dropping frame, encoder falling behind");
      }
      
      data?.close();
      if (frame) {
        frame.close();
      }
      if (!inPauseIng) {
        videoReader.read().then(process);
      } else {
        console.log("pause video");
      }
    };
    videoReader.read().then(process);
  };

  const encodeAudio = () => {
    let process = async (result) => {
      let done = result.done;
      let data = result.value;
      let audio = null;

      if (done) {
        // console.log("audio done");
        return;
      }

      let buffer = new ArrayBuffer(data.allocationSize({ planeIndex: 0 }));
      data.copyTo(buffer, { planeIndex: 0 });

      let timestamp = RecordTimer.getTime();
      audio = new AudioData({
        format: data.format,
        sampleRate: data.sampleRate,
        numberOfFrames: data.numberOfFrames,
        numberOfChannels: data.numberOfChannels,
        timestamp: timestamp,
        data: new Int32Array(buffer),
      });

      try {
        audioEncoder.encode(audio);
      } catch (error) {
        // console.log(error);
      }

      data.close();
      audio.close();

      if (!inPauseIng) {
        audioReader.read().then(process);
      } else {
        // console.log("pause audio");
      }
    };
    if (audioReader) {
      audioReader.read().then(process);
    }
  };

  const getMP4FileTarget = (fileObject, writeTarget, mimeType) => {
    // in browser
    let Muxer = null;
    if (mimeType === "mp4") {
      Muxer = Mp4Muxer;
    } else {
      Muxer = WebMMuxer;
    }
    if (writeTarget === "FileSystemWritableFileStream") {
      return new Muxer.StreamTarget(
        (data, position) => {
          fileObject.write({
            type: "write",
            data: data,
            position: position,
          });
        },
        () => console.log("write finish")
      );
    }
    // in electron node
    if (writeTarget === "FileDescriptor") {
      let count = {
        generate: 0,
        write: 0,
      };
      return new Muxer.StreamTarget(
        (data, position) => {
          count.generate++;
          fs.write(fileObject, data, 0, data.byteLength, position, (err, written, buffer) => {
            count.write++;
            if (err) console.log(err);
          });
        },
        () => {
          let interval = setInterval(() => {
            if (count.generate === count.write) {
              count = null;
              fs.closeSync(fileObject);
              console.log("write finish");
              self.postMessage({ type: "onStopRecorder" });
              clearInterval(interval);
            }
          }, 33);
        }
      );
    }
  };

  // init videoMuxer、videoEncoder、audioEncoder
  const startRecorder = async (e) => {
    try {
      inRecordIng = true;
      inPauseIng = false;

      videoReadable = e.data.videoReadable;
      audioReadable = e.data.audioReadable || null;

      videoReader = videoReadable.getReader();
      audioReader = audioReadable ? audioReadable.getReader() : null;

      let videoConfig = e.data.videoConfig;
      let audioConfig = e.data.audioConfig;
      let mimeType = e.data.mimeType;

      console.log(videoConfig);
      console.log(audioConfig);
      // init write target
      let fileTarget = null;

      if (e.data.fileHandle) {
        browserFileWriteStream = await e.data.fileHandle.createWritable();
        fileTarget = getMP4FileTarget(browserFileWriteStream, "FileSystemWritableFileStream", mimeType);
      }
      if (e.data.filePath) {
        nodeFileDescriptor = await fs.openSync(e.data.filePath, "w+");
        fileTarget = getMP4FileTarget(nodeFileDescriptor, "FileDescriptor", mimeType);
      }
      if (e.data.fileDescriptor) {
        nodeFileDescriptor = e.data.fileDescriptor;
        fileTarget = getMP4FileTarget(nodeFileDescriptor, "FileDescriptor", mimeType);
      }

      // if (e.data.fileHandle) {
      //   browserFileWriteStream = await e.data.fileHandle.createWritable();
      //   fileTarget = new Mp4Muxer.StreamTarget(
      //     (data, position) => {
      //       browserFileWriteStream.write({
      //         type: "write",
      //         data: data,
      //         position: position,
      //       });
      //     },
      //     () => console.log("write finish")
      //   );
      // }
      // if (e.data.filePath || e.data.fileDescriptor) {
      //   if (e.data.filePath) {
      //     nodeFileDescriptor = await fs.openSync(e.data.filePath, "w+");
      //   }
      //   if (e.data.fileDescriptor) {
      //     nodeFileDescriptor = e.data.fileDescriptor;
      //   }
      //   fileTarget = new Mp4Muxer.StreamTarget(
      //     (data, position) => {
      //       count.generate++;
      //       fs.write(nodeFileDescriptor, data, 0, data.byteLength, position, (err, written, buffer) => {
      //         if (err) console.log(err);
      //         count.write++;
      //       });
      //     },
      //     () => {
      //       let interval = setInterval(() => {
      //         if (count.generate === count.write) {
      //           count.generate = 0;
      //           count.write = 0;
      //           fs.closeSync(nodeFileDescriptor);
      //           clearInterval(interval);
      //         }
      //       }, 33);
      //     }
      //   );
      // }

      if (mimeType === "mp4") {
        videoMuxer = new Mp4Muxer.Muxer({
          target: fileTarget,
          video: {
            codec: "avc",
            width: videoConfig.width,
            height: videoConfig.height,
          },
          audio: audioConfig
            ? {
                codec: "aac",
                sampleRate: audioConfig.sampleRate,
                numberOfChannels: 1,
              }
            : undefined,
          firstTimestampBehavior: "offset", // Because we're directly pumping a MediaStreamTrack's data into it
        });
      }

      if (mimeType === "webm") {
        videoMuxer = new WebMMuxer.Muxer({
          target: fileTarget,
          video: {
            codec: "V_VP8",
            width: videoConfig.width,
            height: videoConfig.height,
          },
          audio: audioConfig
            ? {
                codec: "A_OPUS",
                sampleRate: audioConfig.sampleRate,
                numberOfChannels: 1,
              }
            : undefined,
          type: "webm",
          firstTimestampBehavior: "offset", // Because we're directly pumping a MediaStreamTrack's data into it
        });
      }

      // init Video Encoder
      videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
          videoMuxer.addVideoChunk(chunk, meta);
        },
        error: (e) => console.error(e),
      });
      videoEncoder.configure(videoConfig);

      // init Audio Encoder
      if (audioReadable) {
        try {
          audioEncoder = new AudioEncoder({
            output: (chunk, meta) => {
              videoMuxer.addAudioChunk(chunk, meta);
            },
            error: (e) => console.error(e),
          });
          audioEncoder.configure(audioConfig);
        } catch (error) {
          console.log(error);
        }
      }

      encodeAudio();
      encodeVideo();
      RecordTimer.start();
    } catch (error) {
      console.log(error);
    }
  };

  self.onmessage = async (e) => {
    if (e.data.type === "startRecorder") {
      startRecorder(e);
    }
    if (e.data.type === "stopRecorder") {
      try {
        inRecordIng = false;

        await videoReader?.cancel();
        videoReader?.releaseLock();

        await audioReader?.cancel();
        audioReader?.releaseLock();

        await videoReadable?.cancel();
        await audioReadable?.cancel();

        await videoEncoder?.flush();
        await audioEncoder?.flush();

        console.log("1");

        videoMuxer.finalize();

        RecordTimer.stop();

        console.log("2");

        if (browserFileWriteStream) {
          await browserFileWriteStream.close(); // in browser
          self.postMessage({ type: "onStopRecorder" });
        }

        videoEncoder = null;
        audioEncoder = null;
        videoReader = null;
        audioReader = null;

        videoMuxer = null;

        frameGenerateCount = 0;
        audioGenerateCount = 0;

        // Promise.all([videoReadable?.closed, audioReadable?.closed])
        //   .then(async () => {
        //     inRecordIng = false;

        //     await videoReader?.cancel();
        //     videoReader?.releaseLock();

        //     await audioReader?.cancel();
        //     audioReader?.releaseLock();

        //     await videoReadable?.cancel();
        //     await audioReadable?.cancel();

        //     await videoEncoder?.flush();
        //     await audioEncoder?.flush();

        //     videoMuxer.finalize();

        //     if (browserFileWriteStream) {
        //       // await browserFileWriteStream.close(); // in browser
        //     }
        //     if (nodeFileDescriptor) {
        //       // nodeFileDescriptor = null; // in electron node
        //     }
        //     if (nodeFileWriteStream) {
        //       // let { buffer } = videoMuxer.target;
        //       // console.log(buffer);
        //       // nodeFileWriteStream.write(Buffer.from(buffer));
        //       // nodeFileWriteStream.close(); // in electron node
        //     }

        //     videoEncoder = null;
        //     audioEncoder = null;
        //     videoReader = null;
        //     audioReader = null;

        //     videoMuxer = null;

        //     browserFileWriteStream = null;

        //     frameGenerateCount = 0;
        //     audioGenerateCount = 0;

        //     RecordTimer.stop();
        //     self.postMessage({ type: "onStopRecorder" });
        //   })
        //   .catch((error) => {
        //     console.log(error);
        //   });
      } catch (error) {
        console.log(error);
        self.postMessage({ type: "onStopRecorder" });
      }
    }
    if (e.data.type === "pauseRecorder") {
      inPauseIng = true;
      RecordTimer.pause();
    }
    if (e.data.type === "resumeRecorder") {
      inPauseIng = false;
      RecordTimer.resume();
      encodeVideo();
      encodeAudio();
    }
  };
})();

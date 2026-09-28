(() => {
  "use strict";

  var isElectron = false;
  if (typeof module === "object") {
    isElectron = true;
  }

  // node env
  if (isElectron) {
    var fs = require("fs");
    var path = require("path");
    var process = require("process");
    var node_webmwriter = [
      path.join(process.cwd(), "node-webmwriter/WebmWriter.js"),
      path.join(process.cwd(), "resources/app", "node-webmwriter/WebmWriter.js"),
    ];
    for (let i = 0; i < node_webmwriter.length; i++) {
      try {
        self.WebMWriter = require(node_webmwriter[i]);
        console.log(node_webmwriter[i], "success!");
      } catch (error) {
        console.log(node_webmwriter[i], "fail!");
      }
    }
  } else {
    importScripts("/node-webmwriter/WebmWriter.js");
    self.WebMWriter = self.selfWebMWriter;
  }

  var mixReader = null;
  var mixEncoder = null;
  var frameCounter = 0;
  var encodePause = false;
  var FileWriter = null; // WebmWriter.js api

  var fileDescriptor = null; // in electron node use
  var fileWriteStream = null; // in browser use

  const initTimer = () => {
    let time = 0;
    let start = 0;
    let pause = 0;
    let temp = 0;
    let freq = null;
    const timeStart = () => {
      start = Date.now(); // 設定計時開始時間
      timeProcess();
    };
    const timeProcess = () => {
      time = Date.now() - start - pause;
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
      temp = Date.now();
      cancelAnimationFrame(freq);
    };
    const timeResume = () => {
      pause = pause + (Date.now() - temp);
      timeProcess();
    };
    const getTime = () => time;
    const setTime = (t) => {
      time = t;
    };
    return {
      timeStart,
      timeStop,
      timePause,
      timeResume,
      getTime,
      setTime,
    };
  };
  const videoTimer = initTimer();

  const startRecord = () => {
    let option = {
      timestamp: 0,
    };
    const process = async ({ done, value }) => {
      let frame = null;
      if (done) {
        await mixEncoder.flush();
        mixEncoder.close();
        return;
      }
      if (mixEncoder.encodeQueueSize <= 30) {
        if (++frameCounter % 20 == 0) {
          console.log(frameCounter + " frames processed");
        }
        if (frameCounter === 1) {
          option.timestamp = 0;
        } else if (frameCounter > 1) {
          option.timestamp = videoTimer.getTime() * 1000;
        }
        frame = new VideoFrame(value, option);
        const insert_keyframe = frameCounter % 30 == 0;
        mixEncoder.encode(frame, { keyFrame: insert_keyframe });
      } else {
        console.log("dropping frame, encoder falling behind");
      }
      value.close();
      frame.close();
      if (!encodePause) {
        mixReader.read().then(process);
      }
    };
    mixReader.read().then(process);
  };

  const encoderInit = {
    output: (chunk) => {
      FileWriter.addFrame(chunk);
    },
    error: (e) => {
      console.log(e.message);
    },
  };

  self.onmessage = async (e) => {
    if (e.data.type === "startRecorder") {
      try {
        const config = {
          codec: "vp8",
          width: e.data.video.width,
          height: e.data.video.height,
          bitrate: e.data.video.bitrate,
          framerate: e.data.video.framerate,
        };
        mixEncoder = new VideoEncoder(encoderInit);
        mixEncoder.configure(config);

        if (e.data.fileDescriptor) {
          fileDescriptor = e.data.fileDescriptor;
          FileWriter = new self.WebMWriter({
            codec: "VP8",
            width: e.data.video.width,
            height: e.data.video.height,
            fileWriter: fileDescriptor,
          });
        }

        if (e.data.fileHandle) {
          fileWriteStream = await e.data.fileHandle.createWritable();
          FileWriter = new self.WebMWriter({
            codec: "VP8",
            width: e.data.video.width,
            height: e.data.video.height,
            fileWriter: fileWriteStream,
          });
        }

        mixReader = e.data.videoReadable.getReader();
        encodePause = false;
        videoTimer.timeStart();
        startRecord();
      } catch (error) {
        console.log(error);
      }
    }
    if (e.data.type === "stopRecorder") {
      try {
        await mixReader.cancel();
        await FileWriter.complete();
        mixReader = null;
        FileWriter = null;
        if (fileDescriptor) {
          // in electron node
          fileDescriptor = null;
        }
        if (fileWriteStream) {
          // in browser
          await fileWriteStream.close();
          fileWriteStream = null;
        }
        frameCounter = 0;
        videoTimer.timeStop();
        self.postMessage({ type: "onStopRecorder" });
      } catch (error) {
        console.log(error);
      }
    }
    if (e.data.type === "pauseRecorder") {
      encodePause = true;
      videoTimer.timePause();
    }
    if (e.data.type === "resumeRecorder") {
      encodePause = false;
      videoTimer.timeResume();
      startRecord();
    }
  };
})();

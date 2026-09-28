import anime from "../lib/anime.es.js";

class TrackPattern {
  constructor(containerElement, frameElement, videoElement, canvasElement) {
    this.liveVideo = videoElement;
    this.liveContainer = containerElement;
    this.liveFrame = frameElement;
    this.liveCanvas = canvasElement;

    this.trackMode = "none";
    this.prevObjectOffset = { x: 0, y: 0 };

    this.trackSpeed = 500;
    this.zoomSpeed = 270;

    this.listener = new EventTarget();

    this.moveCoordRatio = {
      x: 0.5,
      y: 0.75,
    };

    this.state = "none";
    this.positionToClose = false;
  }

  setQRCodeToward(QRCodeToward) {
    const directionCoordRatio = {
      top: {
        x: 0.7,
        y: 0.9,
      },
      bottom: {
        x: 0.7,
        y: 0.1,
      },
      left: {
        x: 0.9,
        y: 0.5,
      },
      right: {
        x: 0.1,
        y: 0.5,
      },
      rightTop: {
        x: 0.3, // 0.2
        y: 0.9,
      },
      rightBottom: {
        x: 0.3, // 0.2
        y: 0.1,
      },
      leftBottom: {
        x: 0.7, // 0.8
        y: 0.1,
      },
      leftTop: {
        x: 0.7, // 0.8
        y: 0.9,
      },
    };

    this.moveCoordRatio = {
      x: directionCoordRatio[QRCodeToward].x,
      y: directionCoordRatio[QRCodeToward].y,
    };
  }

  setCenterRatio(centerRatio, pointInfo, sourceWidth, QRCodeToward) {
    if (QRCodeToward === "top" || QRCodeToward === "bottom") {
      centerRatio.x = pointInfo.exCenter.x / sourceWidth;
    }
    if (QRCodeToward === "leftTop" || QRCodeToward === "rightTop") {
      centerRatio.x = pointInfo.exCenter.x / sourceWidth;
    }
    if (QRCodeToward === "leftBottom" || QRCodeToward === "rightBottom") {
      centerRatio.x = pointInfo.exCenter.x / sourceWidth;
    }
  }

  setCalcSize(width, height) {
    this.calcWidth = width;
    this.calcHeight = height;
  }

  setPositionToClose(positionToClose) {
    this.positionToClose = positionToClose;
  }

  /**
   * @param {number} zoom
   * @returns {object} container width and height , video zoom width and height
   */
  getWidthAndHeight(zoom) {
    let { width: containerW, height: containerH } = this.liveContainer.getBoundingClientRect();
    let videoW = this.liveFrame.getBoundingClientRect().width * zoom;
    let videoH = this.liveFrame.getBoundingClientRect().height * zoom;
    return { containerW, containerH, videoW, videoH };
  }

  updateLiveVideo(left, top, scale) {
    // this.liveVideo.style.left = `${left}px`;
    // this.liveVideo.style.top = `${top}px`;
    // this.liveVideo.dataset.scale = scale;
  }

  updateLiveCanvas(left, top, scale) {
    // this.liveCanvas.style.left = `${left}px`;
    // this.liveCanvas.style.top = `${top}px`;
    // this.liveCanvas.dataset.scale = scale;
  }

  /**
   * @param {number} left liveVideo left
   * @param {number} top liveVideo top
   * @param {number} zoom  liveVideo zoom
   * @returns {object}  object.left , object.top
   */
  constrainMoveEdge(left, top, zoom) {
    let { containerW, containerH, videoW, videoH } = this.getWidthAndHeight(zoom);
    let maxW = Math.floor((videoW - containerW) / 2);
    let maxH = Math.floor((videoH - containerH) / 2);
    if (maxW > 0) {
      if (left >= maxW) {
        left = maxW;
      }
      if (left <= -maxW) {
        left = -maxW;
      }
    } else {
      left = 0;
    }
    if (maxH > 0) {
      if (top >= maxH) {
        top = maxH;
      }
      if (top <= -maxH) {
        top = -maxH;
      }
    } else {
      top = 0;
    }
    return { left: left, top: top };
  }

  calcTrackObjectOffset(calcCenter, zoom) {
    // 起點座標(物件所在座標)
    const obejctCoord = {
      x: calcCenter.x,
      y: calcCenter.y,
    };
    // 起點座標比例
    const obejctCoordRatio = {
      xRatio: obejctCoord.x / this.calcWidth,
      yRatio: obejctCoord.y / this.calcHeight,
    };
    const moveCoordRatio = {
      xRatio: this.moveCoordRatio.x,
      yRatio: this.moveCoordRatio.y,
    };

    // 終點座標(物件要移動到的座標) => 用不到
    // const moveCoord = {
    //   x: this.calcWidth * moveCoordRatio.xRatio,
    //   y: this.calcHeight * moveCoordRatio.yRatio,
    // };
    // 起點(辨識物件座標)移動到到終點的位移值(位於原始圖像中的數值) => 用不到
    // const srcObejctOffset = {
    //   x: parseFloat(((obejctCoord.x - moveCoord.x) * -1).toFixed(3)),
    //   y: parseFloat(((obejctCoord.y - moveCoord.y) * -1).toFixed(3)),
    // };

    // let { width: containerW, height: containerH } = this.container.getBoundingClientRect();
    // let displayW = containerW * zoom;
    // let displayH = containerH * zoom;
    let {
      containerW: containerW,
      containerH: containerH,
      videoW: displayW,
      videoH: displayH,
    } = this.getWidthAndHeight(zoom);

    let spaceW = (displayW - containerW) / 2;
    let spaceH = (displayH - containerH) / 2;
    // 計算皆已css上顯示的內容當作基準
    // css原圖約束框的大小 * css原圖約束框"終點座標位置比" -
    // css原圖縮放後的大小 * css原圖縮放"起點座標位置比" +
    // css圖片縮放後寬高差
    let dstObjectOffset = {
      x: containerW * moveCoordRatio.xRatio - displayW * obejctCoordRatio.xRatio + spaceW,
      y: containerH * moveCoordRatio.yRatio - displayH * obejctCoordRatio.yRatio + spaceH,
    };
    return dstObjectOffset;
  }

  calcTrackOffsetValue(obejctCenterRatio, obecjtBoundRatio, objectZoom) {
    const calcWidth = this.calcWidth;
    const calcHeight = this.calcHeight;
    const calcbound = [
      obecjtBoundRatio[0] * calcWidth, // x1
      obecjtBoundRatio[1] * calcHeight, // y1
      obecjtBoundRatio[2] * calcWidth, // x2
      obecjtBoundRatio[3] * calcHeight, // y2
    ];
    const calcCenter = {
      x: obejctCenterRatio.x * calcWidth,
      y: obejctCenterRatio.y * calcHeight,
    };
    const calcZoom = objectZoom;

    const objectPeri = (calcbound[2] - calcbound[0] + calcbound[3] - calcbound[1]) / (calcWidth + calcHeight);
    const objectOffset = this.calcTrackObjectOffset(calcCenter, calcZoom);

    // 判斷是否超出範圍，重設移動數值
    const { left, top } = this.constrainMoveEdge(objectOffset.x, objectOffset.y, calcZoom);
    objectOffset.x = left;
    objectOffset.y = top;

    // 上一個 bound 和這個 bound 之間的偏移差距
    const objectGap = {
      x: Math.round(Math.abs(objectOffset.x - parseFloat(this.liveVideo.dataset.left))),
      y: Math.round(Math.abs(objectOffset.y - parseFloat(this.liveVideo.dataset.top))),
      zoom: Math.round(Math.abs(objectZoom - parseFloat(this.liveVideo.dataset.scale))),
    };

    if (!this.positionToClose) {
      return {
        x: objectOffset.x,
        y: objectOffset.y,
      };
    }

    // 偏移量太小不處理 || 面積占比太大不處理
    if ((objectGap.x < 10 && objectGap.y < 10) || objectPeri > 0.65) {
      return null;
    }

    return {
      x: objectOffset.x,
      y: objectOffset.y,
    };
  }
  /**
   * 同步追蹤
   * @param {number} targetX 
   * @param {number} targetY 
   * @param {number} targetScale 
   * @returns 
   */
  offsetFrameSync(targetX, targetY, targetScale) {
    return new Promise((resolve) => {
      let position = {
        x: parseFloat(this.liveVideo.dataset.left),
        y: parseFloat(this.liveVideo.dataset.top),
        scale: parseFloat(this.liveVideo.dataset.scale),
      };
      
      if (position.x == targetX && position.y == targetY && position.scale == targetScale) {
        this.dispatchTrackUpdate(position);
        resolve();
      }

      anime({
        targets: position,
        x: targetX,
        y: targetY,
        scale: targetScale,
        duration: this.trackSpeed,
        easing: "linear",
        update: () => {
          position.x = Math.round(position.x);
          position.y = Math.round(position.y);
          position.scale = parseFloat(position.scale.toFixed(4));
          this.dispatchTrackUpdate(position);
        },
        complete: () => {
          position.x = Math.round(position.x);
          position.y = Math.round(position.y);
          position.scale = parseFloat(position.scale.toFixed(4));
          this.dispatchTrackComplete(position);
          resolve();
        },
      });
    });
  }
  // 沒用
  zoomSync(targetScale) {
    this.trackMode = "zoom";
    let position = {
      x: parseFloat(this.liveVideo.dataset.left) || 0,
      y: parseFloat(this.liveVideo.dataset.top) || 0,
      scale: parseFloat(this.liveVideo.dataset.scale) || 1,
    };

    let targetX = position.x;
    let targetY = position.y;

    ({ left: targetX, top: targetY } = this.constrainMoveEdge(targetX, targetY, targetScale));

    let animation = anime({
      targets: position,
      x: targetX,
      y: targetY,
      scale: targetScale,
      duration: this.zoomSpeed,
      easing: "linear",
      update: () => {
        position.x = Math.round(position.x);
        position.y = Math.round(position.y);
        this.dispatchTrackUpdate(position);
      },
    });
    return animation.finished;
  }
  /**
   * @param {number} objectCenterRatio QRCode 座標資料
   * @param {number} objectBoundRatio QRCode 座標資料
   * @param {number} objectZoom 目標縮放大小
   * @returns {Promise<void>}
   */
  trackSync(objectCenterRatio, objectBoundRatio, objectZoom) {
    this.trackMode = "track";
    const trackSyncPromise = new Promise(async (reslove) => {
      const offset = this.calcTrackOffsetValue(objectCenterRatio, objectBoundRatio, objectZoom);
      if (offset) {
        await this.offsetFrameSync(offset.x, offset.y, objectZoom);
      }
      reslove();
    });
    return trackSyncPromise;
  }
  /**
   * 同步重置
   * @param {number} targetX 
   * @param {number} targetY 
   * @param {number} targetScale 
   * @returns 
   */
  resetSync(targetX, targetY, targetScale) {
    const resetSyncPromise = new Promise(async (reslove) => {
      await this.offsetFrameSync(targetX, targetY, targetScale);
      reslove();
    });
    return resetSyncPromise;
  }
  /**
   * 追蹤時通知
   * @param {*} position 
   */
  dispatchTrackUpdate(position) {
    this.listener.dispatchEvent(
      new CustomEvent("trackUpdate", {
        detail: {
          position: position,
        },
      })
    );
  }
  /**
   * 追蹤完畢時通知
   */
  dispatchTrackComplete(position) {
    this.listener.dispatchEvent(
      new CustomEvent("trackComplete", {
        detail: {
          position: position,
        },
      })
    );
  }
  /**
   * callback 取追蹤移動的座標
   * @param {Function} callback 
   */
  trackUpdate(callback) {
    this.listener.addEventListener("trackUpdate", (result) => {
      callback(result.detail.position);
    });
  }
  /**
   * 追蹤完畢時
   * @param {Function} callback 
   */
  trackComplete(callback) {
    this.listener.addEventListener("trackComplete", (result) => {
      callback(result.detail.position);
    });
  }
  /**
   * 設定追蹤速度
   * @param {} speed 
   */
  setTrackSpeed(speed) {
    this.trackSpeed = speed;
  }
  /**
   * 重置座標，重新追蹤
   */
  reset() {
    this.trackMode = "none";
    this.prevObjectOffset = { x: 0, y: 0 };
  }
}

export default TrackPattern;

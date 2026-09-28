(async () => {
  "use strict";

  var isElectron = false;
  if (typeof module === "object") {
    isElectron = true;
  }

  var ZxingCpp = {
    BarCodes: null,
  };

  var ZxingWasm = null;
  importScripts("zxing_reader.js");
  ZXing()
    .then((zxing) => {
      ZxingWasm = zxing;
    })
    .catch((error) => {
      console.log(error);
    });

  if (isElectron) {
    var path = require("path");
    var process = require("process");
    var node_zxingcpp = [
      path.join(process.cwd(), "node-zxingcpp/ReadBarCodes.js"),
      path.join(process.cwd(), "resources/app", "node-zxingcpp/ReadBarCodes.js"),
      path.join(process.resourcesPath, "node-zxingcpp/ReadBarCodes.js"),
      path.join(process.resourcesPath, "app", "node-zxingcpp/ReadBarCodes.js"),
    ];
    for (let i = 0; i < node_zxingcpp.length; i++) {
      try {
        ZxingCpp.BarCodes = require(node_zxingcpp[i]);
        console.log(node_zxingcpp[i], "success!");
        break;
      } catch (error) {
        console.log(node_zxingcpp[i], "fail!");
      }
    }
  }

  const ctxOption = {
    willReadFrequently: true,
    desynchronized: true,
    alpha: false,
  };

  const scanCanvas = new OffscreenCanvas(100, 100);
  const scanCtx = scanCanvas.getContext("2d", ctxOption);
  const tempCanvas = new OffscreenCanvas(100, 100);
  const tempCtx = tempCanvas.getContext("2d", ctxOption);
  const filterRules = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "OKIOLABS FN 0",
    "OKIOLABS FN 1",
    "OKIOLABS FN 2",
    "OKIOLABS FN 3",
    "OKIOLABS FN 4",
    "OKIOLABS FN 5",
    "OKIOLABS FN 6",
  ];

  class CoordCommonFn {
    static getMirrorPosition(originPosition, imageWidth) {
      return originPosition.map((point) => {
        return {
          x: imageWidth - point.x,
          y: point.y,
        };
      });
    }
    static getRotatePosition(originPosition, imageRotate, imageWidth, imageHeight) {
      return originPosition.map((point) => {
        if (imageRotate === 90) {
          return {
            x: imageHeight - point.y,
            y: point.x,
          };
        }
        if (imageRotate === 180) {
          return {
            x: imageWidth - point.x,
            y: imageHeight - point.y,
          };
        }
        if (imageRotate === 270) {
          return {
            x: point.y,
            y: imageWidth - point.x,
          };
        }
        return {
          x: point.x,
          y: point.y,
        };
      });
    }
    static arrPosition2ObjLocation(position) {
      return {
        topLeftCorner: position[0],
        topRightCorner: position[1],
        bottomRightCorner: position[2],
        bottomLeftCorner: position[3],
      };
    }
    static objPosition2ObjLocation(position) {
      return {
        topLeftCorner: position.topLeft,
        topRightCorner: position.topRight,
        bottomRightCorner: position.bottomRight,
        bottomLeftCorner: position.bottomLeft,
      };
    }
    static orientation2Degree(orientation) {
      let degree = 0;
      if (orientation >= 0) {
        degree = orientation + 90;
      } else {
        if (orientation >= -90) {
          degree = 90 - Math.abs(orientation);
        }
        if (orientation >= -180 && orientation < -90) {
          degree = 270 + (180 - Math.abs(orientation));
        }
      }
      return degree;
    }
  }

  class InlineWasmZxing {
    static positionToArray(WasmZxingResultPosition) {
      return [
        {
          x: WasmZxingResultPosition.topLeft.x,
          y: WasmZxingResultPosition.topLeft.y,
        },
        {
          x: WasmZxingResultPosition.topRight.x,
          y: WasmZxingResultPosition.topRight.y,
        },
        {
          x: WasmZxingResultPosition.bottomRight.x,
          y: WasmZxingResultPosition.bottomRight.y,
        },
        {
          x: WasmZxingResultPosition.bottomLeft.x,
          y: WasmZxingResultPosition.bottomLeft.y,
        },
      ];
    }
    static decode(imageData) {
      const sourceBuffer = imageData.data;
      const buffer = ZxingWasm._malloc(sourceBuffer.byteLength);
      ZxingWasm.HEAPU8.set(sourceBuffer, buffer);
      const decodeValue = ZxingWasm.readBarcodeFromPixmap(buffer, imageData.width, imageData.height, false, "QR_CODE");
      ZxingWasm._free(buffer);
      console.log(decodeValue);
      if (decodeValue.results.length) {
        decodeValue.results = decodeValue.results.filter((QRcode) => {
          let positionArr = InlineWasmZxing.positionToArray(QRcode.position);
          QRcode["position"] = positionArr;
          if (resultList.indexOf(QRcode["text"]) > -1) return QRcode;
        });
        if (decodeValue.results.length >= 1) {
          return decodeValue.results[0];
        }
        if (decodeValue.results.length === 0) {
          return null;
        }
      } else {
        return null;
      }
    }
    static read(imageData, transferInfo = { rotate: 0, mirror: false }) {
      let WasmZxingResult = InlineWasmZxing.decode(imageData);
      if (!WasmZxingResult) return null;
      if (WasmZxingResult) {
        let { rotate: videoAngle, mirror: videoMirror } = transferInfo;
        let sourceSize = { width: imageData.width, height: imageData.height };
        let rotateSize = { width: imageData.width, height: imageData.height };

        // 計算畫面旋轉或是水平翻轉後，計算 qrcode 的真實顯示的旋轉角度，範圍在 0deg~180deg or 0deg~-180deg
        let qrcodeOrientation = WasmZxingResult.orientation;
        // 計算畫面旋轉或是水平翻轉後，計算 qrcode 的座標
        // 先計算水平翻轉後的角度、座標，再計算旋轉後的角度、座標
        let qrcodePosition = [...WasmZxingResult.position];
        // 水平翻轉處理角度、座標
        if (videoMirror) {
          // 水平翻轉後後角度轉換
          qrcodeOrientation *= -1;
          // 水平翻轉後後座標轉換
          qrcodePosition = CoordCommonFn.getMirrorPosition(qrcodePosition, imageData.width);
        }
        // 旋轉時處理角度、座標
        if (videoAngle !== 0) {
          qrcodeOrientation = qrcodeOrientation + videoAngle;
          // 旋轉後角度轉換
          if (qrcodeOrientation > 180) {
            qrcodeOrientation -= 360;
          } else if (qrcodeOrientation < -180) {
            qrcodeOrientation += 360;
          }
          // 旋轉後座標轉換
          qrcodePosition = CoordCommonFn.getRotatePosition(
            qrcodePosition,
            videoAngle,
            imageData.width,
            imageData.height
          );
        }
        // 旋轉時處理尺寸
        if (videoAngle === 90 || videoAngle === 270) {
          // 尺寸轉換
          rotateSize.width = sourceSize.height;
          rotateSize.height = sourceSize.width;
        }
        return {
          label: WasmZxingResult.text,
          mirrored: WasmZxingResult.mirrored,
          source: {
            position: WasmZxingResult.position,
            rotation: WasmZxingResult.orientation,
            location: CoordCommonFn.arrPosition2ObjLocation(WasmZxingResult.position),
            degree: CoordCommonFn.orientation2Degree(WasmZxingResult.orientation),
            size: sourceSize,
          },
          convert: {
            position: qrcodePosition,
            rotation: qrcodeOrientation,
            location: CoordCommonFn.arrPosition2ObjLocation(qrcodePosition),
            degree: CoordCommonFn.orientation2Degree(qrcodeOrientation),
            size: rotateSize,
          },
        };
      }
    }
  }

  class InlineCppZXing {
    static decode(imageDataInfo) {
      let decodeResults = ZxingCpp.BarCodes.Read(imageDataInfo);
      if (decodeResults) {
        // 過濾結果不符合預期內容的 QRCode
        decodeResults = decodeResults.filter((QRcode) => {
          let checkResult = resultList.indexOf(QRcode["text"]);
          if (checkResult > -1) return QRcode;
        });
        // 處理 Mirror 過後的座標位置
        decodeResults = decodeResults.map((QRCode) => {
          if (QRCode.mirrored) {
            let tempPosition = JSON.parse(JSON.stringify(QRCode["position"]));
            QRCode["mirrorPosition"] = [];
            QRCode["mirrorPosition"][0] = tempPosition[3];
            QRCode["mirrorPosition"][1] = tempPosition[0];
            QRCode["mirrorPosition"][2] = tempPosition[1];
            QRCode["mirrorPosition"][3] = tempPosition[2];
          }
          if (QRCode.mirrored) {
            if (QRCode["orientation"] >= 0 && QRCode["orientation"] <= 180) {
              QRCode["mirrorOrientation"] = QRCode["orientation"] - 90;
            }
            if (QRCode["orientation"] < 0 && QRCode["orientation"] >= -90) {
              QRCode["mirrorOrientation"] = QRCode["orientation"] - 90;
            }
            if (QRCode["orientation"] < -90 && QRCode["orientation"] >= -180) {
              QRCode["mirrorOrientation"] = QRCode["orientation"] + 270;
            }
          }
          return QRCode;
        });
        // 結果超過一個 QRCode 則只取一個
        if (decodeResults.length >= 1) {
          return decodeResults[0];
        }
        if (decodeResults.length === 0) {
          return null;
        }
      }
      // 沒有結果
      return null;
    }
    static read(imageData, transferInfo = { rotate: 0, mirror: false }) {
      let imageDataInfo = {
        data: imageData.data,
        width: imageData.width,
        height: imageData.height,
        hints: ["QRCode"],
      };
      let CppZXingResult = InlineCppZXing.decode(imageDataInfo);
      if (!CppZXingResult) return null;

      if (CppZXingResult) {
        let { rotate: videoAngle, mirror: videoMirror } = transferInfo;
        let sourceSize = { width: imageData.width, height: imageData.height };
        let rotateSize = { width: imageData.width, height: imageData.height };

        // 計算畫面旋轉或是水平翻轉後，計算 qrcode 的真實顯示的旋轉角度，範圍在 0deg~180deg or 0deg~-180deg
        let qrcodeOrientation = CppZXingResult.orientation;
        // 計算畫面旋轉或是水平翻轉後，計算 qrcode 的座標
        // 先計算水平翻轉後的角度、座標，再計算旋轉後的角度、座標
        let qrcodePosition = [...CppZXingResult.position];
        // 水平翻轉處理角度、座標
        if (videoMirror) {
          // 水平翻轉後後角度轉換
          qrcodeOrientation *= -1;
          // 水平翻轉後後座標轉換
          qrcodePosition = CoordCommonFn.getMirrorPosition(qrcodePosition, imageData.width);
        }
        // 旋轉時處理角度、座標
        if (videoAngle !== 0) {
          qrcodeOrientation = qrcodeOrientation + videoAngle;
          // 旋轉後角度轉換
          if (qrcodeOrientation > 180) {
            qrcodeOrientation -= 360;
          } else if (qrcodeOrientation < -180) {
            qrcodeOrientation += 360;
          }
          // 旋轉後座標轉換
          qrcodePosition = CoordCommonFn.getRotatePosition(
            qrcodePosition,
            videoAngle,
            imageData.width,
            imageData.height
          );
        }
        // 旋轉時處理尺寸
        if (videoAngle === 90 || videoAngle === 270) {
          // 尺寸轉換
          rotateSize.width = sourceSize.height;
          rotateSize.height = sourceSize.width;
        }
        return {
          label: CppZXingResult.text,
          mirrored: CppZXingResult.mirrored,
          source: {
            position: CppZXingResult.position,
            rotation: CppZXingResult.orientation,
            location: CoordCommonFn.arrPosition2ObjLocation(CppZXingResult.position),
            degree: CoordCommonFn.orientation2Degree(CppZXingResult.orientation),
            size: sourceSize,
          },
          convert: {
            position: qrcodePosition,
            rotation: qrcodeOrientation,
            location: CoordCommonFn.arrPosition2ObjLocation(qrcodePosition),
            degree: CoordCommonFn.orientation2Degree(qrcodeOrientation),
            size: rotateSize,
          },
        };
      }
    }
    // 當畫面水平翻轉、旋轉90、180、270度時 重新計算 qrocde 座標以及 qrcode 的旋轉角度
    static convertQRcodeInfo(position, orientation, transferInfo) {
      let { rotate: videoAngle, mirror: videoMirror } = transferInfo;
      // 計算畫面旋轉或是水平翻轉後，計算 qrcode 的真實顯示的旋轉角度，範圍在 0deg~180deg or 0deg~-180deg
      let qrcodeOrientation = orientation;
      // 計算畫面旋轉或是水平翻轉後，計算 qrcode 的座標
      let qrcodePosition = [...position];
      if (videoMirror) {
        qrcodeOrientation *= -1;
        qrcodePosition = qrcodePosition.map((point) => {
          return {
            x: imageData.width - point.x,
            y: point.y,
          };
        });
      }
      if (videoAngle !== 0) {
        qrcodeOrientation += videoAngle;
        if (qrcodeOrientation > 180) {
          qrcodeOrientation -= 360;
        } else if (qrcodeOrientation < -180) {
          qrcodeOrientation += 360;
        }
        qrcodePosition = qrcodePosition.map((coord) => {
          if (videoAngle === 90) {
            return {
              x: imageData.height - coord.y,
              y: coord.x,
            };
          }
          if (videoAngle === 180) {
            return {
              x: imageData.width - coord.y,
              y: imageData.height - coord.y,
            };
          }
          if (videoAngle === 270) {
            return {
              x: coord.y,
              y: imageData.width - coord.x,
            };
          }
        });
      }
      return {
        convertOrientation: qrcodeOrientation,
        convertPosition: qrcodePosition,
      };
    }
  }

  function decodeWasmZXing(imageData) {
    let sourceBuffer = imageData.data;
    let buffer = ZxingWasm._malloc(sourceBuffer.byteLength);
    ZxingWasm.HEAPU8.set(sourceBuffer, buffer);
    let decodeResults = ZxingWasm.readBarcodeFromPixmap(buffer, imageData.width, imageData.height, true, "[QR_CODE]");
    ZxingWasm._free(buffer);
    if (decodeResults.results.length) {
      return decodeResults.results.map((result) => {
        let originPosition = { ...result.position };
        result.position = [...result.location];
        result.location = CoordCommonFn.objPosition2ObjLocation(originPosition);
        return result;
      });
    }
    return null;
  }

  function decodeCppZXing(imageData) {
    let decodeResults = ZxingCpp.BarCodes.Read(
      imageData.data.buffer,
      imageData.width,
      imageData.height,
      true,
      "[QRCode]"
    );
    // [QRCode,PDF417] => custom barcode 、 [] => all barcode
    if (decodeResults.results.length) {
      return decodeResults.results.map((result) => {
        let originPosition = { ...result.position };
        result.position = [...result.location];
        result.location = CoordCommonFn.objPosition2ObjLocation(originPosition);
        return result;
      });
    }
    return null;
  }

  function filterDecodeResults(decodeResults) {
    if (!decodeResults || decodeResults.length === 0) {
      return null;
    }
    const filteredResults = decodeResults.filter((result) => {
      if (filterRules.indexOf(result["label"]) > -1) return result;
    });
    if (filteredResults.length === 0) {
      return null;
    }
    if (filteredResults.length >= 1) {
      return filteredResults[0];
    }
  }

  function formatDecodeResults(decodeResults, imageData, transferInfo = { rotate: 0, mirror: false }) {
    if (!decodeResults || decodeResults.length === 0) {
      return null;
    }

    let { rotate: videoAngle, mirror: videoMirror } = transferInfo;
    let sourceSize = { width: imageData.width, height: imageData.height };
    let convertSize = { width: imageData.width, height: imageData.height };

    return decodeResults.map((result) => {
      // 計算畫面旋轉或是水平翻轉後，計算 qrcode 的真實顯示的旋轉角度，範圍在 0deg~180deg or 0deg~-180deg
      let orientation = result.orientation;
      // 計算畫面旋轉或是水平翻轉後，計算 qrcode 的座標
      // 先計算水平翻轉後的角度、座標，再計算旋轉後的角度、座標
      let position = [...result.position];
      if (videoMirror) {
        // 水平翻轉後後角度轉換
        orientation *= -1;
        // 水平翻轉後後座標轉換
        position = CoordCommonFn.getMirrorPosition(position, imageData.width);
      }
      // 旋轉時處理角度、座標
      if (videoAngle !== 0) {
        orientation = orientation + videoAngle;
        // 旋轉後角度轉換
        if (orientation > 180) {
          orientation -= 360;
        } else if (orientation < -180) {
          orientation += 360;
        }
        // 旋轉後座標轉換
        position = CoordCommonFn.getRotatePosition(position, videoAngle, imageData.width, imageData.height);
      }
      // 旋轉時處理尺寸
      if (videoAngle === 90 || videoAngle === 270) {
        // 尺寸轉換
        convertSize.width = sourceSize.height;
        convertSize.height = sourceSize.width;
      }
      return {
        label: result.text,
        mirrored: result.isMirrored,
        source: {
          position: result.position,
          rotation: result.orientation,
          location: CoordCommonFn.arrPosition2ObjLocation(result.position),
          degree: CoordCommonFn.orientation2Degree(result.orientation),
          size: sourceSize,
        },
        convert: {
          position: position,
          rotation: orientation,
          location: CoordCommonFn.arrPosition2ObjLocation(position),
          degree: CoordCommonFn.orientation2Degree(orientation),
          size: convertSize,
        },
      };
    });
  }

  /**
   * @param {Object} body
   * @param {ImageData | ImageBitmap} imageData
   * @returns {ImageData}
   */
  function getImageData(body, imageData) {
    let scale = body.scaleRatio;
    let area = {
      sx: 0,
      sy: 0,
      sw: imageData.width,
      sh: imageData.height,
      dx: 0,
      dy: 0,
      dw: imageData.width * 1,
      dh: imageData.height * 1,
    };
    scanCanvas.width = area.dw;
    scanCanvas.height = area.dh;
    tempCanvas.width = area.dw;
    tempCanvas.height = area.dh;
    tempCtx.drawImage(imageData, area.sx, area.sy, area.sw, area.sh, area.dx, area.dy, area.dw, area.dh);

    // tempCtx.save();
    // if (mirror) {
    //   // 0度或是180度時 左右水平翻轉
    //   if (rotate === 0 || rotate === 180) {
    //     tempCtx.setTransform(
    //       -1,
    //       0, // set the direction of x axis
    //       0,
    //       1, // set the direction of y axis
    //       tempCanvas.width, // set the x origin
    //       0 // set the y origin
    //     );
    //   }
    //   // 90度或是270度時 上下垂直翻轉
    //   if (rotate === 90 || rotate === 270) {
    //     // 垂直翻轉
    //     tempCtx.setTransform(
    //       1,
    //       0, // set the direction of x axis
    //       0,
    //       -1, // set the direction of y axis
    //       0, // set the x origin
    //       tempCanvas.height // set the y origin
    //     );
    //   }
    // }
    // tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    // tempCtx.rotate((rotate * Math.PI) / 180);
    // tempCtx.drawImage(
    //   imageData,
    //   (-1 * imageData.width * scale) / 2,
    //   (-1 * imageData.height * scale) / 2,
    //   imageData.width * scale,
    //   imageData.height * scale
    // );
    // tempCtx.restore();

    return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  }

  function getArrayBuffer(imageData) {
    let area = {
      sx: 0,
      sy: 0,
      sw: imageData.width,
      sh: imageData.height,
      dx: 0,
      dy: 0,
      dw: imageData.width,
      dh: imageData.height,
    };
    if (tempCanvas.width !== area.dw) {
      tempCanvas.width = area.dw;
    }
    if (tempCanvas.height !== area.dh) {
      tempCanvas.height = area.dh;
    }
    return tempCtx.drawImage(imageData, area.sx, area.sy, area.sw, area.sh, area.dx, area.dy, area.dw, area.dh).buffer;
  }

  function formatImageData(body) {
    if (body.imageData instanceof ArrayBuffer) {
      let { width, height, colorSpace } = body.scanInfo;
      let uint8ClampedImage = new Uint8ClampedArray(body.imageData);
      let imageData = new ImageData(uint8ClampedImage, width, height, {
        colorSpace: colorSpace,
      });
      return imageData;
    }
    if (body.imageData instanceof ImageData) {
      return body.imageData;
    }
    if (body.imageData instanceof ImageBitmap) {
      return body.imageData;
    }
  }

  function handlePositionLocation(data, ratio) {
    const fixPosition = (originPosition) => {
      let position = [];
      for (let i = 0; i < originPosition.length; i++) {
        let point = {
          x: originPosition[i].x / ratio,
          y: originPosition[i].y / ratio,
        };
        position.push(point);
      }
      return position;
    };

    const fixLocation = (originLocation) => {
      let location = {
        bottomLeftCorner: { x: 0, y: 0 },
        bottomRightCorner: { x: 0, y: 0 },
        topLeftCorner: { x: 0, y: 0 },
        topRightCorner: { x: 0, y: 0 },
      };
      for (const key in originLocation) {
        if (originLocation.hasOwnProperty.call(originLocation, key)) {
          location[key]["x"] = originLocation[key]["x"] / ratio;
          location[key]["y"] = originLocation[key]["y"] / ratio;
        }
      }
      return location;
    };

    let position = fixPosition(data.position);
    let location = fixLocation(data.location);

    let minXCoord = Math.min(...position.map((point) => point.x));
    let minYCoord = Math.min(...position.map((point) => point.y));
    let maxXCoord = Math.max(...position.map((point) => point.x));
    let maxYCoord = Math.max(...position.map((point) => point.y));

    let minXRatio = minXCoord / (data.size.width / ratio);
    let minYRatio = minYCoord / (data.size.height / ratio);
    let maxXRatio = maxXCoord / (data.size.width / ratio);
    let maxYRatio = maxYCoord / (data.size.height / ratio);

    let bound = {
      coord: [minXCoord, minYCoord, maxXCoord, maxYCoord],
      ratio: [minXRatio, minYRatio, maxXRatio, maxYRatio],
    };

    let center = {
      coord: {
        x: (maxXCoord - minXCoord) / 2 + minXCoord,
        y: (maxYCoord - minYCoord) / 2 + minYCoord,
      },
      ratio: {
        x: (maxXRatio - minXRatio) / 2 + minXRatio,
        y: (maxYRatio - minYRatio) / 2 + minYRatio,
      },
    };

    return { center: center, bound: bound, position: position, location: location };
  }
   
  /**
   * @returns {Result}
   */
  function detectionProcess(body) {
    let responseData = {
      type: "result",
      data: {},
      success: false, // decode success or fail
      isSlowModel: false,
    };
    let transferInfo = body.transferInfo;

    // 轉換圖片資料格式
    let formatImage = formatImageData(body);

    let transformImage = getImageData(body, formatImage);

    // postMessage({ type: "preview", data: transformImage });

    // qrCode解碼識別
    let decodeResults = null;

    if (isElectron) {
      // console.time("cpp decode");
      decodeResults = decodeCppZXing(transformImage);
      // console.timeEnd("cpp decode");
    }
    if (!isElectron) {
      // console.time("wasm decode");
      decodeResults = decodeWasmZXing(transformImage);
      // console.timeEnd("wasm decode");
    }

    // result = InlineWasmZxing.read(transformImage, transferInfo);
    // result = InlineCppZXing.read(transformImage, transferInfo);

    let formattedResults = formatDecodeResults(decodeResults, transformImage, transferInfo);

    let result = filterDecodeResults(formattedResults);

    // qrCode解碼成功
    if (result) {
      // 處理qrCode解碼後的結果
      let newSourceData = handlePositionLocation(result.source, body.scaleRatio);
      let newConvertData = handlePositionLocation(result.convert, body.scaleRatio);
      result.source.location = newSourceData.location;
      result.source.position = newSourceData.position;
      result.source.bound = newSourceData.bound;
      result.source.center = newSourceData.center;
      result.convert.location = newConvertData.location;
      result.convert.position = newConvertData.position;
      result.convert.bound = newConvertData.bound;
      result.convert.center = newConvertData.center;
      responseData.success = true;
      responseData.data = result;
    }

    return responseData;
  }

  function setFrequency() {
    let processTimeOut = null;
    let processFreq = 0;
    let repeateCounter = 0;
    let isRepeateScan = false;
    let isSlowModel = false;

    let failTimeOut = 1500; // 辨識失敗後 間隔多久啟動慢速掃描
    let slowScanTimeOut = 1000; // 啟動慢速掃描後 間隔多久快速掃描
    let repeateCounterMax = 3; // 快速掃描多少次

    return (success) => {
      if (success) {
        clearTimeout(processTimeOut);
        processTimeOut = null;
        processFreq = 0;
        repeateCounter = 0;
        isRepeateScan = false;
        isSlowModel = false;
      }
      if (!success) {
        // 如果辨識失敗則設定一計時器在 1.5 秒後切換慢速模式
        // 在慢速模式下更改下一次的掃描間隔為 1 秒
        if (!processTimeOut) {
          processTimeOut = setTimeout(() => {
            clearTimeout(processTimeOut);
            processFreq = slowScanTimeOut;
            isSlowModel = true;
          }, failTimeOut);
        }
        //  經過間隔 0 秒掃描 3 次後，之後間隔 1 秒的掃描 1 次
        if (isRepeateScan) {
          if (repeateCounter < repeateCounterMax) {
            repeateCounter += 1;
            processFreq = 0;
          } else {
            repeateCounter = 0;
            processFreq = slowScanTimeOut;
          }
        }
        // 經過間隔 2 秒的掃描 1 次後，之後間隔 0 秒快速掃描 4 次
        if (processFreq === slowScanTimeOut) {
          isRepeateScan = true;
        }
      }
      return { processFreq, isSlowModel };
    };
  }

  const getFrequency = setFrequency();

  onmessage = (event) => {
    let body = event.data;

    if (body.type === "init") {
      if (isElectron) {
        postMessage({ type: "ready" });
      } else {
        if (!ZxingWasm) {
          let wait = setInterval(() => {
            if (ZxingWasm) {
              postMessage({ type: "ready" });
              clearInterval(wait);
            }
          }, 10);
        } else {
          postMessage({ type: "ready" });
        }
      }
    }

    if (body.type === "data") {
      let response = detectionProcess(body);
      // 計算辨識頻率是否要進入慢速模式
      let { processFreq, isSlowModel } = getFrequency(response["success"]);
      response["isSlowModel"] = isSlowModel;
      // 回傳辨識頻率
      postMessage({ type: "frequency", isSlowModel: isSlowModel });

      setTimeout(() => {
        /** @type {Result} */
        postMessage(response);
      }, processFreq);

      event.data.imageData.close();
    }
  };
})();

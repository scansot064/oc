// import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
// import CameraSetting from "./CameraSetting.js";

//import OKIODeviceList from "../assets/resolutions.json" assert { type: "json" };

import QRCodeDetect from "../detection/QRCodeDetect.js";
import TrackPattern from "../detection/TrackPattern.js";

import * as RecordModule from "../recorder/Recorder.js";

const RenderWorkerPath = new URL("../recorder/RenderWorker.js", import.meta.url);
const EncodeWorkerPath = new URL("../recorder/EncodeWorker2.js", import.meta.url);

var OKIODeviceList;

("use strict");

var node_usb = {},
  node_hid = {},
  node_fs = {},
  node_app = {};

window.isElectron = isElectron();

if (window.isElectron) {
  const path = require("path");
  const process = require("process");
  const node_api = [
    path.join(process.cwd(), "node-api/api.js"),
    path.join(process.cwd(), "resources/app", "node-api/api.js"),
    path.join(process.resourcesPath, "app", "node-api/api.js"),
    path.join(process.resourcesPath, "node-zxingcpp/ReadBarCodes.js"),
    path.join(process.resourcesPath, "app", "node-zxingcpp/ReadBarCodes.js"),
  ];
  for (let i = 0; i < node_api.length; i++) {
    try {
      let { usb, hid, fs, app } = require(node_api[i]);
      node_usb = usb;
      node_hid = hid;
      node_fs = fs;
      node_app = app;
      console.log(node_api[i], "success!");
      break;
    } catch (error) {
      console.log(node_api[i], "fail!");
    }
  }
}

// createApp(CameraSetting).mount("#CameraSettings");

if (!localStorage.getItem("version") || localStorage.getItem("version") !== "1.0.0") {
  localStorage.setItem("version", "1.0.0");
  localStorage.setItem("prevVersion", "1.0.0");
}

var avatarImage = document.getElementById("avatarImage");
var avatarImages = JSON.parse(localStorage.getItem("AvatarImages"));
var path = localStorage.getItem("AvatarImage");
var imported = document.getElementById("imported");
let holder, img;
let found = false;

// get the fs object based on Browser being used
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

navigator.webkitPersistentStorage.requestQuota(maxFileSizeQuota, function (grantedSize) {
  filesystemSize = grantedSize;
      window.requestFileSystem(window.PERSISTENT, grantedSize, function (fileSystem) {
          fs = fileSystem;

          //listAllFilesLocal();
          if (avatarImages !== undefined && avatarImages != null) {
            for (let i = 0; i < avatarImages.length; i++) {
              loadLocalFile(avatarImages[i], undefined, function(content) {
                $("#imported").find(`[data-name='${avatarImages[i]}']`).attr("src", content);
              });
            }
          }
    }, handleError);
}, handleError);

if (path === undefined || path === null) {
  path = "./image/Shutterstock_445756432.png";
  localStorage.setItem("AvatarImage", path);
}

if (avatarImages !== undefined && avatarImages != null) {
  for (let i = 0; i < avatarImages.length; i++) {
    holder = document.createElement("div");
    holder.className = "holder";
    img = document.createElement("img");
    img.setAttribute('data-name', avatarImages[i]);
    /*loadLocalFile(avatarImages[i], undefined, function(content) {
      img.src = content;
    });*/
    if (avatarImages[i] == path && found == false) {
      holder.className = "holder active";
      found = true;
    }
    holder.appendChild(img);
    imported.appendChild(holder);
  }
  let index = $("#imported").find('.active').index();
  if (index == -1)
    $('#delete-avatar').attr('disabled', 'disabled');
}
else {
  avatarImages = [];
  $('#delete-avatar').attr('disabled', 'disabled');
}
$("img[src='"+path+"']").parents().addClass("active");

function isElectron() {
  // Renderer process
  if (typeof window !== "undefined" && typeof window.process === "object" && window.process.type === "renderer") {
    return true;
  }
  // Main process
  if (typeof process !== "undefined" && typeof process.versions === "object" && !!process.versions.electron) {
    return true;
  }
  // Detect the user agent when the `nodeIntegration` option is set to true
  if (
    typeof navigator === "object" &&
    typeof navigator.userAgent === "string" &&
    navigator.userAgent.indexOf("Electron") >= 0
  ) {
    return true;
  }
  return false;
}

$(function () {
  // Tooltip
  $(".tooltip").tooltipster({
    position: "bottom",
  });

  // 全螢幕效果
  $(".btn-full-screen").on("click", function () {
    $("body,aside").removeClass("active");

    return false;
  });

  // 正常螢幕效果
  $(".btn-regular-screen").on("click", function () {
    $("body").addClass("active");

    return false;
  });

  // 控制區Menu打開效果
  $("aside .tool .btn-control").on("click", function (e) {
    e.stopPropagation();
    $(this).closest("aside").toggleClass("active");
    return false;
  });

  $("aside .tool .btn-annotator-brush").on("click", function (e) {
    e.stopPropagation();
    $(this).toggleClass("active");
    if (!annotatorMode) {
      annotatorMode = true;
      if (drawMode === "brush" || drawMode === "line" || drawMode === "arrow") {
        $("#canvasPaint").addClass("pen-cursor");
      } else if (drawMode === "rectangle") {
        $("#canvasPaint").addClass("cross-cursor");
      } else if (drawMode === "eraser") {
        $("#eraserCursor").show();
      }
    } else {
      annotatorMode = false;
      $(".btn-annotator-menu").removeClass("active");
      $("#annotatorControl").removeClass("active");
      $("#canvasPaint").removeClass("pen-cursor");
      $("#canvasPaint").removeClass("cross-cursor");
      $("#canvasPaint").removeClass("circle-cursor");
      $("#eraserCursor").hide();
    }
    return false;
  });

  $("aside .tool .btn-annotator-menu").on("click", function (e) {
    e.stopPropagation();
    $(this).toggleClass("active");
    $("#annotatorControl").toggleClass("active");
    if ($("#annotatorControl").hasClass("active")) {
      if (drawMode === "brush" || drawMode === "line" || drawMode === "arrow") {
        $("#canvasPaint").addClass("pen-cursor");
      } else if (drawMode === "rectangle") {
        $("#canvasPaint").addClass("cross-cursor");
      } else if (drawMode === "eraser") {
        $("#canvasPaint").addClass("circle-cursor");
        $("#eraserCursor").show();
      }
      if (!annotatorMode) {
        $("aside .tool .btn-annotator-brush").addClass("active");
        annotatorMode = true;
      }
      setTimeout(() => {
        $("#annotatorControl").css({ "z-index": "1002" });
      }, 100);
    } else {
      $("#annotatorControl").css({ "z-index": "500" });
    }
    return false;
  });

  $("aside .tool .btn-annotator-clear").on("click", function (e) {
    e.stopPropagation();
    drawScreen.clearScreen();
    return false;
  });

  $("aside .tool .btn-okiopoint").on("click", function (e) {
    e.stopPropagation();

    // browser unsupport
    if ($(this).hasClass("unsupport")) {
      return false;
    }
    // other camera unavaliable
    if ($(this).hasClass("unavaliable")) {
      if( recordStart == true)
        return false;
      else {
        $("#verify-okiopoint-dialog").dialog("open");
        updateDialogPosition();
        return false;
      }
    }

    $(this).toggleClass("active");
    TrackFn.reset();
    if (!qrCodeTrack.checked) {
      qrCodeTrack.checked = true;
      window.setSwtichState({ on: true, disable: false });
      DetectFn.stop();
      DetectFn.start();
    } else {
      qrCodeTrack.checked = false;
      window.setSwtichState({ on: false, disable: false });
      DetectFn.stop();
    }
    return false;
  });

  // Selfie button
  $("aside .tool .btn-camera-flip").on("click", function (e) {
    e.stopPropagation();
    return false;
  });

  // Mirror button
  $("aside .tool .btn-mirror").on("click", function (e) {
    e.stopPropagation();
  });

  //Popup Menu 點按之後關閉 popup
  $(".popup .menu li a").on("click", function () {
    $(this).closest(".popup").removeClass("active");
    return false;
  });

  // 右下角Upload打開Popup
  $(".area-upload .btn-control").on("click", function (e) {
    e.stopPropagation();
    $(this).parent().siblings(".popup").toggleClass("active");
    return false;
  });

  // 有close class的關閉行為
  $(".close").on("click", function () {
    $(this).closest(".close-dom").removeClass("active");
    let id = $(this).closest(".close-dom").attr("id");
    if (id == "modal_first_setting") setupStep = 1;
    // reset first setting to step 1
    else if (id == "modal_setting");
    else if (id == "modal_drive") {
      //saveOptions();
      $("#driveDone").addClass("hide");
      $("#drivePanel").removeClass("hide");
      $("#uploadGoogleFile").removeClass("hide");
      $("#modal_drive").removeClass("active");
      uploadFolderID = "";
      uploadFolderName = "";
    } else if (id == "modal_classroom") {
      $("#classroomDone").addClass("hide");
      $("#classroomPanel").removeClass("hide");
      $("#uploadClassroomFile").removeClass("hide");
      $("#modal_classroom").removeClass("active");
    }
    return false;
  });

  // 有toggle class的切換開關行為
  $(".toggle").on("click", function () {
    let id = $(this).closest(".close-dom").attr("id");
    if (id == "modal_setting") {
      $(".btn-setting").toggleClass("active");
      if ($("#modal_setting").hasClass("active")) {
        $("#modal_setting").removeClass("active");
        $(this).toggleClass("active");
        //saveOptions();
      } else {
        $("#modal_setting").addClass("active");
      }
    }
    return false;
  });

  // Dropdown打開Popup
  $(".dropdown .btn").on("click", function (e) {
    e.stopPropagation();
    $(this).siblings(".popup").toggleClass("active");
    $(this).toggleClass("active");
    if (selectList.length != 1 && singleViewMode == false) {
      $("#newtab").addClass("disabled");
      $("#fileinfo").addClass("disabled");
    } else {
      $("#fileinfo").removeClass("disabled");
      let filename;
      if (singleViewMode) filename = previewFile;
      else filename = selectList[0];
      if (isJpg(filename)) {
        $("#newtab").removeClass("disabled");
      } else {
        $("#newtab").addClass("disabled");
      }
    }
  });

  // 打開Modal
  $("[data-target]").on("click", function (e) {
    let $this = $(this);
    let $target = $this.attr("data-target");
    let $dom = $("#" + $target);
    e.stopPropagation();
    $dom.addClass("active");
    $(this).addClass("active");
    return false;
  });

  // 控制音量的靜音/聲音Icon 顯示
  $(".volume .icon").on("click", function () {
    $(this).toggleClass("mute");
    if ($(this).hasClass("mute")) {
      gainValue = document.getElementById("recordSlider").value;
      document.getElementById("recordSlider").value = 0;
      document.getElementById("volumeSlider").value = 0;
      gainNode.gain.value = 0;
    } else {
      document.getElementById("recordSlider").value = gainValue;
      document.getElementById("volumeSlider").value = gainValue;
      gainNode.gain.value = gainValue;
    }
    return false;
  });

  // 讓Popup,Modal,檔案上面的Google Drive 點擊事件不擴散
  $(".popup,.modal-dialog,.card-file .upload").on("click", function (e) {
    e.stopPropagation();
  });

  // 點其他區域讓Popup, Modal 收起; 讓card-file的active狀態失焦
  $("body").on("click", function () {
    //$('.popup,.modal,.card-file').removeClass('active');
    if ($("#modal_classroom").hasClass("active") || $("#modal_drive").hasClass("active")) {
      // do nothing
    } else if ($("#modal_setting").hasClass("active")) {
      $("#modal_setting").removeClass("active");
      $(".btn-setting").removeClass("active");
      //saveOptions();
    } else if (!$("#modal_del_alert").hasClass("active")) {
      $(".popup,.btn-menu,.card-file").removeClass("active");
      selectList = [];
    }
  });

  // freeze button
  $(".btn-freeze").on("click", function (e) {
    $(this).toggleClass("active");
    $(".mark-freeze").toggleClass("active");
    toggleFreeze();
  });

  $("#sliderThumbnail").on("click", "li", function () {
    $(this).siblings("li").removeClass("active");
    $(this).addClass("active");
    let filename = $(this).attr("id");
    filename = filename.substring(1, filename.length);
    currentPreviewIndex = filenameList.indexOf(filename);
    $("#previousFile").removeClass("disabled");
    $("#nextFile").removeClass("disabled");
    if (currentPreviewIndex == 0) $("#previousFile").addClass("disabled");
    if (currentPreviewIndex == filenameList.length - 1) $("#nextFile").addClass("disabled");
    play(filename);
    subIndex();
  });

  $("#fileinfo").on("click", function () {
    if (singleViewMode) showFileInfo(previewFile);
    else if (selectList.length == 1) showFileInfo(selectList[0]);
  });

  $("#button1").on("change", function () {
    let button1 = document.getElementById("button1");
    if (button1.options[button1.selectedIndex].text == chrome.i18n.getMessage("buttonSettingZoom")) {
      $("#btn1Text").removeClass("hide");
      $("#btn1Zoom").removeClass("hide");
    } else {
      $("#btn1Text").addClass("hide");
      $("#btn1Zoom").addClass("hide");
    }
    if (button1.selectedIndex == 4) {
      $("#url1").removeClass("hide");
    } else {
      $("#url1").addClass("hide");
    }
    btn1 = button1.selectedIndex + 1;
    //saveOptions();
  });

  $("#button2").on("change", function () {
    let button2 = document.getElementById("button2");
    if (button2.options[button2.selectedIndex].text == chrome.i18n.getMessage("buttonSettingZoom")) {
      $("#btn2Text").removeClass("hide");
      $("#btn2Zoom").removeClass("hide");
    } else {
      $("#btn2Text").addClass("hide");
      $("#btn2Zoom").addClass("hide");
    }
    if (button2.selectedIndex == 4) {
      $("#url2").removeClass("hide");
    } else {
      $("#url2").addClass("hide");
    }
    btn2 = button2.selectedIndex + 1;
    //saveOptions();
  });

  $("#button3").on("change", function () {
    let button3 = document.getElementById("button3");
    if (button3.selectedIndex == 0) {
      $("#btn3Text").removeClass("hide");
      $("#btn3Zoom").removeClass("hide");
    } else {
      $("#btn3Text").addClass("hide");
      $("#btn3Zoom").addClass("hide");
    }
    if (button3.selectedIndex == 4) {
      $("#url3").removeClass("hide");
    } else {
      $("#url3").addClass("hide");
    }
    btn3 = button3.selectedIndex + 1;
    //saveOptions();
  });

  $("#record-confirm").dialog({
    autoOpen: false,
    resizable: false,
    height: "auto",
    width: 400,
    modal: true,
    buttons: [{
      text: chrome.i18n.getMessage("btnCancel"),
      click: function () {
        $(this).dialog("close");
        $("#record-confirm").addClass("hide");
      }
      }, {
      text: chrome.i18n.getMessage("btnContinue"),
      click: function () {
        //$("#canvasPaint").addClass("hide");
        qrCodeTrack.checked = false;
        window.setSwtichState({ on: false, disable: false });
        DetectFn.stop();

        qrCodeTrack.disabled = true;
        $(".btn-okiopoint").removeClass("active");
        $(".btn-okiopoint").addClass("unavaliable");
        toggleRecording();
        $(this).dialog("close");
        $("#record-confirm").addClass("hide");
      },
    }]
  });

  $("#record-confirm2").dialog({
    autoOpen: false,
    resizable: false,
    height: "auto",
    width: 400,
    modal: true,
    title: chrome.i18n.getMessage("recordWarningTitle"),
    buttons: [{
      text: chrome.i18n.getMessage("btnCancel"),
      click: function () {
        $(this).dialog("close");
        $("#record-confirm2").addClass("hide");
      }
      }, {
      text: chrome.i18n.getMessage("btnContinue"),
      click: function () {
        //$("#canvasPaint").addClass("hide");
        qrCodeTrack.checked = false;
        window.setSwtichState({ on: false, disable: false });
        DetectFn.stop();

        qrCodeTrack.disabled = true;
        $(".btn-okiopoint").removeClass("active");
        $(".btn-okiopoint").addClass("unavaliable");
        toggleRecording();
        $(this).dialog("close");
        $("#record-confirm2").addClass("hide");
      },
    }]
  });

  // $("#select-alert").dialog({
  //   autoOpen: false,
  //   resizable: false,
  //   height: "auto",
  //   width: 300,
  //   modal: true,
  //   buttons: {
  //     OK: function () {
  //       $(this).dialog("close");
  //       $("#modal_drive").removeClass("active");
  //       $("#modal_classroom").removeClass("active");
  //       $(this).addClass("hide");
  //     },
  //   },
  // });

  $("#verify-okiopoint-dialog").dialog({
    modal: true,
    autoOpen: false,
    buttons: [
      {
        text: "Ok",
        click: function (e) {
          e.stopPropagation();
          $(this).dialog("close");
        },
      },
    ],
  });

  $("#verify-okiocam-dialog").dialog({
    modal: true,
    autoOpen: false,
    buttons: [
      {
        text: "Quit",
        click: function (e) {
          e.stopPropagation();
          $(this).dialog("close");
          node_app.closeApp();
        },
      },
      {
        text: "Continue",
        click: function (e) {
          e.stopPropagation();
          $(this).dialog("close");
        },
      },
    ],
  });

  $(".ui-button").on("click", function (e) {
    e.stopPropagation();
  });

  $("input[type=radio][name=library]").change(function () {
    let library = document.getElementsByName("library");
    let tmp = document.getElementsByName("setupLibrary");
    if (library[0].checked) {
      libraryLocation = 2;
      tmp[0].checked = true;
      if (!authToken) {
        chrome.identity.getAuthToken(
          {
            interactive: true,
          },
          function (t) {
            if (chrome.runtime.lastError) {
              console.warn("Whoops.. " + chrome.runtime.lastError.message);
            } else {
              authToken = t;
              if (authToken === undefined) {
              } else {
                // Get Google Drive folders
                let f = new DriveService({
                  token: authToken,
                  folderName: DEFAULT_FOLDER,
                });
                f.getFolderId().then(
                  function (i) {
                    folderID = i;
                  },
                  function (e) {
                    //console.log(e);
                  }
                );
              }
              updateLogin(listFiles);
            }
          }
        );
      } else listFiles();
    } else if (library[1].checked) {
      libraryLocation = 1;
      tmp[1].checked = true;
      listFiles();
    }
    //saveOptions();
    //listFiles();
  });
  $("input[type=radio][name=setupLibrary]").change(function () {
    let library = document.getElementsByName("setupLibrary");
    let tmp = document.getElementsByName("library");
    if (library[0].checked) {
      libraryLocation = 2;
      tmp[0].checked = true;
      if (!authToken) {
        chrome.identity.getAuthToken(
          {
            interactive: true,
          },
          function (t) {
            if (chrome.runtime.lastError) {
              console.warn("Whoops.. " + chrome.runtime.lastError.message);
            } else {
              authToken = t;
              if (authToken === undefined) {
              } else {
                // Get Google Drive folders
                let f = new DriveService({
                  token: authToken,
                  folderName: DEFAULT_FOLDER,
                });
                f.getFolderId().then(
                  function (i) {
                    folderID = i;
                  },
                  function (e) {
                    //console.log(e);
                  }
                );
              }
              updateLogin(listFiles);
            }
          }
        );
      } else listFiles();
    } else if (library[1].checked) {
      libraryLocation = 1;
      tmp[1].checked = true;
      listFiles();
    }
    //saveOptions();
    //listFiles();
  });

  $("#okiocam").on("click", function () {
    $("#apps").removeClass("active");
    chrome.runtime.sendMessage(
      "lhcnbocbalolokdppbnnamdhpclimhoa",
      {
        activateTab: true,
      },
      function (response) {
        if (chrome.runtime.lastError) {
          if (chrome.runtime.lastError.message == "Could not establish connection. Receiving end does not exist.") {
            let url = "https://chrome.google.com/webstore/detail/" + "lhcnbocbalolokdppbnnamdhpclimhoa";
            // open okiocam extension page
            //console.log("not installed, open web page");
            chrome.tabs.create({
              url: url,
            });
          }
        }
      }
    );
  });

  $("#timelapse").on("click", function () {
    $("#apps").removeClass("active");
    chrome.runtime.sendMessage(
      "nennaecdimadgdlboiianfpidnnhncjj",
      {
        activateTab: true,
      },
      function (response) {
        if (chrome.runtime.lastError) {
          if (chrome.runtime.lastError.message == "Could not establish connection. Receiving end does not exist.") {
            let url = "https://chrome.google.com/webstore/detail/" + "nennaecdimadgdlboiianfpidnnhncjj";
            // open timelapse extension page
            chrome.tabs.create({
              url: url,
            });
          }
        }
      }
    );
  });

  $("#stopmotion").on("click", function () {
    $("#apps").removeClass("active");
    chrome.runtime.sendMessage(
      "cnlaenhekjagkfjaglgfffkdblmddnnn",
      {
        activateTab: true,
      },
      function (response) {
        if (chrome.runtime.lastError) {
          if (chrome.runtime.lastError.message == "Could not establish connection. Receiving end does not exist.") {
            let url = "https://chrome.google.com/webstore/detail/" + "cnlaenhekjagkfjaglgfffkdblmddnnn";
            // open stopmotion extension page
            chrome.tabs.create({
              url: url,
            });
          }
        }
      }
    );
  });

  $("#finishSetup").on("click", function () {
    $("#modal_first_setting").removeClass("active");
    if (!authToken) {
      libraryLocation = 1;
      //saveOptions();
      let tmp = document.getElementsByName("library");
      tmp[1].checked = true;
      tmp = document.getElementsByName("setupLibrary");
      tmp[1].checked = true;
    }
  });

  $("#effect").on("click", function (e) {
    e.stopPropagation();
    $("#effectControl").toggleClass("active");
    return false;
  });

  // avatar gallery
  $(".cards").on("click", ".holder", function () {
    $(".holder").removeClass("active");
    $(this).addClass("active");
    let img = document.getElementById("avatarImage");
    let url = $(this).children("img:first").attr('src');
    img.src = url;
    if ($(this).hasClass("built-in")) {
      localStorage.setItem("AvatarImage", url);
    }
    else {
      let name = $(this).children("img:first").attr('data-name');
      localStorage.setItem("AvatarImage", name);
    }
    if ($(this).hasClass("built-in")) {
      $('#delete-avatar').attr('disabled', 'disabled');
    }
    else {
      $('#delete-avatar').removeAttr('disabled');
    }
    DetectFn.forceRedraw = true;
  });

  $("#delete-avatar").click(function() {
    let result = confirm("Are you sure you want to delete?");
    if(result == true) {
      let index = $("#imported").find('.active').index();
      let deleted = $("#imported").find('.active').children("img:first").attr('src');
      let length = $("#imported").children().length;
      let img = document.getElementById("avatarImage");
      $("#imported").children().eq(index).remove();
      if (length > 2) {
        if (index == length - 1)
          $("#imported").children().eq(index - 1).addClass('active');
        else
          $("#imported").children().eq(index).addClass('active');
        let url = $("#imported").find('.active').children("img:first").attr('src');
        img.src = url;
        localStorage.setItem("AvatarImage", url);
      }
      else {
        $("#builtIn").children().eq(0).addClass('active');
        let url = $("#builtIn").children().eq(0).children("img:first").attr('src');
        img.src = url;
        localStorage.setItem("AvatarImage", url);
        $('#delete-avatar').attr('disabled', 'disabled');
      }
      index = avatarImages.indexOf(deleted);
      avatarImages.splice(index, 1);
      localStorage.setItem('AvatarImages', JSON.stringify(avatarImages));
      DetectFn.forceRedraw = true;
    }
  });

  return false;
});

function replace_i18n(obj, tag) {
  var msg = tag.replace(/__MSG_(\w+)__/g, function(match, v1) {
      return v1 ? chrome.i18n.getMessage(v1) : '';
  });

  if(msg != tag) obj.innerHTML = msg;
}

function localizeHtmlPage() {
  // Localize using __MSG_***__ data tags
  var data = document.querySelectorAll('[data-localize]');

  for (var i in data) if (data.hasOwnProperty(i)) {
      var obj = data[i];
      var tag = obj.getAttribute('data-localize').toString();

      replace_i18n(obj, tag);
  }

  // Localize everything else by replacing all __MSG_***__ tags
  var page = document.getElementsByTagName('html');

  for (var j = 0; j < page.length; j++) {
      var obj = page[j];
      var tag = obj.innerHTML.toString();

      replace_i18n(obj, tag);
  }
}

localizeHtmlPage();

/*
 * Global variables
 */
var snapshotFilename = "";
var recordFilename = "";
var canvasWidth; // = previewImage.width;
var canvasHeight; // = previewImage.height;
var recordStart = false;
var liveFreeze = false;
var streamWidth, streamHeight;

var constraints = {
  audio: true,
  video: true,
};

const DEFAULT_SAVEFILE = 1,
  DEFAULT_FOCUSSOUND = 2,
  DEFAULT_COUNTDOWN = 1,
  DEFAULT_AUTOREVIEW = 2,
  DEFAULT_OPENUPLOAD = 2,
  DEFAULT_DISPLAY_MIC = 1,
  DEFAULT_LOCK = 2,
  DEFAULT_FOLDER = "OKIOCam Files",
  DEFAULT_PIPTYPE = 4,
  DEFAULT_PIPSIZE = 2;

var libraryLocation = 1; // 1: local, 2: cloud

// get the fs object based on Browser being used
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

// Get the page elements to work with
var maxFileSizeQuota = 1024 * 1024 * 1024 * 10;

// global variable to store the fs object
var fs = null;

var courses = "";

const liveStore = {
  step: 0.1,
  zoom: 1,
  left: 0,
  top: 0,
  leftRatio: 0,
  topRatio: 0,
  firstTrack: true,
};

var previewFile = ""; // = localStorage['previewFile'];
var optionCounter = 1; // Google Classroom multi choice counter
var clipboard = "";
var folderID = "",
  uploadFolderID = "",
  parentFolderID = [],
  parentFolderName = [],
  folderLevel = 0;

var savedDevice = "",
  savedResolution;

var filenameList = [];
var currentPreviewIndex, previewSubIndex, previewSubLength;
var selectList = [];
var singleViewMode = false;

var currentFolder = undefined;

var isGCam = false,
  isV1 = false,
  isV2 = false,
  isS2 = false,
  isS2Pro = false,
  isS2Plus = false,
  isW1 = false,
  isX1 = false,
  isACam = false,
  isT4K = false,
  isW4K = false;
var supportHID = false,
  supportPTZ = false;

var isFullscreen = false,
  isImageFullscreen = false;

var setupStep = 1;

var login = false;
var authToken = undefined;

var attachLink = [];
var classroomViewUrl = "";

var inLive = true;

var gainValue;

var btn1, btn2, btn3;
var btn1Zoom = [],
  btn2Zoom = [],
  btn3Zoom = [];
var btn1Counter = 0,
  btn2Counter = 0,
  btn3Counter = 0;

var retryCounter = 0;

var curTab = null;
var focused = false;

var curUser = "";

var restoreOKIOPoint = false;

const resWidth = [640, 800, 1024, 1280, 1600, 1920, 1920, 2048, 2592, 2592, 3264, 3264, 3840, 4192],
  resHeight = [480, 600, 768, 720, 1200, 1080, 1440, 1536, 1458, 1944, 1836, 2448, 2160, 3104];

  var initFinished = false;

// HID
var WebHIDdevice = null;
var HID_VENDOR_ID = 0xeb1a; // 60186 in hexadecimal!
var HID_VENDOR_ID2 = 0x342e; // 13358 in hexadecimal!
var HID_PRODUCT_ID_T = 0x8020; // 32800 in hexadecimal!
var HID_PRODUCT_ID_S = 0x8021; // 32801 in hexadecimal!
var HID_PRODUCT_ID_T2 = 0x8024; // 32804 in hexadecimal!
var HID_PRODUCT_ID_S2 = 0x8025; // 32805 in hexadecimal!
var HID_PRODUCT_ID_S3 = 0x8028; // 32808 in hexadecimal!
//var HID_PRODUCT_ID_W = 0x279E; // 10142 in hexadecimal!
var HID_PRODUCT_ID_S_2 = 0x0003;
var HID_PRODUCT_ID_W1 = 0x0005;
var HID_PRODUCT_ID_X1 = 0x0006;
var HID_PRODUCT_ID_A10 = 0x0007;
var HID_PRODUCT_ID_A8 = 0x0008;
var HID_PRODUCT_ID_A6 = 0x0009;
var HID_PRODUCT_ID_S2PRO = 0x0010;
var HID_PRODUCT_ID_SPlus = 0x0011;
var HID_PRODUCT_ID_S2Plus = 0x0012;
var HID_PRODUCT_ID_T4K = 0x0013;
var HID_PRODUCT_ID_W4K = 0x0014;
var HID_PRODUCT_ID_W1_2 = 0x0015;
var HID_PRODUCT_ID_SG4K = 0x0016;

function writeEv(ev, isX1) {
  let data = new Uint8Array(5);
  data[0] = 2;
  data[1] = 1;
  data[2] = 6;
  if (isX1) {
    data[3] = ev - 1;
  } else {
    data[3] = ev;
  }
  data[4] = 0;
  data = data.slice(1, 5);
  //console.log("ev data : ", Array.from(data));
  WebHIDdevice?.sendReport(2, data).catch((error) => console.log(error));
}

function writeCommand(value) {
  let data = new Uint8Array(5);
  switch (value) {
    case 0: // Focus
      data[0] = 2;
      data[1] = 1;
      data[2] = 4;
      data[3] = 1;
      data[4] = 0;
      break;
    case 1: // AE lock
      data[0] = 2;
      data[1] = 1;
      data[2] = 7;
      data[3] = 0;
      data[4] = 0;
      break;
    case 2: // AE unlock
      data[0] = 2;
      data[1] = 1;
      if (isW1) data[2] = 7;
      else data[2] = 8;
      data[3] = 1;
      data[4] = 0;
      break;
    case 3: // AWB lock
      data[0] = 2;
      data[1] = 1;
      data[2] = 10;
      data[3] = 0;
      data[4] = 0;
      break;
    case 4: // AWB unlock
      data[0] = 2;
      data[1] = 1;
      data[2] = 10;
      data[3] = 1;
      data[4] = 0;
      break;
    case 5: // Device ID
      data[0] = 2;
      data[1] = 1;
      data[2] = 0;
      data[3] = 1;
      data[4] = 0;
      break;
    case 6: // Exposure value
      data[0] = 2;
      data[1] = 1;
      data[2] = 0;
      data[3] = 2;
      data[4] = 0;
      break;
    case 7: // Mirror on
      data[0] = 2;
      data[1] = 1;
      data[2] = 11;
      data[3] = 0;
      data[4] = 0;
      break;
    case 8: // Mirror off
      data[0] = 2;
      data[1] = 1;
      data[2] = 11;
      data[3] = 1;
      data[4] = 0;
      break;
    case 9: // Flip on
      data[0] = 2;
      data[1] = 1;
      data[2] = 11;
      data[3] = 3;
      data[4] = 0;
      break;
    case 10: // Flip off
      data[0] = 2;
      data[1] = 1;
      data[2] = 11;
      data[3] = 4;
      data[4] = 0;
      break;
    case 11: // 50Hz
      data[0] = 2;
      data[1] = 1;
      data[2] = 12;
      data[3] = 1;
      data[4] = 0;
      break;
    case 12: // 60Hz
      data[0] = 2;
      data[1] = 1;
      data[2] = 12;
      data[3] = 0;
      data[4] = 0;
      break;
    case 13: // Zoom in
      data[0] = 2;
      data[1] = 1;
      data[2] = 9;
      data[3] = 1;
      data[4] = 0;
      break;
    case 14: // Zoom out
      data[0] = 2;
      data[1] = 1;
      data[2] = 9;
      if (isW1) data[3] = 2;
      else data[3] = 0;
      data[4] = 0;
      break;
    case 15: // AF
      data[0] = 2;
      data[1] = 1;
      data[2] = 13;
      data[3] = 0;
      data[4] = 0;
      break;
    case 16: // MF
      data[0] = 2;
      data[1] = 1;
      data[2] = 13;
      data[3] = 1;
      data[4] = 0;
      break;
  }
  data = data.slice(1, 5);
  //console.log("command data : ", Array.from(data));
  WebHIDdevice?.sendReport(2, data).catch((error) => console.log(error));
}

async function sendEV(ev, isX1) {
  writeEv(ev, isX1);
  // node_hid.sendExposure?.(ev, isX1);
}

async function sendCommand(value) {
  writeCommand(value);
  // node_hid.sendCommand?.(value);
}

async function requestHid(vid, pid) {
  try {
    if (!WebHIDdevice) {
      if (!vid) {
        vid = videoSelect[videoSelect.selectedIndex].dataset.vid;
      }
      if (!pid) {
        pid = videoSelect[videoSelect.selectedIndex].dataset.pid;
      }
      const options = {
        filters: [
          {
            vendorId: Number(`0x${vid}`),
            productId: Number(`0x${pid}`),
          },
        ],
      };
      let HidDevices = await navigator.hid.requestDevice(options);
      WebHIDdevice = HidDevices[0];
      await WebHIDdevice.open();
      const onInputReport = (event) => {
        let { data } = event;
        let hidData = new Uint8Array(data.buffer);
        //console.log(hidData);
        handleHidData(hidData);
      };
      WebHIDdevice.removeEventListener("inputreport", onInputReport);
      WebHIDdevice.addEventListener("inputreport", onInputReport);
    }
  } catch (error) {
    console.log(error);
  }
  return Promise.resolve();
}

async function initializeHid(vid, pid) {
  if (WebHIDdevice) {
    await WebHIDdevice.close();
    WebHIDdevice = null;
  }
  if (window.isElectron) {
    let HidDevices = await navigator.hid.getDevices();
    let vendorId = parseInt(vid, 16);
    let productId = parseInt(pid, 16);
    WebHIDdevice = HidDevices.find((device) => device.vendorId == vendorId && device.productId == productId);
    if (WebHIDdevice) {
      await WebHIDdevice.open();
      WebHIDdevice.addEventListener("inputreport", (event) => {
        let { data } = event;
        let hidData = new Uint8Array(data.buffer);
        handleHidData(hidData);
      });
    }
  } else {
    if (supportHID) {
      requestHid(vid, pid).catch((err) => console.log(err));
    }
  }
  // node_hid.initHidDevice?.(vid, pid, supportHID);
  // node_hid.onHidData?.((event, data) => {
  //   handleHidData(data);
  // });
}

let hidTimer = null;
function handleHidData(hid) {
  if (hid[0] == 5 && hid[1] == 1 && hid[2] == 0 && hid[3] == 0) {
    // Focus begin
    $(".focusFrame").children().css("border-top-color", "red");
    $(".focusFrame").children().css("border-right-color", "red");
    $(".focusFrame").children().css("border-bottom-color", "red");
    $(".focusFrame").children().css("border-left-color", "red");
    $(".focusFrame").removeClass("hide");
    clearInterval(hidTimer);
    if (focusSound) beep(10, 2800, 40);
  } else if (hid[0] == 5 && hid[1] == 2 && hid[2] == 0 && hid[3] == 0) {
    // Focus finish
    $(".focusFrame").children().css("border-top-color", "green");
    $(".focusFrame").children().css("border-right-color", "green");
    $(".focusFrame").children().css("border-bottom-color", "green");
    $(".focusFrame").children().css("border-left-color", "green");
    if (focusSound) {
      beep(10, 2800, 35);
      setTimeout(function () {
        beep(10, 2800, 35);
      }, 75);
    }
    hidTimer = setTimeout(function () {
      $(".focusFrame").addClass("hide");
    }, 1000);
    sendCommand(6);
  } else if (isX1 && hid[0] == 0 && hid[1] == 0 && hid[2] == 0 && hid[3] == 0) {
    // Webcam mode
    $("#exposure").addClass("hide");
    //$('#focusDiv').removeClass('hide');
    //$('#focusButton').removeClass('hide');
    // $("#fourthDiv").css({ "background-color": "rgba(174, 179, 174, 0.5)" });
    // $("#fourthDiv").css({ "background-color": "rgba(0, 167, 189, 0.5)" }); // 針對 rotate 關閉修改
    $("#buttonSetting").addClass("hide");
  } else if (isX1 && hid[0] == 0 && hid[1] == 1 && hid[2] == 0 && hid[3] == 0) {
    // Docam mode
    $("#exposure").removeClass("hide");
    //$('#focusDiv').removeClass('hide');
    //$('#focusButton').removeClass('hide');
    // $("#fourthDiv").css({ "background-color": "rgba(0, 167, 189, 0.5)" });
    // $("#fourthDiv").css({ "background-color": "rgba(174, 179, 174, 0.5)" }); // 針對 rotate 關閉修改
    $("#buttonSetting").addClass("hide");
  } else if (
    ((isV1 && hid[0] == 6) || ((isV2 || isS2 || isW1 || isS2Plus || isT4K || isW4K) && (hid[0] == 1 || hid[0] == 2 || hid[0] == 6))) &&
    hid[2] == 0 &&
    hid[3] == 0
  ) {
    // Exposure value
    expSlider.value = hid[1];
    updateExp();
  } else if (isX1 && (hid[0] == 2 || hid[0] == 130) && hid[2] == 0 && hid[3] == 0) {
    // Exposure value
    expSlider.value = hid[1] + 1;
    updateExp();
  } else if (isS2 && hid[0] == 9 && hid[1] == 0 && hid[3] === 0) {
    // firmware version
    let version = parseInt(hid[2]);
    if (version <= 19) {
      resolutionSelect.options[0].text = "800x600";
      let msg1 = i18next.t("recordSettingQualityLow.message"),
        resolution1 = msg1 + " (800x600)";
      $("#recordQuality").children('option[value="1"]').text(resolution1);
    }
  } else if (isW1) {
    updateZoomW1HidData([...hid]);
  } else if (isS2Pro) {
    updateZoomS2ProHidData([...hid]);
  } else if (isS2Plus || isT4K || isW4K) {
    updateZoom4KHidData([...hid]);
  }
}

var allFiles = [];

var inChromeOS = false;

var getRecordStream = true;
var filesystemSize = 0,
  leftSize = 0,
  limitLength = 60;
var cameraPermission = "prompt";

var focusSound = false;

var uploadingFiles = [];

var pipStream = null;
var pipType = 4,
  pipWindow = 3;

/*
 * globals MediaRecorder
 */
var mediaSource = new MediaSource();
mediaSource.addEventListener("sourceopen", handleSourceOpen, false);
var mediaRecorder;
var sourceBuffer;
var intervalTimer;
var startTime;
var countdownTimer;
var countdownStartTime;
var countdownSec = 0;
var progressTimer;
var videoRatio = 1,
  imageRatio = 1;
var pauseRecord = false;
var pauseTime;
var cameraStream, recordStream, mixedStreams;
var folderName = DEFAULT_FOLDER,
  uploadFolderName = "";

/*
 * UI component
 */
var liveVideo = document.querySelector("video#live");
var pipFrame = document.getElementById("pipFrame");
var pipVideo = document.querySelector("video#pipVideo");
var recordedVideo = document.querySelector("video#recorded");
var previewImage = document.querySelector("canvas#preview");
var previewFrame = document.getElementById("previewFrame");
var snapshotButton = document.getElementById("snapshot");
var countdownText = document.getElementById("countdownText");
var focusButton = document.getElementById("focus");
var resetButton = document.getElementById("reset");
var recordButton = document.getElementById("record");
var pauseButton = document.getElementById("pause");
var stopButton = document.getElementById("stop");
var resumeButton = document.getElementById("resume");
var swapButton = document.getElementById("swap");
// var swapButton2 = document.getElementById("swap2");
var mirrorEffect = document.getElementById("mirrorEffect");
var recordInfo = document.getElementById("recordInfo");
var volume = document.getElementById("volume");
var volumeRecording = document.getElementById("volumeRecording");
var audioSelect = document.querySelector("select#audioSource");
var videoSelect = document.querySelector("select#videoSource");
var resolutionSelect = document.getElementById("resolution");
var pipSelect = document.querySelector("select#pipSource");
var pipResolutionSelect = document.getElementById("pipResolution");
var pipPosition = document.querySelector("select#pipPosition");
var pipSize = document.querySelector("select#pipSize");
var focussoundSelect = document.getElementById("focusSound");
var recordRatioSelect = document.getElementById("recordRatio");
var recordQualitySelect = document.getElementById("recordQuality");
var returnLive = document.getElementById("backtolive");
var returnList = document.getElementById("backtolist");
var toReviewButton = document.getElementById("toreview");
var deleteallButton = document.getElementById("confirmDelete");
var cancelDelete = document.getElementById("cancelDelete");
var downloadButton = document.getElementById("downloadFile");
var deleteButton = document.getElementById("deleteFile");
var uploadButton = document.getElementById("upload");
var uploadImgs = document.getElementById("uploadImgs");
var startUpload = document.getElementById("startUpload");
var gclassButton = document.getElementById("gclass");
var classroomCreate = document.getElementById("classroomCreate");
var newtabButton = document.getElementById("newtab");
var gotoDriveButton = document.getElementById("gotodrive");
var workType = document.querySelector("select#coursework");
var optionInput = document.getElementById("dynamicInput");
var addOption = document.querySelector("button#add");
var deleteOption = document.querySelector("button#delete");
var timer = document.getElementById("timer");

var previousButton = document.getElementById("previous");
var nextButton = document.getElementById("next");

var fileList = document.getElementById("files");
var fileView = document.getElementById("fileView");
var noFile = document.getElementById("noFile");
var contextMenu = document.getElementById("contextMenu");

var menuDelete = document.getElementById("menuDelete");
var menuUpload = document.getElementById("menuUpload");
var menuNewtab = document.getElementById("menuNewtab");
var menuDownload = document.getElementById("menuDownload");

// setting
var countdownSelect = document.getElementById("countdown") || {},
  autoreviewSelect = document.getElementById("autoreview") || {},
  displayMicCheck = document.getElementById("displayMic") || {},
  button1Select = document.getElementById("button1"),
  button2Select = document.getElementById("button2"),
  button3Select = document.getElementById("button3");

var fullscreenButton = document.getElementById("fullscreen");
var fullscreenButton2 = document.getElementById("fullscreen2");

var driveFolders = document.getElementById("driveFolders");

// zoom
var zoomControl = document.getElementById("zoom");
var zoomText = document.getElementById("zoomText");
var zoomSlider = document.getElementById("zoomSlider");
var zoomArea = document.getElementById("zoomArea");
var zoomPanel = document.getElementById("zoomPanel");
var zoomView = document.getElementById("zoomView");
var zoomRatio = document.getElementById("zoomRatio");

var rotateSign = document.getElementById("rotateSign");

// exposure
var expAdd = document.getElementById("expAdd");
var expMinus = document.getElementById("expMinus");
var expSlider = document.getElementById("expSlider");
var expValue = document.getElementById("expValue");

var quitButton = document.getElementById("quit");
var firstSetup = document.getElementById("firstSetup");
var prevStep = document.getElementById("prevStep");
var nextStep = document.getElementById("nextStep");
var cancelSetup = document.getElementById("cancelSetup");

var username = document.getElementById("username");
var email = document.getElementById("email");
var userAvatar = document.getElementById("userAvatar");
var usernameDrive = document.getElementById("usernameDrive");
var emailDrive = document.getElementById("emailDrive");
var userAvatarDrive = document.getElementById("userAvatarDrive");
var usernameClassroom = document.getElementById("usernameClassroom");
var emailClassroom = document.getElementById("emailClassroom");
var userAvatarClassroom = document.getElementById("userAvatarClassroom");
var usernameSetup = document.getElementById("usernameSetup");
var emailSetup = document.getElementById("emailSetup");
var userAvatarSetup = document.getElementById("userAvatarSetup");

var sliderFiles = document.getElementById("sliderThumbnail");

var videoQuality = document.getElementById("videoQuality");

// Annotate
var annotatorButton = document.getElementById("annotate");
var annotatorMode = false;
var isDrawing = false;
var pointStack = [];
var nowStartFromPrevEnd = 0;
var drawGap = 4; // 繪製的 mosue move 座標間隔

var maxLeft = 0;
var maxTop = 0;

var canvasRotate = 0,
  canvasAngle = 0,
  lastAngle = 0;

const aspectRatio_16_9 = 1.77778;
const aspectRatio_4_3 = 1.33334;
const drawStates = document.getElementById("drawStates");
const canvasPaint = document.getElementById("canvasPaint");
const drawCtx = canvasPaint.getContext("2d");
const eraserCursor = document.getElementById("eraserCursor");
const drawScreen = new canvasScreen(canvasPaint, drawCtx, eraserCursor);
const aboutBtn = document.getElementById("about");
const helpBtn = document.getElementById("help");

var drawMode = "brush";
var currentRatio = aspectRatio_16_9;

// Effects
const keystoneHSlider = document.getElementById("keystoneHorizontal");
const keystoneVSlider = document.getElementById("keystoneVertical");
var keystoneH = "0",
  keystoneV = "0",
  rotateX = 0,
  rotateY = 0;
const rotateSlider = document.getElementById("rotateSlider");
const brightnessSlider = document.getElementById("brightnessSlider");
const contrastSlider = document.getElementById("contrastSlider");
const hueSlider = document.getElementById("hueSlider");
const saturationSlider = document.getElementById("saturationSlider");
const sepiaSlider = document.getElementById("sepiaSlider");
const grayscaleSlider = document.getElementById("grayscaleSlider");

const spotlight = document.querySelector(".spotlight");
const spotlightSwitch = document.getElementById("spotlightSwitch");

const qrCodeTrack = document.getElementById("qrCodeTrack");

/*
 * UI event handler
 */
snapshotButton.onclick = startSnapshotTimer;
focusButton.onclick = triggerFocus;
resetButton.onclick = resetLive;
//recordButton.onclick = toggleRecording;
recordButton.onclick = startRecording;
stopButton.onclick = toggleRecording;
pauseButton.onclick = togglePause;
resumeButton.onclick = togglePause;
audioSelect.onchange = function (e) {
  if (audioSelect.value) {
    navigator.mediaDevices
      .getUserMedia({
        audio: {
          deviceId: {
            exact: audioSelect.value,
          },
        },
      })
      .then((stream) => {
        Recorder.initAudio(stream);
        let micId = audioSelect.options[audioSelect.selectedIndex].value;
        localStorage.setItem("micId", micId);
      });
  } else {
    Recorder.initAudio();
  }
};
videoSelect.onchange = function (e) {
  retryCounter = 0;
  if (swapMode == true) {
    swapCameras();
  }
  initializeFlagsAndHid();
  getSupportResolution();
  initFinished = false;
  getStream();
  if (liveStore["zoom"] > 1) {
    v.style.top = 0 + "px";
    v.style.left = 0 + "px";
    canvasPaint.style.left = 0 + "px";
    canvasPaint.style.top = 0 + "px";
    updateZoomUI();
  }
};
resolutionSelect.onchange = function (e) {
  retryCounter = 0;
  if (liveStore["zoom"] > 1) {
    v.style.top = 0 + "px";
    v.style.left = 0 + "px";
    canvasPaint.style.left = 0 + "px";
    canvasPaint.style.top = 0 + "px";
    updateZoomUI();
  }
  if (swapMode === true) {
    swapCameras();
  }
  initFinished = false;
  getStream();
  VideoOperate.setLivePosition(0, 0);
};
pipSelect.onchange = function (e) {
  let pipSource = pipSelect.value;
  if (pipSource == 0) {
    $("#swap").addClass("hide");
    $("#pipFrame").addClass("hide");
    if (swapMode === true) {
      swapCameras();
    }
    if (pipStream) {
      pipStream.getTracks().forEach(function (track) {
        track.stop();
      });
      pipStream = null;
    }
    saveCameraState();
  } else {
    $("#swap").removeClass("hide");
    $("#pipFrame").removeClass("hide");
    if (swapMode === true) {
      swapCameras();
    }
    getSupportPIPResoultion();
    getPIPStream();
  }
};
pipResolutionSelect.onchange = function (e) {
  if (!pipSelect.value == 0) {
    if (swapMode === true) {
      swapCameras();
    }
    getPIPStream();
  }
};
pipPosition.onchange = function (e) {
  updatePIPFramePosition();
  // qrCodeTrack.checked = false;
  // let pipSource = pipSelect.value;
  // pipType = pipPosition.selectedIndex + 1;
  // liveVideo.style.left = 0 + "px";
  // pipVideo.style.left = "";
  // if (pipSource != 0) {
  //   if (pipType == 1 || pipType == 2) {
  //     // top left & top right
  //     pipFrame.style.top = 10 + "px";
  //     pipFrame.style.bottom = "";
  //   } else if (pipType == 3 || pipType == 4) {
  //     // bottom left & bottom right
  //     pipFrame.style.bottom = 10 + "px";
  //     pipFrame.style.top = "";
  //   }

  //   if (pipType == 1 || pipType == 3) {
  //     // top left & bottom left
  //     pipFrame.style.left = 10 + "px";
  //     pipFrame.style.right = "";
  //   } else if (pipType == 2 || pipType == 4) {
  //     // bottom left & top right & bottom right
  //     pipFrame.style.right = 10 + "px";
  //     pipFrame.style.left = "";
  //   }

  //   if (pipType == 5) {
  //     // customize
  //     let rect = pipFrame.getBoundingClientRect(),
  //       pRect = liveFrame.getBoundingClientRect();
  //     let left = (pRect.width - rect.width) / 2,
  //       top = (pRect.height - rect.height) / 2;
  //     pipFrame.style.top = top + "px";
  //     pipFrame.style.left = left + "px";
  //     pipFrame.style.right = "";
  //     pipFrame.style.bottom = "";
  //   }

  //   if (pipType == 6) {
  //     pipSize.disabled = true;
  //     pipFrame.style.width = "100%";
  //     pipFrame.style.height = "100%";
  //     pipFrame.style.top = "0px";
  //     pipFrame.style.bottom = "";
  //     pipFrame.style.left = "50%";
  //     pipFrame.style.right = "";

  //     liveVideo.style.left = `${-1 * parseFloat(liveVideo.getBoundingClientRect().width / 4)}px`;
  //     // liveVideo.style.left = "-25%";
  //     pipVideo.style.left = "-25%";
  //   } else {
  //     pipSize.disabled = false;
  //     pipWindow = pipSize.selectedIndex + 1;
  //     let size = 20;
  //     if (pipSource != 0) {
  //       if (pipWindow == 1) size = 50;
  //       else if (pipWindow == 2) size = 33;
  //       else if (pipWindow == 3) size = 25;
  //       else if (pipWindow == 4) size = 20;

  //       pipFrame.style.width = size + "%";
  //       pipFrame.style.height = size + "%";
  //     }
  //   }
  // }
  // //saveOptions();
};
pipSize.onchange = function (e) {
  pipWindow = pipSize.selectedIndex + 1;
  // let size = 20;
  // if (pipSource != 0) {
  //   if (pipWindow == 1) size = 50;
  //   else if (pipWindow == 2) size = 33;
  //   else if (pipWindow == 3) size = 25;
  //   else if (pipWindow == 4) size = 20;
  //   pipFrame.style.width = size + "%";
  //   pipFrame.style.height = "auto";
  // }
  updatePIPFramePosition();
  //saveOptions();
};
// focussoundSelect.onchange = function (e) {
//   // focusSound = this.value == 1 ? true : false;
//   // saveOptions();
// };
// recordRatioSelect.onchange = function (e) {
// let ratio = recordRatioSelect.value;
// if (ratio == 1) {
//   $("#recordQuality").children('option[value="1"]').text(chrome.i18n.getMessage("recordSettingQualityLow1"));
//   $("#recordQuality").children('option[value="2"]').text(chrome.i18n.getMessage("recordSettingQualityHigh1"));
// } else if (ratio == 2) {
//   $("#recordQuality").children('option[value="1"]').text(chrome.i18n.getMessage("recordSettingQualityLow2"));
//   $("#recordQuality").children('option[value="2"]').text(chrome.i18n.getMessage("recordSettingQualityHigh2"));
// }
//saveOptions();
// };
aboutBtn.onclick = (e) => {
  e.preventDefault();
  if (node_app?.openUrl) {
    node_app.openUrl(e.target.href);
  } else {
    window.open(e.target.href);
  }
};
helpBtn.onclick = (e) => {
  e.preventDefault();
  if (node_app?.openUrl) {
    node_app.openUrl(e.target.href);
  } else {
    window.open(e.target.href);
  }
};

let uploadProgressTimer;

function uploadFinish() {
  if (waitingProcess > 1) waitingProcess = waitingProcess - 1;
  else {
    window.clearInterval(uploadProgressTimer);

    $("#driveProgress").addClass("hide");
    $("#driveDone").removeClass("hide");
    $(".close").removeClass("disabled");
    uploadFolderID = "";
    uploadFolderName = "";
  }
}

function uploadFinishLive() {
  //console.log("in uploadFinishLive, " + liveUploading);
  liveUploading -= 1;
  if (liveUploading == 0) {
    $("#uploadProgress").removeClass("active");
    //console.log("hide uploading progress");
  }
}

var mirrorFilter = "",
  mirrorStyle = "",
  flipFilter = "",
  flipStyle = "";

var menuVisible = false;

const toggleMenu = (command) => {
  //contextMenu.style.display = command === "show" ? "block" : "none";
  contextMenu.className = command === "show" ? "context-popup popup active" : "context-popup popup hide";
  if (command === "show") menuVisible = true;
  else menuVisible = false;
};

const setPosition = ({ top, left }) => {
  contextMenu.style.left = `${left}px`;
  contextMenu.style.top = `${top}px`;
  toggleMenu("show");
};

function getAspectRatio(width, height) {
  const gcd = (width, height) => {
    if (height === 0) {
      return width;
    }
    return gcd(height, width % height);
  };

  if (!width || !height) {
    return { 4: 3 };
  }

  const ratio = gcd(width, height);
  const wRatio = width / ratio;
  const hRatio = height / ratio;
  return { wRatio, hRatio };
}

function updateFrameSize() {
  if (window.stream) {
    streamWidth = window.stream.getVideoTracks()[0].getSettings().width;
    streamHeight = window.stream.getVideoTracks()[0].getSettings().height;
    if (streamHeight / streamWidth === 0.75) {
      videoRatio = 1;
    } else if (streamHeight / streamWidth === 0.5625) {
      videoRatio = 2;
    } else {
      videoRatio = 0;
    }
  }

  let frameTopFix = 25;
  let frameHeightFix = 50;

  if (isFullscreen) {
    frameTopFix = 0;
    frameHeightFix = 0;
  }

  if (videoRatio === 1) {
    liveFrame.style.aspectRatio = "4/3";
    if (window.innerWidth <= ((window.innerHeight - frameHeightFix) / 3) * 4) {
      liveFrame.style.width = "100vw";
      liveFrame.style.height = "auto";
      // liveFrame.style.height = "calc(100vw / 4 * 3)";
      $("#liveFrame").css({
        transform: "translateY(-50%)",
        top: `calc(50% + ${frameTopFix}px)`,
        margin: "0",
      });
    } else {
      liveFrame.style.width = "auto";
      liveFrame.style.height = `calc(100vh - ${frameHeightFix}px)`;
      // liveFrame.style.width = "calc(calc(100vh - 50px) / 3 * 4)";
      $("#liveFrame").css({
        transform: "",
        top: "0",
        margin: `${frameHeightFix}px auto`,
      });
    }
  }
  if (videoRatio === 2) {
    liveFrame.style.aspectRatio = "16/9";
    if (window.innerWidth <= ((window.innerHeight - frameHeightFix) / 9) * 16) {
      liveFrame.style.width = "100vw";
      liveFrame.style.height = "auto";
      // liveFrame.style.height = "calc(100vw / 16 * 9)";
      $("#liveFrame").css({
        transform: "translateY(-50%)",
        top: `calc(50% + ${frameTopFix}px)`,
        margin: "0",
      });
    } else {
      liveFrame.style.width = "auto";
      liveFrame.style.height = `calc(100vh - ${frameHeightFix}px)`;
      // liveFrame.style.width = "calc(calc(100vh - 50px) / 9 * 16)";
      $("#liveFrame").css({
        transform: "",
        top: "0",
        margin: `${frameHeightFix}px auto`,
      });
    }
  }
  if (videoRatio === 0) {
    let { wRatio, hRatio } = getAspectRatio(streamWidth, streamHeight);
    liveFrame.style.aspectRatio = `${wRatio}/${hRatio}`;
    if (window.innerWidth <= ((window.innerHeight - frameHeightFix) / hRatio) * wRatio) {
      $("#liveFrame").css({
        width: "100vw",
        height: "auto",
        margin: "0",
        top: `calc(50% + ${frameTopFix}px)`,
        transform: "translateY(-50%)",
      });
    } else {
      $("#liveFrame").css({
        width: "auto",
        height: `calc(100vh - ${frameHeightFix}px)`,
        margin: `${frameHeightFix}px auto`,
        top: "0",
        transform: "",
      });
    }
  }

  //console.log("updateFrameSize");
  // liveFrame.style.width = "100%";
  // liveFrame.style.height = "100%";
  // liveFrame.style.transform = "initial";
  // liveFrame.style.top = "initial";
  // liveFrame.style.margin = "initial";
  // liveFrame.style.aspectRatio = "initial";
}

// update live-tool-frame、live-content-frame size
function updateLiveFrameSize() {
  let headerHeight = isFullscreen ? 0 : 50;
  let srcWidth = streamWidth; // entey video size
  let srcHeight = streamHeight; // entey video size
  let videoWidth = srcWidth;
  let videoHeight = srcHeight;
  let windowWidth = window.innerWidth;
  let windowHeight = window.innerHeight - headerHeight;

  if (rotate === 90 || rotate === 270) {
    videoWidth = srcHeight;
    videoHeight = srcWidth;
  }
  // lodash function _.round
  let displayRatio = _.round(videoWidth / videoHeight, 2);
  let windowRatio = _.round(windowWidth / windowHeight, 2);
  let toolFrameSize = {
    width: "auto",
    height: "auto",
  };
  let contentFrameSize = {
    width: "auto",
    height: "auto",
    pureWidth: "0",
    pureHeight: "0",
  };
  // calc live-tool-frame size
  if (windowRatio < displayRatio) {
    toolFrameSize.width = `${windowWidth}`;
    toolFrameSize.height = `${(windowWidth / videoWidth) * videoHeight}`;
  }
  if (windowRatio > displayRatio) {
    toolFrameSize.width = `${(windowHeight / videoHeight) * videoWidth}`;
    toolFrameSize.height = `${windowHeight}`;
  }
  if (windowRatio === displayRatio) {
    toolFrameSize.width = `${windowWidth}`;
    toolFrameSize.height = `${windowHeight}`;
  }
  let toolFrameStyle = {
    width: `${toolFrameSize.width}px`,
    height: `${toolFrameSize.height}px`,
    aspectRatio: `${videoWidth}/${videoHeight}`,
  };
  // calc live-content-frame size
  if (rotate === 0 || rotate === 180) {
    if (windowRatio === displayRatio) {
      contentFrameSize.width = `${windowWidth}`;
      contentFrameSize.height = `${windowHeight}`;
    }
    if (windowRatio < displayRatio) {
      contentFrameSize.width = `${windowWidth}`;
      contentFrameSize.height = `${(windowWidth / srcWidth) * srcHeight}`; // "auto"
    }
    if (windowRatio > displayRatio) {
      contentFrameSize.width = `${(windowHeight / srcHeight) * srcWidth}`; // "auto"
      contentFrameSize.height = `${windowHeight}`;
    }
    contentFrameSize.pureWidth = contentFrameSize.width;
    contentFrameSize.pureHeight = contentFrameSize.height;
  }
  if (rotate === 90 || rotate === 270) {
    if (windowRatio === displayRatio) {
      contentFrameSize.width = `${windowHeight}`;
      contentFrameSize.height = `${windowWidth}`;
    }
    if (windowRatio < displayRatio) {
      contentFrameSize.width = `${(windowWidth / srcHeight) * srcWidth}`; // "auto"
      contentFrameSize.height = `${windowWidth}`;
    }
    if (windowRatio > displayRatio) {
      contentFrameSize.width = `${windowHeight}`;
      contentFrameSize.height = `${(windowHeight / srcWidth) * srcHeight}`; // "auto"
    }
    contentFrameSize.pureWidth = contentFrameSize.height;
    contentFrameSize.pureHeight = contentFrameSize.width;
  }
  let contentFrameStyle = {
    width: `${contentFrameSize.width}px`,
    height: `${contentFrameSize.height}px`,
    aspectRatio: `${srcWidth}/${srcHeight}`,
  };
  $(".live-tool-frame").css(toolFrameStyle); // live-tool-frame 用來約束底下的元件 live-tool-frame
  $(".live-content-frame").css(contentFrameStyle); // live-tool-frame 套用在 liveVideo、detectPaint、canvasPaint
  $(".live-content-frame").attr("data-width", contentFrameSize.pureWidth);
  $(".live-content-frame").attr("data-height", contentFrameSize.pureHeight);
}

function updateLiveVideoSize() {
  let headerHeight = isFullscreen ? 0 : 50;
  let srcWidth = streamWidth;
  let srcHeight = streamHeight;
  let videoWidth = srcWidth;
  let videoHeight = srcHeight;
  let windowWidth = window.innerWidth;
  let windowHeight = window.innerHeight - headerHeight;

  if (rotate === 90 || rotate === 270) {
    videoWidth = srcHeight;
    videoHeight = srcWidth;
  }

  let displayRatio = _.round(videoWidth / videoHeight, 2);
  let windowRatio = _.round(windowWidth / windowHeight, 2);

  let eventStyle = {
    width: "auto",
    height: "auto",
    aspectRatio: "auto",
  };

  if (rotate === 0 || rotate === 180) {
    if (windowRatio < displayRatio) {
      eventStyle.width = `${windowWidth}px`;
      eventStyle.height = `auto`;
    }
    if (windowRatio > displayRatio) {
      eventStyle.width = `auto`;
      eventStyle.height = `${windowHeight}px`;
    }
    if (windowRatio === displayRatio) {
      eventStyle.width = `${windowWidth}px`;
      eventStyle.height = `${windowHeight}px`;
    }
  }
  if (rotate === 90 || rotate === 270) {
    if (windowRatio <= displayRatio) {
      eventStyle.width = `auto`;
      eventStyle.height = `${windowWidth}px`;
    }
    if (windowRatio > displayRatio) {
      eventStyle.width = `${windowHeight}px`;
      eventStyle.height = `auto`;
    }
    if (windowRatio === displayRatio) {
      eventStyle.width = `${windowHeight}px`;
      eventStyle.height = `${windowWidth}px`;
    }
  }
  eventStyle.aspectRatio = `${srcWidth}/${srcHeight}`;

  $(".child-frame").css(eventStyle);
}

function updateLiveVideoTransform(zoom) {
  eventFrame.style.transform = `rotate(${rotate}deg) scale(${zoom}) ${mirrorStyle}`;
  liveVideo.style.transform = `rotate(${rotate}deg) scale(${zoom}) ${mirrorStyle}`;
  canvasPaint.style.transform = `rotate(${rotate}deg) scale(${zoom}) ${mirrorStyle}`;
  detectPaint.style.transform = `rotate(${rotate}deg) scale(${zoom}) ${mirrorStyle}`;
  pluginFrame.style.transform = `scale(${zoom})`;
  spotlight.style.transform = `scale(${zoom})`;

  liveVideo.dataset.scale = rotate;
  liveVideo.dataset.scale = zoom.toFixed(1);
  if (mirrorStyle) {
    liveVideo.dataset.isMirror = true;
  } else {
    liveVideo.dataset.isMirror = false;
  }
}

/**
 * 設定 .live(liveVideo)、#detectPaint、#canvasPaint、#eventFrame transform 數值
 */
function updateSize() {
  // set liveVideo position
  VideoOperate.setLiveTransform({
    left: 0,
    top: 0,
    rotate: rotate,
  });
  // set zoomView position
  VideoOperate.setZoomViewPosition(0, 0);
  // update liveVideo、canvasPaint、detectCanvas、pluginFrame size
  updateLiveFrameSize();
  // update zoomView size
  updateZoomPanelSize();
  // set liveContainer size
  if (isFullscreen) {
    $("#liveContainer").css({
      marginTop: "0px",
      height: "100vh",
    });
  } else {
    $("#liveContainer").css({
      marginTop: "50px",
      height: "calc(100vh - 50px)",
    });
  }
}

window.addEventListener("resize", function (event) {
  if (
    !document.fullscreenElement &&
    !document.webkitIsFullScreen &&
    !document.mozFullScreen &&
    !document.msFullscreenElement
  ) {
    // isFullscreen = false;
  }
  throttleUpdateSize();
  updatePIPFramePosition();
  updateDialogPosition();
  if (liveStore["zoom"] > 1) {
    // updateLiveFrame();
    // updateZoomUI();
  }
});

// lodash _.throttle
const throttleUpdateSize = _.throttle(() => {
  updateSize();
}, 1000 / 60);

fullscreenButton.onclick = fullscreenHandle;

function fullscreenHandle(e) {
  if (e) e.stopPropagation();
  // if (
  //   document.fullscreenElement &&
  //   document.fullscreenElement !== null &&
  //   document.webkitFullscreenElement &&
  //   document.webkitFullscreenElement !== null
  // ) {
  //   isFullscreen = true;
  // } else {
  //   isFullscreen = false;
  // }

  if (isFullscreen == false) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.body.webkitRequestFullscreen) {
      document.body.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
    $("#fullscreen").addClass("btn-regular-screen");
    $("#fullscreen").removeClass("btn-full-screen");
    $("#fullscreen2").addClass("btn-regular-screen");
    $("#fullscreen2").removeClass("btn-full-screen");
    isFullscreen = true;
  } else {
    if (document.exitFullScreen) {
      document.exitFullScreen();
    } else if (document.webkitCancelFullScreen) {
      document.webkitCancelFullScreen();
    }
    $("#fullscreen").removeClass("btn-regular-screen");
    $("#fullscreen").addClass("btn-full-screen");
    $("#fullscreen2").removeClass("btn-regular-screen");
    $("#fullscreen2").addClass("btn-full-screen");
    isFullscreen = false;
  }
}

// handle exit fullscreen with ESC key
document.addEventListener("fullscreenchange", function (event) {
  if (
    !document.fullscreenElement &&
    !document.webkitIsFullScreen &&
    !document.mozFullScreen &&
    !document.msFullscreenElement
  ) {
    //console.log("ESC exit");
    $("#fullscreen").removeClass("btn-regular-screen");
    $("#fullscreen").addClass("btn-full-screen");
    $("#fullscreen2").removeClass("btn-regular-screen");
    $("#fullscreen2").addClass("btn-full-screen");
    document.body.className = document.body.className + " active";
    isFullscreen = false;
    isImageFullscreen = false;
    if (imageZoom > 1) {
      startX = 0;
      startY = 0;
      previewImage.style.left = 0 + "px";
      previewImage.style.top = 0 + "px";
    }
    //updatePreview();
  }
});

// quitButton.onclick = function (e) {
//   let msg = chrome.i18n.getMessage("confirmQuit");
//   let result = confirm(msg);
//   if (result == true) {
//     //saveOptions();
//     window.close();
//   }
// };

zoomSlider.oninput = function (e) {
  e.stopPropagation();
  let originZoom = liveStore["zoom"];
  let targetZoom = parseFloat(Math.abs(zoomSlider.value).toFixed(1));

  // 辨識模式關閉時，直接縮放畫面狀態
  if (!qrCodeTrack.checked) {
    liveStore["zoom"] = targetZoom;
    updateLiveVideoOnZoom(originZoom, targetZoom);
  }
  // 辨識模式打開，倍率鎖定時，重製zoomSlider的數值狀態
  if (qrCodeTrack.checked) {
    if (DetectFn.nowFnLabel === "FN_0") {
      liveStore["zoom"] = originZoom;
      zoomSlider.value = originZoom;
    }
    if (DetectFn.nowFnLabel !== "FN_0" && DetectFn.FnInfo.continuous) {
      // liveStore["zoom"] = targetZoom;
      // zoomSlider.value = targetZoom;
      liveStore["firstTrack"] = false;
      liveStore["zoom"] = targetZoom;
    }
    if (DetectFn.isSlowModel) {
      liveStore["zoom"] = targetZoom;
      updateLiveVideoOnZoom(originZoom, targetZoom);
    }
  }

  // let left = parseInt(v.style.left, 10),
  //   top = parseInt(v.style.top, 10);
  // left = left / ((zoom - 1) * 10);
  // top = top / ((zoom - 1) * 10);
  // zoom = Math.abs(zoomSlider.value);
  // zoom = parseFloat(zoom.toFixed(1));
  // if (zoom == 1) {
  //   v.style.left = 0 + "px";
  //   v.style.top = 0 + "px";
  //   canvasPaint.style.left = 0 + "px";
  //   canvasPaint.style.top = 0 + "px";
  // } else {
  //   v.style.left = left * (zoom - 1) * 10 + "px";
  //   v.style.top = top * (zoom - 1) * 10 + "px";
  // }
  // if (rotate == 90 || rotate == 270) {
  //   if (videoRatio == 1) $("#live").css({ "margin-left": "calc(-40% + 7px)" });
  //   else $("#live").css({ "margin-left": "calc(-110% + 10px)" });
  // } else {
  //   $("#live").css({ "margin-left": "" });
  // }
  // $("#live").css({ "margin-left": "" });
  // v.style[prop] = "scale(" + zoom * shrinkRatio + ") rotate(" + rotate + "deg)" + " " + mirrorStyle + " " + flipStyle;
  // v.style.filter = mirrorFilter + " " + flipFilter;
  // updateLiveFrame();
  // updateZoomUI();
};

zoomSlider.onkeydown = function (e) {
  e.stopPropagation();
};

function increaseExp() {
  if (isX1) {
    if (expSlider.value != 10) {
      let value = parseInt(expSlider.value, 10) + 1;
      expSlider.value = value;
      sendEV(value);
      updateExp();
    }
  } else {
    if (expSlider.value != 15) {
      let value = parseInt(expSlider.value, 10) + 1;
      expSlider.value = value;
      sendEV(value);
      updateExp();
    }
  }
}

function decreaseExp() {
  if (expSlider.value != 1) {
    let value = parseInt(expSlider.value, 10) - 1;
    expSlider.value = value;
    sendEV(value);
    updateExp();
  }
}

expAdd.onmousedown = function (e) {
  if (longpressTimeout) {
    window.clearTimeout(longpressTimeout);
  }
  longpressTimeout = setTimeout(() => {
    if (repeatTimer) {
      window.clearInterval(repeatTimer);
    }
    repeatTimer = setInterval(() => {
      increaseExp();
    }, 100);
  }, 800);

  increaseExp();
};

expAdd.onmouseup = function (e) {
  if (longpressTimeout) {
    window.clearTimeout(longpressTimeout);
  }
  if (repeatTimer) {
    window.clearInterval(repeatTimer);
  }
};

expAdd.onmouseleave = function (e) {
  if (longpressTimeout) {
    window.clearTimeout(longpressTimeout);
  }
  if (repeatTimer) {
    window.clearInterval(repeatTimer);
  }
};

expMinus.onmousedown = function (e) {
  if (longpressTimeout) {
    window.clearTimeout(longpressTimeout);
  }
  longpressTimeout = setTimeout(() => {
    if (repeatTimer) {
      window.clearInterval(repeatTimer);
    }
    repeatTimer = setInterval(() => {
      decreaseExp();
    }, 100);
  }, 800);

  decreaseExp();
};

expMinus.onmouseup = function (e) {
  if (longpressTimeout) {
    window.clearTimeout(longpressTimeout);
  }
  if (repeatTimer) {
    window.clearInterval(repeatTimer);
  }
};

expMinus.onmouseleave = function (e) {
  if (longpressTimeout) {
    window.clearTimeout(longpressTimeout);
  }
  if (repeatTimer) {
    window.clearInterval(repeatTimer);
  }
};

expSlider.onclick = function (e) {
  e.stopPropagation();
  requestHid()
    .then(() => {
      let value = parseInt(expSlider.value, 10);
      sendEV(value);
      updateExp();
    })
    .catch((err) => {
      console.log(err);
    });
};
expSlider.oninput = function (e) {
  e.stopPropagation();
  e.preventDefault();
  let value = parseInt(expSlider.value, 10);
  sendEV(value);
  updateExp();
};

expSlider.onkeydown = function (e) {
  e.stopPropagation();
};

countdownSelect.onchange = saveOptions;
autoreviewSelect.onchange = saveOptions;

displayMicCheck.onchange = function (e) {
  if (displayMicCheck.checked == true) $("#volume").removeClass("hide");
  else $("#volume").addClass("hide");
  //saveOptions();
};

function toggleHideUI() {
  $("#leftMenu").toggleClass("hide");
  $("#controls").toggleClass("hide");
  $("#annotatorControl").toggleClass("hide");
  $("#apps").toggleClass("hide");
  $("#setting").toggleClass("hide");
  $("#folder").toggleClass("hide");
  $("#modal_setting").toggleClass("hide");
  if (recordStart) $("#recordingControl").toggleClass("hide");
  else $("#recordControl").toggleClass("hide");
  //$('#areaReview').toggleClass('hide');
}

var mirrorButton = document.getElementById("mirror");
var selfieMode = false;
var swapMode = false;

const toggleMirror = _.throttle(() => {
  // updateLiveFrame();
  VideoOperate.setLiveTransform({
    mirror: mirrorStyle,
  });
  liveVideo.style.height = `${99.8}%`;
  setTimeout(() => {
    liveVideo.style.height = `${100}%`;
  }, 20);
}, 60);

function toggleSelfie() {
  //if (isGCam) {
  $("aside .tool .btn-camera-flip").toggleClass("active");
  if (selfieMode == false) {
    selfieMode = true;
    mirrorFilter = "FlipH";
    mirrorStyle = "scaleX(-1)";
    toggleMirror();

    // if (isGCam && isV1) {
    //   // send flip on and mirror on command
    //   sendCommand(7);
    //   setTimeout(function () {
    //     sendCommand(9);
    //   }, 500);
    // } else if (isS2Pro) {
    //   sendCommand(8);
    //   mirrorFilter = "";
    //   mirrorStyle = "";
    // }
  } else {
    selfieMode = false;
    mirrorFilter = "";
    mirrorStyle = "";
    toggleMirror();

    // if (isGCam && isV1) {
    //   // send flip off and mirror off command
    //   sendCommand(8);
    //   setTimeout(function () {
    //     sendCommand(10);
    //   }, 500);
    // } else if (isS2Pro) {
    //   sendCommand(7);
    // }
  }

  // liveVideo.style[prop] =
  //   "rotate(" + rotate + "deg) scale(" + zoom * shrinkRatio + ")" + " " + mirrorStyle + " " + flipStyle;
  // liveVideo.style.filter = mirrorFilter + " " + flipFilter;
  //canvasPaint.style[prop] = 'scale(' + zoom + ')' + ' ' + mirrorStyle + ' ' + flipStyle;
  //canvasPaint.style.filter = mirrorFilter + ' ' + flipFilter;
}

function swapCameras(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (pipStream) {
    if (!swapMode) {
      swapMode = true;
    } else {
      swapMode = false;
    }

    let mainStreamCopy = liveVideo.srcObject.clone();
    let pipStreamCopy = pipVideo.srcObject.clone();

    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
    liveVideo.srcObject.getTracks().forEach((track) => {
      track.stop();
    });
    pipStream.getTracks().forEach((track) => {
      track.stop();
    });
    pipVideo.srcObject.getTracks().forEach((track) => {
      track.stop();
    });
    window.stream = null;
    pipStream = null;

    liveVideo.srcObject = pipStreamCopy;
    pipVideo.srcObject = mainStreamCopy;
    window.stream = pipStreamCopy;
    pipStream = mainStreamCopy;

    streamWidth = window.stream.getVideoTracks()[0].getSettings().width;
    streamHeight = window.stream.getVideoTracks()[0].getSettings().height;

    updateSize();
    handleCustomDevice();
    handleQRCodeDetect();
    updatePIPFramePosition();

    drawScreen.updatePaintSize(streamWidth, streamHeight);
    drawScreen.redrawScreen();
  }

  return false;

  //if (isGCam) {
  if (pipStream) {
    // $('aside .tool .btn-camera-flip').toggleClass('active');
    if (selfieMode == false) {
      selfieMode = true;

      try {
        liveVideo.srcObject = pipStream;
      } catch (error) {
        liveVideo.src = URL.createObjectURL(pipStream);
      }

      try {
        pipVideo.srcObject = window.stream;
      } catch (error) {
        pipVideo.src = URL.createObjectURL(window.stream);
      }

      /*
			mirrorFilter = "FlipH";
			mirrorStyle = "scaleX(-1)";

			if (isGCam) {
				// send flip on and mirror on command
				sendCommand(7, 0);
				window.setTimeout(function () {
					sendCommand(9, 3);
				}, 500);
			}
			*/
    } else {
      selfieMode = false;

      try {
        liveVideo.srcObject = window.stream;
      } catch (error) {
        liveVideo.src = URL.createObjectURL(window.stream);
      }

      try {
        pipVideo.srcObject = pipStream;
      } catch (error) {
        pipVideo.src = URL.createObjectURL(pipStream);
      }
      /*
			mirrorFilter = "";
			mirrorStyle = "";

			if (isGCam) {
				// send flip off and mirror off command
				sendCommand(8, 1);
				window.setTimeout(function () {
					sendCommand(10, 4);
				}, 500);
			}
			*/
    }

    liveFreeze = false;
    $(".mark-freeze").removeClass("active");
  }

  //liveVideo.style[prop] = 'rotate(' + rotate + 'deg) scale(' + zoom * shrinkRatio + ')' + ' ' + mirrorStyle + ' ' + flipStyle;
  //liveVideo.style.filter = mirrorFilter + ' ' + flipFilter;
  //if (!isGCam)
  //rotateSign.style[prop] = 'rotate(' + rotate + 'deg)';
  //}
  updateSize();
}

mirrorButton.onclick = toggleSelfie;
swapButton.onclick = swapCameras;
// swapButton2.onclick = swapCameras;

// Effects
keystoneHSlider.oninput = function (e) {
  // let value = parseInt(this.value, 10);
  // let vf = document.getElementById("videoFrame");
  // if (value <= 25) {
  //   keystoneH = "100%";
  //   rotateY = 25 - value;
  // } else {
  //   keystoneH = "0";
  //   rotateY = 360 - value + 25;
  // }
  // vf.style.transformOrigin = keystoneH + " " + keystoneV + " 0";
  // vf.style.transform = "rotateX(" + rotateX + "deg) " + "rotateY(" + rotateY + "deg)";
};

keystoneVSlider.oninput = function (e) {
  // let value = parseInt(this.value, 10);
  // let vf = document.getElementById("videoFrame");
  // if (value <= 25) {
  //   keystoneV = "0";
  //   rotateX = 25 - value;
  // } else {
  //   keystoneV = "100%";
  //   rotateX = 360 - value + 25;
  // }
  // vf.style.transformOrigin = keystoneH + " " + keystoneV + " 0";
  // vf.style.transform = "rotateX(" + rotateX + "deg) " + "rotateY(" + rotateY + "deg)";
};
rotateSlider.oninput = function (e) {
  // let value = parseInt(this.value, 10);
  // rotate = value;
};

brightnessSlider.oninput = function (e) {
  e.stopPropagation();
  e.preventDefault();

  applyFilter();
};

contrastSlider.oninput = function (e) {
  e.stopPropagation();
  e.preventDefault();

  applyFilter();
};

hueSlider.oninput = function (e) {
  e.stopPropagation();
  e.preventDefault();

  applyFilter();
};

saturationSlider.oninput = function (e) {
  e.stopPropagation();
  e.preventDefault();

  applyFilter();
};

sepiaSlider.oninput = function (e) {
  e.stopPropagation();
  e.preventDefault();

  applyFilter();
};

grayscaleSlider.oninput = function (e) {
  e.stopPropagation();
  e.preventDefault();

  applyFilter();
};

// apply filters on video
function applyFilter() {
  let brightness = parseInt(brightnessSlider.value, 10),
    contrast = parseInt(contrastSlider.value, 10),
    hue = parseInt(hueSlider.value, 10),
    saturation = parseInt(saturationSlider.value, 10),
    sepia = parseInt(sepiaSlider.value, 10),
    grayscale = parseInt(grayscaleSlider.value, 10);

  let filter =
    `brightness(${brightness}%)` +
    " " +
    `contrast(${contrast}%)` +
    " " +
    `hue-rotate(${hue}deg)` +
    " " +
    `saturate(${saturation}%)` +
    " " +
    `sepia(${sepia}%)` +
    " " +
    `grayscale(${grayscale}%)`;

  v.style.filter = filter;
}

/*
 * Initialize
 */
window.onbeforeunload = (e) => {
  localStorage["tabOpened"] = "0";
  if (Recorder.isRecordIng) {
    e.returnValue = "";
    if (window.isElectron) {
      Recorder.stop();
      setInterval(() => {
        if (Recorder.isFinish) {
          node_app.closeApp();
        }
      }, 100);
    }
  }
};

var inMac = false;
chrome.runtime.getPlatformInfo(function(info) {
	if (info.os == "mac")
    inMac = true;
});

//new customAlert();

function readArrayBuffer(buf) {
  return new Uint8Array(buf);
}

// read setting first
/*
chrome.storage.sync.get({
	savefile: DEFAULT_SAVEFILE,
	videosource: "",
	resolution: 5,	// 1600x1200
	folderid: ""
}, function (items) {
	libraryLocation = items.savefile;
	savedDevice = items.videosource;
	savedResolution = items.resolution;
	folderID = items.folderid;
	//console.log("folderID when init: " + folderID);
	if (localStorage['firstInstall'] == '0' && libraryLocation == 2) {
		chrome.identity.getAuthToken({
			interactive: true
		}, function (t) {
			if (chrome.runtime.lastError) {
				console.warn("Whoops.. " + chrome.runtime.lastError.message);
			} else {
				authToken = t;
				if (authToken === undefined) {
					//if (libraryLocation == 2)
					//	listFiles();
				} else {
					// Get Google Drive folders
					let f = new DriveService({
						token: authToken,
						folderName: DEFAULT_FOLDER
					});
					f.getFolderId().then(function (i) {
						folderID = i;
					}, function (e) {
						//console.log(e);
					});
				}
				updateLogin(listFiles);
				//listFiles();
			}
		});
	}
});
*/

function accessPermissions() {
  return navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((stream) => {
    stream.getTracks().forEach((track) => track.stop());
  });
}

function checkCameraPermissions(devices) {
  // 如果是firefox或是safari會無法使用navigator.permissions api來請求權限因此會導致畫面出不來
  // 需要直接呼叫一次navigator.mediaDevices.getUserMedia請求權限
  return new Promise(async (resolve, reject) => {
    let isAccessFireFoxCamera = true;
    devices.forEach((device) => {
      if (device.kind === "videoinput" && device.label === "") {
        isAccessFireFoxCamera = false;
      }
    });
    if (isAccessFireFoxCamera) {
      resolve(devices);
    }
    if (!isAccessFireFoxCamera) {
      try {
        let mediaStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        if (mediaStream) {
          devices = await navigator.mediaDevices.enumerateDevices();
          resolve(devices);
        }
      } catch (error) {
        reject(error);
      }
    }
  });
}

// Use old-style gUM to avoid requirement to enable the
// Enable experimental Web Platform features flag in Chrome 49
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

const main = async () => {
  try {
    await accessPermissions(); // check permission first
    let deviceList = await navigator.mediaDevices.enumerateDevices(); // get device list
    appendAudioOption([...deviceList]); // append audio option
    appendVideoOption([...deviceList]); // append video option
    verifyOKIOCamera([...deviceList]); // handle OKIO Camera
    selectVideoOption(); // set select video option value
    selectAudioOption(); // set select audio option value
    getSupportResolution(); // get support resolution
    initializeFlagsAndHid(); // initialize flags and hid
    getStream(); // get stream
  } catch (error) {
    console.log(error);
  }
};
fetch(new URL("../assets/resolutions.json", import.meta.url))
  .then((resp) => {
    if (!resp.ok) {
      throw new Error(`Failed to load camera resolutions: ${resp.status} ${resp.statusText}`);
    }
    return resp.json();
  })
  .then(function (jsonData) {
    OKIODeviceList = jsonData;
    main();
  })
  .catch((error) => {
    console.error("Failed to initialize camera settings.", error);
  });


window.___gcfg = {
  parsetags: "explicit",
};

//loadOptions();
if (localStorage["tabOpened"] != "1") {
  localStorage["tabOpened"] = "1";
}

//chrome.tabs.query({active: true}, function(tabs){
/*
chrome.tabs.getCurrent(function(tab) {
	curTab = tab;
	focused = true;
});
*/

window.addEventListener("focus", function () {
  focused = true;
});

window.addEventListener("blur", function () {
  focused = false;
});

function listAllFiles(pageToken, callback) {
  let f = new DriveService({
    token: authToken,
    folderName: DEFAULT_FOLDER,
  });
  if (folderID) {
    f.listFiles(folderID, pageToken).then(
      function (list) {
        //console.log(list);
        allFiles = allFiles.concat(list.files);
        if (list.nextPageToken) {
          listAllFiles(list.nextPageToken, callback);
        } else {
          callback(allFiles);
        }
      },
      function (e) {
        //console.log(e);
      }
    );
  }
}

function checkDriveFile(datas) {
  if (libraryLocation == 2) {
    chrome.identity.getAuthToken(
      {
        interactive: !0,
      },
      function (t) {
        authToken = t;
        updateLogin();
        //let f = new DriveService({
        //	token: authToken,
        //	folderName: DEFAULT_FOLDER
        //});
        let found = false;
        if (folderID) {
          //f.listFiles(folderID).then(function (f) {
          allFiles = [];
          listAllFiles(0, function (f) {
            //console.log(f);
            let exist = false;
            for (let i = 0; i < f.length; i++) {
              exist = false;
              for (let j = 0; j < datas.length; j++) {
                if (f[i].originalFilename == datas[j].filename) {
                  exist = true;
                  break;
                }
              }
              if (!exist) {
                // restore deleted file or upload from another computer
                insertDB(curUser, f[i].originalFilename, true, f[i].id);
                let url = "https://drive.google.com/thumbnail?authuser=0&sz=w640&id=" + f[i].id;
                addFigure(f[i].originalFilename, true, url, null, f[i].id);
                filenameList.push(f[i].originalFilename);
              }
            }
            for (let j = 0; j < datas.length; j++) {
              found = false;
              let figure = document.getElementById(datas[j].filename),
                item,
                file;
              if (figure != null) {
                item = document.getElementById(datas[j].filename).childNodes[0];
                file = document.getElementById(datas[j].filename).childNodes[0].childNodes[0];
                if (datas[j].user == curUser) {
                  for (let i = 0; i < f.length; i++) {
                    if (f[i].id == datas[j].objectId) {
                      found = true;
                      if (file.src.indexOf("https") != 0) {
                        if (f[i].thumbnailLink) {
                          //console.log("update url");
                          let url = "https://drive.google.com/thumbnail?authuser=0&sz=w640&id=" + datas[j].objectId;
                          if (isVideo(datas[j].filename)) {
                            item.removeChild(item.lastChild);
                            let content = document.createElement("img");
                            content.src = url;
                            item.appendChild(content);
                          } else file.src = url;
                          figure.setAttribute("data-id", f[i].id);
                          deleteLocalFile(datas[j].filename);
                        }
                      }
                      break;
                    } else if (f[i].originalFilename == datas[j].filename) {
                      // not get uploaded response properly
                      //console.log("updatedb in checkdrivefile, " + datas[j].filename);
                      updateDB(curUser, datas[j].filename, true, f[i].id);
                      found = true;
                      if (f[i].thumbnailLink) {
                        //console.log("update url");
                        let url = "https://drive.google.com/thumbnail?authuser=0&sz=w640&id=" + datas[j].objectId;
                        if (isVideo(datas[j].filename)) {
                          item.removeChild(item.lastChild);
                          let content = document.createElement("img");
                          content.src = url;
                          item.appendChild(content);
                        } else file.src = url;
                        figure.setAttribute("data-id", f[i].id);
                        deleteLocalFile(datas[j].filename);
                      }
                      break;
                    }
                  }
                  if (liveUploading == 0 && found == false) {
                    if (datas[j].uploaded == false) {
                      if (uploadingFiles.indexOf(datas[j].filename) == -1) {
                        uploadingFiles.push(datas[j].filename);
                        // start upload file
                        loadTheFile(datas[j].filename, undefined, function (content) {
                          if (isVideo(datas[j].filename) || isGif(datas[j].filename)) {
                            let blob = new Blob([new Uint8Array(content)]);
                            uploadData(blob, datas[j].filename, true, null, true);
                          } else if (isJpg(datas[j].filename)) {
                            uploadData(dataURLtoBlob(content), datas[j].filename, true, null, true);
                          }
                        });
                      }
                    } else {
                      // user delete file on Google Drive
                      deleteFigure(datas[j].filename);
                      deleteDB(datas[j].filename);
                      currentPreviewIndex = filenameList.indexOf(datas[j].filename);
                      let remove = filenameList.splice(currentPreviewIndex, 1);
                      if (currentPreviewIndex == filenameList.length) currentPreviewIndex = filenameList.length - 1;
                      if (filenameList.length == 0) {
                        $("#noFile").removeClass("hide");
                        noFile.style.display = "flex";
                      }
                    }
                  }
                } else if (datas[j].uploaded == false) {
                  if (uploadingFiles.indexOf(datas[j].filename) == -1) {
                    uploadingFiles.push(datas[j].filename);
                    // start upload file
                    loadTheFile(datas[j].filename, undefined, function (content) {
                      if (isVideo(datas[j].filename) || isGif(datas[j].filename)) {
                        let blob = new Blob([new Uint8Array(content)]);
                        uploadData(blob, datas[j].filename, true, null, true);
                      } else if (isJpg(datas[j].filename)) {
                        uploadData(dataURLtoBlob(content), datas[j].filename, true, null, true);
                      }
                    });
                  }
                }
              }
            }
            //console.log("drive file checked");
          });
        }
      }
    );
  }
}

window.setInterval(function () {
  if (libraryLocation == 2 && authToken && localStorage["firstInstall"] == "0") {
    getAllDB(checkDriveFile);
  }
}, 60000);

/*
 * IndexedDB
 */
let indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;

let request = indexedDB.open("fileDB", 1);
let db;

request.onsuccess = function (evt) {
  // save db
  //console.log("IndexedDB success");
  db = request.result;

  if (window.requestFileSystem) {
    initFileSystem();
  } else {
    //console.log('Sorry! Your browser doesn\'t support the FileSystem API :(');
  }

  if (libraryLocation == 2 && authToken && localStorage["firstInstall"] == "0") {
    getAllDB(checkDriveFile);
  }
};

request.onerror = function (evt) {
  //console.log("IndexedDB error: " + evt.target.errorCode);
};

request.onupgradeneeded = function (evt) {
  //console.log("onupgradeneeded");
  let objectStore = evt.currentTarget.result.createObjectStore("file", {
    keyPath: "id",
    autoIncrement: true,
  });

  objectStore.createIndex("user", "user", { unique: false });
  objectStore.createIndex("filename", "filename", { unique: false });
  objectStore.createIndex("uploaded", "uploaded", { unique: false });
  objectStore.createIndex("objectId", "objectId", { unique: true });
};

if (localStorage["firstInstall"] == "1") {
  localStorage["firstInstall"] = "0";
  $("#modal_first_setting").addClass("active");
}

function insertDB(user, filename, uploaded, id = "") {
  let transaction = db.transaction("file", "readwrite" /*IDBTransaction.READ_WRITE*/);
  let objectStore = transaction.objectStore("file");
  let data;
  if (id == "") {
    data = { user: user, filename: filename, uploaded: uploaded };
  } else {
    data = { user: user, filename: filename, uploaded: uploaded, objectId: id };
  }
  let request = objectStore.add(data);
  request.onsuccess = function (evt) {
    //console.log("insert db success");
  };
  request.onerror = function (evt) {
    //console.log(evt);
  };
}

function updateDB(user, filename, uploaded, id) {
  let transaction = db.transaction("file", "readwrite" /*IDBTransaction.READ_WRITE*/);
  let objectStore = transaction.objectStore("file");
  objectStore = objectStore.index("filename");
  let request = objectStore.openCursor(IDBKeyRange.only(filename), IDBCursor.NEXT);
  request.onsuccess = function (evt) {
    let cursor = evt.target.result;
    if (cursor) {
      if (cursor.value.filename == filename) {
        let data = cursor.value;
        data.user = user;
        data.uploaded = uploaded;
        data.objectId = id;
        let res = cursor.update(data);
        res.onsuccess = function (e) {
          //console.log("update " + filename + " " + uploaded + " success!!");
        };
        res.onerror = function (e) {
          //console.log("update failed!!");
        };
        //updateUploadFlag(filename, uploaded);
      }
      //cursor.continue();
    }
  };
}

function getDB(filename, callback) {
  let transaction = db.transaction("file", "readwrite" /*IDBTransaction.READ_WRITE*/);
  let objectStore = transaction.objectStore("file");
  objectStore = objectStore.index("filename");
  let request = objectStore.openCursor(IDBKeyRange.only(filename), IDBCursor.NEXT);
  request.onsuccess = function (evt) {
    let cursor = evt.target.result;
    if (cursor) {
      let uploaded = cursor.value.uploaded;
      callback ? callback(cursor.value) : null;
      //console.log("get " + filename + " " + uploaded + " " + cursor.value.url);
      //cursor.continue();
    } else {
      //console.log("file not found");
    }
  };
}

function deleteDB(filename) {
  let transaction = db.transaction("file", "readwrite" /*IDBTransaction.READ_WRITE*/);
  let objectStore = transaction.objectStore("file");
  objectStore = objectStore.index("filename");
  let request = objectStore.openCursor(IDBKeyRange.only(filename), IDBCursor.NEXT);
  request.onsuccess = function (evt) {
    let cursor = evt.target.result;
    if (cursor) {
      let res = cursor.delete();
      res.onsuccess = function (e) {
        //console.log("delete db " + cursor.value.filename + " success");
      };
      res.onerror = function (e) {
        //console.log("delete failed!!");
      };
      //cursor.continue();
    }
  };
}

function deleteAllDB() {
  let transaction = db.transaction("file", "readwrite" /*IDBTransaction.READ_WRITE*/);
  let objectStore = transaction.objectStore("file");
  let request = objectStore.clear();
  request.onsuccess = function (evt) {
    //console.log("clear all data");
  };
}

function getAllDB(callback) {
  let transaction = db.transaction("file", "readwrite" /*IDBTransaction.READ_WRITE*/);
  let objectStore = transaction.objectStore("file");
  objectStore = objectStore.index("filename");
  objectStore.getAll().onsuccess = function (event) {
    //console.log(event.target.result);
    callback ? callback(event.target.result) : null;
  };
}

function updateUploadFlag(filename, uploaded) {
  let content = document.getElementById(filename);
  let u = content.lastChild;
  if (u.nodeName != "A") {
    // no upload flag yet
    let uploadFlag = document.createElement("a");
    uploadFlag.title = "Uploaded to Cloud";
    uploadFlag.className = "upload tooltip";
    let image = document.createElement("img");
    image.src = "image/google-drive-indicator-image.png";
    uploadFlag.appendChild(image);
    content.appendChild(uploadFlag);
  }
}

/*
 * Utilities Functions
 */
function getTimestamp() {
  let d = new Date(),
    y = d.getFullYear(),
    m = ("00" + (d.getMonth() + 1)).slice(-2),
    e = ("00" + d.getDate()).slice(-2),
    h = ("00" + d.getHours()).slice(-2),
    n = ("00" + d.getMinutes()).slice(-2),
    s = ("00" + d.getSeconds()).slice(-2),
    ms = ("00" + d.getMilliseconds()).slice(-3),
    i = y + "-" + m + "-" + e + "_" + h + "-" + n + "-" + s + "-" + ms;
  return i;
}

function asksForAuthToken() {
  return (
    console.log("get auth token interactively"),
    new Promise(function (e, t) {
      chrome.identity.getAuthToken(
        {
          interactive: !0,
        },
        function (o) {
          o ? e(o) : t();
        }
      );
    })
  );
}

function copyToClipboard(e) {
  //console.log("copy short URL to clipboard");
  let t = document.createElement("input");
  (t.style.position = "fixed"),
    (t.style.opacity = 0),
    (t.value = e),
    document.body.appendChild(t),
    t.select(),
    document.execCommand("Copy"),
    document.body.removeChild(t);
  //showAlert("URL of the upload file has been put in your clipboard", "OK");
}

function downloadFile(filename, data) {
  let a = document.createElement("a");
  a.style.display = "none";
  a.href = data;
  a.download = filename;
  a.onclick = (e) => {
    e.stopPropagation();
  };
  a.click();
  setTimeout(function () {
    window.URL.revokeObjectURL(data);
    a = null;
  }, 100);
}

function showAlert(msg, btn, msg2 = null, msg3 = null) {
  let dialog = document.createElement("dialog");
  dialog.style.overflowY = "hidden";
  dialog.style.width = "60%";
  dialog.textContent = msg;
  let br = document.createElement("br");
  let br1 = document.createElement("br");
  let br2 = document.createElement("br");
  let button = document.createElement("button");
  button.textContent = btn;
  if (msg2 != null) {
    let text = document.createElement("span");
    let br = document.createElement("br");
    let br1 = document.createElement("br");
    text.textContent = msg2;
    dialog.appendChild(br);
    dialog.appendChild(br1);
    dialog.appendChild(text);
  }
  if (msg3 != null) {
    let text = document.createElement("span");
    let br = document.createElement("br");
    let br1 = document.createElement("br");
    text.textContent = msg3;
    dialog.appendChild(br);
    dialog.appendChild(br1);
    dialog.appendChild(text);
  }
  dialog.appendChild(br);
  dialog.appendChild(br1);
  dialog.appendChild(br2);
  dialog.appendChild(button);
  button.addEventListener("click", function (e) {
    if (e) {
      e.stopPropagation();
    }
    dialog.close();
    dialog.remove();
  });
  document.body.appendChild(dialog);
  dialog.showModal();
}

function CustomAlert() {
  this.render = function (title, dialog, btn) {
    let winW = window.innerWidth;
    let winH = window.innerHeight;
    let dialogoverlay = document.getElementById("dialogoverlay");
    let dialogbox = document.getElementById("dialogbox");
    dialogoverlay.style.display = "block";
    dialogoverlay.style.height = winH + "px";
    dialogbox.style.left = winW / 2 - 550 * 0.5 + "px";
    dialogbox.style.top = "100px";
    dialogbox.style.display = "block";
    let button = document.createElement("button");
    button.textContent = btn;
    button.addEventListener("click", this.ok);
    document.getElementById("dialogboxhead").innerHTML = title;
    document.getElementById("dialogboxbody").innerHTML = dialog;
    //document.getElementById('dialogboxfoot').innerHTML = '<button onclick="Alert.ok()">OK</button>';
    document.getElementById("dialogboxfoot").appendChild(button);
  };
  this.ok = function () {
    document.getElementById("dialogbox").style.display = "none";
    document.getElementById("dialogoverlay").style.display = "none";
    let node = document.getElementById("dialogboxfoot");
    while (node.lastChild) {
      node.removeChild(node.lastChild);
    }
  };
}

function CustomConfirm(yesCallback, noCallback) {
  this.render = function (title, dialog) {
    let winW = window.innerWidth;
    let winH = window.innerHeight;
    let dialogoverlay = document.getElementById("dialogoverlay");
    let dialogbox = document.getElementById("dialogbox");
    dialogoverlay.style.display = "block";
    dialogoverlay.style.height = winH + "px";
    dialogbox.style.left = winW / 2 - 550 * 0.5 + "px";
    dialogbox.style.top = "100px";
    dialogbox.style.display = "block";

    document.getElementById("dialogboxhead").innerHTML = title;
    document.getElementById("dialogboxbody").innerHTML = dialog;
    let yes = document.createElement("button"),
      no = document.createElement("button"),
      sp = document.createElement("span");
    yes.textContent = "Yes";
    no.textContent = "No";
    yes.addEventListener("click", this.yes);
    no.addEventListener("click", this.no);
    sp.innerHTML = "&nbsp;&nbsp;";

    //document.getElementById('dialogboxfoot').innerHTML = '<button onclick="Confirm.yes()">Yes</button> <button onclick="Confirm.no()">No</button>';
    document.getElementById("dialogboxfoot").appendChild(yes);
    document.getElementById("dialogboxfoot").appendChild(sp);
    document.getElementById("dialogboxfoot").appendChild(no);
  };
  this.yes = function () {
    document.getElementById("dialogbox").style.display = "none";
    document.getElementById("dialogoverlay").style.display = "none";
    let node = document.getElementById("dialogboxfoot");
    while (node.lastChild) {
      node.removeChild(node.lastChild);
    }
    yesCallback();
  };
  this.no = function () {
    document.getElementById("dialogbox").style.display = "none";
    document.getElementById("dialogoverlay").style.display = "none";
    let node = document.getElementById("dialogboxfoot");
    while (node.lastChild) {
      node.removeChild(node.lastChild);
    }
    noCallback();
  };
}

function showFileInfo(filename) {
  let dialog = document.createElement("dialog");
  let table = document.createElement("table"),
    tr,
    td;
  let dirEntry = fs.root;

  dialog.style.overflowY = "hidden";

  // name
  tr = document.createElement("tr");
  table.appendChild(tr);
  td = document.createElement("td");
  td.appendChild(document.createTextNode(chrome.i18n.getMessage("infoFilename")));
  tr.appendChild(td);
  td = document.createElement("td");
  td.appendChild(document.createTextNode(filename));
  tr.appendChild(td);

  // video duration
  if (isVideo(filename)) {
    let item, resolution;
    let show = true;
    if (singleViewMode) item = document.getElementById("recorded");
    else {
      item = document.getElementById(filename).childNodes[0].childNodes[0];
      if (item.tagName.toLowerCase() == "img") show = false;
    }

    if (show) {
      tr = document.createElement("tr");
      table.appendChild(tr);
      td = document.createElement("td");
      td.appendChild(document.createTextNode(chrome.i18n.getMessage("infoDuration")));
      tr.appendChild(td);
      td = document.createElement("td");
      td.appendChild(document.createTextNode(item.duration + chrome.i18n.getMessage("infoSecond")));
      tr.appendChild(td);

      resolution = item.videoWidth + "x" + item.videoHeight;

      tr = document.createElement("tr");
      table.appendChild(tr);
      td = document.createElement("td");
      td.appendChild(document.createTextNode(chrome.i18n.getMessage("infoResolution")));
      tr.appendChild(td);
      td = document.createElement("td");
      td.appendChild(document.createTextNode(resolution));
      tr.appendChild(td);
    }
  }

  // image resolution
  if (isImage(filename)) {
    let item, resolution;
    if (singleViewMode) {
      item = document.getElementById("preview");
      resolution = item.width + "x" + item.height;
    } else {
      item = document.getElementById(filename).childNodes[0].childNodes[0];
      resolution = item.naturalWidth + "x" + item.naturalHeight;
    }

    tr = document.createElement("tr");
    table.appendChild(tr);
    td = document.createElement("td");
    td.appendChild(document.createTextNode(chrome.i18n.getMessage("infoResolution")));
    tr.appendChild(td);
    td = document.createElement("td");
    td.appendChild(document.createTextNode(resolution));
    tr.appendChild(td);
  }

  dirEntry.getFile(filename, {}, function (fileEntry) {
    fileEntry.getMetadata(function (metadata) {
      // create date
      tr = document.createElement("tr");
      table.appendChild(tr);
      td = document.createElement("td");
      td.appendChild(document.createTextNode(chrome.i18n.getMessage("infoCreateDate")));
      tr.appendChild(td);
      td = document.createElement("td");
      td.appendChild(document.createTextNode(metadata.modificationTime));
      tr.appendChild(td);

      // size
      tr = document.createElement("tr");
      table.appendChild(tr);
      td = document.createElement("td");
      td.appendChild(document.createTextNode(chrome.i18n.getMessage("infoFilesize")));
      tr.appendChild(td);
      td = document.createElement("td");
      td.appendChild(document.createTextNode(metadata.size + " bytes"));
      tr.appendChild(td);
    });
  });

  dialog.appendChild(table);
  let br = document.createElement("br");
  let br2 = document.createElement("br");
  let button = document.createElement("button");
  button.textContent = "OK";
  dialog.appendChild(br);
  dialog.appendChild(br2);
  dialog.appendChild(button);
  button.addEventListener("click", function () {
    dialog.close();
  });
  document.body.appendChild(dialog);
  dialog.showModal();
}

function updateLogin(callback = null) {
  if (authToken === undefined) {
    login = false;
    $("#settingSignin").removeClass("hide");
    $("#settingSignout").addClass("hide");
    $("#driveSignin").removeClass("hide");
    $("#driveSignout").addClass("hide");
    $("#classroomSignin").removeClass("hide");
    $("#classroomSignout").addClass("hide");
    $("#startUpload").addClass("disabled");
    $("#classroomCreate").addClass("disabled");
    $("#setupSignin").removeClass("hide");
    $("#setupSignout").addClass("hide");
  } else if ($("#settingSignout").hasClass("hide")) {
    login = true;
    chrome.identity.getProfileUserInfo(function (userInfo) {
      let s = new XMLHttpRequest();
      s.open("GET", "https://www.googleapis.com/oauth2/v1/userinfo?access_token=" + authToken, !0),
        s.setRequestHeader("Authorization", "Bearer " + authToken),
        s.setRequestHeader("Content-Type", "application/json"),
        (s.onload = function (e) {
          if (200 == e.target.status || 201 == e.target.status) {
            let r = JSON.parse(e.target.response);
            if (r) {
              //console.log("User information get!");
              $("#settingSignin").addClass("hide");
              $("#settingSignout").removeClass("hide");
              $("#driveSignin").addClass("hide");
              $("#driveSignout").removeClass("hide");
              $("#classroomSignin").addClass("hide");
              $("#classroomSignout").removeClass("hide");
              $("#setupSignin").addClass("hide");
              $("#setupSignout").removeClass("hide");
              username.innerHTML = r.given_name + " " + r.family_name;
              usernameDrive.innerHTML = r.given_name + " " + r.family_name;
              usernameClassroom.innerHTML = r.given_name + " " + r.family_name;
              usernameSetup.innerHTML = r.given_name + " " + r.family_name;
              email.innerHTML = r.email;
              emailDrive.innerHTML = r.email;
              emailClassroom.innerHTML = r.email;
              emailSetup.innerHTML = r.email;
              curUser = r.email;
              let img = userAvatar.firstChild;
              img.src = r.picture;
              img = userAvatarDrive.firstChild;
              img.src = r.picture;
              img = userAvatarClassroom.firstChild;
              img.src = r.picture;
              img = userAvatarSetup.firstChild;
              img.src = r.picture;
              $("#startUpload").removeClass("disabled");
              $("#classroomCreate").removeClass("disabled");
              $("#nextStep").removeClass("disabled");

              callback ? callback() : null;
              //console.log(r);
            } else console.log("No User information");
          } else console.log("Get User information error");
        }),
        (s.onerror = function (e) {
          console.log("Get User information error");
        }),
        s.send(null);
      //email.innerHTML = userInfo.email;
    });
  }
}

function updateExp() {
  switch (expSlider.value) {
    case "15":
      if (!isX1) expValue.innerHTML = "+7";
      break;

    case "14":
      if (!isX1) expValue.innerHTML = "+6";
      break;

    case "13":
      if (!isX1) expValue.innerHTML = "+5";
      break;

    case "12":
      if (!isX1) expValue.innerHTML = "+4";
      break;

    case "11":
      if (!isX1) expValue.innerHTML = "+3";
      break;

    case "10":
      if (isX1) expValue.innerHTML = "10";
      else expValue.innerHTML = "+2";
      break;

    case "9":
      if (isX1) expValue.innerHTML = "9";
      else expValue.innerHTML = "+1";
      break;

    case "8":
      if (isX1) expValue.innerHTML = "8";
      else expValue.innerHTML = "+0";
      break;

    case "7":
      if (isX1) expValue.innerHTML = "7";
      else expValue.innerHTML = "-1";
      break;

    case "6":
      if (isX1) expValue.innerHTML = "6";
      else expValue.innerHTML = "-2";
      break;

    case "5":
      if (isX1) expValue.innerHTML = "5";
      else expValue.innerHTML = "-3";
      break;

    case "4":
      if (isX1) expValue.innerHTML = "4";
      else expValue.innerHTML = "-4";
      break;

    case "3":
      if (isX1) expValue.innerHTML = "3";
      else expValue.innerHTML = "-5";
      break;

    case "2":
      if (isX1) expValue.innerHTML = "2";
      else expValue.innerHTML = "-6";
      break;

    case "1":
      if (isX1) expValue.innerHTML = "1";
      else expValue.innerHTML = "-7";
      break;
  }
}

function updateZoomW1HidData(hid) {
  // 70xx、71xx、72xx、73xx、74xx

  let W1ResoultionWidth = Number(resolutionSelect[resolutionSelect.selectedIndex].dataset.resWidth);
  if (hid[0] === 7 && hid[1] >= 0 && hid[1] <= 4) {
    if (W1ResoultionWidth < 2592) {
      updateLSZ(hid[1] + 1);
    }
  }
  // zoom up
  if (hid[0] === 7 && hid[1] === 0 && hid[2] === 1) {
    handleZoom("zoomin");
    handleZoom("zoomin");
  }
  // zoom out
  if (hid[0] === 7 && hid[1] === 0 && hid[2] === 0) {
    handleZoom("zoomout");
    handleZoom("zoomout");
  }
  // if lsz already scale
  if (hid[0] === 7 && hid[1] === 4 && hid[2] === 1) {
    handleZoom("zoomin");
    handleZoom("zoomin");
  }
}

function updateZoomS2ProHidData(hid) {
  if (hid[0] === 7 && hid[1] >= 0 && hid[1] <= 4) {
    updateLSZ(hid[1] + 1);
  }
}

function updateZoom4KHidData(hid) {
  // 70xx、71xx、72xx、73xx、74xx

  let { vidpid, selectedIndex } = videoSelect.options[videoSelect.selectedIndex].dataset;
  let deviceInfo = OKIODeviceList[`${vidpid}`] || null;
  let liveZoom = parseFloat(liveStore["zoom"].toFixed(1));

  let W1ResoultionWidth = Number(resolutionSelect[resolutionSelect.selectedIndex].dataset.resWidth),
      W1ResoultionHeight = Number(resolutionSelect[resolutionSelect.selectedIndex].dataset.resHeight);

  if (hid[0] === 7 && hid[1] >= 0 && hid[1] <= 4) {
    if (initFinished) {
      if (W1ResoultionWidth < 2592) {
        updateLSZ(hid[1] + 1);
      }
      else if(hid[1] == 0) {
        //currentLSZ ++;
        //if (currentLSZ == 6)
        //  currentLSZ = 1;

        let zoom = deviceInfo.zoom[`${W1ResoultionWidth}x${W1ResoultionHeight}`];
        let targetZoom = liveZoom;
        if (isS2Plus || isT4K) {
          if (liveZoom >= zoom[3])
            targetZoom = 1;
          else {
            for (let i = 0; i < 4; i++) {
              if (zoom[i] > liveZoom) {
                targetZoom = zoom[i];
                break;
              }
            }
          }
        }
        else if (isW4K) {
          if(hid[2] == 1 && liveZoom != 6) { // zoom+
            if (liveZoom >= zoom[3] && liveZoom < 6) {
              targetZoom = parseFloat((liveZoom + 0.2).toFixed(2));
              if (targetZoom > 6)
                targetZoom = 6;
            }
            else {
              for (let i = 0; i < 4; i++) {
                if (zoom[i] > liveZoom) {
                  targetZoom = zoom[i];
                  break;
                }
              }
            }
          }
          else if (hid[2] == 2 && liveZoom != 1) { // zoom-
            if (liveZoom >= zoom[3] + 0.2) {
              targetZoom = parseFloat((liveZoom - 0.2).toFixed(2));
            }
            else if (liveZoom <= zoom[0]) {
              targetZoom = 1;
            } 
            else {
              for (let i = 3; i >= 0; i--) {
                if (zoom[i] < liveZoom) {
                  targetZoom = zoom[i];
                  break;
                }
              }
            }
          }
        }
        //let targetZoom = zoom[Number(currentLSZ) - 2];
        //if (currentLSZ == 1)
        //  targetZoom = 1;
        //console.log(zoom[index]);
        liveStore["zoom"] = targetZoom;
        updateLiveVideoOnZoom(liveZoom, targetZoom);
        //updateLSZ(currentLSZ);
        updateOSD(targetZoom);
      }
    }
    else {
      initFinished = true;
    }
  }
}

function updateRotate() {
  rotateSign.style.transform = `rotate(${rotate}deg)`;
  // if (rotate == 0) rotateSign.innerHTML = "0°";
  // else if (rotate == 90) rotateSign.innerHTML = "+90°";
  // else if (rotate == 180) rotateSign.innerHTML = "180°";
  // else if (rotate == 270 || rotate == -90) rotateSign.innerHTML = "-90°";
}

let LSZTimer = null;
function updateLSZ(LSZLevel) {
  $(".lsz").removeClass("hide");
  $(".lsz-lv").attr(`class`, `lsz-lv lsz-lv-${LSZLevel}`);
  if (LSZTimer) {
    clearTimeout(LSZTimer);
  }
  LSZTimer = setTimeout(() => {
    $(".lsz").addClass("hide");
  }, 2000);
}

let OSDTimer = null;
function updateOSD(zoom) {
  let tempCanvas = document.getElementById('tempCanvas');
  let ctx = tempCanvas.getContext("2d");
  let text = zoom.toString() + "x";

  ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
  ctx.font = "bold 40px Arial";
  ctx.fillStyle = "#0c8ed7";
  ctx.fillText(text, 0, 30);
  $(".lsz").addClass("hide");
  $("#tempCanvas").removeClass("hide");

  if (OSDTimer) {
    clearTimeout(OSDTimer);
  }
  OSDTimer = setTimeout(() => {
    $("#tempCanvas").addClass("hide");
  }, 2000);

}

var spk = new AudioContext();

function beep(vol, freq, duration) {
  let v = spk.createOscillator(),
    u = spk.createGain();
  //console.log(spk);
  v.connect(u);
  v.frequency.value = freq;
  v.type = "square";
  u.connect(spk.destination);
  u.gain.value = vol * 0.01;
  v.start(spk.currentTime);
  v.stop(spk.currentTime + duration * 0.001);
}

function focusTab() {
  if (curTab != null) {
    // Set focus on window
    chrome.windows.update(curTab.windowId, { focused: true }, function (window) {});
    // Set focus on tab
    chrome.tabs.update(curTab.id, { active: true }, function (tab) {});
    focused = true;
  }
}

function eventFire(el, etype) {
  if (el.fireEvent) {
    el.fireEvent("on" + etype);
  } else {
    var evObj = document.createEvent("Events");
    evObj.initEvent(etype, true, false);
    el.dispatchEvent(evObj);
  }
}

/**
 * 添加相機裝置到列表中，選項的 vidpid 會記錄在 data-*，data-vid、data-pid、data-vidpid，方便之後取用
 */
function appendVideoOption(deviceInputs) {
  const videoInputs = deviceInputs.filter((device) => device.kind === "videoinput");

  window.videoInputs = [...videoInputs];

  while (videoSelect.firstChild) {
    videoSelect.removeChild(videoSelect.firstChild);
  }
  while (pipSelect.firstChild) {
    pipSelect.removeChild(pipSelect.firstChild);
  }
  initFinished = false;

  let pipOption = document.createElement("option");
  pipOption.text = "None";
  pipOption.value = "0";
  pipOption.dataset.vidpid = "";
  pipSelect.appendChild(pipOption);

  videoInputs.forEach((deviceInfo, index) => {
    let option = document.createElement("option");
    let vidpidReg = new RegExp(/(.{4}):(.{4})/);
    // match vidpid ex: "example camera (abcd:1234)" => [abcd:1234,abcd,1234]
    let vidpid = null,
      vid = null,
      pid = null,
      vidpidMatch;

    vidpidMatch = deviceInfo.label.match(vidpidReg) || null;
    if (vidpidMatch) {
      vidpid = vidpidMatch[0];
      vid = vidpidMatch[1];
      pid = vidpidMatch[2];
    }

    option.value = deviceInfo.deviceId;
    option.text = deviceInfo.label || `camera ${index}`;
    option.dataset.vid = `${vid}`;
    option.dataset.pid = `${pid}`;
    option.dataset.vidpid = `${vidpid}`;
    videoSelect.appendChild(option);

    let pipOption = document.createElement("option");
    pipOption = option.cloneNode(option);
    pipSelect.appendChild(pipOption);
  });

  videoSelect.selectedIndex = -1;
}

/**
 * 添加聲音裝置到列表中，選項的 vidpid 會記錄在 data-*，data-vid、data-pid、data-vidpid，方便之後取用
 */
function appendAudioOption(deviceInputs) {
  const audioInputs = deviceInputs.filter((device) => device.kind === "audioinput");
  window.audioInputs = [...audioInputs];

  // append audio input
  while (audioSelect.firstChild) {
    audioSelect.removeChild(audioSelect.firstChild);
  }

  let option = document.createElement("option");
  option.text = "None";
  option.value = "";
  audioSelect.appendChild(option);

  audioInputs.forEach((deviceInfo, index) => {
    let option = document.createElement("option");
    let vidpidReg = new RegExp(/(.{4}):(.{4})/);
    // match vidpid ex: "example camera (abcd:1234)" => [abcd:1234,abcd,1234]
    let vidpid = null,
      vid = null,
      pid = null,
      vidpidMatch;

    vidpidMatch = deviceInfo.label.match(vidpidReg) || null;
    if (vidpidMatch) {
      vidpid = vidpidMatch[0];
      vid = vidpidMatch[1];
      pid = vidpidMatch[2];
    }

    option.value = deviceInfo.deviceId;
    option.text = deviceInfo.label || `audio ${index}`;
    option.dataset.vid = `${vid}`;
    option.dataset.pid = `${pid}`;
    option.dataset.vidpid = `${vidpid}`;
    audioSelect.appendChild(option);
  });
}

function sortFileByCreateDate(a, b) {
  let timea, timeb;

  if (isTimelapse(a.name)) timea = a.name.slice(10);
  else if (isStopmotion(a.name)) timea = a.name.slice(11);
  else timea = a.name.slice(6);

  if (isTimelapse(b.name)) timeb = b.name.slice(10);
  else if (isStopmotion(b.name)) timeb = b.name.slice(11);
  else timeb = b.name.slice(6);

  if (timea < timeb) return -1;
  else if (timea > timeb) return 1;
  else return 0;
}

function sortDataByCreateDate(a, b) {
  let timea, timeb;

  if (isTimelapse(a.filename)) timea = a.filename.slice(10);
  else if (isStopmotion(a.filename)) timea = a.filename.slice(11);
  else timea = a.filename.slice(6);

  if (isTimelapse(b.filename)) timeb = b.filename.slice(10);
  else if (isStopmotion(b.filename)) timeb = b.filename.slice(11);
  else timeb = b.filename.slice(6);

  if (timea < timeb) return -1;
  else if (timea > timeb) return 1;
  else return 0;
}

function isJpg(filename) {
  return filename.endsWith(".jpg");
}

function isGif(filename) {
  return filename.endsWith(".gif");
}

function isWebm(filename) {
  return filename.endsWith(".webm");
}

function isImage(filename) {
  return filename.startsWith("Image");
}

function isVideo(filename) {
  return filename.startsWith("Video");
}

function isTimelapse(filename) {
  return filename.startsWith("Timelapse");
}

function isStopmotion(filename) {
  return filename.startsWith("Stopmotion");
}

function loadXHR2Blob(url) {
  return new Promise(function (resolve, reject) {
    try {
      let xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.responseType = "blob";
      xhr.onerror = function () {
        reject("Network error.");
      };
      xhr.onload = function () {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject("Loading error:" + xhr.statusText);
        }
      };
      xhr.send();
    } catch (err) {
      reject(err.message);
    }
  });
}

function loadXHR2DataURL(url) {
  return new Promise(function (resolve, reject) {
    try {
      let xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.responseType = "arraybuffer";
      xhr.onerror = function () {
        reject("Network error.");
      };
      xhr.onload = function () {
        if (xhr.status === 200) {
          let arr = new Uint8Array(xhr.response);
          var raw = "";
          var i,
            j,
            subArray,
            chunk = 5000;
          for (i = 0, j = arr.length; i < j; i += chunk) {
            subArray = arr.subarray(i, i + chunk);
            raw += String.fromCharCode.apply(null, subArray);
          }
          //let raw = String.fromCharCode.apply(null, arr);
          let b64 = btoa(raw);
          let dataURL = "data:image/png;base64," + b64;
          resolve(dataURL);
        } else {
          reject("Loading error:" + xhr.statusText);
        }
      };
      xhr.send();
    } catch (err) {
      reject(err.message);
    }
  });
}

/**
 * 設定當前預設的相機裝置，第一次進入時會以 OKIOCAM 為主，之後會以選過的裝置為主
 */
function selectVideoOption() {
  const prevDeviceId = localStorage.getItem("deviceId") || null;
  const deviceOpetionIds = [...videoSelect.options].map((optionElement) => optionElement.dataset.vidpid);

  // 使用者上次使用的主相機
  const prevDeviceIndex = deviceOpetionIds.findIndex((deviceOpetionId) => deviceOpetionId === prevDeviceId);
  // 使用者是否擁有 okiocam 相機
  const okiocamDeviceIndex = deviceOpetionIds.findIndex(
    (deviceOpetionId) => deviceOpetionId.includes("eb1a") || deviceOpetionId.includes("342e")
  );

  // 主相機預設值設定
  if (prevDeviceIndex !== -1) {
    videoSelect.selectedIndex = prevDeviceIndex;
  } else if (okiocamDeviceIndex !== -1) {
    videoSelect.selectedIndex = okiocamDeviceIndex;
  } else {
    videoSelect.selectedIndex = 0;
  }

  // 使用者上次使用的次相機
  const prevPIPDeviceId = cameraState["camera_two"] && cameraState["camera_two"].vidpid;
  const PIPDeviceIds = [...pipSelect.options].map((optionElement) => optionElement.dataset.vidpid);
  const prevPIPDeviceIndex = PIPDeviceIds.findIndex((deviceOpetionId) => deviceOpetionId === prevPIPDeviceId);
  // 次相機預設值設定
  if (prevPIPDeviceIndex !== -1) {
    pipSelect.selectedIndex = prevPIPDeviceIndex;
  } else {
    pipSelect.selectedIndex = 0;
  }

  return true;
  // if (videoSelect.options.length == 0) {
  //   let msg1 =
  //     "We’ve detected that you don’t have an OKIOCAM connected to your computer. Please connect your OKIOCAM now.";
  //   let msg2 =
  //     "If you don’t have an OKIOCAM, you can still use this application, but you won’t have access to all its features.";
  //   let btn = "OK";
  //   //showAlert(msg1, btn, msg2, null);
  //   alert(msg1 + " " + msg2);
  // }
}

function selectAudioOption() {
  const prevDeviceId = localStorage.getItem("micId") || null;
  const deviceOpetionIds = [...audioSelect.options].map((optionElement) => optionElement.value);

  // 使用者上次使用的麥克風
  const prevDeviceIndex = deviceOpetionIds.findIndex((deviceOpetionId) => deviceOpetionId === prevDeviceId);

  // 麥克風預設值設定
  if (prevDeviceIndex !== -1) {
    audioSelect.selectedIndex = prevDeviceIndex;
  } else {
    audioSelect.selectedIndex = 0;
  }

  return true;
}

function updateDialogPosition() {
  let okiopointDialogInitialized = $("#verify-okiopoint-dialog").hasClass("ui-dialog-content");
  let okiopointDialogIsOpen = $("#verify-okiopoint-dialog").hasClass("ui-dialog-content");
  let okiocamDialogInitialized = $("#verify-okiocam-dialog").hasClass("ui-dialog-content");
  let okiocamDialogIsOpen = $("#verify-okiocam-dialog").hasClass("ui-dialog-content");
  let recordDialogInitialized = $("#record-confirm").hasClass("ui-dialog-content");
  let recordDialogIsOpen = $("#record-confirm").hasClass("ui-dialog-content");
  if (okiopointDialogInitialized && okiopointDialogIsOpen) {
    $("#verify-okiopoint-dialog").dialog("option", "position", {
      my: "center center",
      at: "center center",
      of: $("body"),
    });
  }
  if (okiocamDialogInitialized && okiocamDialogIsOpen) {
    $("#verify-okiocam-dialog").dialog("option", "position", {
      my: "center center",
      at: "center center",
      of: $("body"),
    });
  }
  if (recordDialogInitialized && recordDialogIsOpen) {
    $("#record-confirm").dialog("option", "position", {
      my: "center center",
      at: "center center",
      of: $("body"),
    });
  }
}
/**
 * 初次打開應用，檢查相機列表中是否有 OKIOCAM 相機，如果沒有則要跳出警告，把紀錄儲存在 localStorage
 */
function verifyOKIOCamera(deviceList) {
  const okiocamExisted = localStorage.getItem("okiocamExist") !== null;
  const okiocamExisting = deviceList.some((device) => device.label.includes("eb1a") || device.label.includes("342e"));
  if (okiocamExisting) {
    localStorage.setItem("okiocamExist", true);
  }
  if (!okiocamExisted && !okiocamExisting) {
    $("#verify-okiocam-dialog").dialog("open");
    updateDialogPosition();
  }
  return deviceList;
}

function createResolutionOption(width, height, isDefault = false) {
  const option = document.createElement("option");
  option.dataset.resWidth = width;
  option.dataset.resHeight = height;
  option.text = isDefault ? `${width}x${height} (default)` : `${width}x${height}`;
  return option;
}

function getSupportResolution() {
  if (videoSelect.options.length == 0) return;
  if (videoSelect.selectedIndex === -1) return;
  if (!videoSelect.options[videoSelect.selectedIndex]) return;

  let { vidpid, selectedIndex } = videoSelect.options[videoSelect.selectedIndex].dataset;
  let deviceInfo = OKIODeviceList[`${vidpid}`] || null;

  // 使用者上次使用 App 時所選的解析度
  let saveResoultionInfo = localStorage.getItem("resoultion");
  saveResoultionInfo = saveResoultionInfo ? JSON.parse(saveResoultionInfo) : {};

  while (resolutionSelect.lastChild) {
    resolutionSelect.removeChild(resolutionSelect.lastChild);
  }

  let selectIndex = 0;

  // 指定預設 selectIndex 數值
  if (deviceInfo) {
    // 如果是自己的 camera App 最初一開始的啟動時指定解析度
    selectIndex = deviceInfo.resolution.indexOf(deviceInfo.default);
  }
  // App 打開後開啟切換 camera 後可以套用上一次選擇過的解析度
  // 如果 dataset 有紀錄，代表 camera 被選擇過載入上一次的解析度
  if (selectedIndex) {
    selectIndex = selectedIndex;
  } else {
    // App 打開後如果相機不是第一次被存取則會使用上一次的解析度
    // 檢查 localStorage 讀取上一次使用的解析度
    if (saveResoultionInfo[vidpid]) {
      selectIndex = saveResoultionInfo[vidpid].resoultionIndex;
    }
  }

  // append resolutionSelect option
  if (deviceInfo) {
    for (let resIndex = 0; resIndex < deviceInfo.resolution.length; resIndex++) {
      let option = document.createElement("option");
      let resolution = deviceInfo.resolution[resIndex];
      let [width, height] = resolution.split("x");
      option.dataset.resWidth = width;
      option.dataset.resHeight = height;
      if (deviceInfo.default === resolution) {
        resolution = `${resolution}（default）`;
      }
      else if (deviceInfo.hfr === resolution) {
        resolution = `${resolution}（High Frame Rate）`;
      }
      option.text = resolution;
      resolutionSelect.appendChild(option);
    }
  } else {
    for (let resIndex = 0; resIndex < resWidth.length; resIndex++) {
      let option = document.createElement("option");
      let width = resWidth[resIndex];
      let height = resHeight[resIndex];
      option.dataset.resWidth = width;
      option.dataset.resHeight = height;
      option.text = `${width}x${height}`;
      resolutionSelect.appendChild(option);
    }
  }

  // 指定 selectedIndex 和 dataset 資料
  videoSelect[videoSelect.selectedIndex].dataset.selectedIndex = selectIndex;
  resolutionSelect.selectedIndex = selectIndex;
}

// 取得第二支相機支援的解析度如果是 OKIOCAM 的話
function getSupportPIPResoultion() {
  // let { resWidth: mainWidth, resHeight: mainHeight } = videoSelect[videoSelect.selectedIndex].dataset;
  let { vidpid, selectedIndex } = pipSelect.options[pipSelect.selectedIndex].dataset;

  while (pipResolutionSelect.lastChild) {
    pipResolutionSelect.removeChild(pipResolutionSelect.lastChild);
  }

  let selectIndex = 0;
  let deviceInfo = OKIODeviceList[`${vidpid}`] || null;

  if (deviceInfo) {
    selectIndex = deviceInfo.resolution.indexOf(deviceInfo.default);
  }
  if (selectedIndex) {
    selectIndex = selectedIndex;
  }

  if (deviceInfo) {
    for (let resIndex = 0; resIndex < deviceInfo.resolution.length; resIndex++) {
      let option = document.createElement("option");
      let resolution = deviceInfo.resolution[resIndex];
      let pipWidth = Number(resolution.split("x")[0]);
      let pipHeight = Number(resolution.split("x")[1]);
      option.dataset.resWidth = pipWidth;
      option.dataset.resHeight = pipHeight;
      option.text = resolution;
      pipResolutionSelect.appendChild(option);
    }
  } else {
    for (let resIndex = 0; resIndex < resWidth.length; resIndex++) {
      let option = document.createElement("option");
      let pipWidth = resWidth[resIndex];
      let pipHeight = resHeight[resIndex];
      option.dataset.resWidth = pipWidth;
      option.dataset.resHeight = pipHeight;
      option.text = `${pipWidth}x${pipHeight}`;
      pipResolutionSelect.appendChild(option);
    }
  }

  // 指定 selectedIndex 和 dataset 資料
  pipSelect[pipSelect.selectedIndex].dataset.selectedIndex = selectIndex;
  pipResolutionSelect.selectedIndex = selectIndex;
}

// 設定第二支相機 disabled 狀態，如果第一支相機和第二支相機為同一裝置，則需要設定某些解析度不支援。
function setPIPResoultionState() {
  let pipResolutionSelectList = pipResolutionSelect.options;
  for (let index = 0; index < pipResolutionSelectList.length; index++) {
    pipResolutionSelectList[index].removeAttribute("disabled");
  }
  if (videoSelect.value === pipSelect.value) {
    let { resWidth: mainWidth, resHeight: mainHeight } = resolutionSelect[resolutionSelect.selectedIndex].dataset;
    for (let index = 0; index < pipResolutionSelectList.length; index++) {
      let { resWidth: pipWidth, resHeight: pipHeight } = pipResolutionSelectList[index].dataset;
      if (Number(pipWidth) > Number(mainWidth) || Number(pipHeight) > Number(mainHeight)) {
        pipResolutionSelectList[index].setAttribute("disabled", "true");
      }
    }
  }
}

/**
 * 設定錄影解析度根據來源解析度進行規則計算
 */
function setVideoQualityState() {
  let width = Number(resolutionSelect[resolutionSelect.selectedIndex].dataset.resWidth);
  let height = Number(resolutionSelect[resolutionSelect.selectedIndex].dataset.resHeight);
  let viewWidth = width;
  let viewHeight = height;
  let renderWidth = width;
  let renderHeight = height;

  if (inMac == false) {
    if (width < 1920) {
      let aspectRatio = width / height;
      // 4:3
      if (aspectRatio > 0.5625) {
        renderWidth = width;
        renderHeight = Math.floor((renderWidth / 16) * 9);
        if (renderHeight % 2 === 1) {
          renderHeight--;
        }
      }
    } else {
      renderWidth = 1920;
      renderHeight = 1080;
    }
  }
  else {
    if (width * height > 3840 * 2160) {
      renderWidth = 0;
      renderHeight = 0;
    }
  }

  videoQuality.innerHTML = `${renderWidth}x${renderHeight}`;
  videoQuality.dataset.viewWidth = viewWidth;
  videoQuality.dataset.viewHeight = viewHeight;
  videoQuality.dataset.renderWidth = renderWidth;
  videoQuality.dataset.renderHeight = renderHeight;
}

function initializeFlags(vid, pid) {
  (isGCam = false),
    (isV1 = false),
    (isV2 = false),
    (isS2 = false),
    (isS2Pro = false),
    (isW1 = false),
    (isX1 = false),
    (isACam = false),
    (isS2Plus = false),
    (isW4K = false),
    (isT4K = false);
  (supportHID = false), (supportPTZ = false);
  expSlider.max = 15;

  if (parseInt(vid, 16) == HID_VENDOR_ID) {
    if (parseInt(pid, 16) == HID_PRODUCT_ID_T || parseInt(pid, 16) == HID_PRODUCT_ID_S) {
      isGCam = true;
      isV1 = true;
      supportHID = true;
    } else if (parseInt(pid, 16) == HID_PRODUCT_ID_T2 || parseInt(pid, 16) == HID_PRODUCT_ID_S2) {
      isGCam = true;
      isV2 = true;
      supportHID = true;
    }
  } else if (parseInt(vid, 16) == HID_VENDOR_ID2) {
    isACam = true;

    if (parseInt(pid, 16) == HID_PRODUCT_ID_A10) {
      supportPTZ = true;
    } else if (parseInt(pid, 16) == HID_PRODUCT_ID_A8) {
      supportPTZ = true;
    } else if (parseInt(pid, 16) == HID_PRODUCT_ID_S_2) {
      isGCam = true;
      isS2 = true;
      supportHID = true;
      $("#flickerSetting").removeClass("hide");
    } else if (parseInt(pid, 16) == HID_PRODUCT_ID_W1 || parseInt(pid, 16) == HID_PRODUCT_ID_W1_2) {
      isGCam = true;
      isW1 = true;
      supportHID = true;
      $("#flickerSetting").removeClass("hide");
    } else if (parseInt(pid, 16) == HID_PRODUCT_ID_X1) {
      isGCam = true;
      isX1 = true;
      supportHID = true;
      expSlider.max = 10;
      $("#flickerSetting").removeClass("hide");
    } else if (parseInt(pid, 16) == HID_PRODUCT_ID_S2PRO) {
      isGCam = true;
      isS2Pro = true;
      supportHID = true;
      $("#flickerSetting").removeClass("hide");
    } else if (parseInt(pid, 16) == HID_PRODUCT_ID_SPlus) {
      isGCam = true;
      isV2 = true;
      supportHID = true;
      $("#flickerSetting").removeClass("hide");
    } else if (parseInt(pid, 16) == HID_PRODUCT_ID_S2Plus) {
      isGCam = true;
      isS2Plus = true;
      supportHID = true;
      //$("#flickerSetting").removeClass("hide");
    } else if (parseInt(pid, 16) == HID_PRODUCT_ID_T4K || parseInt(pid, 16) == HID_PRODUCT_ID_SG4K) {
      isGCam = true;
      isT4K = true;
      supportHID = true;
      //$("#flickerSetting").removeClass("hide");
    } else if (parseInt(pid, 16) == HID_PRODUCT_ID_W4K) {
      isGCam = true;
      isW4K = true;
      supportHID = true;
      initFinished = true;
      //$("#flickerSetting").removeClass("hide");
    }
  }
}
/**
 * 初始化 isGcam、isX1 參數、初始化 web hid 的功能
 */
function initializeFlagsAndHid() {
  if (videoSelect.options[videoSelect.selectedIndex]) {
    let { vid, pid } = videoSelect.options[videoSelect.selectedIndex].dataset;
    initializeFlags(vid, pid);
    initializeHid(vid, pid);
  }
}

function checkResolution(index, device) {
  let constraint;

  if (index < resWidth.length - 1) {
    constraint = {
      audio: false,
      video: true,
    };
    constraint.video = {
      width: {
        exact: resWidth[index],
      },
      height: {
        exact: resHeight[index],
      },
      deviceId: {
        exact: device,
      },
    };

    navigator.mediaDevices.getUserMedia(
      constraint,
      function (stream) {
        //console.log(stream);
        stream.getTracks().forEach(function (track) {
          track.stop();
        });
        //stream = null;

        let option = document.createElement("option");
        option.value = index + 1;
        option.text = resWidth[index].toString() + "x" + resHeight[index].toString();
        resolutionSelect.appendChild(option);
        checkResolution(index + 1, device);
      },
      function (error) {
        checkResolution(index + 1, device);
        //console.log(error);
      }
    );
  }
}

function backtolive(e) {
  if (e) e.stopPropagation();
  if (recordStart == false && !window.stream) getStream();
  document.title = "OKIOCAM Picture-in-Picture | " + chrome.i18n.getMessage("liveMode");
  $("#reviewMode").addClass("hide");
  recordedVideo.pause();
  $("#singleView").addClass("hide");
  singleViewMode = false;
  liveVideo.play();
  $("#liveMode").removeClass("hide");
  inLive = true;
  let tmp;
  // release src references
  /*
	while (fileList.lastChild) {
		tmp = fileList.removeChild(fileList.lastChild);
		if (tmp.nodeName.toLowerCase() == "figure") {
			let c = tmp.childNodes[0];
			c.src = "";
		}
		tmp = null;
	}
	fileList.innerHTML = '';
	*/
  $(".popup,.modal,.card-file").removeClass("active");
  selectList = [];
  while (sliderFiles.lastChild) {
    sliderFiles.removeChild(sliderFiles.lastChild);
  }

  let canvas = document.getElementById("preview"),
    ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // reset preview
  imageZoom = 1;
  imageRotate = 0;
  imageShrinkRatio = 1;
  previewImage.style.top = 0 + "px";
  previewImage.style.left = 0 + "px";
  previewImage.style[prop] = "scale(" + imageZoom * imageShrinkRatio + ") rotate(" + imageRotate + "deg)";
}

function backtolist() {
  returnLive.style.display = "flex";
  returnList.style.display = "none";

  $("#files").removeClass("hide");
  $("#singleView").addClass("hide");
  singleViewMode = false;
  if (filenameList.length != 0) $("#deleteall").removeClass("disabled");

  $(".popup,.modal,.card-file").removeClass("active");
  selectList = [];
  // clear folder related variables
  currentFolder = undefined;

  while (sliderFiles.lastChild) {
    sliderFiles.removeChild(sliderFiles.lastChild);
  }
  //window.clearInterval(playTimer);

  let canvas = document.getElementById("preview"),
    ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  recordedVideo.pause();

  // reset preview
  imageZoom = 1;
  imageRotate = 0;
  imageShrinkRatio = 1;
  previewImage.style.top = 0 + "px";
  previewImage.style.left = 0 + "px";
  previewImage.style[prop] = "scale(" + imageZoom * imageShrinkRatio + ") rotate(" + imageRotate + "deg)";
}

function toReview(e) {
  if (e) {
    e.stopPropagation();
  }
  if (recordStart == false && capturing == 0) closeStream();

  if (recordStart) return;
  document.title = "OKIOCAM Picture-in-Picture | " + chrome.i18n.getMessage("reviewMode");
  //listFiles();

  //backtolist();
  returnLive.style.display = "flex";
  returnList.style.display = "none";

  $("#files").removeClass("hide");
  $("#singleView").addClass("hide");
  singleViewMode = false;
  //newtabButton.disabled = true;

  $(".popup,.modal,.card-file").removeClass("active");
  selectList = [];
  // clear folder related variables
  currentFolder = undefined;

  while (sliderFiles.lastChild) {
    sliderFiles.removeChild(sliderFiles.lastChild);
  }

  $("#reviewMode").removeClass("hide");
  if (filenameList.length != 0) {
    $("#deleteall").removeClass("disabled");
    $("#noFile").addClass("hide");
  }

  liveVideo.pause();
  liveVideo.currentTime = 0;
  $("#liveMode").addClass("hide");
  //liveMode.style.display = 'none';

  inLive = false;
}

function subIndex() {
  if (filenameList.length >= 9) previewSubLength = 9;
  else previewSubLength = filenameList.length;

  for (let i = 0; i < previewSubLength; i++) {
    let file = sliderFiles.childNodes[i];
    if (previewFile == file.id.substring(1, file.id.length)) {
      previewSubIndex = i;
      //console.log("set previewSubIndex =  " + previewSubIndex)
    }
  }
}

function toSingleView() {
  //console.log(filenameList);
  $("#singleView").removeClass("hide");
  singleViewMode = true;
  selectList = [];
  while (sliderFiles.lastChild) {
    sliderFiles.removeChild(sliderFiles.lastChild);
  }
  let start, length;
  if (filenameList.length <= 9) {
    start = 0;
    length = filenameList.length;
  } else {
    let index = filenameList.indexOf(previewFile);
    if (index < 4) start = 0;
    else if (index >= filenameList.length - 4) start = filenameList.length - 9;
    else start = index - 4;
    length = start + 9;
  }
  for (let i = start; i < length; i++) {
    let file = document.getElementById(filenameList[i]).childNodes[0].childNodes[0];
    let li = document.createElement("li");
    //var a = document.createElement('a');
    let div = document.createElement("div");
    let content;
    li.setAttribute("id", "t" + filenameList[i]);
    if (previewFile == filenameList[i]) li.className = "thumbnail active";
    else li.className = "thumbnail";
    div.className = "item";
    content = new Image();
    content.src = file.src;
    div.appendChild(content);
    li.appendChild(div);
    sliderFiles.appendChild(li);
  }
  subIndex();
}

function gotoGoogleDrive() {
  if (folderID == "") {
    //console.log("Goto Google Drive");
    chrome.identity.getAuthToken(
      {
        interactive: !0,
      },
      function (t) {
        authToken = t;
        let f = new DriveService({
          token: t,
          folderName: folderName,
        });
        f.getFolderId().then(function (i) {
          folderID = i;
          let folderUrl = "https://drive.google.com/drive/u/0/folders/" + folderID;
          chrome.tabs.create({
            url: folderUrl,
          });
        });
        updateLogin();
      }
    );
  } else {
    let folderUrl = "https://drive.google.com/drive/u/0/folders/" + folderID;
    chrome.tabs.create({
      url: folderUrl,
    });
  }
}

function previousFile() {
  if (currentPreviewIndex != 0) {
    currentPreviewIndex = currentPreviewIndex - 1;
    let filename = filenameList[currentPreviewIndex];
    play(filename);
    // update slider thumbnails
    if (previewSubIndex == 0) {
      //if (currentPreviewIndex >= 4 && currentPreviewIndex + 4 < filenameList.length - 1) {
      sliderFiles.removeChild(sliderFiles.lastChild);
      //var addName = filenameList[currentPreviewIndex - 4];
      let addName = filenameList[currentPreviewIndex];
      let file = document.getElementById(addName).childNodes[0].childNodes[0];
      let li = document.createElement("li");
      //var a = document.createElement('a');
      let div = document.createElement("div");
      let content;
      li.className = "thumbnail";
      li.setAttribute("id", "t" + addName);
      div.className = "item";
      if (isImage(addName)) content = new Image();
      else if (isVideo(addName)) content = document.createElement("video");
      content.src = file.src;
      div.appendChild(content);
      li.appendChild(div);
      sliderFiles.insertBefore(li, sliderFiles.childNodes[0]);
      //}
    }
    if (previewSubIndex > 0) previewSubIndex = previewSubIndex - 1;
    $("#sliderThumbnail").children().removeClass("active");
    let id = "t" + filename;
    $('li[id="' + id + '"]').addClass("active");
  }
  if (currentPreviewIndex == 0) $("#previousFile").addClass("disabled");
  else $("#previousFile").removeClass("disabled");
  $("#nextFile").removeClass("disabled");
}

function nextFile() {
  if (currentPreviewIndex != filenameList.length - 1) {
    currentPreviewIndex = currentPreviewIndex + 1;
    let filename = filenameList[currentPreviewIndex];
    play(filename);
    // update slider thumbnails
    if (previewSubIndex == previewSubLength - 1) {
      //if (currentPreviewIndex + 4 < filenameList.length && currentPreviewIndex > 4) {
      sliderFiles.removeChild(sliderFiles.firstChild);
      //var addName = filenameList[currentPreviewIndex + 4];
      let addName = filenameList[currentPreviewIndex];
      let file = document.getElementById(addName).childNodes[0].childNodes[0];
      let li = document.createElement("li");
      //var a = document.createElement('a');
      let div = document.createElement("div");
      let content;
      li.className = "thumbnail";
      li.setAttribute("id", "t" + addName);
      div.className = "item";
      if (isImage(addName)) content = new Image();
      else if (isVideo(addName)) content = document.createElement("video");
      content.src = file.src;
      div.appendChild(content);
      li.appendChild(div);
      sliderFiles.appendChild(li);
      //}
    }
    if (previewSubIndex < previewSubLength - 1) previewSubIndex = previewSubIndex + 1;
    $("#sliderThumbnail").children().removeClass("active");
    let id = "t" + filename;
    $('li[id="' + id + '"]').addClass("active");
  }
  if (currentPreviewIndex == filenameList.length - 1) $("#nextFile").addClass("disabled");
  else $("#nextFile").removeClass("disabled");
  $("#previousFile").removeClass("disabled");
}

function openNewTab() {
  let filename;
  if (singleViewMode) filename = previewFile;
  else filename = selectList[0];

  if (libraryLocation == 1) {
    if (isJpg(filename)) {
      getDB(filename, function (result) {
        if (result.url) {
          chrome.tabs.create({
            url: result.url,
          });
        } else {
          let file = document.getElementById(filename).childNodes[0].childNodes[0];
          let dataURL = file.src;
          let w = window.open("about:blank");
          let image = document.createElement("img");
          image.setAttribute("src", dataURL);
          w.document.body.appendChild(image);
        }
      });
    }
  } else if (libraryLocation == 2) {
    //let url = "https://docs.google.com/uc?id=" + $('div[id="' + filename + '"]').data('id');
    let url = "https://drive.google.com/open?id=" + $('div[id="' + filename + '"]').data("id");
    chrome.tabs.create({
      url: url,
    });
  }
}

function startDisplayTimer() {
  startTime = new Date();

  intervalTimer = window.setInterval(function () {
    timerTick();
  }, 1000);

  $("#timer").html("00:00");
  recordInfo.style.display = "inline-block";
  $("#liveFrame").removeClass("no-before");

  /*
	chrome.storage.sync.get({
		displaymic: DEFAULT_DISPLAY_MIC
	}, function (items) {
		if (items.displaymic == 2 && audioSelect.value !=0) {
			$('#volume').removeClass('hide');
		}
		else {
			$('#volume').addClass('hide');
		}
	});
	*/
}

function stopDisplayTimer() {
  window.clearInterval(intervalTimer);

  $("#timer").html("00:00 / 60:00");
  recordInfo.innerHTML = recordInfo.innerHTML.replace("Paused", "Recording");
  recordInfo.style.display = "none";
  $("#liveFrame").addClass("no-before");
}

function timerTick() {
  let t = Date.parse(new Date()) - Date.parse(startTime);

  let seconds = Math.floor((t / 1000) % 60);
  seconds = ("00" + seconds).slice(-2);
  let minutes = Math.floor(t / 1000 / 60);
  minutes = ("00" + minutes).slice(-2);

  if (!pauseRecord) {
    if (leftSize < 20000000 || (parseInt(minutes) == 60 && seconds == "01")) {
      //console.log("stop recording");
      toggleRecording();
    } else {
      $("#timer").html(minutes + ":" + seconds);
      // $("#timer").html(minutes + ":" + seconds + " / 60:00");
      //let limit = ('00' + limitLength).slice(-2);
      //$('#timer').html(minutes + ':' + seconds + " / " + limit + ":00");
      //timer.innerHTML = minutes + ':' + seconds;
    }
  }
}

function percentageCircle() {
  let frame = 0;
  let x = setInterval(function () {
    frame += 1;
    $("#countdownCircle").attr("class", "c100 p" + frame);
    if (frame >= 100) {
      clearInterval(x);
    }
  }, 10);
}

function startSnapshotTimer(e) {
  e.preventDefault();
  e.stopPropagation();
  snapshot();
  /*
	chrome.storage.sync.get({
		countdown: DEFAULT_COUNTDOWN
	}, function (items) {
		if (items.countdown == 1) {
			snapshot();
		}
		else {
			$('.btn-camera').addClass('disabled');
			$('#record').addClass('disabled');
			countdownSec = items.countdown * 2 - 1;
			if (items.countdown == 2)
				countdownSec = 2;
			countdownStartTime = new Date();
			$('.countdown').addClass('active');
			countdownText.innerHTML = countdownSec.toString();
			$('.bar').addClass('start');

		    //countdownTimer = window.setInterval(function() {
			countdownTimer = window.setTimeout(function () {
		      countdownTimerTick();
		    }, 1000);
			percentageCircle();
		}
	});
	*/
}

function countdownTimerTick() {
  let t = Date.parse(new Date()) - Date.parse(countdownStartTime);

  //let seconds = Math.floor( (t/1000) % 60 );
  countdownSec = countdownSec - 1;
  countdownText.innerHTML = countdownSec.toString();
  if (countdownSec == 0) {
    $(".bar").removeClass("start");
    $(".countdown").removeClass("active");
    window.clearInterval(countdownTimer);
    $(".btn-camera").removeClass("disabled");
    $("#record").removeClass("disabled");
    snapshot();
  } else {
    window.setTimeout(function () {
      countdownTimerTick();
    }, 1000);
    percentageCircle();
  }
}

function startPreviewTimer() {
  setTimeout(backtolive, 3000);
}

function startRecordTimer(e) {
  if (e) {
    e.stopPropagation();
  }

  let quality = recordQualitySelect.value;
  let limitSize;

  if (quality == 1) {
    limitSize = 1572864000;
    limitLength = parseInt(leftSize / 26214400);
  } else if (quality == 2) {
    limitSize = 2147483648;
    limitLength = parseInt(leftSize / 35791394);
  }
  if (limitLength > 60) limitLength = 60;

  if (limitLength == 0) {
    let msg = chrome.i18n.getMessage("noStorageMsg");
    alert(msg);
    return;
  }

  let result;
  if (leftSize < limitSize) {
    //alert("Chrome storage size is not enough for recording 60 minutes. Estimated recording length is " + limitLength + " minutes");
    //console.log("limitLength: " + limitLength);
    let msg = chrome.i18n.getMessage("confirmRecordShort", limitLength.toString());
    //result = confirm("Chrome storage size is not enough for recording 60 minutes. The estimated recording length is " + limitLength + " minutes. Please delete some files in the library to record 60 minutes. Do you want to continue to record?");
    result = confirm(msg);
  } else result = true;

  if (result == true) {
  }
}

function recordTimerTick() {
  let t = Date.parse(new Date()) - Date.parse(countdownStartTime);

  //let seconds = Math.floor((t / 1000) % 60);
  //seconds = countdownSec - parseInt(seconds);
  countdownSec = countdownSec - 1;
  countdownText.innerHTML = countdownSec.toString();
  if (countdownSec == 0) {
    $(".bar").removeClass("start");
    $(".countdown").removeClass("active");
    window.clearInterval(countdownTimer);
    $("#record").removeClass("disabled");
    startRecording();
    $("#recordControl").addClass("hide");
    $("#recordingControl").removeClass("hide");
    //$('#zoom').addClass('disabled');
    //$('#rotate').addClass('disabled');
    //$('#freezeButton').addClass('disabled');
    //$('#freezeDiv').addClass('disabled');
    //$('.btn-freeze').removeClass('active');
    //$('.mark-freeze').removeClass('active');
    $("#toreview").addClass("disabled");
    if (liveFreeze == true) {
      liveFreeze = false;
      liveVideo.play();
    }
    $(".btn-camera").removeClass("disabled");
    $("#record").removeClass("disabled");
  } else {
    countdownTimer = window.setTimeout(function () {
      recordTimerTick();
    }, 1000);
    percentageCircle();
  }
}

function progressMove() {
  let elem = document.getElementById("myBar");
  let width = 1;
  progressTimer = window.setInterval(frame, 10);
  function frame() {
    if (width >= 100) {
      width = 1;
    } else {
      width++;
      elem.style.width = width + "%";
    }
  }
}

// dataURL to blob
function dataURLtoBlob(dataurl) {
  let arr = dataurl.split(","),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

function blobtoDataURL(blob, callback) {
  let fr = new FileReader();
  fr.onload = function (e) {
    callback(e.target.result);
  };
  fr.readAsDataURL(blob);
}

function getBase64(dataurl, callback) {
  let Img = new Image(),
    dataURL = "";
  Img.src = dataurl;
  Img.onload = function () {
    let canvas = document.createElement("canvas"),
      width = Img.width,
      height = Img.height;
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(Img, 0, 0, width, height);
    dataURL = canvas.toDataURL("image/webp");
    callback ? callback(dataURL) : null;
  };
}

function successCallback(stream) {
  window.stream = stream;
  streamWidth = window.stream.getVideoTracks()[0].getSettings().width;
  streamHeight = window.stream.getVideoTracks()[0].getSettings().height;
  console.log(streamWidth + " x " + streamHeight);

  handleCustomDevice();
  handleQRCodeDetect();
  saveSelectState();
  saveCameraState();
  setVideoQualityState();

  // let transform = drawCtx.getTransform();
  // drawCtx.setTransform(transform);
  drawScreen.updatePaintSize(streamWidth, streamHeight);
  drawScreen.redrawScreen();

  liveVideo.dataset.sid = stream.id;
  liveVideo.srcObject = window.stream;
  liveVideo.play();
  liveFreeze = false;

  $(".mark-freeze").removeClass("active");

  // if (audioSelect.value != 0) createMicVolume(stream);
  if (isGCam) {
    sendCommand(6);
    if (selfieMode && isV1) {
      // send flip on and mirror on command
      sendCommand(7);
      setTimeout(function () {
        sendCommand(9);
      }, 500);
    }
  }

  // if (liveStore["zoom"] > 1) updateZoomPanelSize();

  liveVideo.oncanplay = () => {
    updateSize();
  };

  // handel second camera
  if (pipSelect.value !== "0") {
    if (pipSelect.value === videoSelect.value) {
      getPIPStream();
    } else {
      // 設定第二支相機的可或不可選擇的狀態，如果第一支相機和第二支相機為同一裝置，則需要設定某些解析度不支援。
      setPIPResoultionState();
    }
  }
}

function errorCallback(error) {
  console.log(error);
  if (error.name == "NotAllowedError") {
    let msg = "Cannot access your camera. Please check your Camera permissions in Chrome.";
    alert(msg);
  } else if (error.name == "OverconstrainedError") {
    //alert('The resolution you selected is not supported');
    if (isGCam) {
      if (resolutionSelect.selectedIndex != 3) {
        resolutionSelect.options[3].selected = true;
        savedResolution = 5;
        videoRatio = 1; // 4:3
        constraints.video = {
          width: { exact: 1600 },
          height: { exact: 1200 },
          deviceId: { exact: videoSelect.value },
        };
        navigator.mediaDevices.getUserMedia(constraints, successCallback, errorCallback);
      } else {
        let msg = "We weren't able to access OKIOCAM. Please make sure it is plugged in and no other app is using it.";
        alert(msg);
      }
    } else if (cameraPermission == "granted") {
      let msg = "The resolution you selected is not supported";
      alert(msg);
      resolutionSelect.selectedIndex = videoSelect[videoSelect.selectedIndex].dataset.selectedIndex;
      getStream();
      // if (resolutionSelect.selectedIndex == 0) {
      //   resolutionSelect.options[3].selected = true;
      //   videoRatio = 2; // 16:9
      //   constraints.video = {
      //     width: { exact: 1280 },
      //     height: { exact: 720 },
      //     deviceId: { exact: videoSelect.value },
      //   };
      //   navigator.mediaDevices.getUserMedia(constraints, successCallback, errorCallback);
      // } else if (resolutionSelect.selectedIndex != 3) {
      //   resolutionSelect.options[0].selected = true;
      //   videoRatio = 1; // 4:3
      //   constraints.video = {
      //     width: { exact: 640 },
      //     height: { exact: 480 },
      //     deviceId: { exact: videoSelect.value },
      //   };
      //   navigator.mediaDevices.getUserMedia(constraints, successCallback, errorCallback);
      // }
    }
  } else if (error.name == "NotFoundError") {
    let msg = "No camera detected";
    alert(msg);
  } else if (error.name == "NotReadableError") {
    let msg = "We weren't able to access OKIOCAM. Please make sure it is plugged in and no other app is using it.";
    alert(msg);
  }
}

function handleSourceOpen(event) {
  //console.log('MediaSource opened');
  sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
  //console.log('Source buffer: ', sourceBuffer);
}

var datablob = [];
function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    //saveFile(recordFilename, undefined, event.data, "video/webm");
    //console.log("data size: " + event.data.size);
    datablob.push(event.data);
    leftSize = leftSize - event.data.size;
    if (datablob.length >= 200) {
      let blob = new Blob(datablob, { type: "video/webm" });
      //console.log("write datablob " + blob.size);
      saveFile(recordFilename, undefined, blob, "video/webm");
      datablob = [];
    }
  }
}

function handleStop(event) {
  if (datablob.length != 0) {
    let blob = new Blob(datablob, { type: "video/webm" });
    //console.log("more blob size: " + blob.size);
    //console.log('Saved file: ', recordFilename);
    saveFile(recordFilename, undefined, blob, "video/webm", function () {
      addFigure(recordFilename, true, null, videoSaved);
    });
    datablob = [];
  } else {
    addFigure(recordFilename, true, null, videoSaved);
  }
  //console.log('Recorder stopped: ', event);
}

function videoSaved() {}

function toggleFreeze() {
  if (liveFreeze == false) {
    liveFreeze = true;
    liveVideo.pause();
  } else {
    liveFreeze = false;
    liveVideo.play();
  }
}

function triggerFocus(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (supportHID) {
    requestHid()
      .then(() => {
        sendCommand(0);
      })
      .catch((err) => {
        console.log(err);
      });
  }
}

function resetLive() {
  if (recordStart == false && capturing == 0) location.reload();
  /*
	zoom = 1;
	rotate = 0;
	shrinkRatio = 1;
	// reset selfie
	$('.btn-camera-flip').removeClass('active');
	selfieMode = false;
	mirrorFilter = "";
	mirrorStyle = "";
	if (isGCam) {
		sendCommand(8, 1);
		window.setTimeout(function () {
			sendCommand(10, 4);
		}, 500);
	}

	v.style.top = 0 + 'px';
	v.style.left = 0 + 'px';
	v.style[prop] = 'rotate(' + rotate + 'deg) scale(' + zoom * shrinkRatio + ')' + ' ' + mirrorStyle + ' ' + flipStyle;
	v.style.filter = mirrorFilter + ' ' + flipFilter;
	updateRotate();

	//$('#zoomText').addClass('hide');
	$('#zoomArea').addClass('hide');
	//zoomText.style.display = "none";
	//zoomArea.style.display = "none";
	zoomText.innerHTML = "1x";
	zoomRatio.innerHTML = "1x";
	zoomSlider.value = 5;

	expSlider.value = 7;
	//sendEV(4);
	window.setTimeout(function () {
		sendCommand(11, 8);
		updateExp();
	}, 1000);

	// reset freeze
	$('.btn-freeze').removeClass('active');
	$('.mark-freeze').removeClass('active');
	if (liveFreeze == true) {
		liveFreeze = false;
		liveVideo.play();
	}

	$('#hline').addClass('hide');
	$('#vline').addClass('hide');
	*/
}

function lockAEAWB() {
  // AE lock
  sendCommand(1);

  // AWB lock
  setTimeout(function () {
    sendCommand(3);
  }, 500);
}

const Recorder = new RecordModule.Recorder();
var RecorderFinish = false;
Recorder.initEnv(window.isElectron);
Recorder.initElement(liveVideo, canvasPaint);
Recorder.initWorker(RenderWorkerPath, EncodeWorkerPath);
Recorder.onRendering(() => {
  RecorderFinish = false;
  // 當錄製啟動後，此 callback 會被執行
  // 用來設置畫面旋轉、水平翻轉、裁切畫面需要的訊息
  // let { width, height } = Recorder.getSize();
  let { viewWidth: width, viewHeight: height } = videoQuality.dataset;
  width = Number(width);
  height = Number(height);
  let sourceInfo = null;
  if (rotate === 0 || rotate === 180) {
    sourceInfo = VideoOperate.getLiveSourceInfo(width, height);
  } else {
    sourceInfo = VideoOperate.getLiveSourceInfo(height, width);
  }
  Recorder.sourceInfo(sourceInfo);
  Recorder.rotate(rotate);
  Recorder.mirror(mirrorStyle);
});
Recorder.onFinish(() => {
  RecorderFinish = true;
  // node_fs.closeFileSync?.(Recorder.fileDescriptor);
});

function toggleCameraState() {
  const ids = ["videoSource", "pipSource", "audioSource", "resolution", "pipResolution", "pipPosition", "pipSize"];
  ids.forEach((id) => $(`#${id}`).toggleClass("disabled"));
}

async function toggleRecording(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  try {
    if (Recorder.isRecordIng === false) {
      let { renderWidth, renderHeight } = videoQuality.dataset;
      Recorder.setRenderSize(renderWidth, renderHeight);

      await Recorder.setCodecs();

      let fileName = `${getCurrentTime()}.${Recorder.mimeType}`;
      if (window.isElectron) {
        let filePath = await node_fs.getVideoPath?.(fileName);
        // let fileDescriptor = node_fs.openFileSync?.(filePath);
        // Recorder.setFile({ type: "fileDescriptor", fileDescriptor: fileDescriptor });
        Recorder.setFile({ type: "filePath", filePath: filePath });
      } else {
        let fileHandle = await Recorder.getFileHandle(fileName);
        Recorder.setFile({ type: "fileHandle", fileHandle: fileHandle });
      }

      Recorder.start();

      recordStart = true;

      $("#recordControl").addClass("hide");
      $("#recordingControl").removeClass("hide");
      $("#pipSource").val("0");
      $("#pipSource").trigger("change");

      startDisplayTimer();
      toggleCameraState();
    } else {
      if (Recorder.isPauseIng) {
        togglePause();
      }
      Recorder.stop();

      recordStart = false;

      $("#recordControl").removeClass("hide");
      $("#recordingControl").addClass("hide");

      stopDisplayTimer();
      toggleCameraState();
      $(".btn-okiopoint").removeClass("unavaliable");
      if (restoreOKIOPoint) {
        restoreOKIOPoint = false;
        qrCodeTrack.checked = true;
        qrCodeTrack.disabled = false;
        $(".btn-okiopoint").addClass("active");
        window.setSwtichState({ on: true, disable: false });
        DetectFn.start();
      }
    }
    $("#pause").removeClass("hide");
    $("#resume").addClass("hide");
  } catch (error) {
    console.log(error);
  }
}

function togglePause(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (Recorder.isPauseIng === false) {
    $("#pause").addClass("hide");
    $("#resume").removeClass("hide");
    pauseRecord = true;
    pauseTime = new Date();

    Recorder.pause();
  } else {
    $("#pause").removeClass("hide");
    $("#resume").addClass("hide");
    pauseTime = Date.parse(new Date()) - Date.parse(pauseTime);
    startTime = new Date(Date.parse(startTime) + pauseTime);
    pauseRecord = false;

    Recorder.resume();
  }
}

function startMediaRecorder(stream, options) {
  mediaRecorder = new MediaRecorder(stream, options);
  datablob = [];

  recordFilename = "Video_" + getTimestamp() + ".webm";
  //console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
  mediaRecorder.onstop = handleStop;
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start(10); // collect 10ms of data
  //console.log('MediaRecorder started', mediaRecorder);
  saveParameter();
  resetParameter();
  startDisplayTimer();
  videoSelect.disabled = true;
  resolutionSelect.disabled = true;
  audioSelect.disabled = true;
  recordRatioSelect.disabled = true;
  recordQualitySelect.disabled = true;
  recordStart = true;
  insertDB(curUser, recordFilename, false);
}


async function startRecording(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  let width = Number(resolutionSelect[resolutionSelect.selectedIndex].dataset.resWidth);
  let height = Number(resolutionSelect[resolutionSelect.selectedIndex].dataset.resHeight);
  if (inMac == true && width * height > 3840 * 2160) {
    var text = chrome.i18n.getMessage("recordNotSupportWarningMsg");
    alert(text);
    return;
  }
  if(qrCodeTrack.checked && window.SettingList["FN_1"] != "FN_1") {
    restoreOKIOPoint = true;
    $('#record-confirm').removeClass('hide');
		$("#record-confirm").dialog("open");
  }
  else if(!qrCodeTrack.checked)  {
    $(".btn-okiopoint").addClass("unavaliable");
    toggleRecording();
  }
  else {  // Zoom and Follow
    toggleRecording();
  }

}

function onAccessApproved(chromeMediaSourceId, opts) {
  if (!chromeMediaSourceId || !chromeMediaSourceId.toString().length) {
    //console.log("cancel recording");
    toggleRecording();
    return;
  }
  //console.log("source id: " + chromeMediaSourceId);
  //console.log(opts);

  constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: chromeMediaSourceId,
        minWidth: 1920,
        minHeight: 1080,
        maxWidth: 1920,
        maxHeight: 1080,
      },
      maxFrameRate: 30,
      optional: [],
    },
  };

  /*
	if (opts.canRequestAudioTrack === true && audioSelect.value != 0) {
		constraints.audio = {
			mandatory: {
				chromeMediaSource: 'desktop',
				chromeMediaSourceId: chromeMediaSourceId,
				echoCancellation: true
			},
			optional: [{
				sourceId: audioSelect.value
			}]
		};
	}*/

  navigator.webkitGetUserMedia(
    constraints,
    function (stream) {
      let options;
      if (inChromeOS)
        options = {
          mimeType: "video/webm;codecs=vp9",
          videoBitsPerSecond: 18000000,
        };
      else
        options = {
          mimeType: "video/webm;codecs=vp8",
          videoBitsPerSecond: 20000000,
        };

      let tmpStream;

      // somebody clicked on "Stop sharing"
      stream.getVideoTracks()[0].onended = function () {
        toggleRecording();
      };

      recordStream = stream;
      recordStream.width = 1920;
      recordStream.height = 1080;
      recordStream.top = 0;
      recordStream.left = 0;
      recordStream.fullcanvas = true;

      tmpStream = new MediaStream();

      recordStream.getVideoTracks().forEach(function (track) {
        tmpStream.addTrack(track);
      });

      recordStream.getAudioTracks().forEach(function (track) {
        tmpStream.addTrack(track);
      });

      startMediaRecorder(tmpStream, options);
      try {
        //liveVideo.srcObject = tmpStream;
      } catch (error) {
        //liveVideo.src = URL.createObjectURL(tmpStream);
      }
    },
    errorCallback
  );
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state == "recording") mediaRecorder.stop();
  pauseRecord = false;
  if (mixedStreams) {
    mixedStreams.releaseStreams();
    mixedStreams = null;
  }

  if (recordStream) {
    recordStream.getTracks().forEach(function (track) {
      track.stop();
    });

    recordStream = null;
  }

  if (getRecordStream == true) getStream();
  else {
    try {
      liveVideo.srcObject = window.stream;
    } catch (error) {
      liveVideo.src = URL.createObjectURL(window.stream);
    }
    getRecordStream = true;
  }

  stopDisplayTimer();
  restoreParameter();
  /*
	if(datablob.length != 0) {
		let blob = new Blob(datablob, { 'type' : 'video/webm' });
		console.log("save blob size: " + blob.size);
		saveFile(recordFilename, undefined, blob, "video/webm");
		datablob = [];
    }
	console.log('Saved file: ', recordFilename);*/
  //insertDB(curUser, recordFilename, false);
  filenameList.push(recordFilename);
  loadTheFile(recordFilename, undefined, function (data) {
    let superBuffer = new Blob([new Uint8Array(data)]);
    updateThumbnail(superBuffer, "video/webm");
  });
  videoSelect.disabled = false;
  resolutionSelect.disabled = false;
  audioSelect.disabled = false;
  recordRatioSelect.disabled = false;
  recordQualitySelect.disabled = false;
  recordStart = false;
}

var capturing = 0;

function snapshot() {
  snapshotFilename = "Image_" + getTimestamp() + ".jpg";
  $("#live").addClass("flash"); // Camera flash effect
  setTimeout(function () {
    $("#live").removeClass("flash");
  }, 200);
  captureImage(currentFolder);
}

function captureImage(folder = "") {
  let captureFilename = snapshotFilename;
  // 截圖用 canvas
  let cameraWidth = streamWidth;
  let cameraHeight = streamHeight;

  if (rotate === 90 || rotate === 270) {
    cameraWidth = streamHeight;
    cameraHeight = streamWidth;
  }

  const captureCanvas = document.createElement("canvas");
  const captureCtx = captureCanvas.getContext("2d");
  const videoCanvas = document.createElement("canvas");
  const videoCtx = videoCanvas.getContext("2d");

  const src = VideoOperate.getLiveSourceInfo(cameraWidth, cameraHeight);
  const dst = VideoOperate.getLiveCaptureInfo(cameraWidth, cameraHeight);

  // console.log(src);
  // console.log(dst);

  videoCanvas.width = cameraWidth;
  videoCanvas.height = cameraHeight;
  captureCanvas.width = dst.size.w;
  captureCanvas.height = dst.size.h;

  videoCtx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);
  videoCtx.save();
  videoCtx.translate(videoCanvas.width / 2, videoCanvas.height / 2);
  videoCtx.rotate((rotate * Math.PI) / 180);
  videoCtx.drawImage(liveVideo, -streamWidth / 2, -streamHeight / 2);
  videoCtx.drawImage(canvasPaint, -streamWidth / 2, -streamHeight / 2);
  videoCtx.restore();
  if (mirrorStyle === "scaleX(-1)") {
    videoCtx.save(); // save the current canvas state
    // 水平翻轉
    if (rotate === 0 || rotate === 180) {
      videoCtx.setTransform(
        -1,
        0, // set the direction of x axis
        0,
        1, // set the direction of y axis
        cameraWidth, // set the x origin
        0 // set the y origin
      );
    }
    // 垂直翻轉
    if (rotate === 90 || rotate === 270) {
      videoCtx.setTransform(
        1,
        0, // set the direction of x axis
        0,
        -1, // set the direction of y axis
        0, // set the x origin
        cameraHeight // set the y origin
      );
    }
    videoCtx.drawImage(videoCanvas, 0, 0, cameraWidth, cameraHeight, 0, 0, cameraWidth, cameraHeight);
    videoCtx.restore(); // restore the state as it was when this function was called
  }

  captureCtx.drawImage(
    videoCanvas,
    src.pos.x,
    src.pos.y,
    src.size.w,
    src.size.h,
    dst.pos.x,
    dst.pos.y,
    dst.size.w,
    dst.size.h
  );

  saveImage(captureCanvas);
}

async function saveImage(saveCanvas) {
  if (!saveCanvas) return false;

  const filename = `${getCurrentTime()}.jpg`;
  if (window.isElectron) {
    const dataurl = saveCanvas.toDataURL("image/jpeg", 1.0);
    const base64 = dataurl.replace(/^data:image\/\w+;base64,/, "");
    node_fs.saveImageData?.(filename, base64);
  } else {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: "Video File",
          accept: { "video/webm": [".webm"] },
        },
      ],
    });
    const fileWritable = await fileHandle.createWritable();
    saveCanvas.toBlob(
      async (blob) => {
        await fileWritable.write(blob);
        await fileWritable.close();
      },
      "image/jpeg",
      1.0
    );
  }
}

var waitingProcess = 0;
var liveUploading = 0;
/**
 * 根據選擇的裝置和解析度取得 MediaStream 顯示
 */
function getStream() {
  //if (pipSelect.selectedIndex != 0 || (videoSelect.options.length == 0 && pipSelect.options.length > 0)) {
  if (videoSelect.options.length == 0 || videoSelect.selectedIndex === -1) {
    return;
  }

  if (videoSelect.value === pipSelect.value) {
    if (pipStream) {
      pipStream.getTracks().forEach(function (track) {
        track.stop();
      });
      pipStream = null;
    }
  }

  if (isGCam) {
    $("#exposure").removeClass("hide");
    $("#focusDiv").removeClass("hide");
    $("#focusButton").removeClass("hide");
  } else {
    $("#exposure").addClass("hide");
    $("#focusDiv").addClass("hide");
    $("#focusButton").addClass("hide");
  }

  let selectDevice = videoSelect[videoSelect.selectedIndex];
  let selectOption = resolutionSelect.options[resolutionSelect.selectedIndex];
  let selectOptionWidth = Number(selectOption.dataset.resWidth);
  let selectOptionHeight = Number(selectOption.dataset.resHeight);

  constraints.audio = false;
  constraints.video = {
    width: { exact: selectOptionWidth },
    height: { exact: selectOptionHeight },
    deviceId: { exact: selectDevice.value },
  };

  console.log(constraints);

  if (window.stream) {
    DetectFn.stop();
    window.stream.getTracks().forEach(function (track) {
      track.stop();
    });
    window.stream = null;
    // delay 500ms to get new stream
    setTimeout(function () {
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => successCallback(stream))
        .catch((error) => errorCallback(error));
    }, 500);
  } else {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => successCallback(stream))
      .catch((error) => errorCallback(error));
  }
}

/**
 * 抓取第二支相機
 */
function getPIPStream() {
  setPIPResoultionState();

  /**
   * 根據第一支和第二支相機的資料為同相機，需要確定解析度是否超過，如果超過要處理
   * 取得二支相機的資料
   * @returns {} pipDeviceId, pipWidth, pipHeight
   */
  const processPIPResoultion = () => {
    let mainDevice = videoSelect[videoSelect.selectedIndex];
    let pipDevice = pipSelect[pipSelect.selectedIndex];
    let mainResoultion = resolutionSelect[resolutionSelect.selectedIndex];
    let pipResoultion = pipResolutionSelect[pipResolutionSelect.selectedIndex];
    if (videoSelect.selectedIndex !== -1) {
      if (mainDevice.value === pipDevice.value) {
        let { resWidth: mainWidth, resHeight: mainHeight } = mainResoultion.dataset;
        let { resWidth: pipWidth, resHeight: pipHeight } = pipResoultion.dataset;
        if (Number(pipWidth) > Number(mainWidth) || Number(pipHeight) > Number(mainHeight)) {
          pipResolutionSelect.selectedIndex = resolutionSelect.selectedIndex;
          pipResoultion = pipResolutionSelect[pipResolutionSelect.selectedIndex];
        }
      }
    }
    let pipDeviceId = pipDevice.value;
    let pipWidth = Number(pipResoultion.dataset.resWidth);
    let pipHeight = Number(pipResoultion.dataset.resHeight);
    return { pipDeviceId, pipWidth, pipHeight };
  };

  let { pipDeviceId, pipWidth, pipHeight } = processPIPResoultion();

  if (pipStream) {
    pipStream.getTracks().forEach((track) => {
      track.stop();
    });
    pipStream = null;
  }

  let pipConstraints = {
    audio: false,
    video: {
      width: {
        exact: pipWidth,
      },
      height: {
        exact: pipHeight,
      },
      deviceId: {
        exact: pipDeviceId,
      },
    },
  };

  setTimeout(() => {
    navigator.mediaDevices
      .getUserMedia(pipConstraints)
      .then(function (stream) {
        pipStream = stream;
        pipVideo.srcObject = stream;
        saveCameraState();
        updatePIPFramePosition();
      })
      .catch(function (error) {
        console.log(error);
      });
  }, 500);
}

/**
 * 設定第二支相機的 PIPFrame 的位置，要兼顧 liveVideo 縮放時設定 PIPFrame 的位置
 */
function updatePIPFramePosition(zoom) {
  if (!pipStream || pipSource.selectedIndex === 0) return false;
  let pipStreamWidth = pipStream.getVideoTracks()[0].getSettings().width;
  let pipStreamHeight = pipStream.getVideoTracks()[0].getSettings().height;

  let xPosValue = 10;
  let yPosValue = 10;

  pipType = pipPosition.selectedIndex + 1;
  pipWindow = pipSize.selectedIndex + 1;
  pipSize.disabled = false;

  pipFrame.style.top = "";
  pipFrame.style.left = "";
  pipFrame.style.bottom = "";
  pipFrame.style.right = "";

  if (pipType >= 1 && pipType <= 4) {
    if (!zoom) {
      zoom = liveStore["zoom"];
    }
    // 計算縮放時需要偏移的 PIPFrame 位置
    let { x: edgeX, y: edgeY } = VideoOperate.getLivePositionEdge();
    let { width: containerW, height: containerH } = liveContainer.getBoundingClientRect();
    let { width: liveVideoW, height: liveVideoH } = eventFrame.dataset;
    liveVideoW = Number(liveVideoW);

    let scaleVideoW = liveVideoW * zoom;
    let scaleVideoH = liveVideoH * zoom;
    let leftEdge = (scaleVideoW - liveVideoW) / 2;
    let leftMax = (containerW - liveVideoW) / 2;
    let topEdge = (scaleVideoH - liveVideoH) / 2;
    let topMax = (containerH - liveVideoH) / 2;

    if (leftEdge > 0 && edgeX <= 0) {
      xPosValue = -1 * (leftEdge - 10);
    }
    if (leftEdge > 0 && edgeX >= 0) {
      xPosValue = -1 * (leftMax - 10);
    }
    if (topEdge > 0 && edgeY <= 0) {
      yPosValue = -1 * (topEdge - 10);
    }
    if (topEdge > 0 && edgeY >= 0) {
      yPosValue = -1 * (topMax - 10);
    }
  }
  if (pipType === 1) {
    pipFrame.style.top = `${yPosValue}px`;
    pipFrame.style.left = `${xPosValue}px`;
  }
  if (pipType === 2) {
    pipFrame.style.top = `${yPosValue}px`;
    pipFrame.style.right = `${xPosValue}px`;
  }
  if (pipType === 3) {
    pipFrame.style.bottom = `${yPosValue}px`;
    pipFrame.style.left = `${xPosValue}px`;
  }
  if (pipType === 4) {
    pipFrame.style.bottom = `${yPosValue}px`;
    pipFrame.style.right = `${xPosValue}px`;
  }
  if (pipType == 5) {
    // customize
    let pRect = liveFrame.getBoundingClientRect();
    let lRect = pipFrame.getBoundingClientRect();
    let pipLeft = (pRect.width - lRect.width) / 2;
    let pipTop = (pRect.height - lRect.height) / 2;
    let prevLeft = pipFrame.dataset.left || null;
    let prevTop = pipFrame.dataset.top || null;
    let left = pipLeft;
    let top = pipTop;
    if (prevLeft) {
      left = prevLeft;
    }
    if (prevTop) {
      top = prevTop;
    }
    if (rotate !== parseInt(pipFrame.dataset.rotate)) {
      left = pipLeft;
      top = pipTop;
    }
    setPIPFramePosition(left, top);
  }
  let sizePercent = 20;
  // Large
  if (pipWindow === 1) {
    sizePercent = 30;
  }
  // Medium
  if (pipWindow === 2) {
    sizePercent = 25;
  }
  // Small
  if (pipWindow === 3) {
    sizePercent = 20;
  }

  let { height: containerH } = liveContainer.getBoundingClientRect();
  pipFrame.style.width = "auto";
  pipFrame.style.height = `${(containerH / 100) * sizePercent}px`;
  pipFrame.style.aspectRatio = `${pipStreamWidth}/${pipStreamHeight}`;
  pipFrame.dataset.rotate = rotate;
}

function setPIPFramePosition(left, top) {
  pipFrame.style.left = `${left}px`;
  pipFrame.style.top = `${top}px`;
  pipFrame.dataset.left = left;
  pipFrame.dataset.top = top;
}

// function getPIPStream() {
//   if (pipStream) {
//     pipStream.getTracks().forEach(function (track) {
//       track.stop();
//     });
//     pipStream = null;
//   }
//   let pipSource = pipSelect.value,
//     constraints;
//   constraints = {
//     audio: false,
//     video: true,
//   };
//   // let resolution = resolutionSelect.value;
//   // if (
//   //   resolution == 1 ||
//   //   resolution == 2 ||
//   //   resolution == 3 ||
//   //   resolution == 5 ||
//   //   resolution == 7 ||
//   //   resolution == 8 ||
//   //   resolution == 10 ||
//   //   resolution == 11 ||
//   //   resolution == 12
//   // ) {
//   //   videoRatio = 1; // 4:3
//   // } else {
//   //   videoRatio = 2; // 16:9
//   // }

//   let selectIndex = resolutionSelect.selectedIndex;
//   let selectOption = resolutionSelect.options[selectIndex];
//   let selectWidth = parseInt(selectOption.dataset.resWidth);
//   let selectHeight = parseInt(selectOption.dataset.resHeight);

//   videoRatio = 0;

//   if (selectHeight / selectWidth === 0.75) {
//     videoRatio = 1;
//   }
//   if (selectHeight / selectWidth === 0.5625) {
//     videoRatio = 2;
//   }

//   if (videoRatio == 1) {
//     // 4:3
//     constraints.video = {
//       mandatory: {
//         sourceId: pipSource,
//         minWidth: 640,
//         minHeight: 480,
//         maxWidth: 640,
//         maxHeight: 480,
//       },
//     };
//   } else if (videoRatio == 2) {
//     constraints.video = {
//       mandatory: {
//         sourceId: pipSource,
//         minWidth: 1280,
//         minHeight: 720,
//         maxWidth: 1280,
//         maxHeight: 720,
//       },
//     };
//   } else {
//     constraints.video = {
//       mandatory: {
//         sourceId: pipSource,
//         minWidth: 640,
//         minHeight: 480,
//         maxWidth: 640,
//         maxHeight: 480,
//       },
//     };
//   }

//   navigator.mediaDevices
//     .getUserMedia(constraints)
//     .then(function (stream) {
//       pipStream = stream;
//       try {
//         pipVideo.srcObject = stream;
//       } catch (error) {
//         pipVideo.src = URL.createObjectURL(stream);
//       }
//       liveVideo.style.left = 0 + "px";
//       pipVideo.style.left = "";
//       pipType = pipPosition.selectedIndex + 1;
//       if (pipType == 1 || pipType == 2) {
//         // top left & top right
//         pipFrame.style.top = 10 + "px";
//         pipFrame.style.bottom = "";
//       } else if (pipType == 3 || pipType == 4) {
//         // bottom left & bottom right
//         pipFrame.style.bottom = 10 + "px";
//         pipFrame.style.top = "";
//       }

//       if (pipType == 1 || pipType == 3) {
//         // top left & bottom left
//         pipFrame.style.left = 10 + "px";
//         pipFrame.style.right = "";
//       } else if (pipType == 2 || pipType == 4) {
//         // bottom left & top right & bottom right
//         pipFrame.style.right = 10 + "px";
//         pipFrame.style.left = "";
//       }

//       if (pipType == 5) {
//         // customize
//         let rect = pipFrame.getBoundingClientRect(),
//           pRect = liveFrame.getBoundingClientRect();
//         let left = (pRect.width - rect.width) / 2,
//           top = (pRect.height - rect.height) / 2;
//         pipFrame.style.top = top + "px";
//         pipFrame.style.left = left + "px";
//         pipFrame.style.right = "";
//         pipFrame.style.bottom = "";
//       }

//       if (pipType == 6) {
//         pipSize.disabled = true;
//         pipFrame.style.width = "100%";
//         pipFrame.style.height = "100%";
//         pipFrame.style.top = "0px";
//         pipFrame.style.bottom = "";
//         pipFrame.style.left = "50%";
//         pipFrame.style.right = "";

//         liveVideo.style.left = "-25%";
//         pipVideo.style.left = "-25%";
//       } else {
//         pipSize.disabled = false;
//         pipWindow = pipSize.selectedIndex + 1;
//         let size = 20;
//         if (pipSource != 0) {
//           if (pipWindow == 1) size = 50;
//           else if (pipWindow == 2) size = 33;
//           else if (pipWindow == 3) size = 25;
//           else if (pipWindow == 4) size = 20;
//           pipFrame.style.width = size + "%";
//           pipFrame.style.height = size + "%";
//         }
//       }

//       updateSize();
//     })
//     .catch(function (e) {
//       console.log(e);
//     });
// }

function closeStream() {
  if (window.stream) {
    window.stream.getTracks().forEach(function (track) {
      track.stop();
    });

    window.stream = null;
  }

  if (pipStream) {
    pipStream.getTracks().forEach(function (track) {
      track.stop();
    });

    pipStream = null;
  }
}

function updateThumbnail(data, mimetype) {
  if (toReviewButton.lastChild) {
    toReviewButton.removeChild(toReviewButton.lastChild);
  }
  if (mimetype) {
    if (mimetype == "image/jpeg") {
      let img = new Image();
      img.src = data;
      toReviewButton.appendChild(img);
    } else if (mimetype == "video/webm") {
      let vid;
      if (libraryLocation == 1 || data instanceof Blob || data.indexOf("blob") == 0) {
        vid = document.createElement("video");
      } else if (libraryLocation == 2) {
        vid = new Image();
      }
      if (data instanceof Blob) vid.src = window.URL.createObjectURL(data);
      else vid.src = data;
      toReviewButton.appendChild(vid);
    }
  }
}

// initialize the file System
function initFileSystem() {
  navigator.webkitPersistentStorage.requestQuota(
    maxFileSizeQuota,
    function (grantedSize) {
      filesystemSize = grantedSize;
      window.requestFileSystem(
        window.PERSISTENT,
        grantedSize,
        function (fileSystem) {
          fs = fileSystem;

          getAllDB(calculateFileSize);
          // List the file now
          if (libraryLocation == 1) listFiles();

          //getFilenames();
        },
        handleError
      );
    },
    handleError
  );
}

function getFilenames() {
  let dirReader = fs.root.createReader();
  let entries = [];

  function fetchEntries() {
    dirReader.readEntries(function (results) {
      if (!results.length) {
        entries.sort(sortFileByCreateDate);
        entries.forEach(function (entry, i) {
          if (entry.isFile) {
            filenameList.push(entry.name);
            if (i == entries.length - 1) {
              loadTheFile(entry.name, undefined, function (content) {
                if (isVideo(entry.name)) {
                  let superBuffer = new Blob([new Uint8Array(content)]);
                  updateThumbnail(superBuffer, "video/webm");
                } else if (isImage(entry.name)) {
                  updateThumbnail(content, "image/jpeg");
                }
              });
            }
          }
        });
      } else {
        entries = entries.concat(results);
        fetchEntries();
      }
    }, handleError);
  }

  fetchEntries();
}

function saveFile(filename, folder = "", content, mimetype, callback = null) {
  let dirEntry;

  if (folder != "") {
    dirEntry = folder;
  } else dirEntry = fs.root;

  dirEntry.getFile(
    filename,
    { create: true },
    function (fileEntry) {
      fileEntry.createWriter(function (fileWriter) {
        fileWriter.seek(fileWriter.length);
        fileWriter.onwriteend = function (e) {
          //console.log('blob saved')
          if (callback != null) callback();
        };

        fileWriter.onerror = function (e) {
          //console.log('Error occured: ' + e.toString() + "\n File couldn't saved");
        };

        let contentBlob = new Blob([content], { type: mimetype });

        fileWriter.write(contentBlob);
      }, handleError);
    },
    handleError
  );
}

function handleFiles(datas) {
  //console.log(datas);
  let data;

  fileList.innerHTML = "";
  filenameList = [];

  if (datas.length == 0) {
    $("#noFile").removeClass("hide");
    noFile.style.display = "flex";
    $("#deleteall").addClass("disabled");
    $("#newtab").addClass("disabled");
    $("#fileinfo").addClass("disabled");
  } else {
    data = datas.sort(sortDataByCreateDate);
    $("#noFile").addClass("hide");
    for (let i = 0; i < data.length; i++) {
      if (libraryLocation == 1) {
        // local
        if (data[i].uploaded == false) {
          addFigure(data[i].filename, true);
          filenameList.push(data[i].filename);
        }
      } else if (libraryLocation == 2) {
        // cloud
        folderName = DEFAULT_FOLDER;
        if (data[i].user == curUser) {
          filenameList.push(data[i].filename);
          if (data[i].uploaded == true) {
            let url = "https://drive.google.com/thumbnail?authuser=0&sz=w640&id=" + data[i].objectId;
            addFigure(data[i].filename, true, url, null, data[i].objectId);
            if (isImage(data[i].filename)) {
              try {
                deleteLocalFile(data[i].filename);
              } catch (err) {
                //console.error(err);
              }
            }
          } else if (data[i].uploaded == false) {
            addFigure(data[i].filename, true);
          }
        } else if (data[i].uploaded == false) {
          filenameList.push(data[i].filename);
          addFigure(data[i].filename, true);
        }
      }
    }
    //console.log("files added to list");
    if (filenameList.length == 0) {
      $("#noFile").removeClass("hide");
      noFile.style.display = "flex";
      $("#deleteall").addClass("disabled");
      $("#newtab").addClass("disabled");
      $("#fileinfo").addClass("disabled");
    }
  }
}

function listFiles() {}

function loadTheFile(filename, folder = "", callback) {
  if (typeof filename === "undefined") return;

  //var type = filename.slice(0, 5);
  //var ext = filename.slice(-3);
  let dirEntry;

  if (folder != "") {
    dirEntry = folder;
  } else dirEntry = fs.root;

  // 2nd parameter is whether to create the file or read the file, refer to deleteTheFile function
  dirEntry.getFile(
    filename,
    {},
    function (fileEntry) {
      fileEntry.file(function (file) {
        let reader = new FileReader();
        reader.onload = function (e) {
          callback(this.result);
        };
        if (isWebm(filename) || isGif(filename)) {
          reader.readAsArrayBuffer(file);
        } else if (isJpg(filename)) reader.readAsDataURL(file);
        else reader.readAsBinaryString(file); // webp format
      }, handleError);
    },
    handleError
  );
}

function deleteTheFile(filename, folder = "") {
  let dirEntry;
  //var type = filename.slice(0, 4);

  if (typeof filename === "undefined") return;

  if (folder != "") {
    dirEntry = folder;
  } else dirEntry = fs.root;

  // timelapse and stopmotion directory
  if ((isTimelapse(filename) || isStopmotion(filename)) && folder === "") {
    fs.root.getDirectory(
      filename,
      {},
      function (dirEntry) {
        let dirReader = dirEntry.createReader();
        let entries = [];

        function fetchEntries() {
          dirReader.readEntries(function (results) {
            if (!results.length) {
              if (entries.length == 0) {
                dirEntry.remove(function () {
                  //console.log('No file, directory removed.');
                  deleteFigure(filename);
                }, handleError);
              } else {
                entries.forEach(function (entry, i) {
                  deleteTheFile(entry.name, dirEntry);
                  if (i == entries.length - 1) {
                    // last file, delete the directory
                    dirEntry.remove(function () {
                      //console.log('All files deleted, directory removed.');
                      deleteFigure(filename);
                    }, handleError);
                  }
                });
              }
            } else {
              entries = entries.concat(results);
              fetchEntries();
            }
          }, handleError);
        }
        fetchEntries();
      },
      handleError
    );
  } else {
    if (libraryLocation == 1) {
      dirEntry.getFile(
        filename,
        { create: false },
        function (fileEntry) {
          fileEntry.getMetadata(function (metadata) {
            leftSize = leftSize + metadata.size;
          });
          fileEntry.remove(function (e) {}, handleError);
        },
        handleError
      );
    } else if (libraryLocation == 2) {
      let id = $('div[id="' + filename + '"]').data("id");
      if (typeof id != "undefined") {
        deleteDriveFile(authToken, id);
      } else {
        dirEntry.getFile(
          filename,
          {
            create: false,
          },
          function (fileEntry) {
            fileEntry.remove(function (e) {}, handleError);
          },
          handleError
        );
      }
    }
    deleteFigure(filename);
    deleteDB(filename);
  }

  currentPreviewIndex = filenameList.indexOf(filename);
  let remove = filenameList.splice(currentPreviewIndex, 1);
  if (currentPreviewIndex == filenameList.length) currentPreviewIndex = filenameList.length - 1;
}

function deleteLocalFile(filename) {
  let dirEntry = fs.root;

  dirEntry.getFile(
    filename,
    {
      create: false,
    },
    function (fileEntry) {
      fileEntry.remove(function (e) {
        //console.log("Local file " + filename + " deleted");
      }, handleError);
    },
    handleError
  );
}

function deleteAllFilesLocal() {
  let dirReader = fs.root.createReader();
  let entries = [];
  let dirEntry = fs.root;

  function fetchEntries() {
    dirReader.readEntries(function (results) {
      if (!results.length) {
        entries.forEach(function (entry, i) {
          //if (entry.isFile) {
          //console.log("delete " + entry.name);
          dirEntry.getFile(
            entry.name,
            {
              create: false,
            },
            function (fileEntry) {
              fileEntry.remove(function (e) {}, handleError);
            },
            handleError
          );
          //}
        });
      } else {
        entries = entries.concat(results);
        fetchEntries();
      }
    }, handleError);
  }

  fetchEntries();
}

function deleteAllFiles(datas) {
  //console.log("delete all file");
  for (let i = 0; i < datas.length; i++) {
    if (libraryLocation == 1) {
      if (datas[i].uploaded == false) {
        deleteTheFile(datas[i].filename);
      }
    } else if (libraryLocation == 2) {
      window.setTimeout(function () {
        deleteTheFile(datas[i].filename);
      }, 100 * i);
    }
  }
}

function listAllFilesLocal() {
  let dirReader = fs.root.createReader();
  let entries = [];
  let dirEntry = fs.root;

  function fetchEntries() {
    dirReader.readEntries(function (results) {
      if (!results.length) {
        entries.forEach(function (entry, i) {
          //if (entry.isFile) {
          //console.log("delete " + entry.name);
          dirEntry.getFile(
            entry.name,
            {
              create: false,
            },
            function (fileEntry) {
              console.log(fileEntry.name);
            },
            handleError
          );
          //}
        });
      } else {
        entries = entries.concat(results);
        fetchEntries();
      }
    }, handleError);
  }

  fetchEntries();
}

function createFolder(folderName, callback = null) {
  fs.root.getDirectory(
    folderName,
    { create: true },
    function (dirEntry) {
      if (callback != null) callback(dirEntry);
    },
    handleError
  );
}

function calculateFileSize(datas) {
  let size = 0;
  let dirEntry = fs.root;

  leftSize = filesystemSize;
  for (let i = 0; i < datas.length; i++) {
    if (datas[i].uploaded == false) {
      dirEntry.getFile(datas[i].filename, {}, function (fileEntry) {
        fileEntry.getMetadata(function (metadata) {
          size += metadata.size;
          if (i == datas.length - 1) {
            leftSize = filesystemSize - size;
          }
        });
      });
    } else {
      if (i == datas.length - 1) {
        leftSize = filesystemSize - size;
      }
    }
  }
}

// add a figure element into list
function addFigure(filename, insert, data = null, callback = null, objectId = null) {
  let content;
  let figure = document.createElement("div");
  figure.setAttribute("id", filename);
  figure.className = "card-file";
  if (objectId != null) figure.setAttribute("data-id", objectId);
  content = document.createElement("img");
  let fileTitle = document.createElement("div");
  fileTitle.className = "title";
  fileTitle.innerHTML = filename;

  let item = document.createElement("div");
  item.className = "item";
  item.appendChild(content);
  figure.appendChild(item);
  figure.appendChild(fileTitle);

  fileTitle = null;

  if (insert == true) {
    // insert to front
    fileList.insertBefore(figure, fileList.childNodes[0]);
  } else {
    // append to last
    fileList.appendChild(figure);
  }

  if (isVideo(filename)) {
    let tmpVideo = document.createElement("video");
    let tmpCanvas = document.createElement("canvas");
    let tmpContext = tmpCanvas.getContext("2d");

    if (data != null) {
      if (libraryLocation == 1) {
        // local
        tmpVideo.src = data;
        tmpVideo.currentTime = 1;

        tmpVideo.addEventListener("loadedmetadata", function () {
          tmpCanvas.width = tmpVideo.videoWidth;
          tmpCanvas.height = tmpVideo.videoHeight;
        });

        tmpVideo.addEventListener("loadeddata", function () {
          tmpContext.drawImage(tmpVideo, 0, 0, tmpCanvas.width, tmpCanvas.height);
          var dataURI = tmpCanvas.toDataURL("image/jpeg");
          content.src = dataURI;
          updateThumbnail(dataURI, "image/jpeg");
          (tmpVideo = null), (tmpCanvas = null), (tmpContext = null);
          if (callback != null) callback();
        });
      } else if (libraryLocation == 2) {
        // cloud
        content.src = data;
        updateThumbnail(data, "image/jpeg");
        if (callback != null) callback();
      }
    } else {
      loadTheFile(filename, undefined, function (data) {
        let superBuffer = new Blob([new Uint8Array(data)]);
        tmpVideo.src = window.URL.createObjectURL(superBuffer);
        tmpVideo.currentTime = 1;

        tmpVideo.addEventListener("loadedmetadata", function () {
          tmpCanvas.width = tmpVideo.videoWidth;
          tmpCanvas.height = tmpVideo.videoHeight;
        });

        tmpVideo.addEventListener("loadeddata", function () {
          tmpContext.drawImage(tmpVideo, 0, 0, tmpCanvas.width, tmpCanvas.height);
          var dataURI = tmpCanvas.toDataURL("image/jpeg");
          content.src = dataURI;
          updateThumbnail(dataURI, "image/jpeg");
          (tmpVideo = null), (tmpCanvas = null), (tmpContext = null);
          if (callback != null) callback();
        });
      });
    }
  } else {
    if (data != null) {
      content.src = data;
      updateThumbnail(data, "image/jpeg");
      if (callback != null) callback();
    } else {
      loadTheFile(filename, undefined, function (data) {
        if (isGif(filename)) {
          let superBuffer = new Blob([new Uint8Array(data)]);
          content.src = window.URL.createObjectURL(superBuffer);
          updateThumbnail(window.URL.createObjectURL(superBuffer), "image/gif");
        } else {
          content.src = data;
          updateThumbnail(data, "image/jpeg");
        }
        if (callback != null) callback();
      });
    }
  }

  // add double click event on the figure
  figure.addEventListener("dblclick", function (e) {
    e.preventDefault();
    currentPreviewIndex = filenameList.indexOf(filename);
    previewFile = filename;

    $("#previousFile").removeClass("disabled");
    $("#nextFile").removeClass("disabled");
    if (currentPreviewIndex == 0) $("#previousFile").addClass("disabled");
    if (currentPreviewIndex == filenameList.length - 1) $("#nextFile").addClass("disabled");

    play(filename);
    toSingleView();
    $("#files").addClass("hide");
    returnLive.style.display = "flex";
    returnList.style.display = "inline-block";

    $("#fileinfo").removeClass("disabled");
  });

  // add click event on the figure
  figure.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();

    // hide context menu
    if (menuVisible) toggleMenu("hide");

    let index = selectList.indexOf(filename);
    if (e.ctrlKey || e.metaKey) {
      // pressed ctrl or command, multiple select
      if (index == -1) {
        selectList.push(filename);
        $(this).addClass("active");
      } else if (index > -1) {
        selectList.splice(index, 1);
        $(this).removeClass("active");
      }
    } else {
      //let element;
      // remove other files' active
      let $this = $(this);
      let $siblings = $this.siblings(".card-file");
      $siblings.removeClass("active");
      $this.addClass("active");

      selectList = [];
      selectList.push(filename);
    }
  });

  figure = null;
}

function deleteFigure(filename) {
  let tmp;
  for (let i = 0; i < fileList.childNodes.length; i++) {
    if (fileList.childNodes[i].id == filename) {
      tmp = fileList.removeChild(fileList.childNodes[i]);
      if (tmp.nodeName.toLowerCase() == "figure") {
        let c = tmp.childNodes[0];
        c.src = "";
      }
      tmp = null;
      /*
			for (var i = 0; i < filenameList.length; i++) {
				if (filenameList[i] == filename) {
					filenameList.splice(i, 1);
				}
			}*/
      break;
    }
  }
}

function displayEntries(entries) {
  //while (fileList.lastChild) {
  //	fileList.removeChild(fileList.lastChild);
  //}
  fileList.innerHTML = "";

  if (entries.length == 0) {
    $("#noFile").removeClass("hide");
    noFile.style.display = "flex";
    $("#deleteall").addClass("disabled");
    $("#newtab").addClass("disabled");
    $("#fileinfo").addClass("disabled");
  } else {
    $("#noFile").addClass("hide");
    //noFile.style.display = "none";
    entries.forEach(function (entry, i) {
      if (entry.isFile) {
        addFigure(entry.name, false);
        getDB(entry.name, function (result) {
          if (result.uploaded == true) {
            updateUploadFlag(entry.name, result.uploaded);
          }
        });
      }
    });
  }
}

function handleError(error) {
  let message = "";

  switch (error.code) {
    case 2: //FileError.SECURITY_ERR:
      message = "Security Error occured";
      break;
    case 1: //FileError.NOT_FOUND_ERR:
      message = "File Not Found";
      break;
    case 10: //FileError.QUOTA_EXCEEDED_ERR:
      message = "Quota limit Exceeded";
      if (recordStart == true) {
        toggleRecording();
      }
      break;
    case 9: //FileError.INVALID_MODIFICATION_ERR:
      message = "Can''t modify";
      break;
    case 7: //FileError.INVALID_STATE_ERR:
      message = "Invalid State";
      break;
    default:
      message = "Do not know, what happened. Report to webmaster";
      break;
  }
  //console.log(message);
}

/*
 * Google Drive Functions
 */
// copy Google Drive file to another folder
function copyFile(e, filename, id, folder, callback = null) {
  let url = "https://www.googleapis.com/drive/v2/files/" + id + "/copy";
  let r,
    s = new XMLHttpRequest();
  if (folder != folderID) {
    r = {
      parents: [{ id: folder }],
    };
  } else {
    r = {
      parents: [{ id: folder }],
      title: filename + " copy",
    };
  }
  s.open("POST", url, !0),
    s.setRequestHeader("Authorization", "Bearer " + e),
    s.setRequestHeader("Content-Type", "application/json"),
    (s.onload = function (e) {
      if (200 == e.target.status || 201 == e.target.status) {
        //console.log("Copy file: success");
        let t = JSON.parse(e.target.response),
          o = "https://drive.google.com/open?id=" + t.id;
        clipboard = o;
        callback ? callback(t) : null;
      } else console.log("Copy file: error"), console.log(e.target.response), callback ? callback() : null;
    }),
    (s.onerror = function (e) {
      //console.log("Copy file: error"), console.log(e.target.response);
      callback ? callback() : null;
    }),
    s.send(JSON.stringify(r));
}

// change Google Drive file permission anyone with the link can view
function changePermission(e, id) {
  let share = "https://www.googleapis.com/drive/v2/files/" + id + "/permissions";
  let r = {
      role: "reader",
      type: "anyone",
      withLink: true,
    },
    s = new XMLHttpRequest();
  s.open("POST", share, !0),
    s.setRequestHeader("Authorization", "Bearer " + e),
    s.setRequestHeader("Content-Type", "application/json"),
    (s.onload = function (e) {
      if (200 == e.target.status || 201 == e.target.status) {
        //console.log("Change permission: success");
        let t = JSON.parse(e.target.response),
          r = t.id;
      } else console.log("Change permission: error"), console.log(e.target.response);
    }),
    (s.onerror = function (e) {
      console.log("Change permission: error"), console.log(e.target.response);
    }),
    s.send(JSON.stringify(r));
}

// move file in Google Drive to trash
function deleteDriveFile(e, id) {
  let url = "https://www.googleapis.com/drive/v2/files/" + id + "/trash";
  let s = new XMLHttpRequest();
  s.open("POST", url, !0),
    s.setRequestHeader("Authorization", "Bearer " + e),
    s.setRequestHeader("Content-Type", "application/json"),
    (s.onload = function (e) {
      if (200 == e.target.status || 201 == e.target.status) {
        //console.log("File delete success");
        let t = JSON.parse(e.target.response);
      } else console.log("File delete: error"), console.log(e.target.response);
    }),
    (s.onerror = function (e) {
      console.log("File delete: error"), console.log(e.target.response);
    }),
    s.send();
}

function uploadFile(e, t, f, o, callback = null, u = false) {
  //console.log("upload file name: " + f);
  let mimeType = "";
  if (isVideo(f)) {
    mimeType = "video/webm";
  } else if (isJpg(f)) {
    mimeType = "image/jpeg";
  } else if (isGif(f)) {
    mimeType = "image/gif";
  }
  let property = "OKIOCam";
  let metadata = {
    name: f,
    mimeType: mimeType,
    parents: [t],
  };
  if (u == true) {
    metadata.appProperties = {
      app: property,
    };
  }
  return (
    console.log("upload file"),
    new Promise(function (n, r) {
      let s = o,
        i = new MediaUploader({
          /*
				metadata: {
					appProperties: {
						"app": property
					},
					name: f,
					mimeType: mimeType,
					parents: [ t ],
				},*/
          metadata: metadata,
          file: s,
          token: e,
          onComplete: function (e) {
            // remove progress bar
            /*
					if (!inLive) {
						let figure = document.getElementById(f);
						figure.removeChild(figure.lastChild);
					}*/
            $("#liveProgressBar").val(1);
            $("#driveProgressBar").val(1);
            $("#classroomProgressBar").val(1);
            $("#liveProgressText").html("1% " + chrome.i18n.getMessage("uploadingDone"));
            $("#driveProgressText").html("1% " + chrome.i18n.getMessage("uploadingDone"));
            $("#classroomProgressText").html("1% " + chrome.i18n.getMessage("uploadingDone"));
            //console.log("Drive: upload successfull");
            let idx = uploadingFiles.indexOf(f);
            if (idx != -1) {
              uploadingFiles.splice(idx, 1);
            }
            let t = JSON.parse(e);
            callback ? callback(t) : null;
            n(t);
          },
          onError: function (e) {
            // remove progress bar
            /*
					if (!inLive) {
						let figure = document.getElementById(f);
						figure.removeChild(figure.lastChild);
					}*/
            $("#liveProgressBar").val(1);
            $("#driveProgressBar").val(1);
            $("#classroomProgressBar").val(1);
            $("#liveProgressText").html("1% " + chrome.i18n.getMessage("uploadingDone"));
            $("#driveProgressText").html("1% " + chrome.i18n.getMessage("uploadingDone"));
            $("#classroomProgressText").html("1% " + chrome.i18n.getMessage("uploadingDone"));
            //console.log("Drive: upload error"), r(e)
            let idx = uploadingFiles.indexOf(f);
            if (idx != -1) {
              uploadingFiles.splice(idx, 1);
            }
            callback ? callback() : null;
          },
          onProgress: function (e) {
            if (e.lengthComputable) {
              let p = (e.loaded / e.total) * 100;
              let r = parseInt(p);
              //console.log(r + "%");
              if (liveUploading > 0) {
                $("#liveProgressBar").val(r);
                $("#liveProgressText").html(r + "% " + chrome.i18n.getMessage("uploadingDone"));
              } else if (waitingProcess > 0) {
                $("#driveProgressBar").val(r);
                $("#classroomProgressBar").val(r);
                $("#driveProgressText").html(r + "% " + chrome.i18n.getMessage("uploadingDone"));
                $("#classroomProgressText").html(r + "% " + chrome.i18n.getMessage("uploadingDone"));
                $;
              }
            }
          },
        });
      i.upload();
    })
  );
}

function uploadData(e, filename, update, callback = null, u = false) {
  /*if (authToken) {
		uploadFile(authToken, folderID, filename, e, callback).then(function (e) {
			let o = "https://drive.google.com/open?id=" + e.id;
			changePermission(authToken, e.id);
			clipboard = o;
			updateDB(filename, true, o);
			chrome.storage.sync.get({
				savefile: DEFAULT_SAVEFILE,
				openupload: DEFAULT_OPENUPLOAD
			}, function (items) {
				if (items.savefile == 2 && items.openupload == 1) {
					chrome.tabs.create({
						url: o
					});
				}
			});
		})["catch"](function (e) {
			console.log(e)
		})
	}
	else*/ {
    chrome.identity.getAuthToken(
      {
        interactive: !0,
      },
      function (t) {
        if (chrome.runtime.lastError) {
          if (chrome.runtime.lastError.message == "The user did not approve access.") {
            if (liveUploading > 0) liveUploading -= 1;
          }
          return;
        }
        authToken = t;
        let f = new DriveService({
          token: authToken,
          folderName: folderName,
        });
        let parentID = "";
        if (update == false) {
          f.folderName = uploadFolderName;
          parentID = parentFolderID[folderLevel];
        }
        f.getFolderId(parentID).then(function (i) {
          if (update == true) folderID = i;
          authToken
            ? (console.log("upload data with google auth token"),
              uploadFile(authToken, i, filename, e, callback, u)
                .then(function (e) {
                  //e.downloadUrl;
                  //console.log(e);
                  let o = "https://drive.google.com/open?id=" + e.id;
                  changePermission(authToken, e.id);
                  //console.log("view url:", o);
                  clipboard = o;
                  if (update == true) {
                    let figure = document.getElementById(filename);
                    //console.log("updatedb in uploaddata, " + filename);
                    updateDB(curUser, filename, true, e.id);
                    figure.setAttribute("data-id", e.id);
                  }
                  /*
					chrome.storage.sync.get({
						savefile: DEFAULT_SAVEFILE,
						openupload: DEFAULT_OPENUPLOAD
					}, function (items) {
						if (items.savefile == 2 && items.openupload == 1) {
							chrome.tabs.create({
								url: o
							});
						}
					});
					*/

                  //copyToClipboard(o);
                })
                ["catch"](function (e) {
                  console.log(e);
                }))
            : console.log("can not get Google auth token");
        });
        updateLogin();
      }
    );
  }
}

function uploadData2Classroom(e, filename, callback = null) {
  let f;
  chrome.identity.getAuthToken(
    {
      interactive: !0,
    },
    function (t) {
      authToken = t;
      f = new DriveService({
        token: authToken,
        folderName: "Classroom",
      });
      f.getFolderId().then(function (id) {
        f = new DriveService({
          token: authToken,
          folderName: uploadFolderName,
        });
        f.getFolderId(id).then(function (i) {
          // get folder undre Classroom
          authToken
            ? (console.log("upload data with google auth token"),
              uploadFile(authToken, i, filename, e, callback)
                .then(function (e) {
                  let o = "https://drive.google.com/open?id=" + e.id;
                  //changePermission(authToken, e.id);
                  //updateDB(filename, true, e.id);
                })
                ["catch"](function (e) {
                  console.log(e);
                }))
            : console.log("can not get Google auth token");
        });
      });
      updateLogin();
    }
  );
}

/*
 * MediaUploader
 */
var MediaUploader = function (e) {
  let t = function () {};
  if (
    ((this.file = e.file),
    (this.contentType = e.contentType || this.file.type || "application/octet-stream"),
    (this.metadata = e.metadata || {
      title: this.file.name,
      mimeType: this.contentType,
    }),
    (this.token = e.token),
    (this.onComplete = e.onComplete || t),
    (this.onProgress = e.onProgress || t),
    (this.onError = e.onError || t),
    (this.offset = e.offset || 0),
    (this.chunkSize = e.chunkSize || 0),
    (this.retryHandler = new RetryHandler()),
    (this.url = e.url),
    !this.url)
  ) {
    let o = e.params || {};
    (o.uploadType = "resumable"), (this.url = this.buildUrl_(e.fileId, o, e.baseUrl));
  }
  this.httpMethod = e.fileId ? "PUT" : "POST";
};
(MediaUploader.prototype.upload = function () {
  let e = new XMLHttpRequest();

  e.open(this.httpMethod, this.url, !0),
    e.setRequestHeader("Authorization", "Bearer " + this.token),
    e.setRequestHeader("Content-Type", "application/json"),
    e.setRequestHeader("X-Upload-Content-Length", this.file.size),
    e.setRequestHeader("X-Upload-Content-Type", this.contentType),
    (e.onload = function (e) {
      if (e.target.status < 400) {
        let t = e.target.getResponseHeader("Location");
        (this.url = t), this.sendFile_();
      } else this.onUploadError_(e);
    }.bind(this)),
    (e.onerror = this.onUploadError_.bind(this)),
    e.send(JSON.stringify(this.metadata));
}),
  (MediaUploader.prototype.sendFile_ = function () {
    let e = this.file,
      t = this.file.size;
    (this.offset || this.chunkSize) &&
      (this.chunkSize && (t = Math.min(this.offset + this.chunkSize, this.file.size)), (e = e.slice(this.offset, t)));
    let o = new XMLHttpRequest();
    o.open("POST", this.url, !0),
      o.setRequestHeader("Content-Type", this.contentType),
      o.setRequestHeader("Content-Range", "bytes " + this.offset + "-" + (t - 1) + "/" + this.file.size),
      o.setRequestHeader("X-Upload-Content-Type", this.file.type),
      o.upload && o.upload.addEventListener("progress", this.onProgress),
      (o.onload = this.onContentUploadSuccess_.bind(this)),
      (o.onerror = this.onContentUploadError_.bind(this)),
      o.send(e);
  }),
  (MediaUploader.prototype.resume_ = function () {
    let e = new XMLHttpRequest();
    e.open("POST", this.url, !0),
      e.setRequestHeader("Content-Range", "bytes */" + this.file.size),
      e.setRequestHeader("X-Upload-Content-Type", this.file.type),
      e.upload && e.upload.addEventListener("progress", this.onProgress),
      (e.onload = this.onContentUploadSuccess_.bind(this)),
      (e.onerror = this.onContentUploadError_.bind(this)),
      e.send();
  }),
  (MediaUploader.prototype.extractRange_ = function (e) {
    let t = e.getResponseHeader("Range");
    t && (this.offset = parseInt(t.match(/\d+/g).pop(), 10) + 1);
  }),
  (MediaUploader.prototype.onContentUploadSuccess_ = function (e) {
    200 == e.target.status || 201 == e.target.status
      ? this.onComplete(e.target.response)
      : 308 == e.target.status
      ? (this.extractRange_(e.target), this.retryHandler.reset(), this.sendFile_())
      : this.onContentUploadError_(e);
  }),
  (MediaUploader.prototype.onContentUploadError_ = function (e) {
    e.target.status && e.target.status < 500
      ? this.onError(e.target.response)
      : this.retryHandler.retry(this.resume_.bind(this));
  }),
  (MediaUploader.prototype.onUploadError_ = function (e) {
    this.onError(e.target.response);
  }),
  (MediaUploader.prototype.buildQuery_ = function (e) {
    return (
      (e = e || {}),
      Object.keys(e)
        .map(function (t) {
          return encodeURIComponent(t) + "=" + encodeURIComponent(e[t]);
        })
        .join("&")
    );
  }),
  (MediaUploader.prototype.buildUrl_ = function (e, t, o) {
    let n = o || "https://www.googleapis.com/upload/drive/v3/files/";
    e && (n += e);
    let r = this.buildQuery_(t);
    return r && (n += "?" + r), n;
  });

/*
 * RetryHandler
 */
var RetryHandler = function () {
  (this.interval = 1e3), (this.maxInterval = 6e4);
};
(RetryHandler.prototype.retry = function (e) {
  setTimeout(e, this.interval), (this.interval = this.nextInterval_());
}),
  (RetryHandler.prototype.reset = function () {
    this.interval = 1e3;
  }),
  (RetryHandler.prototype.nextInterval_ = function () {
    let e = 2 * this.interval + this.getRandomInt_(0, 1e3);
    return Math.min(e, this.maxInterval);
  }),
  (RetryHandler.prototype.getRandomInt_ = function (e, t) {
    return Math.floor(Math.random() * (t - e + 1) + e);
  });

/*
 * DriveService
 */
var DriveService = function (e) {
  (this.token = e.token), (this.folderName = e.folderName), (this.metadata = e.metadata || {});
};
(DriveService.prototype.getFolderId = function (id) {
  let e = this;
  return (
    console.log("drive: get folder id"),
    new Promise(function (t, o) {
      let n = e,
        r =
          "trashed = false and 'me' in owners and mimeType = 'application/vnd.google-apps.folder' and name = '" +
          e.folderName +
          "'";
      if (id) {
        r = r + " and '" + id + "' in parents";
      }
      r = encodeURIComponent(r);
      let s = new XMLHttpRequest();
      s.open("GET", "https://www.googleapis.com/drive/v3/files?q=" + r, !0),
        s.setRequestHeader("Authorization", "Bearer " + e.token),
        s.setRequestHeader("Content-Type", "application/json"),
        (s.onload = function (e) {
          if (200 == e.target.status || 201 == e.target.status) {
            let r = JSON.parse(e.target.response),
              s = r.files[0];
            if (s) {
              //console.log("Drive: folder exists");
              let i = s.id;
              t(i);
            } else {
              //console.log("Drive: folder doesnt exist yet");
              console.log("root id " + id);
              if (id) {
                //console.log("create folder under " + id);
                n.createFolder(n.folderName, id)
                  .then(function (e) {
                    t(e);
                  })
                  ["catch"](function (e) {
                    o(e);
                  });
              } else {
                //console.log("create folder under root");
                n.createFolder(n.folderName)
                  .then(function (e) {
                    t(e);
                  })
                  ["catch"](function (e) {
                    o(e);
                  });
              }
            }
          } else console.log("Drive: get folder error"), o(e.target.response);
        }),
        (s.onerror = function (e) {
          console.log("Drive: get folder error"), o(e.target.response);
        }),
        s.send(null);
    })
  );
}),
  (DriveService.prototype.createFolder = function (e, t) {
    let o = this;
    return (
      console.log("Drive: create folder"),
      new Promise(function (n, r) {
        let s = {
          title: e,
          mimeType: "application/vnd.google-apps.folder",
        };
        t &&
          (s.parents = [
            {
              id: t,
            },
          ]);
        let i = new XMLHttpRequest();
        i.open("POST", "https://www.googleapis.com/drive/v2/files", !0),
          i.setRequestHeader("Authorization", "Bearer " + o.token),
          i.setRequestHeader("Content-Type", "application/json"),
          (i.onload = function (e) {
            if (200 == e.target.status || 201 == e.target.status) {
              console.log("Drive: folder created");
              let t = JSON.parse(e.target.response),
                o = t.id;
              n(o);
            } else console.log("Drive: create folder error"), r(e.target.response);
          }),
          (i.onerror = function (e) {
            console.log("Drive: create folder error"), r(e.target.response);
          }),
          i.send(JSON.stringify(s));
      })
    );
  }),
  (DriveService.prototype.listFolder = function (i) {
    let e = this;
    return (
      console.log("drive: list folders in root"),
      new Promise(function (t, o) {
        //let r = "trashed = false and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents";
        let r = "trashed = false and 'me' in owners and mimeType = 'application/vnd.google-apps.folder'";
        if (i) {
          r = r + " and '" + i + "' in parents";
        } else r = r + " and 'root' in parents";
        r = encodeURIComponent(r);
        let s = new XMLHttpRequest();
        s.open("GET", "https://www.googleapis.com/drive/v2/files?q=" + r + "&pageSize=500", !0),
          s.setRequestHeader("Authorization", "Bearer " + e.token),
          s.setRequestHeader("Content-Type", "application/json"),
          (s.onload = function (e) {
            if (200 == e.target.status || 201 == e.target.status) {
              let r = JSON.parse(e.target.response);
              t(r.items);
            } else console.log("Drive: list folder error"), o(e.target.response);
          }),
          (s.onerror = function (e) {
            console.log("Drive: list folder error"), o(e.target.response);
          }),
          s.send(null);
      })
    );
  }),
  (DriveService.prototype.listFiles = function (i, p) {
    let e = this;
    let result = [];
    return (
      console.log("drive: list files in folder"),
      new Promise(function (t, o) {
        //let r = "trashed = false and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents";
        let r = "trashed = false";
        if (i) {
          r = r + " and '" + i + "' in parents";
        } else r = r + "'root' in parents";
        r = r + " and appProperties has { key='app' and value='OKIOCam' }";
        //r = r + "&fields=files(originalFilename,id,thumbnailLink)";
        r = encodeURIComponent(r);
        let q = "";
        if (p) {
          q = "&pageToken=" + p;
        }
        let s = new XMLHttpRequest();
        s.open(
          "GET",
          "https://www.googleapis.com/drive/v3/files?q=" +
            r +
            q +
            "&fields=nextPageToken,files(originalFilename,id,thumbnailLink)",
          !0
        ),
          s.setRequestHeader("Authorization", "Bearer " + e.token),
          s.setRequestHeader("Content-Type", "application/json"),
          (s.onload = function (e) {
            if (200 == e.target.status || 201 == e.target.status) {
              let r = JSON.parse(e.target.response);
              //console.log(r);
              //result = result.concat(r.items);
              //result = result.concat(r.files);
              //t(r.items);
              //t(result);
              t(r);
            } else console.log("Drive: list files error"), o(e.target.response);
          }),
          (s.onerror = function (e) {
            console.log("Drive: list files error"), o(e.target.response);
          }),
          s.send(null);
      })
    );
  });

/*
 * Google Classroom Functions
 */
function getCourse(e, callback) {
  let url = "https://classroom.googleapis.com/v1/courses";
  let s = new XMLHttpRequest();
  s.open("GET", url, !0),
    s.setRequestHeader("Authorization", "Bearer " + e),
    s.setRequestHeader("Content-Type", "application/json"),
    (s.onload = function (e) {
      if (200 == e.target.status || 201 == e.target.status) {
        console.log("Get course: success");
        let t = JSON.parse(e.target.response);
        courses = t;
        callback ? callback() : null;
      } else console.log("Get course: error"), console.log(e.target.response);
    }),
    (s.onerror = function (e) {
      console.log("Get course: error"), console.log(e.target.response);
    }),
    s.send();
}

function createCourseWork(e, id, content, callback) {
  let url = "https://classroom.googleapis.com/v1/courses/" + id + "/courseWork";
  let s = new XMLHttpRequest();
  s.open("POST", url, !0),
    s.setRequestHeader("Authorization", "Bearer " + e),
    s.setRequestHeader("Content-Type", "application/json"),
    (s.onload = function (e) {
      if (200 == e.target.status || 201 == e.target.status) {
        console.log("Create coursework: success");
        let t = JSON.parse(e.target.response);
        callback ? callback(t) : null;
        //showAlert("Create success", "OK");
      } else console.log("Create coursework: error"), console.log(e.target.response), callback ? callback() : null;
    }),
    (s.onerror = function (e) {
      console.log("Create coursework: error"), console.log(e.target.response), callback ? callback() : null;
    }),
    s.send(JSON.stringify(content));
}

function getCourseWork(e, id) {
  let url = "https://classroom.googleapis.com/v1/courses/" + id + "/courseWork";
  let s = new XMLHttpRequest();
  s.open("GET", url, !0),
    s.setRequestHeader("Authorization", "Bearer " + e),
    s.setRequestHeader("Content-Type", "application/json"),
    (s.onload = function (e) {
      if (200 == e.target.status || 201 == e.target.status) {
        console.log("Get coursework: success");
        let t = JSON.parse(e.target.response);
      } else console.log("Get coursework: error"), console.log(e.target.response);
    }),
    (s.onerror = function (e) {
      console.log("Get coursework: error"), console.log(e.target.response);
    }),
    s.send();
}

function createAnnouncement(e, id, content, callback) {
  let url = "https://classroom.googleapis.com/v1/courses/" + id + "/announcements";
  let s = new XMLHttpRequest();
  s.open("POST", url, !0),
    s.setRequestHeader("Authorization", "Bearer " + e),
    s.setRequestHeader("Content-Type", "application/json"),
    (s.onload = function (e) {
      if (200 == e.target.status || 201 == e.target.status) {
        console.log("Create announcements: success");
        let t = JSON.parse(e.target.response);
        callback ? callback(t) : null;
        //showAlert("Create success", "OK");
      } else console.log("Create announcements: error"), console.log(e.target.response), callback ? callback() : null;
    }),
    (s.onerror = function (e) {
      console.log("Create announcements: error"), console.log(e.target.response), callback ? callback() : null;
    }),
    s.send(JSON.stringify(content));
}

/*
 * Zoom, Rotate, Pan parameters actions handling
 */
var startX = 0;
var startY = 0;
var offsetX = 0;
var offsetY = 0;

const move = {
  origin: { x: 0, y: 0 }, // liveFrame left and top
  before: { x: 0, y: 0 }, //  video left and top
  prev: { x: 0, y: 0 }, // prev point in mouse move
  start: { x: 0, y: 0 },
  offset: { x: 0, y: 0 },
};

// 棄用
function updateEraserCursor(event) {
  if (drawMode !== "eraser") {
    eraserCursor.style.display = "none";
    return;
  }
  if (drawMode === "eraser") {
    if (move["origin"]["x"] === 0 && move["origin"]["y"] === 0) {
      move["origin"]["x"] = liveFrame.getBoundingClientRect().x;
      move["origin"]["y"] = liveFrame.getBoundingClientRect().y;
      drawScreen.setBrushStyle(PenStore.thicknessInput.value, PenStore.colorNow.value);
      return;
    }
    let size = parseFloat(eraserCursor.style.width) / 2;
    eraserCursor.style.display = "block";
    eraserCursor.style.left = event.pageX - move["origin"]["x"] - size + "px";
    eraserCursor.style.top = event.pageY - move["origin"]["y"] - size + "px";
  }
}
// 棄用
function handleAnnotateMode(event) {
  if (!isDrawing) {
    return;
  }

  let ratio1 = getRatio();
  let ratio2 = ratio1;
  if (rotate != 0 && (rotate + 360) % 360 != 180) {
    ratio2 = getRatio2();
  }

  let newX = event.pageX - move["origin"]["x"];
  let newY = event.pageY - move["origin"]["y"];

  canvasAngle = rotate;
  canvasRotate = rotate;

  move["offset"]["x"] = newX - move["start"]["x"];
  move["offset"]["y"] = newY - move["start"]["y"];

  if (drawMode === "line" || drawMode === "rectangle" || drawMode === "circle" || drawMode === "arrow") {
    drawCtx.clearRect(0, 0, canvasPaint.width, canvasPaint.height);
    drawCtx.drawImage(drawScreen.prevCanvas, 0, 0, canvasPaint.width, canvasPaint.height);
  }

  switch (drawMode) {
    case "brush":
      //drawCanvasLine(drawCtx,  move["start"]["x"], startY, event.offsetX, event.offsetY);
      drawCanvasLine(drawCtx, move["start"]["x"], move["start"]["y"], newX, newY);
      move["start"]["x"] = newX;
      move["start"]["y"] = newY;
      break;
    case "eraser":
      //drawCanvasLine(drawCtx,  move["start"]["x"], move["start"]["y"], event.offsetX, event.offsetY);
      drawCanvasLine(drawCtx, move["start"]["x"], move["start"]["y"], newX, newY);
      move["start"]["x"] = newX;
      move["start"]["y"] = newY;
      break;
    case "line":
      //drawStraightLine(drawCtx,  move["start"]["x"], move["start"]["y"], event.offsetX, event.offsetY);
      drawStraightLine(drawCtx, move["start"]["x"], move["start"]["y"], newX, newY);
      break;
    case "rectangle":
      //drawRectangle(drawCtx,  move["start"]["x"], move["start"]["y"], event.offsetX, event.offsetY)
      drawRectangle(drawCtx, move["start"]["x"], move["start"]["y"], newX, newY);
      break;
    case "circle":
      //drawCircle(drawCtx,  move["start"]["x"], move["start"]["y"], event.offsetX, event.offsetY);
      drawCircle(drawCtx, move["start"]["x"], move["start"]["y"], newX, newY);
      break;
    case "arrow":
      //drawCanvasLine(drawCtx,  move["start"]["x"], move["start"]["y"], event.offsetX, event.offsetY);
      //drawStraightLine(drawCtx,  move["start"]["x"], move["start"]["y"], event.offsetX, event.offsetY);
      drawArrow2(drawCtx, move["start"]["x"], move["start"]["y"], newX, newY);
      // drawStraightLine(drawCtx, move["start"]["x"], move["start"]["y"], newX, newY);
      break;
    default:
      //drawCanvasLine(drawCtx,  move["start"]["x"], move["start"]["y"], event.offsetX, event.offsetY);
      drawCanvasLine(drawCtx, move["start"]["x"], move["start"]["y"], newX, newY);
  }
}
// 棄用
function handleCameraMode(event) {
  // if (true) {
  //   move["offset"]["x"] = event.pageX - move["origin"]["x"] - move["start"]["x"];
  //   move["offset"]["y"] = event.pageY - move["origin"]["y"] - move["start"]["y"];

  //   let leftEdge = Math.round(((liveStore["zoom"] - 1) * liveFrame.clientWidth) / 2);
  //   leftEdge = ((liveStore["zoom"] - 1) * liveFrame.clientWidth) / 2;
  //   let leftVal = parseFloat(v.style.left, 10);

  //   move["offset"]["x"] = move["offset"]["x"] + move["before"]["x"]; // current offest left
  //   if (move["offset"]["x"] <= -leftEdge) {
  //     // drag left offest edge
  //     move["offset"]["x"] = -leftEdge;
  //   }
  //   if (move["offset"]["x"] >= leftEdge) {
  //     // drag right offest edge
  //     move["offset"]["x"] = leftEdge;
  //   }

  //   let topEdge = Math.round(((liveStore["zoom"] - 1) * liveFrame.clientHeight) / 2);
  //   topEdge = ((liveStore["zoom"] - 1) * liveFrame.clientHeight) / 2;
  //   let topVal = parseFloat(v.style.top, 10);

  //   move["offset"]["y"] = move["offset"]["y"] + move["before"]["y"]; // current offest left
  //   if (move["offset"]["y"] <= -topEdge) {
  //     // drag bottom offest edge
  //     move["offset"]["y"] = -topEdge;
  //   }
  //   if (move["offset"]["y"] >= topEdge) {
  //     // drag top offest edge
  //     move["offset"]["y"] = topEdge;
  //   }

  //   let { moveX: moveX, moveY: moveY } = calcMouseMoveValue(move["offset"]["x"], move["offset"]["y"]);

  //   moveZoomView(moveX, moveY);

  //   updatePosition(move["offset"]["x"], move["offset"]["y"]);
  // }

  if (false) {
    offsetX = event.offsetX - startX;
    offsetY = event.offsetY - startY;

    if (mirrorFilter != "") offsetX = -offsetX;
    if (flipFilter != "") offsetY = -offsetY;

    if ((rotate + 360) % 360 == 270) {
      [offsetX, offsetY] = [offsetY, -offsetX];
    } else if ((rotate + 360) % 360 == 90) {
      [offsetX, offsetY] = [-offsetY, offsetX];
    } else if ((rotate + 360) % 360 == 180) {
      offsetX = -offsetX;
      offsetY = -offsetY;
    }
    // x pan
    //let x = (zoom - 1)*10*8*5,
    let x = ((liveStore["zoom"] - 1) * liveFrame.clientWidth) / 2,
      left = parseInt(v.style.left, 10);
    //console.log("X: " + left + " " + Math.round(x));
    if (rotate == 90 || rotate == 270) {
      let ty = 0;
      //if (videoRatio == 1) // 4:3
      ty = liveStore["zoom"] * shrinkRatio * liveFrame.clientHeight;
      //ty = zoom * shrinkRatio * canvasPaint.clientHeight;
      //else // 16:9
      //ty = zoom * shrinkRatio * liveFrame.clientWidth * 9 / 16;
      if (liveFrame.clientWidth > ty)
        //if (canvasPaint.clientWidth > ty)
        x = 0;
      else x = (ty - liveFrame.clientWidth) / 2;
      //x = (ty - canvasPaint.clientWidth) / 2;
    }
    if (left >= -Math.round(x) && left <= Math.round(x)) {
      v.style.left = left + offsetX + "px";
      //canvasPaint.style.left = (left + offsetX) + 'px';
      left = parseInt(v.style.left, 10);
      if (left < -Math.round(x)) {
        v.style.left = -Math.round(x) + "px";
        //canvasPaint.style.left = -Math.round(x) + 'px';
      } else if (left > Math.round(x)) {
        v.style.left = Math.round(x) + "px";
        //canvasPaint.style.left = Math.round(x) + 'px';
      }
    }

    // y pan
    let y,
      top = parseInt(v.style.top, 10);
    //if (videoRatio == 1)	// 4:3
    //y = (zoom - 1)*10*6*5;
    y = ((liveStore["zoom"] - 1) * liveFrame.clientHeight) / 2;
    //y = (zoom - 1) * canvasPaint.clientHeight / 2;
    //else // 16:9
    //y = (zoom - 1)*10*4.5*5;
    //y = (zoom - 1) * liveFrame.clientWidth * 9 / 16 / 2;

    //console.log("Y: " + top + " " + Math.round(y));
    if (top >= -Math.round(y) && top <= Math.round(y)) {
      v.style.top = top + offsetY + "px";
      //canvasPaint.style.top = (top + offsetY) + 'px';
      top = parseInt(v.style.top, 10);
      if (top < -Math.round(y)) {
        v.style.top = -Math.round(y) + "px";
        //canvasPaint.style.top = -Math.round(y) + 'px';
      } else if (top > Math.round(y)) {
        v.style.top = Math.round(y) + "px";
        //canvasPaint.style.top = Math.round(y) + 'px';
      }
    }
    moveZoomView(offsetX, offsetY);
  }
}
// 棄用
function handleMouseUpOrLeave(event) {
  event.preventDefault();
  pipFrame.style.cursor = "-webkit-grab";
  if (annotatorMode == true && isDrawing === true) {
    //drawCanvasLine(drawCtx, startX, startY, event.offsetX, event.offsetY);
    // 繪製剩下的points
    //if (prev !== pointStack.length && pointStack.length > prev) {
    //drawPoints(pointStack.slice(prev, pointStack.length), drawCtx);
    //}
    // drawCtx.lineWidth = 3;
    // drawCtx.strokeStyle = 'black';
    // drawScreen.pushScreen();
    // drawCtx.clearRect(0, 0, canvasPaint.width, canvasPaint.height)
    // drawPoints(pointStack,drawCtx);
    // drawScreen.drawScreen(drawScreen.canvasStack[drawScreen.step])
    //if (drawMode === 'arrow' && arrowCounter >= 5) {
    if (drawMode === "arrow") {
      // drawArrows(drawCtx,  move["start"]["x"], move["start"]["y"], event.offsetX, event.offsetY, drawCtx.lineWidth, 25, false, true);
    }
    if (drawMode === "eraser") {
      drawScreen.setCompositeOperation("source-over");
    }
    drawScreen.pushScreen();
    pointStack = [];
    nowStartFromPrevEnd = 0;
  }
  move["origin"]["x"] = 0;
  move["origin"]["y"] = 0;
  move["prev"]["x"] = 0;
  move["prev"]["y"] = 0;
  move["start"]["x"] = 0;
  move["start"]["y"] = 0;
  isDrawing = false;
  TrackFn.reset();
}
// 棄用
function calcMouseMoveValue(offsetX, offsetY) {
  if (move["prev"]["x"] === 0) {
    move["prev"]["x"] = offsetX;
  }
  if (move["prev"]["y"] === 0) {
    move["prev"]["y"] = offsetY;
  }
  let moveX = offsetX - move["prev"]["x"];
  let moveY = offsetY - move["prev"]["y"];
  move["prev"]["x"] = offsetX;
  move["prev"]["y"] = offsetY;
  return { moveX: moveX, moveY: moveY };
}
// 棄用
function onMouseDown(event) {
  event.preventDefault();
  $("#recordControl").css({ pointerEvents: "none" });

  move["origin"]["x"] = liveFrame.getBoundingClientRect().x;
  move["origin"]["y"] = liveFrame.getBoundingClientRect().y;
  move["start"]["x"] = event.pageX - move["origin"]["x"];
  move["start"]["y"] = event.pageY - move["origin"]["y"];

  if (annotatorMode === true) {
    drawScreen.setBrushStyle(PenStore.thicknessInput.value, PenStore.colorNow.value);

    let ratio1 = getRatio();
    let ratio2 = ratio1;
    if (rotate != 0 && (rotate + 360) % 360 != 180) {
      ratio2 = getRatio2();
    }
    if (drawMode !== "eraser") {
      drawScreen.setCompositeOperation("source-over");
      drawScreen.setBrushStyle(PenStore.thicknessInput.value, PenStore.colorNow.value);
    }
    if (drawMode === "eraser") {
      drawScreen.setCompositeOperation("destination-out");
      drawScreen.setBrushStyle(PenStore.thicknessInput.value, "rgba(0,0colorNow.value");
    }
    if (drawMode === "brush") {
      pointStack.push({
        x: move["start"]["x"] * ratio1,
        y: move["start"]["y"] * ratio2,
      });
    }

    isDrawing = true;
  }

  if (annotatorMode === false) {
    if (liveStore["zoom"] <= 1) return;
    move["before"]["x"] = v.style.left ? Math.round(parseFloat(v.style.left, 10)) : 0;
    move["before"]["y"] = v.style.top ? Math.round(parseFloat(v.style.top, 10)) : 0;
  }
}
// 棄用
function onMouseMove(event) {
  if (spotlightOn && !qrCodeTrack.checked) {
    // updateSpotlight(event);
  }

  const pipVideoStyle = () => {
    let rect = pipFrame.getBoundingClientRect(),
      pRect = liveFrame.getBoundingClientRect();

    move["offset"]["x"] = event.pageX - move["origin"]["x"] - move["start"]["x"];
    move["offset"]["y"] = event.pageY - move["origin"]["y"] - move["start"]["y"];

    let { moveX: offsetLeft, moveY: offsetTop } = calcMouseMoveValue(move["offset"]["x"], move["offset"]["y"]);

    let pLeft = parseInt(rect.left, 10) - parseInt(pRect.left, 10),
      pTop = parseInt(rect.top, 10) - parseInt(pRect.top, 10);

    pipFrame.style.bottom = "";
    pipFrame.style.right = "";
    pipFrame.style.left = pLeft + offsetLeft + "px";
    pipFrame.style.top = pTop + offsetTop + "px";
    pipFrame.style.cursor = "-webkit-grabbing";
  };

  if (annotatorMode === true) {
    updateEraserCursor(event);
    handleAnnotateMode(event);
  }

  if (annotatorMode === false) {
    if (move["start"]["x"] != 0 && move["start"]["y"] != 0) {
      if (inPIP == true) {
        pipVideoStyle();
        return;
      }
      if (liveStore["zoom"] <= 1) {
        return;
      }
      handleCameraMode(event);
    }
  }
}
// 棄用
function onMouseMove2(evt) {
  evt.preventDefault();
  offsetX = evt.offsetX - startX;
  offsetY = evt.offsetY - startY;

  if (startX != 0 && startY != 0) {
    //console.log("Move offsetX = " + offsetX + ", offsetY = " + offsetY);

    if ((imageRotate + 360) % 360 == 270) {
      [offsetX, offsetY] = [offsetY, -offsetX];
    } else if ((imageRotate + 360) % 360 == 90) {
      [offsetX, offsetY] = [-offsetY, offsetX];
    } else if ((imageRotate + 360) % 360 == 180) {
      offsetX = -offsetX;
      offsetY = -offsetY;
    }

    if (imageZoom > 1) {
      let clientWidth = previewFrame.clientWidth,
        clientHeight = previewFrame.clientHeight;
      //if (clientWidth > previewImage.clientWidth)
      //	clientWidth = previewImage.clientWidth;
      //if (clientHeight > previewImage.clientHeight)
      //	clientHeight = previewImage.clientHeight;
      // x pan
      let x = ((imageZoom - 1) * clientWidth) / 2,
        left = parseInt(previewImage.style.left, 10);
      //console.log("X: " + left + " " + Math.round(x));
      if (imageRatio == 1 || imageRatio == 2) {
        if (imageRotate == 90 || imageRotate == 270) {
          let ty = 0;
          //if (imageRatio == 1) // 4:3
          ty = imageZoom * imageShrinkRatio * clientHeight;
          //else // 16:9
          //ty = imageZoom * shrinkRatio * previewFrame.clientWidth * 9 / 16;
          if (clientWidth > ty) x = 0;
          else x = (ty - clientWidth) / 2;
        }
      } else if (imageRatio == 3 || imageRotate == 4) {
        if (imageRotate == 0 || imageRotate == 180) {
          let ty = 0;
          //if (imageRatio == 1) // 4:3
          ty = imageZoom * imageShrinkRatio * clientHeight;
          //else // 16:9
          //ty = imageZoom * shrinkRatio * previewFrame.clientWidth * 9 / 16;
          if (clientWidth > ty) x = 0;
          else x = (ty - clientWidth) / 2;
        }
      }
      if (left >= -Math.round(x) && left <= Math.round(x)) {
        previewImage.style.left = left + offsetX + "px";
        left = parseInt(previewImage.style.left, 10);
        if (left < -Math.round(x)) previewImage.style.left = -Math.round(x) + "px";
        else if (left > Math.round(x)) previewImage.style.left = Math.round(x) + "px";
      }

      // y pan
      let y,
        top = parseInt(previewImage.style.top, 10);
      //if (imageRatio == 1) // 4:3
      y = ((imageZoom - 1) * clientHeight) / 2;
      //else // 16:9
      //y = (imageZoom - 1) * previewFrame.clientWidth * 9 / 16 / 2;

      //console.log("Y: " + top + " " + Math.round(y));
      if (top >= -Math.round(y) && top <= Math.round(y)) {
        previewImage.style.top = top + offsetY + "px";
        top = parseInt(previewImage.style.top, 10);
        if (top < -Math.round(y)) previewImage.style.top = -Math.round(y) + "px";
        else if (top > Math.round(y)) previewImage.style.top = Math.round(y) + "px";
      }
    }
  }
}
// 棄用
function onMouseUp(event) {
  $("#recordControl").css({ pointerEvents: "auto" });
  handleMouseUpOrLeave(event);
}
// 棄用
function onMouseLeave(event) {
  $("#recordControl").css({ pointerEvents: "auto" });
  handleMouseUpOrLeave(event);
}

function onMouseClick(evt) {
  if (liveStore["zoom"] > 1 || inPIP == true || annotatorMode == true) evt.stopPropagation();
}

// predefine zoom and rotate
var zoom = 1,
  rotate = 0;
var imageZoom = 1,
  imageRotate = 0;
var shrinkRatio = 1,
  imageShrinkRatio = 1;
var widthScaleRatio = 1,
  heightScaleRatio = 1;

// Grab the necessary DOM elements
var liveFrame = document.getElementById("liveFrame"),
  v = document.querySelector("video#live"),
  controls = document.getElementById("controls");

// liveFrame.addEventListener("mousedown", onMouseDown);
// liveFrame.addEventListener("mousemove", onMouseMove);
// liveFrame.addEventListener("mouseup", onMouseUp);
// liveFrame.addEventListener("mouseleave", onMouseLeave);
// liveFrame.addEventListener("click", onMouseClick);

zoomPanel.addEventListener("click", onMouseClick);

// document.body.addEventListener("mouseleave", onMouseLeave);
document.body.addEventListener("contextmenu", function (e) {
  e.preventDefault();
  return false;
});

// Array of possible browser specific settings for transformation
var properties = ["transform", "WebkitTransform", "MozTransform", "msTransform", "OTransform"],
  prop = properties[0];

// Iterators and stuff
var i, j, t;

// Find out which CSS transform the browser supports
for (i = 0, j = properties.length; i < j; i++) {
  if (typeof liveFrame.style[properties[i]] !== "undefined") {
    prop = properties[i];
    break;
  }
}

// Position video
v.style.left = 0;
v.style.top = 0;

var longpressTimeout, repeatTimer;

// If a button was clicked (uses event delegation)...
controls.addEventListener(
  "mousedown",
  function (e) {
    e.stopPropagation();
    t = e.target;
    if (t.nodeName.toLowerCase() === "img") {
      switch (t.id) {
        // Increase zoom and set the transformation
        case "zoomin":
          if (longpressTimeout) {
            window.clearTimeout(longpressTimeout);
          }
          longpressTimeout = setTimeout(() => {
            if (repeatTimer) {
              window.clearInterval(repeatTimer);
            }
            repeatTimer = setInterval(() => {
              handleZoom("zoomin");
            }, 100);
          }, 800);

          handleZoom("zoomin");
          break;

        // Decrease zoom and set the transformation
        case "zoomout":
          if (longpressTimeout) {
            window.clearTimeout(longpressTimeout);
          }
          longpressTimeout = window.setTimeout(() => {
            if (repeatTimer) {
              window.clearInterval(repeatTimer);
            }
            repeatTimer = window.setInterval(() => {
              handleZoom("zoomout");
            }, 100);
          }, 800);

          handleZoom("zoomout");
          break;
      }
      updateZoomUI();
    }
  },
  false
);

controls.addEventListener("mouseup", function (e) {
  e.stopPropagation();
  if (longpressTimeout) {
    window.clearTimeout(longpressTimeout);
  }
  if (repeatTimer) {
    window.clearInterval(repeatTimer);
  }
});

controls.addEventListener("mouseleave", function (e) {
  e.stopPropagation();
  if (longpressTimeout) {
    window.clearTimeout(longpressTimeout);
  }
  if (repeatTimer) {
    window.clearInterval(repeatTimer);
  }
});

controls.addEventListener(
  "click",
  function (e) {
    e.stopPropagation();
    if (longpressTimeout) {
      window.clearTimeout(longpressTimeout);
    }
    if (repeatTimer) {
      window.clearInterval(repeatTimer);
    }
    t = e.target;
    if (t.nodeName.toLowerCase() === "img") {
      // Check the class name of the button and act accordingly
      //switch(t.className) {
      switch (t.id) {
        // Increase rotation and set the transformation
        case "rotateleft":
          //rotate = rotate + 90;
          rotate = parseInt((rotate + 90) / 90) * 90;
          if (rotate >= 360) rotate = rotate - 360;
          if (rotate == 90 || rotate == 270) {
            if (videoRatio == 1) {
              // 4:3
              shrinkRatio = 0.75;
            } else {
              // 16:9
              shrinkRatio = 0.5625;
            }
          } else {
            shrinkRatio = 1;
          }
          updateSize();
          updateRotate();
          updatePIPFramePosition();
          break;
        // Decrease rotation and set the transformation
        case "rotateright":
          //rotate = rotate - 90;
          rotate = parseInt((rotate - 90) / 90) * 90;
          if (rotate < 0 && rotate >= -360) rotate = rotate + 360;
          if (rotate == 90 || rotate == 270) {
            if (videoRatio == 1) {
              // 4:3
              shrinkRatio = 0.75;
            } else {
              // 16:9
              shrinkRatio = 0.5625;
            }
          } else {
            shrinkRatio = 1;
          }
          updateSize();
          updateRotate();
          updatePIPFramePosition();
          break;
        // Move video around by reading its left/top and altering it
        case "left":
          if (liveStore["zoom"] > 1) {
            //let x = (zoom - 1)*10*8*5,
            let x = ((liveStore["zoom"] - 1) * liveFrame.clientWidth) / 2,
              left = parseInt(v.style.left, 10);
            if (rotate == 90 || rotate == 270) {
              let ty = 0;
              if (videoRatio == 1)
                // 4:3
                ty = liveStore["zoom"] * shrinkRatio * liveFrame.clientHeight;
              // 16:9
              else ty = (liveStore["zoom"] * shrinkRatio * liveFrame.clientWidth * 9) / 16;
              if (liveFrame.clientWidth > ty) x = 0;
              else x = (ty - liveFrame.clientWidth) / 2;
            }
            if (left > -Math.round(x)) v.style.left = left - 5 + "px";
          }
          break;

        case "right":
          if (liveStore["zoom"] > 1) {
            //let x = (zoom - 1)*10*8*5,
            let x = ((liveStore["zoom"] - 1) * liveFrame.clientWidth) / 2,
              right = parseInt(v.style.left, 10);
            if (rotate == 90 || rotate == 270) {
              let ty = 0;
              if (videoRatio == 1)
                // 4:3
                ty = liveStore["zoom"] * shrinkRatio * liveFrame.clientHeight;
              // 16:9
              else ty = (liveStore["zoom"] * shrinkRatio * liveFrame.clientWidth * 9) / 16;
              if (liveFrame.clientWidth > ty) x = 0;
              else x = (ty - liveFrame.clientWidth) / 2;
            }
            if (right < Math.round(x)) v.style.left = right + 5 + "px";
          }
          break;

        case "up":
          if (liveStore["zoom"] > 1) {
            let y,
              top = parseInt(v.style.top, 10);
            if (videoRatio == 1) {
              // 4:3
              //y = (zoom - 1)*10*6*5;
              y = ((liveStore["zoom"] - 1) * liveFrame.clientHeight) / 2;
            } // 16:9
            //y = (zoom - 1)*10*4.5*5;
            else y = ((liveStore["zoom"] - 1) * liveFrame.clientWidth * 9) / 16 / 2;
            if (top > -Math.round(y)) v.style.top = top - 5 + "px";
          }
          break;

        case "down":
          if (liveStore["zoom"] > 1) {
            let y,
              top = parseInt(v.style.top, 10);
            if (videoRatio == 1) {
              // 4:3
              //y = (zoom - 1)*10*6*5;
              y = ((liveStore["zoom"] - 1) * liveFrame.clientHeight) / 2;
            } // 16:9
            //y = (zoom - 1)*10*4.5*5;
            else y = ((liveStore["zoom"] - 1) * liveFrame.clientWidth * 9) / 16 / 2;

            if (top < Math.round(y)) v.style.top = top + 5 + "px";
          }
          break;

        // Reset all to default
        case "reset":
          liveStore["zoom"] = 1;
          rotate = 0;
          shrinkRatio = 1;
          v.style.top = 0 + "px";
          v.style.left = 0 + "px";
          v.style[prop] =
            "rotate(" +
            rotate +
            "deg) scale(" +
            liveStore["zoom"] * shrinkRatio +
            ")" +
            " " +
            mirrorStyle +
            " " +
            flipStyle;
          v.style.filter = mirrorFilter + " " + flipFilter;
          break;
      }

      if (rotate === 90 || rotate === 270) {
        DetectFn.setCalcSize(streamHeight, streamWidth);
        TrackFn.setCalcSize(streamHeight, streamWidth);
      } else {
        DetectFn.setCalcSize(streamWidth, streamHeight);
        TrackFn.setCalcSize(streamWidth, streamHeight);
      }

      if (!qrCodeTrack.checked) {
        updateZoomUI();
      }

      e.preventDefault();
    }
  },
  false
);

function updateZoomTitle() {
  if (liveStore["zoom"] > 1) {
    //$('#zoomText').removeClass('hide');
    $("#zoomArea").removeClass("hide");
    if (liveStore["zoom"] > 6) {
      zoomText.innerHTML = "6x";
      zoomRatio.innerHTML = "6x";
    } else {
      zoomText.innerHTML = liveStore["zoom"].toFixed(1) + "x";
      zoomRatio.innerHTML = liveStore["zoom"].toFixed(1) + "x";
    }
  } else {
    //$('#zoomText').addClass('hide');
    $("#zoomArea").addClass("hide");
    zoomText.innerHTML = "1.0x";
    zoomRatio.innerHTML = "1.0x";
  }
}

function updateZoomSlider() {
  if (liveStore["zoom"] > 1) {
    if (liveStore["zoom"] > 6) {
      zoomSlider.value = 6;
    } else {
      zoomSlider.value = liveStore["zoom"];
    }
  } else {
    zoomSlider.value = 1;
  }
}

function updateZoomUI() {
  if (liveStore["zoom"] > 1) {
    //$('#zoomText').removeClass('hide');
    if (liveStore["zoom"] > 6) {
      zoomText.innerHTML = "6x";
      zoomRatio.innerHTML = "6x";
      zoomSlider.value = 6;
    } else {
      zoomText.innerHTML = liveStore["zoom"].toFixed(1) + "x";
      zoomRatio.innerHTML = liveStore["zoom"].toFixed(1) + "x";
      zoomSlider.value = liveStore["zoom"];
    }
  } else {
    //$('#zoomText').addClass('hide');
    // $("#zoomArea").addClass("hide");
    zoomText.innerHTML = "1.0x";
    zoomRatio.innerHTML = "1.0x";
    zoomSlider.value = 1;
  }
  updateOSD(zoomSlider.value);
  // VideoOperate.updateZoomViewSize();
}

/*
 * Zoom, Rotate, Pan parameters values handling
 */
// saved parameters
var tmpZoom, tmpRotate, tmpLeft, tmpTop, tmpShrinkRatio;

// Save current parameters for future use
function saveParameter() {
  tmpZoom = liveStore["zoom"];
  tmpRotate = rotate;
  tmpLeft = v.style.left;
  tmpTop = v.style.top;
  tmpShrinkRatio = shrinkRatio;
}

// Reset all parameters to default
function resetParameter() {
  liveStore["zoom"] = 1;
  rotate = 0;
  shrinkRatio = 1;
  v.style.top = 0 + "px";
  v.style.left = 0 + "px";
  if (selfieMode == true)
    v.style[prop] = "rotate(" + rotate + "deg) scale(" + liveStore["zoom"] * shrinkRatio + ")" + " " + mirrorStyle;
  else v.style[prop] = "rotate(" + rotate + "deg) scale(" + liveStore["zoom"] * shrinkRatio + ")";
  updateRotate();
  updateSize();
  updateZoomUI();
}

// Restore all parameters with saved values
function restoreParameter() {
  if (tmpZoom !== undefined) {
    liveStore["zoom"] = tmpZoom;
    rotate = tmpRotate;
    shrinkRatio = tmpShrinkRatio;

    v.style.top = tmpTop + "px";
    v.style.left = tmpLeft + "px";
    v.style[prop] =
      "rotate(" + rotate + "deg) scale(" + liveStore["zoom"] * shrinkRatio + ")" + " " + mirrorStyle + " " + flipStyle;
    updateRotate();
    updateSize();
    updateZoomUI();
  }
}

// Setting access
function loadOptions() {
  //navigator.mediaDevices.enumerateDevices().then(appendVideoOption);
  chrome.storage.sync.get(
    {
      savefile: DEFAULT_SAVEFILE,
      //openupload: DEFAULT_OPENUPLOAD,
      countdown: DEFAULT_COUNTDOWN,
      autoreview: DEFAULT_AUTOREVIEW,
      //audiosource: "",
      videosource: "",
      resolution: 5,
      focussound: DEFAULT_FOCUSSOUND,
      recordratio: 1,
      recordquality: 1,
      displaymic: DEFAULT_DISPLAY_MIC,
      folderid: "",
      button1: 1,
      btn1Zoom: "",
      url1: "",
      button2: 1,
      btn2Zoom: "",
      url2: "",
      button3: 1,
      btn3Zoom: "1-2-3-4",
      url3: "",
      pipType: DEFAULT_PIPTYPE,
      pipSize: DEFAULT_PIPSIZE,
    },
    function (items) {
      if (items.savefile == 1) {
        let tmp = document.getElementsByName("library");
        tmp[1].checked = true;
        tmp = document.getElementsByName("setupLibrary");
        tmp[1].checked = true;
      } else if (items.savefile == 2) {
        let tmp = document.getElementsByName("library");
        tmp[0].checked = true;
        tmp = document.getElementsByName("setupLibrary");
        tmp[0].checked = true;
      }
      libraryLocation = items.savefile;

      //countdownSelect.options[items.countdown - 1].selected = true;
      countdownSelect.options[0].selected = true;
      autoreviewSelect.options[items.autoreview - 1].selected = true;

      for (let i = 0; i < videoSelect.options.length; i++) {
        if (items.videosource != "") {
          if (videoSelect.options[i].text == items.videosource) {
            videoSelect.selectedIndex = i;
            break;
          }
        }
      }

      if (videoSelect.selectedIndex >= 0) {
        if (videoSelect.options[videoSelect.selectedIndex].text.indexOf("eb1a:") != -1)
          resolutionSelect.options[items.resolution - 2].selected = true;
      }

      focussoundSelect.options[items.focussound - 1].selected = true;
      focusSound = items.focussound == 1 ? true : false;

      recordRatioSelect.options[items.recordratio - 1].selected = true;
      recordQualitySelect.options[items.recordquality - 1].selected = true;

      if (items.recordratio == 1) {
        $("#recordQuality").children('option[value="1"]').text(chrome.i18n.getMessage("recordSettingQualityLow1"));
        $("#recordQuality").children('option[value="2"]').text(chrome.i18n.getMessage("recordSettingQualityHigh1"));
      } else if (items.recordratio == 2) {
        $("#recordQuality").children('option[value="1"]').text(chrome.i18n.getMessage("recordSettingQualityLow2"));
        $("#recordQuality").children('option[value="2"]').text(chrome.i18n.getMessage("recordSettingQualityHigh2"));
      }

      if (items.displaymic == 1) displayMicCheck.checked = false;
      else if (items.displaymic == 2) displayMicCheck.checked = true;
      /*
		for (var i = 0; i < audioSelect.options.length; i++) {
			if (items.audiosource != "") {
				if (audioSelect.options[i].text == items.audiosource) {
					audioSelect.selectedIndex = i;
					break;
				}
			}
		}
		*/
      folderID = items.folderid;

      //console.log("saved folder name: " + folderName);
      let tmp;
      btn1 = items.button1;
      button1Select.selectedIndex = btn1 - 1;
      btn1Zoom = items.btn1Zoom.split("-");
      if (btn1 == 2) {
        $("#btn1Text").removeClass("hide");
        $("#btn1Zoom").removeClass("hide");
        tmp = document.getElementsByName("zoom1");
        if (btn1Zoom.length == 3 && btn1Zoom[0] == "1" && btn1Zoom[1] == "1.4" && btn1Zoom[2] == "2") {
          tmp[0].checked = true;
        } else if (
          btn1Zoom.length == 4 &&
          btn1Zoom[0] == "1" &&
          btn1Zoom[1] == "2" &&
          btn1Zoom[2] == "3" &&
          btn1Zoom[3] == "4"
        ) {
          tmp[1].checked = true;
        } else {
          //console.log("button1: " + btn1Zoom);
          tmp[2].checked = true;
          if (btn1Zoom.length >= 1) $("#btn1Zoom1").val(btn1Zoom[0]);
          if (btn1Zoom.length >= 2) $("#btn1Zoom2").val(btn1Zoom[1]);
          if (btn1Zoom.length >= 3) $("#btn1Zoom3").val(btn1Zoom[2]);
          if (btn1Zoom.length >= 4) $("#btn1Zoom4").val(btn1Zoom[3]);
        }
      } else if (btn1 == 5) {
        $("#url1").removeClass("hide");
        document.getElementById("url1").value = items.url1;
      } else {
        $("#btn1Text").addClass("hide");
        $("#btn1Zoom").addClass("hide");
        $("#url1").addClass("hide");
      }
      btn2 = items.button2;
      button2Select.selectedIndex = btn2 - 1;
      btn2Zoom = items.btn2Zoom.split("-");
      if (btn2 == 2) {
        $("#btn2Text").removeClass("hide");
        $("#btn2Zoom").removeClass("hide");
        tmp = document.getElementsByName("zoom2");
        if (btn2Zoom.length == 3 && btn2Zoom[0] == "1" && btn2Zoom[1] == "1.4" && btn2Zoom[2] == "2") {
          tmp[0].checked = true;
        } else if (
          btn2Zoom.length == 4 &&
          btn2Zoom[0] == "1" &&
          btn2Zoom[1] == "2" &&
          btn2Zoom[2] == "3" &&
          btn2Zoom[3] == "4"
        ) {
          tmp[1].checked = true;
        } else {
          tmp[2].checked = true;
          if (btn2Zoom.length >= 1) $("#btn2Zoom1").val(btn2Zoom[0]);
          if (btn2Zoom.length >= 2) $("#btn2Zoom2").val(btn2Zoom[1]);
          if (btn2Zoom.length >= 3) $("#btn2Zoom3").val(btn2Zoom[2]);
          if (btn2Zoom.length >= 4) $("#btn2Zoom4").val(btn2Zoom[3]);
        }
      } else if (btn2 == 5) {
        $("#url2").removeClass("hide");
        document.getElementById("url2").value = items.url2;
      } else {
        $("#btn2Text").addClass("hide");
        $("#btn2Zoom").addClass("hide");
        $("#url2").addClass("hide");
      }
      btn3 = items.button3;
      button3Select.selectedIndex = btn3 - 1;
      btn3Zoom = items.btn3Zoom.split("-");
      if (btn3 == 1) {
        $("#btn3Text").removeClass("hide");
        $("#btn3Zoom").removeClass("hide");
        tmp = document.getElementsByName("zoom3");
        if (btn3Zoom.length == 3 && btn3Zoom[0] == "1" && btn3Zoom[1] == "1.4" && btn3Zoom[2] == "2") {
          tmp[0].checked = true;
        } else if (
          btn3Zoom.length == 4 &&
          btn3Zoom[0] == "1" &&
          btn3Zoom[1] == "2" &&
          btn3Zoom[2] == "3" &&
          btn3Zoom[3] == "4"
        ) {
          tmp[1].checked = true;
        } else {
          tmp[2].checked = true;
          if (btn3Zoom.length >= 1) $("#btn3Zoom1").val(btn3Zoom[0]);
          if (btn3Zoom.length >= 2) $("#btn3Zoom2").val(btn3Zoom[1]);
          if (btn3Zoom.length >= 3) $("#btn3Zoom3").val(btn3Zoom[2]);
          if (btn3Zoom.length >= 4) $("#btn3Zoom4").val(btn3Zoom[3]);
        }
      } else if (btn3 == 5) {
        $("#url3").removeClass("hide");
        document.getElementById("url3").value = items.url3;
      } else {
        $("#btn3Text").addClass("hide");
        $("#btn3Zoom").addClass("hide");
        $("#url3").addClass("hide");
      }

      pipType = items.pipType;
      pipPosition.options[pipType - 1].selected = true;
      pipWindow = items.pipSize;
      pipSize.options[pipWindow - 1].selected = true;
    }
  );
}

function saveOptions() {
  let savefile, //= saveCheck.checked == true ? 2 : 1,
    countdown = countdownSelect.value,
    autoreview = autoreviewSelect.value,
    displaymic = displayMicCheck.checked == true ? 2 : 1,
    videosource = savedDevice,
    resolution = savedResolution,
    focussound = focussoundSelect.selectedIndex + 1,
    recordratio = recordRatioSelect.selectedIndex + 1,
    recordquality = recordQualitySelect.selectedIndex + 1,
    folderid = folderID,
    button1 = button1Select.selectedIndex + 1,
    button2 = button2Select.selectedIndex + 1,
    button3 = button3Select.selectedIndex + 1,
    sbtn1Zoom = "",
    sbtn2Zoom = "",
    sbtn3Zoom = "",
    url1 = "",
    url2 = "",
    url3 = "",
    pipType = pipPosition.selectedIndex + 1,
    pipUseSize = pipSize.selectedIndex + 1;
  let tmp;

  if (button1 == 2) {
    tmp = document.getElementsByName("zoom1");
    if (tmp[0].checked) {
      sbtn1Zoom = "1" + "-" + "1.4" + "-" + "2";
    } else if (tmp[1].checked) {
      sbtn1Zoom = "1" + "-" + "2" + "-" + "3" + "-" + "4";
    } else if (tmp[2].checked) {
      sbtn1Zoom =
        document.getElementById("btn1Zoom1").value +
        "-" +
        document.getElementById("btn1Zoom2").value +
        "-" +
        document.getElementById("btn1Zoom3").value +
        "-" +
        document.getElementById("btn1Zoom4").value;
    }
    btn1Zoom = sbtn1Zoom.split("-");
  } else if (button1 == 5) {
    url1 = document.getElementById("url1").value;
  }

  if (button2 == 2) {
    tmp = document.getElementsByName("zoom2");
    if (tmp[0].checked) {
      sbtn2Zoom = "1" + "-" + "1.4" + "-" + "2";
    } else if (tmp[1].checked) {
      sbtn2Zoom = "1" + "-" + "2" + "-" + "3" + "-" + "4";
    } else if (tmp[2].checked) {
      sbtn2Zoom =
        document.getElementById("btn2Zoom1").value +
        "-" +
        document.getElementById("btn2Zoom2").value +
        "-" +
        document.getElementById("btn2Zoom3").value +
        "-" +
        document.getElementById("btn2Zoom4").value;
    }
    btn2Zoom = sbtn2Zoom.split("-");
  } else if (button2 == 5) {
    url2 = document.getElementById("url2").value;
  }

  if (button3 == 1) {
    tmp = document.getElementsByName("zoom3");
    if (tmp[0].checked) {
      sbtn3Zoom = "1" + "-" + "1.4" + "-" + "2";
    } else if (tmp[1].checked) {
      sbtn3Zoom = "1" + "-" + "2" + "-" + "3" + "-" + "4";
    } else if (tmp[2].checked) {
      sbtn3Zoom =
        document.getElementById("btn3Zoom1").value +
        "-" +
        document.getElementById("btn3Zoom2").value +
        "-" +
        document.getElementById("btn3Zoom3").value +
        "-" +
        document.getElementById("btn3Zoom4").value;
    }
    btn3Zoom = sbtn3Zoom.split("-");
  } else if (button3 == 5) {
    url3 = document.getElementById("url3").value;
  }

  //savefile = libraryLocation;
  savefile = DEFAULT_SAVEFILE;

  //console.log("savefile = " + savefile);
  //console.log('openupload = ' + openupload);
  //console.log('countdown = ' + countdown);
  //console.log('autoreview = ' + autoreview);
  chrome.storage.sync.set({
    savefile: savefile,
    countdown: countdown,
    autoreview: autoreview,
    displaymic: displaymic,
    videosource: videosource,
    resolution: resolution,
    focussound: focussound,
    recordratio: recordratio,
    recordquality: recordquality,
    folderid: folderid,
    button1: button1,
    btn1Zoom: sbtn1Zoom,
    url1: url1,
    button2: button2,
    btn2Zoom: sbtn2Zoom,
    url2: url2,
    button3: button3,
    btn3Zoom: sbtn3Zoom,
    url3: url3,
    pipType: pipType,
    pipSize: pipUseSize,
  });
}

var inPIP = false;
pipFrame.addEventListener("mouseenter", function (e) {
  let pipType = pipPosition.selectedIndex + 1;
  if (pipType == 5) {
    inPIP = true;
    pipFrame.style.cursor = "-webkit-grab";
  } else {
    pipFrame.style.cursor = "";
  }
});
pipFrame.addEventListener("mouseleave", function (e) {
  inPIP = false;
  pipFrame.style.cursor = "";
});

document.body.addEventListener("keydown", function (event) {
  if (inLive && !$("#modal_setting").hasClass("active")) {
    if (event.code == "NumpadAdd" || event.code == "Equal") {
      if (recordStart == false) {
        handleZoom("zoomin");
        updateZoomUI();
      }
    } else if (event.code == "NumpadSubtract" || event.code == "Minus") {
      if (recordStart == false) {
        handleZoom("zoomout");
        updateZoomUI();
      }
    } else if (event.code == "KeyE") {
      increaseExp();
    } else if (event.code == "KeyD") {
      decreaseExp();
    } else if (event.code == "KeyF") {
      if (recordStart == false) {
        eventFire(document.getElementById("freezeButton"), "click");
      }
    } else if (event.code == "KeyS") {
      toggleSelfie();
    } else if (event.code == "KeyR") {
      if (recordStart == false) {
        eventFire(document.getElementById("rotateleft"), "click");
      }
    } else if (event.code == "KeyP") {
      resetLive();
    } else if (event.code == "Enter" || event.code == "NumpadEnter" || event.code == "Space") {
      triggerFocus();
    } else if (event.code == "KeyC") {
      $("#hline").toggleClass("hide");
      $("#vline").toggleClass("hide");
    }
    if (liveStore["zoom"] > 1) {
      if (event.code == "ArrowLeft") {
        // left
        //let x = (liveStore["zoom"] - 1)*10*8*5,	// 800*(liveStore["zoom"]-1)/2
        let x = ((liveStore["zoom"] - 1) * liveFrame.clientWidth) / 2,
          left = parseInt(v.style.left, 10);
        if (rotate == 90 || rotate == 270) {
          let ty = 0;
          //if (videoRatio == 1) // 4:3
          ty = liveStore["zoom"] * shrinkRatio * liveFrame.clientHeight;
          //else // 16:9
          //ty = liveStore["zoom"] * shrinkRatio * liveFrame.clientWidth * 9 / 16;
          if (liveFrame.clientWidth > ty) x = 0;
          else x = (ty - liveFrame.clientWidth) / 2;
        }
        if (left + 5 > Math.round(x)) {
          v.style.left = Math.round(x) + "px";
          //canvasPaint.style.left = Math.round(x) + 'px';
        } else {
          v.style.left = left + 5 + "px";
          //canvasPaint.style.left = (left + 5) + 'px';
        }
        panZoomView(0);
      } else if (event.code == "ArrowRight") {
        //right
        //let x = (liveStore["zoom"] - 1)*10*8*5,
        let x = ((liveStore["zoom"] - 1) * liveFrame.clientWidth) / 2,
          right = parseInt(v.style.left, 10);
        if (rotate == 90 || rotate == 270) {
          let ty = 0;
          //if (videoRatio == 1) // 4:3
          ty = liveStore["zoom"] * shrinkRatio * liveFrame.clientHeight;
          //else // 16:9
          //ty = liveStore["zoom"] * shrinkRatio * liveFrame.clientWidth * 9 / 16;
          if (liveFrame.clientWidth > ty) x = 0;
          else x = (ty - liveFrame.clientWidth) / 2;
        }
        if (right - 5 < -Math.round(x)) {
          v.style.left = -Math.round(x) + "px";
          //canvasPaint.style.left = -Math.round(x) + 'px';
        } else {
          v.style.left = right - 5 + "px";
          //canvasPaint.style.left = (right - 5) + 'px';
        }

        panZoomView(1);
      } else if (event.code == "ArrowUp") {
        // up
        let y,
          top = parseInt(v.style.top, 10);
        //if (videoRatio == 1) { // 4:3
        //y = (liveStore["zoom"] - 1)*10*6*5;
        y = ((liveStore["zoom"] - 1) * liveFrame.clientHeight) / 2;
        //} else // 16:9
        //y = (liveStore["zoom"] - 1)*10*4.5*5;
        //y = (liveStore["zoom"] - 1) * liveFrame.clientWidth * 9 / 16 / 2;

        if (top + 5 > Math.round(y)) {
          v.style.top = Math.round(y);
          //canvasPaint.style.top = Math.round(y);
        } else {
          v.style.top = top + 5 + "px";
          //canvasPaint.style.top = (top + 5) + 'px';
        }

        panZoomView(2);
      } else if (event.code == "ArrowDown") {
        // down
        let y,
          top = parseInt(v.style.top, 10);
        //if (videoRatio == 1) { // 4:3
        //y = (liveStore["zoom"] - 1)*10*6*5;	// 600*(liveStore["zoom"]-1)/2
        y = ((liveStore["zoom"] - 1) * liveFrame.clientHeight) / 2;
        //} else // 16:9
        //y = (liveStore["zoom"] - 1)*10*4.5*5;	// 450*(liveStore["zoom"]-1)/2
        //y = (liveStore["zoom"] - 1) * liveFrame.clientWidth * 9 / 16 / 2;

        if (top - 5 < -Math.round(y)) {
          v.style.top = -Math.round(y);
          //canvasPaint.style.top = -Math.round(y);
        } else {
          v.style.top = top - 5 + "px";
          //canvasPaint.style.top = (top - 5) + 'px';
        }

        panZoomView(3);
      }
    }
  }
});

document.body.addEventListener("click", function (event) {
  // console.log(event.target);
  if (
    inLive &&
    $("#record-confirm").hasClass("hide") &&
    !$("#modal_setting").hasClass("active") &&
    !$("#annotatorMode").hasClass("active") &&
    !$("#effectControl").hasClass("active")
  ) {
    toggleHideUI();
  }
});

document.body.addEventListener("mousedown", function (e) {
  //console.log("body mouse down");
});

document.body.addEventListener("mouseup", function (e) {
  //console.log("body mouse up");
});

document.body.addEventListener("wheel", function (e) {
  //if (recordStart == false && inLive && !$('#modal_setting').hasClass('active')) {
  if (inLive && !$("#modal_setting").hasClass("active")) {
    if (e.deltaY < 0) {
      throttleHandleZoom("zoomin");
    } else if (e.deltaY > 0) {
      throttleHandleZoom("zoomout");
    }
    // if (qrCodeTrack.checked) {
    //   if (e.deltaY < 0) {
    //     throttleHandleZoom("zoomin");
    //   } else if (e.deltaY > 0) {
    //     throttleHandleZoom("zoomout");
    //   }
    // } else {
    //   if (e.deltaY < 0) {
    //     throttleHandleZoom("zoomin");
    //   } else if (e.deltaY > 0) {
    //     throttleHandleZoom("zoomout");
    //   }
    // }
  }
});

/*
 * Zoom Panel
 */
let panelWidth = 100,
  panelHeight = 75;
zoomView.style.left = (panelWidth - panelWidth / liveStore["zoom"]) / 2 + "px";
zoomView.style.top = (panelHeight - panelHeight / liveStore["zoom"]) / 2 + "px";

function updateZoomPanelSize() {
  panelWidth = (panelHeight / streamHeight) * streamWidth;
  zoomPanel.style.width = panelWidth + "px";
  zoomPanel.style.height = panelHeight + "px";
  if (rotate === 90 || rotate === 270) {
    zoomPanel.style.width = panelHeight + "px";
    zoomPanel.style.height = panelWidth + "px";
  }
  VideoOperate.updateZoomViewSize();
}

function panZoomView(dir) {
  console.log(dir);
  //let stepx = Math.round((zoom - 1) * 8 * 5 * 2),
  let stepx = Math.round((((liveStore["zoom"] - 1) * liveFrame.clientWidth) / 10) * 2),
    stepy,
    lengthx = panelWidth - panelWidth / liveStore["zoom"],
    lengthy = panelHeight - panelHeight / liveStore["zoom"],
    dx = lengthx / stepx,
    dy;
  //if (videoRatio == 1) { // 4:3
  //stepy = Math.round((zoom - 1) * 6 * 5 * 2);
  stepy = Math.round((((liveStore["zoom"] - 1) * liveFrame.clientHeight) / 10) * 2);
  //} else { // 16:9
  //stepy = Math.round((zoom - 1) * 4.5 * 5 * 2);
  //stepy = Math.round((zoom - 1) * liveFrame.clientWidth * 9 / 16 / 10 * 2 );
  //}
  dy = lengthy / stepy;
  let zl = parseFloat(zoomView.style.left),
    zt = parseFloat(zoomView.style.top);

  switch (dir) {
    case 0: // left
      if (zl - dx < 0) zoomView.style.left = 0;
      else zoomView.style.left = zl - dx + "px";
      break;

    case 1: // right
      if (zl + dx > lengthx) zoomView.style.left = lengthx + "px";
      else zoomView.style.left = zl + dx + "px";
      break;

    case 2: //	up
      if (zt - dy < 0) zoomView.style.top = 0;
      else zoomView.style.top = zt - dy + "px";
      break;

    case 3: // down
      if (zt + dy > lengthy) zoomView.style.top = lengthy + "px";
      else zoomView.style.top = zt + dy + "px";
      break;
  }
}

function moveZoomView(x, y) {
  //let dx = x * (panelWidth / 800),
  //	dy = y * (panelHeight / 600),
  let dx = x * (panelWidth / (liveFrame.clientWidth * liveStore["zoom"])),
    dy = y * (panelHeight / (liveFrame.clientHeight * liveStore["zoom"])),
    rangeX = panelWidth - panelWidth / liveStore["zoom"],
    rangeY = panelHeight - panelHeight / liveStore["zoom"],
    zl = parseFloat(zoomView.style.left),
    zt = parseFloat(zoomView.style.top);
  if (zl - dx < 0) {
    zoomView.style.left = 0;
  } else if (zl - dx > rangeX) {
    zoomView.style.left = rangeX + "px";
  } else zoomView.style.left = zl - dx + "px";

  if (zt - dy < 0) {
    zoomView.style.top = 0;
  } else if (zt - dy > rangeY) {
    zoomView.style.top = rangeY + "px";
  } else zoomView.style.top = zt - dy + "px";
}

// dragElement(zoomView);

function dragElement(elmnt) {
  if (document.getElementById(elmnt.id + "header")) {
    /* if present, the header is where you move the DIV from:*/
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    /* otherwise, move the DIV from anywhere inside the DIV:*/
    elmnt.onmousedown = dragMouseDown;
    elmnt.onclick = preventPropagate;
  }

  let pos1 = 0;
  let pos2 = 0;
  let pos3 = 0;
  let pos4 = 0;
  let offsetX = 0;
  let offsetY = 0;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    e.stopPropagation();
    // get the mouse cursor position at startup:
    pos3 = e.offsetX;
    pos4 = e.offsetY;
    // call a function whenever the cursor moves:
    elmnt.onmousemove = zoomViewDrag;
    elmnt.onmouseup = closeDragElement;
    elmnt.onmouseleave = closeDragElement;
  }

  function zoomViewDrag(e) {
    e = e || window.event;
    e.preventDefault();
    e.stopPropagation();
    // calculate the new cursor position:
    pos1 = pos3 - e.offsetX;
    pos2 = pos4 - e.offsetY;
    let offsetX = pos1 * ((liveFrame.clientWidth * liveStore["zoom"]) / panelWidth);
    let offsetY = pos2 * ((liveFrame.clientHeight * liveStore["zoom"]) / panelHeight);

    moveZoomView(offsetX, offsetY);

    let x = Math.round(((liveStore["zoom"] - 1) * liveFrame.clientWidth) / 2);
    let left = parseFloat(v.style.left, 10);

    if (left >= -x && left <= x) {
      offsetX = offsetX + left;
      if (offsetX <= -x) {
        offsetX = -x;
      }
      if (offsetX >= x) {
        offsetX = x;
      }
      v.style.left = offsetX + "px";
    }

    let y = Math.round(((liveStore["zoom"] - 1) * liveFrame.clientHeight) / 2);
    let top = parseFloat(v.style.top, 10);

    if (top >= -y && top <= y) {
      offsetY = offsetY + top;
      if (offsetY <= -y) {
        offsetY = -y;
      }
      if (offsetY >= y) {
        offsetY = y;
      }
      v.style.top = offsetY + "px";
    }
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    e.stopPropagation();
    // calculate the new cursor position:
    pos1 = pos3 - e.offsetX;
    pos2 = pos4 - e.offsetY;
    //pos3 = e.offsetX;
    //pos4 = e.offsetY;
    //let offsetX = pos1 * (800 / panelWidth),
    //	offsetY = pos2 * (600 / panelHeight);
    let offsetX = pos1 * ((liveFrame.clientWidth * liveStore["zoom"]) / panelWidth),
      offsetY = pos2 * ((liveFrame.clientHeight * liveStore["zoom"]) / panelHeight);
    // set the element's new position:
    moveZoomView(offsetX, offsetY);
    //elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    //elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";

    // set video position
    // x pan
    //let x = (zoom - 1) * 10 * 8 * 5,
    let x = ((liveStore["zoom"] - 1) * liveFrame.clientWidth) / 2,
      left = parseInt(v.style.left, 10);
    //console.log("X: " + left + " " + Math.round(x));
    if (rotate == 90 || rotate == 270) {
      let ty = 0;
      if (videoRatio == 1)
        // 4:3
        ty = liveStore["zoom"] * shrinkRatio * liveFrame.clientHeight;
      // 16:9
      else ty = (liveStore["zoom"] * shrinkRatio * liveFrame.clientWidth * 9) / 16;
      if (liveFrame.clientWidth > ty) x = 0;
      else x = (ty - liveFrame.clientWidth) / 2;
    }
    if (left >= -Math.round(x) && left <= Math.round(x)) {
      v.style.left = left + offsetX + "px";
      left = parseInt(v.style.left, 10);
      if (left < -Math.round(x)) v.style.left = -Math.round(x) + "px";
      else if (left > Math.round(x)) v.style.left = Math.round(x) + "px";
    }

    // y pan
    let y,
      top = parseInt(v.style.top, 10);
    if (videoRatio == 1)
      // 4:3
      //y = (zoom - 1) * 10 * 6 * 5;
      y = ((liveStore["zoom"] - 1) * liveFrame.clientHeight) / 2;
    // 16:9
    //y = (zoom - 1) * 10 * 4.5 * 5;
    else y = ((liveStore["zoom"] - 1) * liveFrame.clientWidth * 9) / 16 / 2;

    //console.log("Y: " + top + " " + Math.round(y));
    if (top >= -Math.round(y) && top <= Math.round(y)) {
      v.style.top = top + offsetY + "px";
      top = parseInt(v.style.top, 10);
      if (top < -Math.round(y)) v.style.top = -Math.round(y) + "px";
      else if (top > Math.round(y)) v.style.top = Math.round(y) + "px";
    }
  }

  function closeDragElement(e) {
    /* stop moving when mouse button is released:*/
    e.stopPropagation();
    elmnt.onmouseup = null;
    elmnt.onmouseleave = null;
    elmnt.onmousemove = null;
    (pos3 = 0), (pos4 = 0);
  }

  function preventPropagate(e) {
    e.stopPropagation();
  }
}

// first time setup process
function setup() {
  switch (setupStep) {
    case 1:
      $("#step1").removeClass("hide");
      $("#desc1").removeClass("hide");
      $("#step2").addClass("hide");
      $("#desc2").addClass("hide");
      $("#step3").addClass("hide");
      $("#desc3").addClass("hide");
      $("#SkipSetup").removeClass("hide");
      $("#cancelSetup").addClass("hide");
      $("#prevStep").addClass("hide");
      $("#nextStep").html("Next");
      break;

    case 2:
      $("#step1").addClass("hide");
      $("#desc1").addClass("hide");
      $("#step2").removeClass("hide");
      $("#desc2").removeClass("hide");
      $("#step3").addClass("hide");
      $("#desc3").addClass("hide");
      $("#SkipSetup").addClass("hide");
      $("#cancelSetup").removeClass("hide");
      $("#prevStep").removeClass("hide");
      $("#nextStep").html("Next");
      break;

    case 3:
      $("#step1").addClass("hide");
      $("#desc1").addClass("hide");
      $("#step2").addClass("hide");
      $("#desc2").addClass("hide");
      $("#step3").removeClass("hide");
      $("#desc3").removeClass("hide");
      $("#SkipSetup").addClass("hide");
      $("#cancelSetup").addClass("hide");
      $("#prevStep").removeClass("hide");
      $("#nextStep").html("Finish");
      break;
  }
}

$(".annotator").on("click", (e) => {
  e.stopPropagation();
});
$(".annotator .color-item").on("click", function (e) {
  const color = e.currentTarget.dataset.color;
  const index = $(this).index();
  PenStore.setColorValue(color);
  PenStore.setColorIndex(index);
  PenStore.setBorderColorStyle();
  PenStore.savePenStyle();
  PenStore.drawPenWeight();
  drawScreen.setBrushStyle(PenStore.thicknessInput.value, PenStore.colorNow.value);
});
$(".annotator .cutom-color-input").on("change", function (e) {
  PenStore.savePenStyle();
  drawScreen.setBrushStyle(PenStore.thicknessInput.value, PenStore.colorNow.value);
});
$(".annotator .cutom-color-input").on("input", function (e) {
  const color = e.currentTarget.value;
  PenStore.setColorValue(color);
  PenStore.setBgColorStyle();
  PenStore.setBorderColorStyle();
  PenStore.drawPenWeight();
});
$(".annotator .cutom-color-input").on("click", function (e) {
  let isActive = $(this).parent().hasClass("active");
  if (!isActive) {
    e.preventDefault();
  }
});
$(".annotator .thickness-input").on("input", function (e) {
  PenStore.setColorValue();
  PenStore.drawPenWeight();
  PenStore.savePenStyle();
  drawScreen.setBrushStyle(PenStore.thicknessInput.value, PenStore.colorNow.value);
  drawScreen.setEraserCursorSize();
});
$(".annotator .pen-item").on("click", (e) => {
  $("#canvasPaint").removeClass("pen-cursor");
  $("#canvasPaint").removeClass("cross-cursor");
  $("#canvasPaint").removeClass("circle-cursor");

  $(".annotator .pen-item").removeClass("activated");
  const type = e.currentTarget.dataset.pentype;

  switch (type) {
    case "freehand":
      drawMode = "brush";
      $(".annotator .pen-freehand").addClass("activated");
      if (annotatorMode == true) {
        $("#canvasPaint").addClass("pen-cursor");
      }
      break;
    case "diagonal_line":
      drawMode = "line";
      $(".annotator .pen-diagonal_line").addClass("activated");
      if (annotatorMode == true) {
        $("#canvasPaint").addClass("pen-cursor");
      }
      break;
    case "rectangle":
      drawMode = "rectangle";
      $(".annotator .pen-rectangle").addClass("activated");
      if (annotatorMode == true) {
        $("#canvasPaint").addClass("cross-cursor");
      }
      break;
    case "circle":
      drawMode = "circle";
      $(".annotator .pen-circle").addClass("activated");
      break;
    case "line_arrow":
      drawMode = "arrow";
      $(".annotator .pen-line_arrow").addClass("activated");
      if (annotatorMode == true) {
        $("#canvasPaint").addClass("pen-cursor");
      }
      break;
    case "eraser":
      drawMode = "eraser";
      $(".annotator .pen-eraser").addClass("activated");
      if (annotatorMode == true) {
        $("#canvasPaint").addClass("circle-cursor");
      }
    default:
      break;
  }

  drawScreen.drawMode = drawMode;
  drawScreen.setBrushStyle(PenStore.thicknessInput.value, PenStore.colorNow.value);
  drawScreen.setEraserCursorSize();
  drawScreen.setEraserCursorDisplay(drawMode);
});
$(".annotator .operate-item").on("click", (e) => {
  const type = e.currentTarget.dataset.optype;
  if (type === "undo") {
    drawScreen.undoScreen();
  }
  if (type === "redo") {
    drawScreen.redoScreen();
  }
  if (type === "clear") {
    drawScreen.clearScreen();
  }
});

function setBrushStyle() {
  drawCtx.lineJoin = "round";
  drawCtx.lineCap = "round";
  drawCtx.lineWidth = thicknessInput.value;
  drawCtx.strokeStyle = thicknessInput.dataset.color;
  eraserCursor.style.width = thicknessInput.value * 0.6 + "px";
  eraserCursor.style.height = thicknessInput.value * 0.6 + "px";
}

/**
 * manage canvas screen action
 */
function canvasScreen(canvasPaint, drawCtx, eraserCursor) {
  this.canvasPaint = canvasPaint;
  this.drawCtx = drawCtx;
  this.drawCtx.clearRect(0, 0, this.canvasPaint.width, this.canvasPaint.height);
  this.canvasStack = [];
  this.screenArray = [];
  this.step = -1;
  this.sourceX = 0;
  this.sourceY = 0;
  this.prevCanvas = document.createElement("canvas");
  this.prevCtx = this.prevCanvas.getContext("2d");
  this.eraserCursor = eraserCursor;

  this.pointStack = [];
  this.nowStartFromPrevEnd = 0;
  this.drawGap = 4; // 繪製的 mosue move 座標間隔
  this.drawMode = "brush";

  this.setEraserCurosr = (lineWidth) => {
    const cursorWidth = this.canvasPaint.getBoundingClientRect().width / this.canvasPaint.width;
    this.eraserCursor.style.width = lineWidth + "px";
    this.eraserCursor.style.height = lineWidth + "px";
  };

  this.init = () => {
    this.canvasPaint = canvasPaint;
    this.drawCtx = drawCtx;
    this.drawCtx.clearRect(0, 0, this.canvasPaint.width, this.canvasPaint.height);
    this.canvasStack = [];
    this.screenArray = [];
    this.step = -1;
    this.sourceX = 0;
    this.sourceY = 0;
    this.prevCanvas = document.createElement("canvas");
    this.prevCtx = this.prevCanvas.getContext("2d");
    this.pushScreen();
  };

  this.updatePaintSize = (canvasWidth, canvasHeight) => {
    this.canvasPaint.width = canvasWidth;
    this.canvasPaint.height = canvasHeight;
  };

  this.setCompositeOperation = (compositeOperation) => {
    this.drawCtx.globalCompositeOperation = compositeOperation;
  };

  this.setBrushStyle = (lineWidth = 5, strokeStyle = "#000000") => {
    let transferLineWidth = parseInt(this.canvasPaint.width) / 1920;
    this.drawCtx.lineJoin = "round";
    this.drawCtx.lineCap = "round";
    this.drawCtx.lineWidth = lineWidth * transferLineWidth;
    this.drawCtx.strokeStyle = strokeStyle;
  };

  this.savePrevScreen = () => {
    this.prevCanvas.width = this.canvasPaint.width;
    this.prevCanvas.height = this.canvasPaint.height;
    this.prevCtx.drawImage(this.canvasPaint, 0, 0, this.canvasPaint.width, this.canvasPaint.height);
  };

  // convert canvas to dataUrl save to array
  this.pushScreen = () => {
    // eslint-disable-next-line no-plusplus
    this.step++;
    if (this.step < this.canvasStack.length) {
      this.canvasStack.length = this.step;
    }
    this.drawCtx.save();
    this.canvasStack.push(this.canvasPaint.toDataURL("image/png"));
    this.drawCtx.restore();

    if (this.step < this.canvasStack.length) {
      this.savePrevScreen();
    }
  };
  this.pushScreen();

  this.drawScreen = (dataUrl) => {
    const img = new Image();
    img.addEventListener(
      "load",
      () => {
        drawCtx.save();
        drawCtx.clearRect(0, 0, canvasPaint.width, canvasPaint.height);
        drawCtx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvasPaint.width, canvasPaint.height);
        drawCtx.restore();
        this.savePrevScreen();
      },
      false
    );
    img.src = dataUrl;
  };

  this.undoScreen = () => {
    if (this.step > 0) {
      this.step--;
      this.drawScreen(this.canvasStack[this.step]);
    }
  };

  this.redoScreen = () => {
    if (this.step < this.canvasStack.length - 1) {
      this.step++;
      this.drawScreen(this.canvasStack[this.step]);
    }
  };

  this.clearScreen = () => {
    this.drawCtx.clearRect(0, 0, this.canvasPaint.width, this.canvasPaint.height);
    this.pushScreen();
  };

  this.redrawScreen = () => {
    const img = new Image();
    img.addEventListener(
      "load",
      () => {
        drawCtx.save();
        drawCtx.clearRect(0, 0, canvasPaint.width, canvasPaint.height);
        drawCtx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvasPaint.width, canvasPaint.height);
        drawCtx.restore();
      },
      false
    );
    img.src = this.canvasStack[this.step];
  };

  this.drawPoints = (points, ctx) => {
    // draw a basic circle instead
    if (points.length < this.drawGap) {
      let b = points[0];
      ctx.beginPath();
      ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0);
      ctx.closePath();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    // draw a bunch of quadratics, using the average of two points as the control point
    let i;
    for (i = 1; i < points.length - 2; i++) {
      let c = (points[i].x + points[i + 1].x) / 2,
        d = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, c, d);
    }
    ctx.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    ctx.stroke();
  };

  this.drawCanvasLine = (ctx, x1, y1, x2, y2) => {
    const canvasPoint = {
      X1: Math.round(x1),
      X2: Math.round(x2),
      Y1: Math.round(y1),
      Y2: Math.round(y2),
    };

    if (this.drawMode === "brush") {
      // draw normal line
      // ctx.lineWidth = 6;
      // ctx.strokeStyle = 'black';
      // ctx.beginPath();
      // ctx.moveTo(canvasPoint.X1, canvasPoint.Y1);
      // ctx.lineTo(canvasPoint.X2, canvasPoint.Y2);
      // ctx.stroke();
      // ctx.closePath();
      this.pointStack.push({
        x: canvasPoint.X2,
        y: canvasPoint.Y2,
      });
      let drawSmoothLine = () => {
        if (this.pointStack.length % drawGap === 0) {
          // ctx.lineWidth = 6;
          // ctx.strokeStyle = 'white';
          let currentEnd = this.pointStack.length;
          let currentStart = this.nowStartFromPrevEnd;
          if (this.nowStartFromPrevEnd !== 0) {
            currentStart -= 1;
          }
          // smooth line
          drawPoints(this.pointStack.slice(currentStart, currentEnd), ctx);
          // 會從上一個線段的倒數第2個點開始接續 drawGap-1
          // 會從上一個線段的倒數第1個點開始接續 drawGap
          this.nowStartFromPrevEnd += this.drawGap;
        }
      };
      drawSmoothLine();
    }
    if (this.drawMode === "eraser") {
      ctx.beginPath();
      ctx.moveTo(canvasPoint.X1, canvasPoint.Y1);
      ctx.lineTo(canvasPoint.X2, canvasPoint.Y2);
      ctx.stroke();
      ctx.closePath();
    }
  };

  this.drawStraightLine = (ctx, startX, startY, endX, endY) => {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.closePath();
  };

  this.drawRectangle = (ctx, startX, startY, endX, endY) => {
    let width = 1;
    let height = 1;
    if (startX < endX) {
      width = endX - startX;
    } else if (startX == endX) {
      width = 0;
    } else if (startX > endX) {
      let temp = startX;
      startX = endX;
      width = temp - endX;
    }
    if (startY > endY) {
      let temp = startY;
      startY = endY;
      height = temp - endY;
    } else if (startY > endY) {
      height = 0;
    } else if (startY < endY) {
      height = endY - startY;
    }
    ctx.strokeRect(startX, startY, width, height);
  };

  this.drawCircle = (ctx, startX, startY, x, y) => {
    startX = Math.round(startX);
    x = Math.round(x);
    startY = Math.round(startY);
    y = Math.round(y);
    ctx.beginPath();
    ctx.moveTo(startX, startY + (y - startY) / 2);
    ctx.bezierCurveTo(startX, startY, x, startY, x, startY + (y - startY) / 2);
    ctx.bezierCurveTo(x, y, startX, y, startX, startY + (y - startY) / 2);
    ctx.closePath();
    ctx.stroke();
  };

  this.drawArrow = (ctx, fromx, fromy, tox, toy) => {
    //variables to be used when creating the arrow
    let headlen = ctx.lineWidth * 1.5;
    let angle = Math.atan2(toy - fromy, tox - fromx);

    ctx.save();

    ctx.fillStyle = ctx.strokeStyle;
    //starting path of the arrow from the start square to the end square
    //and drawing the stroke
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();

    //starting a new path from the head of the arrow to one of the sides of
    //the point
    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 5), toy - headlen * Math.sin(angle - Math.PI / 5));

    //path from the side point of the arrow, to the other side point
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 5), toy - headlen * Math.sin(angle + Math.PI / 5));

    //path from the side point back to the tip of the arrow, and then
    //again to the opposite side point
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 5), toy - headlen * Math.sin(angle - Math.PI / 5));
    ctx.fill();

    //draws the paths created above
    ctx.stroke();
    ctx.restore();
  };

  this.setEraserCursorDisplay = (drawMode) => {
    if (!drawMode) drawMode = this.drawMode;
    if (this.drawMode !== "eraser") {
      eraserCursor.style.display = "none";
    }
    if (this.drawMode === "eraser") {
      eraserCursor.style.display = "block";
    }
  };
  this.setEraserCursorSize = () => {
    let veiwRatio = drawScreen.canvasPaint.getBoundingClientRect().width / drawScreen.canvasPaint.width;
    let scaleRatio = eventFrame.getBoundingClientRect().width / eventFrame.clientWidth;
    let size = (drawScreen.drawCtx.lineWidth * veiwRatio) / scaleRatio;
    eraserCursor.style.width = `${size}px`;
    eraserCursor.style.height = `${size}px`;
  };
  this.setEraserCursorStyle = (left, top) => {
    eraserCursor.style.left = `${left}`;
    eraserCursor.style.top = `${top}`;
  };
}

function drawPoints(points, ctx) {
  // draw a basic circle instead
  if (points.length < drawGap) {
    let b = points[0];
    ctx.beginPath();
    ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0);
    ctx.closePath();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  // draw a bunch of quadratics, using the average of two points as the control point
  let i;
  for (i = 1; i < points.length - 2; i++) {
    let c = (points[i].x + points[i + 1].x) / 2,
      d = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, c, d);
  }
  ctx.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
  ctx.stroke();
}

function drawCanvasLine(drawLineCtx, x1, y1, x2, y2) {
  const canvasPoint = {
    X1: x1,
    X2: x2,
    Y1: y1,
    Y2: y2,
  };

  canvasPoint.X1 = Math.round(canvasPoint.X1);
  canvasPoint.X2 = Math.round(canvasPoint.X2);
  canvasPoint.Y1 = Math.round(canvasPoint.Y1);
  canvasPoint.Y2 = Math.round(canvasPoint.Y2);

  //if (drawMode === 'brush' || drawMode === 'arrow') {
  if (drawMode === "brush") {
    // draw normal line
    // drawLineCtx.lineWidth = 6;
    // drawLineCtx.strokeStyle = 'black';
    // drawLineCtx.beginPath();
    // drawLineCtx.moveTo(canvasPoint.X1, canvasPoint.Y1);
    // drawLineCtx.lineTo(canvasPoint.X2, canvasPoint.Y2);
    // drawLineCtx.stroke();
    // drawLineCtx.closePath();
    pointStack.push({
      x: canvasPoint.X2,
      y: canvasPoint.Y2,
    });
    let drawSmoothLine = () => {
      if (pointStack.length % drawGap === 0) {
        // drawLineCtx.lineWidth = 6;
        // drawLineCtx.strokeStyle = 'white';
        let currentEnd = pointStack.length;
        let currentStart = nowStartFromPrevEnd;
        if (nowStartFromPrevEnd !== 0) {
          currentStart -= 1;
        }
        // smooth line
        drawPoints(pointStack.slice(currentStart, currentEnd), drawLineCtx);
        // 會從上一個線段的倒數第2個點開始接續 drawGap-1
        // 會從上一個線段的倒數第1個點開始接續 drawGap
        nowStartFromPrevEnd += drawGap;
      }
    };
    drawSmoothLine();
  }
  if (drawMode === "eraser") {
    drawLineCtx.beginPath();
    drawLineCtx.moveTo(canvasPoint.X1, canvasPoint.Y1);
    drawLineCtx.lineTo(canvasPoint.X2, canvasPoint.Y2);
    drawLineCtx.stroke();
    drawLineCtx.closePath();
    // drawLineCtx.save();
    // drawLineCtx.beginPath();
    // drawLineCtx.arc(canvasPoint.X1, canvasPoint.Y1, drawLineCtx.lineWidth / 2, 0, Math.PI * 2, false);
    // drawLineCtx.clip();
    // drawLineCtx.clearRect(0, 0, drawLineCtx.canvas.width, drawLineCtx.canvas.height);
    // drawLineCtx.restore();
    // drawLineCtx.clearRect(canvasPoint.X1 - lineWidth, canvasPoint.Y1 - lineWidth, 20 * 1.5, 20 * 1.5)
    // drawLineCtx.clearRect(canvasPoint.X2 - lineWidth, canvasPoint.Y2 - lineWidth, 20 * 1.5, 20 * 1.5)
  }
}

function drawStraightLine(drawStraightLineCtx, startX, startY, endX, endY) {
  startX = Math.round(startX);
  endX = Math.round(endX);
  startY = Math.round(startY);
  endY = Math.round(endY);
  drawStraightLineCtx.beginPath();
  drawStraightLineCtx.moveTo(startX, startY);
  drawStraightLineCtx.lineTo(endX, endY);
  drawStraightLineCtx.stroke();
  drawStraightLineCtx.closePath();
}

function drawRectangle(drawRectangleCtx, startX, startY, endX, endY) {
  startX = Math.round(startX);
  endX = Math.round(endX);
  startY = Math.round(startY);
  endY = Math.round(endY);

  let width = 1;
  let height = 1;

  if (startX < endX) {
    width = endX - startX;
  } else if (startX == endX) {
    width = 0;
  } else if (startX > endX) {
    let temp = startX;
    startX = endX;
    width = temp - endX;
  }

  if (startY > endY) {
    let temp = startY;
    startY = endY;
    height = temp - endY;
  } else if (startY > endY) {
    height = 0;
  } else if (startY < endY) {
    height = endY - startY;
  }

  drawRectangleCtx.strokeRect(startX, startY, width, height);
}

function drawCircle(drawCtx, startX, startY, x, y) {
  startX = Math.round(startX);
  x = Math.round(x);
  startY = Math.round(startY);
  y = Math.round(y);
  drawCtx.beginPath();
  drawCtx.moveTo(startX, startY + (y - startY) / 2);
  drawCtx.bezierCurveTo(startX, startY, x, startY, x, startY + (y - startY) / 2);
  drawCtx.bezierCurveTo(x, y, startX, y, startX, startY + (y - startY) / 2);
  drawCtx.closePath();
  drawCtx.stroke();
}

function drawArrow2(drawCtx, fromx, fromy, tox, toy) {
  //variables to be used when creating the arrow
  let headlen = drawCtx.lineWidth * 1.5;
  let angle = Math.atan2(toy - fromy, tox - fromx);

  drawCtx.save();

  drawCtx.fillStyle = drawCtx.strokeStyle;
  //starting path of the arrow from the start square to the end square
  //and drawing the stroke
  drawCtx.beginPath();
  drawCtx.moveTo(fromx, fromy);
  drawCtx.lineTo(tox, toy);
  drawCtx.stroke();

  //starting a new path from the head of the arrow to one of the sides of
  //the point
  drawCtx.beginPath();
  drawCtx.moveTo(tox, toy);
  drawCtx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 5), toy - headlen * Math.sin(angle - Math.PI / 5));

  //path from the side point of the arrow, to the other side point
  drawCtx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 5), toy - headlen * Math.sin(angle + Math.PI / 5));

  //path from the side point back to the tip of the arrow, and then
  //again to the opposite side point
  drawCtx.lineTo(tox, toy);
  drawCtx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 5), toy - headlen * Math.sin(angle - Math.PI / 5));
  drawCtx.fill();

  //draws the paths created above
  drawCtx.stroke();
  drawCtx.restore();
}

function getRatio() {
  let ratio = canvasPaint.width / parseInt(canvasPaint.getBoundingClientRect().width, 10);
  if (rotate != 0 && (rotate + 360) % 360 != 180) {
    //ratio = canvasPaint.width / parseInt(canvasPaint.getBoundingClientRect().height, 10);
  }
  /*
	if (lastAngle != 0) {
		let angle = rotate - lastAngle;
		if (angle != 0 && (angle + 360) % 360 != 180) {
			ratio = canvasPaint.width / parseInt(canvasPaint.getBoundingClientRect().height, 10);
		} else {
			ratio = canvasPaint.width / parseInt(canvasPaint.getBoundingClientRect().width, 10);
		}
	}
	*/
  //ratio *= zoom;
  return ratio;
}

function getRatio2() {
  let ratio = canvasPaint.width / parseInt(canvasPaint.getBoundingClientRect().width, 10);
  if (rotate != 0 && (rotate + 360) % 360 != 180) {
    ratio = canvasPaint.height / parseInt(canvasPaint.getBoundingClientRect().height, 10);
  }
  /*
	if (lastAngle != 0) {
		let angle = rotate - lastAngle;
		if (angle != 0 && (angle + 360) % 360 != 180) {
			ratio = canvasPaint.height / parseInt(canvasPaint.getBoundingClientRect().width, 10);
		} else {
			ratio = canvasPaint.width / parseInt(canvasPaint.getBoundingClientRect().width, 10);
		}
	}*/
  //ratio *= zoom;
  return ratio;
}

var spotlightSize = "transparent 150px, rgba(0, 0, 0, 0.85) 150px)";
var spotlightOn = false;

spotlightSwitch.onchange = function (e) {
  if (spotlightSwitch.checked) {
    spotlightOn = true;
  } else {
    spotlightOn = false;
  }

  if (spotlightSwitch.checked) {
    $(".spotlight").removeClass("hide");
  } else {
    $(".spotlight").addClass("hide");
  }
};

/**
 * 沒用 
 */
$("#track-speed-input").on("input", function (e) {
  // $("#track-speed-value").html(`${e.target.value}ms`);
  // TrackFn.setTrackSpeed(parseInt(e.target.value));
});

const cameraState = {
  camera_one: {
    label: null,
    vidpid: null,
    resWidth: null,
    resHeight: null,
  },
  camera_two: {
    label: null,
    vidpid: null,
    resWidth: null,
    resHeight: null,
  },
};

const liveContainer = document.getElementById("liveContainer");
const eventFrame = document.getElementById("eventFrame");
const detectPaint = document.getElementById("detectPaint");
const pluginFrame = document.getElementById("pluginFrame");
const detectCtx = detectPaint.getContext("2d");

const DetectFn = new QRCodeDetect(liveFrame, liveVideo);
const TrackFn = new TrackPattern(liveContainer, liveFrame, liveVideo, detectPaint);
const VideoOperate = new initVideoOperate();

// const Magifier = initMagnifier(); 棄用
const HighLight = initHighlight();
const QRCodeHints = initQRCodeDotHints();
const SpotLight = initSpotlight();
const PenStore = initPenStore();
const QRCodeFn = null;

initLiveVideoEvent();

initZoomViewEvent();

drawScreen.setBrushStyle(PenStore.thicknessInput.value, PenStore.colorNow.value);
DetectFn.init();
DetectFn.onStop(() => {
  QRCodeHints.hide();
  HighLight.hide();
  SpotLight.hide();
});
DetectFn.onResult((result) => {
  /** @type {QRCodeResult.Result} */
  onQRCodeWorkerResult(result);
});
TrackFn.trackUpdate((position) => {
  // setLiveTransform -> updateZoomViewSize -> mapZoomViewPosition
  VideoOperate.setLiveTransform({
    left: position.x,
    top: position.y,
    scale: position.scale,
  });
  VideoOperate.updateZoomViewSize(position.scale);
  VideoOperate.mapZoomViewPosition(position.x, position.y);
  HighLight.setScale(position.scale, position.x, position.y);
  SpotLight.setScale(position.scale, position.x, position.y);
  updatePIPFramePosition(position.scale);
  updateZoomUI();
});

/**
 * 顯示 QRCode 框框，處理追蹤效果。
 * @param {QRCodeResult.Result} body
 */
async function onQRCodeWorkerResult(body) {
  if (QRCodeFn) {
    window.OKIOPointType = QRCodeFn.OKIOPointType;
    window.SettingList = QRCodeFn.SettingList;
    window.SettingData = QRCodeFn.SettingData;
  } else {
    TrackFn.setTrackSpeed(window.MoveSpeed);
  }

  // FnKey = FN_0,FN_1... 代表識別到的 QRCode 類型
  // SettingKey = FN_0,FN_1...代表當前 QRCode 類型所對應的操作
  // ActionLabel = HighLightRect,HighLightBar,HighLightLine,Spotlight 代表動作字串
  // HighLightRect 對應 HighLight
  // HighLightBar 對應 Fluorescent Marker
  // HighLightLine 對應 Underline
  // Spotlight 對應 Spotlight
  const { FnKey, SettingKey, ActionLabel } = handelLabelSuccess(body.data.label);

  // 儲存當前動作
  DetectFn.nowFnLabel = SettingKey;
  // 儲存上一次的動作
  DetectFn.prevFnLabel = SettingKey ? SettingKey : DetectFn.prevFnLabel;

  // 計算 video 旋轉資料
  let { widthScaleRatio: wRatio, heightScaleRatio: hRatio } = calcRoateZoomRatio(rotate);
  let isMirror = selfieMode ? true : false;
  // 傳送 Video 旋轉或是翻轉的資訊
  DetectFn.setTransfer(rotate, wRatio, hRatio, isMirror);

  // 進入慢速掃描時
  if (body.isSlowModel) {
    DetectFn.clearPreview();
    TrackFn.reset();
    HighLight.hide();
    SpotLight.hide();
  }

  if (!FnKey) {
    QRCodeHints.hide();
    DetectFn.postImageBitmap();
    return false;
  }

  // 計算 QRCode 相關屬性資料
  DetectFn.handleInfoPoint(body.data.convert, ActionLabel);
  DetectFn.drawResult(body.data.source, ActionLabel);

  if (FnKey == "FN_1" && ActionLabel === "Avatar") {
    avatarImage = document.getElementById("avatarImage");
    DetectFn.drawAvatar(avatarImage, body.data.source.position);
  }

  // 計算 QRCode 連續辨識的成功機率
  DetectFn.setContinuous(FnKey);
  // 顯示 QRCode
  QRCodeHints.show();
  QRCodeHints.move(DetectFn.positionToClose, body.data.convert.center.ratio);
  // 設定追蹤移動方向
  TrackFn.setQRCodeToward(DetectFn.QRCodeToward);
  TrackFn.setPositionToClose(DetectFn.positionToClose);

  // 隱藏 OKIOPoint 小工具
  handleToolHide(ActionLabel);
  // 顯示 OKIOPoint 小工具
  handleToolShow(ActionLabel, FnKey, SettingKey);

  // 等待畫面追蹤完畢才辨識下一張圖
  await handleToolTrack(ActionLabel, FnKey, SettingKey, body.data.convert);
  DetectFn.postImageBitmap();
}

function handelLabelSuccess(label) {
  let SettingList = window.SettingList;
  let OKIOPointType = window.OKIOPointType;

  let FnKey = null;
  let SettingKey = null;
  let ActionLabel = null;

  if (label === "OKIOLABS FN 0" || label === "0") {
    SettingKey = "FN_0"; // FN_0
    FnKey = "FN_0";
  } else if (label === "OKIOLABS FN 1" || label === "1") {
    SettingKey = SettingList["FN_1"]; // FN_1
    FnKey = "FN_1";
  } else if (label === "OKIOLABS FN 2" || label === "2") {
    SettingKey = SettingList["FN_2"]; // FN_2
    FnKey = "FN_2";
  } else if (label === "OKIOLABS FN 3" || label === "3") {
    SettingKey = SettingList["FN_3"]; // FN_3
    FnKey = "FN_3";
  } else if (label === "OKIOLABS FN 4" || label === "4") {
    SettingKey = SettingList["FN_4"]; // FN_4
    FnKey = "FN_4";
  } else if (label === "OKIOLABS FN 5" || label === "5") {
    SettingKey = SettingList["FN_5"]; // FN_5
    FnKey = "FN_5";
  } else if (label === "OKIOLABS FN 6" || label === "6") {
    SettingKey = SettingList["FN_6"]; // FN_6
    FnKey = "FN_6";
  }

  ActionLabel = SettingKey ? OKIOPointType[SettingKey] : null;

  return { FnKey, SettingKey, ActionLabel };
}

function HightLightShow(ActionLabel, FnKey, SettingKey) {
  let { directionInfo, calcWidth, QRCodeToward } = DetectFn;
  let SettingInfo = {};
  if (ActionLabel !== "Reset") {
    SettingInfo = { ...window.SettingData[FnKey][SettingKey] };
  }
  if (ActionLabel === "HighLightRect") {
    let rectWidth = SettingInfo.width.value;
    let rectHeight = SettingInfo.height.value;
    HighLight.setSize(rectWidth, rectHeight);
    HighLight.show(0);
    HighLight.track(directionInfo, calcWidth, QRCodeToward);
  }
  if (ActionLabel === "HighLightLine") {
    let lineWidth = SettingInfo.width.value;
    let lineHeight = SettingInfo.height.value;
    HighLight.setSize(lineWidth, lineHeight);
    HighLight.show(1);
    HighLight.track(directionInfo, calcWidth, QRCodeToward);
  }
  if (ActionLabel === "HighLightBar") {
    let barWidth = SettingInfo.width.value;
    let barHeight = SettingInfo.height.value;
    HighLight.setSize(barWidth, barHeight);
    HighLight.show(2);
    HighLight.track(directionInfo, calcWidth, QRCodeToward);
  }
  // if (ActionLabel === "Spotlight") {
  //   let SpotlightSize = SettingInfo.size.value;
  //   SpotLight.setSize(SpotlightSize);
  //   SpotLight.show();
  //   SpotLight.track(directionInfo, calcWidth, QRCodeToward);
  // }
}

function SpotLightShow(ActionLabel, FnKey, SettingKey) {
  let { directionInfo, calcWidth, QRCodeToward } = DetectFn;
  let SettingInfo = {};
  if (ActionLabel !== "Reset") {
    SettingInfo = { ...window.SettingData[FnKey][SettingKey] };
  }
  if (ActionLabel === "Spotlight") {
    let SpotlightSize = SettingInfo.size.value;
    SpotLight.setSize(SpotlightSize);
    SpotLight.show();
    SpotLight.track(directionInfo, calcWidth, QRCodeToward);
  }
}

function handleToolShow(ActionLabel, FnKey, SettingKey) {
  let { directionInfo, calcWidth, QRCodeToward } = DetectFn;

  let SettingInfo = {};
  if (ActionLabel !== "Reset") {
    SettingInfo = { ...window.SettingData[FnKey][SettingKey] };
  }
  if (ActionLabel === "HighLightRect") {
    let rectWidth = SettingInfo.width.value;
    let rectHeight = SettingInfo.height.value;
    HighLight.setSize(rectWidth, rectHeight);
    HighLight.show(0);
    HighLight.track(directionInfo, calcWidth, QRCodeToward);
  }
  if (ActionLabel === "HighLightLine") {
    let lineWidth = SettingInfo.width.value;
    let lineHeight = SettingInfo.height.value;
    HighLight.setSize(lineWidth, lineHeight);
    HighLight.show(1);
    HighLight.track(directionInfo, calcWidth, QRCodeToward);
  }
  if (ActionLabel === "HighLightBar") {
    let barWidth = SettingInfo.width.value;
    let barHeight = SettingInfo.height.value;
    HighLight.setSize(barWidth, barHeight);
    HighLight.show(2);
    HighLight.track(directionInfo, calcWidth, QRCodeToward);
  }
  if (ActionLabel === "Spotlight") {
    let SpotlightSize = SettingInfo.size.value;
    SpotLight.setSize(SpotlightSize);
    SpotLight.show();
    SpotLight.track(directionInfo, calcWidth, QRCodeToward);
  }
  // if (ActionLabel === "Magnifier") {
  //   let magnifierWidth  = SettingInfo.width.value;
  //   let magnifierHeight =  SettingInfo.height.value;
  //   Magifier.setScale(liveStore["zoom"]);
  //   Magifier.setSize(magnifierWidth, magnifierHeight);
  //   Magifier.track(directionInfo, sourceWidth, QRCodeToward);
  //   if (!Magifier.isVisible()) {
  //     Magifier.show();
  //   }
  // }
}

/**
 * 追蹤移動動作
 * @param {String} ActionLabel 
 * @param {String} FnKey 
 * @param {String} SettingKey 
 * @param {Data} Data Data.convert
 * @returns 
 */
function handleToolTrack(ActionLabel, FnKey, SettingKey, Data) {
  return new Promise(async (resolve) => {
    if (ActionLabel === "Reset") {
      liveStore["firstTrack"] = true;
      liveStore["zoom"] = 1;
      await TrackFn.resetSync(0, 0, 1);
    }
    if (ActionLabel !== "Reset") {
      // 結構參考 OKIOPoint.jsx 的 DefaultSettingData
      let SettingInfo = { ...window.SettingData[FnKey][SettingKey] };
      if (liveStore["firstTrack"]) {
        liveStore["zoom"] = SettingInfo.scale.value;
      }
      await TrackFn.trackSync(Data.center.ratio, Data.bound.ratio, liveStore["zoom"]);
    }
    resolve();
  });
}

function handleToolHide(ActionLabel) {
  if (ActionLabel === "None") {
    HighLight.hide();
    SpotLight.hide();
  }
  if (ActionLabel === "Reset") {
    TrackFn.reset();
    HighLight.hide();
    SpotLight.hide();
  }
  if (ActionLabel === "Track") {
    HighLight.hide();
    SpotLight.hide();
  }
  if (ActionLabel === "HighLightRect") {
    SpotLight.hide();
  }
  if (ActionLabel === "HighLightLine") {
    SpotLight.hide();
  }
  if (ActionLabel === "HighLightBar") {
    SpotLight.hide();
  }
  if (ActionLabel === "Magnifier") {
    HighLight.hide();
    SpotLight.hide();
  }
  if (ActionLabel === "Spotlight") {
    HighLight.hide();
  }
}

function updateSpotlightBound(obejctOffset) {
  if (!spotlightOn) {
    spotlight.dataset.spotlighx = 0;
    spotlight.dataset.spotlighy = 0;
  }
  if (spotlightOn || SpotLight.isVisible()) {
    let prevPosition = {
      x: parseFloat(spotlight.dataset.spotlighx) || 0,
      y: parseFloat(spotlight.dataset.spotlighy) || 0,
    };
    let targetPostion = {
      x: obejctOffset.x * 100,
      y: obejctOffset.y * 100,
    };
    let spotlighOpen = false;
    if (Math.abs(targetPostion.x - prevPosition.x) > 5) {
      spotlighOpen = true;
    }
    if (Math.abs(targetPostion.y - prevPosition.y) > 5) {
      spotlighOpen = true;
    }
    if (spotlighOpen) {
      spotlight.dataset.spotlighx = targetPostion.x;
      spotlight.dataset.spotlighy = targetPostion.y;
      spotlight.style.backgroundImage = `radial-gradient(circle at 
          ${targetPostion.x}% 
          ${targetPostion.y}%, 
          ${spotlightSize}
        `;
    }
  }
}

function handleZoom(command) {
  let liveZoom = parseFloat(liveStore["zoom"].toFixed(1));
  let originZoom = liveZoom;
  let targetZoom = liveZoom;

  if (command === "zoomin") {
    if (liveStore["zoom"] < 6) {
      targetZoom = targetZoom + 0.1;
    }
  }
  if (command === "zoomout") {
    if (liveStore["zoom"] > 1) {
      targetZoom = targetZoom - 0.1;
    }
    if (liveStore["zoom"] === 1) {
      targetZoom = 1;
    }
  }

  // 不是在追蹤模式時，更新畫面狀態
  if (!qrCodeTrack.checked) {
    liveStore["zoom"] = targetZoom;
    updateLiveVideoOnZoom(originZoom, targetZoom);
  }

  if (qrCodeTrack.checked) {
    if (DetectFn.nowFnLabel === "FN_0") {
      liveStore["zoom"] = originZoom;
      zoomSlider.value = originZoom;
    }
    if (DetectFn.prevFnLabel !== "FN_0" && DetectFn.FnInfo.continuous) {
      liveStore["firstTrack"] = false;
      liveStore["zoom"] = targetZoom;
    }
    if (DetectFn.isSlowModel) {
      liveStore["zoom"] = targetZoom;
      updateLiveVideoOnZoom(originZoom, targetZoom);
    }
  }
}

const throttleHandleZoom = _.throttle(handleZoom, 1000 / 60);

// 縮放時重新計算 video 的位置並設定
function updateLiveVideoOnZoom(originZoom, targetZoom) {
  let liveVideoScale = parseFloat(targetZoom.toFixed(1));
  let { liveVideoLeft, liveVideoTop } = VideoOperate.getLivePositionOnZoom(liveVideoScale);
  // setLiveTransform -> updateZoomViewSize -> mapZoomViewPosition
  VideoOperate.setLiveTransform({
    left: liveVideoLeft,
    top: liveVideoTop,
    scale: liveVideoScale,
  });
  VideoOperate.updateZoomViewSize(liveVideoScale);
  VideoOperate.mapZoomViewPosition(liveVideoLeft, liveVideoTop);
  updatePIPFramePosition();
  updateZoomUI();
}

function calcRoateZoomRatio(degree) {
  let originWidth = liveFrame.clientWidth;
  let originHeight = liveFrame.clientHeight;
  let aspectRatio = liveFrame.style.aspectRatio.split("/");
  let cosValue = Math.abs(Math.cos((degree * Math.PI) / 180));
  let sinValue = Math.abs(Math.sin((degree * Math.PI) / 180));
  let newWidth = originHeight * sinValue + originWidth * cosValue;
  let newHeight = originWidth * sinValue + originHeight * cosValue;
  // Keep Video Ratio
  // if (videoRatio == 1) {
  //   newWidth = (newHeight / 3) * 4;
  // }
  // if (videoRatio == 2) {
  //   newWidth = (newHeight / 9) * 16;
  // }
  let widthSizeRatio = parseInt(aspectRatio[0]);
  let heightSizeRatio = parseInt(aspectRatio[1]);
  newWidth = (newHeight / heightSizeRatio) * widthSizeRatio;

  let widthScaleRatio = newWidth / originWidth;
  let heightScaleRatio = newHeight / originHeight;
  if (degree === 0 || degree === 180 || degree === 360) {
    (widthScaleRatio = 1), (heightScaleRatio = 1);
  }
  return { widthScaleRatio: widthScaleRatio, heightScaleRatio: heightScaleRatio };
}

function updateTransform(rotate, zoom) {
  shrinkRatio = 1;
  let { widthScaleRatio, heightScaleRatio } = calcRoateZoomRatio(rotate);
  let scaleWidth = zoom * shrinkRatio * widthScaleRatio;
  let scaleHeight = zoom * shrinkRatio * heightScaleRatio;

  widthScaleRatio = widthScaleRatio;
  heightScaleRatio = heightScaleRatio;

  liveVideo.style.transform = `rotate(${rotate}deg) scale(${zoom}) ${mirrorStyle}`;
  canvasPaint.style.transform = `rotate(${rotate}deg) scale(${zoom}) ${mirrorStyle}`;
  eventFrame.style.transform = `rotate(${rotate}deg) scale(${zoom}) ${mirrorStyle}`;

  // detectPaint.style.transform = `scale(${zoom}) ${mirrorStyle}`;
  // spotlight.style.transform = `scale(${zoom}) ${mirrorStyle}`;
  detectPaint.style.transform = `scale(${zoom})`;
  // hline.style.transform = `scale(${zoom})`;
  // vline.style.transform = `scale(${zoom})` ;
}
// Closure function Control Magnifier Element
function initMagnifier() {
  const magnifierFrame = document.querySelector(".magnifierFrame") || {};
  const magnifierTool = document.querySelector(".magnifierTool") || {};
  const magnifierVideo = document.querySelector(".magnifierVideo") || {};
  let toolWidthRatio = 35;
  let toolHeightRatio = 35;
  let magnifierScale = 1;
  let defaultScale = 1.333;
  let videoScale = 1;
  let prevOffset = { x: 0, y: 0 };
  const isVisible = () => {
    if (magnifierFrame.style.display === "none") {
      return false;
    } else {
      return true;
    }
  };
  const getFixOffset = (width, height, QRCodeToward) => {
    let offset = {
      x: 0,
      y: 0,
    };
    if (QRCodeToward === "left") {
      (offset.x = -1 * (width + 10)), (offset.y = (-1 * height) / 2);
    }
    if (QRCodeToward === "right") {
      (offset.x = 10), (offset.y = (-1 * height) / 2);
    }
    if (QRCodeToward === "top" || QRCodeToward === "leftTop" || QRCodeToward === "rightTop") {
      (offset.x = (-1 * width) / 2), (offset.y = -1 * (height + 10));
    }
    if (QRCodeToward === "bottom" || QRCodeToward === "leftBottom" || QRCodeToward === "rightBottom") {
      (offset.x = (-1 * width) / 2), (offset.y = 10);
    }
    return offset;
  };
  const setScale = (wheelScale) => {
    magnifierScale = defaultScale;
    videoScale = wheelScale;
  };
  const setSize = (width, height) => {
    let { width: liveWidth, height: liveHeight } = liveFrame.getBoundingClientRect();
    if (toolWidthRatio !== width) {
      toolWidthRatio = width;
      prevOffset = { x: 0, y: 0 };
    }
    if (toolHeightRatio !== height) {
      toolHeightRatio = height;
      prevOffset = { x: 0, y: 0 };
    }
    magnifierTool.style.width = `${((toolWidthRatio / 100) * liveWidth) / videoScale}px`;
    magnifierTool.style.height = `${((toolHeightRatio / 100) * liveHeight) / videoScale}px`;
  };
  const playStream = () => {
    try {
      magnifierVideo.srcObject = window.stream.clone();
      magnifierVideo.play();
    } catch (error) {
      console.log(error);
    }
  };
  const stopStream = () => {
    if (magnifierVideo.srcObject) {
      magnifierVideo.srcObject.getTracks().forEach((track) => {
        track.stop();
      });
      magnifierVideo.srcObject = null;
    }
  };
  const showMagnifier = () => {
    playStream();
    magnifierVideo.oncanplay = () => {
      magnifierFrame.style.display = "block";
    };
  };
  const hideMagnifier = () => {
    stopStream();
    magnifierFrame.style.display = "none";
  };
  const moveMagnifier = (magnifierBoundOffset, magnifierBoundCenter) => {
    // let { width: liveWidth, height: liveHeight } = liveFrame.getBoundingClientRect();
    // // 放大鏡外框 div 位置
    // magnifierTool.style.left = `${magnifierBoundOffset.x}px`;
    // magnifierTool.style.top = `${magnifierBoundOffset.y}px`;
    // // 設定內部放大鏡的 video 位置校正
    // magnifierVideo.style.left = `${-1 * magnifierBoundOffset.x}px`;
    // magnifierVideo.style.top = `${-1 * magnifierBoundOffset.y}px`;
    // // 設定內部放大鏡原始大小
    // magnifierVideo.style.width = `${liveWidth}px`;
    // magnifierVideo.style.height = `${liveHeight}px`;
    // // 設定內部放大鏡縮放
    // magnifierVideo.style.transform = `scale(${magnifierScale})`;
    // magnifierVideo.style.transformOrigin = `${magnifierBoundCenter.x * 100}% ${magnifierBoundCenter.y * 100}%`;
  };
  const trackMagnifier = (directionInfo, sourceWidth, QRCodeToward) => {
    let { width: liveWidth, height: liveHeight } = liveFrame.getBoundingClientRect();
    let { width: toolWidth, height: toolHeight } = magnifierTool.getBoundingClientRect();
    let displateRatio = liveWidth / sourceWidth;
    // 原始 video left top 數值
    let videoOffset = {
      x: parseFloat(liveVideo.style.left) / videoScale,
      y: parseFloat(liveVideo.style.top) / videoScale,
    };
    // 放大框本體 left top 移動起點
    let toolOffset = {
      x: directionInfo.apex.x * displateRatio + videoOffset.x,
      y: directionInfo.apex.y * displateRatio + videoOffset.y,
    };
    // 放大框內部 video 反向移動校正
    let contentOffset = {
      x: -1 * (directionInfo.apex.x * displateRatio),
      y: -1 * (directionInfo.apex.y * displateRatio),
    };

    // 計算方位校正位置
    let fixOffset = getFixOffset(toolWidth, toolHeight, QRCodeToward);
    fixOffset.x = fixOffset.x / videoScale;
    fixOffset.y = fixOffset.y / videoScale;

    magnifierVideo.style.width = `${liveWidth}px`;
    magnifierVideo.style.height = `${liveHeight}px`;

    // 設定放大鏡方框移動位置
    magnifierTool.style.left = `${toolOffset.x + fixOffset.x}px`;
    magnifierTool.style.top = `${toolOffset.y + fixOffset.y}px`;
    magnifierVideo.style.left = `${contentOffset.x + -fixOffset.x}px`;
    magnifierVideo.style.top = `${contentOffset.y + -fixOffset.y}px`;

    // 計算放大鏡方框縮放
    magnifierVideo.style.transform = `scale(${magnifierScale})`;
    magnifierFrame.style.transform = `scale(${videoScale})`;

    let toolCenter = {
      x: (parseFloat(magnifierTool.style.left) + toolWidth / 2) / liveWidth,
      y: (parseFloat(magnifierTool.style.top) + toolHeight / 2) / liveHeight,
    };
    magnifierVideo.style.transformOrigin = `${toolCenter.x * 100}% ${toolCenter.y * 100}`;
  };

  let isMove = false;
  let prevLeft = parseInt(getComputedStyle(magnifierTool).left);
  let prevTop = parseInt(getComputedStyle(magnifierTool).top);
  let start = {
    x: 0,
    y: 0,
  };
  let offset = {
    x: 0,
    y: 0,
  };
  let shift = {
    x: 0,
    y: 0,
  };
  magnifierTool.onmousedown = (e) => {
    isMove = true;
    start.x = e.offsetX;
    start.y = e.offsetY;
  };
  magnifierTool.onmousemove = (e) => {
    e.stopPropagation();
    if (isMove) {
      prevLeft = parseInt(getComputedStyle(magnifierTool).left);
      prevTop = parseInt(getComputedStyle(magnifierTool).top);
      offset.x = e.offsetX - start.x + prevLeft;
      offset.y = e.offsetY - start.y + prevTop;
      shift.x = (offset.x + magnifierWidth / 2) / liveFrame.getBoundingClientRect().width;
      shift.y = (offset.y + magnifierHeight / 2) / liveFrame.getBoundingClientRect().height;
      if (shift.x > 1) shift.x = 1;
      if (shift.y > 1) shift.y = 1;
      if (shift.x < 0) shift.x = 0;
      if (shift.y < 0) shift.y = 0;
      moveMagnifier(offset, shift);
    }
  };
  magnifierTool.onmouseup = (e) => {
    isMove = false;
  };
  magnifierTool.onmouseleave = (e) => {
    isMove = false;
  };

  return {
    isVisible: isVisible,
    setScale: setScale,
    setSize: setSize,
    stop: stopStream,
    play: playStream,
    show: showMagnifier,
    hide: hideMagnifier,
    move: moveMagnifier,
    track: trackMagnifier,
  };
}
// Closure function Control Highlight Element
function initHighlight() {
  let highlightFrame = document.querySelector(".highlightFrame");
  let highlightTool = document.querySelector(".highlightTool");
  let highlightModels = ["HighlightRect", "HighlightLine", "HighlightBar"];
  let highlightModel = "HighlightRect";
  let highlightWidth = 60;
  let highlightHeight = 1;
  const isVisible = () => {
    if (highlightTool.style.display === "none") {
      return false;
    } else {
      return true;
    }
  };
  const getCurrentModel = () => {
    return highlightModels.indexOf(highlightModel);
  };
  const showHighLightRect = (modelNumber) => {
    highlightModel = highlightModels[modelNumber];
    highlightTool.classList.add("highlightRect");
    highlightTool.classList.remove("highlightLine");
    highlightTool.classList.remove("highlightBar");
    highlightTool.style.width = "100%";
    highlightTool.style.height = "100%";
    highlightTool.style.left = `0px`;
    highlightTool.style.top = `0px`;
  };
  const showHighLightLineBar = (modelNumber) => {
    highlightModel = highlightModels[modelNumber];
    highlightTool.classList.remove("highlightRect");
    highlightTool.style.width = "0%";
    highlightTool.style.height = "0%";
    highlightTool.style.clipPath = "";
    if (modelNumber === 1) {
      highlightTool.classList.add("highlightLine");
      highlightTool.classList.remove("highlightBar");
    }
    if (modelNumber === 2) {
      highlightTool.classList.add("highlightBar");
      highlightTool.classList.remove("highlightLine");
    }
  };
  const trackHighLightRect = (highlightElePos, QRCodeToward) => {
    // 起點座標比例k
    let xRatio = highlightElePos.leftRatio;
    let yRatio = highlightElePos.topRatio;
    // 依照座標比例要扣除的長寬數量
    let xRange = highlightWidth / 2;
    let yRange = highlightHeight / 2;
    // 物件範圍比例
    let xLeftBegin = xRatio - xRange;
    let xRightEnd = xRatio + xRange;

    let yUpBegin = yRatio - yRange;
    let yDownEnd = yRatio + yRange;

    if (QRCodeToward === "left") {
      xLeftBegin = xRatio - xRange * 2;
      xRightEnd = xRatio;
    }
    if (QRCodeToward === "right") {
      xLeftBegin = xRatio;
      xRightEnd = xRatio + xRange * 2;
    }
    if (QRCodeToward === "top" || QRCodeToward === "leftTop" || QRCodeToward === "rightTop") {
      yUpBegin = yRatio - yRange * 2 - 2;
      yDownEnd = yRatio - 2;
    }
    if (QRCodeToward === "bottom" || QRCodeToward === "leftBottom" || QRCodeToward === "rightBottom") {
      yUpBegin = yRatio + 2;
      yDownEnd = yRatio + yRange * 2 + 2;
    }
    highlightTool.dataset.leftTop = `${xLeftBegin}% ${yUpBegin}%`;
    highlightTool.dataset.rightTop = `${xRightEnd}% ${yUpBegin}%`;
    highlightTool.dataset.rightBottom = `${xRightEnd}% ${yDownEnd}%`;
    highlightTool.dataset.leftBottom = `${xLeftBegin}% ${yDownEnd}%`;
    highlightTool.style.clipPath = `
      polygon(
        0% 0%,                                   /*左上*/
        0% 100%,                                 /*左下*/
        ${xLeftBegin}% 100%,                /*下側左*/
        ${xLeftBegin}% ${yUpBegin}%, /*highlight左上*/
        ${xRightEnd}% ${yUpBegin}%, /*highlight右上*/
        ${xRightEnd}% ${yDownEnd}%, /*highlight右下*/
        ${xLeftBegin}% ${yDownEnd}%, /*highlight左下*/
        ${xLeftBegin}% 100%,                /*下側左*/
        100% 100%,                               /*右下*/
        100% 0%                                  /*右上*/
      )
      `;
  };
  const trackHighLightLineBar = (highlightElePos, QRCodeToward) => {
    let xRatio = highlightElePos.leftRatio;
    let yRatio = highlightElePos.topRatio;
    let xBegin = 0;
    let yBegin = 0;
    if (QRCodeToward === "left") {
      xBegin = xRatio - highlightWidth;
      yBegin = yRatio - highlightHeight / 2;
    }
    if (QRCodeToward === "right") {
      xBegin = xRatio;
      yBegin = yRatio - highlightHeight / 2;
    }
    if (QRCodeToward === "top" || QRCodeToward === "leftTop" || QRCodeToward === "rightTop") {
      xBegin = xRatio - highlightWidth / 2;
      yBegin = yRatio - highlightHeight - 2;
    }
    if (QRCodeToward === "bottom" || QRCodeToward === "leftBottom" || QRCodeToward === "rightBottom") {
      xBegin = xRatio - highlightWidth / 2;
      yBegin = yRatio + 2;
    }
    highlightTool.style.width = `${highlightWidth}%`;
    highlightTool.style.height = `${highlightHeight}%`;
    highlightTool.style.left = `${xBegin}%`;
    highlightTool.style.top = `${yBegin}%`;
  };
  const trackHighLightElement = (directionInfo, sourceWidth, QRCodeToward) => {
    const { width: liveWidth, height: liveHeight } = liveFrame.getBoundingClientRect();
    const displayRatio = liveWidth / sourceWidth;
    const highlightOffset = {
      x: directionInfo.apex.x * displayRatio,
      y: directionInfo.apex.y * displayRatio,
    };
    const highlightElePos = {
      leftRatio: Math.round((highlightOffset.x / liveWidth) * 100),
      topRatio: Math.round((highlightOffset.y / liveHeight) * 100),
    };
    if (highlightModel === "HighlightRect") {
      trackHighLightRect(highlightElePos, QRCodeToward);
    }
    if (highlightModel === "HighlightLine") {
      trackHighLightLineBar(highlightElePos, QRCodeToward);
    }
    if (highlightModel === "HighlightBar") {
      trackHighLightLineBar(highlightElePos, QRCodeToward);
    }
  };
  /**
   * 0 表示 HighLight
   * 1 表示 Fluorescent Maker
   * 2 表示 Underline
   * @param {Number} modelNumber
   */
  const showHighlightElement = (modelNumber) => {
    if (modelNumber === 0) {
      showHighLightRect(modelNumber);
    }
    if (modelNumber === 1) {
      showHighLightLineBar(modelNumber);
    }
    if (modelNumber === 2) {
      showHighLightLineBar(modelNumber);
    }
    highlightTool.style.display = "block";
  };
  const hideHighlightElement = () => {
    highlightTool.style.display = "none";
  };
  /**
   * 控制外層 pluginFrame 縮放和位置，這是跟著滑鼠移動或滾輪縮放，需要跟著移動的函數，以便讓畫面同步。
   * @param {Number} scale
   * @param {Number} left
   * @param {Number} top
   */
  const setScale = (scale = 1, left = 50, top = 50) => {
    highlightFrame.style.transform = `scale(${scale})`;
    highlightFrame.style.left = `${parseFloat(left)}px`;
    highlightFrame.style.top = `${parseFloat(top)}px`;
  };
  /**
   * 控制 HighLight Fluorescent Maker Underline 的長寬
   * @param {Number} width
   * @param {Number} height
   */
  const setSize = (width, height) => {
    if (width) {
      highlightWidth = parseFloat(width);
    }
    if (height) {
      highlightHeight = parseFloat(height);
    }
  };
  return {
    isVisible: isVisible,
    setScale: setScale,
    setSize: setSize,
    model: getCurrentModel,
    track: trackHighLightElement,
    show: showHighlightElement,
    hide: hideHighlightElement,
  };
}
// Closure function Control Spotlight Element
function initSpotlight() {
  const spotlightElement = document.querySelector(".spotlight");
  let spotlightDiameter = 150;
  let spotlightEffect = `transparent ${spotlightDiameter}px, rgba(0, 0, 0, 0.7) ${spotlightDiameter}px)`;
  let visible = false;
  const isVisible = () => {
    return visible;
  };
  /**
   * 控制 spotlight 元素縮放和位置，這是跟著滑鼠移動或滾輪縮放，需要跟著移動的函數，以便讓畫面同步。
   * @param {Number} scale
   * @param {Number} left
   * @param {Number} top
   */
  const setScale = (scale, left, top) => {
    spotlightElement.style.transform = `scale(${scale})`;
    spotlightElement.style.left = `${left}px`;
    spotlightElement.style.top = `${top}px`;
  };
  /**
   * 控制 spotlight 元素的長寬
   * @param {Number} width
   * @param {Number} height
   */
  const setSize = (diameterRatio = 25) => {
    const { width: liveWidth, height: liveHeight } = liveFrame.getBoundingClientRect();
    const standLength = liveHeight <= liveWidth ? liveHeight : liveWidth;
    const spotlightDiameterStart = spotlightDiameter;
    const spotlightDiameterEnd = spotlightDiameter;
    spotlightDiameter = (parseInt(diameterRatio) / 100) * standLength;
    spotlightEffect = `transparent ${spotlightDiameterStart}px, rgba(0, 0, 0, 0.7) ${spotlightDiameterEnd}px)`;
  };
  const showSpotlight = () => {
    if (!visible) {
      spotlightElement.classList.remove("hide");
      visible = true;
    }
  };
  const hideSpotlight = () => {
    if (visible) {
      spotlightElement.classList.add("hide");
      visible = false;
    }
  };
  const updateSpotlight = (obejctOffset) => {
    if (spotlightOn || SpotLight.isVisible()) {
      let prevPosition = {
        x: parseFloat(spotlight.dataset.spotlighx) || 0,
        y: parseFloat(spotlight.dataset.spotlighy) || 0,
      };
      let targetPostion = {
        x: obejctOffset.x * 100,
        y: obejctOffset.y * 100,
      };
      // let spotlighOpen = false;
      // if (Math.abs(targetPostion.x - prevPosition.x) > 5) {
      //   spotlighOpen = true;
      // }
      // if (Math.abs(targetPostion.y - prevPosition.y) > 5) {
      //   spotlighOpen = true;
      // }
      spotlight.dataset.spotlighx = targetPostion.x;
      spotlight.dataset.spotlighy = targetPostion.y;
      spotlight.style.backgroundImage = `radial-gradient(circle at 
          ${targetPostion.x.toFixed(0)}% 
          ${targetPostion.y.toFixed(0)}%, 
          ${spotlightEffect}
        `;
    }
  };
  const trackSpotLight = (directionInfo, sourceWidth, QRCodeToward) => {
    const { width: liveWidth, height: liveHeight } = liveFrame.getBoundingClientRect();
    const displayRatio = liveWidth / sourceWidth;
    const spotlightCenter = {
      x: (directionInfo.apex.x * displayRatio) / liveWidth,
      y: (directionInfo.apex.y * displayRatio) / liveHeight,
    };
    const spotlightWidthOffset = spotlightDiameter / liveWidth;
    const spotlightHeightOffset = spotlightDiameter / liveHeight;

    if (QRCodeToward === "left") {
      spotlightCenter.x = spotlightCenter.x - spotlightWidthOffset;
    }
    if (QRCodeToward === "right") {
      spotlightCenter.x = spotlightCenter.x + spotlightWidthOffset;
    }
    if (QRCodeToward === "top" || QRCodeToward === "leftTop" || QRCodeToward === "rightTop") {
      spotlightCenter.y = spotlightCenter.y - spotlightHeightOffset;
    }
    if (QRCodeToward === "bottom" || QRCodeToward === "leftBottom" || QRCodeToward === "rightBottom") {
      spotlightCenter.y = spotlightCenter.y + spotlightHeightOffset;
    }

    updateSpotlight(spotlightCenter);
  };
  return {
    isVisible: isVisible,
    setScale: setScale,
    setSize: setSize,
    show: showSpotlight,
    hide: hideSpotlight,
    track: trackSpotLight,
  };
}
/**
 * Closure function Control QRCodeDotHints Element
 */
function initQRCodeDotHints() {
  const dotHints = document.querySelector(".QRCodeDotHints");
  const dotSize = 8;
  dotHints.style.width = `${dotSize}px`;
  dotHints.style.height = `${dotSize}px`;
  const isVisible = () => {
    if (dotHints.style.display === "none") {
      return false;
    } else {
      return true;
    }
  };
  const showDotHints = () => {
    dotHints.style.display = "block";
  };
  const hideHotHints = () => {
    dotHints.style.display = "none";
  };
  const moveDotHints = (positionToClose, centerRatio) => {
    if (!positionToClose) {
      dotHints.style.left = `${(centerRatio.x * 100).toFixed(0)}%`;
      dotHints.style.top = `${(centerRatio.y * 100).toFixed(0)}%`;
    }
  };
  return {
    isVisible: isVisible,
    show: showDotHints,
    hide: hideHotHints,
    move: moveDotHints,
  };
}
/**
 * 管理畫筆
 */
function initPenStore() {
  let colorOne = document.querySelector(".custom-color_one");
  let colorTwo = document.querySelector(".custom-color_two");
  let thicknessInput = document.querySelector(".thickness-input");
  let thicknessCanvas = document.querySelector(".thickness-canvas");
  let thicknessCtx = thicknessCanvas.getContext("2d");

  let localPenStyle = localStorage.getItem("PenStyle");
  let colorNow = {
    value: "#000000",
    index: 5,
  };

  if (localPenStyle) {
    let penStyle = JSON.parse(localPenStyle);
    thicknessInput.value = penStyle.thickness;
    colorOne.value = penStyle.color_one;
    colorTwo.value = penStyle.color_two;
    colorNow.value = penStyle.color_now;
    colorNow.index = penStyle.color_index;
  }

  const savePenStyle = () => {
    localStorage.setItem(
      "PenStyle",
      JSON.stringify({
        thickness: thicknessInput.value,
        color_one: colorOne.value,
        color_two: colorTwo.value,
        color_now: colorNow.value,
        color_index: colorNow.index,
      })
    );
  };

  const setColorValue = (color) => {
    if (color) {
      colorNow.value = color;
    }
    // savePenStyle();
  };

  const setColorIndex = (index = null) => {
    if (index !== null) {
      colorNow.index = index;
    }
    // savePenStyle();
  };

  const drawPenWeight = () => {
    let radius = thicknessInput.value / 2 - 2;
    if (radius < 1.5) {
      radius = 1.5;
    }
    thicknessCanvas.width = thicknessInput.max;
    thicknessCanvas.height = thicknessInput.max;
    thicknessCtx.strokeStyle = colorNow.value;
    thicknessCtx.fillStyle = colorNow.value;
    thicknessCtx.lineWidth = 2;
    thicknessCtx.beginPath();
    thicknessCtx.arc(thicknessCanvas.width / 2, thicknessCanvas.height / 2, radius, 0, 2 * Math.PI);
    thicknessCtx.stroke();
    thicknessCtx.fill();
  };

  const setBgColorStyle = () => {
    let colorOneHsl = hexToHSL(colorOne.value);
    let colorTwoHsl = hexToHSL(colorTwo.value);
    if (colorOneHsl.l > 80) {
      colorOne.parentElement.classList.add("bg-black");
    } else {
      colorOne.parentElement.classList.remove("bg-black");
    }
    if (colorTwoHsl.l > 80) {
      colorTwo.parentElement.classList.add("bg-black");
    } else {
      colorTwo.parentElement.classList.remove("bg-black");
    }
    colorOne.parentElement.dataset.color = colorOne.value;
    colorTwo.parentElement.dataset.color = colorTwo.value;
  };

  const setBorderColorStyle = () => {
    $(".annotator .color-item").removeClass("active");
    $(".annotator .color-item").removeClass("active");
    $(".annotator .color-item").removeClass("active-black");
    $(".annotator .color-item").removeClass("active-white");
    let hsl = hexToHSL(colorNow.value);
    if (hsl.l > 80) {
      $(".annotator .color-item").eq(colorNow.index).addClass("active");
      $(".annotator .color-item").eq(colorNow.index).addClass("active-black");
    } else {
      $(".annotator .color-item").eq(colorNow.index).addClass("active");
      $(".annotator .color-item").eq(colorNow.index).addClass("active-white");
    }
  };

  setColorValue();
  setColorIndex();
  setBgColorStyle();
  setBorderColorStyle();
  savePenStyle();
  drawPenWeight();

  return {
    colorNow: colorNow,
    thicknessInput: thicknessInput,
    setColorValue: setColorValue,
    setColorIndex: setColorIndex,
    setBgColorStyle: setBgColorStyle,
    setBorderColorStyle: setBorderColorStyle,
    savePenStyle: savePenStyle,
    drawPenWeight: drawPenWeight,
  };
}
/**
 * 儲存相機1、相機2相關資訊在 `cameraState` 變數
 */
function saveCameraState() {
  if (videoSelect.selectedIndex !== -1) {
    videoSelect[videoSelect.selectedIndex].dataset.selectedIndex = resolutionSelect.selectedIndex;
    cameraState["camera_one"] = {
      label: videoSelect[videoSelect.selectedIndex].text,
      vidpid: videoSelect[videoSelect.selectedIndex].dataset.vidpid || null,
      resWidth: resolutionSelect[resolutionSelect.selectedIndex].dataset.resWidth,
      resHeight: resolutionSelect[resolutionSelect.selectedIndex].dataset.resHeight,
    };
  }
  pipSelect[pipSelect.selectedIndex].dataset.selectedIndex = pipResolutionSelect.selectedIndex;
  cameraState["camera_two"] = {
    label: pipSelect[pipSelect.selectedIndex].text,
    vidpid: pipSelect[pipSelect.selectedIndex].dataset.vidpid || null,
    resWidth: pipResolutionSelect[pipResolutionSelect.selectedIndex].dataset.resWidth || null,
    resHeight: pipResolutionSelect[pipResolutionSelect.selectedIndex].dataset.resHeight || null,
  };
}
/**
 * 儲存以選擇的相機和解析度狀態到 localStorage
 */
function saveSelectState() {
  let vidpid = videoSelect[videoSelect.selectedIndex].dataset.vidpid;
  let deviceLabel = videoSelect[videoSelect.selectedIndex].innerHTML;
  let resoultionLabel = resolutionSelect[resolutionSelect.selectedIndex].innerHTML;
  let resoultionIndex = resolutionSelect.selectedIndex;
  let micId = audioSelect.options[audioSelect.selectedIndex].value;

  let resoultionInfo = {
    deviceLabel: deviceLabel,
    resoultionIndex: resoultionIndex,
    resoultionLabel: resoultionLabel,
  };

  let saveResoultionInfo = localStorage.getItem("resoultion");
  saveResoultionInfo = saveResoultionInfo ? JSON.parse(saveResoultionInfo) : {};
  saveResoultionInfo[vidpid] = resoultionInfo;

  localStorage.setItem("resoultion", JSON.stringify(saveResoultionInfo));
  localStorage.setItem("deviceId", vidpid);
  localStorage.setItem("micId", micId);
}
/**
 * 確認是不是 OKIOCAM ，如果是 OKIOCAM，就要預設啟動  OKIOPoint。
 * 同時替上方和右側面板的 OKIOPoint 按鈕是否 disabled，以及給 OKIOPoint 套上樣式。
 */
function handleCustomDevice() {
  // not in electron
  if (!window.isElectron) {
    // $(".btn-okiopoint").removeClass("active");
    // $(".btn-okiopoint").addClass("unavaliable");
    // $(".btn-okiopoint").addClass("unsupport");
    // window.setSwtichState({ on: false, disable: true });
    // qrCodeTrack.disabled = false;
    // return false;
  }

  let vidpid = videoSelect[videoSelect.selectedIndex].dataset.vidpid;
  if (swapMode) {
    vidpid = pipSelect[pipSelect.selectedIndex].dataset.vidpid;
  }

  let customDevice = OKIODeviceList[vidpid];
  let firstLoad = qrCodeTrack.dataset.firstLoad || "true";

  // 如果是自己的相機
  if (customDevice) {
    // 清除狀態
    $(".btn-okiopoint").removeClass("active");
    $(".btn-okiopoint").removeClass("unavaliable");
    window.setSwtichState({ on: false, disable: false });
    // 如果為勾選狀態則重新設定狀態
    $(".btn-okiopoint").addClass("active");
    window.setSwtichState({ on: true, disable: false });
    // 初次啟動時設定
    // if (firstLoad === "true") {
    //   if (!qrCodeTrack.checked) {
    //   }
    //   qrCodeTrack.dataset.firstLoad = "false";
    // }
  } else {
    // 如果不是自己的相機
    $(".btn-okiopoint").removeClass("active");
    $(".btn-okiopoint").addClass("unavaliable");
    window.setSwtichState({ on: false, disable: true });
  }

  if (customDevice) {
    qrCodeTrack.checked = true;
    qrCodeTrack.disabled = false;
  } else {
    qrCodeTrack.checked = false;
    qrCodeTrack.disabled = true;
  }
}
/**
 * 設定QRCode辨識追蹤的相關參數和 DetectFn、TrackFn 兩個物件有關。
 */
function handleQRCodeDetect() {
  DetectFn.sourceWidth = streamWidth;
  DetectFn.sourceHeight = streamHeight;
  DetectFn.drawCanvas = detectPaint;
  DetectFn.drawCtx = detectCtx;
  DetectFn.drawCanvas.width = streamWidth;
  DetectFn.drawCanvas.height = streamHeight;

  if (rotate === 90 || rotate === 270) {
    DetectFn.setCalcSize(streamHeight, streamWidth);
    TrackFn.setCalcSize(streamHeight, streamWidth);
  } else {
    DetectFn.setCalcSize(streamWidth, streamHeight);
    TrackFn.setCalcSize(streamWidth, streamHeight);
  }

  // DetectFn.setCalcSize(streamWidth, streamHeight);
  // TrackFn.setCalcSize(streamWidth, streamHeight);

  TrackFn.reset();

  if (qrCodeTrack.checked) {
    DetectFn.stop();
    DetectFn.start();
  }
  if (!qrCodeTrack.checked) {
    DetectFn.stop();
    QRCodeHints.hide();
    HighLight.hide();
    SpotLight.hide();
  }
}
/**
 * 註冊 eventFrame 滑鼠事件，和畫面移動、繪製功能有關
 */
function initLiveVideoEvent() {
  let isMove = false;
  let isDraw = false;
  let isStop = false;
  let isPIP = false;
  let start = {
    x: 0,
    y: 0,
  };
  let end = {
    x: 0,
    y: 0,
  };
  let move = {
    x: 0,
    y: 0,
  };
  let offset = {
    x: 0,
    y: 0,
  };
  let container = {
    left: liveContainer.getBoundingClientRect().x,
    top: liveContainer.getBoundingClientRect().y,
  };
  // Touch Point cache
  var tpCache = [];
  var prevDiff = -1;
  function eventPointDown(e) {
    let evt, touch, rect, pageX, pageY, offX, offY;
    if (e.type == 'touchstart') {
      e.preventDefault();
      e.stopPropagation();
      evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
      touch = evt.touches[0] || evt.changedTouches[0];
      rect = e.target.getBoundingClientRect();
      const {x, y, width, height} = e.target.getBoundingClientRect();
      pageX = touch.pageX;
      pageY = touch.pageY;
      //offX = touch.pageX - rect.left;
      //offY = touch.pageY - rect.top;
      //offX = (touch.clientX-x)/width*e.target.offsetWidth;
      //offY = (touch.clientY-y)/height*e.target.offsetHeight;
      if (rotate == 0) {
        if(selfieMode)
          offX = (width-touch.clientX+x)/width*e.target.offsetWidth;
        else
          offX = (touch.clientX-x)/width*e.target.offsetWidth;
        offY = (touch.clientY-y)/height*e.target.offsetHeight;
      }
      else if (rotate == 90) {
        if(selfieMode)
          offX = (height-touch.clientY+y)/height*e.target.offsetWidth;
        else
          offX = (touch.clientY-y)/height*e.target.offsetWidth;
        offY = (width-touch.clientX+x)/width*e.target.offsetHeight;
      }
      else if (rotate == 180) {
        if(selfieMode)
          offX = (touch.clientX-x)/width*e.target.offsetWidth;
        else
          offX = (width-touch.clientX+x)/width*e.target.offsetWidth;
        offY = (height-touch.clientY+y)/height*e.target.offsetHeight;
      }
      else if (rotate == 270) {
        if(selfieMode)
          offX = (touch.clientY-y)/height*e.target.offsetWidth;
        else
          offX = (height-touch.clientY+y)/height*e.target.offsetWidth;
        offY = (touch.clientX-x)/width*e.target.offsetHeight;
      }
      if (e.targetTouches.length >= 2) {
        //for (let i = 0; i < e.targetTouches.length; i++) {
        for (let i = 0; i < 2; i++) {
          tpCache.push(e.targetTouches[i]);
        }
        isMove = true;
        isDraw = false;
        move = {
          x: parseInt(eventFrame.dataset.left) || 0,
          y: parseInt(eventFrame.dataset.top) || 0,
        };
        offset = {
          x: pageX - container.left,
          y: pageY - container.top,
        };
        start = {
          x: offset.x - move.x,
          y: offset.y - move.y,
        };
        return;
      }
    }
    else if (e.type == 'mousedown') {
      pageX = e.pageX;
      pageY = e.pageY;
      offX = e.offsetX;
      offY = e.offsetY;
    }
    if (inPIP === true) {
      return false;
    }
    // not annotatorMode
    if (!annotatorMode) {
      isMove = true;
      isDraw = false;
      move = {
        x: parseInt(eventFrame.dataset.left) || 0,
        y: parseInt(eventFrame.dataset.top) || 0,
      };
      offset = {
        x: pageX - container.left,
        y: pageY - container.top,
      };
      start = {
        x: offset.x - move.x,
        y: offset.y - move.y,
      };
    }
    // annotatorMode
    if (annotatorMode) {
      isMove = false;
      isDraw = true;
      let ratio = drawScreen.canvasPaint.width / eventFrame.clientWidth;
      if (drawMode !== "eraser") {
        drawScreen.setCompositeOperation("source-over");
        drawScreen.setBrushStyle(PenStore.thicknessInput.value, PenStore.colorNow.value);
      }
      if (drawMode === "eraser") {
        drawScreen.setCompositeOperation("destination-out");
        drawScreen.setBrushStyle(PenStore.thicknessInput.value, "rgba(0,0colorNow.value");
      }
      pointStack.push({
        x: offX * ratio,
        y: offY * ratio,
      });
      start = {
        x: offX * ratio,
        y: offY * ratio,
      };
    }
  }
  function eventPointMove(e) {
    let evt, touch, rect, pageX, pageY, offX, offY;
    if (e.type == 'touchmove') {
      e.preventDefault();
      e.stopPropagation();
      evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
      touch = evt.touches[0] || evt.changedTouches[0];
      rect = e.target.getBoundingClientRect();
      const {x, y, width, height} = e.target.getBoundingClientRect();
      pageX = touch.pageX;
      pageY = touch.pageY;
      //offX = touch.pageX - rect.left;
      //offY = touch.pageY - rect.top;
      //offX = (touch.clientX-x)/width*e.target.offsetWidth;
      //offY = (touch.clientY-y)/height*e.target.offsetHeight;
      if (rotate == 0) {
        if(selfieMode)
          offX = (width-touch.clientX+x)/width*e.target.offsetWidth;
        else
          offX = (touch.clientX-x)/width*e.target.offsetWidth;
        offY = (touch.clientY-y)/height*e.target.offsetHeight;
      }
      else if (rotate == 90) {
        if(selfieMode)
          offX = (height-touch.clientY+y)/height*e.target.offsetWidth;
        else
          offX = (touch.clientY-y)/height*e.target.offsetWidth;
        offY = (width-touch.clientX+x)/width*e.target.offsetHeight;
      }
      else if (rotate == 180) {
        if(selfieMode)
        offX = (touch.clientX-x)/width*e.target.offsetWidth;
        else
          offX = (width-touch.clientX+x)/width*e.target.offsetWidth;
        offY = (height-touch.clientY+y)/height*e.target.offsetHeight;
      }
      else if (rotate == 270) {
        if(selfieMode)
          offX = (touch.clientY-y)/height*e.target.offsetWidth;
        else
          offX = (height-touch.clientY+y)/height*e.target.offsetWidth;
        offY = (touch.clientX-x)/width*e.target.offsetHeight;
      }
      // handle two points touch
      if (e.targetTouches.length >= 2) {
        //if (ev.targetTouches.length === 2 && ev.changedTouches.length === 2) {
        // Check if the two target touches are the same ones that started
        // the 2-touch
        const point1 = tpCache.findLastIndex(
          (tp) => tp.identifier === e.targetTouches[0].identifier
        );
        const point2 = tpCache.findLastIndex(
          (tp) => tp.identifier === e.targetTouches[1].identifier
        );

        if (point1 >= 0 && point2 >= 0) {
          // Calculate the distance between the two pointers
          let curDiff = Math.sqrt(Math.pow(e.targetTouches[1].clientX - e.targetTouches[0].clientX, 2) + Math.pow(e.targetTouches[1].clientY - e.targetTouches[0].clientY, 2));

          if (prevDiff > 0) {
            if (curDiff > prevDiff + 2) {
              // The distance between the two pointers has increased
              //throttleHandleZoom("zoomin");
              handleZoom("zoomin");
            }
            else if (curDiff < prevDiff - 2) {
              // The distance between the two pointers has decreased
              //throttleHandleZoom("zoomout");
              handleZoom("zoomout");
            }
            else {
              isStop = true;
              offset = {
                x: pageX - container.left,
                y: pageY - container.top,
              };
              move = {
                x: offset.x - start.x,
                y: offset.y - start.y,
              };
              VideoOperate.setLivePositionWithinEdge(move.x, move.y);
            }
          }
          // Cache the distance for the next move event 
          prevDiff = curDiff;
        }
        return;
      }
    }
    else if (e.type == 'mousemove') {
      pageX = e.pageX;
      pageY = e.pageY;
      offX = e.offsetX;
      offY = e.offsetY;
    }
    if (isMove || isDraw) {
      recordControl.style.pointerEvents = "none";
      pipFrame.style.pointerEvents = "none";
    }
    if (isMove) {
      isStop = true;
      offset = {
        x: pageX - container.left,
        y: pageY - container.top,
      };
      move = {
        x: offset.x - start.x,
        y: offset.y - start.y,
      };
      VideoOperate.setLivePositionWithinEdge(move.x, move.y);
    }
    if (isDraw) {
      let ratio = drawScreen.canvasPaint.width / eventFrame.clientWidth;
      let newX = offX * ratio;
      let newY = offY * ratio;
      if (drawMode === "line" || drawMode === "rectangle" || drawMode === "circle" || drawMode === "arrow") {
        drawScreen.drawCtx.clearRect(0, 0, drawScreen.canvasPaint.width, drawScreen.canvasPaint.height);
        drawScreen.drawCtx.drawImage(
          drawScreen.prevCanvas,
          0,
          0,
          drawScreen.canvasPaint.width,
          drawScreen.canvasPaint.height
        );
      }
      switch (drawScreen.drawMode) {
        case "brush":
          drawScreen.drawCanvasLine(drawScreen.drawCtx, start.x, start.y, newX, newY);
          start.x = newX;
          start.y = newY;
          break;
        case "eraser":
          drawScreen.drawCanvasLine(drawScreen.drawCtx, start.x, start.y, newX, newY);
          start.x = newX;
          start.y = newY;
          break;
        case "line":
          drawScreen.drawStraightLine(drawScreen.drawCtx, start.x, start.y, newX, newY);
          break;
        case "rectangle":
          drawScreen.drawRectangle(drawScreen.drawCtx, start.x, start.y, newX, newY);
          break;
        case "circle":
          drawScreen.drawCircle(drawScreen.drawCtx, start.x, start.y, newX, newY);
          break;
        case "arrow":
          drawScreen.drawArrow(drawScreen.drawCtx, start.x, start.y, newX, newY);
          break;
        default:
          drawScreen.drawCanvasLine(drawScreen.drawCtx, start.x, start.y, newX, newY);
      }
    }
    if (annotatorMode) {
      if (drawScreen.drawMode === "eraser") {
        let percentX = offX / eventFrame.clientWidth;
        let percentY = offY / eventFrame.clientHeight;
        let left = `calc(${percentX * 100}% - ${eraserCursor.clientWidth / 2}px)`;
        let top = `calc(${percentY * 100}% - ${eraserCursor.clientHeight / 2}px)`;
        drawScreen.setEraserCursorSize();
        drawScreen.setEraserCursorStyle(left, top);
      }
    }
  }
  function eventPointUp(e) {
    e.preventDefault();
    e.stopPropagation();
    if (annotatorMode) {
      if (drawMode === "eraser") {
        drawScreen.setCompositeOperation("source-over");
      }
      drawScreen.pushScreen();
      drawScreen.pointStack = [];
      drawScreen.nowStartFromPrevEnd = 0;
    }
    recordControl.style.pointerEvents = "auto";
    pipFrame.style.pointerEvents = "auto";
    isMove = false;
    isDraw = false;
    start = {
      x: 0,
      y: 0,
    };

    for (let i = 0; i < tpCache.length; i++) {
      if (tpCache[i].pointerId == e.pointerId) {
        tpCache.splice(i, 1);
        break;
      }
    }
    // If the number of pointers down is less than two then reset diff tracker
    if (tpCache.length < 2) prevDiff = -1;
  }
  eventFrame.onmousedown = eventPointDown;
  eventFrame.addEventListener('touchstart', eventPointDown);
  eventFrame.onmousemove = eventPointMove;
  eventFrame.addEventListener('touchmove', eventPointMove);
  eventFrame.onmouseup = eventPointUp;
  eventFrame.addEventListener('touchend', eventPointUp);
  /*
  eventFrame.onmousedown = (e) => {
    if (inPIP === true) {
      return false;
    }
    // not annotatorMode
    if (!annotatorMode) {
      isMove = true;
      isDraw = false;
      move = {
        x: parseInt(eventFrame.dataset.left) || 0,
        y: parseInt(eventFrame.dataset.top) || 0,
      };
      offset = {
        x: e.pageX - container.left,
        y: e.pageY - container.top,
      };
      start = {
        x: offset.x - move.x,
        y: offset.y - move.y,
      };
    }
    // annotatorMode
    if (annotatorMode) {
      isMove = false;
      isDraw = true;
      let ratio = drawScreen.canvasPaint.width / eventFrame.clientWidth;
      if (drawMode !== "eraser") {
        drawScreen.setCompositeOperation("source-over");
        drawScreen.setBrushStyle(PenStore.thicknessInput.value, PenStore.colorNow.value);
      }
      if (drawMode === "eraser") {
        drawScreen.setCompositeOperation("destination-out");
        drawScreen.setBrushStyle(PenStore.thicknessInput.value, "rgba(0,0colorNow.value");
      }
      pointStack.push({
        x: e.offsetX * ratio,
        y: e.offsetY * ratio,
      });
      start = {
        x: e.offsetX * ratio,
        y: e.offsetY * ratio,
      };
    }
  };
  eventFrame.onmousemove = (e) => {
    if (isMove || isDraw) {
      recordControl.style.pointerEvents = "none";
      pipFrame.style.pointerEvents = "none";
    }
    if (isMove) {
      isStop = true;
      offset = {
        x: e.pageX - container.left,
        y: e.pageY - container.top,
      };
      move = {
        x: offset.x - start.x,
        y: offset.y - start.y,
      };
      VideoOperate.setLivePositionWithinEdge(move.x, move.y);
    }
    if (isDraw) {
      let ratio = drawScreen.canvasPaint.width / eventFrame.clientWidth;
      let newX = e.offsetX * ratio;
      let newY = e.offsetY * ratio;
      if (drawMode === "line" || drawMode === "rectangle" || drawMode === "circle" || drawMode === "arrow") {
        drawScreen.drawCtx.clearRect(0, 0, drawScreen.canvasPaint.width, drawScreen.canvasPaint.height);
        drawScreen.drawCtx.drawImage(
          drawScreen.prevCanvas,
          0,
          0,
          drawScreen.canvasPaint.width,
          drawScreen.canvasPaint.height
        );
      }
      switch (drawScreen.drawMode) {
        case "brush":
          drawScreen.drawCanvasLine(drawScreen.drawCtx, start.x, start.y, newX, newY);
          start.x = newX;
          start.y = newY;
          break;
        case "eraser":
          drawScreen.drawCanvasLine(drawScreen.drawCtx, start.x, start.y, newX, newY);
          start.x = newX;
          start.y = newY;
          break;
        case "line":
          drawScreen.drawStraightLine(drawScreen.drawCtx, start.x, start.y, newX, newY);
          break;
        case "rectangle":
          drawScreen.drawRectangle(drawScreen.drawCtx, start.x, start.y, newX, newY);
          break;
        case "circle":
          drawScreen.drawCircle(drawScreen.drawCtx, start.x, start.y, newX, newY);
          break;
        case "arrow":
          drawScreen.drawArrow(drawScreen.drawCtx, start.x, start.y, newX, newY);
          break;
        default:
          drawScreen.drawCanvasLine(drawScreen.drawCtx, start.x, start.y, newX, newY);
      }
    }
    if (annotatorMode) {
      if (drawScreen.drawMode === "eraser") {
        let percentX = e.offsetX / eventFrame.clientWidth;
        let percentY = e.offsetY / eventFrame.clientHeight;
        let left = `calc(${percentX * 100}% - ${eraserCursor.clientWidth / 2}px)`;
        let top = `calc(${percentY * 100}% - ${eraserCursor.clientHeight / 2}px)`;
        drawScreen.setEraserCursorSize();
        drawScreen.setEraserCursorStyle(left, top);
      }
    }
  };
  eventFrame.onmouseup = (e) => {
    if (annotatorMode) {
      if (drawMode === "eraser") {
        drawScreen.setCompositeOperation("source-over");
      }
      drawScreen.pushScreen();
      drawScreen.pointStack = [];
      drawScreen.nowStartFromPrevEnd = 0;
    }
    recordControl.style.pointerEvents = "auto";
    pipFrame.style.pointerEvents = "auto";
    isMove = false;
    isDraw = false;
    start = {
      x: 0,
      y: 0,
    };
  };*/
  eventFrame.onmouseleave = (e) => {
    if (annotatorMode) {
      if (drawMode === "eraser") {
        drawScreen.setCompositeOperation("source-over");
      }
      drawScreen.pushScreen();
      drawScreen.pointStack = [];
      drawScreen.nowStartFromPrevEnd = 0;
    }
    recordControl.style.pointerEvents = "auto";
    pipFrame.style.pointerEvents = "auto";
    isMove = false;
    isDraw = false;
    isStop = true;
    start = {
      x: 0,
      y: 0,
    };
  };
  eventFrame.onclick = (e) => {
    if (annotatorMode) {
      e.stopPropagation();
    }
    if (isStop) {
      e.stopPropagation();
      isStop = false;
    }
  };

  pipFrame.onmousedown = (e) => {
    if (inPIP) {
      isPIP = true;
      offset = {
        x: e.pageX - container.left,
        y: e.pageY - container.top,
      };
    }
  };
  pipFrame.onmousemove = (e) => {
    if (inPIP && isPIP) {
      let prevLeft = parseInt(pipFrame.style.left) || 0;
      let prevTop = parseInt(pipFrame.style.top) || 0;
      let newX = e.pageX - container.left - offset.x;
      let newY = e.pageY - container.top - offset.y;
      setPIPFramePosition(prevLeft + newX, prevTop + newY);
      offset = {
        x: e.pageX - container.left,
        y: e.pageY - container.top,
      };
    }
  };
  pipFrame.onmouseup = (e) => {
    isPIP = false;
  };
  pipFrame.onmouseleave = (e) => {
    isPIP = false;
  };
  pipFrame.onclick = (e) => {
    e.stopPropagation();
  };
}
/**
 * 註冊 zoomView 滑鼠事件
 */
function initZoomViewEvent() {
  let isMove = false;
  let offset = {
    x: 0,
    y: 0,
  };
  let move = {
    x: 0,
    y: 0,
  };
  zoomView.onmousedown = (e) => {
    if (liveStore["zoom"] > 1) {
      isMove = true;
      move.x = Math.floor(parseFloat(zoomView.style.left));
      move.y = Math.floor(parseFloat(zoomView.style.top));
      offset.x = e.pageX;
      offset.y = e.pageY;
    }
  };
  zoomView.addEventListener("touchstart", function(e) {
    if (liveStore["zoom"] > 1) {
      let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
      let touch = evt.touches[0] || evt.changedTouches[0];
      isMove = true;
      move.x = Math.floor(parseFloat(zoomView.style.left));
      move.y = Math.floor(parseFloat(zoomView.style.top));
      offset.x = touch.pageX;
      offset.y = touch.pageY;
    }
  });
  zoomView.onmousemove = (e) => {
    if (isMove) {
      move.x = move.x + e.pageX - offset.x;
      move.y = move.y + e.pageY - offset.y;
      offset.x = e.pageX;
      offset.y = e.pageY;
      VideoOperate.setZoomViewPositionWithinEdge(move.x, move.y);
    }
  };
  zoomView.addEventListener("touchmove", function(e) {
    if (isMove) {
      let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
      let touch = evt.touches[0] || evt.changedTouches[0];
      move.x = move.x + touch.pageX - offset.x;
      move.y = move.y + touch.pageY - offset.y;
      offset.x = touch.pageX;
      offset.y = touch.pageY;
      VideoOperate.setZoomViewPositionWithinEdge(move.x, move.y);
    }
  });
  zoomView.onmouseup = () => {
    isMove = false;
  };
  zoomView.addEventListener("touchend", function(e) {
    isMove = false;
  });
  zoomView.onmouseleave = () => {
    isMove = false;
  };
}
/**
 * 計算和設定 liveVideo、detectPaint、canvasPaint、eventFrame、zoomView 位置使用
 */
function initVideoOperate() {
  const viewContainer = liveContainer;
  const viewFrame = liveFrame;
  const viewVideo = liveVideo;
  const viewDetectPaint = detectPaint;
  const viewPaintCanvas = canvasPaint;
  const viewEventFrame = eventFrame;
  const previewPanel = zoomPanel;
  const previewView = zoomView;
  const position = {
    zoom: 1,
    left: {
      value: 0,
      ratio: 0,
    },
    top: {
      value: 0,
      ratio: 0,
    },
  };

  /**
   * 儲存 liveVideo Left,Top 百分比
   * @param {number} liveVideoLeft 
   * @param {number} liveVideoTop 
   */
  this.saveLivePosition = (liveVideoLeft, liveVideoTop) => {
    let liveVideoEdge = this.getLivePositionEdge();
    if (liveVideoLeft !== 0) {
      position.left.ratio = parseFloat((liveVideoLeft / liveVideoEdge.x).toFixed(2));
    } else {
      position.left.ratio = 0;
    }
    if (liveVideoTop !== 0) {
      position.top.ratio = parseFloat((liveVideoTop / liveVideoEdge.y).toFixed(2));
    } else {
      position.top.ratio = 0;
    }
    position.left.value = liveVideoLeft;
    position.top.value = liveVideoTop;
  };

  /**
   * 計算 liveVideo 邊界值最大 Left,Top
   * @returns {Object} x,y
   */
  this.getLivePositionEdge = () => {
    // let viewVideoWidth = Math.floor(viewVideo.getBoundingClientRect().width);
    // let viewVideoHeight = Math.floor(viewVideo.getBoundingClientRect().height);
    let viewVideoScaleWidth = Math.floor(viewVideo.dataset.width * parseFloat(viewVideo.dataset.scale));
    let viewVideoScaleHeight = Math.floor(viewVideo.dataset.height * parseFloat(viewVideo.dataset.scale));
    let viewContainerWidth = Math.floor(viewContainer.getBoundingClientRect().width);
    let viewContainerHeight = Math.floor(viewContainer.getBoundingClientRect().height);
    let x = Math.floor((viewVideoScaleWidth - viewContainerWidth) / 2);
    let y = Math.floor((viewVideoScaleHeight - viewContainerHeight) / 2);
    return {
      x: x,
      y: y,
    };
  };

  /**
   * 計算 liveVideo 可視範圍數值，截圖、錄影時需要用到
   * @param {number} cameraWidth 
   * @param {number} cameraHeight 
   * @returns {Object}
   */
  this.getLiveSourceInfo = (cameraWidth, cameraHeight) => {
    const videoLeft = parseInt(liveVideo.dataset.left) || 0;
    const videoTop = parseInt(liveVideo.dataset.top) || 0;
    const scaleVideoW = Math.floor(Number(viewVideo.dataset.width) * parseFloat(viewVideo.dataset.scale));
    const scaleVideoH = Math.floor(Number(viewVideo.dataset.height) * parseFloat(viewVideo.dataset.scale));
    const liveVideoEdge = this.getLivePositionEdge();
    // left top 的起點座標
    let leftStartRatio = 0;
    let topStartRatio = 0;
    // left top 左右上下範圍占比
    let leftEdgeRatio = 0;
    let topEdgeRatio = 0;
    if (liveVideoEdge.x > 0) {
      leftStartRatio = Math.abs(videoLeft - liveVideoEdge.x) / scaleVideoW;
      leftEdgeRatio = (liveVideoEdge.x * 2) / scaleVideoW;
    }
    if (liveVideoEdge.y > 0) {
      topStartRatio = Math.abs(videoTop - liveVideoEdge.y) / scaleVideoH;
      topEdgeRatio = (liveVideoEdge.y * 2) / scaleVideoH;
    }
    let sourceInfo = {
      origin: {
        w: cameraWidth,
        h: cameraHeight,
      },
      pos: { x: 0, xRatio: 0, y: 0, yRatio: 0 },
      size: {
        w: cameraWidth,
        h: cameraHeight,
        wRatio: 1,
        hRatio: 1,
      },
    };
    // 計算截圖來源起點 x,y
    sourceInfo.pos.x = leftStartRatio * cameraWidth;
    sourceInfo.pos.y = topStartRatio * cameraHeight;
    sourceInfo.pos.xRatio = leftStartRatio;
    sourceInfo.pos.yRatio = topStartRatio;
    // 計算截圖來源範圍 width,height
    sourceInfo.size.w = (1 - leftEdgeRatio) * cameraWidth;
    sourceInfo.size.h = (1 - topEdgeRatio) * cameraHeight;
    sourceInfo.size.wRatio = 1 - leftEdgeRatio;
    sourceInfo.size.hRatio = 1 - topEdgeRatio;
    return sourceInfo;
  };

  /**
   * 計算 liveVideo 截圖範圍數值，截圖時需要用到
   * @param {Number} cameraWidth 
   * @param {Number} cameraHeight 
   * @returns {Object}
   */
  this.getLiveCaptureInfo = (cameraWidth, cameraHeight) => {
    const videoZoom = parseFloat(liveVideo.dataset.scale) || 1;
    // video element 相關尺寸
    const { width: containerW, height: containerH } = liveContainer.getBoundingClientRect(); // video element 外圍容器可視區域
    const { width: srcVideoW, height: srcVideoH } = liveFrame.getBoundingClientRect(); // 原始 video element 大小
    // const { width: scaleVideoW, height: scaleVideoH } = liveVideo.getBoundingClientRect();
    const scaleVideoW = Math.floor(liveVideo.dataset.width * parseFloat(liveVideo.dataset.scale)); // 縮放 video element 大小
    const scaleVideoH = Math.floor(liveVideo.dataset.height * parseFloat(liveVideo.dataset.scale));
    // 原始 video 比例
    const videoSizeRatio = parseFloat((srcVideoW / srcVideoH).toFixed(2));
    // 外圍容器可視區域
    const containerSizeRatio = parseFloat((containerW / containerH).toFixed(2));
    const captureInfo = {
      pos: { x: 0, y: 0 },
      size: {
        w: cameraWidth,
        h: cameraHeight,
      },
    };
    if (videoZoom > 1) {
      let outputSizeRatio = videoSizeRatio;
      // video element 的比例在畫面中填滿高度時
      if (containerSizeRatio > videoSizeRatio) {
        let screenAspectRatio = parseFloat((scaleVideoW / containerH).toFixed(2));
        // video 放大時 "左右沒有空間移動" "上下有空間移動"
        // 可視寬度為 video 放大後的寬度，高度為 container 的高度
        if (containerSizeRatio >= screenAspectRatio) {
          outputSizeRatio = screenAspectRatio;
        }
        // video 放大時 "左右有空間移動" "上下有空間移動"
        // 可視寬度為 container 的寬度，高度為 container 的高度
        if (containerSizeRatio < screenAspectRatio) {
          outputSizeRatio = containerSizeRatio;
        }
      }
      // video element 的比例在畫面中填滿寬度時
      if (containerSizeRatio < videoSizeRatio) {
        let screenAspectRatio = parseFloat((containerW / scaleVideoH).toFixed(2));
        // video 放大時 "上下沒有空間移動" "左右有空間移動"
        // 可視寬度為 container 的寬度，高度為 video 放大後的高度
        if (containerSizeRatio <= screenAspectRatio) {
          outputSizeRatio = screenAspectRatio;
        }
        // video 放大時 "上下有空間移動" "左右有空間移動"
        // 可視寬度為 container 的寬度，高度為 container 的高度
        if (containerSizeRatio > screenAspectRatio) {
          outputSizeRatio = containerSizeRatio;
        }
      }
      // 截圖範圍相等於截圖範圍，截圖範圍比例和原始 video 的比例比較
      if (outputSizeRatio > videoSizeRatio) {
        captureInfo.size.w = cameraWidth;
        captureInfo.size.h = cameraWidth / outputSizeRatio;
      }
      if (outputSizeRatio < videoSizeRatio) {
        captureInfo.size.w = cameraHeight * outputSizeRatio;
        captureInfo.size.h = cameraHeight;
      }
      if (outputSizeRatio === videoSizeRatio) {
        captureInfo.size.w = cameraWidth;
        captureInfo.size.h = cameraHeight;
      }
    }
    return captureInfo;
  };

  /**
   * 計算 liveVideo 座標是否超出邊界
   * @param {number} liveVideoLeft
   * @param {number} liveVideoTop
   * @returns {object} liveVideoLeft,liveVideoTop
   */
  this.getLivePositionEdgeOver = (liveVideoLeft, liveVideoTop) => {
    let liveVideoEdge = this.getLivePositionEdge();
    let left = liveVideoLeft;
    let top = liveVideoTop;
    if (liveVideoEdge.x > 0) {
      if (left >= liveVideoEdge.x) {
        left = liveVideoEdge.x;
      }
      if (left <= -liveVideoEdge.x) {
        left = -liveVideoEdge.x;
      }
    } else {
      left = 0;
    }
    if (liveVideoEdge.y > 0) {
      if (top >= liveVideoEdge.y) {
        top = liveVideoEdge.y;
      }
      if (top <= -liveVideoEdge.y) {
        top = -liveVideoEdge.y;
      }
    } else {
      top = 0;
    }
    return { liveVideoLeft: left, liveVideoTop: top };
  };

  /**
   * 定 liveVideo 座標，同時映射 zoomView 座標
   * @param {number} liveVideoLeft
   * @param {number} liveVideoTop
   */
  this.setLivePositionWithinEdge = (liveVideoLeft, liveVideoTop) => {
    // 確認 liveVideo 座標是否超出邊界
    let { liveVideoLeft: left, liveVideoTop: top } = this.getLivePositionEdgeOver(liveVideoLeft, liveVideoTop);
    this.setLivePosition(left, top);
    this.mapZoomViewPosition(left, top);
  };

  /**
   * 設定 liveVideo 座標
   * @param {number} liveVideoLeft
   * @param {number} liveVideoTop
   */
  this.setLivePosition = (liveVideoLeft, liveVideoTop) => {
    this.setLiveTransform({
      left: liveVideoLeft,
      top: liveVideoTop,
    });
    this.saveLivePosition(liveVideoLeft, liveVideoTop);
  };

  /**
   * 映射 zoomView 座標轉換成 liveVideo 座標
   * @param {number} zoomViewLeft
   * @param {number} zoomViewTop
   */
  this.mapLivePosition = (zoomViewLeft, zoomViewTop) => {
    let liveVideoEdge = this.getLivePositionEdge();
    let zoomViewEdge = this.getZoomViewPositionEdge();
    let positionRatio = { x: 0, y: 0 };
    if (zoomViewEdge !== 0) {
      positionRatio.x = zoomViewLeft / zoomViewEdge.x;
    }
    if (zoomViewEdge !== 0) {
      positionRatio.y = zoomViewTop / zoomViewEdge.y;
    }
    let liveVideoLeft = -1 * liveVideoEdge.x * positionRatio.x;
    let liveVideoTop = -1 * liveVideoEdge.y * positionRatio.y;
    // 確認 liveVideo 座標是否超出邊界
    let { liveVideoLeft: left, liveVideoTop: top } = this.getLivePositionEdgeOver(liveVideoLeft, liveVideoTop);
    this.setLivePosition(left, top);
  };

  /**
   * 設定 .live(liveVideo)、#detectPaint、#canvasPaint、#eventFrame 的 transform 屬性，傳入物件屬性，只會更新傳入的屬性，不傳入的屬性不會更新
   * @param {Number} transformStyle.left translateX
   * @param {Number} transformStyle.top translateY
   * @param {Number} transformStyle.scale scale
   * @param {Number} transformStyle.rotate rotate
   * @param {String} transformStyle.mirror mirror string
   * @param {Object} transformStyle 屬性物件
   */
  this.setLiveTransform = (transformStyle) => {
    // transform style element
    let elements = [viewVideo, viewDetectPaint, viewPaintCanvas, viewEventFrame];
    let left = Number(viewVideo.dataset.left);
    let top = Number(viewVideo.dataset.top);
    let scale = Number(viewVideo.dataset.scale);
    let rotate = Number(viewVideo.dataset.rotate);
    let mirror = String(viewVideo.dataset.mirror);
    // loop css style
    for (const key in transformStyle) {
      let value = transformStyle[key];
      switch (key) {
        case "left":
          left = value;
          break;
        case "top":
          top = value;
          break;
        case "scale":
          scale = value;
          break;
        case "rotate":
          rotate = value;
          break;
        case "mirror":
          mirror = value;
          break;
        default:
          break;
      }
    }
    // transform value
    let transform = `translate(${left}px, ${top}px) scale(${scale}) rotate(${rotate}deg) ${mirror}`;
    // loop element set transform value
    elements.forEach((element) => {
      element.style.transform = transform;
      element.dataset.left = left;
      element.dataset.top = top;
      element.dataset.scale = scale;
      element.dataset.rotate = rotate;
      element.dataset.mirror = mirror;
    });
    this.saveLivePosition(left, top);
  };

  /**
   * 輸入 liveVideo 的 Left,Top,Scale 計算出 zoomView 的 Left,Top,Scale 並設定 zoomView
   * @param {Number} transformStyle.left translateX
   * @param {Number} transformStyle.top translateY
   * @param {Number} transformStyle.scale scale
   * @param {Object} transformStyle 屬性物件
   */
  this.setZoomViewTransform = (transformStyle) => {
    let { left: liveVideoLeft, top: liveVideoTop, scale: liveVideoScale } = transformStyle;
    this.updateZoomViewSize(liveVideoScale);
    this.mapZoomViewPosition(liveVideoLeft, liveVideoTop);
  };

  /**
   * 計算 zoomView 邊界值最大 Left,Top
   * @returns {Object} x,y
   */
  this.getZoomViewPositionEdge = () => {
    let leftEdge = (previewPanel.getBoundingClientRect().width - previewView.getBoundingClientRect().width) / 2;
    let topEdge = (previewPanel.getBoundingClientRect().height - previewView.getBoundingClientRect().height) / 2;
    let previewPanelBorder = parseInt(getComputedStyle(previewPanel, null).getPropertyValue("border")) || 0;
    return {
      x: leftEdge - previewPanelBorder,
      y: topEdge - previewPanelBorder,
    };
  };

  /**
   * 計算 zoomView 座標是否超出邊界
   * @param {number} zoomViewLeft
   * @param {number} zoomViewTop
   * @returns {Object} zoomViewLeft, zoomViewTop
   */
  this.getZoomViewPositionEdgeOver = (zoomViewLeft, zoomViewTop) => {
    let zoomViewEdge = this.getZoomViewPositionEdge();
    let left = zoomViewLeft;
    let top = zoomViewTop;
    if (left >= zoomViewEdge.x) {
      left = zoomViewEdge.x;
    }
    if (left < -1 * zoomViewEdge.x) {
      left = -1 * zoomViewEdge.x;
    }
    if (top >= zoomViewEdge.y) {
      top = zoomViewEdge.y;
    }
    if (top < -1 * zoomViewEdge.y) {
      top = -1 * zoomViewEdge.y;
    }
    return { zoomViewLeft: left, zoomViewTop: top };
  };

  /**
   * 設定 zoomView 座標，同時映射 liveVideo 座標
   * @param {number} zoomViewLeft
   * @param {number} zoomViewTop
   */
  this.setZoomViewPositionWithinEdge = (zoomViewLeft, zoomViewTop) => {
    // 確認 zoomView 座標是否超出邊界
    let { zoomViewLeft: left, zoomViewTop: top } = this.getZoomViewPositionEdgeOver(zoomViewLeft, zoomViewTop);
    this.setZoomViewPosition(left, top);
    this.mapLivePosition(left, top);
  };

  /**
   * 設定 zoomView 座標
   * @param {number} zoomViewLeft
   * @param {number} zoomViewTop
   */
  this.setZoomViewPosition = (zoomViewLeft, zoomViewTop) => {
    previewView.style.left = `${zoomViewLeft}px`;
    previewView.style.top = `${zoomViewTop}px`;
  };

  /**
   * 映射 liveVideo 座標轉換成 zoomView 座標
   * @param {number} liveVideoLeft
   * @param {number} liveVideoTop
   */
  this.mapZoomViewPosition = (liveVideoLeft, liveVideoTop) => {
    let liveVideoEdge = this.getLivePositionEdge();
    let zoomViewEdge = this.getZoomViewPositionEdge();
    let positionRatio = { x: 0, y: 0 };
    if (liveVideoEdge.x !== 0) {
      positionRatio.x = liveVideoLeft / liveVideoEdge.x;
    }
    if (liveVideoEdge.y !== 0) {
      positionRatio.y = liveVideoTop / liveVideoEdge.y;
    }
    let zoomViewLeft = -1 * zoomViewEdge.x * positionRatio.x;
    let zoomViewTop = -1 * zoomViewEdge.y * positionRatio.y;
    // 確認 zoomView 座標是否超出邊界
    let { zoomViewLeft: left, zoomViewTop: top } = this.getZoomViewPositionEdgeOver(zoomViewLeft, zoomViewTop);
    this.setZoomViewPosition(left, top);
  };

  /**
   * 更新 zoomView 尺寸
   * @param {number} liveVideoScale
   */
  this.updateZoomViewSize = (liveVideoScale) => {
    if (!liveVideoScale) {
      liveVideoScale = parseFloat(liveVideo.dataset.scale);
    }
    let { width: containerW, height: containerH } = viewContainer.getBoundingClientRect();
    let { width: srcVideoW, height: srcVideoH } = viewFrame.getBoundingClientRect();
    // let { width: scaleVideoW, height: scaleVideoH } = liveVideo.getBoundingClientRect();
    let liveVdieoW = Number(liveVideo.dataset.width);
    let liveVdieoH = Number(liveVideo.dataset.height);
    let scaleVideoW = Math.floor(liveVdieoW * liveVideoScale);
    let scaleVideoH = Math.floor(liveVdieoH * liveVideoScale);

    let containerSizeRatio = parseFloat((containerW / containerH).toFixed(2));
    let videoSizeRatio = parseFloat((srcVideoW / srcVideoH).toFixed(2));
    // video element 的比例在畫面中填滿高度時
    if (containerSizeRatio > videoSizeRatio) {
      let screenAspectRatio = parseFloat((scaleVideoW / containerH).toFixed(2));
      // video 放大時 "左右沒有空間移動" "上下有空間移動"
      if (containerSizeRatio > screenAspectRatio) {
        zoomView.style.width = "100%";
        zoomView.style.height = "auto";
        zoomView.style.aspectRatio = `${scaleVideoW}/${containerH}`;
      }
      // video 放大時 "左右有空間移動" "上下有空間移動"
      if (containerSizeRatio < screenAspectRatio) {
        zoomView.style.width = `${(containerW / scaleVideoW) * 100}%`;
        zoomView.style.height = "auto";
        zoomView.style.aspectRatio = `${containerW}/${containerH}`;
      }
      if (screenAspectRatio === videoSizeRatio) {
        zoomView.style.width = "100%";
        zoomView.style.height = "100%";
        zoomView.style.aspectRatio = `${srcVideoW}/${srcVideoH}`;
      }
    }
    // video element 的比例在畫面中填滿寬度時
    if (containerSizeRatio < videoSizeRatio) {
      let screenAspectRatio = parseFloat((containerW / scaleVideoH).toFixed(2));
      // video 放大時 "上下沒有空間移動" "左右有空間移動"
      if (containerSizeRatio < screenAspectRatio) {
        zoomView.style.width = "auto";
        zoomView.style.height = "100%";
        zoomView.style.aspectRatio = `${containerW}/${scaleVideoH}`;
      }
      // video 放大時 "上下有空間移動" "左右有空間移動"
      if (containerSizeRatio > screenAspectRatio) {
        zoomView.style.width = `auto`;
        zoomView.style.height = `${(containerH / scaleVideoH) * 100}%`;
        zoomView.style.aspectRatio = `${containerW}/${containerH}`;
      }
      if (screenAspectRatio === videoSizeRatio) {
        zoomView.style.width = "100%";
        zoomView.style.height = "100%";
        zoomView.style.aspectRatio = `${srcVideoW}/${srcVideoH}`;
      }
    }
    // video === container
    if (containerSizeRatio === videoSizeRatio) {
      zoomView.style.width = `calc(100% / ${scaleVideoW / srcVideoW})`;
      zoomView.style.height = "auto";
      zoomView.style.aspectRatio = `${liveFrame.style.aspectRatio}`;
    }
  };

  /**
   * 縮放大小改變時重新計算 liveVideo 所在座標
   * @param {number} liveVideoScale
   * @returns {Object} liveVideoLeft liveVideoTop
   */
  this.getLivePositionOnZoom = (liveVideoScale) => {
    let { width: containerW, height: containerH } = viewContainer.getBoundingClientRect();
    let { width: srcVideoW, height: srcVideoH } = viewFrame.getBoundingClientRect();
    let zoom = parseFloat(liveVideoScale.toFixed(1));
    let leftRange = srcVideoW * zoom - containerW;
    let topRange = srcVideoH * zoom - containerH;
    let leftEdge = Math.floor(Math.abs(leftRange / 2));
    let topEdge = Math.floor(Math.abs(topRange / 2));
    let liveVideoLeft = 0;
    let liveVideoTop = 0;
    if (leftRange > 0) {
      liveVideoLeft = Math.floor(leftEdge * position.left.ratio);
    } else {
      liveVideoLeft = 0;
    }
    if (topRange > 0) {
      liveVideoTop = Math.floor(topEdge * position.top.ratio);
    } else {
      liveVideoTop = 0;
    }
    if (zoom === 1) {
      liveVideoLeft = 0;
      liveVideoTop = 0;
    }
    return { liveVideoLeft, liveVideoTop };
  };
}
// hex 色碼轉 gray
function hexToGray(H) {
  let R = parseInt(H.substring(1, 3), 16);
  let G = parseInt(H.substring(3, 5), 16);
  let B = parseInt(H.substring(5, 7), 16);
  let Gray = R * 0.299 + G * 0.587 + B * 0.114;
  return Gray;
}
// hex 色碼轉 hsl
function hexToHSL(H) {
  // Convert hex to RGB first
  let r = 0,
    g = 0,
    b = 0;
  if (H.length == 4) {
    r = "0x" + H[1] + H[1];
    g = "0x" + H[2] + H[2];
    b = "0x" + H[3] + H[3];
  } else if (H.length == 7) {
    r = "0x" + H[1] + H[2];
    g = "0x" + H[3] + H[4];
    b = "0x" + H[5] + H[6];
  }
  // Then to HSL
  r /= 255;
  g /= 255;
  b /= 255;
  let cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin,
    h = 0,
    s = 0,
    l = 0;

  if (delta == 0) h = 0;
  else if (cmax == r) h = ((g - b) / delta) % 6;
  else if (cmax == g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h: h, s: s, l: l };
}
// electron 環境使用 F12、F5
document.addEventListener("keyup", (e) => {
  if (e.code === "F12") {
    node_app.openDevTool?.();
  }
  if (e.code === "F5") {
    location.reload();
  }
  if (e.code === "KeyO") {
    // if (tempCanvas.style.display === "none") {
    //   tempCanvas.style.display = "block";
    // } else {
    //   tempCanvas.style.display = "none";
    // }
  }
});
// 監聽來自 OKIOPoint 面版的開關事件
window.addEventListener("OKIOPointState", (e) => {
  if (!$(".btn-okiopoint").hasClass("unavaliable")) {
    TrackFn.reset();
    if (qrCodeTrack.checked) {
      $(".btn-okiopoint").removeClass("active");
      qrCodeTrack.checked = false;
      DetectFn.stop();
    } else {
      $(".btn-okiopoint").addClass("active");
      qrCodeTrack.checked = true;
      DetectFn.stop();
      DetectFn.start();
    }
  }
});
navigator.hid?.addEventListener("connect", async (e) => {
  let deviceList = await navigator.mediaDevices.enumerateDevices();
  let vendorId = e.device.vendorId.toString(16).padStart(4, "0");
  let productId = e.device.productId.toString(16).padStart(4, "0");
  let connectVidPid = vendorId + ":" + productId;

  appendVideoOption(deviceList);

  if (cameraState["camera_one"]["vidpid"]) {
    if (cameraState["camera_one"]["vidpid"] === connectVidPid) {
      selectVideoOption();
      initializeHid(vendorId, productId);
      getStream();
    }
    if (cameraState["camera_one"]["vidpid"] !== connectVidPid) {
      selectVideoOption();
    }
  }
  if (cameraState["camera_two"]["vidpid"] === connectVidPid) {
    getPIPStream();
  }
});
navigator.hid?.addEventListener("disconnect", async (e) => {
  let deviceList = await navigator.mediaDevices.enumerateDevices();
  let vendorId = e.device.vendorId.toString(16).padStart(4, "0");
  let productId = e.device.productId.toString(16).padStart(4, "0");
  let disconnectVidPid = vendorId + ":" + productId;
  // 刷新列表
  appendVideoOption(deviceList);
  // 設定列表
  selectVideoOption();

  if (vendorId === WebHIDdevice?.device?.vendorId && productId === WebHIDdevice?.device?.productId) {
    await WebHIDdevice.close();
  }
  if (cameraState["camera_one"]["vidpid"] === disconnectVidPid) {
    videoSelect.selectedIndex = -1;
  }
});
/* 已經棄用
node_usb.onChange?.(async (event, data) => {
  const onDeviceChange = () => {
    const waitDeviceChange = new Promise((resolve, reject) => {
      let loopTimer = null;
      let loopMax = 0;
      const waitLoop = async () => {
        let deviceInfos = await navigator.mediaDevices.enumerateDevices();
        let newVideoInputs = deviceInfos.filter((device) => device.kind === "videoinput");
        let prevVideoInputs = [...window.videoInputs];
        if (prevVideoInputs.length === newVideoInputs.length) {
          loopMax++;
          console.log("loop");
          loopTimer = setTimeout(() => {
            clearTimeout(loopTimer);
            waitLoop();
          }, 50);
          if (loopMax >= 30) {
            clearTimeout(loopTimer);
            resolve(newVideoInputs);
          }
        } else {
          console.log("ok");
          clearTimeout(loopTimer);
          resolve(newVideoInputs);
        }
      };
      waitLoop();
    });
    return waitDeviceChange;
  };
  onDeviceChange()
    .then((videoInputs) => {
      const { type, vid: changeVid, pid: changePid, vidpid: changeVidPid } = data;
      if (type === "remove") {
        appendVideoOption(videoInputs);
        selectVideoOption();
        if (cameraState["camera_one"]["vidpid"] === changeVidPid) {
          videoSelect.selectedIndex = -1;
        }
      }
      if (type === "add") {
        appendVideoOption(videoInputs);
        if (cameraState["camera_one"]["vidpid"]) {
          if (cameraState["camera_one"]["vidpid"] === changeVidPid) {
            selectVideoOption();
            initializeHid(changeVid, changePid);
            getStream();
          }
          if (cameraState["camera_one"]["vidpid"] !== changeVidPid) {
            selectVideoOption();
          }
        }
        if (cameraState["camera_two"]["vidpid"] === changeVidPid) {
          getPIPStream();
        }
      }
      window.videoInputs = [...videoInputs];
    })
    .catch((error) => {
      console.log(error);
    });
});
 */
/**
 * 取時間當作截圖錄影檔名
 * @returns {String} `${year}-${month}-${day}-${hours}-${minutes}-${seconds}-${milliseconds}`
 */
function getCurrentTime() {
  const now = new Date(Date.now());
  const year = now.getFullYear().toString().padStart(4, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  const milliseconds = now.getMilliseconds().toString().padStart(3, "0");
  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}-${milliseconds}`;
}
/**
 * 和 Folder 操作有關，路徑資料會儲存在 MainProcess 中，這些操作和 MainProcess 有關
 * @returns 
 */
function saveLocalFile(filename, folder = "", content, mimetype, callback = null) {
	let dirEntry;

	if (folder != "") {
		dirEntry = folder;
	}
	else
		dirEntry = fs.root;

	dirEntry.getFile(filename, { create: true }, function (fileEntry) {
		fileEntry.createWriter(function (fileWriter) {
			fileWriter.seek(fileWriter.length);
			fileWriter.onwriteend = function (e) {
				//console.log('blob saved')
				if (callback != null)
					callback();
			};

			fileWriter.onerror = function (e) {
				//console.log('Error occured: ' + e.toString() + "\n File couldn't saved");
			};

			let contentBlob = new Blob([content], { type: mimetype });

			fileWriter.write(contentBlob);

		}, handleError);
	}, handleError);
}

function loadLocalFile(filename, folder = "", callback) {
	if (typeof filename === "undefined")
		return;

	//var type = filename.slice(0, 5);
	//var ext = filename.slice(-3);
	let dirEntry;

	if (folder != "") {
		dirEntry = folder;
	}
	else
		dirEntry = fs.root;

	// 2nd parameter is whether to create the file or read the file, refer to deleteTheFile function
	dirEntry.getFile(filename, {}, function (fileEntry) {
		fileEntry.file(function (file) {
			let reader = new FileReader();
			reader.onload = function (e) {
				callback(this.result);
			};
			
			reader.readAsDataURL(file);
			
		}, handleError);
	}, handleError);
}

function initFolderSection() {
  if (!window.isElectron) {
    return false;
  }

  const localSavePath = localStorage.getItem("SaveFolder");
  const folderPathText = document.getElementById("folderPath");
  const choosePathBtn = document.getElementById("chooseFolder");
  const openFolderBtn = document.getElementById("openFolder");

  const libraryItem = document.getElementById("libraryItem");

  libraryItem.classList.remove("hide");
  openFolderBtn.classList.remove("hide");

  const updateFolderPath = (path) => {
    // 更新 MainProcess 的路徑資料
    node_fs.updateCurrentFolder?.(path);
    folderPathText.innerText = path;
    folderPathText.title = path;
    folderPathText.dataset.path = path;
    localStorage.setItem("SaveFolder", path);
  };
  // 如果 localStorage 存在檔案路徑就更新處存字串
  if (localSavePath) {
    updateFolderPath(localSavePath);
  } else {
    // MainProcess 設定一個預設路徑，onFolderChange() callback 返回 MainProcess 來的路徑並更新處存字串
    node_fs.chooseDefaultFolder?.();
  }
  // MainProcess showOpenDialog 選擇一個路徑，onFolderChange() callback 返回 MainProcess 來的路徑並更新處存字串
  choosePathBtn.onclick = () => {
    node_fs.chooseCustomFolder?.();
  };
  // 接收從新的設定路徑
  node_fs.onFolderChange?.((path) => {
    updateFolderPath(path);
  });
  // 開啟目錄
  openFolder.onclick = (e) => {
    e.stopPropagation();
    node_fs.openFolder?.(folderPathText.dataset.path);
  };
  const updateAvatarImage = (path) => {
    //let img = document.getElementById("avatarImage");
    //img.src = path;
    //localStorage.setItem("AvatarImage", path);
    
    let imported = document.getElementById("imported");
    let holder = document.createElement("div");
    holder.className = "holder";
    let img = document.createElement("img");
    img.src = path;
    holder.appendChild(img);
    imported.appendChild(holder);
    avatarImages.push(path);
    localStorage.setItem('AvatarImages', JSON.stringify(avatarImages));
  };
  node_fs.onAvatarChange?.((path) => {
    updateAvatarImage(path);
  });
}
var avatarDialog = document.getElementById("avatar-dialog");
var avatar_Gallery = document.getElementById("avatar-gallery");
var closeGallery = document.getElementById("close-gallery");
var importGallery = document.getElementById("import-avatar");
var chooseFile = document.getElementById("chooseFile");
avatarDialog.onclick = (e) => {
  e.preventDefault();
  e.stopPropagation();
}
avatar_Gallery.onclick = (e) => {
  e.preventDefault();
  e.stopPropagation();
}
closeGallery.onclick = (e) => {
  $("#avatar-dialog").addClass("hide");
  $("#avatar-gallery").addClass("hide");
  e.preventDefault();
  e.stopPropagation();
}
importGallery.onclick = (e) => {
  document.getElementById('chooseFile').click();
  e.preventDefault();
  e.stopPropagation();
}
chooseFile.addEventListener('change', (event) => {
  const file = event.target.files[0];

    if (file) {
      const fileName = file.name;
      const reader = new FileReader();

      reader.onload = function(e) {
        const imageData = e.target.result;

        let imported = document.getElementById("imported");
        let holder = document.createElement("div");
        holder.className = "holder";
        let img = document.createElement("img");
        img.src = imageData;
        img.setAttribute('data-name', fileName);
        holder.appendChild(img);
        imported.appendChild(holder);
        avatarImages.push(fileName);
        saveLocalFile(fileName, undefined, dataURLtoBlob(imageData), "image/png");
        localStorage.setItem('AvatarImages', JSON.stringify(avatarImages));
      };

      reader.readAsDataURL(file);
    }
})
window.changeAvatarImage = function changeAvatarImage() {
  node_fs.chooseAvatarImage?.();
}
window.avatarGallery = function avatarGallery() {
//export function avatarGallery() {
  $("#avatar-dialog").removeClass("hide");
  $("#avatar-gallery").removeClass("hide");
}
window.redrawAvatar = function redrawAvatar() {
//export function redrawAvatar() {
  DetectFn.forceRedraw = true;
}
window.initAvatar = function initAvatar() {
  let path = localStorage.getItem("AvatarImage");
  let img = document.getElementById("avatarImage");
  if (path !== undefined && path != null && img != null) {
    if (path.includes("./image/")) {
      img.src = path;
    }
    else {
      if (fs != null) {
        loadLocalFile(path, undefined, function(content) {
          img.src = content;
        });
      }
      else {
        setTimeout(() => {
          loadLocalFile(path, undefined, function(content) {
            img.src = content;
          });
        }, 100);
      }
    }
  }
}
/**
 * 避免電腦閒置掛機造成異常
 */
async function wakeLock() {
  if ("wakeLock" in navigator) {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if (wakeLock) {
          wakeLock = null;
        }
        // 過 wakeLock.request() 去啟動喚醒鎖
        wakeLock = await navigator.wakeLock.request();
        // 透過 released 這個狀態去偵測是否啟動
        wakeLock.addEventListener("release", () => {
          console.log("Screen Wake Lock released:", wakeLock.released);
        });
        console.log("Screen Wake Lock released:", wakeLock.released);
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    };
    await requestWakeLock();
  }
}

wakeLock();

initFolderSection();

console.log("Ver 1.1.1 => 2023/05/23");

document.querySelectorAll(".tab-button").forEach((btn) => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hide"));

    btn.classList.add("active");
    const tabId = btn.getAttribute("data-target");
    const panel = document.getElementById(tabId);
    if (panel) {
      panel.classList.remove("hide");
    }

    if(tabId == "builtIn") {
      document.getElementById("delete-avatar").classList.add('hide');
      document.getElementById("import-avatar").classList.add('hide');
    }
    else {
      document.getElementById("delete-avatar").classList.remove('hide');
      document.getElementById("import-avatar").classList.remove('hide');
    }
  });
});
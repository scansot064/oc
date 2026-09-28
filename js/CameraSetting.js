import OKIODeviceList from "../assets/resolutions.json" assert { type: "json" };

const GlobalResolutions = [
  "640x480",
  "800x600",
  "1024x768",
  "1280x720",
  "1600x1200",
  "1920x1080",
  "2048x1536",
  "2592x1944",
  "3264x2448",
  "3840x2160",
  "4192x3104",
];

const CameraSetting = {
  data() {
    return {
      main: {
        devices: [],
        resolutions: [],
        selectedVidPid: null,
        selectedDevice: null,
        selectedResolution: null,
        defaultResolution: null,
      },
      second: {
        devices: [],
        resolutions: [],
        selectedVidPid: null,
        selectedDevice: null,
        selectedResolution: null,
      },
      pip: {
        size: "1",
        position: "4",
      },
      local: {
        resolution: JSON.parse(localStorage.getItem("resoultion")),
        vidpid: localStorage.getItem("deviceId"),
      },
      OKIODeviceList: OKIODeviceList,
    };
  },
  mounted() {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        this.updateDevices(devices);
      })
      .catch((err) => {
        console.error(err);
      });
  },
  watch: {
    "main.selectedDevice": function () {
      this.updateMainResolutions();
    },
    "main.selectedResolution": function () {
      this.updateSecondResolutions();
    },
    "second.selectedDevice": function () {
      this.updateSecondResolutions();
    },
    "pip.position": function (e) {
      this.onPositionChange();
    },
    "pip.size": function (e) {
      this.onSizeChange();
    },
  },
  methods: {
    formatDevices(devices) {
      return devices.filter((device) => {
        if (device.kind === "videoinput") {
          let vidpidReg = new RegExp(/(.{4}):(.{4})/);
          let vidpidMatch = device.label.match(vidpidReg);
          device.vidpid = vidpidMatch[0];
          device.vid = vidpidMatch[1];
          device.pid = vidpidMatch[2];
          return device;
        }
      });
    },
    formatResolutions(resolutions) {
      return resolutions.map((resolution) => {
        let [width, height] = resolution.split("x");
        return {
          label: resolution,
          value: resolution,
          width: Number(width),
          height: Number(height),
        };
      });
    },
    updateDevices(devices) {
      let videoDevices = this.formatDevices(devices);
      if (videoDevices.length === 0) {
        return false;
      }

      // set main.devices、set second.devices
      this.main.devices = [...videoDevices];
      this.second.devices = [
        {
          deviceId: "null",
          label: "None",
        },
        ...videoDevices,
      ];

      // set main.selectedDevice、set second.selectedDevice
      this.main.selectedDevice = this.main.devices[0].deviceId;
      // 如果 localstorage 有資料，就把 this.local.vidpid 的資料設定為 main.selectedDevice
      if (this.local.vidpid) {
        let localDevice = this.main.devices.find((device) => device.vidpid === this.local.vidpid);
        this.main.selectedDevice = localDevice.deviceId;
      }
      this.second.selectedDevice = "null";
    },
    updateMainResolutions() {
      let mainDevice = this.main.devices.find((device) => {
        return device.deviceId === this.main.selectedDevice;
      });
      let okioDevice = this.OKIODeviceList[mainDevice.vidpid];
      // set main.resoultions、main.selectedResolution、main.defaultResolution
      if (okioDevice) {
        this.main.resolutions = this.formatResolutions(okioDevice.resolution);
        this.main.selectedResolution = okioDevice.default;
        this.main.default = okioDevice.default;
      }
      if (!okioDevice) {
        this.main.resolutions = this.formatResolutions(GlobalResolutions);
        this.main.selectedResolution = this.main.resolutions[0].value;
        this.main.default = null;
      }
      // 如果 localstorage 有資料，就把 this.local.resolution 的資料設定為 selectedResolution
      if (this.local.resolution) {
        this.main.selectedResolution = this.local.resolution[mainDevice.vidpid]["resoultionLabel"];
      }
    },
    updateSecondResolutions() {
      let secondDevice = this.second.devices.find((device) => {
        return device.deviceId === this.second.selectedDevice;
      });
      let okioDevice = this.OKIODeviceList[secondDevice.vidpid];
      if (okioDevice) {
        this.second.resolutions = this.formatResolutions(okioDevice.resolution);
      }
      if (!okioDevice) {
        this.second.resolutions = this.formatResolutions(GlobalResolutions);
      }

      if (this.second.selectedDevice === "null") {
        this.second.resolutions = this.second.resolutions.map((resolution) => ({ ...resolution, disabled: true }));
      }
      if (this.second.selectedDevice !== "null" && this.main.selectedDevice !== this.second.selectedDevice) {
        this.second.resolutions = this.second.resolutions.map((resolution) => ({ ...resolution, disabled: false }));
      }
      if (this.second.selectedDevice !== "null" && this.main.selectedDevice === this.second.selectedDevice) {
        let [mainWidth, mainHeight] = this.main.selectedResolution.split("x");
        this.second.resolutions = this.second.resolutions.map((resolution) => {
          let [secondWidth, secondHeight] = resolution.value.split("x");
          if (Number(secondWidth) > Number(mainWidth) || Number(secondHeight) > Number(mainHeight)) {
            resolution.disabled = true;
          } else {
            resolution.disabled = false;
          }
          return resolution;
        });
      }

      this.second.selectedResolution = this.second.resolutions[0].value;
    },
    onPositionChange(e) {
      console.log(this.pip);
    },
    onSizeChange(e) {
      console.log(this.pip);
    },
  },
};

export default CameraSetting;

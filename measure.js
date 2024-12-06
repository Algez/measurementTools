import MeasureTriangle from "./triangle.js";
export default function measureTool(viewer) {
  this.viewer = viewer;
  this.polytriangle = undefined;
  if (window.turf) {
  } else {
    addScript("https://unpkg.com/@turf/turf@6/turf.min.js", () => {});
  }
}
measureTool.prototype.init = function () {
  if (this.polytriangle) {
    this.polytriangle.clear();
    this.polytriangle = undefined;
  }
};

measureTool.prototype.drawTriangle = function () {
  this.init();
  this.polytriangle = new MeasureTriangle(this.viewer);
  this.polytriangle.activate();
};

measureTool.prototype.deleteTriangle = function () {
  this.init();
  this.polytriangle = new MeasureTriangle(this.viewer);
  this.polytriangle.deactivate();
};

function addScript(url, callback) {
  let script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.setAttribute("src", url);
  document.getElementsByTagName("head")[0].appendChild(script);
  script.onload = callback;
}

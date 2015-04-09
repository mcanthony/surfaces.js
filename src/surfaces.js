import _ from 'underscore';
import twoRotations from 'two-rotations';
import compute from './compute';
import createPlane from './create-plane';

// The options that can be passed into
// a new Surface instance
var surfaceOptions = [
  'tagName', 'fn', 'el',
  'width', 'height',
  'colorFn',
  'zoom', 'yaw', 'pitch',
  'yInterval', 'xInterval', 'zInterval',
  'currentFrame', 'maxPitch',
];

class Surface {

  // Create a new Surface
  constructor(options) {
    _.defaults(this, _.pick(options, surfaceOptions), {
      width: 300,
      height: 300,
      zoom: 1,
      tagName: 'canvas',
      yaw: 0.5,
      colorFn() { return '#333'; },
      pitch: 0.5,
      yInterval: [-10, 10],
      xInterval: [-10, 10],
      zInterval: [0, 10],
      currentFrame: 0,
      fn: Surface.spacetimeOrigin,
      maxPitch: Math.PI / 2
    });

    // A reference to the rotation matrix
    this._rotationMatrix = [];

    // Generate our initial rotation matrix
    this._generateRotation();

    this._ensureElement();
    this._setType();
    this.initialize(...arguments);
  }

  // A method that can be overwritten to augment
  // the instantiation of a Surface
  initialize() {}

  // Generate, and cache, our data
  computeData() {
    this._cache = compute({
      fn: this.fn,
      startTime: this.currentFrame,
      maxTime: this.currentFrame,
      xInterval: this.xInterval,
      yInterval: this.yInterval,
      spaceStep: 1
    });

    return this;
  }

  // Adjust the orientation of the Surface
  orient(orientation) {
    _.extend(this, _.pick(orientation, ['yaw', 'pitch']));

    // Ensure that the pitch doesn't go beyond our maximum
    this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
    this._generateRotation();
    return this;
  }

  // Render the surface into its element
  render() {
    if (!this._cache) {
      this.computeData();
    }
    var data = this._cache;

    var plane = createPlane({
      data: data[0],
      heightFn(d) { return d; },
      zoom: 1,
      height: this.height,
      width: this.width,
      rotationMatrix: this._rotationMatrix
    });

    this._renderCanvasSurface(plane);

    return this;
  }

  // Set our rotation matrix
  _generateRotation() {
    this._rotationMatrix = twoRotations.generateMatrix(this.yaw, this.pitch);
  }

  // Make sure that this Surface has an
  // associated SVG or Canvas element
  _ensureElement() {
    if (!this.el) {
      this.el = this._createElement(_.result(this, 'tagName'));
    } else {
      this.el = _.result(this, 'el');
    }

    if (this.el.nodeName.toLowerCase() === 'canvas') {
      this.el.width = this.width;
      this.el.height = this.height;
    }
  }

  // Set whether this Surface is an SVG or a Canvas
  _setType() {
    this._type = this.el.nodeName.toLowerCase();
  }

  // Create a new element, given a tagName
  _createElement(tagName) {
    if (tagName === 'svg') {
      return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    } else if (tagName === 'canvas') {
      return document.createElement('canvas');
    } else {
      throw new Error('The element must be a canvas or svg.');
    }
  }

  // Render a surface as a Canvas
  _renderCanvasSurface(plane) {
    var context = this.el.getContext('2d');

    // Clear the canvas
    context.clearRect (0, 0, this.el.width, this.el.height);

    // Loop through our data, drawing each piece of the surface
    var p;
    plane.forEach(a => {
      p = a.path;
      context.beginPath();
      context.fillStyle = this.colorFn(a.avg);
      context.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      context.moveTo(Math.round(p.moveTo[0]), Math.round(p.moveTo[1]));
      context.lineTo(Math.round(p.pointOne[0]), Math.round(p.pointOne[1]));
      context.lineTo(Math.round(p.pointTwo[0]), Math.round(p.pointTwo[1]));
      context.lineTo(Math.round(p.pointThree[0]), Math.round(p.pointThree[1]));
      context.stroke();
      context.fill();
    });
  }
}

// Return the spacetime origin coordinate: [0, 0, 0, 0]
Surface.spacetimeOrigin = function() {
  return [[[0]]];
};

export default Surface;

/**
 * Chaineye hero: neural WebGL background (sharp strands, no blur stack)
 */
(function () {
  "use strict";

  var canvas = document.getElementById("neuro");
  var hero = document.querySelector(".hero");
  var wrap = document.querySelector(".hero-neuro");
  if (!canvas || !hero) return;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var pointer = { x: 0, y: 0, tX: 0, tY: 0 };
  var gl, uniforms, ratio = 1;
  var started = false;
  var w = 0;
  var h = 0;

  function shaderText(id) {
    var el = document.getElementById(id);
    return el ? el.textContent.trim() : "";
  }

  function initGL() {
    var opts = {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      failIfMajorPerformanceCaveat: false,
      powerPreference: "high-performance",
    };

    gl =
      canvas.getContext("webgl", opts) ||
      canvas.getContext("experimental-webgl", opts);

    if (!gl) {
      document.body.classList.add("neuro-no-webgl");
      return false;
    }

    var vs = shaderText("vertShader");
    var fs = shaderText("fragShader");
    if (!vs || !fs) {
      document.body.classList.add("neuro-no-webgl");
      return false;
    }

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("neuro:", gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }

    var vsSh = compile(gl.VERTEX_SHADER, vs);
    var fsSh = compile(gl.FRAGMENT_SHADER, fs);
    if (!vsSh || !fsSh) {
      document.body.classList.add("neuro-no-webgl");
      return false;
    }

    var prog = gl.createProgram();
    gl.attachShader(prog, vsSh);
    gl.attachShader(prog, fsSh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("neuro:", gl.getProgramInfoLog(prog));
      document.body.classList.add("neuro-no-webgl");
      return false;
    }

    gl.useProgram(prog);
    uniforms = {
      u_time: gl.getUniformLocation(prog, "u_time"),
      u_ratio: gl.getUniformLocation(prog, "u_ratio"),
      u_pointer_position: gl.getUniformLocation(prog, "u_pointer_position"),
    };

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    var loc = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }

  function resize() {
    var cw = hero.clientWidth;
    var ch = hero.clientHeight;
    if (cw < 2 || ch < 2) return false;

    w = cw;
    h = ch;
    var pw = Math.max(1, Math.floor(cw * dpr));
    var ph = Math.max(1, Math.floor(ch * dpr));

    canvas.width = pw;
    canvas.height = ph;
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";

    ratio = pw / ph;
    if (!ratio || !isFinite(ratio)) ratio = 1;
    if (gl && uniforms) {
      gl.viewport(0, 0, pw, ph);
      gl.uniform1f(uniforms.u_ratio, ratio);
    }
    return true;
  }

  function centerPointer() {
    pointer.x = pointer.tX = 0.5;
    pointer.y = pointer.tY = 0.5;
  }

  function setPointer(cx, cy) {
    var box = hero.getBoundingClientRect();
    var bw = box.width || 1;
    var bh = box.height || 1;
    pointer.tX = (cx - box.left) / bw;
    pointer.tY = (cy - box.top) / bh;
    if (pointer.tX < 0 || pointer.tX > 1 || pointer.tY < 0 || pointer.tY > 1) {
      centerPointer();
    }
  }

  function draw() {
    if (!gl || !uniforms) return;

    pointer.x += (pointer.tX - pointer.x) * 0.12;
    pointer.y += (pointer.tY - pointer.y) * 0.12;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uniforms.u_time, performance.now());
    gl.uniform1f(uniforms.u_ratio, ratio);
    gl.uniform2f(uniforms.u_pointer_position, pointer.x, 1 - pointer.y);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function frame() {
    draw();
    requestAnimationFrame(frame);
  }

  function boot() {
    if (started) {
      resize();
      return;
    }
    if (!initGL()) return;
    centerPointer();
    if (!resize()) {
      requestAnimationFrame(boot);
      return;
    }

    started = true;
    hero.setAttribute("data-neuro-ready", "webgl");
    if (wrap) wrap.classList.add("neuro-active");
    document.body.classList.remove("neuro-no-webgl");

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", function (e) {
      setPointer(e.clientX, e.clientY);
    });
    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(hero);
    }

    frame();
  }

  function scheduleBoot() {
    requestAnimationFrame(function () {
      requestAnimationFrame(boot);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleBoot);
  } else {
    scheduleBoot();
  }
  window.addEventListener("load", scheduleBoot);
})();

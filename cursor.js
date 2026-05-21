(function () {
  var activeCursor = null;
  var interactiveSelector = [
    "a",
    "button",
    "input",
    "textarea",
    "select",
    "summary",
    "label",
    "[role='button']",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function canUseCustomCursor() {
    if (!window.matchMedia) {
      return false;
    }
    return (
      window.matchMedia("(any-pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function createCursorElement(kind) {
    var el = document.createElement("div");
    el.className = "b2nny-cursor b2nny-cursor--" + kind;
    el.setAttribute("aria-hidden", "true");
    return el;
  }

  function setTransform(el, x, y) {
    el.style.transform =
      "translate3d(" + x.toFixed(2) + "px, " + y.toFixed(2) + "px, 0)";
  }

  function isInteractive(target) {
    if (!target || !target.closest) {
      return false;
    }
    var el = target.closest(interactiveSelector);
    if (!el) {
      return false;
    }
    return !(el.disabled || el.getAttribute("aria-disabled") === "true");
  }

  function init(options) {
    if (activeCursor) {
      return activeCursor;
    }
    if (!canUseCustomCursor()) {
      return null;
    }

    options = options || {};

    var beam = createCursorElement("beam");
    var mark = document.createElement("span");
    mark.className = "b2nny-cursor__mark";
    mark.innerHTML =
      '<span class="b2nny-cursor__linkPlate"></span>' +
      '<svg class="b2nny-cursor__svg" viewBox="0 0 34 36" focusable="false" aria-hidden="true">' +
        '<path class="b2nny-cursor__edge" d="M3.8 3.8L26.8 18L17.3 20.6L22.1 30.1L17.8 32.2L13.2 22.5L6.2 29.4Z"></path>' +
        '<path class="b2nny-cursor__body" d="M3.8 3.8L26.8 18L17.3 20.6L22.1 30.1L17.8 32.2L13.2 22.5L6.2 29.4Z"></path>' +
        '<path class="b2nny-cursor__shine" d="M7.2 8L18.8 15.2"></path>' +
      '</svg>';
    beam.appendChild(mark);
    var linkPlate = mark.querySelector(".b2nny-cursor__linkPlate");

    document.body.appendChild(beam);
    document.body.classList.add("bw-hideCursor", "is-fine-pointer", "b2nny-cursor-active");

    var pointer = { x: -80, y: -80 };
    var lead = { x: -80, y: -80 };
    var previous = { x: -80, y: -80 };
    var speed = 0;
    var seen = false;

    function setVisible(value) {
      document.body.classList.toggle("b2nny-cursor-visible", value);
    }

    function updatePointer(x, y, target, e) {
      var hovering = isInteractive(target);
      pointer.x = x;
      pointer.y = y;
      seen = true;
      setVisible(true);
      document.body.classList.toggle("b2nny-cursor-hovering", hovering);
      beam.classList.toggle("is-hovering", hovering);
      if (linkPlate) {
        linkPlate.style.width = hovering ? "14px" : "";
      }
      if (typeof options.onMove === "function") {
        options.onMove(pointer.x, pointer.y, e);
      }
    }

    function handlePointerMove(e) {
      var pt = e.pointerType;
      if (pt && pt !== "mouse" && pt !== "pen") {
        return;
      }
      updatePointer(e.clientX, e.clientY, e.target, e);
    }

    function handleMouseMove(e) {
      updatePointer(e.clientX, e.clientY, e.target, e);
    }

    function handleDown() {
      document.body.classList.add("b2nny-cursor-pressed");
    }

    function handleUp() {
      document.body.classList.remove("b2nny-cursor-pressed");
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("pointerdown", handleDown, { passive: true });
    window.addEventListener("pointerup", handleUp, { passive: true });
    window.addEventListener("blur", handleUp);
    document.addEventListener("mouseleave", function () {
      setVisible(false);
    });
    document.addEventListener("mouseenter", function () {
      if (seen) {
        setVisible(true);
      }
    });

    function tick() {
      if (seen) {
        lead.x += (pointer.x - lead.x) * 0.58;
        lead.y += (pointer.y - lead.y) * 0.58;

        var dx = pointer.x - previous.x;
        var dy = pointer.y - previous.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        speed += (clamp(distance / 44, 0, 1) - speed) * 0.24;
        previous.x = pointer.x;
        previous.y = pointer.y;

        beam.style.setProperty("--cursor-speed", speed.toFixed(3));
        setTransform(beam, lead.x, lead.y);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    activeCursor = {
      destroy: function () {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("pointerdown", handleDown);
        window.removeEventListener("pointerup", handleUp);
        if (beam.parentNode) beam.parentNode.removeChild(beam);
        document.body.classList.remove(
          "bw-hideCursor",
          "is-fine-pointer",
          "b2nny-cursor-active",
          "b2nny-cursor-visible",
          "b2nny-cursor-hovering",
          "b2nny-cursor-pressed"
        );
        activeCursor = null;
      }
    };

    return activeCursor;
  }

  window.B2nnyCursor = {
    init: init
  };
})();
